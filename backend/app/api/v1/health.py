"""Health and readiness endpoints for AMIL Legal Intelligence Platform."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import get_db
from app.models.legal_corpus import Judgment, LegalAct, LegalSection

router = APIRouter(tags=["System & Health"])


@router.get("/health")
def api_v1_health(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Return service health, database connectivity, and legal corpus counts."""
    acts_count = db.query(LegalAct).count()
    sections_count = db.query(LegalSection).count()
    judgments_count = db.query(Judgment).count()

    return {
        "status": "healthy",
        "brand": settings.APP_BRAND_NAME,
        "subtitle": settings.APP_SUBTITLE,
        "environment": settings.ENVIRONMENT,
        "database": {
            "connected": True,
            "acts_seeded": acts_count,
            "sections_seeded": sections_count,
            "judgments_seeded": judgments_count,
        },
        "ai": {
            "provider": "gemini" if settings.has_gemini_key else "grounded_legal_engine",
            "model": settings.GEMINI_MODEL,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
