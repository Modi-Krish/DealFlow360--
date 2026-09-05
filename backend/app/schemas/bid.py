from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field

class BidCreate(BaseModel):
    product_id: str
    quantity: int = Field(default=1, ge=1)
    proposed_price: Decimal = Field(..., gt=0)
    delivery_address: str = Field(..., min_length=5)
    notes: Optional[str] = None

class SellerBidAction(BaseModel):
    action: str = Field(..., pattern="^(ACCEPT|COUNTER|REJECT)$")
    counter_price: Optional[Decimal] = None
    is_final_offer: bool = False
    notes: Optional[str] = None

class CustomerBidAction(BaseModel):
    action: str = Field(..., pattern="^(ACCEPT|COUNTER|CANCEL)$")
    proposed_price: Optional[Decimal] = None
    notes: Optional[str] = None

class BidHistoryItemResponse(BaseModel):
    actor_role: str
    actor_name: str
    action: str
    price: Decimal
    message: Optional[str] = None
    timestamp: datetime

class BidResponse(BaseModel):
    id: str
    bid_number: str
    product_id: str
    product_name: str
    seller_id: str
    seller_name: str
    customer_id: str
    customer_name: str
    customer_email: str
    quantity: int
    original_price: Decimal
    proposed_price: Decimal
    seller_counter_price: Optional[Decimal] = None
    final_agreed_price: Optional[Decimal] = None
    is_final_offer: bool = False
    total_amount: Decimal
    delivery_address: Optional[str] = None
    notes: Optional[str] = None
    status: str
    invoice_id: Optional[str] = None
    invoice_number: Optional[str] = None
    fulfillment_id: Optional[str] = None
    fulfillment_number: Optional[str] = None
    history: List[BidHistoryItemResponse] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
