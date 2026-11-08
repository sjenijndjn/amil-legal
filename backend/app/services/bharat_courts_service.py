"""Bharat Courts Integration Service for AMIL — Juris Legal Intelligence.

Provides a unified interface for Indian judicial research:
- Historical Archive search (AWS Open Data / DuckDB)
- Live Judgment search (eCourts portal with automated OCR CAPTCHA)
- Precedent caching in PostgreSQL (`legal_judgments`)
- Legal authority verification (Article 141, bench hierarchy, territorial jurisdiction)
- PDF retrieval and on-demand text extraction for Juris RAG
- CC-BY-4.0 data attribution (Dattam Labs & eCourts platform)
"""

from __future__ import annotations

import asyncio
from datetime import date, datetime, timezone
import io
import re
from typing import Any, Dict, List, Optional, Tuple
import uuid

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import ResourceNotFoundError
from app.core.logging import logger
from app.database.base import utcnow
from app.models.legal_judgment import LegalJudgment
from app.services.authority_verification import assess_authority

try:
    import pymupdf as fitz
except Exception:
    try:
        import fitz
    except Exception:
        fitz = None

# CC-BY-4.0 Attribution metadata
BHARAT_COURTS_ATTRIBUTION = {
    "provider": "bharat_courts",
    "dataset": "Indian Court Judgments (AWS Open Data & eCourts)",
    "license": "CC-BY-4.0",
    "license_url": "https://creativecommons.org/licenses/by/4.0/",
    "sources": [
        "Dattam Labs (Open Data Archive)",
        "eCourts Platform (High Courts & Supreme Court of India)",
    ],
    "freshness_policy": (
        "Historical archive updated approximately every two months for the Supreme Court "
        "and quarterly for High Courts. Live portal search queries real-time eCourts records."
    ),
}


