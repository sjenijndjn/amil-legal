"""Pydantic v2 schemas for Bare Acts, Sections, Judgments, Sources, and Unified Research."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class LegalSourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    source_type: str
    jurisdiction: str
    official_url: str
    is_verified_repository: bool
    last_synced_at: datetime


class LegalSourceDetailResponse(LegalSourceResponse):
    acts_count: int = 0
    judgments_count: int = 0


class LegalSectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    act_id: uuid.UUID
    act_short_title: Optional[str] = None
    act_status: Optional[str] = None
    part_number: Optional[str] = None
    chapter_number: Optional[str] = None
    chapter_title: Optional[str] = None
    section_number: str
    section_title: str
    statutory_text: str
    amendment_notes: Optional[str] = None
    effective_date: Optional[date] = None
    corresponding_historical_section: Optional[str] = None


class LegalActResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    source_id: uuid.UUID
    title: str
    short_title: str
    act_number: str
    enactment_year: int
    enactment_date: Optional[date] = None
    commencement_date: Optional[date] = None
    effective_date: Optional[date] = None
    status: str
    replaces_act_code: Optional[str] = None
    replaced_by_act_code: Optional[str] = None
    subject_category: str
    preamble: str
    section_count: int = 0


class LegalActDetailResponse(LegalActResponse):
    amendment_history: List[Dict[str, Any]]
    chapters: List[str] = []
    sections: List[LegalSectionResponse] = []


class CitationItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    citing_judgment_id: uuid.UUID
    cited_judgment_id: Optional[uuid.UUID] = None
    cited_section_id: Optional[uuid.UUID] = None
    citation_text: str
    treatment_type: str
    context_excerpt: str
    is_verified: bool


class JudgmentSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    case_title: str
    neutral_citation: str
    equivalent_citations: List[str]
    court: str
    bench_type: str
    judges: List[str]
    decision_date: date
    subject_matter: str
    headnote_summary: str
    precedent_status: str
    official_source_url: str


class JudgmentDetailResponse(JudgmentSummaryResponse):
    legal_issues: List[str]
    ratio_decidendi: str
    key_paragraphs: List[Dict[str, Any]]
    full_text_excerpt: str
    verification_notes: str
    citations: List[CitationItemResponse] = []


class UnifiedSearchResponse(BaseModel):
    query: str
    total_results: int
    acts: List[LegalActResponse]
    sections: List[LegalSectionResponse]
    judgments: List[JudgmentSummaryResponse]
    verified_sources_checked: List[str]


class AuditHistoryEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    metadata_json: Dict[str, Any]
    created_at: datetime
