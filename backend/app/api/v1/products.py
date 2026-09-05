from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from beanie import PydanticObjectId
import uuid

from app.core.dependencies import get_current_user, require_permission, enforce_tenant
from app.core.permissions import Permission, normalize_role
from app.models.product import Product, ProductVariant
from app.models.category import Category
from app.schemas.product import (
    ProductCreate, ProductResponse,
    CategoryCreate, CategoryResponse,
    ProductVariantCreate, ProductVariantResponse
)
from app.schemas.common import StandardResponse
from app.models.user import User

router = APIRouter()

def cat_to_response(doc: Category) -> CategoryResponse:
    data = doc.model_dump()
    data['id'] = str(doc.id)
    return CategoryResponse(**data)

def prod_to_response(doc: Product) -> ProductResponse:
    data = doc.model_dump()
    data['id'] = str(doc.id)
    if doc.category:
        if hasattr(doc.category, 'name'):
            data['category'] = cat_to_response(doc.category)
        else:
            data['category'] = None
    return ProductResponse(**data)

# Categories
@router.get("/categories", response_model=StandardResponse[List[CategoryResponse]])
async def get_categories():
    categories = await Category.find_all().to_list()
    return StandardResponse(success=True, message="Categories retrieved", data=[cat_to_response(c) for c in categories])

@router.post("/categories", response_model=StandardResponse[CategoryResponse])
async def create_category(
    category: CategoryCreate,
    current_user: User = Depends(require_permission(Permission.PRODUCTS_CREATE.value))
):
    new_cat = Category(**category.model_dump())
    await new_cat.insert()
    return StandardResponse(success=True, message="Category created", data=cat_to_response(new_cat))

# Products
@router.get("/products", response_model=StandardResponse[List[ProductResponse]])
async def get_products(
    seller_id: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user)
):
    query = {}
    current_role = normalize_role(current_user.role) if current_user else "customer"
    
    if current_role == "super_admin":
        if seller_id:
            query["seller_id"] = seller_id
    elif current_role in ["seller", "sales_manager", "sales_rep", "finance", "operations"]:
        my_seller_id = current_user.seller_id or str(current_user.id)
        query["seller_id"] = my_seller_id
    else:
        # Customer marketplace view
        if seller_id:
            query["seller_id"] = seller_id
        query["status"] = "ACTIVE"
        
    products = await Product.find(query).to_list()
    for prod in products:
        if prod.category:
            await prod.fetch_link(Product.category)
            
    return StandardResponse(success=True, message="Products retrieved", data=[prod_to_response(p) for p in products])

@router.post("/products", response_model=StandardResponse[ProductResponse])
async def create_product(
    product: ProductCreate,
    current_user: User = Depends(require_permission(Permission.PRODUCTS_CREATE.value))
):
    category = None
    if product.category_id:
        try:
            category = await Category.get(PydanticObjectId(product.category_id))
        except Exception:
            category = None
        
    sku = product.sku.strip() if product.sku else f"SKU-{uuid.uuid4().hex[:8].upper()}"
    
    current_role = normalize_role(current_user.role)
    if current_role == "super_admin":
        seller_id = product.seller_id or "default-platform"
        seller_name = product.seller_name or "DealFlow360 Platform"
    else:
        seller_id = current_user.seller_id or str(current_user.id)
        seller_name = current_user.company_name or current_user.name

    new_prod = Product(
        name=product.name,
        sku=sku,
        description=product.description,
        base_price=product.base_price,
        unit=product.unit,
        tax_rate=product.tax_rate,
        status=product.status,
        category=category,
        seller_id=seller_id,
        seller_name=seller_name,
        stock_quantity=product.stock_quantity or 100,
        variants=[]
    )
    await new_prod.insert()
    return StandardResponse(success=True, message="Product created", data=prod_to_response(new_prod))

@router.post("/products/{product_id}/variants", response_model=StandardResponse[ProductResponse])
async def create_variant(
    product_id: str,
    variant: ProductVariantCreate,
    current_user: User = Depends(require_permission(Permission.PRODUCTS_UPDATE.value))
):
    try:
        product = await Product.get(PydanticObjectId(product_id))
    except Exception:
        product = None
        
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    enforce_tenant(product.seller_id, current_user)
        
    new_var = ProductVariant(**variant.model_dump())
    product.variants.append(new_var)
    await product.save()
    
    if product.category:
        await product.fetch_link(Product.category)
        
    return StandardResponse(success=True, message="Variant created", data=prod_to_response(product))
