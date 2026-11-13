import pytest

from app.core.exceptions import BadRequestException
from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    validate_password_complexity,
    verify_password,
)


def test_password_hashing_and_verification() -> None:
    """Verify that bcrypt password hashing and verification work reliably."""
    password = "SuperSecretPassword123!"
    hashed = get_password_hash(password)
    assert hashed != password
    assert hashed.startswith("$2b$12$")
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_password_complexity_valid() -> None:
    """Verify valid passwords pass complexity check."""
    validate_password_complexity("SecureP@ssw0rd!")
    validate_password_complexity("Alex#Dev2026")


def test_password_complexity_failures() -> None:
    """Verify passwords missing required sets raise BadRequestException."""
    # Too short
    with pytest.raises(BadRequestException, match="between 8 and 128 characters"):
        validate_password_complexity("Short1!")

    # Missing uppercase
    with pytest.raises(BadRequestException, match="uppercase letter"):
        validate_password_complexity("lowercase123!")

    # Missing lowercase
    with pytest.raises(BadRequestException, match="lowercase letter"):
        validate_password_complexity("UPPERCASE123!")

    # Missing digit
    with pytest.raises(BadRequestException, match="numeric digit"):
        validate_password_complexity("NoDigitsHere!")

    # Missing special character
    with pytest.raises(BadRequestException, match="special symbol"):
        validate_password_complexity("NoSpecialChar123")


def test_jwt_generation_and_decoding() -> None:
    """Verify JWT issuance and decoding."""
    user_id = "123e4567-e89b-12d3-a456-426614174000"
    token = create_access_token(
        subject=user_id,
        extra_claims={"email": "alex@deploystack.local", "name": "Alex Developer"},
    )
    payload = decode_access_token(token)
    assert payload is not None
    assert payload.get("sub") == user_id
    assert payload.get("email") == "alex@deploystack.local"
    assert payload.get("name") == "Alex Developer"
    assert payload.get("type") == "access"
    assert "exp" in payload
    assert "iat" in payload
