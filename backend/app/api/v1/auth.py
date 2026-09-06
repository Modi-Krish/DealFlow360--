from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token
from app.core.dependencies import get_current_user
from app.core.permissions import normalize_role, get_effective_permissions
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse
from app.schemas.common import StandardResponse

router = APIRouter()

def user_to_response(user: User) -> UserResponse:
    norm_role = normalize_role(user.role)
    eff_perms = sorted(list(get_effective_permissions(norm_role, user.permissions)))
    return UserResponse(
        id=str(user.id),
        name=user.name,
        email=user.email,
        role=norm_role,
        status=user.status or ("ACTIVE" if user.is_active else "INACTIVE"),
        permissions=eff_perms,
        seller_id=user.seller_id,
        company_name=user.company_name
    )

@router.post("/signup", response_model=StandardResponse[UserResponse])
async def signup(user_data: UserCreate):
    """
    Public self-registration endpoint.
    SECURITY: Never trust client-sent role. Public signup strictly enforces 'customer' role
    with no seller affiliation and no internal permissions.
    """
    try:
        existing_user = await User.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
            
        new_user = User(
            name=user_data.name,
            email=user_data.email,
            password_hash=get_password_hash(user_data.password),
            role="customer", # Enforce customer role unconditionally
            permissions=[],
            seller_id=None,
            is_active=True,
            status="ACTIVE"
        )
        
        await new_user.insert()
        
        return StandardResponse(
            success=True,
            message="Customer account created successfully",
            data=user_to_response(new_user)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login", response_model=StandardResponse[Token])
async def login(user_data: UserLogin):
    user = await User.find_one({"email": user_data.email})
    
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
        
    if not user.is_active or user.status == "INACTIVE":
        raise HTTPException(status_code=400, detail="Inactive user account")
        
    return StandardResponse(
        success=True,
        message="Login successful",
        data=Token(
            access_token=create_access_token(str(user.id)),
            refresh_token=create_refresh_token(str(user.id))
        )
    )

from jose import JWTError, jwt
from beanie import PydanticObjectId
from app.core.config import settings
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse, TokenRefreshRequest

@router.post("/refresh", response_model=StandardResponse[Token])
async def refresh_token(body: TokenRefreshRequest):
    try:
        payload = jwt.decode(body.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type: expected refresh token")
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
        
    try:
        user = await User.get(PydanticObjectId(user_id))
    except Exception:
        user = None
        
    if not user or not user.is_active or user.status == "INACTIVE":
        raise HTTPException(status_code=401, detail="User account is inactive or not found")
        
    new_access_token = create_access_token(str(user.id))
    new_refresh_token = create_refresh_token(str(user.id))
    
    return StandardResponse(
        success=True,
        message="Token refreshed successfully",
        data=Token(
            access_token=new_access_token,
            refresh_token=new_refresh_token
        )
    )

@router.get("/me", response_model=StandardResponse[UserResponse])
async def read_users_me(current_user: User = Depends(get_current_user)):
    return StandardResponse(
        success=True,
        message="User profile retrieved",
        data=user_to_response(current_user)
    )
