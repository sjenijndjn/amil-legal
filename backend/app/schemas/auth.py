"""Pydantic v2 request and response schemas for Authentication."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    display_name: str = Field(default="Amil Bhatt", min_length=2, max_length=150)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=10)


class ProfileEmbedded(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    display_name: str
    avatar_url: Optional[str] = None
    preferred_theme: str
    preferred_language: str
    ai_response_style: str
    research_preferences: Dict[str, Any]
    saved_legal_topics: List[str]
    workspace_settings: Dict[str, Any]
    ai_document_consent: bool


class UserWithProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    is_active: bool
    is_verified: bool
    role: str
    created_at: datetime
    profile: Optional[ProfileEmbedded] = None


class AuthTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 900
    user: UserWithProfileResponse
