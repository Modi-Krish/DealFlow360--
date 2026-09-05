from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from beanie import PydanticObjectId
from pydantic import BaseModel

from app.models.quotation import Quotation
from app.models.inventory import FulfillmentOrder
from app.schemas.inventory import FulfillmentOrderResponse
from app.services.allocation_engine import AllocationEngine
from app.schemas.common import StandardResponse

router = APIRouter()

class UpdateDeliveryStatusRequest(BaseModel):
    status: str
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    dispatch_notes: Optional[str] = None

def fo_to_response(doc: FulfillmentOrder) -> FulfillmentOrderResponse:
    data = doc.model_dump()
    data['id'] = str(doc.id)
    return FulfillmentOrderResponse(**data)

@router.get("/orders", response_model=StandardResponse[List[FulfillmentOrderResponse]])
async def get_fulfillment_orders(seller_id: Optional[str] = Query(None)):
    query = {}
    if seller_id:
        query["seller_id"] = seller_id
    orders = await FulfillmentOrder.find(query).sort("-id").to_list()
    return StandardResponse(success=True, message="Orders retrieved", data=[fo_to_response(o) for o in orders])

@router.post("/orders/{order_id}/status", response_model=StandardResponse[FulfillmentOrderResponse])
async def update_delivery_status(order_id: str, req: UpdateDeliveryStatusRequest):
    try:
        fo = await FulfillmentOrder.get(PydanticObjectId(order_id))
    except Exception:
        fo = None
    if not fo:
        raise HTTPException(status_code=404, detail="Delivery order not found")

    fo.status = req.status
    if req.carrier:
        # If model has carrier attribute
        fo.dispatch_notes = f"{fo.dispatch_notes or ''} [Carrier: {req.carrier}]".strip()
    if req.tracking_number:
        fo.dispatch_notes = f"{fo.dispatch_notes or ''} [Tracking: {req.tracking_number}]".strip()
    if req.dispatch_notes:
        fo.dispatch_notes = req.dispatch_notes

    await fo.save()
    return StandardResponse(success=True, message=f"Order status updated to {req.status}", data=fo_to_response(fo))

@router.post("/allocate/{quotation_id}", response_model=StandardResponse[Dict[str, Any]])
async def allocate_quotation(quotation_id: str):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except Exception:
        quotation = None
        
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    if quotation.status != "APPROVED":
        raise HTTPException(status_code=400, detail="Only approved quotations can be allocated")
        
    allocation_result = await AllocationEngine.allocate_inventory(None, quotation)
    
    if allocation_result["success"]:
        quotation.status = "ALLOCATED"
        await quotation.save()
        return StandardResponse(success=True, message="Inventory allocated successfully", data=allocation_result)
    else:
        return StandardResponse(success=False, message="Insufficient inventory", data=allocation_result)
