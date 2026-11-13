import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.task import Task
    from app.models.user import User


class ActivityLog(Base):
    """Append-only audit trail capturing operations within projects."""

    __tablename__ = "activity_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
    )
    action: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    entity_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    entity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        default=None,
    )
    meta: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSONB,
        default=dict,
        server_default="{}",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="activity_logs",
    )
    task: Mapped["Task | None"] = relationship(
        "Task",
        back_populates="activity_logs",
    )
    user: Mapped["User | None"] = relationship(
        "User",
        back_populates="activity_logs",
    )

    __table_args__ = (
        CheckConstraint(
            "entity_type IN ('project', 'task', 'member', 'assignment', 'attachment')",
            name="ck_act_entity_type",
        ),
        Index("idx_act_project_created", "project_id", created_at.desc()),
        Index(
            "idx_act_task_created",
            "task_id",
            created_at.desc(),
            postgresql_where=task_id.isnot(None),
        ),
        Index(
            "idx_act_user_created",
            "user_id",
            created_at.desc(),
            postgresql_where=user_id.isnot(None),
        ),
        Index("idx_act_metadata_gin", "metadata", postgresql_using="gin"),
    )
