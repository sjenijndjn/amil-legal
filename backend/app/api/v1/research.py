"""Unified Legal Research Engine endpoints: /research/search, /research/sources, /research/history."""

from __future__ import annotations

import uuid
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.exceptions import ResourceNotFoundError
from app.core.security import get_current_user, record_audit_event
from app.database.session import get_db
from app.models.audit_log import AuditLog
from app.models.legal_corpus import Judgment, LegalAct, LegalSection, LegalSource
from app.models.user import User
from app.schemas.legal import (
    AuditHistoryEntry,
    JudgmentSummaryResponse,
    LegalActResponse,
    LegalSectionResponse,
    LegalSourceDetailResponse,
    LegalSourceResponse,
    UnifiedSearchResponse,
)

router = APIRouter(prefix="/research", tags=["Legal Research Engine"])


@router.get("/search", response_model=UnifiedSearchResponse)
def unified_legal_search(
    request: Request,
    q: str = Query(default=""),
    type: str = Query(default="all", pattern="^(all|act|section|judgment)$"),
    court: Optional[str] = Query(default=None),
    subject: Optional[str] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    status: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UnifiedSearchResponse:
    term = q.strip()
    like_term = f"%{term}%" if term else "%"

    acts_out: List[LegalActResponse] = []
    sections_out: List[LegalSectionResponse] = []
    judgments_out: List[JudgmentSummaryResponse] = []

    if type in ("all", "act"):
        act_q = db.query(LegalAct)
        if term:
            act_q = act_q.filter(
                or_(
                    LegalAct.title.ilike(like_term),
                    LegalAct.short_title.ilike(like_term),
                    LegalAct.subject_category.ilike(like_term),
                    LegalAct.preamble.ilike(like_term),
                    LegalAct.act_number.ilike(like_term),
                )
            )
        if subject:
            act_q = act_q.filter(LegalAct.subject_category.ilike(f"%{subject.strip()}%"))
        if status:
            act_q = act_q.filter(LegalAct.status == status.upper())

        for act in act_q.order_by(LegalAct.status.asc(), LegalAct.enactment_year.desc()).all():
            sec_cnt = db.query(LegalSection).filter(LegalSection.act_id == act.id).count()
            resp = LegalActResponse.model_validate(act)
            resp.section_count = sec_cnt
            acts_out.append(resp)

    if type in ("all", "section"):
        sec_q = db.query(LegalSection).join(LegalAct)
        if term:
            sec_q = sec_q.filter(
                or_(
                    LegalSection.section_number.ilike(like_term),
                    LegalSection.section_title.ilike(like_term),
                    LegalSection.statutory_text.ilike(like_term),
                    LegalSection.corresponding_historical_section.ilike(like_term),
                    LegalAct.short_title.ilike(like_term),
                    LegalAct.title.ilike(like_term),
                )
            )
        if subject:
            sec_q = sec_q.filter(LegalAct.subject_category.ilike(f"%{subject.strip()}%"))
        if status:
            sec_q = sec_q.filter(LegalAct.status == status.upper())

        for sec in sec_q.limit(40).all():
            s_resp = LegalSectionResponse.model_validate(sec)
            s_resp.act_short_title = sec.act.short_title
            s_resp.act_status = sec.act.status
            sections_out.append(s_resp)

    if type in ("all", "judgment"):
        j_q = db.query(Judgment)
        if term:
            j_q = j_q.filter(
                or_(
                    Judgment.case_title.ilike(like_term),
                    Judgment.neutral_citation.ilike(like_term),
                    Judgment.subject_matter.ilike(like_term),
                    Judgment.headnote_summary.ilike(like_term),
                    Judgment.ratio_decidendi.ilike(like_term),
                )
            )
        if court:
            j_q = j_q.filter(Judgment.court.ilike(f"%{court.strip()}%"))
        if subject:
            j_q = j_q.filter(Judgment.subject_matter.ilike(f"%{subject.strip()}%"))
        if status:
            j_q = j_q.filter(Judgment.precedent_status == status.upper())
        if date_from:
            j_q = j_q.filter(Judgment.decision_date >= date_from)
        if date_to:
            j_q = j_q.filter(Judgment.decision_date <= date_to)

        for j in j_q.order_by(Judgment.decision_date.desc()).all():
            judgments_out.append(JudgmentSummaryResponse.model_validate(j))

    sources_checked = [s.code for s in db.query(LegalSource).all()]
    total_results = len(acts_out) + len(sections_out) + len(judgments_out)

    if term:
        record_audit_event(
            db,
            user_id=current_user.id,
            action="RESEARCH_SEARCH",
            resource_type="LEGAL_CORPUS",
            request=request,
            metadata_json={"query": term[:120], "type": type, "total_results": total_results},
        )

    return UnifiedSearchResponse(
        query=term,
        total_results=total_results,
        acts=acts_out,
        sections=sections_out,
        judgments=judgments_out,
        verified_sources_checked=sources_checked,
    )


@router.get("/sources", response_model=List[LegalSourceResponse])
def list_legal_sources(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[LegalSourceResponse]:
    sources = db.query(LegalSource).order_by(LegalSource.code.asc()).all()
    return [LegalSourceResponse.model_validate(s) for s in sources]


@router.get("/sources/{source_id}", response_model=LegalSourceDetailResponse)
def get_legal_source_detail(
    source_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LegalSourceDetailResponse:
    source = db.query(LegalSource).filter(LegalSource.id == source_id).first()
    if source is None:
        raise ResourceNotFoundError("Legal source repository not found")
    acts_cnt = db.query(LegalAct).filter(LegalAct.source_id == source.id).count()
    judg_cnt = db.query(Judgment).filter(Judgment.source_id == source.id).count()
    resp = LegalSourceDetailResponse.model_validate(source)
    resp.acts_count = acts_cnt
    resp.judgments_count = judg_cnt
    return resp


@router.get("/history", response_model=List[AuditHistoryEntry])
def get_research_history(
    limit: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[AuditHistoryEntry]:
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == current_user.id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [AuditHistoryEntry.model_validate(log) for log in logs]
