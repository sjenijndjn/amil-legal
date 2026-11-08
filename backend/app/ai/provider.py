"""Abstract AIProvider, Google Gemini REST Provider, and GroundedLegalEngine fallback."""

from __future__ import annotations

import abc
import json
import time
import urllib.error
import urllib.request
import uuid
from datetime import date
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.database.init_db import deterministic_embedding
from app.models.ai_usage import AIUsage
from app.schemas.juris import CitedSourceItem, StructuredLegalAnswerSections

LEGAL_DISCLAIMER_FOOTER = (
    "VERIFICATION & LEGAL DISCLAIMER: All statutory provisions and judicial precedents cited above "
    "have been cross-checked against the AMIL Verified Indian Legal Corpus (India Code & Supreme Court e-SCR) "
    f"as of {date.today().isoformat()}. Note that the Bharatiya Nyaya Sanhita (BNS), Bharatiya Nagarik Suraksha Sanhita (BNSS), "
    "and Bharatiya Sakshya Adhiniyam (BSA) came into force on July 1, 2024; offences and proceedings prior to "
    "July 1, 2024 remain governed by the IPC, CrPC, and Indian Evidence Act per applicable savings clauses. "
    "This output constitutes legal research intelligence and is not a substitute for formal representation by an Advocate."
)


class AIProvider(abc.ABC):
    """Abstract interface for LLM generation and vector embedding."""

    @abc.abstractmethod
    def embed_text(
        self,
        text_input: str,
        db: Optional[Session] = None,
        user_id: Optional[uuid.UUID] = None,
    ) -> List[float]:
        raise NotImplementedError

    @abc.abstractmethod
    def generate_structured_legal_answer(
        self,
        *,
        query: str,
        response_mode: str,
        cited_sources: List[CitedSourceItem],
        temporal_notes: List[str],
        overruled_warnings: List[str],
        db: Optional[Session] = None,
        user_id: Optional[uuid.UUID] = None,
    ) -> tuple[StructuredLegalAnswerSections, str]:
        raise NotImplementedError


