"""Database engine and session management with PostgreSQL -> SQLite automatic fallback."""

from __future__ import annotations

from typing import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.core.logging import logger


def _enable_sqlite_foreign_keys(dbapi_connection: object, _connection_record: object) -> None:
    try:
        cursor = dbapi_connection.cursor()  # type: ignore[attr-defined]
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    except Exception:
        pass


def build_engine() -> Engine:
    """Create SQLAlchemy engine, falling back to local SQLite if PostgreSQL is unreachable."""
    target_url = settings.resolved_database_url
    if target_url.startswith("sqlite"):
        eng = create_engine(
            target_url,
            connect_args={"check_same_thread": False},
            future=True,
        )
        event.listen(eng, "connect", _enable_sqlite_foreign_keys)
        return eng

    try:
        eng = create_engine(
            target_url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            future=True,
        )
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        return eng
    except Exception as exc:
        logger.warning(
            f"PostgreSQL connection unavailable ({type(exc).__name__}); "
            "falling back to local SQLite database sqlite:///./amil_legal.db"
        )
        fallback_eng = create_engine(
            "sqlite:///./amil_legal.db",
            connect_args={"check_same_thread": False},
            future=True,
        )
        event.listen(fallback_eng, "connect", _enable_sqlite_foreign_keys)
        return fallback_eng


engine: Engine = build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=Session)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
