"""Indian Legal Corpus models: LegalSource, LegalAct, LegalSection, Judgment, Citation."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, PortableVector, utcnow


class LegalSource(Base):
    __tablename__ = "legal_sources"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_type: Mapped[str] = mapped_column(String(80), nullable=False)
    jurisdiction: Mapped[str] = mapped_column(String(120), default="India", nullable=False)
    official_url: Mapped[str] = mapped_column(String(512), nullable=False)
    is_verified_repository: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    acts: Mapped[List["LegalAct"]] = relationship("LegalAct", back_populates="source")
    judgments: Mapped[List["Judgment"]] = relationship("Judgment", back_populates="source")


class LegalAct(Base):
    __tablename__ = "legal_acts"
    __table_args__ = (
        UniqueConstraint("act_number", "enactment_year", "title", name="uq_act_num_year_title"),
        Index("ix_legal_acts_short_title", "short_title"),
        Index("ix_legal_acts_status", "status"),
        Index("ix_legal_acts_subject_category", "subject_category"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    source_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("legal_sources.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    short_title: Mapped[str] = mapped_column(String(120), nullable=False)
    act_number: Mapped[str] = mapped_column(String(80), nullable=False)
    enactment_year: Mapped[int] = mapped_column(Integer, nullable=False)
    enactment_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    commencement_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    effective_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        String(40), default="CURRENT", nullable=False
    )  # CURRENT | HISTORICAL
    replaces_act_code: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    replaced_by_act_code: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    subject_category: Mapped[str] = mapped_column(String(120), nullable=False)
    preamble: Mapped[str] = mapped_column(Text, nullable=False)
    amendment_history: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON, default=list, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    source: Mapped["LegalSource"] = relationship("LegalSource", back_populates="acts")
    sections: Mapped[List["LegalSection"]] = relationship(
        "LegalSection", back_populates="act", cascade="all, delete-orphan"
    )


class LegalSection(Base):
    __tablename__ = "legal_sections"
    __table_args__ = (
        UniqueConstraint("act_id", "section_number", name="uq_act_section_number"),
        Index("ix_legal_sections_act_sec", "act_id", "section_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    act_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("legal_acts.id", ondelete="CASCADE"), nullable=False
    )
    part_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    chapter_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    chapter_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    section_number: Mapped[str] = mapped_column(String(50), nullable=False)
    section_title: Mapped[str] = mapped_column(String(300), nullable=False)
    statutory_text: Mapped[str] = mapped_column(Text, nullable=False)
    amendment_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    effective_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    corresponding_historical_section: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    embedding: Mapped[Optional[List[float]]] = mapped_column(PortableVector(768), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    act: Mapped["LegalAct"] = relationship("LegalAct", back_populates="sections")


class Judgment(Base):
    __tablename__ = "judgments"
    __table_args__ = (
        Index("ix_judgments_court_date", "court", "decision_date"),
        Index("ix_judgments_precedent_status", "precedent_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    source_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("legal_sources.id", ondelete="RESTRICT"), nullable=False
    )
    case_title: Mapped[str] = mapped_column(String(350), nullable=False)
    neutral_citation: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    equivalent_citations: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    court: Mapped[str] = mapped_column(String(150), nullable=False)
    bench_type: Mapped[str] = mapped_column(String(120), nullable=False)
    judges: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    decision_date: Mapped[date] = mapped_column(Date, nullable=False)
    subject_matter: Mapped[str] = mapped_column(String(200), nullable=False)
    legal_issues: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    headnote_summary: Mapped[str] = mapped_column(Text, nullable=False)
    ratio_decidendi: Mapped[str] = mapped_column(Text, nullable=False)
    key_paragraphs: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON, default=list, nullable=False
    )
    full_text_excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    precedent_status: Mapped[str] = mapped_column(
        String(50), default="BINDING", nullable=False
    )  # BINDING | OVERRULED | PENDING_VERIFICATION
    verification_notes: Mapped[str] = mapped_column(Text, nullable=False)
    official_source_url: Mapped[str] = mapped_column(String(512), nullable=False)
    embedding: Mapped[Optional[List[float]]] = mapped_column(PortableVector(768), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    source: Mapped["LegalSource"] = relationship("LegalSource", back_populates="judgments")
    outgoing_citations: Mapped[List["Citation"]] = relationship(
        "Citation",
        foreign_keys="Citation.citing_judgment_id",
        back_populates="citing_judgment",
        cascade="all, delete-orphan",
    )


class Citation(Base):
    __tablename__ = "citations"
    __table_args__ = (
        Index("ix_citations_citing_judgment", "citing_judgment_id"),
        Index("ix_citations_cited_judgment", "cited_judgment_id"),
        Index("ix_citations_cited_section", "cited_section_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    citing_judgment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("judgments.id", ondelete="CASCADE"), nullable=False
    )
    cited_judgment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("judgments.id", ondelete="SET NULL"), nullable=True
    )
    cited_section_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("legal_sections.id", ondelete="SET NULL"), nullable=True
    )
    citation_text: Mapped[str] = mapped_column(String(255), nullable=False)
    treatment_type: Mapped[str] = mapped_column(
        String(60), default="RELIED_UPON", nullable=False
    )  # RELIED_UPON | OVERRULED | DISTINGUISHED | INTERPRETED
    context_excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    citing_judgment: Mapped["Judgment"] = relationship(
        "Judgment", foreign_keys=[citing_judgment_id], back_populates="outgoing_citations"
    )
