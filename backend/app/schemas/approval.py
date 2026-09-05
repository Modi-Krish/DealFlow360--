from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

class ApprovalBase(BaseModel):
    quotation_id: str
    level: int
    status: str
    reason: Optional[str] = None
    acted_at: Optional[datetime] = None

class ApprovalResponse(ApprovalBase):
    id: str
    
    class Config:
        from_attributes = True

class ApprovalAction(BaseModel):
    action: str # APPROVE, REJECT, REVISION
    reason: str
