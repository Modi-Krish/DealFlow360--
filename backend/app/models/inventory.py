from typing import Optional, List
from pydantic import Field, BaseModel as PydanticBaseModel
from beanie import Link
from app.models.base import BaseModel
from app.models.product import Product

class Warehouse(BaseModel):
    name: str = Field(..., max_length=255)
    location: Optional[str] = None
    is_active: bool = True
    
    class Settings:
        name = "warehouses"

class Inventory(BaseModel):
    warehouse: Link[Warehouse]
    product: Link[Product]
    
    quantity_on_hand: int = Field(default=0)
    quantity_allocated: int = Field(default=0)
    
    class Settings:
        name = "inventories"

class FulfillmentItem(PydanticBaseModel):
    product: Link[Product]
    warehouse: Link[Warehouse]
    quantity: int

class FulfillmentOrder(BaseModel):
    order_number: str = Field(..., max_length=50)
    quotation_id: str
    status: str = Field(default="PENDING") # PENDING, PROCESSING, SHIPPED, DELIVERED
    items: List[FulfillmentItem] = []
    
    class Settings:
        name = "fulfillment_orders"
