from typing import List
from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId

from app.core.dependencies import require_role
from app.models.pricing import PriceList, PriceListItem, DiscountRule
from app.schemas.pricing import PriceListCreate, PriceListResponse, PriceListItemCreate, PriceListItemResponse, DiscountRuleResponse, DiscountRuleUpdate
from app.schemas.common import StandardResponse
from app.models.user import User, UserRole
from app.core.dependencies import get_current_user

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

@router.get("/discount-rules", response_model=StandardResponse[DiscountRuleResponse])
async def get_discount_rules(current_user = Depends(get_current_user)):
    seller_id = current_user.seller_id or (str(current_user.id) if current_user.role == UserRole.SELLER else None)
    rule = None
    if seller_id:
        rule = await DiscountRule.find_one(DiscountRule.seller_id == seller_id)
    if not rule:
        rule = await DiscountRule.find_one(DiscountRule.seller_id == None)
    if not rule:
        rule = DiscountRule(seller_id=seller_id)
        await rule.insert()
    
    return StandardResponse(
        success=True,
        message="Discount rules retrieved",
        data=DiscountRuleResponse(
            id=str(rule.id),
            seller_id=rule.seller_id,
            tier_ceilings=rule.tier_ceilings,
            category_ceilings=rule.category_ceilings,
            routing_matrix=rule.routing_matrix,
            sales_manager_threshold=getattr(rule, "sales_manager_threshold", 10.0),
            finance_threshold=getattr(rule, "finance_threshold", 20.0)
        )
    )

@router.put("/discount-rules", response_model=StandardResponse[DiscountRuleResponse])
async def update_discount_rules(
    body: DiscountRuleUpdate,
    current_user = Depends(require_role([UserRole.ADMIN, UserRole.SELLER, UserRole.SALES_MANAGER]))
):
    seller_id = current_user.seller_id or (str(current_user.id) if current_user.role == UserRole.SELLER else None)
    rule = None
    if seller_id:
        rule = await DiscountRule.find_one(DiscountRule.seller_id == seller_id)
    if not rule:
        rule = await DiscountRule.find_one(DiscountRule.seller_id == None)
    if not rule:
        rule = DiscountRule(seller_id=seller_id)
        await rule.insert()
    
    if body.tier_ceilings is not None:
        rule.tier_ceilings = body.tier_ceilings
    if body.category_ceilings is not None:
        rule.category_ceilings = body.category_ceilings
    if body.routing_matrix is not None:
        rule.routing_matrix = body.routing_matrix
    if body.sales_manager_threshold is not None:
        rule.sales_manager_threshold = body.sales_manager_threshold
    if body.finance_threshold is not None:
        rule.finance_threshold = body.finance_threshold
    if seller_id and not rule.seller_id:
        rule.seller_id = seller_id

    await rule.save()
    return StandardResponse(
        success=True,
        message="Discount rules updated successfully",
        data=DiscountRuleResponse(
            id=str(rule.id),
            seller_id=rule.seller_id,
            tier_ceilings=rule.tier_ceilings,
            category_ceilings=rule.category_ceilings,
            routing_matrix=rule.routing_matrix,
            sales_manager_threshold=getattr(rule, "sales_manager_threshold", 10.0),
            finance_threshold=getattr(rule, "finance_threshold", 20.0)
        )
    )

@router.get("/", response_model=StandardResponse[List[PriceListResponse]])
async def get_price_lists(current_user: User = Depends(get_current_user)):
    from app.core.permissions import normalize_role
    current_role = normalize_role(current_user.role)
    if current_role == "super_admin":
        price_lists = await PriceList.find_all(fetch_links=True).to_list()
    else:
        seller_id = current_user.seller_id or str(current_user.id)
        price_lists = await PriceList.find(
            {"$or": [{"seller_id": seller_id}, {"seller_id": None}]},
            fetch_links=True
        ).to_list()
        
    return StandardResponse(success=True, message="Price lists retrieved", data=[pl_to_response(pl) for pl in price_lists])

@router.post("/", response_model=StandardResponse[PriceListResponse])
async def create_price_list(
    price_list: PriceListCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SELLER, UserRole.SUPER_ADMIN]))
):
    from app.core.permissions import normalize_role
    seller_id = current_user.seller_id or str(current_user.id)
    if normalize_role(current_user.role) == "super_admin" and getattr(price_list, "seller_id", None):
        seller_id = price_list.seller_id

    new_pl = PriceList(
        name=price_list.name,
        currency=price_list.currency,
        seller_id=seller_id,
        is_active=price_list.is_active,
        valid_from=price_list.valid_from,
        valid_until=price_list.valid_until,
        items=[]
    )
    await new_pl.insert()
    return StandardResponse(success=True, message="Price list created", data=pl_to_response(new_pl))

@router.post("/{price_list_id}/items", response_model=StandardResponse[PriceListResponse])
async def add_price_list_item(
    price_list_id: str,
    item: PriceListItemCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SELLER, UserRole.SUPER_ADMIN]))
):
    try:
        pl = await PriceList.get(PydanticObjectId(price_list_id))
    except Exception:
        pl = None
        
    if not pl:
        raise HTTPException(status_code=404, detail="Price list not found")
        
    from app.core.dependencies import enforce_tenant
    enforce_tenant(pl.seller_id, current_user)
        
    try:
        product = await Product.get(PydanticObjectId(item.product_id))
    except Exception:
        product = None
        
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    enforce_tenant(product.seller_id, current_user)
        
    new_item = PriceListItem(product=product, custom_price=item.custom_price)
    pl.items.append(new_item)
    await pl.save()
    
    return StandardResponse(success=True, message="Item added to price list", data=pl_to_response(pl))
