"""Document Intelligence endpoints: upload, list, detail, analyze, compare, delete."""

from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, Request, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import ResourceNotFoundError
from app.core.security import enforce_rate_limit, get_current_user, record_audit_event
from app.database.init_db import deterministic_embedding
from app.database.session import get_db
from app.documents.analyzer import analyze_document_chunks, compare_two_documents
from app.documents.extractor import extract_document_content
from app.documents.storage import document_storage
from app.models.document import Document, DocumentChunk
from app.models.user import User
from app.schemas.documents import (
    DocumentAnalysisResponse,
    DocumentAnalyzeRequest,
    DocumentChunkResponse,
    DocumentCompareRequest,
    DocumentComparisonResponse,
    DocumentDetailResponse,
    DocumentResponse,
)

router = APIRouter(prefix="/documents", tags=["Document Intelligence"])


def _get_user_document_or_404(
    db: Session, doc_id: uuid.UUID, user_id: uuid.UUID, request: Optional[Request] = None
) -> Document:
    doc = (
        db.query(Document)
        .filter(Document.id == doc_id, Document.user_id == user_id)
        .first()
    )
    if doc is None:
        record_audit_event(
            db,
            user_id=user_id,
            action="UNAUTHORIZED_OR_MISSING_DOCUMENT_ACCESS",
            resource_type="DOCUMENT",
            resource_id=str(doc_id),
            request=request,
        )
        raise ResourceNotFoundError("Document not found")
    return doc


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(enforce_rate_limit("document_upload", settings.RATE_LIMIT_UPLOAD_PER_MINUTE))
    ],
)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    title: Optional[str] = Form(default=None),
    ai_consent_granted: bool = Form(default=True),
    folder_id: Optional[uuid.UUID] = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    file_bytes = await file.read()
    filename = file.filename or "document.txt"

    extraction = extract_document_content(filename, file_bytes)
    storage_key, sha256_hash = document_storage.save_document(
        user_id=current_user.id,
        file_bytes=file_bytes,
        extension=extraction.extension,
    )

    doc_title = (title or "").strip() or filename.rsplit(".", 1)[0]
    document = Document(
        user_id=current_user.id,
        folder_id=folder_id,
        title=doc_title[:255],
        original_filename=filename[:255],
        mime_type=extraction.mime_type,
        file_size_bytes=len(file_bytes),
        sha256_hash=sha256_hash,
        storage_key=storage_key,
        page_count=extraction.page_count,
        ocr_applied=extraction.ocr_applied,
        ai_consent_granted=ai_consent_granted,
        processing_status="READY",
    )
    db.add(document)
    db.flush()

    for ch in extraction.chunks:
        db.add(
            DocumentChunk(
                document_id=document.id,
                user_id=current_user.id,
                chunk_index=ch.chunk_index,
                page_number=ch.page_number,
                section_heading=ch.section_heading,
                content=ch.content,
                embedding=deterministic_embedding(ch.content),
            )
        )
    db.commit()
    db.refresh(document)

    # Pre-compute initial analysis report
    analyze_document_chunks(
        db,
        user=current_user,
        document=document,
        use_external_ai=False,
    )
    db.refresh(document)

    record_audit_event(
        db,
        user_id=current_user.id,
        action="DOCUMENT_UPLOADED",
        resource_type="DOCUMENT",
        resource_id=str(document.id),
        request=request,
        metadata_json={
            "mime_type": document.mime_type,
            "file_size_bytes": document.file_size_bytes,
            "page_count": document.page_count,
            "ai_consent_granted": document.ai_consent_granted,
        },
    )
    return DocumentResponse.model_validate(document)


@router.get("", response_model=List[DocumentResponse])
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[DocumentResponse]:
    docs = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return [DocumentResponse.model_validate(d) for d in docs]


@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document_detail(
    document_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentDetailResponse:
    doc = _get_user_document_or_404(db, document_id, current_user.id, request=request)
    resp = DocumentDetailResponse.model_validate(doc)
    resp.chunks = [DocumentChunkResponse.model_validate(c) for c in doc.chunks]
    return resp


@router.post("/{document_id}/analyze", response_model=DocumentAnalysisResponse)
def analyze_document(
    document_id: uuid.UUID,
    payload: DocumentAnalyzeRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentAnalysisResponse:
    doc = _get_user_document_or_404(db, document_id, current_user.id, request=request)
    result = analyze_document_chunks(
        db,
        user=current_user,
        document=doc,
        question=payload.question,
        ai_consent_override=payload.ai_consent_granted,
        use_external_ai=payload.use_external_ai,
    )
    record_audit_event(
        db,
        user_id=current_user.id,
        action="DOCUMENT_ANALYZED",
        resource_type="DOCUMENT",
        resource_id=str(doc.id),
        request=request,
        metadata_json={"has_question": bool(payload.question)},
    )
    return DocumentAnalysisResponse(**result)


@router.post("/compare", response_model=DocumentComparisonResponse)
def compare_documents(
    payload: DocumentCompareRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentComparisonResponse:
    doc_a = _get_user_document_or_404(db, payload.document_a_id, current_user.id, request=request)
    doc_b = _get_user_document_or_404(db, payload.document_b_id, current_user.id, request=request)
    comparison = compare_two_documents(doc_a, doc_b)
    record_audit_event(
        db,
        user_id=current_user.id,
        action="DOCUMENTS_COMPARED",
        resource_type="DOCUMENT",
        resource_id=f"{doc_a.id}:{doc_b.id}",
        request=request,
    )
    return DocumentComparisonResponse(**comparison)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    doc = _get_user_document_or_404(db, document_id, current_user.id, request=request)
    document_storage.delete_document(doc.storage_key)
    db.delete(doc)
    db.commit()
    record_audit_event(
        db,
        user_id=current_user.id,
        action="DOCUMENT_DELETED",
        resource_type="DOCUMENT",
        resource_id=str(document_id),
        request=request,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
