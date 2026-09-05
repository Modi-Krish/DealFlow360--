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
    pass

class CustomerResponse(CustomerBase):
    id: str
    
    class Config:
        from_attributes = True
