from sqlalchemy.orm import Session

from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    UnauthorizedException,
)
from app.core.security import (
    create_access_token,
    get_password_hash,
    validate_password_complexity,
    verify_password,
)
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserRegisterRequest


class AuthService:
    """Service encapsulating authentication, registration, and user credential management."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.user_repo = UserRepository(db)

    def register_user(self, data: UserRegisterRequest) -> User:
        """Register a new user account with enterprise security validation."""
        validate_password_complexity(data.password)

        existing_user = self.user_repo.get_by_email(data.email)
        if existing_user:
            raise ConflictException(
                message=f"Email '{data.email}' is already registered",
                detail=[{"field": "email", "issue": "EmailAlreadyExists"}],
            )

        hashed_password = get_password_hash(data.password)
        user = self.user_repo.create(
            email=data.email,
            hashed_password=hashed_password,
            full_name=data.full_name,
        )
        self.db.commit()
        self.db.refresh(user)
        return user

    def authenticate_user(self, email: str, password: str) -> tuple[str, User]:
        """Authenticate user credentials and generate signed JWT access token."""
        user = self.user_repo.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise UnauthorizedException("Invalid email or password")

        if not user.is_active:
            raise UnauthorizedException("User account is inactive")

        access_token = create_access_token(
            subject=user.id,
            extra_claims={
                "email": user.email,
                "name": user.full_name,
            },
        )
        return access_token, user

    def update_profile(
        self,
        user: User,
        full_name: str | None = None,
        avatar_url: str | None = None,
    ) -> User:
        """Update authenticated user profile information."""
        if full_name is not None:
            user.full_name = full_name.strip()
        if avatar_url is not None:
            user.avatar_url = avatar_url.strip() or None

        self.user_repo.update(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def change_password(
        self,
        user: User,
        current_password: str,
        new_password: str,
    ) -> None:
        """Change authenticated user password after verifying current password."""
        if not verify_password(current_password, user.hashed_password):
            raise BadRequestException("Current password is incorrect")

        validate_password_complexity(new_password)

        user.hashed_password = get_password_hash(new_password)
        self.user_repo.update(user)
        self.db.commit()
