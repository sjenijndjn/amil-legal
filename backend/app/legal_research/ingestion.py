"""Extensible Indian Legal Source Ingestion System.

Supports verified statutory and judicial imports from authorized Indian legal repositories:
- India Code (https://www.indiacode.nic.in)
- Supreme Court of India / e-SCR (https://digiscr.sci.gov.in)
- High Court Official Portals
- eCourts Services (https://ecourts.gov.in)
- Manual Verified Document Imports

Strictly prohibits unauthorized web scraping or fabrication of statutory text.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.ai.provider import get_ai_provider
from app.models.legal_corpus import Judgment, LegalAct, LegalSection, LegalSource


AUTHORIZED_REPOSITORIES: Dict[str, Dict[str, Any]] = {
    "INDIA_CODE": {
        "name": "India Code — Digital Repository of Central & State Acts",
        "source_type": "STATUTE_REPOSITORY",
        "jurisdiction": "India (Central & State)",
        "official_url": "https://www.indiacode.nic.in",
        "is_verified_repository": True,
    },
    "SCI_ESCR": {
        "name": "Supreme Court of India — Digital SCR (e-SCR)",
        "source_type": "JUDICIAL_REPOSITORY",
        "jurisdiction": "Supreme Court of India",
        "official_url": "https://digiscr.sci.gov.in",
        "is_verified_repository": True,
    },
    "ECOURTS": {
        "name": "eCourts Services — National Judicial Data Grid & Case Orders",
        "source_type": "JUDICIAL_PORTAL",
        "jurisdiction": "India (District & High Courts)",
        "official_url": "https://services.ecourts.gov.in",
        "is_verified_repository": True,
    },
    "INDIAN_KANOON_REF": {
        "name": "Indian Kanoon (Permitted Public Citation Cross-Reference)",
        "source_type": "SECONDARY_INDEX",
        "jurisdiction": "India",
        "official_url": "https://indiankanoon.org",
        "is_verified_repository": False,
    },
}


class LegalSourceIngestionService:
    """Ingests verified statutory provisions and judgments with provenance tracking."""

    def ingest_statutory_section(
        self,
        db: Session,
        *,
        act: LegalAct,
        section_number: str,
        section_title: str,
        statutory_text: str,
        part_number: Optional[str] = None,
        chapter_number: Optional[str] = None,
        chapter_title: Optional[str] = None,
        amendment_notes: Optional[str] = None,
        effective_date: Optional[date] = None,
        corresponding_historical_section: Optional[str] = None,
    ) -> LegalSection:
        """Upsert a verified statutory section with semantic embedding."""
        if not statutory_text or not statutory_text.strip():
            raise ValueError("Cannot ingest a statutory section with empty text.")

        provider = get_ai_provider()
        embed_input = f"{act.short_title} Section {section_number} {section_title}: {statutory_text}"
        embedding = provider.embed_text(embed_input)

        existing = (
            db.query(LegalSection)
            .filter(
                LegalSection.act_id == act.id,
                LegalSection.section_number == section_number.strip(),
            )
            .first()
        )
        if existing is not None:
            existing.section_title = section_title.strip()
            existing.statutory_text = statutory_text.strip()
            existing.part_number = part_number
            existing.chapter_number = chapter_number
            existing.chapter_title = chapter_title
            existing.amendment_notes = amendment_notes
            existing.effective_date = effective_date or act.effective_date
            existing.corresponding_historical_section = corresponding_historical_section
            existing.embedding = embedding
            db.add(existing)
            db.commit()
            db.refresh(existing)
            return existing

        section = LegalSection(
            act_id=act.id,
            part_number=part_number,
            chapter_number=chapter_number,
            chapter_title=chapter_title,
            section_number=section_number.strip(),
            section_title=section_title.strip(),
            statutory_text=statutory_text.strip(),
            amendment_notes=amendment_notes,
            effective_date=effective_date or act.effective_date,
            corresponding_historical_section=corresponding_historical_section,
            embedding=embedding,
        )
        db.add(section)
        db.commit()
        db.refresh(section)
        return section

    def ingest_judgment(
        self,
        db: Session,
        *,
        source: LegalSource,
        case_title: str,
        neutral_citation: str,
        court: str,
        decision_date: date,
        subject_matter: str,
        headnote_summary: str,
        ratio_decidendi: str,
        full_text_excerpt: str,
        equivalent_citations: Optional[List[str]] = None,
        bench_type: str = "Division Bench",
        judges: Optional[List[str]] = None,
        legal_issues: Optional[List[str]] = None,
        key_paragraphs: Optional[List[Dict[str, Any]]] = None,
        precedent_status: str = "PENDING_VERIFICATION",
        verification_notes: Optional[str] = None,
        official_source_url: Optional[str] = None,
    ) -> Judgment:
        """Upsert a judgment record, defaulting unverified treatment to PENDING_VERIFICATION."""
        provider = get_ai_provider()
        embed_input = f"{case_title} {neutral_citation} {subject_matter}: {ratio_decidendi}"
        embedding = provider.embed_text(embed_input)

        existing = (
            db.query(Judgment)
            .filter(Judgment.neutral_citation == neutral_citation.strip())
            .first()
        )
        if existing is not None:
            existing.case_title = case_title.strip()
            existing.headnote_summary = headnote_summary.strip()
            existing.ratio_decidendi = ratio_decidendi.strip()
            existing.full_text_excerpt = full_text_excerpt.strip()
            existing.precedent_status = precedent_status
            existing.verification_notes = verification_notes
            existing.embedding = embedding
            db.add(existing)
            db.commit()
            db.refresh(existing)
            return existing

        judgment = Judgment(
            source_id=source.id,
            case_title=case_title.strip(),
            neutral_citation=neutral_citation.strip(),
            equivalent_citations=equivalent_citations or [],
            court=court,
            bench_type=bench_type,
            judges=judges or [],
            decision_date=decision_date,
            subject_matter=subject_matter,
            legal_issues=legal_issues or [],
            headnote_summary=headnote_summary.strip(),
            ratio_decidendi=ratio_decidendi.strip(),
            key_paragraphs=key_paragraphs or [],
            full_text_excerpt=full_text_excerpt.strip(),
            precedent_status=precedent_status,
            verification_notes=verification_notes
            or f"Ingested on {datetime.now(timezone.utc).date().isoformat()}; subsequent treatment check required before relying as good law.",
            official_source_url=official_source_url or source.official_url,
            embedding=embedding,
        )
        db.add(judgment)
        db.commit()
        db.refresh(judgment)
        return judgment


ingestion_service = LegalSourceIngestionService()
