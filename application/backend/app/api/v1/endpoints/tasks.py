import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.activity import ActivityLogListResponse
from app.schemas.attachment import AttachmentResponse
from app.schemas.task import (
    TaskAssigneeResponse,
    TaskAssignRequest,
    TaskCreateRequest,
    TaskDetailResponse,
    TaskListResponse,
    TaskStatusUpdateRequest,
    TaskUpdateRequest,
)
from app.services.activity import ActivityService
from app.services.attachment import AttachmentService
from app.services.task import TaskService

router = APIRouter()


@router.post(
    "",
    response_model=TaskDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Task",
    description="Creates a new task work item within a project.",
)
def create_task(
    payload: TaskCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> TaskDetailResponse:
    service = TaskService(db)
    return service.create_task(payload, current_user)


@router.get(
    "",
    response_model=TaskListResponse,
    summary="List Tasks",
    description="List tasks within a project filtered by column status, priority, or assignee.",
)
def list_tasks(
    project_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    status: str | None = Query(default=None, description="'todo', 'in_progress', 'completed'"),
    priority: str | None = Query(default=None, description="'low', 'medium', 'high', 'urgent'"),
    assignee_id: uuid.UUID | None = Query(default=None, description="Filter by assigned user UUID"),
    search: str | None = Query(default=None, description="Search keyword in title or description"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
) -> TaskListResponse:
    service = TaskService(db)
    return service.list_tasks(
        project_id=project_id,
        current_user=current_user,
        status=status,
        priority=priority,
        assignee_id=assignee_id,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{id}",
    response_model=TaskDetailResponse,
    summary="Get Task Details",
    description="Retrieve complete task details, assignees, and attachments.",
)
def get_task(
    id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> TaskDetailResponse:
    service = TaskService(db)
    return service.get_task(id, current_user)


@router.put(
    "/{id}",
    response_model=TaskDetailResponse,
    summary="Update Task",
    description="Update task title, description, priority, or due date.",
)
def update_task(
    id: uuid.UUID,
    payload: TaskUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> TaskDetailResponse:
    service = TaskService(db)
    return service.update_task(id, payload, current_user)


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Task",
    description="Permanently delete a task card. Restricted to Project Owner, Admin, or author.",
)
def delete_task(
    id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    service = TaskService(db)
    service.delete_task(id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch(
    "/{id}/status",
    response_model=TaskDetailResponse,
    summary="Transition Task Status / Kanban Move",
    description="Transition task across Kanban columns and update vertical board position.",
)
def update_task_status(
    id: uuid.UUID,
    payload: TaskStatusUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> TaskDetailResponse:
    service = TaskService(db)
    return service.update_task_status(id, payload.status, payload.position, current_user)


# Decoupled Task Assignment Endpoints
@router.get(
    "/{id}/assignments",
    response_model=list[TaskAssigneeResponse],
    summary="List Task Assignments",
    description="List all members assigned to work on the task.",
)
def list_assignments(
    id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[TaskAssigneeResponse]:
    service = TaskService(db)
    return service.list_assignments(id, current_user)


@router.post(
    "/{id}/assignments",
    response_model=list[TaskAssigneeResponse],
    summary="Assign Members to Task",
    description="Assign one or more verified project members to the task.",
)
def assign_users(
    id: uuid.UUID,
    payload: TaskAssignRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[TaskAssigneeResponse]:
    service = TaskService(db)
    return service.assign_users(id, payload.user_ids, payload.role, current_user)


@router.delete(
    "/{id}/assignments/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove Task Assignment",
    description="Remove user assignment from task.",
)
def remove_assignment(
    id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    service = TaskService(db)
    service.remove_assignment(id, user_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# File Attachment Routes
@router.post(
    "/{id}/attachments",
    response_model=AttachmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload File Attachment",
    description="Upload a binary file attachment to a task (max 10MB).",
)
def upload_attachment(
    id: uuid.UUID,
    file: UploadFile,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AttachmentResponse:
    service = AttachmentService(db)
    return service.upload_attachment(
        task_id=id,
        file_name=file.filename or "attachment",
        content_type=file.content_type or "application/octet-stream",
        file_stream=file.file,
        current_user=current_user,
    )


@router.get(
    "/{id}/attachments",
    response_model=list[AttachmentResponse],
    summary="List Task Attachments",
    description="List all attachments attached to a task card.",
)
def list_task_attachments(
    id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[AttachmentResponse]:
    service = AttachmentService(db)
    return service.list_attachments(id, current_user)


@router.get(
    "/{id}/activities",
    response_model=ActivityLogListResponse,
    summary="List Task Activities",
    description="Chronological audit history specifically for a single task work item.",
)
def list_task_activities(
    id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
) -> ActivityLogListResponse:
    service = ActivityService(db)
    return service.list_task_activities(
        task_id=id,
        current_user=current_user,
        page=page,
        page_size=page_size,
    )


