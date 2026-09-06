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

class DiscountRuleUpdate(BaseModel):
    tier_ceilings: Optional[dict] = None
    category_ceilings: Optional[dict] = None
    routing_matrix: Optional[list] = None
    sales_manager_threshold: Optional[float] = None
    finance_threshold: Optional[float] = None

class DiscountRuleResponse(BaseModel):
    id: Optional[str] = None
    seller_id: Optional[str] = None
    tier_ceilings: dict
    category_ceilings: dict
    routing_matrix: list
    sales_manager_threshold: float = 10.0
    finance_threshold: float = 20.0
