"""Strict Citation Validator and Temporal Statute Transition Analyzer."""

from __future__ import annotations

import re
from typing import Dict, List, Tuple

from sqlalchemy.orm import Session

from app.models.legal_corpus import Judgment, LegalAct, LegalSection
from app.models.legal_judgment import LegalJudgment
from app.schemas.juris import CitedSourceItem

# Mapping between pre-July 1, 2024 statutes and post-July 1, 2024 Sanhitas
CRIMINAL_LAW_TRANSITION_MAP: List[Tuple[List[str], str]] = [
    (
        ["ipc", "indian penal code", "bns", "bharatiya nyaya sanhita", "300", "302", "415", "420", "101", "103", "316", "318"],
        "TEMPORAL STATUTE NOTICE (BNS vs IPC): The Bharatiya Nyaya Sanhita, 2023 (Act 45 of 2023) replaced the Indian Penal Code, 1860 w.e.f. July 1, 2024 (e.g., IPC s. 300/302 Murder -> BNS s. 101/103; IPC s. 405 Criminal Breach of Trust -> BNS s. 316; IPC s. 415/420 Cheating -> BNS s. 318). Under Section 358 BNS, offences committed prior to July 1, 2024 continue to be governed by the IPC.",
    ),
    (
        ["crpc", "criminal procedure", "bnss", "bharatiya nagarik suraksha", "41", "41a", "154", "438", "35", "173", "482", "fir", "arrest", "anticipatory bail"],
        "TEMPORAL STATUTE NOTICE (BNSS vs CrPC): The Bharatiya Nagarik Suraksha Sanhita, 2023 (Act 46 of 2023) replaced the Code of Criminal Procedure, 1973 w.e.f. July 1, 2024 (e.g., CrPC s. 41/41A Arrest & Notice -> BNSS s. 35; CrPC s. 154 FIR -> BNSS s. 173 including Zero FIR & e-FIR; CrPC s. 438 Anticipatory Bail -> BNSS s. 482). Under Section 531 BNSS, pending investigations and trials registered before July 1, 2024 proceed under the CrPC.",
    ),
    (
        ["iea", "evidence act", "bsa", "bharatiya sakshya", "65b", "61", "63", "electronic evidence", "electronic record", "certificate"],
        "TEMPORAL STATUTE NOTICE (BSA vs IEA): The Bharatiya Sakshya Adhiniyam, 2023 (Act 47 of 2023) replaced the Indian Evidence Act, 1872 w.e.f. July 1, 2024. Admissibility of secondary electronic records is now governed by Section 63 of the BSA, 2023 (corresponding to historical Section 65B of the IEA, 1872), requiring a Part A & Part B certificate with cryptographic hash value (SHA-256).",
    ),
]


def detect_temporal_notes(query: str, cited_sources: List[CitedSourceItem]) -> List[str]:
    """Return applicable statutory transition notices for pre/post July 1, 2024 Indian criminal laws."""
    combined_text = (
        query.lower()
        + " "
        + " ".join(f"{s.title} {s.citation} {s.excerpt}".lower() for s in cited_sources)
    )
    notes: List[str] = []
    for keywords, message in CRIMINAL_LAW_TRANSITION_MAP:
        if any( re.search(rf"\b{re.escape(kw)}\b", combined_text) for kw in keywords):
            notes.append(message)
    return notes


def detect_overruled_warnings(cited_sources: List[CitedSourceItem]) -> List[str]:
    """Inspect retrieved judgments and generate explicit warnings if overruled cases are present."""
    warnings: List[str] = []
    for src in cited_sources:
        if src.source_type == "JUDGMENT" and src.status == "OVERRULED":
            warnings.append(
                f"PRECEDENT WARNING: {src.title} ({src.citation}) is marked OVERRULED in the Supreme Court corpus. "
                f"It is included solely for historical context and MUST NOT be cited as binding precedent."
            )
    return warnings


def validate_citations_against_db(
    db: Session, candidate_citations: List[str]
) -> List[Dict[str, str]]:
    """Verify arbitrary citation strings against `legal_sections` and `judgments` tables.

    Any citation not found in the verified database is explicitly flagged as
    `[UNVERIFIED — NOT IN CORPUS]` so fabricated references can never pass silently.
    """
    results: List[Dict[str, str]] = []
    all_judgments = db.query(Judgment).all()
    all_legal_judgments = db.query(LegalJudgment).all()
    all_sections = db.query(LegalSection).join(LegalAct).all()

    for raw_cit in candidate_citations:
        cleaned = raw_cit.strip()
        if not cleaned:
            continue
        low = cleaned.lower()
        matched = False

        for j in all_judgments:
            eq_low = [c.lower() for c in (j.equivalent_citations or [])]
            if (
                j.neutral_citation.lower() in low
                or j.case_title.lower() in low
                or any(eq in low for eq in eq_low)
            ):
                results.append(
                    {
                        "input": cleaned,
                        "status": j.precedent_status,
                        "verified_title": j.case_title,
                        "verified_citation": f"{j.neutral_citation} / {', '.join(j.equivalent_citations)}",
                        "badge": (
                            "[OVERRULED — DO NOT CITE AS GOOD LAW]"
                            if j.precedent_status == "OVERRULED"
                            else "[VERIFIED IN CORPUS]"
                        ),
                    }
                )
                matched = True
                break

        if matched:
            continue

        for lj in all_legal_judgments:
            if (
                (lj.citation and lj.citation.lower() in low)
                or lj.case_title.lower() in low
                or (lj.cnr_number and lj.cnr_number.lower() in low)
            ):
                results.append(
                    {
                        "input": cleaned,
                        "status": lj.authority_status,
                        "verified_title": lj.case_title,
                        "verified_citation": lj.citation or lj.case_title,
                        "badge": (
                            "[OVERRULED — DO NOT CITE AS GOOD LAW]"
                            if lj.authority_status == "OVERRULED"
                            else f"[VERIFIED IN BHARAT COURTS: {lj.authority_status}]"
                        ),
                    }
                )
                matched = True
                break

        if matched:
            continue

        for sec in all_sections:
            act_short = sec.act.short_title.lower()
            sec_num = sec.section_number.lower()
            if (act_short in low or sec.act.title.lower() in low) and sec_num in low:
                results.append(
                    {
                        "input": cleaned,
                        "status": sec.act.status,
                        "verified_title": f"{sec.act.short_title} — Section {sec.section_number} ({sec.section_title})",
                        "verified_citation": f"{sec.act.title} ({sec.act.act_number})",
                        "badge": (
                            "[HISTORICAL STATUTE — CHECK 01-07-2024 SAVINGS]"
                            if sec.act.status == "HISTORICAL"
                            else "[VERIFIED IN CORPUS]"
                        ),
                    }
                )
                matched = True
                break

        if not matched:
            results.append(
                {
                    "input": cleaned,
                    "status": "UNVERIFIED",
                    "verified_title": cleaned,
                    "verified_citation": "NONE",
                    "badge": "[UNVERIFIED — NOT IN CORPUS]",
                }
            )

    return results
