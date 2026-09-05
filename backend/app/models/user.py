from enum import Enum as PyEnum
from typing import Optional, List
from app.models.base import BaseModel
from pydantic import Field

class UserRole(str, PyEnum):
    SUPER_ADMIN = "super_admin"
    SELLER = "seller"
    SALES_MANAGER = "sales_manager"
    SALES_REP = "sales_rep"
    FINANCE = "finance"
    OPERATIONS = "operations"
    CUSTOMER = "customer"
    
    # Backward compatibility aliases
    ADMIN = "super_admin"
    SELLER_EMPLOYEE = "sales_rep"
    FINANCE_OPS = "finance"
    WAREHOUSE_OPS = "operations"

class User(BaseModel):
    name: str = Field(..., max_length=255)
    email: str = Field(..., max_length=255)
    password_hash: str
    role: str = Field(default=UserRole.CUSTOMER.value)
    permissions: List[str] = Field(default_factory=list)
    seller_id: Optional[str] = None  # Links employee / operations to a seller organization
    company_name: Optional[str] = None
    is_active: bool = True
    status: str = Field(default="ACTIVE") # ACTIVE, INACTIVE, SUSPENDED
    created_by: Optional[str] = None
    
    class Settings:
        name = "users"
        indexes = [
            "email",
            "role",
            "seller_id"
        ]
