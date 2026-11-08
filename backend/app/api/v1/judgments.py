"""Case Law Research endpoints: /judgments and /judgments/{id}."""

from __future__ import annotations

import uuid
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.exceptions import ResourceNotFoundError
from app.core.security import get_current_user
from app.database.session import get_db
from app.models.legal_corpus import Judgment
from app.models.user import User
from app.schemas.legal import (
    CitationItemResponse,
    JudgmentDetailResponse,
    JudgmentSummaryResponse,
)

router = APIRouter(prefix="/judgments", tags=["Case Law Research"])


@router.get("", response_model=List[JudgmentSummaryResponse])
def list_judgments(
    q: Optional[str] = Query(default=None),
    court: Optional[str] = Query(default=None),
    judge: Optional[str] = Query(default=None),
    precedent_status: Optional[str] = Query(default=None),
    issue: Optional[str] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[JudgmentSummaryResponse]:
    j_q = db.query(Judgment)
    if q and q.strip():
        term = f"%{q.strip()}%"
        j_q = j_q.filter(
            or_(
                Judgment.case_title.ilike(term),
                Judgment.neutral_citation.ilike(term),
                Judgment.subject_matter.ilike(term),
                Judgment.headnote_summary.ilike(term),
                Judgment.ratio_decidendi.ilike(term),
            )
        )
    if court and court.strip():
        j_q = j_q.filter(Judgment.court.ilike(f"%{court.strip()}%"))
    if precedent_status and precedent_status.strip():
        j_q = j_q.filter(Judgment.precedent_status == precedent_status.strip().upper())
    if issue and issue.strip():
        j_q = j_q.filter(Judgment.subject_matter.ilike(f"%{issue.strip()}%"))
    if date_from:
        j_q = j_q.filter(Judgment.decision_date >= date_from)
    if date_to:
        j_q = j_q.filter(Judgment.decision_date <= date_to)

    judgments = j_q.order_by(Judgment.decision_date.desc()).all()
    if judge and judge.strip():
        j_low = judge.strip().lower()
        judgments = [
            j
            for j in judgments
            if any(j_low in str(jg).lower() for jg in (j.judges or []))
        ]

    return [JudgmentSummaryResponse.model_validate(j) for j in judgments]


@router.get("/{judgment_id}", response_model=JudgmentDetailResponse)
def get_judgment_detail(
    judgment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JudgmentDetailResponse:
    j = db.query(Judgment).filter(Judgment.id == judgment_id).first()
    if j is None:
        raise ResourceNotFoundError("Judgment not found")

    detail = JudgmentDetailResponse.model_validate(j)
    detail.citations = [
        CitationItemResponse.model_validate(c) for c in (j.outgoing_citations or [])
    ]
    return detail
