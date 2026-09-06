from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from beanie import PydanticObjectId
import re

from app.core.dependencies import get_current_user, require_permission, enforce_tenant
from app.core.permissions import Permission, normalize_role
from app.models.customer import Customer
from app.models.user import User, UserRole
from app.models.audit import record_audit_log
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse
from app.schemas.common import StandardResponse

router = APIRouter()

def doc_to_response(doc: Customer) -> CustomerResponse:
    data = doc.model_dump()
    data['id'] = str(doc.id)
    return CustomerResponse(**data)

def get_tenant_filter(current_user: User) -> dict:
    current_role = normalize_role(current_user.role)
    if current_role == "super_admin":
        return {}
    if current_role == "customer":
        # Customer can only view their own profile
        return {"email": current_user.email}
    seller_id = current_user.seller_id or str(current_user.id)
    return {"$or": [{"seller_id": seller_id}, {"seller_id": None}]}

@router.get("/", response_model=StandardResponse[List[CustomerResponse]])
async def get_customers(
    search: Optional[str] = Query(None, description="Search by name or email"),
    current_user: User = Depends(get_current_user)
):
    query = get_tenant_filter(current_user)
    
    if search:
        safe_search = re.escape(search.strip())
        search_filter = {
            "$or": [
                {"name": {"$regex": safe_search, "$options": "i"}},
                {"email": {"$regex": safe_search, "$options": "i"}},
                {"company": {"$regex": safe_search, "$options": "i"}}
            ]
        }
        if query:
            query = {"$and": [query, search_filter]}
        else:
            query = search_filter
            
    customers = await Customer.find(query).sort("name").to_list()
    return StandardResponse(success=True, message="Customers retrieved", data=[doc_to_response(c) for c in customers])

@router.get("/{customer_id}", response_model=StandardResponse[CustomerResponse])
async def get_customer_by_id(
    customer_id: str,
    current_user: User = Depends(get_current_user)
):
    try:
        customer = await Customer.get(PydanticObjectId(customer_id))
    except Exception:
        customer = None
        
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    current_role = normalize_role(current_user.role)
    if current_role == "customer":
        if customer.email != current_user.email and customer.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Forbidden: Access denied to customer record")
    else:
        enforce_tenant(customer.seller_id, current_user)
        
    return StandardResponse(success=True, message="Customer retrieved", data=doc_to_response(customer))

@router.post("/", response_model=StandardResponse[CustomerResponse])
async def create_customer(
    customer_in: CustomerCreate,
    current_user: User = Depends(get_current_user)
):
    current_role = normalize_role(current_user.role)
    if current_role == "customer":
        raise HTTPException(status_code=403, detail="Customers cannot create customer accounts via this endpoint")
        
    seller_id = current_user.seller_id or str(current_user.id)
    if current_role == "super_admin" and customer_in.seller_id:
        seller_id = customer_in.seller_id

    # Check for duplicate email within the same tenant
    if customer_in.email:
        existing = await Customer.find_one({
            "email": customer_in.email,
            "$or": [{"seller_id": seller_id}, {"seller_id": None}]
        })
        if existing:
            raise HTTPException(status_code=400, detail="A customer with this email already exists in your organization")

    cust_dict = customer_in.model_dump()
    cust_dict["seller_id"] = seller_id
    new_cust = Customer(**cust_dict)
    await new_cust.insert()
    
    await record_audit_log(
        user_id=str(current_user.id),
        user_name=current_user.name,
        seller_id=seller_id,
        action="CUSTOMER_CREATED",
        module="customers",
        resource_type="Customer",
        resource_id=str(new_cust.id),
        details={"name": new_cust.name, "email": new_cust.email, "company": new_cust.company},
        reason=f"Customer {new_cust.name} created by {current_user.name}"
    )
    
    return StandardResponse(success=True, message="Customer created successfully", data=doc_to_response(new_cust))

@router.put("/{customer_id}", response_model=StandardResponse[CustomerResponse])
async def update_customer(
    customer_id: str,
    customer_in: CustomerUpdate,
    current_user: User = Depends(get_current_user)
):
    try:
        customer = await Customer.get(PydanticObjectId(customer_id))
    except Exception:
        customer = None
        
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    current_role = normalize_role(current_user.role)
    if current_role == "customer":
        if customer.email != current_user.email and customer.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Forbidden: Access denied to customer record")
    else:
        enforce_tenant(customer.seller_id, current_user)
        
    update_data = customer_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)
        
    await customer.save()
    
    await record_audit_log(
        user_id=str(current_user.id),
        user_name=current_user.name,
        seller_id=customer.seller_id,
        action="CUSTOMER_UPDATED",
        module="customers",
        resource_type="Customer",
        resource_id=str(customer.id),
        details=update_data,
        reason=f"Customer {customer.name} updated by {current_user.name}"
    )
    
    return StandardResponse(success=True, message="Customer updated successfully", data=doc_to_response(customer))

@router.delete("/{customer_id}", response_model=StandardResponse[CustomerResponse])
async def delete_customer(
    customer_id: str,
    current_user: User = Depends(get_current_user)
):
    try:
        customer = await Customer.get(PydanticObjectId(customer_id))
    except Exception:
        customer = None
        
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    current_role = normalize_role(current_user.role)
    if current_role == "customer":
        raise HTTPException(status_code=403, detail="Forbidden: Customers cannot delete accounts")
        
    enforce_tenant(customer.seller_id, current_user)
    
    # Soft delete to preserve historical integrity for past quotations/invoices
    customer.status = "INACTIVE"
    await customer.save()
    
    await record_audit_log(
        user_id=str(current_user.id),
        user_name=current_user.name,
        seller_id=customer.seller_id,
        action="CUSTOMER_DEACTIVATED",
        module="customers",
        resource_type="Customer",
        resource_id=str(customer.id),
        old_value="ACTIVE",
        new_value="INACTIVE",
        reason=f"Customer {customer.name} deactivated by {current_user.name}"
    )
    
    return StandardResponse(success=True, message="Customer deactivated successfully", data=doc_to_response(customer))
