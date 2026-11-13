import math
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import EmailAddress, UserBriefResponse


class ProjectCreateRequest(BaseModel):
    """Payload for creating a new project workspace."""

    name: str = Field(..., min_length=1, max_length=150, description="Project workspace name")
    description: str | None = Field(default=None, description="Detailed project description")
    status: str = Field(default="active", description="Initial workspace status ('active', 'archived', 'completed')")


class ProjectUpdateRequest(BaseModel):
    """Payload for updating project metadata."""

    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = None
    status: str | None = Field(default=None, description="'active', 'archived', or 'completed'")


class ProjectResponse(BaseModel):
    """Standard project summary representation."""

    id: uuid.UUID
    name: str
    description: str | None = None
    status: str
    owner: UserBriefResponse
    member_count: int = 1
    task_count: int = 0
    current_user_role: str = "member"
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ProjectListResponse(BaseModel):
    """Paginated list of projects."""

    items: list[ProjectResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

    @classmethod
    def create(
        cls,
        items: list[ProjectResponse],
        total: int,
        page: int,
        page_size: int,
    ) -> "ProjectListResponse":
        total_pages = math.ceil(total / page_size) if page_size > 0 else 1
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages if total_pages > 0 else 1,
        )


class ProjectMemberAddRequest(BaseModel):
    """Payload to add a user to project workspace."""

    email: EmailAddress
    role: str = Field(default="member", description="'admin', 'member', or 'viewer'")


class ProjectMemberRoleUpdateRequest(BaseModel):
    """Payload to update an existing member's role."""

    role: str = Field(..., description="'admin', 'member', or 'viewer'")


class ProjectMemberResponse(BaseModel):
    """Representation of a project member and their role."""

    project_id: uuid.UUID
    user: UserBriefResponse
    role: str
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectMemberListResponse(BaseModel):
    """Paginated or listed members response."""

    items: list[ProjectMemberResponse]
    total: int
    page: int = 1
    page_size: int = 50

    model_config = ConfigDict(from_attributes=True)
