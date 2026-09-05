from typing import Optional
from decimal import Decimal
from beanie import DecimalAnnotation
from datetime import datetime, timezone
from pydantic import Field
from beanie import Link
from app.models.base import BaseModel
from app.models.quotation import Quotation
from app.models.customer import Customer
from app.models.product import Product

class Order(BaseModel):
    order_number: str = Field(..., max_length=50)
    quotation: Link[Quotation]
    customer: Link[Customer]
    status: str = Field(default="PROCESSING") # PROCESSING, COMPLETED, CANCELLED
    
    total_amount: DecimalAnnotation = Field(default=Decimal("0.0"))
    
    class Settings:
        name = "orders"
        indexes = ["order_number"]

class Subscription(BaseModel):
    order: Link[Order]
    customer: Link[Customer]
    product: Link[Product]
    
    status: str = Field(default="ACTIVE") # ACTIVE, PAST_DUE, CANCELLED
    billing_cycle: str = Field(default="MONTHLY") # MONTHLY, ANNUALLY
    recurring_price: DecimalAnnotation = Field(default=Decimal("0.0"))
    
    next_billing_date: datetime
    
    class Settings:
        name = "subscriptions"

class Invoice(BaseModel):
    invoice_number: str = Field(..., max_length=50)
    order: Optional[Link[Order]] = None
    customer: Optional[Link[Customer]] = None
    bid_id: Optional[str] = None
    customer_name: Optional[str] = None
    seller_name: Optional[str] = None
    
    amount_due: DecimalAnnotation = Field(default=Decimal("0.0"))
    amount_paid: DecimalAnnotation = Field(default=Decimal("0.0"))
    
    status: str = Field(default="DRAFT") # DRAFT, SENT, PAID, OVERDUE
    due_date: datetime
    
    class Settings:
        name = "invoices"
        indexes = ["invoice_number"]
