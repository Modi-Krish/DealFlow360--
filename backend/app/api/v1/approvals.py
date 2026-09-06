from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from beanie import PydanticObjectId
from datetime import datetime, timezone

from app.core.dependencies import get_current_user, require_permission, enforce_tenant
from app.core.permissions import Permission, normalize_role
from app.models.approval import Approval, ApprovalHistory
from app.models.quotation import Quotation
from app.models.audit import record_audit_log
from app.schemas.approval import ApprovalResponse, ApprovalAction
from app.schemas.common import StandardResponse
from app.models.user import User
from app.services.inventory_engine import InventoryEngine

router = APIRouter()

def ap_to_response(doc: Approval) -> ApprovalResponse:
    data = doc.model_dump()
    data['id'] = str(doc.id)
    if doc.quotation:
        data['quotation_id'] = str(doc.quotation.id if hasattr(doc.quotation, 'id') else doc.quotation.ref.id)
    if doc.requested_by:
        data['requester_id'] = str(doc.requested_by.id if hasattr(doc.requested_by, 'id') else doc.requested_by.ref.id)
    if doc.approver:
        data['approver_id'] = str(doc.approver.id if hasattr(doc.approver, 'id') else doc.approver.ref.id)
        
    data['level'] = 1 if doc.level == "SALES_MANAGER" else 2
    data['acted_at'] = doc.updated_at
    data['reason'] = doc.notes
    
    return ApprovalResponse(**data)

@router.get("/", response_model=StandardResponse[List[ApprovalResponse]])
async def get_pending_approvals(
    current_user: User = Depends(require_permission(Permission.APPROVAL_VIEW.value))
):
    current_role = normalize_role(current_user.role)
    query = {"status": "PENDING"}
    
    if current_role == "super_admin":
        pass
    else:
        my_seller_id = current_user.seller_id or str(current_user.id)
        query["seller_id"] = my_seller_id
        
        # Filter by role queue
        if current_role == "sales_manager":
            query["level"] = "SALES_MANAGER"
        elif current_role == "finance":
            query["level"] = "FINANCE"

    approvals = await Approval.find(query).sort("-created_at").to_list()
    return StandardResponse(
        success=True,
        message="Approvals retrieved successfully",
        data=[ap_to_response(a) for a in approvals]
    )

