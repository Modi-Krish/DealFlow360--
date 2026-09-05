from typing import Optional, List
from pydantic import BaseModel

class WarehouseBase(BaseModel):
    name: str
    location: str
    type: str = "PRIMARY"
    status: str = "ACTIVE"

class WarehouseResponse(WarehouseBase):
    id: str
    
    class Config:
        from_attributes = True

class InventoryBase(BaseModel):
    warehouse_id: str
    product_id: str
    quantity_on_hand: int
    quantity_allocated: int
    quantity_available: int

class InventoryResponse(InventoryBase):
    id: str
    
    class Config:
        from_attributes = True

class FulfillmentOrderResponse(BaseModel):
    id: str
    quotation_id: str
    status: str
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    
    class Config:
        from_attributes = True
