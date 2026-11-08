"""Legal Authority Verification Engine for Indian Judicial Precedents.

Applies Indian constitutional jurisprudence (Article 141, High Court territorial
jurisdiction, bench strength hierarchy, and precedent treatment analysis).
Kept decoupled from data providers so multiple legal data sources can use it.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.legal_corpus import Citation, Judgment


class AuthorityStatus:
    BINDING = "BINDING"
    PERSUASIVE = "PERSUASIVE"
    OVERRULED = "OVERRULED"
    DISTINGUISHED = "DISTINGUISHED"
    REVERSED = "REVERSED"
    STAYED = "STAYED"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"


@dataclass
class AuthorityAssessment:
    authority_status: str
    bench_strength: Optional[int]
    bench_type: Optional[str]
    is_supreme_court: bool
    territorial_jurisdiction: Optional[str]
    binding_scope: str
    subsequent_treatment_verified: bool
    limitation_disclosure: str
    treatment_notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "authority_status": self.authority_status,
            "bench_strength": self.bench_strength,
            "bench_type": self.bench_type,
            "is_supreme_court": self.is_supreme_court,
            "territorial_jurisdiction": self.territorial_jurisdiction,
            "binding_scope": self.binding_scope,
            "subsequent_treatment_verified": self.subsequent_treatment_verified,
            "limitation_disclosure": self.limitation_disclosure,
            "treatment_notes": self.treatment_notes,
        }


def _infer_bench_strength(
    judges: Optional[List[str]], bench_str: Optional[str]
) -> tuple[Optional[int], Optional[str]]:
    """Infer bench strength and category (Single, Division, Full, Constitution Bench)."""
    count: Optional[int] = None
    if judges and len(judges) > 0:
        count = len(judges)
    elif bench_str:
        # Check numbers or common terms in bench description
        match = re.search(r"(\d+)\s*(?:judge|judges|member)", bench_str, re.IGNORECASE)
        if match:
            count = int(match.group(1))

    if count is None:
        if bench_str:
            b_low = bench_str.lower()
            if "single" in b_low:
                count = 1
            elif "division" in b_low:
                count = 2
            elif "full" in b_low:
                count = 3
            elif "constitution" in b_low:
                count = 5

    bench_type: Optional[str] = None
    if count == 1:
        bench_type = "Single Judge Bench"
    elif count == 2:
        bench_type = "Division Bench"
    elif count == 3:
        bench_type = "Full Bench"
    elif count and count >= 5:
        bench_type = f"Constitution Bench ({count} Judges)"
    elif bench_str:
        bench_type = bench_str

    return count, bench_type


def _is_sc(court_name: Optional[str]) -> bool:
    if not court_name:
        return False
    cn = court_name.lower()
    return "supreme court" in cn or cn == "sci" or "apex court" in cn or "insc" in cn


def _infer_hc_territory(court_name: Optional[str]) -> Optional[str]:
    if not court_name or _is_sc(court_name):
        return None
    cn = court_name.lower()
    if "allahabad" in cn:
        return "State of Uttar Pradesh"
    if "bombay" in cn:
        return "States of Maharashtra & Goa, UTs of Dadra and Nagar Haveli & Daman and Diu"
    if "delhi" in cn:
        return "National Capital Territory of Delhi"
    if "madras" in cn:
        return "State of Tamil Nadu & UT of Puducherry"
    if "calcutta" in cn:
        return "State of West Bengal & UT of Andaman and Nicobar Islands"
    if "karnataka" in cn:
        return "State of Karnataka"
    if "kerala" in cn:
        return "State of Kerala & UT of Lakshadweep"
    if "punjab" in cn or "haryana" in cn:
        return "States of Punjab & Haryana, UT of Chandigarh"
    if "gujarat" in cn:
        return "State of Gujarat"
    if "rajasthan" in cn:
        return "State of Rajasthan"
    if "madhya pradesh" in cn:
        return "State of Madhya Pradesh"
    if "telangana" in cn:
        return "State of Telangana"
    if "andhra" in cn:
        return "State of Andhra Pradesh"
    if "gauhati" in cn:
        return "States of Assam, Nagaland, Mizoram & Arunachal Pradesh"
    return "Territorial State Jurisdiction"


def assess_authority(
    *,
    court: Optional[str],
    case_title: Optional[str] = None,
    citation: Optional[str] = None,
    judges: Optional[List[str]] = None,
    bench_str: Optional[str] = None,
    db: Optional[Session] = None,
) -> AuthorityAssessment:
    """Evaluate legal authority status of a judgment adhering strictly to Indian jurisprudence.

    Rules:
    1. Do not infer overruling or reversal without verified subsequent authority.
    2. Supreme Court decisions: Art. 141 makes ratio decidendi binding on all Indian courts,
       provided subsequent treatment is checked.
    3. High Court decisions: Binding on subordinate courts within territorial state jurisdiction;
       persuasive for other High Courts and tribunals outside state jurisdiction.
    4. Record bench strength where available.
    5. Treat unverified subsequent treatment as PENDING_VERIFICATION with explicit disclosure.
    """
    is_supreme = _is_sc(court)
    bench_strength, bench_type = _infer_bench_strength(judges, bench_str)
    territory = _infer_hc_territory(court) if not is_supreme else None

    # Step 1: Check verified local citation database for subsequent judicial treatment
    treatment_from_db: Optional[str] = None
    treatment_notes: Optional[str] = None

    if db is not None and (citation or case_title):
        # Check judgments table
        query_j = db.query(Judgment)
        match_j = None
        if citation:
            match_j = query_j.filter(Judgment.neutral_citation.ilike(citation.strip())).first()
        if not match_j and case_title:
            match_j = query_j.filter(Judgment.case_title.ilike(case_title.strip())).first()

        if match_j:
            treatment_from_db = match_j.precedent_status
            treatment_notes = match_j.verification_notes

        # Check citations table for subsequent treatment (overruled / distinguished / relied upon)
        if not treatment_from_db and citation:
            cit_record = (
                db.query(Citation)
                .filter(Citation.citation_text.ilike(f"%{citation.strip()}%"))
                .first()
            )
            if cit_record:
                if cit_record.treatment_type.upper() == "OVERRULED":
                    treatment_from_db = AuthorityStatus.OVERRULED
                    treatment_notes = f"Marked OVERRULED in citation graph: {cit_record.context_excerpt[:200]}"
                elif cit_record.treatment_type.upper() == "DISTINGUISHED":
                    treatment_from_db = AuthorityStatus.DISTINGUISHED
                    treatment_notes = f"Distinguished in subsequent judgment: {cit_record.context_excerpt[:200]}"

    # Step 2: Handle explicit subsequent treatment if verified
    if treatment_from_db == AuthorityStatus.OVERRULED:
        return AuthorityAssessment(
            authority_status=AuthorityStatus.OVERRULED,
            bench_strength=bench_strength,
            bench_type=bench_type,
            is_supreme_court=is_supreme,
            territorial_jurisdiction=territory,
            binding_scope="NOT BINDING — Overruled by subsequent larger bench / statutory amendment.",
            subsequent_treatment_verified=True,
            limitation_disclosure="Verified subsequent judicial authority confirms this precedent has been OVERRULED. Cite only for historical context.",
            treatment_notes=treatment_notes,
        )

    if treatment_from_db == AuthorityStatus.DISTINGUISHED:
        return AuthorityAssessment(
            authority_status=AuthorityStatus.DISTINGUISHED,
            bench_strength=bench_strength,
            bench_type=bench_type,
            is_supreme_court=is_supreme,
            territorial_jurisdiction=territory,
            binding_scope="Distinguished on facts/law by subsequent court.",
            subsequent_treatment_verified=True,
            limitation_disclosure="Verified subsequent authority has distinguished this ruling on material facts or statutory interpretation.",
            treatment_notes=treatment_notes,
        )

    # Step 3: When no explicit treatment is recorded in local database:
    # Rule 5 & 6: Do not treat missing information as proof that a judgment remains good law.
    # Mark unverified decisions as PENDING_VERIFICATION.
    if treatment_from_db == "BINDING":
        status = AuthorityStatus.BINDING
        verified = True
        disclosure = "Verified good law in Supreme Court e-SCR legal corpus."
    else:
        status = AuthorityStatus.PENDING_VERIFICATION
        verified = False
        disclosure = (
            "Subsequent judicial treatment (overruled/distinguished/stayed) not confirmed "
            "in local citation graph. Verify current standing via latest e-SCR citator before citing in court."
        )

    if is_supreme:
        binding_scope = (
            "Ratio decidendi is binding on all courts within India (Article 141 of the Constitution), "
            "subject to subsequent larger bench verification."
        )
    else:
        binding_scope = (
            f"Binding on all subordinate courts within {territory or 'territorial jurisdiction'}; "
            "persuasive authority in other High Courts and external tribunals."
        )

    return AuthorityAssessment(
        authority_status=status,
        bench_strength=bench_strength,
        bench_type=bench_type,
        is_supreme_court=is_supreme,
        territorial_jurisdiction=territory,
        binding_scope=binding_scope,
        subsequent_treatment_verified=verified,
        limitation_disclosure=disclosure,
        treatment_notes=treatment_notes,
    )
