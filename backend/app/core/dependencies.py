from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from beanie import PydanticObjectId

from app.core.config import settings
from app.models.user import User
from app.core.permissions import user_has_permission, normalize_role

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_db():
    yield None

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    try:
        user = await User.get(PydanticObjectId(user_id))
    except Exception:
        user = None
        
    if user is None:
        raise credentials_exception
    if not user.is_active or user.status == "INACTIVE":
        raise HTTPException(status_code=400, detail="Inactive user")
        
    user.role = normalize_role(user.role)
    return user

def require_permission(permission: str):
    """Dependency that verifies whether the authenticated user has the granular permission."""
    async def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        if not user_has_permission(current_user.role, current_user.permissions, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: required permission '{permission}'"
            )
        return current_user
    return permission_checker

def require_role(roles: List[str]):
    """Role-based checker supporting legacy routes and canonical role names."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        norm_user_role = normalize_role(current_user.role)
        norm_allowed = [normalize_role(r) for r in roles]
        if norm_user_role == "super_admin":
            return current_user
        if norm_user_role not in norm_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker

def enforce_tenant(resource_seller_id: Optional[str], current_user: User):
    """Enforce tenant isolation on a specific resource."""
    user_role = normalize_role(current_user.role)
    if user_role == "super_admin":
        return
    if user_role == "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Customers cannot access internal seller resources"
        )
    if not resource_seller_id or str(resource_seller_id) != str(current_user.seller_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot access resources belonging to another organization"
        )

def get_tenant_filter(current_user: User, base_filter: Optional[dict] = None) -> dict:
    """Build a MongoDB query filter enforcing tenant scoping."""
    query = dict(base_filter or {})
    user_role = normalize_role(current_user.role)
    if user_role == "super_admin":
        return query
    if user_role == "customer":
        query["customer_id"] = str(current_user.id)
        return query
    query["seller_id"] = current_user.seller_id
    return query