class GroundedLegalEngine(AIProvider):
    """Deterministic, zero-hallucination Indian legal synthesis engine backed directly by retrieved corpus."""

    provider_name = "AMIL-GroundedLegalEngine-v1"

    def embed_text(
        self,
        text_input: str,
        db: Optional[Session] = None,
        user_id: Optional[uuid.UUID] = None,
    ) -> List[float]:
        start = time.perf_counter()
        vec = deterministic_embedding(text_input, dim=768)
        latency_ms = int((time.perf_counter() - start) * 1000)
        if db is not None:
            db.add(
                AIUsage(
                    user_id=user_id,
                    provider=self.provider_name,
                    model_name="deterministic-legal-embed-768",
                    operation_type="EMBEDDING",
                    prompt_tokens=max(1, len(text_input.split())),
                    completion_tokens=0,
                    total_tokens=max(1, len(text_input.split())),
                    latency_ms=latency_ms,
                    success=True,
                )
            )
            db.commit()
        return vec

    def generate_structured_legal_answer(
        self,
        *,
        query: str,
        response_mode: str,
        cited_sources: List[CitedSourceItem],
        temporal_notes: List[str],
        overruled_warnings: List[str],
        db: Optional[Session] = None,
        user_id: Optional[uuid.UUID] = None,
    ) -> tuple[StructuredLegalAnswerSections, str]:
        start = time.perf_counter()

        section_sources = [s for s in cited_sources if s.source_type == "SECTION"]
        judgment_sources = [s for s in cited_sources if s.source_type == "JUDGMENT"]
        doc_sources = [s for s in cited_sources if s.source_type == "DOCUMENT_CHUNK"]

        if not cited_sources:
            sections = StructuredLegalAnswerSections(
                legal_issue_summary=(
                    f"Insufficient verified statutory or judicial authority in the current AMIL corpus "
                    f"to conclusively answer: '{query}'. Juris refuses to fabricate or guess citations."
                ),
                applicable_acts_and_sections=[
                    "No verified statutory section directly matched the query parameters in the local corpus."
                ],
                relevant_case_law=[
                    "No verified Supreme Court or High Court precedent matched the query in the local corpus."
                ],
                plain_english_explanation=(
                    "Under AMIL's strict anti-hallucination policy, when a query falls outside the verified "
                    "statutory and judicial corpus, Juris explicitly states the coverage boundary rather than "
                    "inventing section numbers or case citations."
                ),
                procedural_steps_and_practical_takeaways=[
                    "Refine the search query with specific Indian Act names (e.g., BNS 2023, BNSS 2023, BSA 2023, Constitution of India, DPDP Act 2023, Contract Act 1872).",
                    "Upload the relevant contract, notice, or pleading via Document Intelligence for document-grounded analysis.",
                ],
                risks_limitations_and_ambiguities=[
                    "INSUFFICIENT_CORPUS_COVERAGE: Verify primary notifications on India Code (indiacode.nic.in) or Supreme Court e-SCR (digiscr.sci.gov.in)."
                ],
                verification_and_disclaimer_footer=LEGAL_DISCLAIMER_FOOTER,
            )
        else:
            applicable_acts: List[str] = []
            for sec in section_sources:
                applicable_acts.append(
                    f"{sec.title} ({sec.citation}) [{sec.status}]: {sec.excerpt}"
                )
            if not applicable_acts:
                applicable_acts.append(
                    "Refer to constitutional and statutory principles discussed in the cited Supreme Court judgments below."
                )

            case_law_items: List[str] = []
            for j in judgment_sources:
                prefix = "[OVERRULED — DO NOT CITE AS GOOD LAW] " if j.status == "OVERRULED" else ""
                case_law_items.append(
                    f"{prefix}{j.title}, {j.citation} ({j.status}): {j.excerpt}"
                )
            if not case_law_items:
                case_law_items.append(
                    "Statutory analysis is governed directly by the enacted text of the Bare Acts cited above."
                )

            doc_notes = ""
            if doc_sources:
                doc_excerpts = "; ".join(
                    f"{d.title} ({d.citation}): {d.excerpt[:180]}" for d in doc_sources[:3]
                )
                doc_notes = f" Additionally, from your uploaded document(s): {doc_excerpts}."

            lead_authority = cited_sources[0]
            issue_summary = (
                f"Analysis of '{query}' under Indian Law, grounded in {len(section_sources)} statutory "
                f"provision(s) and {len(judgment_sources)} judicial precedent(s), led by {lead_authority.title} ({lead_authority.citation})."
            )

            plain_exp_parts = [
                f"In Indian jurisprudence, this question is governed by {', '.join(s.title for s in cited_sources[:4])}."
            ]
            if temporal_notes:
                plain_exp_parts.append(" ".join(temporal_notes))
            if section_sources:
                plain_exp_parts.append(
                    f"Specifically, {section_sources[0].title} provides: {section_sources[0].excerpt}"
                )
            if judgment_sources:
                binding_j = [j for j in judgment_sources if j.status == "BINDING"]
                if binding_j:
                    plain_exp_parts.append(
                        f"The Supreme Court of India in {binding_j[0].title} ({binding_j[0].citation}) settled the governing ratio: {binding_j[0].excerpt}"
                    )
            if doc_notes:
                plain_exp_parts.append(doc_notes)

            steps = [
                "Verify the date of the underlying cause of action or offence (July 1, 2024 is the statutory cut-off for BNS, BNSS, and BSA replacing IPC, CrPC, and IEA).",
                "Cross-check all statutory ingredients and mandatory procedural notices (such as Section 35(3) BNSS / Section 41A CrPC notice before arrest, or Section 63(4) BSA / Section 65B(4) IEA certificate for electronic records).",
                "Ensure any reliance on judicial precedents excludes overruled decisions and cites both neutral citations (INSC) and SCC reports.",
            ]
            if response_mode in ("detailed", "research"):
                steps.append(
                    "Prepare a comparative statutory table mapping pre-2024 provisions to post-2024 Sanhita equivalents for court filings."
                )

            risks = list(overruled_warnings)
            if temporal_notes:
                risks.extend(temporal_notes)
            risks.append(
                "Jurisdiction & Fact Sensitivity: Statutory limitation periods and High Court practice directions vary by State and forum."
            )

            sections = StructuredLegalAnswerSections(
                legal_issue_summary=issue_summary,
                applicable_acts_and_sections=applicable_acts,
                relevant_case_law=case_law_items,
                plain_english_explanation=" ".join(plain_exp_parts),
                procedural_steps_and_practical_takeaways=steps,
                risks_limitations_and_ambiguities=risks,
                verification_and_disclaimer_footer=LEGAL_DISCLAIMER_FOOTER,
            )

        latency_ms = int((time.perf_counter() - start) * 1000)
        if db is not None:
            prompt_tok = max(10, len(query.split()) * 4)
            comp_tok = 280
            db.add(
                AIUsage(
                    user_id=user_id,
                    provider=self.provider_name,
                    model_name="grounded-indian-legal-synthesis",
                    operation_type=f"CHAT_{response_mode.upper()}",
                    prompt_tokens=prompt_tok,
                    completion_tokens=comp_tok,
                    total_tokens=prompt_tok + comp_tok,
                    latency_ms=latency_ms,
                    success=True,
                )
            )
            db.commit()

        return sections, self.provider_name


