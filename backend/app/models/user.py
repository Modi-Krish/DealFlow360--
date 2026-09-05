from enum import Enum as PyEnum
from typing import Optional
from app.models.base import BaseModel
from pydantic import Field

class UserRole(str, PyEnum):
    ADMIN = "ADMIN"
    SELLER = "SELLER"
    SELLER_EMPLOYEE = "SELLER_EMPLOYEE"
    SALES_REP = "SALES_REP"
    SALES_MANAGER = "SALES_MANAGER"
    FINANCE_OPS = "FINANCE_OPS"
    WAREHOUSE_OPS = "WAREHOUSE_OPS"
    CUSTOMER = "CUSTOMER"

class User(BaseModel):
    name: str = Field(..., max_length=255)
    email: str = Field(..., max_length=255)
    password_hash: str
    role: UserRole = Field(default=UserRole.CUSTOMER)
    is_active: bool = True
    company_name: Optional[str] = None
    seller_id: Optional[str] = None  # Links employee / warehouse ops to a seller
    
    class Settings:
        name = "users"
        indexes = [
            "email",
            "role",
            "seller_id"
        ]
