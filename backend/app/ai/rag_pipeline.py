"""Hybrid Legal RAG Pipeline (Vector Cosine + Lexical Keyword/Citation + RRF Fusion)."""

from __future__ import annotations

import math
import re
import uuid
from datetime import date
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.ai.citation_validator import detect_overruled_warnings, detect_temporal_notes
from app.ai.provider import get_ai_provider
from app.core.config import settings
from app.core.logging import logger
from app.models.document import Document, DocumentChunk
from app.models.legal_corpus import Judgment, LegalAct, LegalSection
from app.models.legal_judgment import LegalJudgment
from app.schemas.juris import CitedSourceItem, StructuredLegalAnswerSections

STOPWORDS = {
    "what",
    "when",
    "where",
    "which",
    "who",
    "whom",
    "whose",
    "why",
    "how",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "the",
    "and",
    "for",
    "with",
    "under",
    "about",
    "between",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "from",
    "up",
    "down",
    "in",
    "out",
    "on",
    "off",
    "over",
    "again",
    "further",
    "then",
    "once",
    "explain",
    "tell",
    "me",
    "please",
    "india",
    "indian",
    "law",
}


def cosine_similarity(vec_a: Optional[List[float]], vec_b: Optional[List[float]]) -> float:
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return max(0.0, min(1.0, dot / (norm_a * norm_b)))


def extract_query_tokens(query: str) -> List[str]:
    raw_tokens = re.findall(r"[a-zA-Z0-9]+", query.lower())
    return [t for t in raw_tokens if len(t) >= 2 and t not in STOPWORDS]


def lexical_match_score(query: str, query_tokens: List[str], candidate_text: str) -> float:
    if not query_tokens:
        return 0.0
    cand_low = candidate_text.lower()
    matched = 0.0
    for tok in query_tokens:
        if re.search(rf"\b{re.escape(tok)}\b", cand_low):
            matched += 1.0
        elif tok in cand_low:
            matched += 0.5
    # Boost exact phrase or section/citation pattern hits
    if query.strip().lower() in cand_low and len(query.strip()) > 4:
        matched += 2.0
    return matched / max(1.0, float(len(query_tokens)))


def format_markdown_from_sections(
    sections: StructuredLegalAnswerSections,
    cited_sources: List[CitedSourceItem],
) -> str:
    """Render the 7-part structured legal answer into clean Markdown for chat display & export."""
    lines = [
        "### 1. Legal Issue Summary",
        sections.legal_issue_summary,
        "",
        "### 2. Applicable Acts & Sections",
    ]
    for item in sections.applicable_acts_and_sections:
        lines.append(f"- {item}")

    lines.extend(["", "### 3. Relevant Supreme Court / High Court Case Law"])
    for item in sections.relevant_case_law:
        lines.append(f"- {item}")

    lines.extend(
        [
            "",
            "### 4. Plain-English Legal Explanation",
            sections.plain_english_explanation,
            "",
            "### 5. Procedural Steps & Practical Takeaways",
        ]
    )
    for idx, step in enumerate(sections.procedural_steps_and_practical_takeaways, start=1):
        lines.append(f"{idx}. {step}")

    lines.extend(["", "### 6. Risks, Limitations & Ambiguities"])
    for risk in sections.risks_limitations_and_ambiguities:
        lines.append(f"- {risk}")

    lines.extend(
        [
            "",
            "### 7. Verification & Legal Disclaimer",
            f"_{sections.verification_and_disclaimer_footer}_",
        ]
    )
    return "\n".join(lines)


