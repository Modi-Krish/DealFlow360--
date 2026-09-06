from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.models.quotation import Quotation

def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

class DealHealthEngine:
    @staticmethod
    async def evaluate_quotation_health(db_dummy, quotation: Quotation) -> Dict[str, Any]:
        score = 100
        risk_factors = []
        now_utc = datetime.now(timezone.utc)
        
        created_at_utc = ensure_utc(getattr(quotation, "created_at", None))
        
        if quotation.status in ["PENDING", "PENDING_APPROVAL"] and created_at_utc:
            days_pending = (now_utc - created_at_utc).days
            if days_pending > 3:
                score -= 10
                risk_factors.append(f"Pending for {days_pending} days")
            if days_pending > 7:
                score -= 20
                risk_factors.append("Critically stalled (> 7 days)")
                
        subtotal = float(quotation.subtotal or 0.0)
        discount_total = float(quotation.discount_total or 0.0)
        grand_total = float(quotation.grand_total or 0.0)
        
        if grand_total > 0 and subtotal > 0:
            discount_percentage = discount_total / subtotal
            if discount_percentage > 0.20:
                score -= 15
                risk_factors.append(f"High discount applied ({discount_percentage*100:.1f}%)")
                
        if quotation.status in ["NEGOTIATING", "NEGOTIATION"]:
            score -= 10
            risk_factors.append("Currently in negotiation")
            
        # SLA & Delivery Promise checks
        sla_stat = getattr(quotation, "sla_status", "ON_TIME") or "ON_TIME"
        if sla_stat == "DELAYED":
            score -= 25
            risk_factors.append("⚠️ Delivery Promise SLA Delayed")
        elif sla_stat == "AT_RISK":
            score -= 15
            risk_factors.append("⚠️ Delivery SLA at Risk")
            
        promised_date_utc = ensure_utc(getattr(quotation, "promised_delivery_date", None))
        if promised_date_utc and promised_date_utc < now_utc:
            score -= 20
            risk_factors.append("Promised delivery date has elapsed")
            
        score = max(0, min(100, score))
        
        return {
            "health_score": score,
            "risk_factors": risk_factors,
            "is_at_risk": score < 70
        }
