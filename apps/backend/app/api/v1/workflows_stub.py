from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_current_active_workspace
from app.db.session import get_db
from app.models.user import User
from app.models.workspace import Workspace

router = APIRouter()

@router.get("")
async def get_workflows(
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_active_workspace)
):
    """
    Protected stub endpoint for listing workflows.
    Ensures that the client can request details scoped to their current workspace.
    """
    return {
        "message": "Successfully accessed protected workflows stub.",
        "workspace_id": workspace.id,
        "workspace_name": workspace.name,
        "user_id": current_user.id,
        "user_email": current_user.email,
        "workflows": []
    }
