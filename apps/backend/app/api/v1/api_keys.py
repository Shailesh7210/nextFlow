import hashlib
import secrets
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_active_workspace, get_db, RoleChecker
from app.models.api_key import ApiKey

router = APIRouter()

class ApiKeyCreate(BaseModel):
    name: str

class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    created_at: str
    last_used_at: Optional[str] = None

class ApiKeyCreateResponse(ApiKeyResponse):
    api_key: str

@router.get("", status_code=status.HTTP_200_OK)
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace),
    _role = Depends(RoleChecker(["owner", "admin", "editor", "viewer"]))
):
    """
    List all developer API keys for active workspace (without exposing full secret keys).
    """
    stmt = (
        select(ApiKey)
        .filter(ApiKey.workspace_id == workspace.id)
        .order_by(ApiKey.created_at.desc())
    )
    res = await db.execute(stmt)
    keys = res.scalars().all()

    return [
        {
            "id": k.id,
            "name": k.name,
            "key_prefix": k.key_prefix,
            "created_at": k.created_at.isoformat() if k.created_at else None,
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
        }
        for k in keys
    ]

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_api_key(
    payload: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace),
    _role = Depends(RoleChecker(["owner", "admin"]))
):
    """
    Generate a new API key for active workspace. Plaintext key is returned ONLY ONCE.
    """
    if not payload.name or not payload.name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API Key name is required."
        )

    raw_token = secrets.token_hex(24)
    raw_key = f"nex_live_{raw_token}"
    key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    key_prefix = f"nex_live_{raw_token[:4]}..."

    api_key_obj = ApiKey(
        workspace_id=workspace.id,
        name=payload.name.strip(),
        key_hash=key_hash,
        key_prefix=key_prefix,
    )
    db.add(api_key_obj)
    await db.commit()
    await db.refresh(api_key_obj)

    return {
        "id": api_key_obj.id,
        "name": api_key_obj.name,
        "key_prefix": api_key_obj.key_prefix,
        "api_key": raw_key,
        "created_at": api_key_obj.created_at.isoformat() if api_key_obj.created_at else None,
        "last_used_at": None,
    }

@router.delete("/{key_id}", status_code=status.HTTP_200_OK)
async def revoke_api_key(
    key_id: str,
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace),
    _role = Depends(RoleChecker(["owner", "admin"]))
):
    """
    Revoke/Delete an API key by ID.
    """
    stmt = select(ApiKey).filter(ApiKey.id == key_id, ApiKey.workspace_id == workspace.id)
    res = await db.execute(stmt)
    key_obj = res.scalars().first()

    if not key_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found."
        )

    await db.delete(key_obj)
    await db.commit()

    return {"message": f"API key {key_id} successfully revoked."}
