import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    """Data access repository for User entities."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, user_id: uuid.UUID) -> User | None:
        """Fetch user by primary key UUID."""
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        """Fetch user by case-insensitive email."""
        stmt = select(User).where(func.lower(User.email) == email.lower().strip())
        return self.db.execute(stmt).scalar_one_or_none()

    def create(
        self,
        email: str,
        hashed_password: str,
        full_name: str,
        avatar_url: str | None = None,
        is_active: bool = True,
        is_superuser: bool = False,
    ) -> User:
        """Create and persist a new User entity."""
        user = User(
            email=email.lower().strip(),
            hashed_password=hashed_password,
            full_name=full_name.strip(),
            avatar_url=avatar_url,
            is_active=is_active,
            is_superuser=is_superuser,
        )
        self.db.add(user)
        self.db.flush()
        return user

    def update(self, user: User) -> User:
        """Update and flush an existing user entity."""
        self.db.add(user)
        self.db.flush()
        return user
