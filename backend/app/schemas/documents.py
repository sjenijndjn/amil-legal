"""Pydantic v2 schemas for Document Intelligence (Upload, Extraction, Analysis, Comparison)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class DocumentChunkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    chunk_index: int
    page_number: int
    section_heading: Optional[str] = None
    content: str


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    folder_id: Optional[uuid.UUID] = None
    title: str
    original_filename: str
    mime_type: str
    file_size_bytes: int
    sha256_hash: str
    page_count: int
    ocr_applied: bool
    ai_consent_granted: bool
    processing_status: str
    analysis_result: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime


class DocumentDetailResponse(DocumentResponse):
    chunks: List[DocumentChunkResponse] = []


class DocumentAnalyzeRequest(BaseModel):
    question: Optional[str] = Field(default=None, max_length=2000)
    ai_consent_granted: Optional[bool] = None
    use_external_ai: bool = False


class DocumentAnalysisResponse(BaseModel):
    document_id: uuid.UUID
    title: str
    executive_summary: str
    key_parties_and_entities: List[str]
    important_dates: List[str]
    extracted_clauses: List[Dict[str, Any]]
    obligations_and_deadlines: List[Dict[str, Any]]
    risky_or_unusual_terms: List[Dict[str, Any]]
    qa_answer: Optional[Dict[str, Any]] = None
    ai_consent_verified: bool
    analysis_engine: str


class DocumentCompareRequest(BaseModel):
    document_a_id: uuid.UUID
    document_b_id: uuid.UUID


class DocumentComparisonResponse(BaseModel):
    document_a_id: uuid.UUID
    document_a_title: str
    document_b_id: uuid.UUID
    document_b_title: str
    similarity_ratio: float
    added_clauses: List[str]
    removed_clauses: List[str]
    obligation_deltas: List[Dict[str, str]]
    summary_of_differences: str
