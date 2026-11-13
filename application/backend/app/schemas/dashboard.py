import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.activity import ActivityLogResponse
from app.schemas.user import UserBriefResponse


class MemberWorkload(BaseModel):
    """Team member task distribution summary."""

    user: UserBriefResponse
    assigned_count: int = 0
    in_progress_count: int = 0
    completed_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class DashboardStatsResponse(BaseModel):
    """Personal cross-project dashboard metrics."""

    total_assigned_tasks: int = 0
    tasks_by_status: dict[str, int] = Field(
        default_factory=lambda: {"todo": 0, "in_progress": 0, "completed": 0}
    )
    tasks_by_priority: dict[str, int] = Field(
        default_factory=lambda: {"low": 0, "medium": 0, "high": 0, "urgent": 0}
    )
    tasks_due_within_7_days: int = 0
    overdue_tasks_count: int = 0
    active_projects_count: int = 0
    recent_activities: list[ActivityLogResponse] = Field(default_factory=list)


class ProjectStatsResponse(BaseModel):
    """Project-level aggregate metrics and member workload."""

    project_id: uuid.UUID
    total_tasks: int = 0
    status_distribution: dict[str, int] = Field(
        default_factory=lambda: {"todo": 0, "in_progress": 0, "completed": 0}
    )
    priority_distribution: dict[str, int] = Field(
        default_factory=lambda: {"low": 0, "medium": 0, "high": 0, "urgent": 0}
    )
    overdue_tasks_count: int = 0
    completed_ratio: float = 0.0
    active_members_count: int = 0
    member_workload: list[MemberWorkload] = Field(default_factory=list)
