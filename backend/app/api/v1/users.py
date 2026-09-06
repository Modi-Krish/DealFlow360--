from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from beanie import PydanticObjectId
from pydantic import BaseModel, EmailStr

from app.core.dependencies import get_current_user, require_permission, enforce_tenant
from app.core.permissions import (
    Permission, ROLE_DEFAULT_PERMISSIONS, normalize_role, get_effective_permissions, user_has_permission
)
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.audit import record_audit_log
from app.schemas.auth import UserResponse
from app.schemas.common import StandardResponse
from app.api.v1.auth import user_to_response

router = APIRouter()

class EmployeeCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str # sales_manager, sales_rep, finance, operations (or seller if super_admin)
    permissions: Optional[List[str]] = []
    seller_id: Optional[str] = None
    company_name: Optional[str] = None

class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    permissions: Optional[List[str]] = None
    status: Optional[str] = None
    company_name: Optional[str] = None

ALLOWED_EMPLOYEE_ROLES = {"sales_manager", "sales_rep", "finance", "operations"}

@router.get("/", response_model=StandardResponse[List[UserResponse]])
async def list_users(
    role: Optional[str] = Query(None),
    seller_id: Optional[str] = Query(None),
    current_user: User = Depends(require_permission(Permission.USERS_VIEW.value))
):
    query: Dict[str, Any] = {}
    current_role = normalize_role(current_user.role)
    
    if current_role == "super_admin":
        if seller_id:
            query["seller_id"] = seller_id
        if role:
            query["role"] = normalize_role(role)
    elif current_role == "seller":
        # Seller can only view own employees and self
        my_seller_id = current_user.seller_id or str(current_user.id)
        query["$or"] = [
            {"seller_id": my_seller_id},
            {"_id": current_user.id}
        ]
        if role:
            query["role"] = normalize_role(role)
    else:
        # Other employees with users.view
        if not current_user.seller_id:
            raise HTTPException(status_code=403, detail="Forbidden: No organization association")
        query["seller_id"] = current_user.seller_id
        if role:
            query["role"] = normalize_role(role)

    users = await User.find(query).to_list()
    return StandardResponse(
        success=True,
        message="Users retrieved successfully",
        data=[user_to_response(u) for u in users]
    )

@router.post("/", response_model=StandardResponse[UserResponse])
async def create_user(
    user_data: EmployeeCreate,
    current_user: User = Depends(require_permission(Permission.USERS_CREATE.value))
):
    current_role = normalize_role(current_user.role)
    target_role = normalize_role(user_data.role)
    
    # Check email duplicate
    existing = await User.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    target_seller_id = None
    target_company = user_data.company_name
    
    if current_role == "super_admin":
        # Super admin can create sellers and platform users
        if target_role == "seller":
            target_seller_id = user_data.seller_id # Will assign self id after insert if None
            target_company = user_data.company_name or user_data.name
        else:
            target_seller_id = user_data.seller_id
            if target_seller_id and not target_company:
                try:
                    seller_user = await User.get(PydanticObjectId(target_seller_id))
                    if seller_user:
                        target_company = seller_user.company_name or seller_user.name
                except Exception:
                    pass
    elif current_role == "seller":
        # Seller can ONLY create employees for their own organization
        if target_role not in ALLOWED_EMPLOYEE_ROLES:
            raise HTTPException(
                status_code=403,
                detail=f"Sellers can only create employee roles ({', '.join(ALLOWED_EMPLOYEE_ROLES)})"
            )
        target_seller_id = current_user.seller_id or str(current_user.id)
        target_company = current_user.company_name
    else:
        # Check permissions for other internal roles
        if target_role not in ALLOWED_EMPLOYEE_ROLES:
            raise HTTPException(status_code=403, detail="Not authorized to create this role")
        target_seller_id = current_user.seller_id
        target_company = current_user.company_name

    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=target_role,
        permissions=user_data.permissions or [],
        seller_id=target_seller_id,
        company_name=target_company,
        created_by=str(current_user.id),
        status="ACTIVE",
        is_active=True
    )
    await new_user.insert()
    
    # If seller was created without seller_id, seller is their own organization root
    if target_role == "seller" and not new_user.seller_id:
        new_user.seller_id = str(new_user.id)
        await new_user.save()

    # Record Audit Log
    await record_audit_log(
        user_id=str(current_user.id),
        user_name=current_user.name,
        seller_id=target_seller_id,
        action="USER_CREATED",
        module="users",
        resource_type="User",
        resource_id=str(new_user.id),
        new_value={"role": target_role, "email": new_user.email, "seller_id": target_seller_id},
        reason=f"User {new_user.email} created with role {target_role}"
    )

    return StandardResponse(
        success=True,
        message=f"User {new_user.name} created successfully",
        data=user_to_response(new_user)
    )

