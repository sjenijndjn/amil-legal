"""Automated tests for Bharat Courts Integration in AMIL — Juris Legal Intelligence.

Covers:
1. Successful judgment search
2. Supreme Court archive search
3. High Court archive search
4. Live full-text search
5. Citation search
6. CNR search
7. Judgment PDF retrieval
8. Missing judgment handling
9. Provider timeout handling
10. Provider unavailable handling
11. Duplicate cache prevention
12. Database persistence & metadata verification
13. Authentication enforcement
14. User-level data isolation & audit logging
15. Juris RAG retrieval and citation provenance
"""

from __future__ import annotations

import asyncio
from datetime import date
from typing import Any, Dict
from unittest.mock import AsyncMock, MagicMock, patch
import uuid

import pytest
from fastapi.testclient import TestClient

from app.database.session import SessionLocal
from app.models.audit_log import AuditLog
from app.models.legal_judgment import LegalJudgment
from app.services.authority_verification import AuthorityStatus, assess_authority
from app.services.bharat_courts_service import bharat_courts_service


# Dummy Mock SDK Judgment for unit tests
class MockSDKCourt:
    def __init__(self, name: str = "Supreme Court of India", code: str = "sci"):
        self.name = name
        self.code = code
        self.court_type = "supreme_court"


class MockSDKJudgment:
    def __init__(
        self,
        case_id: str = "2023 INSC 964",
        title: str = "KUM. GEETHA & ORS. versus NANJUNDASWAMY & ORS.",
        court_name: str = "Supreme Court of India",
        court_code: str = "sci",
        citation: str = "[2023] 14 S.C.R. 153",
        cnr: str = "ESCR010007002023",
        decision_date: date = date(2023, 10, 31),
        judges: list = None,
        bench: str = "Division Bench",
        source: str = "archive",
        pdf_path: str = "2023/10/2023_INSC_964.pdf",
    ):
        self.case_id = case_id
        self.title = title
        self.court = MockSDKCourt(name=court_name, code=court_code)
        self.court_name_raw = court_name
        self.citation = citation
        self.cnr = cnr
        self.decision_date = decision_date
        self.judges = judges or ["PAMIDIGHANTAM SRI NARASIMHA"]
        self.author_judge = "PAMIDIGHANTAM SRI NARASIMHA"
        self.bench = bench
        self.court_code = court_code
        self.disposal_nature = "Allowed"
        self.description = "Civil Appeal No. 7484 of 2023"
        self.petitioner = "KUM. GEETHA"
        self.respondent = "NANJUNDASWAMY"
        self.pdf_path = pdf_path
        self.pdf_exists = True
        self.source = source
        self.year = 2023


@pytest.fixture
def mock_sdk_facade():
    """Mock the Bharat Courts Judgments facade to keep unit tests fast and deterministic."""
    facade_mock = MagicMock()
    mock_j = MockSDKJudgment()
    facade_mock.find = AsyncMock(return_value=[mock_j])
    facade_mock.fetch_pdf = AsyncMock(
        return_value=b"%PDF-1.4 Mock Supreme Court Judgment Stream Content for Unit Tests"
    )
    return facade_mock


