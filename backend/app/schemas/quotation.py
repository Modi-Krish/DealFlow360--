from typing import Optional, List
from pydantic import BaseModel, Field
from decimal import Decimal
from datetime import datetime

class QuotationItemBase(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    quantity: int = 1
    discount_percent: Decimal = Decimal("0.0")

class QuotationItemCreate(QuotationItemBase):
    pass

class QuotationItemResponse(QuotationItemBase):
    id: Optional[str] = None
    quotation_id: Optional[str] = None
    unit_price: Decimal = Decimal("0.0")
    discount_amount: Decimal = Decimal("0.0")
    tax_amount: Decimal = Decimal("0.0")
    margin_amount: Decimal = Decimal("0.0")
    line_total: Decimal = Decimal("0.0")
    
    class Config:
        from_attributes = True

class QuotationBase(BaseModel):
    customer_id: str

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
    items: List[QuotationItemResponse] = []
    
    class Config:
        from_attributes = True
