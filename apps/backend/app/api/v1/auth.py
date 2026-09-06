from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import get_password_hash, verify_password, create_access_token
from app.api.dependencies import oauth2_scheme, get_current_user
from app.db.session import get_db
from app.db.redis import redis_client
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.schemas.user import UserCreate, UserOut, Token

router = APIRouter()

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate, 
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user. Automatically creates a default workspace and 
    assigns the registering user as the Workspace Owner.
    """
    # 1. Check if user already exists
    existing_user_query = select(User).filter(User.email == user_in.email)
    existing_user_result = await db.execute(existing_user_query)
    if existing_user_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email is already registered."
        )

    # 2. Create User
    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name
    )
    db.add(new_user)
    await db.flush()  # Generates the new_user.id

    # 3. Create Default Workspace
    wsp_name = user_in.workspace_name or f"{user_in.full_name or user_in.email.split('@')[0]}'s Workspace"
    default_workspace = Workspace(
        name=wsp_name
    )
    db.add(default_workspace)
    await db.flush()  # Generates default_workspace.id

    # 4. Associate User with Workspace as Owner
    member_association = WorkspaceMember(
        workspace_id=default_workspace.id,
        user_id=new_user.id,
        role="owner"
    )
    db.add(member_association)
    
    await db.commit()
    await db.refresh(new_user)

    # 5. Create access token
    access_token = create_access_token(subject=new_user.id)
    return Token(access_token=access_token, token_type="bearer")

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    OAuth2 compatible token login, retrieve access token.
    Supports both Swagger UI form-data login and client API requests.
    """
    # Find user by email
    query = select(User).filter(User.email == form_data.username)
    result = await db.execute(query)
    user = result.scalars().first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )

    access_token = create_access_token(subject=user.id)
    return Token(access_token=access_token, token_type="bearer")

@router.post("/logout")
async def logout(
    token: str = Depends(oauth2_scheme)
):
    """
    Log out the current user by blacklisting their active JWT token in Redis.
    """
    # Blacklist token for 30 minutes (matching token lifespan)
    await redis_client.set(f"blacklist:{token}", "1", ex=1800)
    return {"detail": "Successfully logged out."}

from app.schemas.workspace import WorkspaceOut

@router.get("/workspaces", response_model=list[WorkspaceOut])
async def get_user_workspaces(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all workspaces associated with the current user.
    """
    query = select(Workspace).join(
        WorkspaceMember, 
        WorkspaceMember.workspace_id == Workspace.id
    ).filter(WorkspaceMember.user_id == current_user.id)
    
    result = await db.execute(query)
    return result.scalars().all()

from app.schemas.user import UserProfileUpdate

@router.get("/me", response_model=UserOut)
async def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get profile information of currently authenticated user.
    """
    return current_user

@router.patch("/me", response_model=UserOut)
async def update_my_profile(
    payload: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update profile details (full_name, password).
    """
    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip()

    if payload.new_password:
        if not payload.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is required to set a new password."
            )
        if not verify_password(payload.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password."
            )
        current_user.hashed_password = get_password_hash(payload.new_password)

    await db.commit()
    await db.refresh(current_user)
    return current_user
