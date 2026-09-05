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
        
        # Get Customer Tier
        await quotation.fetch_link(Quotation.customer)
        customer = quotation.customer
        
        tier_limits = {
            "PLATINUM": Decimal("25.0"),
            "GOLD": Decimal("15.0"),
            "SILVER": Decimal("10.0"),
            "STANDARD": Decimal("5.0")
        }
        max_allowed_discount = tier_limits.get(customer.customer_tier, Decimal("5.0"))
        
        for item in quotation.items:
            # We don't have discount_percent anymore, we have 'discount' amount.
            # Let's calculate the effective discount percent.
            if item.unit_price > 0 and item.quantity > 0:
                gross = item.unit_price * item.quantity
                eff_discount_percent = (item.discount / gross) * 100
            else:
                eff_discount_percent = Decimal("0")
                
            if eff_discount_percent > max_allowed_discount:
                violations.append({
                    "product_id": str(item.product.ref.id),
                    "applied_discount": float(eff_discount_percent),
                    "allowed_discount": float(max_allowed_discount),
                    "reason": f"Exceeds {customer.customer_tier} tier limit of {max_allowed_discount}%"
                })
                
                excess = eff_discount_percent - max_allowed_discount
                line_risk = (excess / max_allowed_discount) * Decimal("100")
                
                total_risk_score += line_risk * item.total_price
            total_value += item.total_price
            
        if total_value > 0 and total_risk_score > 0:
            blended_risk = total_risk_score / total_value
        else:
            blended_risk = Decimal("0")
            
        return {
            "risk_score": float(blended_risk),
            "violations": violations,
            "requires_approval": len(violations) > 0
        }
