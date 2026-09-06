from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_active_workspace, get_db, RoleChecker
from app.core.security import get_password_hash
from app.models.user import User
from app.models.workspace_member import WorkspaceMember

router = APIRouter()

VALID_ROLES = {"owner", "admin", "editor", "viewer"}

class InviteMemberSchema(BaseModel):
    email: EmailStr
    role: str = "editor"

class UpdateRoleSchema(BaseModel):
    role: str

@router.get("/members", status_code=status.HTTP_200_OK)
async def list_workspace_members(
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace),
    _role = Depends(RoleChecker(["owner", "admin", "editor", "viewer"]))
):
    """
    List all team members and their assigned roles for the active workspace.
    """
    stmt = (
        select(WorkspaceMember, User)
        .join(User, WorkspaceMember.user_id == User.id)
        .filter(WorkspaceMember.workspace_id == workspace.id)
        .order_by(WorkspaceMember.created_at.asc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    members = []
    for member, user in rows:
        members.append({
            "id": member.id,
            "user_id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": member.role,
            "created_at": member.created_at.isoformat() if member.created_at else None
        })
    return members

@router.post("/members/invite", status_code=status.HTTP_201_CREATED)
async def invite_workspace_member(
    payload: InviteMemberSchema,
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace),
    _role = Depends(RoleChecker(["owner", "admin"]))
):
    """
    Invite a team member by email and assign a workspace role.
    """
    if payload.role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Role must be one of: {', '.join(sorted(VALID_ROLES))}"
        )

    # Check if target user exists
    stmt_user = select(User).filter(User.email == payload.email)
    res_user = await db.execute(stmt_user)
    user = res_user.scalars().first()

    if not user:
        # Create user account for invited user
        user = User(
            email=payload.email,
            hashed_password=get_password_hash("NexFlowTempPass123!"),
            full_name=payload.email.split("@")[0].capitalize(),
            is_active=True
        )
        db.add(user)
        await db.flush()

    # Check if already a member
    stmt_mem = select(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace.id,
        WorkspaceMember.user_id == user.id
    )
    res_mem = await db.execute(stmt_mem)
    member = res_mem.scalars().first()

    if member:
        # Update existing role
        member.role = payload.role
        await db.commit()
        await db.refresh(member)
    else:
        # Create workspace member
        member = WorkspaceMember(
            workspace_id=workspace.id,
            user_id=user.id,
            role=payload.role
        )
        db.add(member)
        await db.commit()
        await db.refresh(member)

    return {
        "id": member.id,
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": member.role,
        "created_at": member.created_at.isoformat() if member.created_at else None
    }

@router.patch("/members/{member_id}", status_code=status.HTTP_200_OK)
async def update_member_role(
    member_id: str,
    payload: UpdateRoleSchema,
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace),
    _role = Depends(RoleChecker(["owner", "admin"]))
):
    """
    Update role for a workspace member.
    """
    if payload.role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Role must be one of: {', '.join(sorted(VALID_ROLES))}"
        )

    stmt = select(WorkspaceMember).filter(
        WorkspaceMember.id == member_id,
        WorkspaceMember.workspace_id == workspace.id
    )
    res = await db.execute(stmt)
    member = res.scalars().first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace member not found."
        )

    member.role = payload.role
    await db.commit()
    await db.refresh(member)

    return {
        "id": member.id,
        "role": member.role,
        "message": f"Updated role to {payload.role}"
    }

@router.delete("/members/{member_id}", status_code=status.HTTP_200_OK)
async def remove_workspace_member(
    member_id: str,
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace),
    _role = Depends(RoleChecker(["owner", "admin"]))
):
    """
    Remove a member from active workspace.
    """
    stmt = select(WorkspaceMember).filter(
        WorkspaceMember.id == member_id,
        WorkspaceMember.workspace_id == workspace.id
    )
    res = await db.execute(stmt)
    member = res.scalars().first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace member not found."
        )

    await db.delete(member)
    await db.commit()

    return {"message": f"Member {member_id} removed from workspace."}
