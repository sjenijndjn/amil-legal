"""Pydantic v2 schemas for Personalization & Profile."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    display_name: str
    avatar_url: Optional[str] = None
    preferred_theme: str
    preferred_language: str
    ai_response_style: str
    research_preferences: Dict[str, Any]
    saved_legal_topics: List[str]
    workspace_settings: Dict[str, Any]
    ai_document_consent: bool
    created_at: datetime
    updated_at: datetime


class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    avatar_url: Optional[str] = Field(default=None, max_length=512)
    preferred_theme: Optional[str] = Field(default=None, max_length=50)
    preferred_language: Optional[str] = Field(default=None, max_length=20)
    ai_response_style: Optional[str] = Field(
        default=None, pattern="^(short|standard|detailed|research)$"
    )
    research_preferences: Optional[Dict[str, Any]] = None
    saved_legal_topics: Optional[List[str]] = None
    workspace_settings: Optional[Dict[str, Any]] = None
    ai_document_consent: Optional[bool] = None


class DataPurgeRequest(BaseModel):
    confirm_deletion: bool = Field(..., description="Must be true to execute DPDP data erasure")
