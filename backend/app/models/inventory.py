from typing import Optional, List
from pydantic import Field, BaseModel as PydanticBaseModel
from beanie import Link
from app.models.base import BaseModel
from app.models.product import Product

class Warehouse(BaseModel):
    name: str = Field(..., max_length=255)
    seller_id: Optional[str] = None
    location: Optional[str] = None
    is_active: bool = True
    
    class Settings:
        name = "warehouses"

class Inventory(BaseModel):
    warehouse: Optional[Link[Warehouse]] = None
    product: Optional[Link[Product]] = None
    seller_id: Optional[str] = None
    
    quantity_on_hand: int = Field(default=0)
    quantity_allocated: int = Field(default=0)
    
    class Settings:
        name = "inventories"

class FulfillmentItem(PydanticBaseModel):
    product_name: str
    quantity: int
    warehouse_name: Optional[str] = None

class FulfillmentOrder(BaseModel):
    order_number: str = Field(..., max_length=50)
    quotation_id: Optional[str] = None
    bid_id: Optional[str] = None
    
    seller_id: Optional[str] = None
    seller_name: Optional[str] = None
    
    customer_name: Optional[str] = None
    delivery_address: Optional[str] = None
    
    product_name: Optional[str] = None
    quantity_to_deliver: int = Field(default=1)
    
    status: str = Field(default="READY_FOR_DELIVERY") # READY_FOR_DELIVERY, DISPATCHED, DELIVERED
    dispatch_notes: Optional[str] = None
    
    items: List[FulfillmentItem] = []
    
    class Settings:
        name = "fulfillment_orders"
        indexes = [
            "order_number",
            "seller_id",
            "bid_id",
            "status"
        ]
