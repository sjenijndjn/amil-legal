"""Cached Legal Judgment Model for Bharat Courts & External Judgment Providers."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    Index,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, PortableVector, utcnow


class LegalJudgment(Base):
    """Normalized, cached Indian Court judgments retrieved from Bharat Courts (Archive or Live)."""

    __tablename__ = "legal_judgments"
    __table_args__ = (
        UniqueConstraint(
            "source_provider", "external_case_id", name="uq_legal_judgments_provider_case_id"
        ),
        Index("ix_legal_judgments_citation", "citation"),
        Index("ix_legal_judgments_court", "court"),
        Index("ix_legal_judgments_decision_date", "decision_date"),
        Index("ix_legal_judgments_cnr", "cnr_number"),
        Index("ix_legal_judgments_authority_status", "authority_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    external_case_id: Mapped[str] = mapped_column(String(255), nullable=False)
    case_title: Mapped[str] = mapped_column(String(500), nullable=False)
    court: Mapped[str] = mapped_column(String(150), nullable=False)
    citation: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    decision_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    judges: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    party_names: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    petitioner: Mapped[Optional[str]] = mapped_column(String(350), nullable=True)
    respondent: Mapped[Optional[str]] = mapped_column(String(350), nullable=True)
    cnr_number: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    case_number: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    disposal_nature: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    source_provider: Mapped[str] = mapped_column(
        String(80), default="bharat_courts", nullable=False
    )
    source_type: Mapped[str] = mapped_column(
        String(50), default="archive", nullable=False
    )  # "archive" | "live"
    document_reference: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    source_last_verified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    authority_status: Mapped[str] = mapped_column(
        String(50), default="PENDING_VERIFICATION", nullable=False
    )  # BINDING | PERSUASIVE | OVERRULED | DISTINGUISHED | REVERSED | STAYED | PENDING_VERIFICATION
    authority_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bench_type: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    headnote_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ratio_decidendi: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extracted_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    embedding: Mapped[Optional[List[float]]] = mapped_column(PortableVector(768), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )
