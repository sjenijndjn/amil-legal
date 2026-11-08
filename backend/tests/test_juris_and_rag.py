"""Juris AI Assistant, 7-part structured legal answers, RAG grounding, and citation validation tests."""

from __future__ import annotations

from typing import Dict

from fastapi.testclient import TestClient

from app.ai.citation_validator import validate_citations_against_db
from app.database.session import SessionLocal


def test_juris_7_part_structured_answer_and_temporal_awareness(
    client: TestClient, owner_headers: Dict[str, str]
) -> None:
    chat_resp = client.post(
        "/api/v1/chat",
        headers=owner_headers,
        json={
            "message": "What are the requirements for admissibility of electronic records under Section 63 of the BSA, 2023 and Section 65B of the Evidence Act, and what did Arjun Panditrao Khotkar hold?",
            "response_mode": "detailed",
        },
    )
    assert chat_resp.status_code == 200, chat_resp.text
    payload = chat_resp.json()

    assert payload["coverage_status"] == "VERIFIED_CORPUS_GROUNDED"
    assert payload["confidence_score"] >= 0.68
    assert len(payload["cited_sources"]) >= 2

    sections = payload["structured_sections"]
    for key in [
        "legal_issue_summary",
        "applicable_acts_and_sections",
        "relevant_case_law",
        "plain_english_explanation",
        "procedural_steps_and_practical_takeaways",
        "risks_limitations_and_ambiguities",
        "verification_and_disclaimer_footer",
    ]:
        assert key in sections
        assert sections[key]

    # Verify conversation persistence and export
    conv_id = payload["conversation_id"]
    conv_detail = client.get(f"/api/v1/conversations/{conv_id}", headers=owner_headers)
    assert conv_detail.status_code == 200
    assert len(conv_detail.json()["messages"]) == 2

    export_resp = client.get(
        f"/api/v1/conversations/{conv_id}/export?format=markdown", headers=owner_headers
    )
    assert export_resp.status_code == 200
    assert "AMIL Juris Research Transcript" in export_resp.json()["markdown"]


def test_overruled_precedent_warning_in_juris(
    client: TestClient, owner_headers: Dict[str, str]
) -> None:
    chat_resp = client.post(
        "/api/v1/chat",
        headers=owner_headers,
        json={
            "message": "Explain the status of A.K. Gopalan v. State of Madras (1950 SCR 88) and how Maneka Gandhi v. Union of India interpreted Article 21.",
            "response_mode": "standard",
        },
    )
    assert chat_resp.status_code == 200
    data = chat_resp.json()
    risks_text = " ".join(data["structured_sections"]["risks_limitations_and_ambiguities"])
    assert "OVERRULED" in risks_text


def test_citation_validator_rejects_fabricated_citations() -> None:
    db = SessionLocal()
    try:
        results = validate_citations_against_db(
            db,
            [
                "1973 INSC 91",
                "BSA, 2023 Section 63",
                "1950 INSC 14",
                "Fake v. Imaginary Corp (2099) 99 SCC 999",
            ],
        )
        assert len(results) == 4
        assert results[0]["badge"] == "[VERIFIED IN CORPUS]"
        assert results[1]["badge"] == "[VERIFIED IN CORPUS]"
        assert results[2]["badge"] == "[OVERRULED — DO NOT CITE AS GOOD LAW]"
        assert results[3]["badge"] == "[UNVERIFIED — NOT IN CORPUS]"
    finally:
        db.close()
