"""Structured, privacy-preserving logging for AMIL Legal Intelligence Platform."""

from __future__ import annotations

import json
import logging
import re
import sys
from datetime import datetime, timezone
from typing import Any, Dict

SENSITIVE_KEYS = {
    "password",
    "password_hash",
    "access_token",
    "refresh_token",
    "refresh_token_hash",
    "authorization",
    "api_key",
    "gemini_api_key",
    "jwt_secret",
    "raw_text",
    "statutory_text",
    "content_markdown",
    "file_bytes",
}

BEARER_PATTERN = re.compile(r"Bearer\s+[A-Za-z0-9\-._~+/]+=*", re.IGNORECASE)


def redact_value(key: str, value: Any) -> Any:
    """Redact confidential values so logs never leak user documents or credentials."""
    if key.lower() in SENSITIVE_KEYS:
        return "[REDACTED]"
    if isinstance(value, str):
        return BEARER_PATTERN.sub("Bearer [REDACTED]", value)
    if isinstance(value, dict):
        return {k: redact_value(k, v) for k, v in value.items()}
    if isinstance(value, list):
        return [redact_value(key, item) for item in value]
    return value


class PrivacyJSONFormatter(logging.Formatter):
    """Structured JSON log formatter with automatic secret/document redaction."""

    def format(self, record: logging.LogRecord) -> str:
        msg = record.getMessage()
        msg = BEARER_PATTERN.sub("Bearer [REDACTED]", msg)
        payload: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": msg,
        }
        extra_data = getattr(record, "structured_data", None)
        if isinstance(extra_data, dict):
            payload["data"] = {k: redact_value(k, v) for k, v in extra_data.items()}
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def get_logger(name: str = "amil_legal") -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(PrivacyJSONFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False
    return logger


logger = get_logger("amil_legal")
