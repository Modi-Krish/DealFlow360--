from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId

from app.core.dependencies import require_role
from app.models.billing import Order, Subscription, Invoice
from app.models.quotation import Quotation
from app.schemas.billing import OrderResponse, SubscriptionResponse, InvoiceResponse
from app.schemas.common import StandardResponse
from app.services.billing_engine import BillingEngine
from app.models.user import UserRole

router = APIRouter()

def order_to_response(doc: Order) -> OrderResponse:
    data = doc.model_dump()
    data['id'] = str(doc.id)
    if doc.customer:
        data['customer_id'] = str(doc.customer.ref.id)
    if doc.quotation:
        data['quotation_id'] = str(doc.quotation.ref.id)
    return OrderResponse(**data)

def sub_to_response(doc: Subscription) -> SubscriptionResponse:
    data = doc.model_dump()
    data['id'] = str(doc.id)
    if doc.customer:
        data['customer_id'] = str(doc.customer.ref.id)
    if doc.product:
        data['product_id'] = str(doc.product.ref.id)
    if doc.order:
        data['order_id'] = str(doc.order.ref.id)
    return SubscriptionResponse(**data)

def inv_to_response(doc: Invoice) -> InvoiceResponse:
    data = doc.model_dump()
    data['id'] = str(doc.id)
    if doc.customer:
        data['customer_id'] = str(doc.customer.ref.id)
    if doc.order:
        data['order_id'] = str(doc.order.ref.id)
    return InvoiceResponse(**data)

@router.get("/orders", response_model=StandardResponse[List[OrderResponse]])
async def get_orders():
    orders = await Order.find_all().sort("-created_at").to_list()
    return StandardResponse(success=True, message="Orders retrieved", data=[order_to_response(o) for o in orders])

@router.get("/subscriptions", response_model=StandardResponse[List[SubscriptionResponse]])
async def get_subscriptions():
    subscriptions = await Subscription.find_all().sort("-created_at").to_list()
    return StandardResponse(success=True, message="Subscriptions retrieved", data=[sub_to_response(s) for s in subscriptions])

@router.get("/invoices", response_model=StandardResponse[List[InvoiceResponse]])
async def get_invoices():
    invoices = await Invoice.find_all().sort("-created_at").to_list()
    return StandardResponse(success=True, message="Invoices retrieved", data=[inv_to_response(i) for i in invoices])

@router.post("/process-won-quotation/{quotation_id}", response_model=StandardResponse[Dict[str, Any]])
async def process_won_quotation(quotation_id: str):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except:
        quotation = None
        
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    if quotation.status not in ["APPROVED", "ALLOCATED"]:
        raise HTTPException(status_code=400, detail="Only approved or allocated quotations can be won and billed")
        
    try:
        billing_result = await BillingEngine.process_won_quotation(quotation)
        return StandardResponse(success=True, message="Billing generated successfully", data=billing_result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
