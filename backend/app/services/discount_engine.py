from decimal import Decimal
from typing import List, Dict, Any
from app.models.quotation import Quotation
from app.models.customer import Customer
from beanie import PydanticObjectId

class DiscountEngine:
    @staticmethod
    async def evaluate(quotation: Quotation) -> Dict[str, Any]:
        violations = []
        total_risk_score = Decimal("0")
        total_value = Decimal("0")
        
        # Get Customer Tier safely without fetch_link
        if hasattr(quotation.customer, 'customer_tier'):
            customer = quotation.customer
        else:
            cust_id = quotation.customer.id if hasattr(quotation.customer, 'id') else quotation.customer.ref.id
            customer = await Customer.get(PydanticObjectId(str(cust_id)))
        
        tier_name = customer.customer_tier if customer else "STANDARD"
        tier_limits = {
            "PLATINUM": Decimal("25.0"),
            "GOLD": Decimal("15.0"),
            "SILVER": Decimal("10.0"),
            "STANDARD": Decimal("5.0")
        }
        max_allowed_discount = tier_limits.get(tier_name, Decimal("5.0"))
        
        for item in quotation.items:
            # item.discount stores the applied discount percent
            eff_discount_percent = Decimal(str(item.discount or "0.0"))
            
            if eff_discount_percent > max_allowed_discount:
                pid = item.product.id if hasattr(item.product, 'id') else item.product.ref.id
                violations.append({
                    "product_id": str(pid),
                    "applied_discount": float(eff_discount_percent),
                    "allowed_discount": float(max_allowed_discount),
                    "reason": f"Exceeds {tier_name} tier limit of {max_allowed_discount}%"
                })
                
                excess = eff_discount_percent - max_allowed_discount
                line_risk = (excess / max_allowed_discount) * Decimal("100")
                
                total_risk_score += line_risk * (item.total_price or Decimal("100"))
            total_value += (item.total_price or Decimal("100"))
            
        if total_value > 0 and total_risk_score > 0:
            blended_risk = total_risk_score / total_value
        else:
            blended_risk = Decimal("0")
            
        return {
            "risk_score": float(blended_risk),
            "violations": violations,
            "requires_approval": len(violations) > 0
        }
