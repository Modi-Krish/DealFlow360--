from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, HTTPException, Depends
from beanie import PydanticObjectId
from pydantic import BaseModel

from app.core.dependencies import get_current_user
from app.models.quotation import Quotation
from app.models.customer import Customer
from app.models.user import User
from app.models.audit import record_audit_log
from app.schemas.quotation import QuotationResponse
from app.schemas.common import StandardResponse
from app.api.v1.quotations import qt_to_response
from app.services.pricing import PricingService
from app.services.discount_engine import DiscountEngine
from app.services.approval_engine import ApprovalEngine

router = APIRouter()

class NegotiateRequest(BaseModel):
    notes: str
    counter_discount_percent: Optional[Decimal] = None

@router.get("/customer/{customer_id}/quotations", response_model=StandardResponse[List[QuotationResponse]])
async def get_customer_quotations(customer_id: str, current_user: User = Depends(get_current_user)):
    try:
        customer = await Customer.get(PydanticObjectId(customer_id))
    except Exception:
        customer = None
        
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    quotations = await Quotation.find(Quotation.customer.id == customer.id).sort("-created_at").to_list()
    return StandardResponse(success=True, message="Quotations retrieved", data=[qt_to_response(q) for q in quotations])

@router.post("/quotation/{quotation_id}/accept", response_model=StandardResponse[QuotationResponse])
async def accept_quotation(quotation_id: str, current_user: User = Depends(get_current_user)):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except Exception:
        quotation = None
        
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    if quotation.status != "APPROVED":
        raise HTTPException(status_code=400, detail="Only approved quotations can be accepted")
        
    old_status = quotation.status
    quotation.status = "CONFIRMED" 
    await quotation.save()
    
    await record_audit_log(
        user_id=str(current_user.id),
        user_name=current_user.name,
        seller_id=quotation.seller_id,
        action="CUSTOMER_ACCEPTED_QUOTATION",
        module="quotations",
        resource_type="Quotation",
        resource_id=str(quotation.id),
        old_value=old_status,
        new_value="CONFIRMED",
        reason="Customer accepted terms"
    )
    
    return StandardResponse(success=True, message="Quotation confirmed by customer", data=qt_to_response(quotation))

@router.post("/quotation/{quotation_id}/negotiate", response_model=StandardResponse[QuotationResponse])
async def negotiate_quotation(quotation_id: str, req: NegotiateRequest, current_user: User = Depends(get_current_user)):
    """
    Customer requests revision or counters discount.
    If counter discount exceeds allowed threshold, quotation automatically re-enters approval workflow.
    """
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except Exception:
        quotation = None
        
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    old_status = quotation.status
    quotation.customer_notes = req.notes
    
    # If customer requested higher discount
    if req.counter_discount_percent is not None:
        for item in quotation.items:
            item.discount = Decimal(str(req.counter_discount_percent))
            if item.unit_price > 0 and item.quantity > 0:
                gross = item.unit_price * item.quantity
                item.total_price = gross - (gross * (item.discount / 100))
        PricingService.calculate_quotation_totals(quotation)
    
    await quotation.save()
    
    # Evaluate new risk
    evaluation = await DiscountEngine.evaluate(quotation)
    
    if evaluation["requires_approval"]:
        # Recalculated risk requires approval -> re-enter approval flow
        rep_id = quotation.sales_rep.id if hasattr(quotation.sales_rep, 'id') else quotation.sales_rep.ref.id
        sales_rep = await User.get(PydanticObjectId(str(rep_id)))
        await ApprovalEngine.create_approval_chain(
            quotation=quotation,
            risk_score=evaluation["risk_score"],
            requester=sales_rep or current_user
        )
        quotation.status = "PENDING_APPROVAL"
        await quotation.save()
        message = "Counter discount exceeds threshold; quotation re-entered approval flow"
    else:
        quotation.status = "NEGOTIATING"
        await quotation.save()
        message = "Quotation sent for negotiation"
        
    await record_audit_log(
        user_id=str(current_user.id),
        user_name=current_user.name,
        seller_id=quotation.seller_id,
        action="CUSTOMER_COUNTER_DISCOUNT",
        module="quotations",
        resource_type="Quotation",
        resource_id=str(quotation.id),
        old_value=old_status,
        new_value=quotation.status,
        reason=f"Customer negotiated: {req.notes}. Counter discount: {req.counter_discount_percent}%"
    )
    
    return StandardResponse(success=True, message=message, data=qt_to_response(quotation))
