from typing import Optional, List
from decimal import Decimal
from beanie import DecimalAnnotation
from datetime import datetime, timezone
from pydantic import Field, BaseModel as PydanticBaseModel
from beanie import Link
from app.models.base import BaseModel
from app.models.product import Product

class PriceListItem(PydanticBaseModel):
    product: Link[Product]
    custom_price: DecimalAnnotation

class PriceList(BaseModel):
    name: str = Field(..., max_length=255)
    currency: str = Field(default="USD")
    seller_id: Optional[str] = None
    is_active: bool = True
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    items: List[PriceListItem] = []
    
    class Settings:
        name = "price_lists"
        indexes = ["name", "seller_id"]
