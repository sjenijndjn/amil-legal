"""Legal Document Intelligence: Summarization, Clause/Risk Extraction, Page-Cited Q&A, and Comparison."""

from __future__ import annotations

import difflib
import re
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.ai.rag_pipeline import cosine_similarity, extract_query_tokens, lexical_match_score
from app.core.exceptions import ConsentRequiredError
from app.database.init_db import deterministic_embedding
from app.models.document import Document, DocumentChunk
from app.models.user import User

DATE_PATTERN = re.compile(
    r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|"
    r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
    r"\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+"
    r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
    r"\s+\d{4})\b",
    re.IGNORECASE,
)

PARTY_PATTERNS = [
    re.compile(r"between\s+([A-Z][A-Za-z0-9\s.,&()\-]{2,70}?)\s+(?:and|AND)\s+([A-Z][A-Za-z0-9\s.,&()\-]{2,70})", re.MULTILINE),
    re.compile(r"\b([A-Z][A-Za-z0-9\s&.,]{2,50}\s+(?:Private Limited|Pvt\.?\s*Ltd\.?|LLP|Limited|Inc\.?|Corporation))\b"),
    re.compile(r"(?:Petitioner|Respondent|Plaintiff|Defendant|Complainant|Accused|Lessor|Lessee|Licensor|Licensee|Vendor|Client)\s*[:\-]\s*([A-Z][A-Za-z0-9\s.,]{2,60})"),
]

RISK_RULES = [
    (
        "UNLIMITED_INDEMNITY",
        ["unlimited liability", "indemnify and hold harmless without limit", "unconditional indemnity"],
        "HIGH",
        "Unlimited or uncapped indemnity exposure detected; consider capping liability under Section 73/74 of the Indian Contract Act, 1872.",
    ),
    (
        "RESTRAINT_OF_TRADE",
        ["non-compete", "restraint of trade", "shall not engage in any competing business"],
        "HIGH",
        "Post-termination non-compete / restraint of trade clause may be void under Section 27 of the Indian Contract Act, 1872.",
    ),
    (
        "UNILATERAL_TERMINATION",
        ["terminate at its sole discretion without notice", "unilateral termination without cause"],
        "MEDIUM",
        "Unilateral termination without cure period or notice creates asymmetrical commercial risk.",
    ),
    (
        "PENALTY_LIQUIDATED_DAMAGES",
        ["by way of penalty", "forfeiture of entire", "liquidated damages of"],
        "MEDIUM",
        "Stipulated penalty is subject to reasonable compensation limits under Section 74 of the Indian Contract Act, 1872.",
    ),
    (
        "ARBITRATION_AND_JURISDICTION",
        ["sole arbitrator appointed by", "unilateral appointment of arbitrator"],
        "HIGH",
        "Unilateral appointment of a sole arbitrator is impermissible under Section 12(5) of the Arbitration and Conciliation Act, 1996 (Perkins Eastman ruling).",
    ),
]


