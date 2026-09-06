from typing import Optional, List
from pydantic import BaseModel, Field
from decimal import Decimal
from datetime import datetime

class QuotationItemBase(BaseModel):
    product_id: str = Field(..., min_length=1, description="Product ObjectId is required")
    variant_id: Optional[str] = None
    variant: Optional[str] = None
    quantity: int = Field(..., gt=0, description="Quantity must be an integer greater than 0")
    discount_percent: Decimal = Field(default=Decimal("0.0"), ge=0, le=100, description="Discount percentage must be between 0 and 100")

class QuotationItemCreate(QuotationItemBase):
    pass

class QuotationItemUpdate(BaseModel):
    quantity: Optional[int] = Field(None, gt=0, description="Quantity must be greater than 0")
    discount_percent: Optional[Decimal] = Field(None, ge=0, le=100, description="Discount percentage must be between 0 and 100")
    variant: Optional[str] = None

class QuotationItemResponse(QuotationItemBase):
    id: Optional[str] = None
    quotation_id: Optional[str] = None
    variant: Optional[str] = None
    unit_price: Decimal = Decimal("0.0")
    discount_amount: Decimal = Decimal("0.0")
    tax_amount: Decimal = Decimal("0.0")
    margin_amount: Decimal = Decimal("0.0")
    line_total: Decimal = Decimal("0.0")
    comments: List[dict] = []
    
    class Config:
        from_attributes = True

class QuotationBase(BaseModel):
    customer_id: str = Field(..., min_length=1, description="Customer ID is required")

class QuotationCreate(QuotationBase):
    seller_id: Optional[str] = None

class QuotationResponse(QuotationBase):
    id: str
    quotation_number: str
    sales_rep_id: str
    seller_id: Optional[str] = None
    approval_level: Optional[str] = None
    status: str
    subtotal: Decimal = Decimal("0.0")
    discount_total: Decimal = Decimal("0.0")
    tax_total: Decimal = Decimal("0.0")
    grand_total: Decimal = Decimal("0.0")
    margin_amount: Decimal = Decimal("0.0")
    risk_score: Decimal = Decimal("0.0")
    expires_at: Optional[datetime] = None
    promised_delivery_date: Optional[datetime] = None
    sla_status: Optional[str] = "ON_TIME"
    items: List[QuotationItemResponse] = []
    
    class Config:
        from_attributes = True
