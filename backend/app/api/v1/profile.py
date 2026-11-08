"""Personalization & Profile endpoints (/api/v1/profile) including DPDP data erasure."""

from __future__ import annotations

from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, record_audit_event
from app.database.session import get_db
from app.documents.storage import storage_service
from app.models.conversation import Conversation
from app.models.document import Document
from app.models.draft import Draft
from app.models.library import Bookmark, Folder, Note
from app.models.task import Task
from app.models.user import Profile, User
from app.schemas.profile import DataPurgeRequest, ProfileResponse, ProfileUpdateRequest

router = APIRouter(prefix="/profile", tags=["Personalization & Profile"])


def _ensure_profile(db: Session, user: User) -> Profile:
    if user.profile is not None:
        return user.profile
    profile = Profile(user_id=user.id, display_name="Amil Bhatt")
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("", response_model=ProfileResponse)
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    """Return personalized workspace profile for the current user."""
    profile = _ensure_profile(db, current_user)
    return ProfileResponse.model_validate(profile)


@router.patch("", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    """Update personalization preferences, theme, AI response style, or DPDP consent."""
    profile = _ensure_profile(db, current_user)
    updates = payload.model_dump(exclude_unset=True)
    for field_name, value in updates.items():
        setattr(profile, field_name, value)

    if "display_name" in updates and updates["display_name"]:
        first_name = str(updates["display_name"]).strip().split(" ")[0]
        ws = dict(profile.workspace_settings or {})
        ws["welcome_greeting"] = f"Welcome back, {first_name}."
        profile.workspace_settings = ws

    db.add(profile)
    db.commit()
    db.refresh(profile)

    record_audit_event(
        db,
        user_id=current_user.id,
        action="PROFILE_UPDATE",
        resource_type="profile",
        resource_id=str(profile.id),
        request=request,
        metadata_json={"updated_fields": list(updates.keys())},
    )
    return ProfileResponse.model_validate(profile)


@router.delete("/data")
def purge_personal_data(
    payload: DataPurgeRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, str]:
    """Purge all personal documents, conversations, notes, bookmarks, drafts, and tasks per DPDP Act 2023."""
    if not payload.confirm_deletion:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="confirm_deletion must be true to purge personal workspace data.",
        )

    user_docs = db.query(Document).filter(Document.user_id == current_user.id).all()
    for doc in user_docs:
        storage_service.delete_bytes(doc.storage_key)

    db.query(Document).filter(Document.user_id == current_user.id).delete()
    db.query(Conversation).filter(Conversation.user_id == current_user.id).delete()
    db.query(Bookmark).filter(Bookmark.user_id == current_user.id).delete()
    db.query(Note).filter(Note.user_id == current_user.id).delete()
    db.query(Folder).filter(Folder.user_id == current_user.id).delete()
    db.query(Draft).filter(Draft.user_id == current_user.id).delete()
    db.query(Task).filter(Task.user_id == current_user.id).delete()
    db.commit()

    record_audit_event(
        db,
        user_id=current_user.id,
        action="DPDP_PERSONAL_DATA_PURGE",
        resource_type="user",
        resource_id=str(current_user.id),
        request=request,
    )
    return {"detail": "All personal data and documents purged per DPDP rights"}
