from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from app.core.dependencies import require_permission
from app.core.permissions import Permission, normalize_role
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.common import StandardResponse

router = APIRouter()

@router.get("/", response_model=StandardResponse[List[Dict[str, Any]]])
async def get_audit_logs(
    module: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    seller_id: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    current_user: User = Depends(require_permission(Permission.AUDIT_LOGS_VIEW.value))
):
    query: Dict[str, Any] = {}
    current_role = normalize_role(current_user.role)
    
    if current_role != "super_admin":
        my_seller_id = current_user.seller_id or str(current_user.id)
        query["seller_id"] = my_seller_id
    elif seller_id:
        query["seller_id"] = seller_id
        
    if module:
        query["module"] = module
    if action:
        query["action"] = action

    logs = await AuditLog.find(query).sort("-timestamp").limit(limit).to_list()
    
    data = []
    for l in logs:
        d = l.model_dump()
        d["id"] = str(l.id)
        data.append(d)
        
    return StandardResponse(
        success=True,
        message="Audit logs retrieved successfully",
        data=data
    )
