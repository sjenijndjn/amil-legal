"""Domain and HTTP exception handlers for AMIL Legal Intelligence Platform."""

from __future__ import annotations

from typing import Any, Dict, Optional
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.logging import logger


class AmilError(Exception):
    """Base domain exception with clean HTTP status mapping and no confidential leakage."""

    def __init__(
        self,
        detail: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        error_code: str = "AMIL_ERROR",
        headers: Optional[Dict[str, str]] = None,
    ) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code
        self.error_code = error_code
        self.headers = headers


class AuthenticationError(AmilError):
    def __init__(self, detail: str = "Invalid or expired authentication credentials") -> None:
        super().__init__(
            detail=detail,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTH_UNAUTHORIZED",
            headers={"WWW-Authenticate": "Bearer"},
        )


class ResourceNotFoundError(AmilError):
    def __init__(self, detail: str = "Requested legal resource was not found") -> None:
        super().__init__(
            detail=detail,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="RESOURCE_NOT_FOUND",
        )


class ConflictError(AmilError):
    def __init__(self, detail: str = "Resource conflict") -> None:
        super().__init__(
            detail=detail,
            status_code=status.HTTP_409_CONFLICT,
            error_code="RESOURCE_CONFLICT",
        )


class ConsentRequiredError(AmilError):
    def __init__(
        self,
        detail: str = (
            "Explicit DPDP Act consent (ai_consent_granted=true) is required "
            "before processing private documents with external AI models."
        ),
    ) -> None:
        super().__init__(
            detail=detail,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="DPDP_CONSENT_REQUIRED",
        )


class DocumentValidationError(AmilError):
    def __init__(
        self,
        detail: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        error_code: str = "DOCUMENT_VALIDATION_ERROR",
    ) -> None:
        super().__init__(detail=detail, status_code=status_code, error_code=error_code)


def register_exception_handlers(app: FastAPI) -> None:
    """Attach standardized JSON exception handlers to the FastAPI app."""

    @app.exception_handler(AmilError)
    async def handle_amil_error(request: Request, exc: AmilError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.detail,
                "error_code": exc.error_code,
                "path": request.url.path,
            },
            headers=exc.headers or {},
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        sanitized_errors: list[Dict[str, Any]] = []
        for err in exc.errors():
            sanitized_errors.append(
                {
                    "loc": list(err.get("loc", [])),
                    "msg": err.get("msg", "Invalid value"),
                    "type": err.get("type", "value_error"),
                }
            )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": "Request validation failed",
                "error_code": "VALIDATION_ERROR",
                "errors": sanitized_errors,
            },
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        logger.error(
            f"Unhandled exception on {request.method} {request.url.path}: {type(exc).__name__}"
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "An unexpected internal error occurred. Confidential data was protected.",
                "error_code": "INTERNAL_SERVER_ERROR",
            },
        )
