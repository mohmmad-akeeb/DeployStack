import re
import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def validate_email_address(v: str) -> str:
    """Validate RFC-compliant email string supporting custom development domains."""
    if not isinstance(v, str):
        raise ValueError("Email must be a string")
    normalized = v.strip().lower()
    if not EMAIL_REGEX.match(normalized):
        raise ValueError("Value is not a valid email address")
    return normalized


EmailAddress = Annotated[str, BeforeValidator(validate_email_address)]


class UserBase(BaseModel):
    """Base user properties shared across request/response models."""

    email: EmailAddress = Field(..., description="User unique email address")
    full_name: str = Field(..., min_length=1, max_length=100, description="User full display name")


class UserRegisterRequest(UserBase):
    """User registration payload."""

    password: str = Field(..., description="Plaintext password")


class UserProfileUpdateRequest(BaseModel):
    """User profile update payload."""

    full_name: str | None = Field(default=None, min_length=1, max_length=100)
    avatar_url: str | None = Field(default=None, max_length=500)


class UserChangePasswordRequest(BaseModel):
    """User password change payload."""

    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., description="New password complying with complexity rules")


class UserBriefResponse(BaseModel):
    """Minimal user profile representation embedded in related domain entities."""

    id: uuid.UUID
    email: str
    full_name: str
    avatar_url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UserResponse(BaseModel):
    """Full user profile representation."""

    id: uuid.UUID
    email: str
    full_name: str
    avatar_url: str | None = None
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    """Login credentials payload."""

    email: EmailAddress
    password: str


class TokenResponse(BaseModel):
    """JWT bearer token response."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int = 3600
    user: UserResponse
