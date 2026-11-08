"""My Legal Library, Tasks & Reminders, and Dashboard Summary tests."""

from __future__ import annotations

from typing import Dict

from fastapi.testclient import TestClient


def test_library_folders_bookmarks_notes_and_tasks(
    client: TestClient, owner_headers: Dict[str, str]
) -> None:
    # Create folder
    f_resp = client.post(
        "/api/v1/library/folders",
        headers=owner_headers,
        json={
            "name": "Supreme Court Constitution Bench Dossier",
            "color_hex": "#D4AF37",
            "description": "Key Article 21 and Basic Structure rulings",
        },
    )
    assert f_resp.status_code == 201
    folder_id = f_resp.json()["id"]

    # Create bookmark
    bm_resp = client.post(
        "/api/v1/library/bookmarks",
        headers=owner_headers,
        json={
            "item_type": "JUDGMENT",
            "title": "Kesavananda Bharati v. State of Kerala (1973 INSC 91)",
            "excerpt": "Parliament cannot alter the Basic Structure of the Constitution under Article 368.",
            "folder_id": folder_id,
            "tags": ["Basic Structure", "Article 368"],
        },
    )
    assert bm_resp.status_code == 201
    bm_id = bm_resp.json()["id"]

    # Overview query
    lib_resp = client.get(f"/api/v1/library?folder_id={folder_id}", headers=owner_headers)
    assert lib_resp.status_code == 200
    assert len(lib_resp.json()["bookmarks"]) >= 1

    # Create and complete task
    t_resp = client.post(
        "/api/v1/tasks",
        headers=owner_headers,
        json={
            "title": "File Written Submissions before Delhi High Court",
            "task_type": "COURT_FILING",
            "priority": "URGENT",
            "status": "TODO",
        },
    )
    assert t_resp.status_code == 201
    task_id = t_resp.json()["id"]

    done_resp = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=owner_headers,
        json={"status": "COMPLETED"},
    )
    assert done_resp.status_code == 200
    assert done_resp.json()["completed_at"] is not None

    # Dashboard summary
    dash_resp = client.get("/api/v1/dashboard/summary", headers=owner_headers)
    assert dash_resp.status_code == 200
    dash = dash_resp.json()
    assert dash["welcome_greeting"] == "Welcome back, Amil."
    assert dash["owner_name"] == "Amil Bhatt"
    assert dash["counts"]["verified_acts"] >= 12
    assert dash["counts"]["verified_judgments"] >= 8

    # Cleanup
    assert client.delete(f"/api/v1/library/bookmarks/{bm_id}", headers=owner_headers).status_code == 204
    assert client.delete(f"/api/v1/tasks/{task_id}", headers=owner_headers).status_code == 204
