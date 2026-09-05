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
        if it.product:
            it_dict['product_id'] = str(it.product.id if hasattr(it.product, 'id') else it.product.ref.id)
        else:
            it_dict['product_id'] = ""
        it_dict['discount_percent'] = Decimal(str(it.discount))
        it_dict['discount_amount'] = Decimal(str(it.discount))
        it_dict['tax_amount'] = Decimal(str(it.tax))
        it_dict['line_total'] = Decimal(str(it.total_price))
        it_dict['margin_amount'] = Decimal("0.0")
        transformed_items.append(QuotationItemResponse(**it_dict))
        
    data['items'] = transformed_items
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
        
    try:
        product = await Product.get(PydanticObjectId(item.product_id))
    except Exception:
        product = None
        
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    new_item = QuotationItem(
        product=product,
        quantity=item.quantity,
        discount=Decimal(str(item.discount_percent))
    )
    
    # Calculate prices
    cust_id = quotation.customer.id if hasattr(quotation.customer, 'id') else quotation.customer.ref.id
    customer_id_str = str(cust_id) if cust_id else ""
    base_price = await PricingService.resolve_price(customer_id_str, str(product.id))
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
