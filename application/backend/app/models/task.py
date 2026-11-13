import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.activity import ActivityLog
    from app.models.attachment import Attachment
    from app.models.project import Project
    from app.models.user import User


class Task(Base):
    """Task work item entity managed on the Kanban board."""

    __tablename__ = "tasks"

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
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default=None,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="todo",
        server_default="todo",
        nullable=False,
    )
    priority: Mapped[str] = mapped_column(
        String(50),
        default="medium",
        server_default="medium",
        nullable=False,
    )
    position: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )
    due_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="tasks",
    )
    creator: Mapped["User"] = relationship(
        "User",
        back_populates="created_tasks",
        foreign_keys=[created_by],
    )
    assignments: Mapped[list["TaskAssignment"]] = relationship(
        "TaskAssignment",
        back_populates="task",
        cascade="all, delete-orphan",
    )
    attachments: Mapped[list["Attachment"]] = relationship(
        "Attachment",
        back_populates="task",
        cascade="all, delete-orphan",
    )
    activity_logs: Mapped[list["ActivityLog"]] = relationship(
        "ActivityLog",
        back_populates="task",
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('todo', 'in_progress', 'completed')",
            name="ck_tasks_status",
        ),
        CheckConstraint(
            "priority IN ('low', 'medium', 'high', 'urgent')",
            name="ck_tasks_priority",
        ),
        CheckConstraint(
            "position >= 0",
            name="ck_tasks_position",
        ),
        Index("idx_tasks_kanban", "project_id", "status", "position"),
        Index("idx_tasks_project_created", "project_id", created_at.desc()),
        Index("idx_tasks_created_by", "created_by"),
        Index(
            "idx_tasks_due_date",
            "due_date",
            postgresql_where=due_date.isnot(None),
        ),
    )


class TaskAssignment(Base):
    """Decoupled Many-to-Many junction entity allocating tasks to users."""

    __tablename__ = "task_assignments"

    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    assigned_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
    )
    role: Mapped[str] = mapped_column(
        String(50),
        default="assignee",
        server_default="assignee",
        nullable=False,
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    task: Mapped["Task"] = relationship(
        "Task",
        back_populates="assignments",
    )
    user: Mapped["User"] = relationship(
        "User",
        back_populates="task_assignments",
        foreign_keys=[user_id],
    )
    assigner: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[assigned_by],
    )

    __table_args__ = (
        CheckConstraint(
            "role IN ('assignee', 'reviewer', 'watcher')",
            name="ck_ta_role",
        ),
        Index("idx_ta_user_id", "user_id"),
        Index("idx_ta_assigned_by", "assigned_by"),
    )
