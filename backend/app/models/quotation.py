from typing import Optional, List
from decimal import Decimal
from pydantic import Field, BaseModel as PydanticBaseModel
from beanie import Link
from app.models.base import BaseModel
from app.models.user import User
from app.models.customer import Customer
from app.models.product import Product

class QuotationItem(PydanticBaseModel):
    product: Link[Product]
    quantity: int = Field(default=1)
    unit_price: Decimal = Field(default=Decimal("0.0"))
    discount: Decimal = Field(default=Decimal("0.0"))
    tax: Decimal = Field(default=Decimal("0.0"))
    total_price: Decimal = Field(default=Decimal("0.0"))

class Quotation(BaseModel):
    quotation_number: str = Field(..., max_length=50)
    customer: Link[Customer]
    sales_rep: Link[User]
    
    # PENDING, IN_REVIEW, APPROVED, REJECTED, NEGOTIATING, ALLOCATED, CLOSED_WON, CLOSED_LOST
    status: str = Field(default="PENDING")
    
    notes: Optional[str] = None
    customer_notes: Optional[str] = None
    
    subtotal: Decimal = Field(default=Decimal("0.0"))
    discount_total: Decimal = Field(default=Decimal("0.0"))
    tax_total: Decimal = Field(default=Decimal("0.0"))
    grand_total: Decimal = Field(default=Decimal("0.0"))
    
    items: List[QuotationItem] = []
    
    class Settings:
        name = "quotations"
        indexes = ["quotation_number"]