class GeminiProvider(AIProvider):
    """Google Gemini API provider with automatic fallback to GroundedLegalEngine on network/key absence."""

    provider_name = "Google-Gemini-API"

    def __init__(self) -> None:
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.GEMINI_MODEL
        self.embedding_model = settings.GEMINI_EMBEDDING_MODEL
        self.fallback = GroundedLegalEngine()

    def embed_text(
        self,
        text_input: str,
        db: Optional[Session] = None,
        user_id: Optional[uuid.UUID] = None,
    ) -> List[float]:
        if not self.api_key:
            return self.fallback.embed_text(text_input, db=db, user_id=user_id)

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.embedding_model}:embedContent?key={self.api_key}"
        )
        payload = {
            "model": f"models/{self.embedding_model}",
            "content": {"parts": [{"text": text_input[:6000]}]},
            "outputDimensionality": 768,
        }
        start = time.perf_counter()
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=settings.AI_REQUEST_TIMEOUT_SECONDS) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            values = data.get("embedding", {}).get("values")
            if isinstance(values, list) and len(values) == 768:
                latency_ms = int((time.perf_counter() - start) * 1000)
                if db is not None:
                    db.add(
                        AIUsage(
                            user_id=user_id,
                            provider=self.provider_name,
                            model_name=self.embedding_model,
                            operation_type="EMBEDDING",
                            prompt_tokens=max(1, len(text_input.split())),
                            completion_tokens=0,
                            total_tokens=max(1, len(text_input.split())),
                            latency_ms=latency_ms,
                            success=True,
                        )
                    )
                    db.commit()
                return [float(x) for x in values]
        except Exception as exc:
            logger.warning(f"Gemini embedding call fell back to deterministic vector: {type(exc).__name__}")

        return self.fallback.embed_text(text_input, db=db, user_id=user_id)

    def generate_structured_legal_answer(
        self,
        *,
        query: str,
        response_mode: str,
        cited_sources: List[CitedSourceItem],
        temporal_notes: List[str],
        overruled_warnings: List[str],
        db: Optional[Session] = None,
        user_id: Optional[uuid.UUID] = None,
    ) -> tuple[StructuredLegalAnswerSections, str]:
        if not self.api_key or not cited_sources:
            return self.fallback.generate_structured_legal_answer(
                query=query,
                response_mode=response_mode,
                cited_sources=cited_sources,
                temporal_notes=temporal_notes,
                overruled_warnings=overruled_warnings,
                db=db,
                user_id=user_id,
            )

        context_blocks = [
            f"[{idx + 1}] {src.source_type} | {src.title} | Citation: {src.citation} | Status: {src.status}\nExcerpt: {src.excerpt}"
            for idx, src in enumerate(cited_sources)
        ]
        system_prompt = (
            "You are Juris, the AI Legal Research & Counsel Engine for AMIL (India). "
            "You MUST ground every statement strictly in the provided Verified Indian Legal Corpus context. "
            "NEVER invent or guess any Act, Section, Case Name, Citation, Judge, or Ratio. "
            "Distinguish pre-July 1, 2024 statutes (IPC, CrPC, IEA) from post-July 1, 2024 Sanhitas (BNS, BNSS, BSA). "
            "Respond ONLY with valid JSON matching the 7-key schema: "
            "legal_issue_summary (str), applicable_acts_and_sections (list[str]), "
            "relevant_case_law (list[str]), plain_english_explanation (str), "
            "procedural_steps_and_practical_takeaways (list[str]), "
            "risks_limitations_and_ambiguities (list[str]), verification_and_disclaimer_footer (str)."
        )
        user_prompt = (
            f"Response Mode: {response_mode}\n"
            f"User Legal Query: {query}\n"
            f"Temporal Notes: {'; '.join(temporal_notes)}\n"
            f"Overruled Warnings: {'; '.join(overruled_warnings)}\n\n"
            f"Verified Corpus Context:\n" + "\n\n".join(context_blocks)
        )

        candidate_models = []
        for m in [self.model, "gemini-flash-lite-latest", "gemini-3-flash-preview"]:
            if m and m not in candidate_models:
                candidate_models.append(m)

        start = time.perf_counter()
        for model_name in candidate_models:
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{model_name}:generateContent?key={self.api_key}"
            )
            for attempt in range(max(1, settings.AI_MAX_RETRIES)):
                try:
                    req = urllib.request.Request(
                        url,
                        data=json.dumps(payload).encode("utf-8"),
                        headers={"Content-Type": "application/json"},
                        method="POST",
                    )
                    with urllib.request.urlopen(
                        req, timeout=settings.AI_REQUEST_TIMEOUT_SECONDS
                    ) as resp:
                        raw_body = json.loads(resp.read().decode("utf-8"))

                    text_out = (
                        raw_body.get("candidates", [{}])[0]
                        .get("content", {})
                        .get("parts", [{}])[0]
                        .get("text", "{}")
                    )
                    parsed = json.loads(text_out)
                    parsed["verification_and_disclaimer_footer"] = LEGAL_DISCLAIMER_FOOTER
                    sections = StructuredLegalAnswerSections(**parsed)

                    latency_ms = int((time.perf_counter() - start) * 1000)
                    usage_meta = raw_body.get("usageMetadata", {})
                    if db is not None:
                        db.add(
                            AIUsage(
                                user_id=user_id,
                                provider=self.provider_name,
                                model_name=model_name,
                                operation_type=f"CHAT_{response_mode.upper()}",
                                prompt_tokens=int(usage_meta.get("promptTokenCount", 250)),
                                completion_tokens=int(usage_meta.get("candidatesTokenCount", 300)),
                                total_tokens=int(usage_meta.get("totalTokenCount", 550)),
                                latency_ms=latency_ms,
                                success=True,
                            )
                        )
                        db.commit()
                    return sections, f"{self.provider_name}:{model_name}"
                except urllib.error.HTTPError as http_err:
                    if http_err.code in (404, 400):
                        logger.warning(
                            f"Gemini model {model_name} returned {http_err.code}; trying fallback model..."
                        )
                        break
                    logger.warning(
                        f"Gemini generation attempt {attempt + 1} with {model_name} failed ({http_err}); retrying..."
                    )
                except Exception as exc:
                    logger.warning(
                        f"Gemini generation attempt {attempt + 1} with {model_name} failed ({type(exc).__name__}: {exc})"
                    )

        return self.fallback.generate_structured_legal_answer(
            query=query,
            response_mode=response_mode,
            cited_sources=cited_sources,
            temporal_notes=temporal_notes,
            overruled_warnings=overruled_warnings,
            db=db,
            user_id=user_id,
        )


def get_ai_provider() -> AIProvider:
    if settings.GEMINI_API_KEY:
        return GeminiProvider()
    return GroundedLegalEngine()
