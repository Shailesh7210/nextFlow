from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict

class CredentialBase(BaseModel):
    name: str
    type: str  # basic-auth, api-key, oauth2, etc.

class CredentialCreate(CredentialBase):
    data: Dict[str, Any]  # Plaintext dictionary of credential values

class CredentialUpdate(BaseModel):
    name: Optional[str] = None
    data: Optional[Dict[str, Any]] = None  # Plaintext dictionary to update

class CredentialOut(CredentialBase):
    id: str
    workspace_id: str
    # Sanitized data dictionary where secrets are masked for frontend display
    data: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
