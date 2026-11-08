"""Authentication, token rotation, security headers, and multi-user tenant isolation tests."""

from __future__ import annotations

from typing import Dict

from fastapi.testclient import TestClient


def test_health_and_security_headers(client: TestClient) -> None:
    root_resp = client.get("/health")
    assert root_resp.status_code == 200
    assert root_resp.json()["brand"] == "AMIL"
    assert root_resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert root_resp.headers.get("X-Frame-Options") == "DENY"

    v1_resp = client.get("/api/v1/health")
    assert v1_resp.status_code == 200
    data = v1_resp.json()
    assert data["database"]["connected"] is True
    assert data["database"]["acts_seeded"] >= 12
    assert data["database"]["judgments_seeded"] >= 8


def test_unauthorized_requests_rejected(client: TestClient) -> None:
    for path in [
        "/api/v1/auth/me",
        "/api/v1/profile",
        "/api/v1/conversations",
        "/api/v1/documents",
        "/api/v1/library",
        "/api/v1/drafts",
        "/api/v1/tasks",
        "/api/v1/dashboard/summary",
    ]:
        resp = client.get(path)
        assert resp.status_code == 401


def test_owner_login_refresh_rotation_and_profile(
    client: TestClient, owner_headers: Dict[str, str]
) -> None:
    me_resp = client.get("/api/v1/auth/me", headers=owner_headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == "amil@amillegal.in"
    assert me_data["profile"]["display_name"] == "Amil Bhatt"

    # Update profile preferences
    patch_resp = client.patch(
        "/api/v1/profile",
        headers=owner_headers,
        json={"ai_response_style": "detailed"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["ai_response_style"] == "detailed"

    # Test refresh token rotation
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "amil@amillegal.in", "password": "AmilLegal#2026"},
    )
    assert login_resp.status_code == 200
    old_refresh = login_resp.json()["refresh_token"]

    ref_resp = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert ref_resp.status_code == 200
    new_refresh = ref_resp.json()["refresh_token"]
    assert new_refresh != old_refresh

    # Reusing the old refresh token must fail with 401
    reuse_resp = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert reuse_resp.status_code == 401


def test_strict_multi_user_data_isolation(
    client: TestClient,
    owner_headers: Dict[str, str],
    second_user_headers: Dict[str, str],
) -> None:
    # Owner creates a private note, conversation, and draft
    note_resp = client.post(
        "/api/v1/library/notes",
        headers=owner_headers,
        json={
            "title": "Confidential Strategy Memo for Amil",
            "content": "Privileged arbitration points under Section 73 Contract Act.",
            "tags": ["privileged"],
            "is_pinned": True,
        },
    )
    assert note_resp.status_code == 201
    note_id = note_resp.json()["id"]

    draft_resp = client.post(
        "/api/v1/drafts",
        headers=owner_headers,
        json={
            "title": "Private Legal Notice",
            "draft_type": "LEGAL_NOTICE",
            "user_facts": {"sender_name": "Amil Bhatt"},
        },
    )
    assert draft_resp.status_code == 201
    draft_id = draft_resp.json()["id"]

    # Second user cannot view, patch, or delete Owner's note or draft (must return 404)
    assert (
        client.patch(
            f"/api/v1/library/notes/{note_id}",
            headers=second_user_headers,
            json={"title": "Hijacked"},
        ).status_code
        == 404
    )
    assert (
        client.delete(
            f"/api/v1/library/notes/{note_id}",
            headers=second_user_headers,
        ).status_code
        == 404
    )
    assert (
        client.get(
            f"/api/v1/drafts/{draft_id}",
            headers=second_user_headers,
        ).status_code
        == 404
    )
