"""Dashboard summary endpoint returning live database metrics and personalized items."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.session import get_db
from app.models.conversation import Conversation
from app.models.document import Document
from app.models.draft import Draft
from app.models.legal_corpus import Judgment, LegalAct, LegalSection, LegalSource
from app.models.library import Bookmark, Note
from app.models.task import Task
from app.models.user import User
from app.schemas.workspace import DashboardSummaryResponse, NoteResponse, TaskResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardSummaryResponse:
    profile = current_user.profile
    display_name = profile.display_name if profile else "Amil Bhatt"
    welcome_greeting = (
        profile.workspace_settings.get("welcome_greeting", "Welcome back, Amil.")
        if profile and isinstance(profile.workspace_settings, dict)
        else "Welcome back, Amil."
    )
    saved_topics = (
        profile.saved_legal_topics
        if profile and profile.saved_legal_topics
        else [
            "Constitutional Law & Fundamental Rights",
            "BNS, BNSS & BSA (2023 Criminal Law Reforms)",
            "IT Act, 2000 & DPDP Act, 2023",
        ]
    )

    counts = {
        "conversations": db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .count(),
        "documents": db.query(Document).filter(Document.user_id == current_user.id).count(),
        "bookmarks": db.query(Bookmark).filter(Bookmark.user_id == current_user.id).count(),
        "notes": db.query(Note).filter(Note.user_id == current_user.id).count(),
        "drafts": db.query(Draft).filter(Draft.user_id == current_user.id).count(),
        "pending_tasks": db.query(Task)
        .filter(Task.user_id == current_user.id, Task.status != "COMPLETED")
        .count(),
        "verified_acts": db.query(LegalAct).count(),
        "verified_sections": db.query(LegalSection).count(),
        "verified_judgments": db.query(Judgment).count(),
        "verified_sources": db.query(LegalSource).count(),
    }

    recent_convs = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
        .limit(5)
        .all()
    )
    recent_docs = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
        .limit(5)
        .all()
    )
    upcoming_tasks = (
        db.query(Task)
        .filter(Task.user_id == current_user.id, Task.status != "COMPLETED")
        .order_by(Task.due_at.asc().nulls_last())
        .limit(5)
        .all()
    )
    pinned_notes = (
        db.query(Note)
        .filter(Note.user_id == current_user.id)
        .order_by(Note.is_pinned.desc(), Note.updated_at.desc())
        .limit(4)
        .all()
    )

    corpus_highlights = [
        {
            "short_title": a.short_title,
            "title": a.title,
            "status": a.status,
            "effective_date": a.effective_date.isoformat() if a.effective_date else None,
        }
        for a in db.query(LegalAct).filter(LegalAct.status == "CURRENT").limit(6).all()
    ]

    return DashboardSummaryResponse(
        welcome_greeting=welcome_greeting,
        owner_name=display_name,
        counts=counts,
        recent_conversations=[
            {
                "id": str(c.id),
                "title": c.title,
                "response_mode": c.response_mode,
                "updated_at": c.updated_at.isoformat(),
            }
            for c in recent_convs
        ],
        recent_documents=[
            {
                "id": str(d.id),
                "title": d.title,
                "mime_type": d.mime_type,
                "page_count": d.page_count,
                "created_at": d.created_at.isoformat(),
            }
            for d in recent_docs
        ],
        upcoming_tasks=[TaskResponse.model_validate(t) for t in upcoming_tasks],
        pinned_notes=[NoteResponse.model_validate(n) for n in pinned_notes],
        saved_legal_topics=saved_topics,
        corpus_highlights=corpus_highlights,
    )
