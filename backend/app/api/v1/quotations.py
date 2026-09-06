from typing import List, Optional
import uuid
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from beanie import PydanticObjectId

from app.core.dependencies import get_current_user, require_permission, enforce_tenant
from app.core.permissions import Permission, normalize_role
from app.models.quotation import Quotation, QuotationItem
from app.models.product import Product
from app.models.customer import Customer
from app.schemas.quotation import (
    QuotationCreate, QuotationResponse, QuotationItemCreate, QuotationItemResponse
)
from app.schemas.common import StandardResponse
from app.models.user import User
from app.models.audit import record_audit_log
from app.services.pricing import PricingService
from app.services.discount_engine import DiscountEngine
from app.services.approval_engine import ApprovalEngine

router = APIRouter()

def qt_to_response(doc: Quotation) -> QuotationResponse:
    data = doc.model_dump()
    data['id'] = str(doc.id)
    if doc.customer:
        data['customer_id'] = str(doc.customer.id if hasattr(doc.customer, 'id') else doc.customer.ref.id)
    if doc.sales_rep:
        data['sales_rep_id'] = str(doc.sales_rep.id if hasattr(doc.sales_rep, 'id') else doc.sales_rep.ref.id)
        
    data['seller_id'] = doc.seller_id
    data['approval_level'] = doc.approval_level
    data['risk_score'] = Decimal(str(doc.risk_score or 0.0))
    data['margin_amount'] = Decimal("0.0")
    
    # Process items
    transformed_items = []
    for it in doc.items:
        it_dict = it.model_dump()
        it_dict['id'] = str(getattr(it, 'id', None) or it_dict.get('id') or uuid.uuid4())
        if it.product:
            it_dict['product_id'] = str(it.product.id if hasattr(it.product, 'id') else it.product.ref.id)
        else:
            it_dict['product_id'] = ""
        it_dict['variant'] = getattr(it, 'variant', None)
        it_dict['discount_percent'] = Decimal(str(it.discount))
        it_dict['discount_amount'] = Decimal(str(it.discount))
        it_dict['tax_amount'] = Decimal(str(it.tax))
        it_dict['line_total'] = Decimal(str(it.total_price))
        it_dict['margin_amount'] = Decimal("0.0")
        
        raw_comments = getattr(it, 'comments', []) or []
        it_dict['comments'] = [
            c.model_dump() if hasattr(c, 'model_dump') else c for c in raw_comments
        ]
        transformed_items.append(QuotationItemResponse(**it_dict))
        
    data['items'] = transformed_items
    data['promised_delivery_date'] = doc.promised_delivery_date
    data['sla_status'] = doc.sla_status or "ON_TIME"
    return QuotationResponse(**data)

@router.get("/", response_model=StandardResponse[List[QuotationResponse]])
async def get_quotations(
    current_user: User = Depends(require_permission(Permission.QUOTATIONS_VIEW.value))
):
    current_role = normalize_role(current_user.role)
    
    if current_role == "super_admin":
        quotations = await Quotation.find_all().sort("-created_at").to_list()
    elif current_role == "customer":
        # Customer sees their own quotations
        customer = await Customer.find_one({"email": current_user.email})
        if customer:
            quotations = await Quotation.find(Quotation.customer.id == customer.id).sort("-created_at").to_list()
        else:
            quotations = []
    else:
        # Seller and employees: strictly scoped to own seller organization
        my_seller_id = current_user.seller_id or str(current_user.id)
        quotations = await Quotation.find({"seller_id": my_seller_id}).sort("-created_at").to_list()
        
    return StandardResponse(
        success=True,
        message="Quotations retrieved successfully",
        data=[qt_to_response(q) for q in quotations]
    )

@router.get("/{quotation_id}", response_model=StandardResponse[QuotationResponse])
async def get_quotation_by_id(
    quotation_id: str,
    current_user: User = Depends(get_current_user)
):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except Exception:
        quotation = None
        
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    current_role = normalize_role(current_user.role)
    if current_role == "super_admin":
        pass
    elif current_role == "customer":
        # Check if customer owns this quotation
        cust_id = quotation.customer.id if hasattr(quotation.customer, 'id') else quotation.customer.ref.id
        customer = await Customer.get(PydanticObjectId(str(cust_id)))
        if not customer or customer.email != current_user.email:
            raise HTTPException(status_code=403, detail="Forbidden: Not your quotation")
    else:
        # Seller/Employee tenant check
        enforce_tenant(quotation.seller_id, current_user)
        
    return StandardResponse(
        success=True,
        message="Quotation retrieved successfully",
        data=qt_to_response(quotation)
    )

