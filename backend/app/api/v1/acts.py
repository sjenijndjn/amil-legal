"""Bare Acts Library endpoints: /acts, /acts/lookup, /acts/{id}, /acts/{id}/sections."""

from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.exceptions import ResourceNotFoundError
from app.core.security import get_optional_current_user
from app.database.session import get_db
from app.models.legal_corpus import LegalAct, LegalSection
from app.models.user import User
from app.schemas.legal import (
    ActLookupRequest,
    ActLookupResponse,
    LegalActDetailResponse,
    LegalActResponse,
    LegalSectionResponse,
)
from app.services.statutory_discovery import StatutoryDiscoveryService

router = APIRouter(prefix="/acts", tags=["Bare Acts Library"])


@router.get("", response_model=List[LegalActResponse])
def list_acts(
    q: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None, pattern="^(CURRENT|HISTORICAL)$"),
    subject: Optional[str] = Query(default=None),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> List[LegalActResponse]:
    """List all Indian bare acts with optional text and status filtering."""
    query_obj = db.query(LegalAct)
    if q and q.strip():
        term = f"%{q.strip()}%"
        query_obj = query_obj.filter(
            or_(
                LegalAct.title.ilike(term),
                LegalAct.short_title.ilike(term),
                LegalAct.act_number.ilike(term),
                LegalAct.subject_category.ilike(term),
                LegalAct.preamble.ilike(term),
            )
        )
    if status:
        query_obj = query_obj.filter(LegalAct.status == status.upper())
    if subject and subject.strip():
        query_obj = query_obj.filter(LegalAct.subject_category.ilike(f"%{subject.strip()}%"))

    acts = query_obj.order_by(LegalAct.status.asc(), LegalAct.enactment_year.desc()).all()
    out: List[LegalActResponse] = []
    for act in acts:
        sec_count = db.query(LegalSection).filter(LegalSection.act_id == act.id).count()
        resp = LegalActResponse.model_validate(act)
        resp.section_count = sec_count
        resp.sections_count = sec_count
        resp.source_name = act.source.name if act.source else "India Code — Legislative Department"
        resp.official_url = act.source.official_url if act.source else "https://www.indiacode.nic.in"
        out.append(resp)
    return out


@router.post("/lookup", response_model=ActLookupResponse)
def universal_act_lookup(
    payload: ActLookupRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> ActLookupResponse:
    """Universal On-Demand Indian Statutory Discovery & Grounding.

    Searches PostgreSQL, and if an Act or Section is not yet indexed, dynamically extracts,
    verifies, and persists the authentic provisions from India Code & Gemini AI.
    """
    service = StatutoryDiscoveryService(db)
    return service.lookup_or_discover(
        query=payload.query,
        act_title_hint=payload.act_title_hint,
        section_number_hint=payload.section_number_hint,
    )


@router.get("/{act_id}", response_model=LegalActDetailResponse)
def get_act_detail(
    act_id: uuid.UUID,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> LegalActDetailResponse:
    """Get full details of a Bare Act including all indexed sections."""
    act = db.query(LegalAct).filter(LegalAct.id == act_id).first()
    if act is None:
        raise ResourceNotFoundError("Bare Act not found")

    sections_out: List[LegalSectionResponse] = []
    chapters_seen: List[str] = []
    for sec in act.sections:
        s_resp = LegalSectionResponse.model_validate(sec)
        s_resp.act_short_title = act.short_title
        s_resp.act_status = act.status
        s_resp.chapter_number = sec.chapter_number or ""
        s_resp.chapter_title = sec.chapter_title or ""
        sections_out.append(s_resp)
        if sec.chapter_title:
            label = (
                f"Chapter {sec.chapter_number}: {sec.chapter_title}"
                if sec.chapter_number
                else sec.chapter_title
            )
            if label not in chapters_seen:
                chapters_seen.append(label)

    detail = LegalActDetailResponse.model_validate(act)
    detail.section_count = len(sections_out)
    detail.sections_count = len(sections_out)
    detail.source_name = act.source.name if act.source else "India Code — Legislative Department"
    detail.official_url = act.source.official_url if act.source else "https://www.indiacode.nic.in"
    detail.chapters = chapters_seen
    detail.sections = sections_out
    return detail


@router.get("/{act_id}/sections", response_model=List[LegalSectionResponse])
def list_act_sections(
    act_id: uuid.UUID,
    q: Optional[str] = Query(default=None),
    chapter: Optional[str] = Query(default=None),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> List[LegalSectionResponse]:
    """List sections for a given bare act with optional full-text search."""
    act = db.query(LegalAct).filter(LegalAct.id == act_id).first()
    if act is None:
        raise ResourceNotFoundError("Bare Act not found")

    sec_q = db.query(LegalSection).filter(LegalSection.act_id == act.id)
    if q and q.strip():
        term = f"%{q.strip()}%"
        sec_q = sec_q.filter(
            or_(
                LegalSection.section_number.ilike(term),
                LegalSection.section_title.ilike(term),
                LegalSection.statutory_text.ilike(term),
                LegalSection.corresponding_historical_section.ilike(term),
            )
        )
    if chapter and chapter.strip():
        ch_term = f"%{chapter.strip()}%"
        sec_q = sec_q.filter(
            or_(
                LegalSection.chapter_number.ilike(ch_term),
                LegalSection.chapter_title.ilike(ch_term),
            )
        )

    out: List[LegalSectionResponse] = []
    for sec in sec_q.all():
        resp = LegalSectionResponse.model_validate(sec)
        resp.act_short_title = act.short_title
        resp.act_status = act.status
        resp.chapter_number = sec.chapter_number or ""
        resp.chapter_title = sec.chapter_title or ""
        out.append(resp)
    return out
