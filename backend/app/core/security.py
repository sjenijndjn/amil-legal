"""Authentication, Argon2id password hashing, JWT tokens, rate limiting, and security headers."""

from __future__ import annotations

import base64
import collections
import hashlib
import hmac
import json
import os
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Deque, Dict, Optional

from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.exceptions import AuthenticationError
from app.database.session import get_db
from app.models.audit_log import AuditLog
from app.models.user import User

try:
    from argon2 import PasswordHasher
    from argon2.exceptions import VerifyMismatchError, InvalidHashError

    _ARGON2_HASHER: Optional[PasswordHasher] = PasswordHasher(
        time_cost=2, memory_cost=19456, parallelism=1
    )
except Exception:  # pragma: no cover - fallback when C-extension is unavailable
    _ARGON2_HASHER = None
    VerifyMismatchError = Exception  # type: ignore
    InvalidHashError = Exception  # type: ignore

try:
    import jwt as _pyjwt
except Exception:  # pragma: no cover - fallback pure-python HS256 JWT
    _pyjwt = None  # type: ignore


bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Password Hashing (Argon2id primary, PBKDF2-SHA256 portable fallback)
# ---------------------------------------------------------------------------


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id (with PBKDF2-SHA256 fallback)."""
    if _ARGON2_HASHER is not None:
        return _ARGON2_HASHER.hash(password)
    salt = os.urandom(16).hex()
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 260000)
    return f"pbkdf2_sha256$260000${salt}${dk.hex()}"


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify a plaintext password against an Argon2id or PBKDF2-SHA256 hash."""
    if not plain_password or not password_hash:
        return False
    if password_hash.startswith("pbkdf2_sha256$"):
        try:
            _, iterations_str, salt, stored_hex = password_hash.split("$", 3)
            dk = hashlib.pbkdf2_hmac(
                "sha256",
                plain_password.encode("utf-8"),
                salt.encode("utf-8"),
                int(iterations_str),
            )
            return hmac.compare_digest(dk.hex(), stored_hex)
        except Exception:
            return False

    if _ARGON2_HASHER is not None:
        try:
            return bool(_ARGON2_HASHER.verify(password_hash, plain_password))
        except (VerifyMismatchError, InvalidHashError, Exception):
            return False
    return False


def hash_token(raw_token: str) -> str:
    """Compute a SHA-256 digest of a refresh token for storage in users.refresh_token_hash."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# JWT Creation & Verification (PyJWT with RFC-compliant HS256 fallback)
# ---------------------------------------------------------------------------


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _encode_jwt(payload: Dict[str, Any]) -> str:
    if _pyjwt is not None:
        token = _pyjwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
        return token if isinstance(token, str) else token.decode("utf-8")
    header = {"alg": "HS256", "typ": "JWT"}
    segments = [
        _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8")),
        _b64url_encode(json.dumps(payload, separators=(",", ":"), default=str).encode("utf-8")),
    ]
    signing_input = ".".join(segments).encode("ascii")
    signature = hmac.new(
        settings.JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256
    ).digest()
    segments.append(_b64url_encode(signature))
    return ".".join(segments)


def _decode_jwt(token: str) -> Dict[str, Any]:
    if _pyjwt is not None:
        try:
            return dict(
                _pyjwt.decode(
                    token,
                    settings.JWT_SECRET,
                    algorithms=[settings.JWT_ALGORITHM],
                )
            )
        except Exception as exc:
            raise AuthenticationError("Invalid or expired token") from exc

    try:
        header_b64, payload_b64, crypto_b64 = token.split(".")
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        expected_sig = hmac.new(
            settings.JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256
        ).digest()
        actual_sig = _b64url_decode(crypto_b64)
        if not hmac.compare_digest(expected_sig, actual_sig):
            raise AuthenticationError("Invalid token signature")
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        exp = payload.get("exp")
        if exp is not None and int(time.time()) >= int(exp):
            raise AuthenticationError("Token has expired")
        return dict(payload)
    except AuthenticationError:
        raise
    except Exception as exc:
        raise AuthenticationError("Malformed authentication token") from exc


def create_access_token(user_id: uuid.UUID, role: str = "OWNER") -> str:
    """Issue a short-lived JWT access token."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "jti": str(uuid.uuid4()),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return _encode_jwt(payload)


def create_refresh_token(user_id: uuid.UUID, role: str = "OWNER") -> str:
    """Issue a rotating refresh token with 7-day TTL."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "refresh",
        "jti": str(uuid.uuid4()),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return _encode_jwt(payload)


def decode_token(token: str, expected_type: str = "access") -> Dict[str, Any]:
    """Decode and validate a JWT access or refresh token."""
    payload = _decode_jwt(token)
    if payload.get("type") != expected_type:
        raise AuthenticationError(f"Expected {expected_type} token")
    if not payload.get("sub"):
        raise AuthenticationError("Token missing subject claim")
    return payload


# ---------------------------------------------------------------------------
# FastAPI Current User Dependency & Audit Helper
# ---------------------------------------------------------------------------


def record_audit_event(
    db: Session,
    *,
    user_id: Optional[uuid.UUID],
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    request: Optional[Request] = None,
    metadata_json: Optional[Dict[str, Any]] = None,
) -> None:
    """Record a privacy-safe audit log entry without storing confidential text."""
    ip_addr = "127.0.0.1"
    user_agent = "AMIL-Client"
    if request is not None:
        if request.client and request.client.host:
            ip_addr = request.client.host
        user_agent = request.headers.get("user-agent", "AMIL-Client")[:255]

    entry = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id else None,
        ip_address=ip_addr,
        user_agent=user_agent,
        metadata_json=metadata_json or {},
    )
    db.add(entry)
    db.commit()


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Authenticate request via Bearer JWT and return active User model."""
    if credentials is None or not credentials.credentials:
        raise AuthenticationError("Missing Bearer authentication token")

    payload = decode_token(credentials.credentials, expected_type="access")
    try:
        user_uuid = uuid.UUID(str(payload["sub"]))
    except ValueError as exc:
        raise AuthenticationError("Invalid user identifier in token") from exc

    user = db.query(User).filter(User.id == user_uuid, User.is_active.is_(True)).first()
    if user is None:
        raise AuthenticationError("User account not found or inactive")
    return user


# ---------------------------------------------------------------------------
# Sliding-Window Rate Limiter & Security Headers Middleware
# ---------------------------------------------------------------------------


class SlidingWindowRateLimiter:
    """In-memory sliding-window rate limiter keyed by client IP and route bucket."""

    def __init__(self) -> None:
        self._buckets: Dict[str, Deque[float]] = collections.defaultdict(collections.deque)

    def reset(self) -> None:
        self._buckets.clear()

    def check(self, key: str, limit: int, window_seconds: int = 60) -> None:
        now = time.monotonic()
        dq = self._buckets[key]
        while dq and now - dq[0] > window_seconds:
            dq.popleft()
        if len(dq) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please wait before retrying.",
            )
        dq.append(now)


rate_limiter = SlidingWindowRateLimiter()


def enforce_rate_limit(bucket: str, limit: int) -> Callable[[Request], None]:
    """FastAPI dependency factory for endpoint-level sliding-window rate limiting."""

    def _dependency(request: Request) -> None:
        client_ip = request.client.host if request.client and request.client.host else "local"
        rate_limiter.check(f"{bucket}:{client_ip}", limit=limit, window_seconds=60)

    return _dependency


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Inject hardened HTTP security headers on every response."""

    async def dispatch(self, request: Request, call_next: Callable[..., Any]) -> Response:
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains; preload"
            )
        return response
