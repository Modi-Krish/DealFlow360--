from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId

from app.core.dependencies import require_role
from app.models.quotation import Quotation
from app.models.inventory import FulfillmentOrder
from app.schemas.inventory import FulfillmentOrderResponse
from app.services.allocation_engine import AllocationEngine
from app.schemas.common import StandardResponse
from app.models.user import UserRole

router = APIRouter()

def fo_to_response(doc: FulfillmentOrder) -> FulfillmentOrderResponse:
    data = doc.model_dump()
    data['id'] = str(doc.id)
    return FulfillmentOrderResponse(**data)

@router.get("/orders", response_model=StandardResponse[List[FulfillmentOrderResponse]])
async def get_fulfillment_orders():
    orders = await FulfillmentOrder.find_all().to_list()
    return StandardResponse(success=True, message="Orders retrieved", data=[fo_to_response(o) for o in orders])

@router.post("/allocate/{quotation_id}", response_model=StandardResponse[Dict[str, Any]])
async def allocate_quotation(quotation_id: str):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except:
        quotation = None
        
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    if quotation.status != "APPROVED":
        raise HTTPException(status_code=400, detail="Only approved quotations can be allocated")
        
    # We will pass None for db since the new AllocationEngine will handle it
    allocation_result = await AllocationEngine.allocate_inventory(None, quotation)
    
    if allocation_result["success"]:
        quotation.status = "ALLOCATED"
        await quotation.save()
        return StandardResponse(success=True, message="Inventory allocated successfully", data=allocation_result)
    else:
        return StandardResponse(success=False, message="Insufficient inventory", data=allocation_result)
