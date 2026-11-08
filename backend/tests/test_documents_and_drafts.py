"""Document Intelligence (upload, validation, analysis, Q&A, compare, delete) and Drafting Studio tests."""

from __future__ import annotations

from typing import Dict

from fastapi.testclient import TestClient


def test_document_upload_validation_and_analysis_flow(
    client: TestClient, owner_headers: Dict[str, str]
) -> None:
    # 1. Reject unsupported file extension (415)
    bad_ext = client.post(
        "/api/v1/documents/upload",
        headers=owner_headers,
        files={"file": ("malware.exe", b"MZ\x90\x00", "application/octet-stream")},
    )
    assert bad_ext.status_code == 415

    # 2. Reject spoofed PDF without %PDF- magic bytes (400)
    spoof_pdf = client.post(
        "/api/v1/documents/upload",
        headers=owner_headers,
        files={"file": ("spoof.pdf", b"NOT_A_PDF_HEADER", "application/pdf")},
    )
    assert spoof_pdf.status_code == 400

    # 3. Upload valid contract text document
    contract_a_text = (
        "SERVICE AGREEMENT\n\n"
        "This Agreement is entered into on 15 January 2026 between Apex Tech Private Limited "
        "and Horizon Legal Solutions LLP.\n\n"
        "CLAUSE 1: OBLIGATIONS\n"
        "The Vendor shall deliver software modules within 30 days of execution.\n\n"
        "CLAUSE 2: INDEMNITY & RESTRAINT\n"
        "The Vendor agrees to unlimited liability and non-compete restraint of trade after termination."
    ).encode("utf-8")

    up_a = client.post(
        "/api/v1/documents/upload",
        headers=owner_headers,
        files={"file": ("service_agreement_v1.txt", contract_a_text, "text/plain")},
        data={"title": "Service Agreement v1", "ai_consent_granted": "true"},
    )
    assert up_a.status_code == 201, up_a.text
    doc_a_id = up_a.json()["id"]

    # 4. Run Document Intelligence analysis + page-cited Q&A
    an_resp = client.post(
        f"/api/v1/documents/{doc_a_id}/analyze",
        headers=owner_headers,
        json={"question": "Within how many days must the software modules be delivered?"},
    )
    assert an_resp.status_code == 200
    an_data = an_resp.json()
    assert len(an_data["obligations_and_deadlines"]) >= 1
    assert any(r["risk_code"] == "RESTRAINT_OF_TRADE" for r in an_data["risky_or_unusual_terms"])
    assert "30 days" in an_data["qa_answer"]["answer"]
    assert an_data["qa_answer"]["citations"][0]["page_number"] == 1

    # 5. Upload v2 and compare documents
    contract_b_text = (
        "SERVICE AGREEMENT\n\n"
        "This Agreement is entered into on 15 January 2026 between Apex Tech Private Limited "
        "and Horizon Legal Solutions LLP.\n\n"
        "CLAUSE 1: OBLIGATIONS\n"
        "The Vendor shall deliver software modules within 45 days of execution and pay liquidated damages upon delay."
    ).encode("utf-8")
    up_b = client.post(
        "/api/v1/documents/upload",
        headers=owner_headers,
        files={"file": ("service_agreement_v2.txt", contract_b_text, "text/plain")},
        data={"title": "Service Agreement v2", "ai_consent_granted": "true"},
    )
    assert up_b.status_code == 201
    doc_b_id = up_b.json()["id"]

    cmp_resp = client.post(
        "/api/v1/documents/compare",
        headers=owner_headers,
        json={"document_a_id": doc_a_id, "document_b_id": doc_b_id},
    )
    assert cmp_resp.status_code == 200
    assert cmp_resp.json()["similarity_ratio"] > 0.3

    # 6. Delete documents
    assert client.delete(f"/api/v1/documents/{doc_a_id}", headers=owner_headers).status_code == 204
    assert client.delete(f"/api/v1/documents/{doc_b_id}", headers=owner_headers).status_code == 204


def test_drafting_studio_versioning_and_exports(
    client: TestClient, owner_headers: Dict[str, str]
) -> None:
    create_resp = client.post(
        "/api/v1/drafts",
        headers=owner_headers,
        json={
            "title": "Demand Notice for Breach of Commercial Supply Contract",
            "draft_type": "LEGAL_NOTICE",
            "user_facts": {
                "sender_name": "Amil Bhatt, Counsel for Claimant",
                "recipient_name": "M/s Zenith Logistics Pvt. Ltd.",
                "facts_summary": "Failure to deliver consignment dated 01-10-2026.",
                "relief_sought": "Refund of INR 15,00,000 with 18% interest.",
            },
            "cited_references": ["Indian Contract Act, 1872 — Section 73"],
        },
    )
    assert create_resp.status_code == 201
    draft = create_resp.json()
    draft_id = draft["id"]
    assert draft["version"] == 1
    assert "[DRAFT — FOR LEGAL REVIEW ONLY" in draft["content_markdown"]

    # Update draft and verify version increment
    patch_resp = client.patch(
        f"/api/v1/drafts/{draft_id}",
        headers=owner_headers,
        json={"status": "REVIEWED"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["version"] == 2
    assert len(patch_resp.json()["version_history"]) == 2

    # Export as DOCX, PDF, and Markdown
    docx_resp = client.post(
        f"/api/v1/drafts/{draft_id}/export",
        headers=owner_headers,
        json={"format": "docx"},
    )
    assert docx_resp.status_code == 200
    assert docx_resp.content.startswith(b"PK\x03\x04")

    pdf_resp = client.post(
        f"/api/v1/drafts/{draft_id}/export",
        headers=owner_headers,
        json={"format": "pdf"},
    )
    assert pdf_resp.status_code == 200
    assert pdf_resp.content.startswith(b"%PDF-")
