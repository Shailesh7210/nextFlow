from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict

class UserBase(BaseModel):
    email: EmailStr

from typing import Optional

class UserCreate(UserBase):
    password: str
    full_name: Optional[str] = None
    workspace_name: Optional[str] = None

class UserOut(UserBase):
    id: str
    full_name: Optional[str] = None
    is_active: bool
    created_at: datetime

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: str | None = None
    exp: int | None = None
