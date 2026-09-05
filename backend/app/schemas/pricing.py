from typing import Optional, List
from pydantic import BaseModel
from decimal import Decimal

class PriceListItemBase(BaseModel):
    product_id: str
    price: Decimal

class PriceListItemCreate(PriceListItemBase):
    pass

class PriceListItemResponse(PriceListItemBase):
    id: str
    price_list_id: str
    
    class Config:
        from_attributes = True

class PriceListBase(BaseModel):
    name: str
    customer_tier: Optional[str] = None
    currency: str = "USD"
    status: str = "ACTIVE"

class PriceListCreate(PriceListBase):
    pass

class PriceListResponse(PriceListBase):
    id: str
    items: List[PriceListItemResponse] = []
    
    class Config:
        from_attributes = True
