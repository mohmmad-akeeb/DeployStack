import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.core.exceptions import EntityNotFoundException, ForbiddenException
from app.models.activity import ActivityLog
from app.models.user import User
from app.repositories.activity import ActivityRepository
from app.repositories.project import ProjectRepository
from app.repositories.task import TaskRepository
from app.schemas.activity import ActivityLogListResponse, ActivityLogResponse
from app.schemas.user import UserBriefResponse


class ActivityService:
    """Service encapsulating activity recording and chronological audit timeline queries."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.act_repo = ActivityRepository(db)
        self.proj_repo = ProjectRepository(db)
        self.task_repo = TaskRepository(db)

    def log_activity(
        self,
        project_id: uuid.UUID,
        action: str,
        entity_type: str,
        user_id: uuid.UUID | None = None,
        task_id: uuid.UUID | None = None,
        entity_id: uuid.UUID | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> ActivityLog:
        """Record an immutable audit log entry."""
        return self.act_repo.create(
            project_id=project_id,
            action=action,
            entity_type=entity_type,
            user_id=user_id,
            task_id=task_id,
            entity_id=entity_id,
            metadata=metadata or {},
        )

    def _to_response(self, item: ActivityLog) -> ActivityLogResponse:
        return ActivityLogResponse(
            id=item.id,
            project_id=item.project_id,
            task_id=item.task_id,
            user=UserBriefResponse.model_validate(item.user) if item.user else None,
            action=item.action,
            entity_type=item.entity_type,
            entity_id=item.entity_id,
            metadata=item.meta,
            created_at=item.created_at,
        )

    def list_project_activities(
        self,
        project_id: uuid.UUID,
        current_user: User,
        action: str | None = None,
        entity_type: str | None = None,
        user_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> ActivityLogListResponse:
        """List activities scoped to a project."""
        project = self.proj_repo.get_by_id(project_id)
        if not project:
            raise EntityNotFoundException("Project", project_id)

        if project.owner_id != current_user.id and not self.proj_repo.get_member(
            project.id, current_user.id
        ):
            raise ForbiddenException("Access to project activities forbidden")

        skip = (page - 1) * page_size
        items, total = self.act_repo.list_for_project(
            project_id=project_id,
            action=action,
            entity_type=entity_type,
            user_id=user_id,
            skip=skip,
            limit=page_size,
        )
        return ActivityLogListResponse(
            items=[self._to_response(a) for a in items],
            total=total,
            page=page,
            page_size=page_size,
        )

    def list_task_activities(
        self,
        task_id: uuid.UUID,
        current_user: User,
        page: int = 1,
        page_size: int = 20,
    ) -> ActivityLogListResponse:
        """List activities for a single task."""
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise EntityNotFoundException("Task", task_id)

        project = self.proj_repo.get_by_id(task.project_id)
        if not project or (
            project.owner_id != current_user.id
            and not self.proj_repo.get_member(project.id, current_user.id)
        ):
            raise ForbiddenException("Access to task activities forbidden")

        skip = (page - 1) * page_size
        items, total = self.act_repo.list_for_task(task_id, skip=skip, limit=page_size)
        return ActivityLogListResponse(
            items=[self._to_response(a) for a in items],
            total=total,
            page=page,
            page_size=page_size,
        )