class BharatCourtsService:
    """Service layer interfacing with bharat-courts SDK and PostgreSQL cache."""

    def __init__(self) -> None:
        self.enabled = settings.BHARAT_COURTS_ENABLED
        self._judgments_facade = None
        self._archive_client = None

    def _get_judgments_facade(self):
        if self._judgments_facade is None:
            from bharat_courts import Judgments

            self._judgments_facade = Judgments()
        return self._judgments_facade

    def _get_archive_client(self):
        if self._archive_client is None:
            from bharat_courts.archive import ArchiveClient

            self._archive_client = ArchiveClient()
        return self._archive_client

    def _normalize_court_code(self, court: Optional[str]) -> Optional[str]:
        if not court or court.strip().lower() in ("all", "all_courts", ""):
            return None
        c_low = court.strip().lower()
        if "supreme" in c_low or c_low in ("sci", "sc"):
            return "sci"
        if "allahabad" in c_low:
            return "allahabad"
        if "bombay" in c_low:
            return "bombay"
        if "calcutta" in c_low:
            return "calcutta"
        if "delhi" in c_low:
            return "delhi"
        if "madras" in c_low:
            return "madras"
        if "karnataka" in c_low:
            return "karnataka"
        if "kerala" in c_low:
            return "kerala"
        if "punjab" in c_low or "haryana" in c_low:
            return "punjab"
        if "gujarat" in c_low:
            return "gujarat"
        if "rajasthan" in c_low:
            return "rajasthan"
        if "telangana" in c_low:
            return "telangana"
        if "andhra" in c_low:
            return "andhra"
        return c_low

    def _sanitize_text(self, text: Optional[str]) -> str:
        if not text:
            return ""
        # Remove null bytes and non-printable control characters
        cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", text)
        # Prevent prompt injection markers if ingested into RAG
        cleaned = re.sub(r"\[SYSTEM_INSTRUCTION[^\]]*\]", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"<\|im_start\|>|<\|im_end\|>", "", cleaned)
        return cleaned.strip()

    def _judgment_to_dict(
        self,
        j: Any,
        source_type: str = "archive",
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Convert a Bharat Courts SDK Judgment object or LegalJudgment model to normalized dictionary."""
        if isinstance(j, LegalJudgment):
            assessment = assess_authority(
                court=j.court,
                case_title=j.case_title,
                citation=j.citation,
                judges=j.judges,
                bench_str=j.bench_type,
                db=db,
            )
            return {
                "case_id": j.external_case_id,
                "title": j.case_title,
                "court": j.court,
                "citation": j.citation or "",
                "decision_date": j.decision_date.isoformat() if j.decision_date else None,
                "judges": j.judges or [],
                "case_number": j.case_number or "",
                "cnr": j.cnr_number or "",
                "disposal_nature": j.disposal_nature or "",
                "source_type": j.source_type,
                "document_url": j.document_reference,
                "available": True,
                "authority_status": j.authority_status,
                "authority_notes": j.authority_notes or assessment.treatment_notes,
                "bench_type": j.bench_type or assessment.bench_type,
                "petitioner": j.petitioner or "",
                "respondent": j.respondent or "",
                "attribution": {
                    **BHARAT_COURTS_ATTRIBUTION,
                    "retrieval_date": j.source_last_verified_at.isoformat(),
                    "source_type": j.source_type,
                },
            }

        # From bharat_courts.models.Judgment
        title = getattr(j, "title", None) or getattr(j, "case_id", "Indian Court Judgment")
        court_obj = getattr(j, "court", None)
        court_name = (
            getattr(court_obj, "name", None)
            if court_obj
            else getattr(j, "court_name_raw", "Indian Court")
        )
        citation = getattr(j, "citation", None) or ""
        cnr = getattr(j, "cnr", None) or ""
        case_id = getattr(j, "case_id", None) or cnr or citation or str(uuid.uuid4())
        decision_date = getattr(j, "decision_date", None)
        date_str = decision_date.isoformat() if decision_date else None
        judges = getattr(j, "judges", None) or []
        author = getattr(j, "author_judge", None)
        if author and author not in judges:
            judges = [author] + judges
        bench = getattr(j, "bench", None)
        disposal = getattr(j, "disposal_nature", None) or ""
        petitioner = getattr(j, "petitioner", None) or ""
        respondent = getattr(j, "respondent", None) or ""
        pdf_path = getattr(j, "pdf_path", None)
        pdf_exists = bool(getattr(j, "pdf_exists", False)) or bool(pdf_path)

        # Run legal authority assessment
        assessment = assess_authority(
            court=court_name,
            case_title=title,
            citation=citation,
            judges=judges,
            bench_str=bench,
            db=db,
        )

        return {
            "case_id": case_id,
            "title": title,
            "court": court_name,
            "citation": citation,
            "decision_date": date_str,
            "judges": judges,
            "case_number": getattr(j, "description", "") or "",
            "cnr": cnr,
            "disposal_nature": disposal,
            "source_type": getattr(j, "source", source_type),
            "document_url": pdf_path,
            "available": pdf_exists,
            "authority_status": assessment.authority_status,
            "authority_notes": assessment.treatment_notes or assessment.limitation_disclosure,
            "bench_type": assessment.bench_type,
            "petitioner": petitioner,
            "respondent": respondent,
            "attribution": {
                **BHARAT_COURTS_ATTRIBUTION,
                "retrieval_date": datetime.now(timezone.utc).isoformat(),
                "source_type": getattr(j, "source", source_type),
            },
        }

    def _persist_to_cache(
        self,
        db: Session,
        items: List[Dict[str, Any]],
        source_type: str = "archive",
    ) -> List[LegalJudgment]:
        """Persist or update judgments in PostgreSQL `legal_judgments` table to avoid duplicate external queries."""
        persisted: List[LegalJudgment] = []
        for item in items:
            case_id = item["case_id"]
            if not case_id:
                continue

            existing = (
                db.query(LegalJudgment)
                .filter(
                    LegalJudgment.source_provider == "bharat_courts",
                    LegalJudgment.external_case_id == case_id,
                )
                .first()
            )

            d_date = None
            if item.get("decision_date"):
                try:
                    d_date = date.fromisoformat(item["decision_date"])
                except Exception:
                    d_date = None

            if existing:
                existing.source_last_verified_at = utcnow()
                if item.get("citation") and not existing.citation:
                    existing.citation = item["citation"]
                if item.get("document_url") and not existing.document_reference:
                    existing.document_reference = item["document_url"]
                persisted.append(existing)
            else:
                new_entry = LegalJudgment(
                    external_case_id=case_id,
                    case_title=item["title"][:490],
                    court=item["court"][:140],
                    citation=item.get("citation")[:140] if item.get("citation") else None,
                    decision_date=d_date,
                    judges=item.get("judges", []),
                    party_names=[
                        p for p in [item.get("petitioner"), item.get("respondent")] if p
                    ],
                    petitioner=item.get("petitioner")[:340] if item.get("petitioner") else None,
                    respondent=item.get("respondent")[:340] if item.get("respondent") else None,
                    cnr_number=item.get("cnr")[:55] if item.get("cnr") else None,
                    case_number=item.get("case_number")[:140] if item.get("case_number") else None,
                    disposal_nature=item.get("disposal_nature")[:110]
                    if item.get("disposal_nature")
                    else None,
                    source_provider="bharat_courts",
                    source_type=item.get("source_type", source_type),
                    document_reference=item.get("document_url"),
                    source_last_verified_at=utcnow(),
                    authority_status=item.get("authority_status", "PENDING_VERIFICATION"),
                    authority_notes=item.get("authority_notes"),
                    bench_type=item.get("bench_type"),
                )
                db.add(new_entry)
                persisted.append(new_entry)

        try:
            db.commit()
        except Exception as exc:
            db.rollback()
            logger.warning(f"Error persisting judgments to cache: {exc}")
        return persisted

    async def search(
        self,
        *,
        q: Optional[str] = None,
        court: Optional[str] = None,
        judge: Optional[str] = None,
        party: Optional[str] = None,
        citation: Optional[str] = None,
        cnr: Optional[str] = None,
        year: Optional[int] = None,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
        source: str = "archive",
        page: int = 1,
        limit: int = 10,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Unified Indian judgment search supporting historical archive and live full-text portals."""
        if not self.enabled:
            return {
                "success": False,
                "source": "bharat_courts",
                "total": 0,
                "results": [],
                "error": "Bharat Courts integration is disabled via configuration (BHARAT_COURTS_ENABLED=false).",
            }

        safe_limit = min(max(1, limit), settings.BHARAT_COURTS_MAX_LIMIT)
        court_norm = self._normalize_court_code(court)

        # Resolve year parameter (single int or tuple)
        year_param: Optional[int | Tuple[int, int]] = None
        if year:
            year_param = int(year)
        elif year_from and year_to:
            year_param = (int(year_from), int(year_to))
        elif year_from:
            year_param = (int(year_from), date.today().year)
        elif year_to:
            year_param = (1950, int(year_to))

        # Check PostgreSQL cache first for exact matches
        cached_results: List[Dict[str, Any]] = []
        if db is not None:
            c_query = db.query(LegalJudgment).filter(
                LegalJudgment.source_provider == "bharat_courts"
            )
            has_filter = False
            if cnr:
                c_query = c_query.filter(LegalJudgment.cnr_number == cnr.strip())
                has_filter = True
            elif citation:
                c_query = c_query.filter(LegalJudgment.citation.ilike(f"%{citation.strip()}%"))
                has_filter = True
            elif q and not any([court, judge, party, year, year_from, year_to]):
                c_query = c_query.filter(
                    LegalJudgment.case_title.ilike(f"%{q.strip()}%")
                    | LegalJudgment.citation.ilike(f"%{q.strip()}%")
                )
                has_filter = True

            if has_filter:
                db_matches = c_query.limit(safe_limit).all()
                if db_matches:
                    for m in db_matches:
                        cached_results.append(self._judgment_to_dict(m, db=db))

        if cached_results and len(cached_results) >= safe_limit:
            return {
                "success": True,
                "source": "bharat_courts",
                "total": len(cached_results),
                "page": page,
                "limit": safe_limit,
                "results": cached_results,
            }

        # Query external Bharat Courts SDK
        facade = self._get_judgments_facade()

        try:
            async def _run_search():
                if source == "live":
                    try:
                        return await facade.find(
                            text=q or "",
                            source="live",
                            limit=safe_limit,
                        )
                    except Exception as live_err:
                        logger.info(
                            f"Live judgment search returned error or CAPTCHA challenge ({live_err}); falling back to archive."
                        )
                        return await facade.find(
                            text=q,
                            court=court_norm,
                            year=year_param,
                            source="archive",
                            limit=safe_limit,
                        )
                else:
                    return await facade.find(
                        text=q,
                        court=court_norm,
                        year=year_param,
                        judge=judge,
                        party=party,
                        citation=citation,
                        cnr=cnr,
                        source="archive",
                        limit=safe_limit,
                    )

            sdk_judgments = await asyncio.wait_for(
                _run_search(), timeout=settings.BHARAT_COURTS_TIMEOUT_SECONDS
            )

        except asyncio.TimeoutError:
            logger.warning(
                f"Bharat Courts search timed out after {settings.BHARAT_COURTS_TIMEOUT_SECONDS}s"
            )
            # Return cached results if available
            return {
                "success": bool(cached_results),
                "source": "bharat_courts",
                "total": len(cached_results),
                "page": page,
                "limit": safe_limit,
                "results": cached_results,
                "warning": "External Bharat Courts search timed out. Serving local database cache.",
            }
        except Exception as exc:
            logger.error(f"Error querying Bharat Courts SDK: {exc}")
            if cached_results:
                return {
                    "success": True,
                    "source": "bharat_courts",
                    "total": len(cached_results),
                    "page": page,
                    "limit": safe_limit,
                    "results": cached_results,
                    "warning": f"External search unavailable ({str(exc)[:100]}). Returned cached results.",
                }
            return {
                "success": False,
                "source": "bharat_courts",
                "total": 0,
                "page": page,
                "limit": safe_limit,
                "results": [],
                "error": f"Unable to retrieve judgments from Bharat Courts: {str(exc)[:180]}",
            }

        # Normalize results
        normalized: List[Dict[str, Any]] = []
        for j in sdk_judgments:
            normalized.append(self._judgment_to_dict(j, db=db))

        # Persist to PostgreSQL cache
        if db is not None and normalized:
            self._persist_to_cache(db, normalized)

        # Merge with any cached results not already in normalized
        seen_ids = {r["case_id"] for r in normalized}
        for cr in cached_results:
            if cr["case_id"] not in seen_ids:
                normalized.append(cr)
                seen_ids.add(cr["case_id"])

        return {
            "success": True,
            "source": "bharat_courts",
            "total": len(normalized),
            "page": page,
            "limit": safe_limit,
            "results": normalized[:safe_limit],
        }

    async def get_judgment_by_id(
        self, case_id: str, db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """Retrieve judgment details by case ID, CNR, or citation."""
        clean_id = case_id.strip()

        # 1. Check PostgreSQL cache
        if db is not None:
            cached = (
                db.query(LegalJudgment)
                .filter(
                    (LegalJudgment.external_case_id == clean_id)
                    | (LegalJudgment.cnr_number == clean_id)
                    | (LegalJudgment.citation == clean_id)
                )
                .first()
            )
            if cached:
                return self._judgment_to_dict(cached, db=db)

        # 2. Query Bharat Courts SDK
        facade = self._get_judgments_facade()
        try:
            # Try CNR first if format looks like alphanumeric CNR
            is_cnr = bool(re.match(r"^[A-Z]{4}\d{12}$", clean_id, re.IGNORECASE))
            if is_cnr:
                res = await facade.find(cnr=clean_id, source="archive", limit=1)
            else:
                res = await facade.find(text=clean_id, source="archive", limit=1)

            if res:
                dict_res = self._judgment_to_dict(res[0], db=db)
                if db is not None:
                    self._persist_to_cache(db, [dict_res])
                return dict_res
        except Exception as exc:
            logger.warning(f"Error fetching judgment detail from SDK: {exc}")

        raise ResourceNotFoundError(f"Judgment with identifier '{case_id}' not found.")

    async def fetch_pdf(
        self, case_id: str, db: Optional[Session] = None
    ) -> Tuple[bytes, str, str]:
        """Retrieve judgment PDF bytes, filename, and content type safely.

        Enforces size limits and returns (pdf_bytes, filename, 'application/pdf').
        """
        clean_id = case_id.strip()
        facade = self._get_judgments_facade()

        # Check if we have the judgment metadata
        meta = None
        try:
            meta = await self.get_judgment_by_id(clean_id, db=db)
        except Exception:
            pass

        async def _fetch():
            # If we have CNR, fetch using CNR or pass Judgment object
            target = meta.get("cnr") if (meta and meta.get("cnr")) else clean_id
            return await facade.fetch_pdf(target)

        try:
            pdf_bytes = await asyncio.wait_for(
                _fetch(), timeout=settings.BHARAT_COURTS_TIMEOUT_SECONDS
            )
        except asyncio.TimeoutError:
            raise ResourceNotFoundError(
                "PDF retrieval timed out. The archive server did not respond within time limits."
            )
        except Exception as exc:
            logger.error(f"Error fetching PDF for {clean_id}: {exc}")
            raise ResourceNotFoundError(f"Could not retrieve PDF for judgment '{clean_id}': {exc}")

        if not pdf_bytes or not pdf_bytes.startswith(b"%PDF"):
            raise ResourceNotFoundError(
                f"Judgment document for '{clean_id}' is not in a valid PDF format."
            )

        if len(pdf_bytes) > settings.BHARAT_COURTS_MAX_PDF_BYTES:
            raise ResourceNotFoundError(
                f"PDF file exceeds platform size limit of {settings.BHARAT_COURTS_MAX_PDF_BYTES // (1024 * 1024)} MB."
            )

        safe_title = re.sub(r"[^\w\-_]", "_", (meta.get("title") if meta else clean_id)[:50])
        filename = f"{safe_title}.pdf"
        return pdf_bytes, filename, "application/pdf"

    def extract_text_from_pdf(self, pdf_bytes: bytes, max_pages: int = 40) -> str:
        """Extract clean, sanitized text from judgment PDF bytes using PyMuPDF."""
        if not fitz or not pdf_bytes:
            return ""
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            pages_text: List[str] = []
            for i in range(min(len(doc), max_pages)):
                p_text = doc[i].get_text()
                cleaned = self._sanitize_text(p_text)
                if cleaned:
                    pages_text.append(f"--- Page {i + 1} ---\n{cleaned}")
            doc.close()
            return "\n\n".join(pages_text)
        except Exception as exc:
            logger.warning(f"Error extracting text from judgment PDF: {exc}")
            return ""

    def check_health(self) -> Dict[str, Any]:
        """Lightweight health check for Bharat Courts provider.

        Does not perform expensive network requests or CAPTCHA solving.
        """
        try:
            archive = self._get_archive_client()
            cache_info = archive.cache_info()
            archive_healthy = True
            archive_msg = f"Archive cache operational: {cache_info.get('cache_dir')}"
        except Exception as e:
            archive_healthy = False
            archive_msg = str(e)

        return {
            "provider": "bharat_courts",
            "enabled": self.enabled,
            "status": "healthy" if (self.enabled and archive_healthy) else "degraded",
            "archive_ready": archive_healthy,
            "archive_info": archive_msg,
            "live_search_configured": True,
            "timeout_seconds": settings.BHARAT_COURTS_TIMEOUT_SECONDS,
            "max_result_limit": settings.BHARAT_COURTS_MAX_LIMIT,
            "attribution": BHARAT_COURTS_ATTRIBUTION,
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }


bharat_courts_service = BharatCourtsService()
