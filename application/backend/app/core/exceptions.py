"""DeployStack Core Domain Exceptions."""

from typing import Any


class AppException(Exception):
    """Base application exception."""

    def __init__(
        self,
        message: str,
        status_code: int = 400,
        error: str | None = None,
        detail: list[dict[str, Any]] | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error = error
        self.detail = detail or []
        self.headers = headers


class EntityNotFoundException(AppException):
    """Raised when a requested resource does not exist."""

    def __init__(
        self,
        entity_name: str,
        entity_id: Any,
        message: str | None = None,
    ) -> None:
        msg = message or f"{entity_name} with ID '{entity_id}' was not found"
        super().__init__(
            message=msg,
            status_code=404,
            error="Not Found",
            detail=[{"field": "id", "issue": "EntityNotFound"}],
        )


class BadRequestException(AppException):
    """Raised when client input violates domain validation rules."""

    def __init__(self, message: str, detail: list[dict[str, Any]] | None = None) -> None:
        super().__init__(
            message=message,
            status_code=400,
            error="Bad Request",
            detail=detail,
        )


class UnauthorizedException(AppException):
    """Raised when authentication credentials are missing or invalid."""

    def __init__(
        self,
        message: str = "Could not validate credentials",
        headers: dict[str, str] | None = None,
    ) -> None:
        auth_headers = headers or {"WWW-Authenticate": "Bearer"}
        super().__init__(
            message=message,
            status_code=401,
            error="Unauthorized",
            headers=auth_headers,
        )


class ForbiddenException(AppException):
    """Raised when an authenticated user lacks permissions for a project or action."""

    def __init__(self, message: str = "Access forbidden for current user permissions") -> None:
        super().__init__(
            message=message,
            status_code=403,
            error="Forbidden",
        )


class ConflictException(AppException):
    """Raised on state or uniqueness conflicts (e.g., duplicate email or membership)."""

    def __init__(self, message: str, detail: list[dict[str, Any]] | None = None) -> None:
        super().__init__(
            message=message,
            status_code=409,
            error="Conflict",
            detail=detail,
        )


class PayloadTooLargeException(AppException):
    """Raised when an uploaded file exceeds the maximum allowed payload size."""

    def __init__(self, message: str = "File size exceeds the 10MB limit") -> None:
        super().__init__(
            message=message,
            status_code=413,
            error="Payload Too Large",
        )


class UnsupportedMediaTypeException(AppException):
    """Raised when an uploaded file MIME type is disallowed."""

    def __init__(self, message: str = "Disallowed media type") -> None:
        super().__init__(
            message=message,
            status_code=415,
            error="Unsupported Media Type",
        )
