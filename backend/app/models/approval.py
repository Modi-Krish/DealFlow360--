from typing import Optional
from datetime import datetime, timezone
from pydantic import Field
from beanie import Link
from app.models.base import BaseModel
from app.models.quotation import Quotation
from app.models.user import User

class Approval(BaseModel):
    quotation: Link[Quotation]
    requested_by: Link[User]
    approver: Link[User]
    
    # PENDING, APPROVED, REJECTED
    status: str = Field(default="PENDING")
    
    notes: Optional[str] = None
    
    class Settings:
        name = "approvals"

class ApprovalHistory(BaseModel):
    approval: Link[Approval]
    action_by: Link[User]
    action: str
    comments: Optional[str] = None
    
    class Settings:
        name = "approval_histories"
