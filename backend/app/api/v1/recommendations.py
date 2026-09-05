from typing import List, Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId

from app.core.dependencies import require_role
from app.models.quotation import Quotation
from app.services.recommendation_engine import RecommendationEngine
from app.schemas.common import StandardResponse
from app.models.user import UserRole

router = APIRouter()

@router.get("/{quotation_id}", response_model=StandardResponse[List[Dict[str, Any]]])
async def get_quotation_recommendations(quotation_id: str):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except:
        quotation = None
        
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    recommendations = await RecommendationEngine.get_recommendations(None, quotation)
    return StandardResponse(success=True, message="Recommendations retrieved", data=recommendations)
