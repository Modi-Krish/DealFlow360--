from typing import Dict, Any, List
from datetime import datetime, timezone
from app.models.quotation import Quotation

class DealHealthEngine:
    @staticmethod
    async def evaluate_quotation_health(db_dummy, quotation: Quotation) -> Dict[str, Any]:
        score = 100
        risk_factors = []
        
        if quotation.status == "PENDING":
            # Using datetime.now(timezone.utc)
            days_pending = (datetime.now(timezone.utc) - quotation.created_at).days
            if days_pending > 3:
                score -= 10
                risk_factors.append(f"Pending for {days_pending} days")
            if days_pending > 7:
                score -= 20
                risk_factors.append("Critically stalled (> 7 days)")
                
        if quotation.grand_total > 0:
            discount_percentage = float(quotation.discount_total / (quotation.subtotal or 1))
            if discount_percentage > 0.20:
                score -= 15
                risk_factors.append(f"High discount applied ({discount_percentage*100:.1f}%)")
                
        if quotation.status == "NEGOTIATING":
            score -= 10
            risk_factors.append("Currently in negotiation")
            
        score = max(0, min(100, score))
        
        return {
            "health_score": score,
            "risk_factors": risk_factors,
            "is_at_risk": score < 70
        }
