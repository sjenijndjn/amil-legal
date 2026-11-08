"""SQLAlchemy declarative base and portable vector/UUID column types."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, List, Optional

from sqlalchemy import JSON, DateTime
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.types import TypeDecorator

try:
    from pgvector.sqlalchemy import Vector as PGVector
except Exception:  # pragma: no cover - fallback when pgvector is not installed
    PGVector = None  # type: ignore


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class PortableVector(TypeDecorator):
    """768-dimensional vector column using pgvector on PostgreSQL and JSON array fallback."""

    impl = JSON
    cache_ok = True

    def __init__(self, dim: int = 768, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.dim = dim

    def load_dialect_impl(self, dialect: Any) -> Any:
        if dialect.name == "postgresql" and PGVector is not None:
            return dialect.type_descriptor(PGVector(self.dim))
        return dialect.type_descriptor(JSON())

    def process_bind_param(
        self, value: Optional[List[float]], dialect: Any
    ) -> Optional[List[float]]:
        if value is None:
            return None
        return [float(x) for x in value]

    def process_result_value(
        self, value: Any, dialect: Any
    ) -> Optional[List[float]]:
        if value is None:
            return None
        if isinstance(value, list):
            return [float(x) for x in value]
        try:
            return [float(x) for x in list(value)]
        except Exception:
            return None


class Base(DeclarativeBase):
    """Declarative base for all 18 AMIL database models."""

    type_annotation_map = {
        datetime: DateTime(timezone=True),
    }
