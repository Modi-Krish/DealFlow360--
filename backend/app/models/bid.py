from typing import Optional, List
from datetime import datetime, timezone
from decimal import Decimal
from beanie import DecimalAnnotation
from pydantic import Field, BaseModel as PydanticBaseModel
from app.models.base import BaseModel

class BidHistoryItem(PydanticBaseModel):
    actor_role: str  # "CUSTOMER" | "SELLER"
    actor_name: str
    action: str      # "PLACED_BID" | "COUNTERED" | "FINAL_OFFER" | "ACCEPTED" | "REJECTED"
    price: DecimalAnnotation
    message: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductBid(BaseModel):
    bid_number: str = Field(..., max_length=50)
    
    product_id: str
    product_name: str
    
    seller_id: str
    seller_name: str
    
    customer_id: str
    customer_name: str
    customer_email: str
    
    quantity: int = Field(default=1)
    original_price: DecimalAnnotation = Field(default=Decimal("0.0"))
    proposed_price: DecimalAnnotation = Field(default=Decimal("0.0"))
    seller_counter_price: Optional[DecimalAnnotation] = None
    final_agreed_price: Optional[DecimalAnnotation] = None
    
    is_final_offer: bool = Field(default=False)
    
    total_amount: DecimalAnnotation = Field(default=Decimal("0.0"))
    delivery_address: Optional[str] = None
    notes: Optional[str] = None
    
    # Statuses: PENDING_SELLER_REVIEW, SELLER_COUNTERED, CUSTOMER_COUNTERED, AGREED, REJECTED, CANCELLED
    status: str = Field(default="PENDING_SELLER_REVIEW")
    
    # Post-agreement records
    invoice_id: Optional[str] = None
    invoice_number: Optional[str] = None
    fulfillment_id: Optional[str] = None
    fulfillment_number: Optional[str] = None
    
    history: List[BidHistoryItem] = []
    
    class Settings:
        name = "product_bids"
        indexes = [
            "bid_number",
            "seller_id",
            "customer_id",
            "product_id",
            "status"
        ]
