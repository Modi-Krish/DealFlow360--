from typing import List, Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId
from pydantic import BaseModel

from app.core.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.quotation import Quotation
from app.models.recommendation import ProductRecommendation
from app.models.product import Product
from app.services.recommendation_engine import RecommendationEngine
from app.schemas.common import StandardResponse

router = APIRouter()

@router.get("/{quotation_id}", response_model=StandardResponse[List[Dict[str, Any]]])
async def get_quotation_recommendations(
    quotation_id: str,
    current_user: User = Depends(get_current_user)
):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except Exception:
        quotation = None
        
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    if current_user.seller_id and quotation.seller_id and str(quotation.seller_id) != str(current_user.seller_id):
        if current_user.role != UserRole.SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Not authorized to view recommendations for this quotation")
        
    recommendations = await RecommendationEngine.get_recommendations(None, quotation)
    return StandardResponse(success=True, message="Recommendations retrieved", data=recommendations)

# --- Admin Recommendation Rules CRUD ---
class RecommendationRuleCreate(BaseModel):
    source_product_id: str
    recommended_product_id: str
    priority: int = 1
    reason: str

@router.get("/rules/list", response_model=StandardResponse[List[Dict[str, Any]]])
async def get_all_recommendation_rules(
    current_user: User = Depends(get_current_user)
):
    query = ProductRecommendation.find_all()
    if current_user.seller_id and current_user.role != UserRole.SUPER_ADMIN:
        query = ProductRecommendation.find({"seller_id": current_user.seller_id})
    rules = await query.to_list()
    res = []
    for r in rules:
        src_name = "Product"
        rec_name = "Product"
        src_id = str(r.source_product.id if hasattr(r.source_product, 'id') else r.source_product.ref.id)
        rec_id = str(r.recommended_product.id if hasattr(r.recommended_product, 'id') else r.recommended_product.ref.id)
        
        src_p = await Product.get(PydanticObjectId(src_id))
        if src_p:
            src_name = src_p.name
        rec_p = await Product.get(PydanticObjectId(rec_id))
        if rec_p:
            rec_name = rec_p.name
            
        res.append({
            "id": str(r.id),
            "source_product_id": src_id,
            "source_product_name": src_name,
            "recommended_product_id": rec_id,
            "recommended_product_name": rec_name,
            "priority": r.priority,
            "reason": r.reason
        })
    return StandardResponse(success=True, message="Recommendation rules retrieved", data=res)

@router.post("/rules", response_model=StandardResponse[Dict[str, Any]])
async def create_recommendation_rule(
    req: RecommendationRuleCreate,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.SELLER, UserRole.ADMIN]))
):
    src_p = await Product.get(PydanticObjectId(req.source_product_id))
    rec_p = await Product.get(PydanticObjectId(req.recommended_product_id))
    if not src_p or not rec_p:
        raise HTTPException(status_code=400, detail="Invalid source or recommended product ID")
        
    rule = ProductRecommendation(
        source_product=src_p,
        recommended_product=rec_p,
        priority=req.priority,
        reason=req.reason,
        seller_id=current_user.seller_id
    )
    await rule.insert()
    return StandardResponse(success=True, message="Recommendation rule created", data={"id": str(rule.id)})

@router.delete("/rules/{rule_id}", response_model=StandardResponse[dict])
async def delete_recommendation_rule(
    rule_id: str,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.SELLER, UserRole.ADMIN]))
):
    try:
        rule = await ProductRecommendation.get(PydanticObjectId(rule_id))
    except Exception:
        rule = None
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    if current_user.seller_id and rule.seller_id and str(rule.seller_id) != str(current_user.seller_id):
        if current_user.role != UserRole.SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Not authorized to delete this rule")
        
    await rule.delete()
    return StandardResponse(success=True, message="Rule deleted successfully", data={"id": rule_id})