@router.post("/", response_model=StandardResponse[QuotationResponse])
async def create_quotation(
    quotation_data: QuotationCreate,
    current_user: User = Depends(require_permission(Permission.QUOTATIONS_CREATE.value))
):
    qt_num = f"QT-{str(uuid.uuid4())[:8].upper()}"
    
    try:
        customer = await Customer.get(PydanticObjectId(quotation_data.customer_id))
    except Exception:
        customer = None
        
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    seller_id = current_user.seller_id or str(current_user.id)
    
    new_quote = Quotation(
        quotation_number=qt_num,
        customer=customer,
        sales_rep=current_user,
        seller_id=seller_id,
        items=[],
        status="DRAFT"
    )
    await new_quote.insert()
    
    # Audit log
    await record_audit_log(
        user_id=str(current_user.id),
        user_name=current_user.name,
        seller_id=seller_id,
        action="QUOTATION_CREATED",
        module="quotations",
        resource_type="Quotation",
        resource_id=str(new_quote.id),
        new_value={"quotation_number": qt_num, "customer_id": str(customer.id)},
        reason=f"Quotation {qt_num} created by {current_user.name}"
    )
    
    return StandardResponse(
        success=True,
        message="Quotation created successfully",
        data=qt_to_response(new_quote)
    )

@router.post("/{quotation_id}/items", response_model=StandardResponse[QuotationResponse])
async def add_quotation_item(
    quotation_id: str,
    item: QuotationItemCreate,
    current_user: User = Depends(require_permission(Permission.QUOTATIONS_UPDATE.value))
):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except Exception:
        quotation = None
        
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    enforce_tenant(quotation.seller_id, current_user)
        
    EDITABLE_STATES = ["DRAFT", "REVISION_REQUIRED"]
    if quotation.status not in EDITABLE_STATES:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot modify quotation in {quotation.status} state. Editing is only permitted in {', '.join(EDITABLE_STATES)} states."
        )
        
    try:
        product = await Product.get(PydanticObjectId(item.product_id))
    except Exception:
        product = None
        
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    variant_str = item.variant or item.variant_id
    new_item = QuotationItem(
        product=product,
        variant=variant_str,
        quantity=item.quantity,
        discount=Decimal(str(item.discount_percent))
    )
    
    # Calculate prices
    cust_id = quotation.customer.id if hasattr(quotation.customer, 'id') else quotation.customer.ref.id
    customer_id_str = str(cust_id) if cust_id else ""
    base_price = await PricingService.resolve_price(customer_id_str, str(product.id))
    
    # Apply variant price surcharge if configured
    if variant_str and hasattr(product, "variants") and product.variants:
        for v in product.variants:
            if v.value == variant_str or f"{v.attribute}: {v.value}" == variant_str:
                base_price += Decimal(str(getattr(v, 'price_surcharge', 0) or 0))
                break
                
    PricingService.calculate_line_item(new_item, base_price)
    
    quotation.items.append(new_item)
    PricingService.calculate_quotation_totals(quotation)
    
    await quotation.save()
    
    # Record audit log
    await record_audit_log(
        user_id=str(current_user.id),
        user_name=current_user.name,
        seller_id=quotation.seller_id,
        action="QUOTATION_ITEM_ADDED",
        module="quotations",
        resource_type="Quotation",
        resource_id=str(quotation.id),
        details={"product": product.name, "quantity": item.quantity, "discount": float(item.discount_percent)},
        reason=f"Added item {product.name} (qty: {item.quantity}, discount: {item.discount_percent}%)"
    )
    
    return StandardResponse(success=True, message="Item added to quotation", data=qt_to_response(quotation))

@router.delete("/{quotation_id}/items/{item_index}", response_model=StandardResponse[QuotationResponse])
async def delete_quotation_item(
    quotation_id: str,
    item_index: int,
    current_user: User = Depends(require_permission(Permission.QUOTATIONS_UPDATE.value))
):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except Exception:
        quotation = None
        
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    enforce_tenant(quotation.seller_id, current_user)
    
    EDITABLE_STATES = ["DRAFT", "REVISION_REQUIRED"]
    if quotation.status not in EDITABLE_STATES:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot modify quotation in {quotation.status} state. Editing is only permitted in {', '.join(EDITABLE_STATES)} states."
        )
        
    if item_index < 0 or item_index >= len(quotation.items):
        raise HTTPException(status_code=400, detail="Invalid item index")
        
    removed_item = quotation.items.pop(item_index)
    PricingService.calculate_quotation_totals(quotation)
    await quotation.save()
    
    return StandardResponse(success=True, message="Item removed from quotation", data=qt_to_response(quotation))