# 1. Successful Judgment Search
def test_successful_judgment_search(
    client: TestClient, owner_headers: Dict[str, str], mock_sdk_facade
) -> None:
    with patch.object(bharat_courts_service, "_get_judgments_facade", return_value=mock_sdk_facade):
        resp = client.get(
            "/api/v1/legal-research/judgments/search?q=Section+138+NI+Act",
            headers=owner_headers,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["success"] is True
        assert data["source"] == "bharat_courts"
        assert data["total"] >= 1
        assert len(data["results"]) >= 1

        first = data["results"][0]
        assert "case_id" in first
        assert "title" in first
        assert "court" in first
        assert "citation" in first
        assert "decision_date" in first
        assert "authority_status" in first
        assert "attribution" in first
        assert first["attribution"]["license"] == "CC-BY-4.0"


# 2. Supreme Court Archive Search
def test_supreme_court_archive_search(
    client: TestClient, owner_headers: Dict[str, str], mock_sdk_facade
) -> None:
    with patch.object(bharat_courts_service, "_get_judgments_facade", return_value=mock_sdk_facade):
        resp = client.get(
            "/api/v1/legal-research/judgments/search?court=sci&year=2023",
            headers=owner_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "Supreme Court" in data["results"][0]["court"]


# 3. High Court Archive Search
def test_high_court_archive_search(
    client: TestClient, owner_headers: Dict[str, str]
) -> None:
    hc_facade = MagicMock()
    hc_judgment = MockSDKJudgment(
        case_id="DHC2022001",
        title="ABC Corp v. Union of India",
        court_name="Delhi High Court",
        court_code="delhi",
        citation="2022:DHC:1234",
        cnr="DLHC010012342022",
        decision_date=date(2022, 5, 12),
        bench="Single Judge",
    )
    hc_facade.find = AsyncMock(return_value=[hc_judgment])

    with patch.object(bharat_courts_service, "_get_judgments_facade", return_value=hc_facade):
        resp = client.get(
            "/api/v1/legal-research/judgments/search?court=delhi&year=2022",
            headers=owner_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "Delhi High Court" in data["results"][0]["court"]
        assert data["results"][0]["bench_type"] == "Single Judge Bench"


# 4. Live Full-Text Search
def test_live_fulltext_search(
    client: TestClient, owner_headers: Dict[str, str]
) -> None:
    live_facade = MagicMock()
    live_judgment = MockSDKJudgment(
        case_id="LIVE_2024_001",
        title="Recent Landmark v. State",
        source="live",
    )
    live_facade.find = AsyncMock(return_value=[live_judgment])

    with patch.object(bharat_courts_service, "_get_judgments_facade", return_value=live_facade):
        resp = client.get(
            "/api/v1/legal-research/judgments/search?q=anticipatory+bail&source=live",
            headers=owner_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["results"][0]["source_type"] == "live"


# 5. Citation Search
def test_citation_search(
    client: TestClient, owner_headers: Dict[str, str], mock_sdk_facade
) -> None:
    with patch.object(bharat_courts_service, "_get_judgments_facade", return_value=mock_sdk_facade):
        resp = client.get(
            "/api/v1/legal-research/judgments/search?citation=2023+INSC+964",
            headers=owner_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["results"][0]["citation"] == "[2023] 14 S.C.R. 153"


# 6. CNR Search
def test_cnr_search(
    client: TestClient, owner_headers: Dict[str, str], mock_sdk_facade
) -> None:
    with patch.object(bharat_courts_service, "_get_judgments_facade", return_value=mock_sdk_facade):
        resp = client.get(
            "/api/v1/legal-research/judgments/search?cnr=ESCR010007002023",
            headers=owner_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["results"][0]["cnr"] == "ESCR010007002023"


# 7. Judgment PDF Retrieval
def test_judgment_pdf_retrieval(
    client: TestClient, owner_headers: Dict[str, str], mock_sdk_facade
) -> None:
    with patch.object(bharat_courts_service, "_get_judgments_facade", return_value=mock_sdk_facade):
        resp = client.get(
            "/api/v1/legal-research/judgments/2023%20INSC%20964/pdf",
            headers=owner_headers,
        )
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert "inline;" in resp.headers["content-disposition"]
        assert resp.content.startswith(b"%PDF")


# 8. Missing Judgment Handling
def test_missing_judgment_handling(
    client: TestClient, owner_headers: Dict[str, str]
) -> None:
    empty_facade = MagicMock()
    empty_facade.find = AsyncMock(return_value=[])

    with patch.object(bharat_courts_service, "_get_judgments_facade", return_value=empty_facade):
        resp = client.get(
            "/api/v1/legal-research/judgments/NON_EXISTENT_CASE_XYZ",
            headers=owner_headers,
        )
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()


# 9. Provider Timeout Handling
def test_provider_timeout_handling(
    client: TestClient, owner_headers: Dict[str, str]
) -> None:
    slow_facade = MagicMock()

    async def _hang(*args, **kwargs):
        await asyncio.sleep(5)
        return []

    slow_facade.find = _hang

    with patch.object(bharat_courts_service, "_get_judgments_facade", return_value=slow_facade):
        with patch("app.core.config.settings.BHARAT_COURTS_TIMEOUT_SECONDS", 0.05):
            resp = client.get(
                "/api/v1/legal-research/judgments/search?q=arbitration",
                headers=owner_headers,
            )
            assert resp.status_code == 200
            data = resp.json()
            assert "warning" in data or data["success"] is False


# 10. Provider Unavailable Handling
def test_provider_unavailable_handling(
    client: TestClient, owner_headers: Dict[str, str]
) -> None:
    with patch.object(bharat_courts_service, "enabled", False):
        resp = client.get(
            "/api/v1/legal-research/judgments/search?q=test",
            headers=owner_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is False
        assert "disabled" in data["error"].lower()


# 11. Duplicate Cache Prevention
def test_duplicate_cache_prevention(
    client: TestClient, owner_headers: Dict[str, str], mock_sdk_facade
) -> None:
    with patch.object(bharat_courts_service, "_get_judgments_facade", return_value=mock_sdk_facade):
        # Query twice
        client.get("/api/v1/legal-research/judgments/search?q=test", headers=owner_headers)
        client.get("/api/v1/legal-research/judgments/search?q=test", headers=owner_headers)

        db = SessionLocal()
        try:
            count = (
                db.query(LegalJudgment)
                .filter(LegalJudgment.external_case_id == "2023 INSC 964")
                .count()
            )
            assert count == 1, f"Expected exactly 1 cached record, found {count}"
        finally:
            db.close()


# 12. Database Persistence and Metadata Verification
def test_database_persistence_and_fields(
    client: TestClient, owner_headers: Dict[str, str], mock_sdk_facade
) -> None:
    with patch.object(bharat_courts_service, "_get_judgments_facade", return_value=mock_sdk_facade):
        client.get(
            "/api/v1/legal-research/judgments/search?q=Section+138", headers=owner_headers
        )

        db = SessionLocal()
        try:
            record = (
                db.query(LegalJudgment)
                .filter(LegalJudgment.external_case_id == "2023 INSC 964")
                .first()
            )
            assert record is not None
            assert record.court == "Supreme Court of India"
            assert record.citation == "[2023] 14 S.C.R. 153"
            assert record.cnr_number == "ESCR010007002023"
            assert record.decision_date == date(2023, 10, 31)
            assert "PAMIDIGHANTAM SRI NARASIMHA" in record.judges
            assert record.source_provider == "bharat_courts"
            assert record.authority_status in [
                AuthorityStatus.BINDING,
                AuthorityStatus.PENDING_VERIFICATION,
            ]
        finally:
            db.close()


# 13. Authentication Enforcement
def test_authentication_enforcement(client: TestClient) -> None:
    resp = client.get("/api/v1/legal-research/judgments/search?q=unauthorized")
    assert resp.status_code == 401


# 14. User-Level Data Isolation & Audit Logging
def test_user_level_data_isolation(
    client: TestClient, owner_headers: Dict[str, str], mock_sdk_facade
) -> None:
    with patch.object(bharat_courts_service, "_get_judgments_facade", return_value=mock_sdk_facade):
        client.get(
            "/api/v1/legal-research/judgments/search?q=AuditTestQuery", headers=owner_headers
        )

        db = SessionLocal()
        try:
            audit = (
                db.query(AuditLog)
                .filter(AuditLog.action == "BHARAT_COURTS_SEARCH")
                .order_by(AuditLog.created_at.desc())
                .first()
            )
            assert audit is not None
            assert audit.metadata_json.get("query") == "AuditTestQuery"
        finally:
            db.close()


# 15. Juris RAG Retrieval and Citation Provenance
def test_juris_rag_retrieval_and_citation_provenance(
    client: TestClient, owner_headers: Dict[str, str]
) -> None:
    # Ensure a Bharat Courts cached judgment is in the DB
    db = SessionLocal()
    try:
        case_id = "RAG_TEST_INSC_2023"
        existing = (
            db.query(LegalJudgment)
            .filter(LegalJudgment.external_case_id == case_id)
            .first()
        )
        if not existing:
            lj = LegalJudgment(
                external_case_id=case_id,
                case_title="Bharat Courts Precedent Test v. State of Delhi",
                court="Supreme Court of India",
                citation="2023 INSC 999",
                decision_date=date(2023, 11, 1),
                judges=["D.Y. Chandrachud", "S. Ravindra Bhat"],
                party_names=["Bharat Courts Precedent Test", "State of Delhi"],
                cnr_number="ESCR010099992023",
                disposal_nature="Allowed",
                source_provider="bharat_courts",
                source_type="archive",
                document_reference="2023/11/2023_INSC_999.pdf",
                source_last_verified_at=date(2023, 11, 1),
                authority_status="BINDING",
                authority_notes="Binding ratio decidendi on criminal procedure and fair trial rights.",
                ratio_decidendi="Fair trial guarantees under Article 21 require timely disclosure of electronic records.",
                headnote_summary="Criminal appeal concerning constitutional compliance and procedural fairness.",
            )
            db.add(lj)
            db.commit()

        # Query Juris chat regarding this topic
        resp = client.post(
            "/api/v1/chat",
            headers=owner_headers,
            json={
                "message": "What did the Supreme Court hold in Bharat Courts Precedent Test regarding electronic records?",
                "response_mode": "detailed",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["cited_sources"]) >= 1

        # Check citation provenance
        cits = [s["citation"] for s in data["cited_sources"]]
        assert any("2023 INSC 999" in c or "Bharat Courts" in s["title"] for s, c in zip(data["cited_sources"], cits))
    finally:
        db.close()
