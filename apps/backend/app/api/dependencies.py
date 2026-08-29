from typing import List
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import jwt

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import get_db
from app.db.redis import redis_client
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.schemas.user import TokenPayload

# OAuth2 scheme configures Swagger UI to support login
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

async def get_current_user(
    db: AsyncSession = Depends(get_db), 
    token: str = Depends(oauth2_scheme)
) -> User:
    """
    Dependency that decodes the access token, checks token blacklist in Redis,
    and returns the authenticated user from the database.
    """
    import logging
    dep_logger = logging.getLogger("app.api.dependencies")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # 1. Check if token is blacklisted in Redis
    try:
        is_blacklisted = await redis_client.get(f"blacklist:{token}")
        if is_blacklisted:
            dep_logger.warning("Token is blacklisted")
            raise credentials_exception
    except Exception as e:
        dep_logger.error(f"Redis blacklist check error: {e}")
        raise credentials_exception

    # 2. Decode access token
    try:
        payload = decode_access_token(token)
        token_data = TokenPayload(**payload)
        if token_data.sub is None:
            dep_logger.warning("Token subject is None")
            raise credentials_exception
    except jwt.PyJWTError as e:
        dep_logger.warning(f"JWT decode error: {e}")
        raise credentials_exception

    # 3. Retrieve user from db
    result = await db.execute(select(User).filter(User.id == token_data.sub))
    user = result.scalars().first()
    
    if user is None:
        dep_logger.warning(f"User not found for sub: {token_data.sub}")
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Inactive user"
        )
        
    return user

async def get_current_active_workspace(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_workspace_id: str | None = Header(default=None)
) -> Workspace:
    """
    Dependency that resolves the active workspace.
    If X-Workspace-ID header is provided, it validates membership.
    If X-Workspace-ID header is omitted, it falls back to the user's first/primary workspace.
    """
    if x_workspace_id:
        # Check if user is a member of the requested workspace
        member_query = select(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == x_workspace_id,
            WorkspaceMember.user_id == current_user.id
        )
        member_result = await db.execute(member_query)
        member = member_result.scalars().first()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of this workspace"
            )
        
        # Retrieve the workspace
        workspace_query = select(Workspace).filter(Workspace.id == x_workspace_id)
        workspace_result = await db.execute(workspace_query)
        workspace = workspace_result.scalars().first()
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found"
            )
        return workspace
    else:
        # Find the first workspace this user is a member of (fallback default)
        fallback_query = select(WorkspaceMember).filter(
            WorkspaceMember.user_id == current_user.id
        ).order_by(WorkspaceMember.created_at.asc())
        fallback_result = await db.execute(fallback_query)
        member = fallback_result.scalars().first()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not associated with any workspace"
            )
        
        workspace_query = select(Workspace).filter(Workspace.id == member.workspace_id)
        workspace_result = await db.execute(workspace_query)
        workspace = workspace_result.scalars().first()
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found"
            )
        return workspace

class RoleChecker:
    """
    Dependency class to enforce RBAC roles (owner, admin, editor, viewer).
    """
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    async def __call__(
        self,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user),
        workspace: Workspace = Depends(get_current_active_workspace)
    ) -> WorkspaceMember:
        query = select(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == current_user.id
        )
        result = await db.execute(query)
        member = result.scalars().first()
        if not member or member.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this operation"
            )
        return member
