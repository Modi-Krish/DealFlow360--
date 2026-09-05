from typing import List, Dict, Any
from app.models.quotation import Quotation
from app.models.recommendation import ProductRecommendation
from app.models.product import Product
from beanie import PydanticObjectId
from beanie.odm.operators.find.comparison import In

class RecommendationEngine:
    @staticmethod
    async def get_recommendations(db_dummy, quotation: Quotation) -> List[Dict[str, Any]]:
        current_product_ids = [item.product.ref.id for item in quotation.items if item.product]
        if not current_product_ids:
            return []
            
        recommendations = await ProductRecommendation.find(In(ProductRecommendation.source_product.id, current_product_ids)).to_list()
        
        output = []
        for rec in recommendations:
            if rec.recommended_product.ref.id in current_product_ids:
                continue
                
            product = await Product.get(rec.recommended_product.ref.id)
            if product:
                output.append({
                    "product_id": str(product.id),
                    "product_name": product.name,
                    "base_price": float(product.base_price),
                    "reason": rec.reason,
                    "priority": rec.priority,
                    "margin_delta": float(product.base_price) * 0.4 
                })
                
        output.sort(key=lambda x: x["priority"], reverse=True)
        return output[:3]
