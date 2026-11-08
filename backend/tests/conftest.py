"""Pytest fixtures for AMIL Legal Intelligence Platform backend tests."""

from __future__ import annotations

import os
from typing import Dict, Generator

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_amil_legal.db")

from app.core.config import settings
from app.core.security import rate_limiter
from app.database.init_db import init_db
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def initialize_test_database() -> Generator[None, None, None]:
    init_db()
    yield


@pytest.fixture(autouse=True)
def reset_rate_limits() -> None:
    rate_limiter.reset()


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def owner_headers(client: TestClient) -> Dict[str, str]:
    resp = client.post(
        "/api/v1/auth/login",
        json={
            "email": settings.OWNER_DEFAULT_EMAIL,
            "password": settings.OWNER_DEFAULT_PASSWORD,
        },
    )
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def second_user_headers(client: TestClient) -> Dict[str, str]:
    email = "counsel.second@amillegal.in"
    password = "SecondUser#2026"
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "display_name": "Second Counsel",
        },
    )
    if reg.status_code == 201:
        token = reg.json()["access_token"]
    else:
        login = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        assert login.status_code == 200
        token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
