from typing import List
from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId

from app.core.dependencies import require_role
from app.models.pricing import PriceList, PriceListItem
from app.models.product import Product
from app.schemas.pricing import PriceListCreate, PriceListResponse, PriceListItemCreate, PriceListItemResponse
from app.schemas.common import StandardResponse
from app.models.user import UserRole

router = APIRouter()

def pl_to_response(doc: PriceList) -> PriceListResponse:
    data = doc.model_dump()
    data['id'] = str(doc.id)
    # We will let the Pydantic schema format items if needed
    return PriceListResponse(**data)

@router.get("/", response_model=StandardResponse[List[PriceListResponse]])
async def get_price_lists():
    price_lists = await PriceList.find_all().to_list()
    # We won't fully resolve links here unless the schema breaks, but typically frontend needs simple responses
    return StandardResponse(success=True, message="Price lists retrieved", data=[pl_to_response(pl) for pl in price_lists])

@router.post("/", response_model=StandardResponse[PriceListResponse])
async def create_price_list(price_list: PriceListCreate, current_user = Depends(require_role([UserRole.ADMIN]))):
    new_pl = PriceList(
        name=price_list.name,
        currency=price_list.currency,
        is_active=price_list.is_active,
        valid_from=price_list.valid_from,
        valid_until=price_list.valid_until,
        items=[]
    )
    await new_pl.insert()
    return StandardResponse(success=True, message="Price list created", data=pl_to_response(new_pl))

@router.post("/{price_list_id}/items", response_model=StandardResponse[PriceListResponse])
async def add_price_list_item(price_list_id: str, item: PriceListItemCreate, current_user = Depends(require_role([UserRole.ADMIN]))):
    try:
        pl = await PriceList.get(PydanticObjectId(price_list_id))
    except:
        pl = None
        
    if not pl:
        raise HTTPException(status_code=404, detail="Price list not found")
        
    try:
        product = await Product.get(PydanticObjectId(item.product_id))
    except:
        product = None
        
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    new_item = PriceListItem(product=product, custom_price=item.custom_price)
    pl.items.append(new_item)
    await pl.save()
    
    return StandardResponse(success=True, message="Item added to price list", data=pl_to_response(pl))
