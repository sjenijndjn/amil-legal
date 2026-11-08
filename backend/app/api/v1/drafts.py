"""Drafting Studio endpoints: create, list, detail, update (with version history), delete, export."""

from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.core.exceptions import ResourceNotFoundError
from app.core.security import get_current_user, record_audit_event
from app.database.base import utcnow
from app.database.session import get_db
from app.models.draft import Draft
from app.models.user import User
from app.schemas.workspace import (
    DraftCreateRequest,
    DraftExportRequest,
    DraftResponse,
    DraftUpdateRequest,
)
from app.services.drafting_service import (
    export_draft_to_docx_bytes,
    export_draft_to_pdf_bytes,
    generate_indian_legal_draft_markdown,
)

router = APIRouter(prefix="/drafts", tags=["Drafting Studio"])


def _get_user_draft_or_404(
    db: Session, draft_id: uuid.UUID, user_id: uuid.UUID, request: Optional[Request] = None
) -> Draft:
    draft = (
        db.query(Draft)
        .filter(Draft.id == draft_id, Draft.user_id == user_id)
        .first()
    )
    if draft is None:
        record_audit_event(
            db,
            user_id=user_id,
            action="UNAUTHORIZED_OR_MISSING_DRAFT_ACCESS",
            resource_type="DRAFT",
            resource_id=str(draft_id),
            request=request,
        )
        raise ResourceNotFoundError("Legal draft not found")
    return draft


@router.post("", response_model=DraftResponse, status_code=status.HTTP_201_CREATED)
def create_draft(
    payload: DraftCreateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DraftResponse:
    markdown_body = generate_indian_legal_draft_markdown(
        title=payload.title.strip(),
        draft_type=payload.draft_type,
        user_facts=payload.user_facts,
        cited_references=payload.cited_references,
    )
    now_iso = utcnow().isoformat()
    draft = Draft(
        user_id=current_user.id,
        title=payload.title.strip(),
        draft_type=payload.draft_type,
        user_facts=payload.user_facts,
        content_markdown=markdown_body,
        cited_references=payload.cited_references,
        version=1,
        version_history=[
            {
                "version": 1,
                "saved_at": now_iso,
                "summary": "Initial structured Indian legal draft generated",
                "content_markdown": markdown_body,
            }
        ],
        status="DRAFT",
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    record_audit_event(
        db,
        user_id=current_user.id,
        action="DRAFT_CREATED",
        resource_type="DRAFT",
        resource_id=str(draft.id),
        request=request,
        metadata_json={"draft_type": draft.draft_type},
    )
    return DraftResponse.model_validate(draft)


@router.get("", response_model=List[DraftResponse])
def list_drafts(
    draft_type: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[DraftResponse]:
    q = db.query(Draft).filter(Draft.user_id == current_user.id)
    if draft_type and draft_type.strip():
        q = q.filter(Draft.draft_type == draft_type.strip().upper())
    drafts = q.order_by(Draft.updated_at.desc()).all()
    return [DraftResponse.model_validate(d) for d in drafts]


@router.get("/{draft_id}", response_model=DraftResponse)
def get_draft(
    draft_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DraftResponse:
    draft = _get_user_draft_or_404(db, draft_id, current_user.id, request=request)
    return DraftResponse.model_validate(draft)


@router.patch("/{draft_id}", response_model=DraftResponse)
def update_draft(
    draft_id: uuid.UUID,
    payload: DraftUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DraftResponse:
    draft = _get_user_draft_or_404(db, draft_id, current_user.id, request=request)
    updates = payload.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(draft, k, v)

    # If user_facts or cited_references changed without explicit content_markdown, regenerate
    if ("user_facts" in updates or "cited_references" in updates) and "content_markdown" not in updates:
        draft.content_markdown = generate_indian_legal_draft_markdown(
            title=draft.title,
            draft_type=draft.draft_type,
            user_facts=draft.user_facts,
            cited_references=draft.cited_references,
        )

    draft.version = (draft.version or 1) + 1
    history = list(draft.version_history or [])
    history.append(
        {
            "version": draft.version,
            "saved_at": utcnow().isoformat(),
            "summary": f"Revision v{draft.version}",
            "content_markdown": draft.content_markdown,
        }
    )
    draft.version_history = history
    draft.updated_at = utcnow()
    db.commit()
    db.refresh(draft)
    return DraftResponse.model_validate(draft)


@router.delete("/{draft_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_draft(
    draft_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    draft = _get_user_draft_or_404(db, draft_id, current_user.id, request=request)
    db.delete(draft)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{draft_id}/export")
def export_draft(
    draft_id: uuid.UUID,
    payload: DraftExportRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    draft = _get_user_draft_or_404(db, draft_id, current_user.id, request=request)
    safe_slug = "".join(c if c.isalnum() else "_" for c in draft.title)[:45] or "amil_draft"

    if payload.format == "docx":
        docx_bytes = export_draft_to_docx_bytes(draft.title, draft.content_markdown)
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{safe_slug}.docx"'},
        )

    if payload.format == "pdf":
        pdf_bytes = export_draft_to_pdf_bytes(draft.title, draft.content_markdown)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{safe_slug}.pdf"'},
        )

    return Response(
        content=draft.content_markdown.encode("utf-8"),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{safe_slug}.md"'},
    )
