from typing import Optional
from datetime import datetime, timezone
from decimal import Decimal
from pydantic import Field
from beanie import Link
from app.models.base import BaseModel
from app.models.product import Product

class ProductRecommendation(BaseModel):
    source_product: Link[Product]
    recommended_product: Link[Product]
    priority: int = Field(default=1)
    reason: str
    
    class Settings:
        name = "product_recommendations"

class Promotion(BaseModel):
    product: Link[Product]
    promotion_name: str = Field(..., max_length=100)
    discount_percent: Decimal = Field(default=Decimal("0.0"))
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    class Settings:
        name = "promotions"
