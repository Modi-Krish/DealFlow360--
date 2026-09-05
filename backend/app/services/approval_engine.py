from decimal import Decimal
from typing import Optional
from beanie import PydanticObjectId
from app.models.quotation import Quotation
from app.models.approval import Approval, ApprovalHistory
from app.models.user import User
from app.models.audit import record_audit_log

class ApprovalEngine:
    @staticmethod
    async def create_approval_chain(quotation: Quotation, risk_score: float, requester: User):
        """
        Creates approval chain according to risk score:
        - If risk_score < 50: Level 1 (SALES_MANAGER)
        - If risk_score >= 50: High-risk -> Level 1 (SALES_MANAGER) which will escalate to Level 2 (FINANCE) upon manager approval.
        """
        seller_id = quotation.seller_id or requester.seller_id
        is_high_risk = (risk_score >= 150.0)
        
        quotation.risk_score = float(risk_score)
        quotation.status = "PENDING_APPROVAL"
        quotation.approval_level = "FINANCE" if is_high_risk else "SALES_MANAGER"
        
        if not quotation.notes:
            quotation.notes = ""
        quotation.notes += f"\n[Risk Score: {risk_score:.2f} | Chain: {'Sales Manager -> Finance' if is_high_risk else 'Sales Manager'}]"
        await quotation.save()
        
        # Find a manager in this seller org
        manager_query = {"role": "sales_manager"}
        if seller_id:
            manager_query["seller_id"] = seller_id
        manager = await User.find_one(manager_query)
        if not manager:
            # Fallback to any sales manager or seller
            manager = await User.find_one({"role": {"$in": ["sales_manager", "seller"]}})
            
        approval = Approval(
            quotation=quotation,
            requested_by=requester,
            approver=manager,
            seller_id=seller_id,
            level="SALES_MANAGER", # Start with Sales Manager approval
            status="PENDING",
            notes=f"Risk Score: {risk_score:.2f}. {'HIGH-RISK: Requires Sales Manager then Finance.' if is_high_risk else 'Requires Sales Manager approval.'}"
        )
        await approval.insert()
        
        history = ApprovalHistory(
            approval=approval,
            action_by=requester,
            action="SUBMIT_FOR_APPROVAL",
            comments=f"Submitted quotation #{quotation.quotation_number} for approval (Risk: {risk_score:.2f})"
        )
        await history.insert()
        
        # Record audit log
        await record_audit_log(
            user_id=str(requester.id),
            user_name=requester.name,
            seller_id=seller_id,
            action="QUOTATION_SUBMITTED_FOR_APPROVAL",
            module="approval",
            resource_type="Quotation",
            resource_id=str(quotation.id),
            new_value={"status": "PENDING_APPROVAL", "risk_score": risk_score, "level": "SALES_MANAGER"},
            reason=f"Exceeded discount limit. Risk score: {risk_score:.2f}"
        )
        
        return approval
