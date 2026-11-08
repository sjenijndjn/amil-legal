"""Application configuration for AMIL Legal Intelligence Platform."""

from __future__ import annotations

import os
from pathlib import Path
from typing import List


def _load_dotenv_files() -> None:
    """Load variables from backend/.env and root .env without overwriting existing os.environ."""
    backend_dir = Path(__file__).resolve().parent.parent.parent
    root_dir = backend_dir.parent
    for env_path in (backend_dir / ".env", root_dir / ".env"):
        if env_path.is_file():
            try:
                for raw_line in env_path.read_text(encoding="utf-8").splitlines():
                    line = raw_line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    if key and key not in os.environ:
                        os.environ[key] = val
            except Exception:
                pass


_load_dotenv_files()


def _normalize_db_url(raw_url: str) -> str:
    url = (raw_url or "").strip()
    if not url:
        return "sqlite:///./amil_legal.db"
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://") and "+psycopg" not in url and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


class Settings:
    """Centralized configuration loaded from environment variables and .env with safe defaults."""

    def __init__(self) -> None:
        self.APP_BRAND_NAME: str = os.getenv("APP_BRAND_NAME", "AMIL")
        self.APP_SUBTITLE: str = os.getenv(
            "APP_SUBTITLE", "Legal Intelligence & AI Counsel for India"
        )
        self.ENVIRONMENT: str = os.getenv("ENVIRONMENT", os.getenv("APP_ENV", "development"))
        self.APP_ENV: str = self.ENVIRONMENT
        self.DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("1", "true", "yes")
        self.API_V1_STR: str = "/api/v1"

        # Personalized owner defaults
        self.OWNER_DEFAULT_NAME: str = os.getenv("OWNER_DEFAULT_NAME", "Amil Bhatt")
        self.OWNER_DEFAULT_EMAIL: str = os.getenv("OWNER_DEFAULT_EMAIL", "amil@amillegal.in")
        self.OWNER_DEFAULT_PASSWORD: str = os.getenv("OWNER_DEFAULT_PASSWORD", "AmilLegal#2025")

        # Database
        self.DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./amil_legal.db")

        # Security & JWT
        self.JWT_SECRET: str = os.getenv(
            "JWT_SECRET",
            "amil-legal-intelligence-platform-jwt-signing-secret-key-2026-india",
        )
        self.JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
        self.ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
            os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
        )
        self.REFRESH_TOKEN_EXPIRE_DAYS: int = int(
            os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7")
        )

        # AI / Gemini Configuration
        self.GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
        self.GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")
        self.GEMINI_EMBEDDING_MODEL: str = os.getenv(
            "GEMINI_EMBEDDING_MODEL", "gemini-embedding-001"
        )
        self.AI_REQUEST_TIMEOUT_SECONDS: float = float(
            os.getenv("AI_REQUEST_TIMEOUT_SECONDS", "30.0")
        )
        self.AI_MAX_RETRIES: int = int(os.getenv("AI_MAX_RETRIES", "2"))

        # CORS & Frontend
        frontend_url_raw = os.getenv(
            "FRONTEND_URL",
            "http://localhost:3000,http://127.0.0.1:3000,https://amil-legal.vercel.app",
        )
        self.FRONTEND_URL: str = frontend_url_raw
        self.CORS_ORIGINS: List[str] = [
            origin.strip()
            for origin in frontend_url_raw.split(",")
            if origin.strip()
        ]

        # Private Document Storage Vault (outside web root)
        base_dir = Path(__file__).resolve().parent.parent.parent
        default_vault = str(base_dir / ".vault")
        self.PRIVATE_STORAGE_DIR: str = os.getenv("PRIVATE_STORAGE_DIR", default_vault)
        self.STORAGE_ENDPOINT: str = os.getenv("STORAGE_ENDPOINT", "")
        self.STORAGE_BUCKET: str = os.getenv(
            "STORAGE_BUCKET_NAME", os.getenv("STORAGE_BUCKET", "amil-private-documents")
        )
        self.STORAGE_ACCESS_KEY: str = os.getenv("STORAGE_ACCESS_KEY", "")
        self.STORAGE_SECRET_KEY: str = os.getenv("STORAGE_SECRET_KEY", "")
        self.STORAGE_REGION: str = os.getenv("STORAGE_REGION", "ap-south-1")
        self.MAX_UPLOAD_BYTES: int = int(os.getenv("MAX_UPLOAD_BYTES", str(25 * 1024 * 1024)))

        # Rate Limiting
        self.RATE_LIMIT_AUTH_PER_MINUTE: int = int(
            os.getenv("RATE_LIMIT_AUTH_PER_MINUTE", "30")
        )
        self.RATE_LIMIT_CHAT_PER_MINUTE: int = int(
            os.getenv("RATE_LIMIT_CHAT_PER_MINUTE", "60")
        )
        self.RATE_LIMIT_UPLOAD_PER_MINUTE: int = int(
            os.getenv("RATE_LIMIT_UPLOAD_PER_MINUTE", "20")
        )

        # Bharat Courts Integration
        self.BHARAT_COURTS_ENABLED: bool = os.getenv(
            "BHARAT_COURTS_ENABLED", "true"
        ).lower() in ("1", "true", "yes")
        self.BHARAT_COURTS_TIMEOUT_SECONDS: float = float(
            os.getenv("BHARAT_COURTS_TIMEOUT_SECONDS", "25.0")
        )
        self.BHARAT_COURTS_DEFAULT_LIMIT: int = int(
            os.getenv("BHARAT_COURTS_DEFAULT_LIMIT", "20")
        )
        self.BHARAT_COURTS_MAX_LIMIT: int = int(
            os.getenv("BHARAT_COURTS_MAX_LIMIT", "50")
        )
        self.BHARAT_COURTS_MAX_PDF_BYTES: int = int(
            os.getenv("BHARAT_COURTS_MAX_PDF_BYTES", str(25 * 1024 * 1024))
        )

    @property
    def resolved_database_url(self) -> str:
        return _normalize_db_url(self.DATABASE_URL)

    @property
    def has_gemini_key(self) -> bool:
        return bool(self.GEMINI_API_KEY and self.GEMINI_API_KEY != "your_gemini_api_key_here")

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"


settings = Settings()
