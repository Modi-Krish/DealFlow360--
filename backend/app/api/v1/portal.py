from typing import List
from fastapi import APIRouter, HTTPException
from beanie import PydanticObjectId
from pydantic import BaseModel

from app.models.quotation import Quotation
from app.models.customer import Customer
from app.schemas.quotation import QuotationResponse
from app.schemas.common import StandardResponse
from app.api.v1.quotations import qt_to_response

router = APIRouter()

class NegotiateRequest(BaseModel):
    notes: str

@router.get("/customer/{customer_id}/quotations", response_model=StandardResponse[List[QuotationResponse]])
async def get_customer_quotations(customer_id: str):
    try:
        customer = await Customer.get(PydanticObjectId(customer_id))
    except:
        customer = None
        
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    quotations = await Quotation.find(Quotation.customer.id == customer.id).sort("-created_at").to_list()
    return StandardResponse(success=True, message="Quotations retrieved", data=[qt_to_response(q) for q in quotations])

@router.post("/quotation/{quotation_id}/accept", response_model=StandardResponse[QuotationResponse])
async def accept_quotation(quotation_id: str):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except:
        quotation = None
        
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    if quotation.status != "APPROVED":
        raise HTTPException(status_code=400, detail="Only approved quotations can be accepted")
        
    quotation.status = "ALLOCATED" 
    await quotation.save()
    return StandardResponse(success=True, message="Quotation accepted", data=qt_to_response(quotation))

@router.post("/quotation/{quotation_id}/negotiate", response_model=StandardResponse[QuotationResponse])
async def negotiate_quotation(quotation_id: str, req: NegotiateRequest):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except:
        quotation = None
        
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    quotation.status = "NEGOTIATING"
    quotation.customer_notes = req.notes
    await quotation.save()
    return StandardResponse(success=True, message="Quotation sent for negotiation", data=qt_to_response(quotation))
