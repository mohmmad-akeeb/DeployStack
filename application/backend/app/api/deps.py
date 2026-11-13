import uuid
from typing import Annotated

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_access_token
from app.models.user import User
from app.repositories.user import UserRepository

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False,
)


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    token: Annotated[str | None, Depends(reusable_oauth2)],
) -> User:
    """Dependency that decodes and validates the Bearer token and returns the User."""
    if not token:
        raise UnauthorizedException("Authentication token is missing")

    payload = decode_access_token(token)
    if not payload:
        raise UnauthorizedException("Invalid or expired token")

    subject = payload.get("sub")
    if not subject:
        raise UnauthorizedException("Token payload missing subject identifier")

    try:
        user_id = uuid.UUID(subject)
    except (ValueError, TypeError):
        raise UnauthorizedException("Invalid user identifier in token") from None

    user_repo = UserRepository(db)
    user = user_repo.get_by_id(user_id)
    if not user:
        raise UnauthorizedException("User not found")

    if not user.is_active:
        raise UnauthorizedException("User account is inactive")

    return user


def get_current_active_superuser(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Dependency ensuring caller possesses platform superuser privileges."""
    if not current_user.is_superuser:
        raise ForbiddenException("Superuser privileges required")
    return current_user


__all__ = [
    "get_current_active_superuser",
    "get_current_user",
    "get_db",
    "reusable_oauth2",
]
