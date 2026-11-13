import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.activity import ActivityLog


class ActivityRepository:
    """Data access repository for append-only ActivityLog audit trail."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        project_id: uuid.UUID,
        action: str,
        entity_type: str,
        user_id: uuid.UUID | None = None,
        task_id: uuid.UUID | None = None,
        entity_id: uuid.UUID | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> ActivityLog:
        """Create and persist an activity log entry."""
        log = ActivityLog(
            project_id=project_id,
            task_id=task_id,
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            meta=metadata or {},
        )
        self.db.add(log)
        self.db.flush()
        return log

    def list_for_project(
        self,
        project_id: uuid.UUID,
        action: str | None = None,
        entity_type: str | None = None,
        user_id: uuid.UUID | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[ActivityLog], int]:
        """List activities scoped to a project with filtering and pagination."""
        base_query = select(ActivityLog).where(ActivityLog.project_id == project_id)

        if action:
            base_query = base_query.where(ActivityLog.action == action)
        if entity_type:
            base_query = base_query.where(ActivityLog.entity_type == entity_type)
        if user_id:
            base_query = base_query.where(ActivityLog.user_id == user_id)

        count_stmt = select(func.count(ActivityLog.id)).where(
            ActivityLog.project_id == project_id
        )
        if action:
            count_stmt = count_stmt.where(ActivityLog.action == action)
        if entity_type:
            count_stmt = count_stmt.where(ActivityLog.entity_type == entity_type)
        if user_id:
            count_stmt = count_stmt.where(ActivityLog.user_id == user_id)

        total = self.db.execute(count_stmt).scalar() or 0

        fetch_stmt = (
            base_query.options(joinedload(ActivityLog.user))
            .order_by(ActivityLog.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        items = list(self.db.execute(fetch_stmt).scalars().all())
        return items, total

    def list_for_task(
        self,
        task_id: uuid.UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[ActivityLog], int]:
        """List activities for a single task."""
        count_stmt = select(func.count(ActivityLog.id)).where(ActivityLog.task_id == task_id)
        total = self.db.execute(count_stmt).scalar() or 0

        fetch_stmt = (
            select(ActivityLog)
            .options(joinedload(ActivityLog.user))
            .where(ActivityLog.task_id == task_id)
            .order_by(ActivityLog.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        items = list(self.db.execute(fetch_stmt).scalars().all())
        return items, total

    def list_recent_for_user(self, user_id: uuid.UUID, limit: int = 10) -> list[ActivityLog]:
        """List most recent activities initiated by a user across all projects."""
        stmt = (
            select(ActivityLog)
            .options(joinedload(ActivityLog.user))
            .where(ActivityLog.user_id == user_id)
            .order_by(ActivityLog.created_at.desc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())
