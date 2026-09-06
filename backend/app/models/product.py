from typing import Optional, List
from decimal import Decimal
from beanie import DecimalAnnotation
from pydantic import Field, BaseModel as PydanticBaseModel
from app.models.base import BaseModel
from beanie import Link
from app.models.category import Category

class ProductVariant(PydanticBaseModel):
    attribute: str # e.g., Color, Size, Pack
    value: str     # e.g., Red, Large, 5-Pack
    price_surcharge: DecimalAnnotation = Field(default=Decimal("0.0"))

class Product(BaseModel):
    name: str = Field(..., max_length=255)
    sku: str = Field(..., max_length=100)
    category: Optional[Link[Category]] = None
    description: Optional[str] = None
    base_price: DecimalAnnotation = Field(default=Decimal("0.0"))
    unit: str = Field(default="unit")
    tax_rate: DecimalAnnotation = Field(default=Decimal("0.0"))
    status: str = Field(default="ACTIVE")
    
    # Multi-Seller attributes
    seller_id: Optional[str] = None
    seller_name: Optional[str] = None
    stock_quantity: int = Field(default=100)
    
    variants: List[ProductVariant] = []
    
    class Settings:
        name = "products"
        indexes = [
            "sku",
            "name",
            "seller_id"
        ]
