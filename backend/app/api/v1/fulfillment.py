from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from beanie import PydanticObjectId
from pydantic import BaseModel

from app.core.dependencies import get_current_user, require_permission, enforce_tenant
from app.core.permissions import Permission, normalize_role
from app.models.quotation import Quotation
from app.models.inventory import FulfillmentOrder, Warehouse
from app.models.user import User
from app.models.audit import record_audit_log
from app.schemas.inventory import FulfillmentOrderResponse
from app.services.allocation_engine import AllocationEngine
from app.schemas.common import StandardResponse

router = APIRouter()

class UpdateDeliveryStatusRequest(BaseModel):
    status: str
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    dispatch_notes: Optional[str] = None

class WarehouseOverrideRequest(BaseModel):
    warehouse_name: str
    reason: str

def fo_to_response(doc: FulfillmentOrder) -> FulfillmentOrderResponse:
    data = doc.model_dump()
    data['id'] = str(doc.id)
    return FulfillmentOrderResponse(**data)

@router.get("/orders", response_model=StandardResponse[List[FulfillmentOrderResponse]])
async def get_fulfillment_orders(
    seller_id: Optional[str] = Query(None),
    current_user: User = Depends(require_permission(Permission.FULFILLMENT_VIEW.value))
):
    current_role = normalize_role(current_user.role)
    query = {}
    
    if current_role == "super_admin":
        if seller_id:
            query["seller_id"] = seller_id
    else:
        my_seller_id = current_user.seller_id or str(current_user.id)
        query["seller_id"] = my_seller_id

    orders = await FulfillmentOrder.find(query).sort("-created_at").to_list()
    return StandardResponse(success=True, message="Orders retrieved", data=[fo_to_response(o) for o in orders])

@router.post("/orders/{order_id}/status", response_model=StandardResponse[FulfillmentOrderResponse])
async def update_delivery_status(
    order_id: str,
    req: UpdateDeliveryStatusRequest,
    current_user: User = Depends(require_permission(Permission.FULFILLMENT_VIEW.value))
):
    try:
        fo = await FulfillmentOrder.get(PydanticObjectId(order_id))
    except Exception:
        fo = None
    if not fo:
        raise HTTPException(status_code=404, detail="Delivery order not found")

    enforce_tenant(fo.seller_id, current_user)

    old_status = fo.status
    fo.status = req.status
    if req.carrier:
        fo.dispatch_notes = f"{fo.dispatch_notes or ''} [Carrier: {req.carrier}]".strip()
    if req.tracking_number:
        fo.dispatch_notes = f"{fo.dispatch_notes or ''} [Tracking: {req.tracking_number}]".strip()
    if req.dispatch_notes:
        fo.dispatch_notes = req.dispatch_notes

    await fo.save()
    
    await record_audit_log(
        user_id=str(current_user.id),
        user_name=current_user.name,
        seller_id=fo.seller_id,
        action="FULFILLMENT_STATUS_UPDATED",
        module="fulfillment",
        resource_type="FulfillmentOrder",
        resource_id=str(fo.id),
        old_value=old_status,
        new_value=req.status,
        reason=req.dispatch_notes
    )

    return StandardResponse(success=True, message=f"Order status updated to {req.status}", data=fo_to_response(fo))

@router.post("/orders/{order_id}/override", response_model=StandardResponse[FulfillmentOrderResponse])
async def override_warehouse_split(
    order_id: str,
    req: WarehouseOverrideRequest,
    current_user: User = Depends(require_permission(Permission.FULFILLMENT_OVERRIDE.value))
):
    """
    Operations manual override of warehouse fulfillment assignment.
    Mandatorily logged into AuditLog.
    """
    try:
        fo = await FulfillmentOrder.get(PydanticObjectId(order_id))
    except Exception:
        fo = None
    if not fo:
        raise HTTPException(status_code=404, detail="Delivery order not found")

    enforce_tenant(fo.seller_id, current_user)

    old_wh = fo.items[0].warehouse_name if fo.items else "Default Warehouse"
    for it in fo.items:
        it.warehouse_name = req.warehouse_name
    
    fo.dispatch_notes = f"{fo.dispatch_notes or ''} [Manual Override to {req.warehouse_name}: {req.reason}]".strip()
    await fo.save()

    # Record mandatory audit log
    await record_audit_log(
        user_id=str(current_user.id),
        user_name=current_user.name,
        seller_id=fo.seller_id,
        action="WAREHOUSE_OVERRIDE",
        module="fulfillment",
        resource_type="FulfillmentOrder",
        resource_id=str(fo.id),
        old_value=old_wh,
        new_value=req.warehouse_name,
        reason=req.reason,
        details={"order_number": fo.order_number, "reason": req.reason}
    )

    return StandardResponse(
        success=True,
        message=f"Warehouse split manually overridden to {req.warehouse_name}",
        data=fo_to_response(fo)
    )

@router.post("/allocate/{quotation_id}", response_model=StandardResponse[Dict[str, Any]])
async def allocate_quotation(
    quotation_id: str,
    current_user: User = Depends(require_permission(Permission.FULFILLMENT_SPLIT.value))
):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except Exception:
        quotation = None
        
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    enforce_tenant(quotation.seller_id, current_user)

    if quotation.status != "APPROVED":
        raise HTTPException(status_code=400, detail="Only approved quotations can be allocated")
        
    allocation_result = await AllocationEngine.allocate_inventory(None, quotation)
    
    if allocation_result["success"]:
        quotation.status = "ALLOCATED"
        await quotation.save()
        
        await record_audit_log(
            user_id=str(current_user.id),
            user_name=current_user.name,
            seller_id=quotation.seller_id,
            action="INVENTORY_ALLOCATED",
            module="fulfillment",
            resource_type="Quotation",
            resource_id=str(quotation.id)
        )
        return StandardResponse(success=True, message="Inventory allocated successfully", data=allocation_result)
    else:
        return StandardResponse(success=False, message="Insufficient inventory", data=allocation_result)
