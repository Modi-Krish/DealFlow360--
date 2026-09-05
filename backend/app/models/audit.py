from pydantic import Field
from typing import Dict, Any, Optional
from app.models.base import BaseModel

class AuditLog(BaseModel):
    user_id: str
    action: str
    resource_type: str
    resource_id: str
    details: Optional[Dict[str, Any]] = None
    
    class Settings:
        name = "audit_logs"