def analyze_document_chunks(
    db: Session,
    *,
    user: User,
    document: Document,
    question: Optional[str] = None,
    ai_consent_override: Optional[bool] = None,
    use_external_ai: bool = False,
) -> Dict[str, Any]:
    """Perform structured legal analysis and optional page-cited Q&A on a user's document."""
    if ai_consent_override is not None:
        document.ai_consent_granted = ai_consent_override
        db.commit()

    profile_consent = user.profile.ai_document_consent if user.profile else True
    effective_consent = bool(document.ai_consent_granted and profile_consent)

    if use_external_ai and not effective_consent:
        raise ConsentRequiredError()

    chunks: List[DocumentChunk] = document.chunks or (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document.id, DocumentChunk.user_id == user.id)
        .order_by(DocumentChunk.chunk_index.asc())
        .all()
    )

    full_text = "\n\n".join(ch.content for ch in chunks)
    lines = [ln.strip() for ln in full_text.splitlines() if ln.strip()]

    # 1. Executive Summary
    first_sentences = re.split(r"(?<=[.!?])\s+", full_text.strip())
    summary_preview = " ".join(first_sentences[:4])[:650]
    executive_summary = (
        f"Document '{document.title}' ({document.page_count} page(s), {len(chunks)} indexed chunk(s)). "
        f"Overview: {summary_preview}"
    )

    # 2. Key Parties & Entities
    parties: List[str] = []
    for pat in PARTY_PATTERNS:
        for match in pat.findall(full_text):
            if isinstance(match, tuple):
                for item in match:
                    clean_item = item.strip(" ,.;:")
                    if clean_item and clean_item not in parties:
                        parties.append(clean_item)
            else:
                clean_item = str(match).strip(" ,.;:")
                if clean_item and clean_item not in parties:
                    parties.append(clean_item)
    if not parties:
        parties = ["Parties as specified in document recitals"]

    # 3. Important Dates
    important_dates = list(dict.fromkeys(DATE_PATTERN.findall(full_text)))[:12]

    # 4. Extracted Clauses
    extracted_clauses: List[Dict[str, Any]] = []
    for ch in chunks:
        heading = ch.section_heading or f"Chunk #{ch.chunk_index + 1} (Page {ch.page_number})"
        extracted_clauses.append(
            {
                "clause_heading": heading,
                "page_number": ch.page_number,
                "chunk_index": ch.chunk_index,
                "excerpt": ch.content[:280],
            }
        )

    # 5. Obligations & Deadlines
    obligations: List[Dict[str, Any]] = []
    for ch in chunks:
        for sent in re.split(r"(?<=[.!?])\s+", ch.content):
            low_s = sent.lower()
            if any(
                kw in low_s
                for kw in ["shall ", "must ", "undertakes to", "obligated to", "within ", "days of"]
            ):
                obligations.append(
                    {
                        "page_number": ch.page_number,
                        "chunk_index": ch.chunk_index,
                        "obligation": sent.strip()[:320],
                    }
                )
                if len(obligations) >= 10:
                    break
        if len(obligations) >= 10:
            break

    # 6. Risky or Unusual Terms
    risks: List[Dict[str, Any]] = []
    for ch in chunks:
        low_c = ch.content.lower()
        for code, triggers, severity, explanation in RISK_RULES:
            if any(trig in low_c for trig in triggers):
                risks.append(
                    {
                        "risk_code": code,
                        "severity": severity,
                        "page_number": ch.page_number,
                        "chunk_index": ch.chunk_index,
                        "explanation": explanation,
                        "excerpt": ch.content[:240],
                    }
                )
    if not risks:
        risks.append(
            {
                "risk_code": "STANDARD_REVIEW_RECOMMENDED",
                "severity": "LOW",
                "page_number": 1,
                "chunk_index": 0,
                "explanation": "No high-severity statutory invalidity triggers (e.g., s. 27 restraint or unilateral arbitration) automatically flagged; verify commercial schedules.",
                "excerpt": lines[0][:200] if lines else "",
            }
        )

    # 7. Document-Scoped Q&A with exact page/chunk citations
    qa_answer: Optional[Dict[str, Any]] = None
    if question and question.strip():
        q_clean = question.strip()
        q_tokens = extract_query_tokens(q_clean)
        q_vec = deterministic_embedding(q_clean)
        scored: List[tuple[float, DocumentChunk]] = []
        for ch in chunks:
            lex = lexical_match_score(q_clean, q_tokens, ch.content)
            vec_sim = cosine_similarity(q_vec, ch.embedding)
            scored.append(((0.65 * lex) + (0.35 * vec_sim), ch))
        scored.sort(key=lambda x: x[0], reverse=True)
        top_chunks = [c for _, c in scored[:3]]
        citations = [
            {
                "page_number": c.page_number,
                "chunk_index": c.chunk_index,
                "section_heading": c.section_heading,
                "excerpt": c.content[:300],
            }
            for c in top_chunks
        ]
        synthesized = " ".join(
            f"[Page {c.page_number}, Chunk #{c.chunk_index + 1}] {c.content[:260]}"
            for c in top_chunks
        )
        qa_answer = {
            "question": q_clean,
            "answer": (
                f"Based on '{document.title}': {synthesized}"
                if top_chunks
                else "No matching content found in the uploaded document."
            ),
            "citations": citations,
        }

    result_payload: Dict[str, Any] = {
        "document_id": document.id,
        "title": document.title,
        "executive_summary": executive_summary,
        "key_parties_and_entities": parties,
        "important_dates": important_dates,
        "extracted_clauses": extracted_clauses[:15],
        "obligations_and_deadlines": obligations,
        "risky_or_unusual_terms": risks,
        "qa_answer": qa_answer,
        "ai_consent_verified": effective_consent,
        "analysis_engine": "AMIL-DocumentIntelligence-v1",
    }

    document.analysis_result = {
        k: (str(v) if k == "document_id" else v) for k, v in result_payload.items()
    }
    db.commit()
    return result_payload


def compare_two_documents(
    doc_a: Document, doc_b: Document
) -> Dict[str, Any]:
    """Compare two user-owned documents and highlight structural clause & obligation deltas."""
    chunks_a = [c.content.strip() for c in doc_a.chunks if c.content.strip()]
    chunks_b = [c.content.strip() for c in doc_b.chunks if c.content.strip()]

    text_a = "\n".join(chunks_a)
    text_b = "\n".join(chunks_b)

    matcher = difflib.SequenceMatcher(None, text_a, text_b)
    similarity_ratio = round(matcher.ratio(), 4)

    sents_a = [
        s.strip()
        for s in re.split(r"(?<=[.!?])\s+|\n+", text_a)
        if len(s.strip()) > 15
    ]
    sents_b = [
        s.strip()
        for s in re.split(r"(?<=[.!?])\s+|\n+", text_b)
        if len(s.strip()) > 15
    ]
    set_a = set(sents_a)
    set_b = set(sents_b)

    added_clauses = [s for s in sents_b if s not in set_a][:15]
    removed_clauses = [s for s in sents_a if s not in set_b][:15]

    obligation_deltas: List[Dict[str, str]] = []
    for s in added_clauses:
        if any(k in s.lower() for k in ["shall", "must", "liable", "indemnify", "pay", "within"]):
            obligation_deltas.append({"change_type": "ADDED_OBLIGATION", "clause": s[:280]})
    for s in removed_clauses:
        if any(k in s.lower() for k in ["shall", "must", "liable", "indemnify", "pay", "within"]):
            obligation_deltas.append({"change_type": "REMOVED_OBLIGATION", "clause": s[:280]})

    summary = (
        f"Comparison between '{doc_a.title}' and '{doc_b.title}' shows a "
        f"{int(similarity_ratio * 100)}% textual similarity, with {len(added_clauses)} added clause segment(s), "
        f"{len(removed_clauses)} removed clause segment(s), and {len(obligation_deltas)} obligation delta(s)."
    )

    return {
        "document_a_id": doc_a.id,
        "document_a_title": doc_a.title,
        "document_b_id": doc_b.id,
        "document_b_title": doc_b.title,
        "similarity_ratio": similarity_ratio,
        "added_clauses": added_clauses,
        "removed_clauses": removed_clauses,
        "obligation_deltas": obligation_deltas,
        "summary_of_differences": summary,
    }
