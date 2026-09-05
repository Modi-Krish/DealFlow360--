from typing import Optional, List
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime

class PriceListItemCreate(BaseModel):
    product_id: str
    custom_price: Decimal

class PriceListItemResponse(BaseModel):
    product_name: Optional[str] = None
    product_id: Optional[str] = None
    custom_price: Decimal
    
    class Config:
        from_attributes = True

class PriceListBase(BaseModel):
    name: str
    currency: str = "USD"
    is_active: bool = True
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None

class PriceListCreate(PriceListBase):
    pass

class PriceListResponse(PriceListBase):
    id: str
    items: List[PriceListItemResponse] = []
    
    class Config:
        from_attributes = True
