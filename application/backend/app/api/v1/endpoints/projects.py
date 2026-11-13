import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.activity import ActivityLogListResponse
from app.schemas.dashboard import ProjectStatsResponse
from app.schemas.project import (
    ProjectCreateRequest,
    ProjectListResponse,
    ProjectMemberAddRequest,
    ProjectMemberListResponse,
    ProjectMemberResponse,
    ProjectMemberRoleUpdateRequest,
    ProjectResponse,
    ProjectUpdateRequest,
)
from app.services.activity import ActivityService
from app.services.dashboard import DashboardService
from app.services.project import ProjectService

router = APIRouter()


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Project",
    description="Creates a new workspace project. Caller is automatically assigned as Owner.",
)
def create_project(
    payload: ProjectCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectResponse:
    service = ProjectService(db)
    return service.create_project(payload, current_user)


@router.get(
    "",
    response_model=ProjectListResponse,
    summary="List Projects",
    description="List projects where caller is Owner or Member with filtering and pagination.",
)
def list_projects(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    status: str | None = Query(default=None, description="Filter by status ('active', 'archived', 'completed')"),
    search: str | None = Query(default=None, description="Search keyword in project name or description"),
    page: int = Query(default=1, ge=1, description="Page index"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
) -> ProjectListResponse:
    service = ProjectService(db)
    return service.list_projects(
        current_user=current_user,
        status=status,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{id}",
    response_model=ProjectResponse,
    summary="Get Project Details",
    description="Retrieve complete metadata for a project. Caller must be a member or owner.",
)
def get_project(
    id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectResponse:
    service = ProjectService(db)
    return service.get_project_detail(id, current_user)


@router.put(
    "/{id}",
    response_model=ProjectResponse,
    summary="Update Project",
    description="Update project name, description, or status. Restricted to Project Owner or Admin.",
)
def update_project(
    id: uuid.UUID,
    payload: ProjectUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectResponse:
    service = ProjectService(db)
    return service.update_project(id, payload, current_user)


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Project",
    description="Permanently delete project workspace. Restricted strictly to Project Owner.",
)
def delete_project(
    id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    service = ProjectService(db)
    service.delete_project(id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Membership Routes
@router.get(
    "/{id}/members",
    response_model=ProjectMemberListResponse,
    summary="List Project Members",
    description="List all members enrolled in the project workspace with their assigned roles.",
)
def list_members(
    id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
) -> ProjectMemberListResponse:
    service = ProjectService(db)
    return service.list_members(id, current_user, page=page, page_size=page_size)


@router.post(
    "/{id}/members",
    response_model=ProjectMemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Project Member",
    description="Add a registered user to the project by email with a designated role. Restricted to Owner or Admin.",
)
def add_member(
    id: uuid.UUID,
    payload: ProjectMemberAddRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectMemberResponse:
    service = ProjectService(db)
    return service.add_member(id, payload.email, payload.role, current_user)


@router.put(
    "/{id}/members/{user_id}/role",
    response_model=ProjectMemberResponse,
    summary="Update Member Role",
    description="Update a member's role ('admin', 'member', 'viewer'). Restricted strictly to Project Owner.",
)
def update_member_role(
    id: uuid.UUID,
    user_id: uuid.UUID,
    payload: ProjectMemberRoleUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectMemberResponse:
    service = ProjectService(db)
    return service.update_member_role(id, user_id, payload.role, current_user)


@router.delete(
    "/{id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove Project Member",
    description="Remove user from project. Restricted to Project Owner, Admin, or user leaving voluntarily.",
)
def remove_member(
    id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    service = ProjectService(db)
    service.remove_member(id, user_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Project Activity Audit Route
@router.get(
    "/{id}/activities",
    response_model=ActivityLogListResponse,
    summary="List Project Activities",
    description="Chronological descending audit feed of operations inside a project workspace.",
)
def list_project_activities(
    id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    action: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    user_id: uuid.UUID | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> ActivityLogListResponse:
    service = ActivityService(db)
    return service.list_project_activities(
        project_id=id,
        current_user=current_user,
        action=action,
        entity_type=entity_type,
        user_id=user_id,
        page=page,
        page_size=page_size,
    )


# Project Statistics Route
@router.get(
    "/{id}/stats",
    response_model=ProjectStatsResponse,
    summary="Get Project Statistics",
    description="Aggregate project status breakdown, priority distribution, overdue count, and member workloads.",
)
def get_project_stats(
    id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectStatsResponse:
    service = DashboardService(db)
    return service.get_project_stats(id, current_user)