def run_juris_rag_pipeline(
    db: Session,
    *,
    user_id: uuid.UUID,
    query: str,
    response_mode: str = "standard",
    document_ids: Optional[List[uuid.UUID]] = None,
) -> Dict[str, object]:
    """Execute hybrid retrieval (Vector + Lexical + RRF), validate citations, and synthesize 7-part answer."""
    provider = get_ai_provider()
    query_vec = provider.embed_text(query, db=db, user_id=user_id)
    query_tokens = extract_query_tokens(query)

    # 1. Score statutory sections
    all_sections = db.query(LegalSection).join(LegalAct).all()
    scored_sections: List[Tuple[float, LegalSection]] = []
    for sec in all_sections:
        cand_str = (
            f"{sec.act.title} {sec.act.short_title} Section {sec.section_number} "
            f"{sec.section_title} {sec.statutory_text} {sec.corresponding_historical_section or ''} "
            f"{sec.act.subject_category}"
        )
        lex = lexical_match_score(query, query_tokens, cand_str)
        vec_sim = cosine_similarity(query_vec, sec.embedding)
        # Hybrid RRF-inspired score combining lexical precision and vector similarity
        hybrid = (0.65 * lex) + (0.35 * vec_sim)
        if lex > 0.12 or vec_sim > 0.22:
            scored_sections.append((hybrid, sec))

    scored_sections.sort(key=lambda x: x[0], reverse=True)

    # 2. Score Supreme Court / High Court judgments (seed corpus + cached Bharat Courts)
    all_judgments = db.query(Judgment).all()
    all_cached_legal = db.query(LegalJudgment).all()
    scored_judgments: List[Tuple[float, Any]] = []

    for j in all_judgments:
        cand_str = (
            f"{j.case_title} {j.neutral_citation} {' '.join(j.equivalent_citations)} "
            f"{j.subject_matter} {j.headnote_summary} {j.ratio_decidendi}"
        )
        lex = lexical_match_score(query, query_tokens, cand_str)
        vec_sim = cosine_similarity(query_vec, j.embedding)
        hybrid = (0.65 * lex) + (0.35 * vec_sim)
        if lex > 0.12 or vec_sim > 0.22:
            scored_judgments.append((hybrid, j))

    for lj in all_cached_legal:
        cand_str = (
            f"{lj.case_title} {lj.court} {lj.citation or ''} {' '.join(lj.judges)} "
            f"{lj.headnote_summary or ''} {lj.ratio_decidendi or ''} {lj.extracted_text or ''}"
        )
        lex = lexical_match_score(query, query_tokens, cand_str)
        vec_sim = cosine_similarity(query_vec, lj.embedding)
        hybrid = (0.65 * lex) + (0.35 * vec_sim)
        if lex > 0.12 or vec_sim > 0.22:
            scored_judgments.append((hybrid, lj))

    # On-demand Bharat Courts retrieval for judicial research if coverage is thin
    if (
        settings.BHARAT_COURTS_ENABLED
        and settings.ENVIRONMENT.lower() != "test"
        and (len(scored_judgments) < 2 or (scored_judgments and scored_judgments[0][0] < 0.35))
    ):
        from app.services.bharat_courts_service import bharat_courts_service

        def _exec_search():
            try:
                import asyncio
                return asyncio.run(
                    bharat_courts_service.search(q=query[:120], source="archive", limit=3, db=db)
                )
            except Exception as e:
                logger.info(f"On-demand Bharat Courts retrieval note: {e}")
                return {"results": []}

        try:
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                search_res = pool.submit(_exec_search).result(
                    timeout=settings.BHARAT_COURTS_TIMEOUT_SECONDS
                )
                for r in search_res.get("results", []):
                    c_id = r.get("case_id")
                    if not c_id:
                        continue
                    db_entry = (
                        db.query(LegalJudgment)
                        .filter(LegalJudgment.external_case_id == c_id)
                        .first()
                    )
                    if db_entry:
                        if db_entry.embedding is None:
                            embed_text = (
                                f"{db_entry.case_title} {db_entry.court} {db_entry.citation or ''} "
                                f"{db_entry.ratio_decidendi or db_entry.headnote_summary or ''}"
                            )
                            db_entry.embedding = provider.embed_text(
                                embed_text, db=db, user_id=user_id
                            )
                            db.commit()
                        cand_str = (
                            f"{db_entry.case_title} {db_entry.court} {db_entry.citation or ''} "
                            f"{db_entry.ratio_decidendi or ''}"
                        )
                        lex = lexical_match_score(query, query_tokens, cand_str)
                        vec_sim = cosine_similarity(query_vec, db_entry.embedding)
                        hybrid = (0.65 * lex) + (0.35 * vec_sim)
                        if not any(sj[1] == db_entry for sj in scored_judgments):
                            scored_judgments.append((hybrid, db_entry))
        except Exception as search_err:
            logger.warning(f"On-demand Bharat Courts retrieval skipped: {search_err}")

    scored_judgments.sort(key=lambda x: x[0], reverse=True)

    # 3. Optional user-uploaded document chunks (strictly scoped to user_id)
    doc_citations: List[CitedSourceItem] = []
    if document_ids:
        chunks = (
            db.query(DocumentChunk)
            .join(Document, Document.id == DocumentChunk.document_id)
            .filter(
                DocumentChunk.user_id == user_id,
                DocumentChunk.document_id.in_(document_ids),
            )
            .all()
        )
        scored_chunks: List[Tuple[float, DocumentChunk]] = []
        for ch in chunks:
            lex = lexical_match_score(query, query_tokens, ch.content)
            vec_sim = cosine_similarity(query_vec, ch.embedding)
            scored_chunks.append(((0.6 * lex) + (0.4 * vec_sim), ch))
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        for _, ch in scored_chunks[:3]:
            doc_citations.append(
                CitedSourceItem(
                    source_type="DOCUMENT_CHUNK",
                    id=str(ch.id),
                    title=f"Uploaded Document: {ch.document.title}",
                    citation=f"Page {ch.page_number}, Chunk #{ch.chunk_index + 1}",
                    status="USER_DOCUMENT",
                    excerpt=ch.content[:350],
                    effective_or_decision_date=ch.document.created_at.date().isoformat(),
                    official_url=None,
                )
            )

    top_k = 2 if response_mode == "short" else (5 if response_mode in ("detailed", "research") else 3)

    cited_sources: List[CitedSourceItem] = []
    for _, sec in scored_sections[:top_k]:
        hist_note = (
            f" [Historical link: {sec.corresponding_historical_section}]"
            if sec.corresponding_historical_section
            else ""
        )
        cited_sources.append(
            CitedSourceItem(
                source_type="SECTION",
                id=str(sec.id),
                title=f"{sec.act.short_title} — Section {sec.section_number}: {sec.section_title}",
                citation=f"{sec.act.title} ({sec.act.act_number})",
                status="VERIFIED" if sec.act.status == "CURRENT" else "HISTORICAL",
                excerpt=f"{sec.statutory_text[:360]}{hist_note}",
                effective_or_decision_date=(
                    sec.effective_date.isoformat() if sec.effective_date else None
                ),
                official_url="https://www.indiacode.nic.in",
            )
        )

    for _, j in scored_judgments[:top_k]:
        if isinstance(j, LegalJudgment):
            cited_sources.append(
                CitedSourceItem(
                    source_type="JUDGMENT",
                    id=str(j.id),
                    title=f"{j.case_title} ({j.court})",
                    citation=j.citation or j.external_case_id,
                    status=j.authority_status,
                    excerpt=(j.ratio_decidendi or j.headnote_summary or j.case_title)[:380],
                    effective_or_decision_date=(
                        j.decision_date.isoformat() if j.decision_date else None
                    ),
                    official_url=f"/api/v1/legal-research/judgments/{j.external_case_id}",
                )
            )
        else:
            eq_str = ", ".join(j.equivalent_citations[:2])
            cited_sources.append(
                CitedSourceItem(
                    source_type="JUDGMENT",
                    id=str(j.id),
                    title=j.case_title,
                    citation=f"{j.neutral_citation} ({eq_str})" if eq_str else j.neutral_citation,
                    status=j.precedent_status,
                    excerpt=j.ratio_decidendi[:380],
                    effective_or_decision_date=j.decision_date.isoformat(),
                    official_url=j.official_source_url,
                )
            )

    cited_sources.extend(doc_citations)

    # Calculate confidence & coverage status
    if not cited_sources:
        confidence_score = 0.15
        coverage_status = "INSUFFICIENT_CORPUS_COVERAGE"
    else:
        best_sec = scored_sections[0][0] if scored_sections else 0.0
        best_judg = scored_judgments[0][0] if scored_judgments else 0.0
        raw_conf = max(best_sec, best_judg, 0.55 if doc_citations else 0.0)
        confidence_score = round(min(0.98, max(0.68, raw_conf + 0.35)), 2)
        coverage_status = (
            "VERIFIED_CORPUS_GROUNDED"
            if len(cited_sources) >= 2
            else "PARTIAL_CORPUS_COVERAGE"
        )

    temporal_notes = detect_temporal_notes(query, cited_sources)
    overruled_warnings = detect_overruled_warnings(cited_sources)

    structured_sections, provider_used = provider.generate_structured_legal_answer(
        query=query,
        response_mode=response_mode,
        cited_sources=cited_sources,
        temporal_notes=temporal_notes,
        overruled_warnings=overruled_warnings,
        db=db,
        user_id=user_id,
    )

    markdown_content = format_markdown_from_sections(structured_sections, cited_sources)

    return {
        "content": markdown_content,
        "structured_sections": structured_sections,
        "cited_sources": cited_sources,
        "confidence_score": confidence_score,
        "coverage_status": coverage_status,
        "verification_date": date.today().isoformat(),
        "ai_provider_used": provider_used,
    }
