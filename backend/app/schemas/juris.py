"""Pydantic v2 schemas for Juris AI Assistant and Conversations."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class StructuredLegalAnswerSections(BaseModel):
    """Mandatory 7-part structured Indian legal answer format."""

    legal_issue_summary: str
    applicable_acts_and_sections: List[str]
    relevant_case_law: List[str]
    plain_english_explanation: str
    procedural_steps_and_practical_takeaways: List[str]
    risks_limitations_and_ambiguities: List[str]
    verification_and_disclaimer_footer: str


class CitedSourceItem(BaseModel):
    source_type: str  # SECTION | JUDGMENT | DOCUMENT_CHUNK
    id: str
    title: str
    citation: str
    status: str  # VERIFIED | HISTORICAL | OVERRULED | USER_DOCUMENT
    excerpt: str
    effective_or_decision_date: Optional[str] = None
    official_url: Optional[str] = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=2, max_length=8000)
    conversation_id: Optional[uuid.UUID] = None
    response_mode: Literal["short", "standard", "detailed", "research"] = "standard"
    document_ids: List[uuid.UUID] = Field(default_factory=list)


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str
    content: str
    structured_sections: Optional[Dict[str, Any]] = None
    cited_sources: Optional[List[Dict[str, Any]]] = None
    confidence_score: Optional[float] = None
    coverage_status: Optional[str] = None
    created_at: datetime


class ChatCompletionResponse(BaseModel):
    conversation_id: uuid.UUID
    conversation_title: str
    user_message_id: uuid.UUID
    assistant_message_id: uuid.UUID
    response_mode: str
    content: str
    structured_sections: StructuredLegalAnswerSections
    cited_sources: List[CitedSourceItem]
    confidence_score: float
    coverage_status: str
    verification_date: str
    ai_provider_used: str
    message: Optional[MessageResponse] = None


class ConversationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    response_mode: str
    is_pinned: bool
    message_count: int = 0
    created_at: datetime
    updated_at: datetime


class ConversationDetailResponse(BaseModel):
    id: uuid.UUID
    title: str
    response_mode: str
    is_pinned: bool
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse]


class ConversationUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    is_pinned: Optional[bool] = None
    response_mode: Optional[Literal["short", "standard", "detailed", "research"]] = None
