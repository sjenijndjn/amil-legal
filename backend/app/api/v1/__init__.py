"""Aggregate all v1 API routers."""

from fastapi import APIRouter

from app.api.v1 import (
    acts,
    auth,
    dashboard,
    documents,
    drafts,
    health,
    judgments,
    juris,
    legal_research,
    library,
    profile,
    research,
    tasks,
)

api_v1_router = APIRouter()
api_v1_router.include_router(health.router)
api_v1_router.include_router(auth.router)
api_v1_router.include_router(profile.router)
api_v1_router.include_router(juris.router)
api_v1_router.include_router(research.router)
api_v1_router.include_router(acts.router)
api_v1_router.include_router(judgments.router)
api_v1_router.include_router(legal_research.router)
api_v1_router.include_router(documents.router)
api_v1_router.include_router(library.router)
api_v1_router.include_router(drafts.router)
api_v1_router.include_router(tasks.router)
api_v1_router.include_router(dashboard.router)
