from typing import Optional, List
from decimal import Decimal
from pydantic import Field, BaseModel as PydanticBaseModel
from app.models.base import BaseModel
from beanie import Link
from app.models.category import Category

class ProductVariant(PydanticBaseModel):
    attribute: str # e.g., Color, Size
    value: str     # e.g., Red, Large

class Product(BaseModel):
    name: str = Field(..., max_length=255)
    sku: str = Field(..., max_length=100)
    category: Optional[Link[Category]] = None
    description: Optional[str] = None
    base_price: Decimal = Field(default=Decimal("0.0"))
    unit: str = Field(default="unit")
    tax_rate: Decimal = Field(default=Decimal("0.0"))
    status: str = Field(default="ACTIVE")
    
    variants: List[ProductVariant] = []
    
    class Settings:
        name = "products"
        indexes = [
            "sku",
            "name"
        ]
