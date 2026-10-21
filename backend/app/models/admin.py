from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class AdminLoginRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: str = Field(..., min_length=1)


class AdminUserResponse(BaseModel):
    id: str
    email: str
    username: Optional[str] = None
    full_name: str
    is_active: bool
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: AdminUserResponse
