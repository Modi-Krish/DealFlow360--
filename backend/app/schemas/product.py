from typing import Optional, List
from pydantic import BaseModel
from decimal import Decimal

# Category Schemas
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "ACTIVE"

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: str
    
    class Config:
        from_attributes = True

# Product Variant Schemas
class ProductVariantBase(BaseModel):
    attribute: str
    value: str
    extra_price: Decimal = Decimal("0.0")

class ProductVariantCreate(ProductVariantBase):
    pass

class ProductVariantResponse(ProductVariantBase):
    id: str
    product_id: str
    
    class Config:
        from_attributes = True

# Product Schemas
class ProductBase(BaseModel):
    name: str
    sku: Optional[str] = None
    category_id: Optional[str] = None
    description: Optional[str] = None
    base_price: Decimal = Decimal("0.0")
    unit: str = "unit"
    tax_rate: Decimal = Decimal("0.0")
    status: str = "ACTIVE"
    seller_id: Optional[str] = None
    seller_name: Optional[str] = None
    stock_quantity: Optional[int] = 100

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: str
    category: Optional[CategoryResponse] = None
    variants: List[ProductVariantResponse] = []
    
    class Config:
        from_attributes = True
