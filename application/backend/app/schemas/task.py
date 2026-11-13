import math
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserBriefResponse


class TaskAssigneeResponse(BaseModel):
    """Representation of a user assigned to a task."""

    task_id: uuid.UUID
    user: UserBriefResponse
    role: str = "assignee"
    assigned_by: UserBriefResponse | None = None
    assigned_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskAttachmentBriefResponse(BaseModel):
    """Brief attachment info embedded inside task details."""

    id: uuid.UUID
    file_name: str
    file_size: int
    content_type: str
    uploader_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskCreateRequest(BaseModel):
    """Payload for creating a new task."""

    project_id: uuid.UUID
    title: str = Field(..., min_length=1, max_length=200, description="Task summary")
    description: str | None = None
    status: str = Field(default="todo", description="'todo', 'in_progress', 'completed'")
    priority: str = Field(default="medium", description="'low', 'medium', 'high', 'urgent'")
    position: int = Field(default=0, ge=0)
    due_date: datetime | None = None
    assigned_user_ids: list[uuid.UUID] = Field(default_factory=list)


class TaskUpdateRequest(BaseModel):
    """Payload for updating task details."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    priority: str | None = Field(default=None, description="'low', 'medium', 'high', 'urgent'")
    due_date: datetime | None = None


class TaskStatusUpdateRequest(BaseModel):
    """Payload for transitioning task status and vertical board position."""

    status: str = Field(..., description="'todo', 'in_progress', 'completed'")
    position: int = Field(default=0, ge=0)


class TaskAssignRequest(BaseModel):
    """Payload for assigning team members to a task."""

    user_ids: list[uuid.UUID]
    role: str = Field(default="assignee", description="'assignee', 'reviewer', 'watcher'")


class TaskDetailResponse(BaseModel):
    """Complete task representation."""

    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    description: str | None = None
    status: str
    priority: str
    position: int
    due_date: datetime | None = None
    created_by: UserBriefResponse
    assignees: list[TaskAssigneeResponse] = Field(default_factory=list)
    attachments: list[TaskAttachmentBriefResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskListResponse(BaseModel):
    """Paginated task list."""

    items: list[TaskDetailResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

    @classmethod
    def create(
        cls,
        items: list[TaskDetailResponse],
        total: int,
        page: int,
        page_size: int,
    ) -> "TaskListResponse":
        total_pages = math.ceil(total / page_size) if page_size > 0 else 1
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages if total_pages > 0 else 1,
        )
