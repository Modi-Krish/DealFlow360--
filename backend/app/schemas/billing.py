from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal
from app.schemas.customer import CustomerResponse
from app.schemas.quotation import QuotationResponse

class OrderBase(BaseModel):
    quotation_id: str
    customer_id: str
    total_amount: Decimal
    status: str = "PROCESSING"

class OrderResponse(OrderBase):
    id: str
    order_number: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class SubscriptionBase(BaseModel):
    order_id: str
    customer_id: str
    product_id: str
    status: str = "ACTIVE"
    billing_cycle: str
    recurring_price: Decimal
    next_billing_date: datetime

class SubscriptionResponse(SubscriptionBase):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class InvoiceBase(BaseModel):
    order_id: str
    customer_id: str
    amount_due: Decimal
    amount_paid: Decimal = 0.0
    status: str = "DRAFT"
    due_date: datetime

class InvoiceResponse(InvoiceBase):
    id: str
    invoice_number: str
    created_at: datetime
    
    class Config:
        from_attributes = True
