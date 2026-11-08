"""FastAPI application entrypoint for AMIL Legal Intelligence Platform."""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_v1_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import logger
from app.core.security import SecurityHeadersMiddleware
from app.database.init_db import init_db


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Initializing AMIL Legal Intelligence Platform database and Indian Legal Corpus...")
    init_db()
    logger.info("AMIL database & seed verification complete.")
    yield


def create_application() -> FastAPI:
    app = FastAPI(
        title=f"{settings.APP_BRAND_NAME} — {settings.APP_SUBTITLE}",
        description=(
            "Personalized Indian Legal Intelligence, Grounded RAG Research, "
            "Document Intelligence, and Legal Drafting Platform for Amil Bhatt."
        ),
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
    )
    app.add_middleware(SecurityHeadersMiddleware)

    register_exception_handlers(app)

    @app.get("/health", tags=["System & Health"])
    def root_health() -> Dict[str, Any]:
        return {
            "status": "ok",
            "brand": settings.APP_BRAND_NAME,
            "subtitle": settings.APP_SUBTITLE,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    app.include_router(api_v1_router, prefix=settings.API_V1_STR)
    return app


app = create_application()
