from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from beanie import PydanticObjectId
import uuid

from app.core.dependencies import get_current_user, get_optional_current_user, require_permission, enforce_tenant
from app.core.permissions import Permission, normalize_role
from app.models.product import Product, ProductVariant
from app.models.category import Category
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse,
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
    include_archived: bool = Query(False, description="Whether to include archived products"),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    query: dict = {}
    current_role = normalize_role(current_user.role) if current_user else "customer"
    
    if current_role == "super_admin":
        if seller_id:
            query["seller_id"] = seller_id
    elif current_role in ["seller", "sales_manager", "sales_rep", "finance", "operations"]:
        my_seller_id = current_user.seller_id or str(current_user.id)
        query["seller_id"] = my_seller_id
    else:
        # Customer marketplace view: only active
        if seller_id:
            query["seller_id"] = seller_id
        query["status"] = "ACTIVE"
        
    if not include_archived and "status" not in query:
        query["status"] = {"$ne": "ARCHIVED"}
        
    # Bulk fetch products
    products = await Product.find(query).to_list()
    
    # Bulk fetch all categories in a single query to eliminate N+1 query latency
    categories = await Category.find_all().to_list()
    category_map = {str(c.id): c for c in categories}
    
    for prod in products:
        if prod.category and not hasattr(prod.category, 'name'):
            cid = str(getattr(prod.category, 'id', '') or getattr(getattr(prod.category, 'ref', None), 'id', ''))
            if cid in category_map:
                prod.category = category_map[cid]
            
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
    
    from app.models.audit import record_audit_log
    await record_audit_log(
        user_id=str(current_user.id),
        user_name=current_user.name,
        seller_id=seller_id,
        action="PRODUCT_CREATED",
        module="products",
        resource_type="Product",
        resource_id=str(new_prod.id),
        details={"name": new_prod.name, "sku": new_prod.sku, "price": float(new_prod.base_price)},
        reason=f"Product {new_prod.name} created"
    )
    
    return StandardResponse(success=True, message="Product created", data=prod_to_response(new_prod))

@router.put("/products/{product_id}", response_model=StandardResponse[ProductResponse])
async def update_product(
    product_id: str,
    product_in: ProductUpdate,
    current_user: User = Depends(require_permission(Permission.PRODUCTS_UPDATE.value))
):
    try:
        product = await Product.get(PydanticObjectId(product_id))
    except Exception:
        product = None
        
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    enforce_tenant(product.seller_id, current_user)
    
    update_data = product_in.model_dump(exclude_unset=True)
    if "category_id" in update_data:
        cid = update_data.pop("category_id")
        if cid:
            try:
                product.category = await Category.get(PydanticObjectId(cid))
            except Exception:
                pass
                
    for field, value in update_data.items():
        setattr(product, field, value)
        
    await product.save()
    
    from app.models.audit import record_audit_log
    await record_audit_log(
        user_id=str(current_user.id),
        user_name=current_user.name,
        seller_id=product.seller_id,
        action="PRODUCT_UPDATED",
        module="products",
        resource_type="Product",
        resource_id=str(product.id),
        details=update_data,
        reason=f"Product {product.name} updated"
    )
    
    return StandardResponse(success=True, message="Product updated", data=prod_to_response(product))

@router.post("/products/{product_id}/archive", response_model=StandardResponse[ProductResponse])
async def archive_product(
    product_id: str,
    current_user: User = Depends(require_permission(Permission.PRODUCTS_DELETE.value))
):
    try:
        product = await Product.get(PydanticObjectId(product_id))
    except Exception:
        product = None
        
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    enforce_tenant(product.seller_id, current_user)
    
    old_status = product.status
    product.status = "ARCHIVED"
    await product.save()
    
    from app.models.audit import record_audit_log
    await record_audit_log(
        user_id=str(current_user.id),
        user_name=current_user.name,
        seller_id=product.seller_id,
        action="PRODUCT_ARCHIVED",
        module="products",
        resource_type="Product",
        resource_id=str(product.id),
        old_value=old_status,
        new_value="ARCHIVED",
        reason=f"Product {product.name} archived (soft-deactivated to preserve past quotes)"
    )
    
    return StandardResponse(success=True, message="Product archived successfully", data=prod_to_response(product))

@router.delete("/products/{product_id}", response_model=StandardResponse[ProductResponse])
async def delete_product(
    product_id: str,
    current_user: User = Depends(require_permission(Permission.PRODUCTS_DELETE.value))
):
    # Safe soft-delete: redirects to archive to preserve quotation/invoice history
    return await archive_product(product_id, current_user)

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
        try:
            await product.fetch_link(Product.category)
        except Exception:
            pass
        
    return StandardResponse(success=True, message="Variant created", data=prod_to_response(product))
