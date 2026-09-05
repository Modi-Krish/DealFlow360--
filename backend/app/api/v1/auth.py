from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse
from app.schemas.common import StandardResponse

router = APIRouter()

def user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        name=user.name,
        email=user.email,
        role=user.role,
        status="ACTIVE" if user.is_active else "INACTIVE"
    )

@router.post("/signup", response_model=StandardResponse[UserResponse])
async def signup(user_data: UserCreate):
    existing_user = await User.find_one(User.email == user_data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role,
        is_active=True
    )
    
    await new_user.insert()
    
    return StandardResponse(
        success=True,
        message="User created successfully",
        data=user_to_response(new_user)
    )

@router.post("/login", response_model=StandardResponse[Token])
async def login(user_data: UserLogin):
    user = await User.find_one(User.email == user_data.email)
    
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
        
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    return StandardResponse(
        success=True,
        message="Login successful",
        data=Token(
            access_token=create_access_token(str(user.id)),
            refresh_token=create_refresh_token(str(user.id))
        )
    )

@router.get("/me", response_model=StandardResponse[UserResponse])
async def read_users_me(current_user: User = Depends(get_current_user)):
    return StandardResponse(
        success=True,
        message="User profile retrieved",
        data=user_to_response(current_user)
    )
