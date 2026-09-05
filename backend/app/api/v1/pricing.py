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
    items_out = []
    for item in doc.items:
        prod = item.product
        # If the Link is fetched, extract name/id; otherwise use fallback
        product_name = getattr(prod, 'name', None) if prod else None
        product_id = str(getattr(prod, 'id', '')) if prod else None
        items_out.append(PriceListItemResponse(
            product_name=product_name,
            product_id=product_id,
            custom_price=item.custom_price,
        ))
    return PriceListResponse(
        id=str(doc.id),
        name=doc.name,
        currency=doc.currency,
        is_active=doc.is_active,
        valid_from=doc.valid_from,
        valid_until=doc.valid_until,
        items=items_out,
    )

@router.get("/", response_model=StandardResponse[List[PriceListResponse]])
async def get_price_lists():
    price_lists = await PriceList.find_all(fetch_links=True).to_list()
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
