from typing import Optional, List
from decimal import Decimal
from beanie import DecimalAnnotation
from pydantic import Field, BaseModel as PydanticBaseModel
from beanie import Link
from app.models.base import BaseModel
from app.models.user import User
from app.models.customer import Customer
from app.models.product import Product

import uuid
from datetime import datetime, timezone

class QuotationItemComment(PydanticBaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author_name: str
    author_role: str = "CUSTOMER" # CUSTOMER or SALES_REP
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuotationItem(PydanticBaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product: Link[Product]
    variant: Optional[str] = None
    quantity: int = Field(default=1)
    unit_price: DecimalAnnotation = Field(default=Decimal("0.0"))
    discount: DecimalAnnotation = Field(default=Decimal("0.0"))
    tax: DecimalAnnotation = Field(default=Decimal("0.0"))
    total_price: DecimalAnnotation = Field(default=Decimal("0.0"))
    comments: List[QuotationItemComment] = []

class Quotation(BaseModel):
    quotation_number: str = Field(..., max_length=50)
    customer: Link[Customer]
    sales_rep: Link[User]
    
    # Multi-tenant scoping
    seller_id: Optional[str] = None
    
    # Approval chain state
    approval_level: Optional[str] = None # SALES_MANAGER, FINANCE, NONE
    risk_score: Optional[float] = 0.0
    
    # PENDING, IN_REVIEW, PENDING_APPROVAL, APPROVED, REJECTED, NEGOTIATING, ALLOCATED, CLOSED_WON, CLOSED_LOST
    status: str = Field(default="PENDING")
    
    notes: Optional[str] = None
    customer_notes: Optional[str] = None
    promised_delivery_date: Optional[datetime] = None
    sla_status: Optional[str] = "ON_TIME" # ON_TIME, AT_RISK, DELAYED
    
    subtotal: DecimalAnnotation = Field(default=Decimal("0.0"))
    discount_total: DecimalAnnotation = Field(default=Decimal("0.0"))
    tax_total: DecimalAnnotation = Field(default=Decimal("0.0"))
    grand_total: DecimalAnnotation = Field(default=Decimal("0.0"))
    
    items: List[QuotationItem] = []
    
    class Settings:
        name = "quotations"
        indexes = ["quotation_number", "seller_id", "status"]
