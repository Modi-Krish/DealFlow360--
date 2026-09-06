from datetime import datetime, timezone
from typing import Optional, List
from pydantic import Field, BaseModel as PydanticBaseModel
from beanie import Link
from pymongo import IndexModel, ASCENDING
from app.models.base import BaseModel
from app.models.product import Product

class Warehouse(BaseModel):
    name: str = Field(..., max_length=255)
    seller_id: Optional[str] = None
    location: Optional[str] = None
    shipping_cost_per_kg: float = Field(default=5.0)
    priority_weight: int = Field(default=1) # 1 highest, 10 lowest
    reorder_point: int = Field(default=15)
    reorder_quantity: int = Field(default=50)
    is_active: bool = True
    
    class Settings:
        name = "warehouses"

class InventoryTransaction(BaseModel):
    product_id: str
    warehouse_id: str
    seller_id: Optional[str] = None
    order_id: Optional[str] = None
    bid_id: Optional[str] = None
    invoice_id: Optional[str] = None
    fulfillment_id: Optional[str] = None
    quantity: int
    transaction_type: str
    # Types: ORDER_CONFIRMED, STOCK_RESERVED, STOCK_RELEASED, DISPATCHED, CANCELLATION_BEFORE_DISPATCH, RETURN_REQUESTED, RETURN_RECEIVED, MANUAL_ADJUSTMENT
    previous_quantity_on_hand: int = Field(default=0)
    new_quantity_on_hand: int = Field(default=0)
    previous_quantity_allocated: int = Field(default=0)
    new_quantity_allocated: int = Field(default=0)
    user_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reason: Optional[str] = None
    idempotency_key: str = Field(..., max_length=150)

    class Settings:
        name = "inventory_transactions"
        indexes = [
            "product_id",
            "warehouse_id",
            "order_id",
            "bid_id",
            "transaction_type",
            "idempotency_key"
        ]

class Inventory(BaseModel):
    warehouse: Optional[Link[Warehouse]] = None
    product: Optional[Link[Product]] = None
    warehouse_id: Optional[str] = None
    product_id: Optional[str] = None
    seller_id: Optional[str] = None
    
    quantity_on_hand: int = Field(default=0)         # Physical stock in warehouse
    quantity_allocated: int = Field(default=0)       # Committed to confirmed/billed orders
    quantity_reserved: int = Field(default=0)        # Temporary holds
    quantity_dispatched: int = Field(default=0)      # Currently outside warehouse (shipped)
    quantity_return_pending: int = Field(default=0)  # Cancelled after dispatch, awaiting return
    
    class Settings:
        name = "inventories"
        indexes = [
            "product_id",
            "warehouse_id",
            "seller_id"
        ]

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
    
    status: str = Field(default="READY_FOR_DELIVERY") # READY_FOR_DELIVERY, DISPATCHED, DELIVERED, BACKORDER
    dispatch_notes: Optional[str] = None
    
    is_consolidated: bool = False
    can_consolidate: bool = False
    estimated_delivery_date: Optional[str] = None
    
    items: List[FulfillmentItem] = []
    
    class Settings:
        name = "fulfillment_orders"
        indexes = [
            "order_number",
            "seller_id",
            "bid_id",
            "status"
        ]
