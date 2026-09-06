from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
from enum import Enum
from app.schemas.customer import CustomerResponse
from app.schemas.quotation import QuotationResponse

class OrderStatus(str, Enum):
    PROCESSING = "PROCESSING"
    CONFIRMED = "CONFIRMED"
    PAID = "PAID"
    SHIPPED = "SHIPPED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class SubscriptionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    PAST_DUE = "PAST_DUE"
    CANCELLED = "CANCELLED"

class InvoiceStatus(str, Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    PAID = "PAID"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"

class OrderBase(BaseModel):
    quotation_id: Optional[str] = None
    customer_id: Optional[str] = None
    total_amount: Decimal = Decimal("0.0")
    status: OrderStatus = OrderStatus.PROCESSING

class OrderResponse(OrderBase):
    id: str
    order_number: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class SubscriptionBase(BaseModel):
    order_id: Optional[str] = None
    customer_id: Optional[str] = None
    product_id: Optional[str] = None
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE
    billing_cycle: str = "MONTHLY"
    recurring_price: Decimal = Decimal("0.0")
    next_billing_date: datetime

class SubscriptionResponse(SubscriptionBase):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class InvoiceBase(BaseModel):
    order_id: Optional[str] = None
    customer_id: Optional[str] = None
    amount_due: Decimal = Decimal("0.0")
    amount_paid: Decimal = Decimal("0.0")
    status: InvoiceStatus = InvoiceStatus.DRAFT
    due_date: datetime

class InvoiceResponse(InvoiceBase):
    id: str
    invoice_number: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class PaymentRequest(BaseModel):
    payment_method: str = "Bank Transfer"
    amount: Optional[Decimal] = None
    reference_id: Optional[str] = None
    notes: Optional[str] = None

class SubscriptionStatusRequest(BaseModel):
    status: SubscriptionStatus

class OrderStatusRequest(BaseModel):
    status: OrderStatus
