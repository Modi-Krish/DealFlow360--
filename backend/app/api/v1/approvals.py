from typing import List
from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId
from datetime import datetime, timezone

from app.core.dependencies import require_role
from app.models.approval import Approval, ApprovalHistory
from app.models.quotation import Quotation
from app.schemas.approval import ApprovalResponse, ApprovalAction
from app.schemas.common import StandardResponse
from app.models.user import User, UserRole

router = APIRouter()

def ap_to_response(doc: Approval) -> ApprovalResponse:
    data = doc.model_dump()
    data['id'] = str(doc.id)
    if doc.quotation:
        data['quotation_id'] = str(doc.quotation.ref.id)
    if doc.requested_by:
        data['requester_id'] = str(doc.requested_by.ref.id)
    if doc.approver:
        data['approver_id'] = str(doc.approver.ref.id)
        
    # Mocking these out for frontend compatibility
    data['level'] = 1
    data['acted_at'] = doc.updated_at
    data['reason'] = doc.notes
    
    return ApprovalResponse(**data)

@router.get("/", response_model=StandardResponse[List[ApprovalResponse]])
async def get_pending_approvals(current_user: User = Depends(require_role([UserRole.SALES_MANAGER, UserRole.FINANCE_OPS, UserRole.ADMIN]))):
    approvals = await Approval.find(Approval.status == "PENDING").to_list()
    return StandardResponse(success=True, message="Approvals retrieved", data=[ap_to_response(a) for a in approvals])

@router.post("/{approval_id}/act", response_model=StandardResponse[ApprovalResponse])
async def act_on_approval(approval_id: str, action_data: ApprovalAction, current_user: User = Depends(require_role([UserRole.SALES_MANAGER, UserRole.FINANCE_OPS, UserRole.ADMIN]))):
    try:
        approval = await Approval.get(PydanticObjectId(approval_id))
    except:
        approval = None
        
    if not approval or approval.status != "PENDING":
        raise HTTPException(status_code=400, detail="Approval not found or already processed")
        
    await approval.fetch_link(Approval.quotation)
    quotation = approval.quotation
    
    old_status = quotation.status
    
    approval.status = action_data.action + "D" if action_data.action in ["APPROVE", "REJECT"] else action_data.action
    approval.notes = action_data.reason
    approval.approver = current_user
    
    if action_data.action == "APPROVE":
        pending_others = await Approval.find(
            Approval.quotation.id == quotation.id,
            Approval.status == "PENDING",
            Approval.id != approval.id
        ).count()
        
        if pending_others > 0:
            quotation.status = "PENDING_APPROVAL"
        else:
            quotation.status = "APPROVED"
    elif action_data.action == "REJECT":
        quotation.status = "REJECTED"
    elif action_data.action == "REVISION":
        quotation.status = "DRAFT"
        
    history = ApprovalHistory(
        approval=approval,
        action_by=current_user,
        action=action_data.action,
        comments=f"{action_data.action} - {action_data.reason}"
    )
    
    await approval.save()
    await quotation.save()
    await history.insert()
    
    return StandardResponse(success=True, message=f"Approval {action_data.action} processed", data=ap_to_response(approval))
