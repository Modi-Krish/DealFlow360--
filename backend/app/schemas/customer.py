from typing import Optional
from pydantic import BaseModel, EmailStr

class CustomerBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    customer_tier: str = "STANDARD"
    address: Optional[str] = None
    status: str = "ACTIVE"

class CustomerCreate(CustomerBase):
    seller_id: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    customer_tier: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: str
    seller_id: Optional[str] = None
    
    class Config:
        from_attributes = True
