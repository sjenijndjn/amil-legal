"""Legal Research API Endpoints: Bharat Courts unified search, details, PDF streaming, and provider health."""

from __future__ import annotations

import io
from typing import Optional
import urllib.parse

from fastapi import APIRouter, Depends, Query, Request, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.exceptions import ResourceNotFoundError
from app.core.security import get_current_user, record_audit_event
from app.database.session import get_db
from app.models.user import User
from app.schemas.legal import (
    BharatCourtHealthResponse,
    BharatCourtJudgmentItem,
    BharatCourtSearchResponse,
)
from app.services.bharat_courts_service import bharat_courts_service

router = APIRouter(prefix="/legal-research", tags=["Bharat Courts & Legal Research"])


@router.get(
    "/judgments/search",
    response_model=BharatCourtSearchResponse,
    summary="Search Indian Court Judgments via Bharat Courts",
)
async def search_judgments(
    request: Request,
    q: Optional[str] = Query(default=None, description="Keywords or legal issue"),
    court: Optional[str] = Query(
        default=None, description="Court code, e.g. sci, allahabad, bombay, delhi"
    ),
    judge: Optional[str] = Query(default=None, description="Judge name substring"),
    party: Optional[str] = Query(
        default=None, description="Petitioner or respondent party name"
    ),
    citation: Optional[str] = Query(
        default=None, description="Neutral citation or SCR reference"
    ),
    cnr: Optional[str] = Query(default=None, description="16-character CNR number"),
    year: Optional[int] = Query(default=None, ge=1950, le=2030, description="Decision year"),
    year_from: Optional[int] = Query(
        default=None, ge=1950, le=2030, description="Start year for range filter"
    ),
    year_to: Optional[int] = Query(
        default=None, ge=1950, le=2030, description="End year for range filter"
    ),
    source: str = Query(
        default="archive", description="Data source: 'archive' (AWS Open Data) or 'live' (eCourts)"
    ),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=10, ge=1, le=50, description="Results limit per query"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BharatCourtSearchResponse:
    """Unified search across Supreme Court and High Courts using Bharat Courts."""
    result = await bharat_courts_service.search(
        q=q,
        court=court,
        judge=judge,
        party=party,
        citation=citation,
        cnr=cnr,
        year=year,
        year_from=year_from,
        year_to=year_to,
        source=source,
        page=page,
        limit=limit,
        db=db,
    )

    record_audit_event(
        db,
        user_id=current_user.id,
        action="BHARAT_COURTS_SEARCH",
        resource_type="JUDGMENT_SEARCH",
        metadata_json={
            "query": q,
            "court": court,
            "year": year or (f"{year_from}-{year_to}" if year_from else None),
            "results_count": result.get("total", 0),
        },
        request=request,
    )

    return BharatCourtSearchResponse(**result)


@router.get(
    "/judgments/{case_id}",
    response_model=BharatCourtJudgmentItem,
    summary="Retrieve Judgment Metadata and Authority Standing",
)
async def get_judgment(
    case_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BharatCourtJudgmentItem:
    """Retrieve full metadata, citation, and legal authority assessment for a judgment."""
    data = await bharat_courts_service.get_judgment_by_id(case_id, db=db)
    record_audit_event(
        db,
        user_id=current_user.id,
        action="BHARAT_COURTS_VIEW_JUDGMENT",
        resource_type="JUDGMENT",
        resource_id=case_id,
        request=request,
    )
    return BharatCourtJudgmentItem(**data)


@router.get(
    "/judgments/{case_id}/pdf",
    summary="Stream or Download Judgment PDF",
    responses={
        200: {
            "content": {"application/pdf": {}},
            "description": "Raw PDF stream of the official judgment.",
        },
        404: {"description": "PDF document not found or unavailable."},
    },
)
async def get_judgment_pdf(
    case_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Stream or download verified judgment PDF bytes with safe headers."""
    pdf_bytes, filename, content_type = await bharat_courts_service.fetch_pdf(case_id, db=db)

    record_audit_event(
        db,
        user_id=current_user.id,
        action="BHARAT_COURTS_FETCH_PDF",
        resource_type="JUDGMENT_PDF",
        resource_id=case_id,
        request=request,
    )

    encoded_filename = urllib.parse.quote(filename)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type=content_type,
        headers={
            "Content-Disposition": f"inline; filename*=UTF-8''{encoded_filename}",
            "Content-Length": str(len(pdf_bytes)),
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get(
    "/providers/bharat-courts/health",
    response_model=BharatCourtHealthResponse,
    summary="Check Bharat Courts Provider Reachability",
)
def get_provider_health(
    current_user: User = Depends(get_current_user),
) -> BharatCourtHealthResponse:
    """Report whether Bharat Courts provider is enabled and local archive cache is reachable."""
    status_info = bharat_courts_service.check_health()
    return BharatCourtHealthResponse(**status_info)