@router.post("/{quotation_id}/submit", response_model=StandardResponse[QuotationResponse])
async def submit_quotation(
    quotation_id: str,
    current_user: User = Depends(require_permission(Permission.QUOTATIONS_SUBMIT.value))
):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except Exception:
        quotation = None
        
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    enforce_tenant(quotation.seller_id, current_user)
    
    if quotation.status not in ["DRAFT", "REVISION_REQUIRED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot submit quotation in {quotation.status} state. Only DRAFT or REVISION_REQUIRED quotations can be submitted for approval."
        )
        
    if not quotation.items:
        raise HTTPException(status_code=400, detail="Cannot submit an empty quotation. Please add at least one line item.")
        
    # Evaluate discounts against customer tier ceilings
    evaluation = await DiscountEngine.evaluate(quotation)
    
    if evaluation["requires_approval"]:
        await ApprovalEngine.create_approval_chain(
            quotation=quotation,
            risk_score=evaluation["risk_score"],
            requester=current_user
        )
        message = "Quotation submitted for approval"
    else:
        quotation.status = "APPROVED"
        quotation.approval_level = "NONE"
        await quotation.save()
        message = "Quotation auto-approved (within discount ceiling)"
        
        await record_audit_log(
            user_id=str(current_user.id),
            user_name=current_user.name,
            seller_id=quotation.seller_id,
            action="QUOTATION_AUTO_APPROVED",
            module="quotations",
            resource_type="Quotation",
            resource_id=str(quotation.id),
            reason="Discount within customer tier limit"
        )
        
    return StandardResponse(success=True, message=message, data=qt_to_response(quotation))

# --- Line-Level Comment Endpoint ---
from pydantic import BaseModel
class LineCommentRequest(BaseModel):
    message: str
    author_name: Optional[str] = None
    author_role: Optional[str] = None

