"""My Legal Library endpoints: folders, bookmarks, notes, and library overview."""

from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.exceptions import ResourceNotFoundError
from app.core.security import get_current_user, record_audit_event
from app.database.base import utcnow
from app.database.session import get_db
from app.models.library import Bookmark, Folder, Note
from app.models.user import User
from app.schemas.workspace import (
    BookmarkCreateRequest,
    BookmarkResponse,
    FolderCreateRequest,
    FolderResponse,
    LibraryOverviewResponse,
    NoteCreateRequest,
    NoteResponse,
    NoteUpdateRequest,
)

router = APIRouter(prefix="/library", tags=["My Legal Library"])


@router.get("", response_model=LibraryOverviewResponse)
def get_library_overview(
    folder_id: Optional[uuid.UUID] = Query(default=None),
    item_type: Optional[str] = Query(default=None),
    tag: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    sort: str = Query(default="recent", pattern="^(recent|title)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LibraryOverviewResponse:
    folders_q = db.query(Folder).filter(Folder.user_id == current_user.id)
    bookmarks_q = db.query(Bookmark).filter(Bookmark.user_id == current_user.id)
    notes_q = db.query(Note).filter(Note.user_id == current_user.id)

    if folder_id is not None:
        bookmarks_q = bookmarks_q.filter(Bookmark.folder_id == folder_id)
        notes_q = notes_q.filter(Note.folder_id == folder_id)

    if item_type and item_type.strip():
        bookmarks_q = bookmarks_q.filter(Bookmark.item_type == item_type.strip().upper())

    if q and q.strip():
        term = f"%{q.strip()}%"
        bookmarks_q = bookmarks_q.filter(
            or_(Bookmark.title.ilike(term), Bookmark.excerpt.ilike(term))
        )
        notes_q = notes_q.filter(or_(Note.title.ilike(term), Note.content.ilike(term)))

    if sort == "title":
        bookmarks = bookmarks_q.order_by(Bookmark.title.asc()).all()
        notes = notes_q.order_by(Note.title.asc()).all()
    else:
        bookmarks = bookmarks_q.order_by(Bookmark.created_at.desc()).all()
        notes = notes_q.order_by(Note.is_pinned.desc(), Note.updated_at.desc()).all()

    if tag and tag.strip():
        t_low = tag.strip().lower()
        bookmarks = [
            b for b in bookmarks if any(t_low == str(tg).lower() for tg in (b.tags or []))
        ]
        notes = [
            n for n in notes if any(t_low == str(tg).lower() for tg in (n.tags or []))
        ]

    folders = folders_q.order_by(Folder.name.asc()).all()

    return LibraryOverviewResponse(
        folders=[FolderResponse.model_validate(f) for f in folders],
        bookmarks=[BookmarkResponse.model_validate(b) for b in bookmarks],
        notes=[NoteResponse.model_validate(n) for n in notes],
        counts={
            "folders": len(folders),
            "bookmarks": len(bookmarks),
            "notes": len(notes),
        },
    )


@router.get("/folders", response_model=List[FolderResponse])
def list_folders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[FolderResponse]:
    folders = (
        db.query(Folder)
        .filter(Folder.user_id == current_user.id)
        .order_by(Folder.name.asc())
        .all()
    )
    return [FolderResponse.model_validate(f) for f in folders]


@router.post("/folders", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
def create_folder(
    payload: FolderCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FolderResponse:
    folder = Folder(
        user_id=current_user.id,
        parent_id=payload.parent_id,
        name=payload.name.strip(),
        color_hex=payload.color_hex,
        description=payload.description,
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return FolderResponse.model_validate(folder)


@router.post("/bookmarks", response_model=BookmarkResponse, status_code=status.HTTP_201_CREATED)
def create_bookmark(
    payload: BookmarkCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BookmarkResponse:
    bm = Bookmark(
        user_id=current_user.id,
        folder_id=payload.folder_id,
        item_type=payload.item_type,
        target_id=payload.target_id,
        title=payload.title.strip(),
        excerpt=payload.excerpt.strip(),
        tags=payload.tags,
    )
    db.add(bm)
    db.commit()
    db.refresh(bm)
    return BookmarkResponse.model_validate(bm)


@router.delete("/bookmarks/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bookmark(
    bookmark_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    bm = (
        db.query(Bookmark)
        .filter(Bookmark.id == bookmark_id, Bookmark.user_id == current_user.id)
        .first()
    )
    if bm is None:
        record_audit_event(
            db,
            user_id=current_user.id,
            action="UNAUTHORIZED_OR_MISSING_BOOKMARK_DELETE",
            resource_type="BOOKMARK",
            resource_id=str(bookmark_id),
            request=request,
        )
        raise ResourceNotFoundError("Bookmark not found")
    db.delete(bm)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/notes", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    payload: NoteCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NoteResponse:
    note = Note(
        user_id=current_user.id,
        folder_id=payload.folder_id,
        title=payload.title.strip(),
        content=payload.content,
        linked_entity_type=payload.linked_entity_type,
        linked_entity_id=payload.linked_entity_id,
        tags=payload.tags,
        is_pinned=payload.is_pinned,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return NoteResponse.model_validate(note)


@router.patch("/notes/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: uuid.UUID,
    payload: NoteUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NoteResponse:
    note = (
        db.query(Note)
        .filter(Note.id == note_id, Note.user_id == current_user.id)
        .first()
    )
    if note is None:
        record_audit_event(
            db,
            user_id=current_user.id,
            action="UNAUTHORIZED_OR_MISSING_NOTE_ACCESS",
            resource_type="NOTE",
            resource_id=str(note_id),
            request=request,
        )
        raise ResourceNotFoundError("Note not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(note, k, v)
    note.updated_at = utcnow()
    db.commit()
    db.refresh(note)
    return NoteResponse.model_validate(note)


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    note = (
        db.query(Note)
        .filter(Note.id == note_id, Note.user_id == current_user.id)
        .first()
    )
    if note is None:
        raise ResourceNotFoundError("Note not found")
    db.delete(note)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
