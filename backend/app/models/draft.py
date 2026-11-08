"""Drafting Studio model: Draft with version history."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List

from sqlalchemy import JSON, DateTime, ForeignKey, Index, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, utcnow


class Draft(Base):
    __tablename__ = "drafts"
    __table_args__ = (Index("ix_drafts_user_type_updated", "user_id", "draft_type", "updated_at"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    draft_type: Mapped[str] = mapped_column(
        String(60), nullable=False
    )  # LEGAL_NOTICE | APPLICATION | COMPLAINT | REPRESENTATION | AGREEMENT | AFFIDAVIT | MEMORANDUM | CORRESPONDENCE
    user_facts: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    content_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    cited_references: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    version_history: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON, default=list, nullable=False
    )
    status: Mapped[str] = mapped_column(String(40), default="DRAFT", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )
