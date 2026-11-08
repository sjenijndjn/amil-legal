"""Bare Acts Library, Case Law Judgments, and Unified Legal Research Engine tests."""

from __future__ import annotations

from typing import Dict

from fastapi.testclient import TestClient


def test_bare_acts_current_vs_historical_and_sections(
    client: TestClient, owner_headers: Dict[str, str]
) -> None:
    current_resp = client.get("/api/v1/acts?status=CURRENT", headers=owner_headers)
    assert current_resp.status_code == 200
    current_acts = current_resp.json()
    short_titles = {a["short_title"] for a in current_acts}
    assert "BNS, 2023" in short_titles
    assert "BNSS, 2023" in short_titles
    assert "BSA, 2023" in short_titles
    assert "Constitution of India" in short_titles
    assert "DPDP Act, 2023" in short_titles

    hist_resp = client.get("/api/v1/acts?status=HISTORICAL", headers=owner_headers)
    assert hist_resp.status_code == 200
    hist_titles = {a["short_title"] for a in hist_resp.json()}
    assert "IPC, 1860" in hist_titles
    assert "CrPC, 1973" in hist_titles
    assert "IEA, 1872" in hist_titles

    # Inspect BNS sections and historical IPC mapping
    bns_act = next(a for a in current_acts if a["short_title"] == "BNS, 2023")
    sec_resp = client.get(
        f"/api/v1/acts/{bns_act['id']}/sections?q=318", headers=owner_headers
    )
    assert sec_resp.status_code == 200
    sections = sec_resp.json()
    assert len(sections) >= 1
    assert "IPC, 1860" in (sections[0]["corresponding_historical_section"] or "")


def test_judgments_and_unified_research_search(
    client: TestClient, owner_headers: Dict[str, str]
) -> None:
    j_resp = client.get("/api/v1/judgments?q=Puttaswamy", headers=owner_headers)
    assert j_resp.status_code == 200
    judgments = j_resp.json()
    assert len(judgments) == 1
    assert judgments[0]["neutral_citation"] == "2017 INSC 801"
    assert judgments[0]["precedent_status"] == "BINDING"

    detail_resp = client.get(
        f"/api/v1/judgments/{judgments[0]['id']}", headers=owner_headers
    )
    assert detail_resp.status_code == 200
    assert "M.P. Sharma" in detail_resp.json()["full_text_excerpt"]

    search_resp = client.get(
        "/api/v1/research/search?q=privacy&type=all", headers=owner_headers
    )
    assert search_resp.status_code == 200
    assert search_resp.json()["total_results"] >= 1
    assert "INDIA_CODE" in search_resp.json()["verified_sources_checked"]
