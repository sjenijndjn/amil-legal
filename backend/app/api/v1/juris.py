"""Juris AI Legal Assistant endpoints: /chat and /conversations."""

from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.ai.rag_pipeline import run_juris_rag_pipeline
from app.core.config import settings
from app.core.exceptions import ResourceNotFoundError
from app.core.security import enforce_rate_limit, get_current_user, record_audit_event
from app.database.base import utcnow
from app.database.session import get_db
from app.models.conversation import Conversation, Message
from app.models.user import User
from app.schemas.juris import (
    ChatCompletionResponse,
    ChatRequest,
    ConversationDetailResponse,
    ConversationSummary,
    ConversationUpdateRequest,
    MessageResponse,
)

router = APIRouter(tags=["Juris AI Assistant"])


def _get_user_conversation_or_404(
    db: Session, conv_id: uuid.UUID, user_id: uuid.UUID, request: Optional[Request] = None
) -> Conversation:
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conv_id, Conversation.user_id == user_id)
        .first()
    )
    if conv is None:
        record_audit_event(
            db,
            user_id=user_id,
            action="UNAUTHORIZED_OR_MISSING_CONVERSATION_ACCESS",
            resource_type="CONVERSATION",
            resource_id=str(conv_id),
            request=request,
        )
        raise ResourceNotFoundError("Conversation not found")
    return conv


@router.post(
    "/chat",
    response_model=ChatCompletionResponse,
    dependencies=[Depends(enforce_rate_limit("juris_chat", settings.RATE_LIMIT_CHAT_PER_MINUTE))],
)
def juris_chat(
    payload: ChatRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatCompletionResponse:
    if payload.conversation_id is not None:
        conv = _get_user_conversation_or_404(
            db, payload.conversation_id, current_user.id, request=request
        )
        conv.response_mode = payload.response_mode
        conv.updated_at = utcnow()
    else:
        short_title = payload.message.strip().splitlines()[0][:80]
        conv = Conversation(
            user_id=current_user.id,
            title=short_title or "Legal Research Inquiry",
            response_mode=payload.response_mode,
            is_pinned=False,
        )
        db.add(conv)
        db.flush()

    user_msg = Message(
        conversation_id=conv.id,
        user_id=current_user.id,
        role="USER",
        content=payload.message.strip(),
    )
    db.add(user_msg)
    db.flush()

    rag_out = run_juris_rag_pipeline(
        db,
        user_id=current_user.id,
        query=payload.message.strip(),
        response_mode=payload.response_mode,
        document_ids=payload.document_ids,
    )

    structured_sections = rag_out["structured_sections"]
    cited_sources = rag_out["cited_sources"]

    assistant_msg = Message(
        conversation_id=conv.id,
        user_id=current_user.id,
        role="ASSISTANT",
        content=str(rag_out["content"]),
        structured_sections=structured_sections.model_dump(),  # type: ignore[union-attr]
        cited_sources=[s.model_dump() for s in cited_sources],  # type: ignore[union-attr]
        confidence_score=float(rag_out["confidence_score"]),  # type: ignore[arg-type]
        coverage_status=str(rag_out["coverage_status"]),
    )
    db.add(assistant_msg)
    conv.updated_at = utcnow()
    db.commit()
    db.refresh(conv)

    record_audit_event(
        db,
        user_id=current_user.id,
        action="JURIS_CHAT_QUERY",
        resource_type="CONVERSATION",
        resource_id=str(conv.id),
        request=request,
        metadata_json={
            "response_mode": payload.response_mode,
            "coverage_status": rag_out["coverage_status"],
            "citations_count": len(cited_sources),  # type: ignore[arg-type]
        },
    )

    return ChatCompletionResponse(
        conversation_id=conv.id,
        conversation_title=conv.title,
        user_message_id=user_msg.id,
        assistant_message_id=assistant_msg.id,
        response_mode=payload.response_mode,
        content=str(rag_out["content"]),
        structured_sections=structured_sections,  # type: ignore[arg-type]
        cited_sources=cited_sources,  # type: ignore[arg-type]
        confidence_score=float(rag_out["confidence_score"]),  # type: ignore[arg-type]
        coverage_status=str(rag_out["coverage_status"]),
        verification_date=str(rag_out["verification_date"]),
        ai_provider_used=str(rag_out["ai_provider_used"]),
    )


@router.get("/conversations", response_model=List[ConversationSummary])
def list_conversations(
    q: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[ConversationSummary]:
    query_obj = db.query(Conversation).filter(Conversation.user_id == current_user.id)
    if q and q.strip():
        term = f"%{q.strip()}%"
        query_obj = query_obj.filter(Conversation.title.ilike(term))
    convs = (
        query_obj.order_by(Conversation.is_pinned.desc(), Conversation.updated_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    results: List[ConversationSummary] = []
    for c in convs:
        msg_count = (
            db.query(Message)
            .filter(Message.conversation_id == c.id, Message.user_id == current_user.id)
            .count()
        )
        results.append(
            ConversationSummary(
                id=c.id,
                title=c.title,
                response_mode=c.response_mode,
                is_pinned=c.is_pinned,
                message_count=msg_count,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
        )
    return results


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation(
    conversation_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationDetailResponse:
    conv = _get_user_conversation_or_404(db, conversation_id, current_user.id, request=request)
    return ConversationDetailResponse(
        id=conv.id,
        title=conv.title,
        response_mode=conv.response_mode,
        is_pinned=conv.is_pinned,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[MessageResponse.model_validate(m) for m in conv.messages],
    )


@router.patch("/conversations/{conversation_id}", response_model=ConversationSummary)
def update_conversation(
    conversation_id: uuid.UUID,
    payload: ConversationUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationSummary:
    conv = _get_user_conversation_or_404(db, conversation_id, current_user.id, request=request)
    updates = payload.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(conv, k, v)
    conv.updated_at = utcnow()
    db.commit()
    db.refresh(conv)
    msg_count = db.query(Message).filter(Message.conversation_id == conv.id).count()
    return ConversationSummary(
        id=conv.id,
        title=conv.title,
        response_mode=conv.response_mode,
        is_pinned=conv.is_pinned,
        message_count=msg_count,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    conv = _get_user_conversation_or_404(db, conversation_id, current_user.id, request=request)
    db.delete(conv)
    db.commit()
    record_audit_event(
        db,
        user_id=current_user.id,
        action="CONVERSATION_DELETED",
        resource_type="CONVERSATION",
        resource_id=str(conversation_id),
        request=request,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/conversations/{conversation_id}/export")
def export_conversation(
    conversation_id: uuid.UUID,
    request: Request,
    format: str = Query(default="markdown", pattern="^(markdown|json)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    conv = _get_user_conversation_or_404(db, conversation_id, current_user.id, request=request)
    lines = [
        f"# AMIL Juris Research Transcript: {conv.title}",
        f"**Response Mode:** {conv.response_mode} | **Exported At:** {utcnow().isoformat()}",
        "",
        "---",
        "",
    ]
    for msg in conv.messages:
        speaker = "Counsel / User" if msg.role == "USER" else "Juris AI (AMIL)"
        lines.append(f"## {speaker} ({msg.created_at.isoformat()})")
        lines.append(msg.content)
        lines.append("")

    return {
        "conversation_id": str(conv.id),
        "title": conv.title,
        "format": format,
        "markdown": "\n".join(lines),
        "messages": [MessageResponse.model_validate(m).model_dump(mode="json") for m in conv.messages],
    }
