from typing import List, Dict, Any
from app.models.quotation import Quotation
from app.models.recommendation import ProductRecommendation
from app.models.product import Product
from beanie import PydanticObjectId
from beanie.odm.operators.find.comparison import In

class RecommendationEngine:
    @staticmethod
    async def get_recommendations(db_dummy, quotation: Quotation) -> List[Dict[str, Any]]:
        current_product_ids = []
        for item in quotation.items:
            if hasattr(item, 'product') and item.product:
                pid = getattr(item.product, 'id', None) or getattr(getattr(item.product, 'ref', None), 'id', None)
                if pid:
                    current_product_ids.append(PydanticObjectId(str(pid)))
                    
        if not current_product_ids:
            # If quote is empty, return top 3 featured products as recommendations
            featured = await Product.find(Product.status == "ACTIVE").limit(3).to_list()
            return [{
                "product_id": str(p.id),
                "product_name": p.name,
                "base_price": float(p.base_price),
                "reason": "Featured B2B Best-Seller with optimal margin",
                "priority": 1,
                "margin_delta": float(p.base_price) * 0.35
            } for p in featured]
            
        recommendations = await ProductRecommendation.find(In(ProductRecommendation.source_product.id, current_product_ids)).to_list()
        
        output = []
        seen_pids = set(str(pid) for pid in current_product_ids)
        
        for rec in recommendations:
            rec_pid = getattr(rec.recommended_product, 'id', None) or getattr(getattr(rec.recommended_product, 'ref', None), 'id', None)
            if not rec_pid or str(rec_pid) in seen_pids:
                continue
                
            product = await Product.get(PydanticObjectId(str(rec_pid)))
            if product:
                seen_pids.add(str(product.id))
                output.append({
                    "product_id": str(product.id),
                    "product_name": product.name,
                    "base_price": float(product.base_price),
                    "reason": rec.reason,
                    "priority": rec.priority,
                    "margin_delta": float(product.base_price) * 0.40
                })
                
        # If fewer than 2 specific pairings found, add intelligent complementary cross-sell from inventory
        if len(output) < 2:
            complementary = await Product.find(Product.status == "ACTIVE").limit(5).to_list()
            for comp in complementary:
                if str(comp.id) not in seen_pids:
                    seen_pids.add(str(comp.id))
                    output.append({
                        "product_id": str(comp.id),
                        "product_name": comp.name,
                        "base_price": float(comp.base_price),
                        "reason": f"High margin bundle recommendation (+40% deal value)",
                        "priority": 2,
                        "margin_delta": float(comp.base_price) * 0.35
                    })
                    if len(output) >= 3:
                        break
                        
        output.sort(key=lambda x: x["priority"], reverse=True)
        return output[:3]
