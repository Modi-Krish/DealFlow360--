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

class DiscountRule(BaseModel):
    seller_id: Optional[str] = None
    tier_ceilings: dict = Field(default_factory=lambda: {
        "Bronze": 5.0,
        "Silver": 10.0,
        "Gold": 15.0,
        "Standard": 5.0,
        "Platinum": 25.0
    })
    category_ceilings: dict = Field(default_factory=lambda: {
        "Hardware": 15.0,
        "Services": 10.0,
        "Subscription": 10.0
    })
    sales_manager_threshold: float = Field(default=10.0)
    finance_threshold: float = Field(default=20.0)
    routing_matrix: list = Field(default_factory=lambda: [
        {"range": "Within tier/Category limit", "action": "No approval needed"},
        {"range": "Over Limit, blended risk medium", "action": "Sales manager"},
        {"range": "Over limit, blended high risk", "action": "Sales manager then finance"}
    ])

    class Settings:
        name = "discount_rules"
        indexes = ["seller_id"]