@router.get("/{user_id}", response_model=StandardResponse[UserResponse])
async def get_user_by_id(
    user_id: str,
    current_user: User = Depends(require_permission(Permission.USERS_VIEW.value))
):
    try:
        target_user = await User.get(PydanticObjectId(user_id))
    except Exception:
        target_user = None

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    current_role = normalize_role(current_user.role)
    if current_role != "super_admin":
        my_seller_id = current_user.seller_id or str(current_user.id)
        target_user_seller_id = target_user.seller_id or str(target_user.id)
        if target_user_seller_id != my_seller_id:
            raise HTTPException(status_code=403, detail="Forbidden: User belongs to another organization")

    return StandardResponse(
        success=True,
        message="User retrieved successfully",
        data=user_to_response(target_user)
    )

@router.put("/{user_id}", response_model=StandardResponse[UserResponse])
async def update_user(
    user_id: str,
    payload: UserUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        target_user = await User.get(PydanticObjectId(user_id))
    except Exception:
        target_user = None

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    current_role = normalize_role(current_user.role)
    is_self = (str(current_user.id) == str(target_user.id))

    # CRITICAL SECURITY RULE: Users must NEVER be able to modify their own role or grant themselves permissions
    if is_self:
        if payload.role is not None and normalize_role(payload.role) != normalize_role(target_user.role):
            raise HTTPException(status_code=403, detail="Forbidden: Users cannot change their own role")
        if payload.permissions is not None:
            raise HTTPException(status_code=403, detail="Forbidden: Users cannot grant themselves permissions")

    # If updating another user, must have users.update permission
    if not is_self:
        if not user_has_permission(current_user.role, current_user.permissions, Permission.USERS_UPDATE.value):
            raise HTTPException(status_code=403, detail="Permission denied: required 'users.update'")

        # Tenant isolation check
        if current_role != "super_admin":
            my_seller_id = current_user.seller_id or str(current_user.id)
            target_user_seller_id = target_user.seller_id or str(target_user.id)
            if target_user_seller_id != my_seller_id:
                raise HTTPException(status_code=403, detail="Forbidden: Cannot modify user of another organization")

            # Sellers can only assign employee roles
            if payload.role:
                new_role = normalize_role(payload.role)
                if new_role not in ALLOWED_EMPLOYEE_ROLES:
                    raise HTTPException(status_code=403, detail=f"Cannot assign role outside of {ALLOWED_EMPLOYEE_ROLES}")

    old_values = {
        "name": target_user.name,
        "role": target_user.role,
        "permissions": target_user.permissions,
        "status": target_user.status
    }

    if payload.name is not None:
        target_user.name = payload.name
    if payload.role is not None:
        target_user.role = normalize_role(payload.role)
    if payload.permissions is not None:
        target_user.permissions = payload.permissions
    if payload.status is not None:
        target_user.status = payload.status
        target_user.is_active = (payload.status == "ACTIVE")
    if payload.company_name is not None:
        target_user.company_name = payload.company_name

    await target_user.save()

    # Log audit
    await record_audit_log(
        user_id=str(current_user.id),
        user_name=current_user.name,
        seller_id=target_user.seller_id,
        action="USER_UPDATED",
        module="users",
        resource_type="User",
        resource_id=str(target_user.id),
        old_value=old_values,
        new_value={
            "name": target_user.name,
            "role": target_user.role,
            "permissions": target_user.permissions,
            "status": target_user.status
        },
        reason=f"User {target_user.email} updated by {current_user.name}"
    )

    return StandardResponse(
        success=True,
        message="User updated successfully",
        data=user_to_response(target_user)
    )

@router.delete("/{user_id}", response_model=StandardResponse[dict])
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_permission(Permission.USERS_DELETE.value))
):
    try:
        target_user = await User.get(PydanticObjectId(user_id))
    except Exception:
        target_user = None

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if str(target_user.id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    current_role = normalize_role(current_user.role)
    if current_role != "super_admin":
        my_seller_id = current_user.seller_id or str(current_user.id)
        target_user_seller_id = target_user.seller_id or str(target_user.id)
        if target_user_seller_id != my_seller_id:
            raise HTTPException(status_code=403, detail="Forbidden: User belongs to another organization")

    target_user.status = "INACTIVE"
    target_user.is_active = False
    await target_user.save()

    await record_audit_log(
        user_id=str(current_user.id),
        user_name=current_user.name,
        seller_id=target_user.seller_id,
        action="USER_DEACTIVATED",
        module="users",
        resource_type="User",
        resource_id=str(target_user.id),
        reason=f"User deactivated by {current_user.name}"
    )

    return StandardResponse(success=True, message="User deactivated successfully", data={"id": user_id})

@router.get("/meta/roles", response_model=StandardResponse[List[dict]])
async def get_system_roles():
    """Metadata of system roles and default permissions for UI assignment."""
    roles = [
        {"id": "super_admin", "name": "Super Admin", "description": "Platform-wide administrator with full system access", "level": "PLATFORM", "default_permissions": ROLE_DEFAULT_PERMISSIONS.get("super_admin", [])},
        {"id": "seller", "name": "Seller / Organization", "description": "Independent business root owning employees, products, warehouses, and quotations", "level": "SELLER", "default_permissions": ROLE_DEFAULT_PERMISSIONS.get("seller", [])},
        {"id": "sales_manager", "name": "Sales Manager", "description": "Manages sales pipeline, reviews and approves discount requests", "level": "EMPLOYEE", "default_permissions": ROLE_DEFAULT_PERMISSIONS.get("sales_manager", [])},
        {"id": "sales_rep", "name": "Sales Rep", "description": "Creates quotations and interacts with customers", "level": "EMPLOYEE", "default_permissions": ROLE_DEFAULT_PERMISSIONS.get("sales_rep", [])},
        {"id": "finance", "name": "Finance", "description": "Reconciles billing, invoices, and approves high-risk deals", "level": "EMPLOYEE", "default_permissions": ROLE_DEFAULT_PERMISSIONS.get("finance", [])},
        {"id": "operations", "name": "Operations", "description": "Manages warehouses, inventory, and order fulfillment", "level": "EMPLOYEE", "default_permissions": ROLE_DEFAULT_PERMISSIONS.get("operations", [])},
        {"id": "customer", "name": "Customer", "description": "Self-registered external buyer", "level": "EXTERNAL", "default_permissions": ROLE_DEFAULT_PERMISSIONS.get("customer", [])}
    ]
    return StandardResponse(success=True, message="Roles retrieved", data=roles)

@router.get("/meta/permissions", response_model=StandardResponse[Dict[str, List[str]]])
async def get_system_permissions():
    """Returns all available granular permissions grouped by module."""
    grouped: Dict[str, List[str]] = {}
    for p in Permission:
        mod = p.value.split(".")[0]
        if mod not in grouped:
            grouped[mod] = []
        grouped[mod].append(p.value)
    return StandardResponse(success=True, message="Permissions retrieved", data=grouped)
