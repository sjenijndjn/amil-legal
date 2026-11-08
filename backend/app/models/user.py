"""User and Profile models for AMIL Legal Intelligence Platform."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, utcnow


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_email", "email", unique=True),
        Index("ix_users_is_active", "is_active"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="OWNER", nullable=False)
    refresh_token_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    profile: Mapped[Optional["Profile"]] = relationship(
        "Profile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    conversations: Mapped[List["Conversation"]] = relationship(  # type: ignore[name-defined]
        "Conversation", back_populates="user", cascade="all, delete-orphan"
    )
    documents: Mapped[List["Document"]] = relationship(  # type: ignore[name-defined]
        "Document", back_populates="user", cascade="all, delete-orphan"
    )


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    display_name: Mapped[str] = mapped_column(String(150), default="Amil Bhatt", nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    preferred_theme: Mapped[str] = mapped_column(
        String(50), default="midnight_navy_gold", nullable=False
    )
    preferred_language: Mapped[str] = mapped_column(String(20), default="en-IN", nullable=False)
    ai_response_style: Mapped[str] = mapped_column(
        String(50), default="standard", nullable=False
    )
    research_preferences: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=lambda: {
            "default_jurisdiction": "India",
            "prefer_post_2024_criminal_codes": True,
            "show_historical_equivalents": True,
            "citation_format": "SCC_AND_INSC",
        },
        nullable=False,
    )
    saved_legal_topics: Mapped[List[str]] = mapped_column(
        JSON,
        default=lambda: [
            "Constitutional Law & Fundamental Rights",
            "BNS, BNSS & BSA (2023 Criminal Law Reforms)",
            "IT Act, 2000 & DPDP Act, 2023",
            "Commercial Contracts & Corporate Governance",
            "Electronic Evidence (BSA s. 63 / IEA s. 65B)",
        ],
        nullable=False,
    )
    workspace_settings: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=lambda: {
            "welcome_greeting": "Welcome back, Amil.",
            "compact_citations": False,
            "auto_verify_citations": True,
        },
        nullable=False,
    )
    ai_document_consent: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="profile")
