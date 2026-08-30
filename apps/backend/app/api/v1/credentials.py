import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.dependencies import get_current_active_workspace, RoleChecker
from app.db.session import get_db
from app.models.credential import Credential
from app.schemas.credential import CredentialCreate, CredentialUpdate, CredentialOut
from app.core.crypto import encrypt_data, decrypt_data

router = APIRouter()

def sanitize_credential_data(data: dict) -> dict:
    """
    Mask sensitive values in a credential dictionary (like passwords, keys, tokens).
    """
    sensitive_substrings = {"password", "token", "secret", "key", "pass", "auth"}
    sanitized = {}
    for k, v in data.items():
        k_lower = k.lower()
        if any(sub in k_lower for sub in sensitive_substrings):
            sanitized[k] = "********"
        else:
            sanitized[k] = v
    return sanitized

@router.get("", response_model=list[CredentialOut])
async def list_credentials(
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace)
):
    """
    List all credentials in the resolved workspace, returning masked values.
    """
    query = select(Credential).filter(Credential.workspace_id == workspace.id).order_by(Credential.created_at.desc())
    result = await db.execute(query)
    credentials = result.scalars().all()
    
    out_credentials = []
    for cred in credentials:
        try:
            decrypted_str = decrypt_data(cred.encrypted_data)
            decrypted_dict = json.loads(decrypted_str)
        except Exception:
            decrypted_dict = {}
        
        sanitized_dict = sanitize_credential_data(decrypted_dict)
        
        # Build pydantic out model manually
        out_credentials.append(
            CredentialOut(
                id=cred.id,
                workspace_id=cred.workspace_id,
                name=cred.name,
                type=cred.type,
                data=sanitized_dict,
                created_at=cred.created_at,
                updated_at=cred.updated_at
            )
        )
    return out_credentials

@router.post("", response_model=CredentialOut, status_code=status.HTTP_201_CREATED)
async def create_credential(
    cred_in: CredentialCreate,
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace),
    _member = Depends(RoleChecker(["owner", "admin", "editor"]))
):
    """
    Create a new credential. Sensitive values are encrypted before database insertion.
    """
    plaintext_json = json.dumps(cred_in.data)
    encrypted_str = encrypt_data(plaintext_json)
    
    new_cred = Credential(
        workspace_id=workspace.id,
        name=cred_in.name,
        type=cred_in.type,
        encrypted_data=encrypted_str
    )
    db.add(new_cred)
    await db.commit()
    await db.refresh(new_cred)
    
    sanitized_dict = sanitize_credential_data(cred_in.data)
    return CredentialOut(
        id=new_cred.id,
        workspace_id=new_cred.workspace_id,
        name=new_cred.name,
        type=new_cred.type,
        data=sanitized_dict,
        created_at=new_cred.created_at,
        updated_at=new_cred.updated_at
    )

@router.get("/{id}", response_model=CredentialOut)
async def get_credential(
    id: str,
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace)
):
    """
    Get a single credential definition with masked properties.
    """
    query = select(Credential).filter(
        Credential.id == id,
        Credential.workspace_id == workspace.id
    )
    result = await db.execute(query)
    cred = result.scalars().first()
    if not cred:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found."
        )
        
    try:
        decrypted_str = decrypt_data(cred.encrypted_data)
        decrypted_dict = json.loads(decrypted_str)
    except Exception:
        decrypted_dict = {}
        
    sanitized_dict = sanitize_credential_data(decrypted_dict)
    return CredentialOut(
        id=cred.id,
        workspace_id=cred.workspace_id,
        name=cred.name,
        type=cred.type,
        data=sanitized_dict,
        created_at=cred.created_at,
        updated_at=cred.updated_at
    )

@router.put("/{id}", response_model=CredentialOut)
async def update_credential(
    id: str,
    cred_in: CredentialUpdate,
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace),
    _member = Depends(RoleChecker(["owner", "admin", "editor"]))
):
    """
    Update a credential definition, re-encrypting the payload if updated.
    """
    query = select(Credential).filter(
        Credential.id == id,
        Credential.workspace_id == workspace.id
    )
    result = await db.execute(query)
    cred = result.scalars().first()
    if not cred:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found."
        )
        
    if cred_in.name is not None:
        cred.name = cred_in.name
        
    # Read/decrypt current dict first
    try:
        current_decrypted = json.loads(decrypt_data(cred.encrypted_data))
    except Exception:
        current_decrypted = {}
        
    # Apply updates if provided
    if cred_in.data is not None:
        # Merge or overwrite? The standard n8n behavior is to merge fields.
        updated_dict = {**current_decrypted, **cred_in.data}
        # Filter out masked placeholders so we don't accidentally overwrite them
        for k, v in cred_in.data.items():
            if v == "********" and k in current_decrypted:
                updated_dict[k] = current_decrypted[k]
                
        plaintext_json = json.dumps(updated_dict)
        cred.encrypted_data = encrypt_data(plaintext_json)
        current_decrypted = updated_dict
        
    await db.commit()
    await db.refresh(cred)
    
    sanitized_dict = sanitize_credential_data(current_decrypted)
    return CredentialOut(
        id=cred.id,
        workspace_id=cred.workspace_id,
        name=cred.name,
        type=cred.type,
        data=sanitized_dict,
        created_at=cred.created_at,
        updated_at=cred.updated_at
    )

@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_credential(
    id: str,
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace),
    _member = Depends(RoleChecker(["owner", "admin"]))
):
    """
    Delete a credential definition. Only Owner and Admin roles allowed.
    """
    query = select(Credential).filter(
        Credential.id == id,
        Credential.workspace_id == workspace.id
    )
    result = await db.execute(query)
    cred = result.scalars().first()
    if not cred:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found."
        )
        
    await db.delete(cred)
    await db.commit()
    return {"detail": "Credential deleted successfully"}
