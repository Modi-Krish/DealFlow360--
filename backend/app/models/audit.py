from pydantic import Field
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from app.models.base import BaseModel

class AuditLog(BaseModel):
    user_id: str
    user_name: Optional[str] = None
    seller_id: Optional[str] = None
    action: str
    module: str = "general"
    resource_type: str
    resource_id: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    reason: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    class Settings:
        name = "audit_logs"
        indexes = [
            "user_id",
            "seller_id",
            "action",
            "module",
            "resource_id",
            "timestamp"
        ]

async def record_audit_log(
    user_id: str,
    action: str,
    resource_type: str,
    resource_id: str,
    module: str = "general",
    user_name: Optional[str] = None,
    seller_id: Optional[str] = None,
    old_value: Optional[Any] = None,
    new_value: Optional[Any] = None,
    reason: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> AuditLog:
    """Helper to record an audit log entry in the system."""
    log = AuditLog(
        user_id=user_id,
        user_name=user_name,
        seller_id=seller_id,
        action=action,
        module=module,
        resource_type=resource_type,
        resource_id=resource_id,
        old_value=old_value,
        new_value=new_value,
        reason=reason,
        details=details
    )
    await log.insert()
    return log
