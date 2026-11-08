"""Pydantic v2 schemas for Library, Drafting Studio, Tasks, and Dashboard."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Library (Folders, Bookmarks, Notes)
# ---------------------------------------------------------------------------


class FolderCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    color_hex: str = Field(default="#D4AF37", max_length=20)
    description: Optional[str] = Field(default=None, max_length=500)
    parent_id: Optional[uuid.UUID] = None


class FolderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    name: str
    color_hex: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class BookmarkCreateRequest(BaseModel):
    item_type: Literal["ACT", "SECTION", "JUDGMENT", "ANSWER", "DOCUMENT"]
    target_id: Optional[uuid.UUID] = None
    title: str = Field(..., min_length=1, max_length=300)
    excerpt: str = Field(..., min_length=1, max_length=4000)
    folder_id: Optional[uuid.UUID] = None
    tags: List[str] = Field(default_factory=list)


class BookmarkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    folder_id: Optional[uuid.UUID] = None
    item_type: str
    target_id: Optional[uuid.UUID] = None
    title: str
    excerpt: str
    tags: List[str]
    created_at: datetime


class NoteCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    folder_id: Optional[uuid.UUID] = None
    linked_entity_type: Optional[str] = Field(default=None, max_length=50)
    linked_entity_id: Optional[uuid.UUID] = None
    tags: List[str] = Field(default_factory=list)
    is_pinned: bool = False


class NoteUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    content: Optional[str] = None
    folder_id: Optional[uuid.UUID] = None
    tags: Optional[List[str]] = None
    is_pinned: Optional[bool] = None


class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    folder_id: Optional[uuid.UUID] = None
    title: str
    content: str
    linked_entity_type: Optional[str] = None
    linked_entity_id: Optional[uuid.UUID] = None
    tags: List[str]
    is_pinned: bool
    created_at: datetime
    updated_at: datetime


class LibraryOverviewResponse(BaseModel):
    folders: List[FolderResponse]
    bookmarks: List[BookmarkResponse]
    notes: List[NoteResponse]
    counts: Dict[str, int]


# ---------------------------------------------------------------------------
# Drafting Studio
# ---------------------------------------------------------------------------

DraftTypeLiteral = Literal[
    "LEGAL_NOTICE",
    "APPLICATION",
    "COMPLAINT",
    "REPRESENTATION",
    "AGREEMENT",
    "AFFIDAVIT",
    "MEMORANDUM",
    "CORRESPONDENCE",
]


class DraftCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    draft_type: DraftTypeLiteral
    user_facts: Dict[str, Any] = Field(default_factory=dict)
    cited_references: List[str] = Field(default_factory=list)
    generate_with_ai: bool = False


class DraftUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=255)
    content_markdown: Optional[str] = None
    user_facts: Optional[Dict[str, Any]] = None
    cited_references: Optional[List[str]] = None
    status: Optional[Literal["DRAFT", "REVIEWED", "FINAL"]] = None


class DraftExportRequest(BaseModel):
    format: Literal["docx", "pdf", "markdown"] = "markdown"


class DraftResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    draft_type: str
    user_facts: Dict[str, Any]
    content_markdown: str
    cited_references: List[str]
    version: int
    version_history: List[Dict[str, Any]]
    status: str
    disclaimer_banner: str = "[DRAFT — FOR LEGAL REVIEW ONLY]"
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Tasks & Reminders
# ---------------------------------------------------------------------------


class TaskCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    task_type: str = Field(default="FILING_DEADLINE", max_length=60)
    priority: Literal["LOW", "MEDIUM", "HIGH", "URGENT"] = "HIGH"
    status: Literal["TODO", "IN_PROGRESS", "COMPLETED"] = "TODO"
    due_at: Optional[datetime] = None
    reminder_at: Optional[datetime] = None
    linked_entity_type: Optional[str] = None
    linked_entity_id: Optional[uuid.UUID] = None


class TaskUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    task_type: Optional[str] = None
    priority: Optional[Literal["LOW", "MEDIUM", "HIGH", "URGENT"]] = None
    status: Optional[Literal["TODO", "IN_PROGRESS", "COMPLETED"]] = None
    due_at: Optional[datetime] = None
    reminder_at: Optional[datetime] = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: Optional[str] = None
    task_type: str
    priority: str
    status: str
    due_at: Optional[datetime] = None
    reminder_at: Optional[datetime] = None
    linked_entity_type: Optional[str] = None
    linked_entity_id: Optional[uuid.UUID] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Dashboard Summary
# ---------------------------------------------------------------------------


class DashboardSummaryResponse(BaseModel):
    welcome_greeting: str
    owner_name: str
    counts: Dict[str, int]
    recent_conversations: List[Dict[str, Any]]
    recent_documents: List[Dict[str, Any]]
    upcoming_tasks: List[TaskResponse]
    pinned_notes: List[NoteResponse]
    saved_legal_topics: List[str]
    corpus_highlights: List[Dict[str, Any]]
