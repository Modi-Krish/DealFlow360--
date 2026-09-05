from typing import Optional, List
from pydantic import BaseModel

class WarehouseBase(BaseModel):
    name: str
    location: Optional[str] = None
    seller_id: Optional[str] = None
    type: str = "PRIMARY"
    status: str = "ACTIVE"

class WarehouseResponse(WarehouseBase):
    id: str
    
    class Config:
        from_attributes = True

class InventoryBase(BaseModel):
    warehouse_id: Optional[str] = None
    product_id: Optional[str] = None
    seller_id: Optional[str] = None
    quantity_on_hand: int = 0
    quantity_allocated: int = 0
    quantity_available: int = 0

class InventoryResponse(InventoryBase):
    id: str
    
    class Config:
        from_attributes = True

class FulfillmentOrderResponse(BaseModel):
    id: str
    order_number: Optional[str] = None
    quotation_id: Optional[str] = None
    bid_id: Optional[str] = None
    seller_id: Optional[str] = None
    seller_name: Optional[str] = None
    customer_name: Optional[str] = None
    delivery_address: Optional[str] = None
    product_name: Optional[str] = None
    quantity_to_deliver: Optional[int] = 1
    status: str
    dispatch_notes: Optional[str] = None
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    
    class Config:
        from_attributes = True
