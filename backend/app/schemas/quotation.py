from typing import Optional, List
from pydantic import BaseModel
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
    id: str
    quotation_id: str
    unit_price: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    margin_amount: Decimal
    line_total: Decimal
    
    class Config:
        from_attributes = True

class QuotationBase(BaseModel):
    customer_id: str

class QuotationCreate(QuotationBase):
    pass

class QuotationResponse(QuotationBase):
    id: str
    quotation_number: str
    sales_rep_id: str
    status: str
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    grand_total: Decimal
    margin_amount: Decimal
    risk_score: Decimal
    expires_at: Optional[datetime] = None
    items: List[QuotationItemResponse] = []
    
    class Config:
        from_attributes = True
