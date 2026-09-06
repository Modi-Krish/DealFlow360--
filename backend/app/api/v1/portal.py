from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, HTTPException, Depends
from beanie import PydanticObjectId
from pydantic import BaseModel, Field
import uuid
from datetime import datetime, timezone

from app.core.dependencies import get_current_user, enforce_tenant
from app.core.permissions import normalize_role
from app.models.quotation import Quotation, QuotationItemComment
from app.models.customer import Customer
from app.models.user import User, UserRole
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
    counter_discount_percent: Optional[Decimal] = Field(None, ge=0, le=100)

class PortalLineCommentRequest(BaseModel):
    message: str

async def resolve_authenticated_customer(current_user: User) -> Optional[Customer]:
    # Look up by email first, then user_id
    customer = await Customer.find_one({"email": current_user.email})
    if not customer and hasattr(current_user, 'id'):
        customer = await Customer.find_one({"user_id": str(current_user.id)})
    return customer

async def verify_quotation_portal_access(quotation: Quotation, current_user: User) -> Optional[Customer]:
    current_role = normalize_role(current_user.role)
    if current_role == "super_admin":
        return None
        
    if current_role == "customer":
        customer = await resolve_authenticated_customer(current_user)
        if not customer:
            raise HTTPException(status_code=403, detail="Forbidden: Customer profile not linked to user account")
            
        cust_id = getattr(quotation.customer, 'id', None) or getattr(getattr(quotation.customer, 'ref', None), 'id', None)
        if not cust_id or str(cust_id) != str(customer.id):
            raise HTTPException(status_code=403, detail="Forbidden: You do not have access to this quotation")
        return customer
    else:
        # Internal staff previewing portal: enforce tenant
        enforce_tenant(quotation.seller_id, current_user)
        return None

@router.get("/me/quotations", response_model=StandardResponse[List[QuotationResponse]])
async def get_my_quotations(current_user: User = Depends(get_current_user)):
    """IDOR-free endpoint: automatically resolves quotations for the authenticated customer"""
    customer = await resolve_authenticated_customer(current_user)
    if not customer:
        return StandardResponse(success=True, message="No customer account found", data=[])
        
    cid = customer.id
    quotations = await Quotation.find({
        "$or": [{"customer.$id": cid}, {"customer": cid}, {"customer.id": str(cid)}]
    }).sort("-created_at").to_list()
    return StandardResponse(success=True, message="Quotations retrieved", data=[qt_to_response(q) for q in quotations])

@router.get("/customer/{customer_id}/quotations", response_model=StandardResponse[List[QuotationResponse]])
async def get_customer_quotations(customer_id: str, current_user: User = Depends(get_current_user)):
    try:
        customer = await Customer.get(PydanticObjectId(customer_id))
    except Exception:
        customer = None
        
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    current_role = normalize_role(current_user.role)
    if current_role == "customer":
        auth_cust = await resolve_authenticated_customer(current_user)
        if not auth_cust or str(auth_cust.id) != str(customer.id):
            raise HTTPException(status_code=403, detail="Forbidden: You cannot access another customer's quotations")
    else:
        enforce_tenant(customer.seller_id, current_user)
        
    cid = customer.id
    quotations = await Quotation.find({
        "$or": [{"customer.$id": cid}, {"customer": cid}, {"customer.id": str(cid)}]
    }).sort("-created_at").to_list()
    return StandardResponse(success=True, message="Quotations retrieved", data=[qt_to_response(q) for q in quotations])

@router.post("/quotation/{quotation_id}/accept", response_model=StandardResponse[QuotationResponse])
async def accept_quotation(quotation_id: str, current_user: User = Depends(get_current_user)):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except Exception:
        quotation = None
        
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    # Strictly verify that current user owns this quotation (IDOR prevention)
    await verify_quotation_portal_access(quotation, current_user)
        
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
        reason=f"Customer {current_user.name} accepted quotation terms"
    )
    
    return StandardResponse(success=True, message="Quotation confirmed by customer", data=qt_to_response(quotation))

@router.post("/quotation/{quotation_id}/negotiate", response_model=StandardResponse[QuotationResponse])
async def negotiate_quotation(
    quotation_id: str,
    req: NegotiateRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except Exception:
        quotation = None
        
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    # Strictly verify ownership (IDOR prevention)
    await verify_quotation_portal_access(quotation, current_user)
        
    old_status = quotation.status
    quotation.customer_notes = req.notes
    
    # If customer requested higher discount, update items and recalculate
    if req.counter_discount_percent is not None:
        disc_val = Decimal(str(req.counter_discount_percent))
        for item in quotation.items:
            item.discount = disc_val
            base_p = Decimal(str(item.unit_price or "0.0"))
            PricingService.calculate_line_item(item, base_p)
            
        PricingService.calculate_quotation_totals(quotation)
    
    await quotation.save()
    
    # Evaluate new risk with customer counter discount
    evaluation = await DiscountEngine.evaluate(quotation)
    
    if evaluation["requires_approval"]:
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

@router.post("/quotation/{quotation_id}/items/{item_id}/comment", response_model=StandardResponse[QuotationResponse])
async def add_portal_line_comment(
    quotation_id: str,
    item_id: str,
    req: PortalLineCommentRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except Exception:
        quotation = None
        
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    await verify_quotation_portal_access(quotation, current_user)
    
    matched_item = None
    for item in quotation.items:
        if getattr(item, 'id', None) == item_id or str(getattr(item, 'id', '')) == item_id:
            matched_item = item
            break
            
    if not matched_item:
        raise HTTPException(status_code=404, detail="Quotation line item not found")
        
    new_comment = QuotationItemComment(
        id=str(uuid.uuid4()),
        author_name=current_user.name,
        author_role="CUSTOMER" if normalize_role(current_user.role) == "customer" else "SALES_REP",
        message=req.message,
        created_at=datetime.now(timezone.utc)
    )
    if not hasattr(matched_item, 'comments') or matched_item.comments is None:
        matched_item.comments = []
        
    matched_item.comments.append(new_comment)
    await quotation.save()
    
    return StandardResponse(success=True, message="Comment added to line item", data=qt_to_response(quotation))
