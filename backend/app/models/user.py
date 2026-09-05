from enum import Enum as PyEnum
from typing import Optional
from app.models.base import BaseModel
from pydantic import Field, EmailStr

class UserRole(str, PyEnum):
    ADMIN = "ADMIN"
    SALES_REP = "SALES_REP"
    SALES_MANAGER = "SALES_MANAGER"
    FINANCE_OPS = "FINANCE_OPS"
    CUSTOMER = "CUSTOMER"

class User(BaseModel):
    name: str = Field(..., max_length=255)
    email: str = Field(..., max_length=255)
    password_hash: str
    role: UserRole = Field(default=UserRole.SALES_REP)
    is_active: bool = True
    
    class Settings:
        name = "users"
        indexes = [
            "email"
        ]
