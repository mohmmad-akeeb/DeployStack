import re
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings
from app.core.exceptions import BadRequestException


def validate_password_complexity(password: str) -> None:
    """Validate that password meets enterprise security standards.

    Rules:
    - Minimum 8 characters, maximum 128 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 numeric digit
    - At least 1 special symbol
    """
    if len(password) < 8 or len(password) > 128:
        raise BadRequestException("Password must be between 8 and 128 characters long")
    if not re.search(r"[A-Z]", password):
        raise BadRequestException("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        raise BadRequestException("Password must contain at least one lowercase letter")
    if not re.search(r"\d", password):
        raise BadRequestException("Password must contain at least one numeric digit")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_=+[\]\\/`~;']", password):
        raise BadRequestException("Password must contain at least one special symbol")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password string against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Generate bcrypt password hash with work factor 12."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def create_access_token(
    subject: str | Any,
    expires_delta: timedelta | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """Generate a signed stateless JWT access token (RFC 7519, HS256)."""
    now = datetime.now(UTC)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": now,
        "type": "access",
    }
    if extra_claims:
        to_encode.update(extra_claims)

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError:
        return None
