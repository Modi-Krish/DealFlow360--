from typing import Optional
from decimal import Decimal
from beanie import DecimalAnnotation
from datetime import datetime, timezone
from pydantic import Field
from beanie import Link
from pymongo import IndexModel, ASCENDING
from app.models.base import BaseModel
from app.models.quotation import Quotation
from app.models.customer import Customer
from app.models.product import Product

class Order(BaseModel):
    order_number: str = Field(..., max_length=50)
    quotation: Optional[Link[Quotation]] = None
    customer: Link[Customer]
    seller_id: Optional[str] = None
    status: str = Field(default="PROCESSING") # PROCESSING, COMPLETED, CANCELLED
    
    total_amount: DecimalAnnotation = Field(default=Decimal("0.0"))
    
    class Settings:
        name = "orders"
        indexes = [
            IndexModel([("order_number", ASCENDING)], unique=True),
            "seller_id"
        ]

class Subscription(BaseModel):
    order: Optional[Link[Order]] = None
    customer: Link[Customer]
    product: Link[Product]
    seller_id: Optional[str] = None
    
    status: str = Field(default="ACTIVE") # ACTIVE, PAST_DUE, CANCELLED
    billing_cycle: str = Field(default="MONTHLY") # MONTHLY, ANNUALLY
    recurring_price: DecimalAnnotation = Field(default=Decimal("0.0"))
    
    next_billing_date: datetime
    
    class Settings:
        name = "subscriptions"
        indexes = ["seller_id"]

class Invoice(BaseModel):
    invoice_number: str = Field(..., max_length=50)
    order: Optional[Link[Order]] = None
    customer: Optional[Link[Customer]] = None
    bid_id: Optional[str] = None
    customer_name: Optional[str] = None
    seller_name: Optional[str] = None
    seller_id: Optional[str] = None
    
    amount_due: DecimalAnnotation = Field(default=Decimal("0.0"))
    amount_paid: DecimalAnnotation = Field(default=Decimal("0.0"))
    
    is_hybrid: bool = False
    one_time_amount: DecimalAnnotation = Field(default=Decimal("0.0"))
    recurring_amount: DecimalAnnotation = Field(default=Decimal("0.0"))
    
    status: str = Field(default="DRAFT") # DRAFT, SENT, PAID, OVERDUE
    due_date: datetime
    
    class Settings:
        name = "invoices"
        indexes = [
            IndexModel([("invoice_number", ASCENDING)], unique=True),
            "seller_id"
        ]

class CreditNote(BaseModel):
    credit_note_number: str = Field(..., max_length=50)
    order: Optional[Link[Order]] = None
    invoice: Optional[Link[Invoice]] = None
    customer: Optional[Link[Customer]] = None
    subscription_id: Optional[str] = None
    seller_id: Optional[str] = None
    
    amount: DecimalAnnotation = Field(default=Decimal("0.0"))
    reason: str = Field(default="Subscription cancellation / downgrade proration")
    refund_method: str = Field(default="ACCOUNT_CREDIT") # ACCOUNT_CREDIT, ORIGINAL_PAYMENT
    status: str = Field(default="ISSUED") # ISSUED, APPLIED, REFUNDED
    
    class Settings:
        name = "credit_notes"
        indexes = [
            IndexModel([("credit_note_number", ASCENDING)], unique=True),
            "seller_id",
            "status"
        ]

class SubscriptionPlan(BaseModel):
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=50) # e.g. ENTERPRISE_ANNUAL, PRO_MONTHLY
    billing_cycle: str = Field(default="MONTHLY") # MONTHLY, QUARTERLY, ANNUALLY
    price_multiplier: float = Field(default=1.0)
    proration_policy: str = Field(default="DAILY_PRO_RATA") # DAILY_PRO_RATA, FULL_PERIOD, NO_REFUND
    cancellation_fee: DecimalAnnotation = Field(default=Decimal("0.0"))
    description: Optional[str] = None
    is_active: bool = True
    seller_id: Optional[str] = None
    
    class Settings:
        name = "subscription_plans"
        indexes = [
            IndexModel([("code", ASCENDING)], unique=True),
            "seller_id"
        ]
