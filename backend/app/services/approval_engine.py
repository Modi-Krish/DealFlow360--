from decimal import Decimal
from app.models.quotation import Quotation
from app.models.approval import Approval, ApprovalHistory
from app.models.user import User

class ApprovalEngine:
    @staticmethod
    async def create_approval_chain(quotation: Quotation, risk_score: float):
        # Determine how many levels of approval are needed based on risk
        # Note: We need to assign `requested_by` and `approver` Links. 
        # For MVP, we will just assign the sales manager for level 1.
        
        # We need to fetch the sales rep
        await quotation.fetch_link(Quotation.sales_rep)
        sales_rep = quotation.sales_rep
        
        # Get a manager (random manager for demo)
        manager = await User.find_one(User.role == "SALES_MANAGER")
        
        if manager:
            approval1 = Approval(
                quotation=quotation,
                requested_by=sales_rep,
                approver=manager,
                status="PENDING",
                notes=f"Risk Score: {risk_score:.2f}"
            )
            await approval1.insert()
            
            history = ApprovalHistory(
                approval=approval1,
                action_by=sales_rep,
                action="SUBMIT_FOR_APPROVAL",
                comments=f"System generated approval request due to risk score {risk_score:.2f}"
            )
            await history.insert()
            
        quotation.status = "PENDING_APPROVAL"
        
        # Note: quotation doesn't have a risk_score field in the new Beanie model directly,
        # but we use 'notes' or just leave it.
        if not quotation.notes:
            quotation.notes = ""
        quotation.notes += f"\nRisk Score: {risk_score:.2f}"
        
        await quotation.save()
