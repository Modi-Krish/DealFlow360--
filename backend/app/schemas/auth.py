from typing import Optional, List
from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    status: str
    permissions: List[str] = []
    seller_id: Optional[str] = None
    company_name: Optional[str] = None
    
    class Config:
        from_attributes = True