@router.post("/{approval_id}/act", response_model=StandardResponse[ApprovalResponse])
async def act_on_approval(
    approval_id: str,
    action_data: ApprovalAction,
    current_user: User = Depends(require_permission(Permission.APPROVAL_APPROVE.value))
):
    try:
        approval = await Approval.get(PydanticObjectId(approval_id))
    except Exception:
        approval = None
        
    if not approval or approval.status != "PENDING":
        raise HTTPException(status_code=400, detail="Approval not found or already processed")
        
    # Tenant isolation check
    enforce_tenant(approval.seller_id, current_user)
    
    qid = approval.quotation.id if hasattr(approval.quotation, 'id') else approval.quotation.ref.id
    quotation = await Quotation.get(PydanticObjectId(str(qid)))
    if not quotation:
        raise HTTPException(status_code=404, detail="Associated quotation not found")
        
    sales_rep_id = quotation.sales_rep.id if hasattr(quotation.sales_rep, 'id') else quotation.sales_rep.ref.id
    
    # CRITICAL SECURITY RULE: Sales Rep must NEVER approve their own quotation
    if str(sales_rep_id) == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Separation of duties violation: Sales Rep cannot approve their own quotation"
        )
        
    current_role = normalize_role(current_user.role)
    
    # LEVEL AUTHORIZATION CHECK:
    # If approval level is FINANCE, Sales Manager alone CANNOT approve it
    if approval.level == "FINANCE":
        if current_role not in ["finance", "super_admin", "seller"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Level 2 High-Risk approval requires Finance authority"
            )
            
    approval_action_str = action_data.action.upper()
    reason = action_data.reason or ""
    old_status = quotation.status
    
    if approval_action_str == "APPROVE":
        approval.status = "APPROVED"
        approval.notes = reason
        approval.approver = current_user
        
        # Check if this quotation is high-risk and still needs Finance approval
        if approval.level == "SALES_MANAGER" and quotation.approval_level == "FINANCE":
            # Escalating to Finance Level
            finance_approval = Approval(
                quotation=quotation,
                requested_by=approval.requested_by,
                seller_id=quotation.seller_id,
                level="FINANCE",
                status="PENDING",
                notes=f"Manager approved by {current_user.name}. Awaiting Finance approval for high-risk deal (Risk: {quotation.risk_score:.2f})."
            )
            await finance_approval.insert()
            quotation.status = "PENDING_APPROVAL"
            
            await record_audit_log(
                user_id=str(current_user.id),
                user_name=current_user.name,
                seller_id=quotation.seller_id,
                action="APPROVAL_MANAGER_APPROVED",
                module="approval",
                resource_type="Quotation",
                resource_id=str(quotation.id),
                old_value="SALES_MANAGER_PENDING",
                new_value="FINANCE_PENDING",
                reason=f"Sales Manager approved; escalated to Finance. Reason: {reason}"
            )
        else:
            # Final approval achieved — trigger inventory billing
            quotation.status = "APPROVED"

            qt_items_to_bill = [
                {"product_id": (str(it.product.id) if hasattr(it.product, 'id') else str(it.product.ref.id)), "quantity": it.quantity}
                for it in quotation.items
                if it.product
            ]
            if qt_items_to_bill:
                await InventoryEngine.confirm_and_bill_inventory(
                    order_id=str(quotation.id),
                    invoice_id=f"QT-APPRV-{quotation.quotation_number}",
                    items=qt_items_to_bill,
                    seller_id=quotation.seller_id,
                    user_id=str(current_user.id)
                )

            await record_audit_log(
                user_id=str(current_user.id),
                user_name=current_user.name,
                seller_id=quotation.seller_id,
                action="APPROVAL_APPROVED",
                module="approval",
                resource_type="Quotation",
                resource_id=str(quotation.id),
                old_value=old_status,
                new_value="APPROVED",
                reason=f"Quotation approved at {approval.level} level — inventory billing triggered. Reason: {reason}"
            )
            
    elif approval_action_str == "REJECT":
        approval.status = "REJECTED"
        approval.notes = reason
        approval.approver = current_user
        quotation.status = "REJECTED"
        
        await record_audit_log(
            user_id=str(current_user.id),
            user_name=current_user.name,
            seller_id=quotation.seller_id,
            action="APPROVAL_REJECTED",
            module="approval",
            resource_type="Quotation",
            resource_id=str(quotation.id),
            old_value=old_status,
            new_value="REJECTED",
            reason=f"Quotation rejected by {current_user.name}: {reason}"
        )
        
    elif approval_action_str in ["REVISION", "RETURN"]:
        approval.status = "REVISION"
        approval.notes = reason
        approval.approver = current_user
        quotation.status = "DRAFT"
        
        await record_audit_log(
            user_id=str(current_user.id),
            user_name=current_user.name,
            seller_id=quotation.seller_id,
            action="APPROVAL_RETURNED_FOR_REVISION",
            module="approval",
            resource_type="Quotation",
            resource_id=str(quotation.id),
            old_value=old_status,
            new_value="DRAFT",
            reason=f"Returned for revision by {current_user.name}: {reason}"
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid approval action")
        
    history = ApprovalHistory(
        approval=approval,
        action_by=current_user,
        action=approval_action_str,
        comments=f"{approval_action_str} by {current_user.name} ({current_role}): {reason}"
    )
    
    await approval.save()
    await quotation.save()
    await history.insert()
    
    return StandardResponse(
        success=True,
        message=f"Approval action '{approval_action_str}' processed",
        data=ap_to_response(approval)
    )