@router.post("/{quotation_id}/items/{item_id}/comments", response_model=StandardResponse[QuotationResponse])
async def add_line_item_comment(
    quotation_id: str, 
    item_id: str, 
    req: LineCommentRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except Exception:
        quotation = None
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    if current_user.seller_id and quotation.seller_id and str(quotation.seller_id) != str(current_user.seller_id):
        if current_user.role != "super_admin":
            raise HTTPException(status_code=403, detail="Not authorized to comment on this quotation")

    # Securely set author_name and author_role from authenticated user
    resolved_author = current_user.name or current_user.email
    resolved_role = current_user.role.upper() if current_user.role else "USER"
        
    from app.models.quotation import QuotationItemComment
    from datetime import datetime, timezone
    
    item_found = False
    for item in quotation.items:
        if str(getattr(item, "id", "")) == item_id:
            if not hasattr(item, "comments") or item.comments is None:
                item.comments = []
            comment = QuotationItemComment(
                author_name=resolved_author,
                author_role=resolved_role,
                message=req.message,
                created_at=datetime.now(timezone.utc)
            )
            item.comments.append(comment)
            item_found = True
            break
            
    if not item_found:
        raise HTTPException(status_code=404, detail="Line item not found in quotation")
        
    await quotation.save()
    return StandardResponse(success=True, message="Comment added to line item", data=qt_to_response(quotation))

# --- Deal Health: 1-Click Rep Nudge ---
class NudgeRequest(BaseModel):
    reason: Optional[str] = "Deal velocity has slowed; follow-up requested."

@router.post("/{quotation_id}/nudge", response_model=StandardResponse[dict])
async def nudge_sales_rep(
    quotation_id: str, 
    req: NudgeRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except Exception:
        quotation = None
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    if current_user.seller_id and quotation.seller_id and str(quotation.seller_id) != str(current_user.seller_id):
        if current_user.role != "super_admin":
            raise HTTPException(status_code=403, detail="Not authorized to nudge on this quotation")
        
    sales_rep_name = "Sales Rep"
    if quotation.sales_rep:
        if hasattr(quotation.sales_rep, "name"):
            sales_rep_name = quotation.sales_rep.name
        elif hasattr(quotation.sales_rep, "fetch"):
            rep = await quotation.sales_rep.fetch()
            if rep:
                sales_rep_name = rep.name
                
    await record_audit_log(
        user_id=str(quotation.id),
        user_name="System Deal Velocity Monitor",
        seller_id=quotation.seller_id,
        action="DEAL_REP_NUDGED",
        module="deal_health",
        resource_type="Quotation",
        resource_id=str(quotation.id),
        reason=req.reason,
        details={"rep": sales_rep_name, "quote": quotation.quotation_number}
    )
    return StandardResponse(
        success=True,
        message=f"Automated nudge sent to {sales_rep_name} regarding Quotation #{quotation.quotation_number}",
        data={"quotation_number": quotation.quotation_number, "rep": sales_rep_name}
    )

# --- Deal Health: 1-Click Manager Escalation ---
class EscalateRequest(BaseModel):
    reason: Optional[str] = "SLA delay or margin risk requires senior sales management review."

@router.post("/{quotation_id}/escalate", response_model=StandardResponse[dict])
async def escalate_deal(quotation_id: str, req: EscalateRequest):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except Exception:
        quotation = None
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    quotation.sla_status = "DELAYED"
    if not quotation.notes:
        quotation.notes = ""
    quotation.notes += f"\n[ESCALATED TO SENIOR MANAGEMENT: {req.reason}]"
    await quotation.save()
    
    await record_audit_log(
        user_id=str(quotation.id),
        user_name="Deal Health Engine",
        seller_id=quotation.seller_id,
        action="DEAL_ESCALATED",
        module="deal_health",
        resource_type="Quotation",
        resource_id=str(quotation.id),
        reason=req.reason,
        details={"quote": quotation.quotation_number, "new_sla": "DELAYED"}
    )
    return StandardResponse(
        success=True,
        message=f"Quotation #{quotation.quotation_number} escalated to Management. SLA marked as DELAYED.",
        data={"quotation_number": quotation.quotation_number, "sla_status": "DELAYED"}
    )

class QuotationStatusUpdate(BaseModel):
    status: str

# Valid Kanban stage transitions (user-initiated, not approval-engine-initiated).
# APPROVED state can only be set by the approval engine (approvals.py), never by direct status push.
VALID_KANBAN_TRANSITIONS: dict[str, list[str]] = {
    "DRAFT":            ["IN_REVIEW", "CLOSED_LOST"],
    "REVISION_REQUIRED":["IN_REVIEW", "CLOSED_LOST"],
    "IN_REVIEW":        ["CLOSED_LOST"],          # Advancement to PENDING_APPROVAL done via /submit
    "PENDING_APPROVAL": ["CLOSED_LOST"],          # Only approval engine can advance from here
    "APPROVED":         ["ALLOCATED", "CLOSED_LOST"],
    "ALLOCATED":        ["CLOSED_WON", "CLOSED_LOST"],
    "NEGOTIATING":      ["CLOSED_LOST"],
    "CLOSED_WON":       [],                       # Terminal state
    "CLOSED_LOST":      [],                       # Terminal state
}

@router.put("/{quotation_id}/status", response_model=StandardResponse[QuotationResponse])
async def update_quotation_status(
    quotation_id: str,
    req: QuotationStatusUpdate,
    current_user: User = Depends(require_permission(Permission.QUOTATIONS_UPDATE.value))
):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except Exception:
        quotation = None
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    # Tenant isolation
    enforce_tenant(quotation.seller_id, current_user)

    current_status = quotation.status or "DRAFT"
    new_status = req.status.upper()

    # Validate the transition is permitted
    allowed = VALID_KANBAN_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid transition: cannot move quotation from '{current_status}' to '{new_status}'. "
                f"Allowed transitions from '{current_status}': {allowed or ['none — terminal state']}. "
                "To submit for approval, use the /submit endpoint."
            )
        )

    quotation.status = new_status
    await quotation.save()

    await record_audit_log(
        user_id=str(current_user.id),
        user_name=current_user.name,
        seller_id=quotation.seller_id,
        action="QUOTATION_STATUS_UPDATED",
        module="quotations",
        resource_type="Quotation",
        resource_id=str(quotation.id),
        details={"from_status": current_status, "to_status": new_status},
        reason=f"Kanban stage advanced by {current_user.name}: {current_status} → {new_status}"
    )

    return StandardResponse(success=True, message=f"Quotation advanced to {new_status}", data=qt_to_response(quotation))
