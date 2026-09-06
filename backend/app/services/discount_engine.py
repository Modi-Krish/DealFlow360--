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
        
        tier_name = (customer.customer_tier if customer else "STANDARD").upper()
        
        # Query database DiscountRule for this seller/tenant
        from app.models.pricing import DiscountRule
        from app.models.product import Product
        
        discount_rule = None
        if quotation.seller_id:
            discount_rule = await DiscountRule.find_one({"seller_id": quotation.seller_id})
        if not discount_rule:
            discount_rule = await DiscountRule.find_one({"seller_id": None})
            
        tier_limits = {
            "PLATINUM": Decimal("25.0"),
            "GOLD": Decimal("15.0"),
            "SILVER": Decimal("10.0"),
            "BRONZE": Decimal("5.0"),
            "STANDARD": Decimal("5.0")
        }
        
        if discount_rule and discount_rule.tier_ceilings:
            for k, v in discount_rule.tier_ceilings.items():
                tier_limits[k.upper()] = Decimal(str(v))
                
        max_tier_discount = tier_limits.get(tier_name, Decimal("5.0"))
        
        for item in quotation.items:
            # item.discount stores the applied discount percent
            eff_discount_percent = Decimal(str(item.discount or "0.0"))
            max_allowed_discount = max_tier_discount
            
            # Category ceiling check
            if discount_rule and discount_rule.category_ceilings:
                prod = None
                if hasattr(item.product, 'name'):
                    prod = item.product
                elif hasattr(item.product, 'id') or hasattr(item.product, 'ref'):
                    pid = item.product.id if hasattr(item.product, 'id') else item.product.ref.id
                    prod = await Product.get(PydanticObjectId(str(pid)))
                
                if prod and getattr(prod, 'category_name', None):
                    cat_val = discount_rule.category_ceilings.get(prod.category_name)
                    if cat_val is not None:
                        max_allowed_discount = min(max_allowed_discount, Decimal(str(cat_val)))
            
            if eff_discount_percent > max_allowed_discount:
                pid = item.product.id if hasattr(item.product, 'id') else item.product.ref.id
                violations.append({
                    "product_id": str(pid),
                    "applied_discount": float(eff_discount_percent),
                    "allowed_discount": float(max_allowed_discount),
                    "reason": f"Exceeds allowed discount limit of {max_allowed_discount}%"
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
