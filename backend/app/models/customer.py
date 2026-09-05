from typing import Optional
from pydantic import Field
from app.models.base import BaseModel

class Customer(BaseModel):
    name: str = Field(..., max_length=255)
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    customer_tier: str = Field(default="STANDARD")
    address: Optional[str] = None
    status: str = Field(default="ACTIVE")
    
    class Settings:
        name = "customers"
        indexes = ["name"]
