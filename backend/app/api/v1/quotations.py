from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId

from app.core.dependencies import require_role
from app.models.quotation import Quotation, QuotationItem
from app.models.product import Product
from app.models.customer import Customer
from app.schemas.quotation import QuotationCreate, QuotationResponse, QuotationItemCreate, QuotationItemResponse
from app.schemas.common import StandardResponse
from app.models.user import User, UserRole
from app.services.pricing import PricingService
from app.services.discount_engine import DiscountEngine
from app.services.approval_engine import ApprovalEngine

router = APIRouter()

def qt_to_response(doc: Quotation) -> QuotationResponse:
    data = doc.model_dump()
    data['id'] = str(doc.id)
    if doc.customer:
        data['customer_id'] = str(doc.customer.ref.id)
    if doc.sales_rep:
        data['sales_rep_id'] = str(doc.sales_rep.ref.id)
        
    return QuotationResponse(**data)

@router.get("/", response_model=StandardResponse[List[QuotationResponse]])
async def get_quotations():
    quotations = await Quotation.find_all().to_list()
    # Simple response for list
    return StandardResponse(success=True, message="Quotations retrieved", data=[qt_to_response(q) for q in quotations])

@router.post("/", response_model=StandardResponse[QuotationResponse])
async def create_quotation(quotation: QuotationCreate, current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SALES_REP]))):
    qt_num = f"QT-{str(uuid.uuid4())[:8].upper()}"
    
    customer = await Customer.get(PydanticObjectId(quotation.customer_id))
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    new_quote = Quotation(
        quotation_number=qt_num,
        customer=customer,
        sales_rep=current_user,
        items=[]
    )
    await new_quote.insert()
    return StandardResponse(success=True, message="Quotation created", data=qt_to_response(new_quote))

@router.post("/{quotation_id}/items", response_model=StandardResponse[QuotationResponse])
async def add_quotation_item(quotation_id: str, item: QuotationItemCreate):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except:
        quotation = None
        
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    try:
        product = await Product.get(PydanticObjectId(item.product_id))
    except:
        product = None
        
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    new_item = QuotationItem(
        product=product,
        quantity=item.quantity,
        discount=item.discount_percent # Pydantic schema expects discount_percent but we use 'discount' directly in our model
    )
    
    # Calculate prices
    # Note: customer_id is a property in the schema, but we need it from the quotation link
    base_price = await PricingService.resolve_price(str(quotation.customer.ref.id), str(product.id))
    PricingService.calculate_line_item(new_item, base_price)
    
    quotation.items.append(new_item)
    PricingService.calculate_quotation_totals(quotation)
    
    await quotation.save()
    
    return StandardResponse(success=True, message="Item added", data=qt_to_response(quotation))

@router.post("/{quotation_id}/submit", response_model=StandardResponse[QuotationResponse])
async def submit_quotation(quotation_id: str):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except:
        quotation = None
        
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    # Evaluate discounts
    evaluation = await DiscountEngine.evaluate(quotation)
    
    if evaluation["requires_approval"]:
        await ApprovalEngine.create_approval_chain(quotation, evaluation["risk_score"])
        message = "Quotation submitted for approval"
    else:
        quotation.status = "APPROVED"
        message = "Quotation approved automatically"
        await quotation.save()
        
    return StandardResponse(success=True, message=message, data=qt_to_response(quotation))
