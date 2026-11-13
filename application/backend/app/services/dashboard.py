import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import EntityNotFoundException, ForbiddenException
from app.models.project import Project, ProjectMember
from app.models.task import Task, TaskAssignment
from app.models.user import User
from app.repositories.activity import ActivityRepository
from app.repositories.project import ProjectRepository
from app.schemas.activity import ActivityLogResponse
from app.schemas.dashboard import (
    DashboardStatsResponse,
    MemberWorkload,
    ProjectStatsResponse,
)
from app.schemas.user import UserBriefResponse


class DashboardService:
    """Service aggregating metrics and statistics for personal and project dashboards."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.proj_repo = ProjectRepository(db)
        self.act_repo = ActivityRepository(db)

    def get_user_dashboard_stats(self, current_user: User) -> DashboardStatsResponse:
        """Calculate personal metrics for authenticated user across assigned tasks and active workspaces."""
        now = datetime.now(UTC)
        seven_days_later = now + timedelta(days=7)

        # 1. Total assigned tasks & breakdown
        assigned_tasks_stmt = (
            select(Task)
            .join(TaskAssignment, Task.id == TaskAssignment.task_id)
            .where(TaskAssignment.user_id == current_user.id)
        )
        assigned_tasks = list(self.db.execute(assigned_tasks_stmt).scalars().all())

        tasks_by_status = {"todo": 0, "in_progress": 0, "completed": 0}
        tasks_by_priority = {"low": 0, "medium": 0, "high": 0, "urgent": 0}
        tasks_due_within_7_days = 0
        overdue_tasks_count = 0

        for t in assigned_tasks:
            if t.status in tasks_by_status:
                tasks_by_status[t.status] += 1
            if t.priority in tasks_by_priority:
                tasks_by_priority[t.priority] += 1

            if t.due_date:
                # Normalizing timezone for comparison
                due = t.due_date if t.due_date.tzinfo else t.due_date.replace(tzinfo=UTC)
                if t.status != "completed":
                    if due < now:
                        overdue_tasks_count += 1
                    elif now <= due <= seven_days_later:
                        tasks_due_within_7_days += 1

        # 2. Active projects count
        active_projects_stmt = (
            select(func.count(func.distinct(Project.id)))
            .outerjoin(ProjectMember, Project.id == ProjectMember.project_id)
            .where(
                Project.status == "active",
                or_(
                    Project.owner_id == current_user.id,
                    ProjectMember.user_id == current_user.id,
                ),
            )
        )
        active_projects_count = self.db.execute(active_projects_stmt).scalar() or 0

        # 3. Recent activities
        recent_logs = self.act_repo.list_recent_for_user(current_user.id, limit=10)
        recent_activities = [
            ActivityLogResponse(
                id=a.id,
                project_id=a.project_id,
                task_id=a.task_id,
                user=UserBriefResponse.model_validate(a.user) if a.user else None,
                action=a.action,
                entity_type=a.entity_type,
                entity_id=a.entity_id,
                metadata=a.meta,
                created_at=a.created_at,
            )
            for a in recent_logs
        ]

        return DashboardStatsResponse(
            total_assigned_tasks=len(assigned_tasks),
            tasks_by_status=tasks_by_status,
            tasks_by_priority=tasks_by_priority,
            tasks_due_within_7_days=tasks_due_within_7_days,
            overdue_tasks_count=overdue_tasks_count,
            active_projects_count=active_projects_count,
            recent_activities=recent_activities,
        )

    def get_project_stats(
        self,
        project_id: uuid.UUID,
        current_user: User,
    ) -> ProjectStatsResponse:
        """Calculate aggregated metrics, status breakdown, and workload for a project."""
        project = self.proj_repo.get_by_id(project_id)
        if not project:
            raise EntityNotFoundException("Project", project_id)

        if project.owner_id != current_user.id and not self.proj_repo.get_member(
            project.id, current_user.id
        ):
            raise ForbiddenException("Access to project statistics forbidden")

        now = datetime.now(UTC)

        # 1. Tasks aggregate
        tasks_stmt = select(Task).where(Task.project_id == project_id)
        tasks = list(self.db.execute(tasks_stmt).scalars().all())

        status_dist = {"todo": 0, "in_progress": 0, "completed": 0}
        priority_dist = {"low": 0, "medium": 0, "high": 0, "urgent": 0}
        overdue_count = 0

        for t in tasks:
            if t.status in status_dist:
                status_dist[t.status] += 1
            if t.priority in priority_dist:
                priority_dist[t.priority] += 1

            if t.due_date and t.status != "completed":
                due = t.due_date if t.due_date.tzinfo else t.due_date.replace(tzinfo=UTC)
                if due < now:
                    overdue_count += 1

        total_tasks = len(tasks)
        completed_ratio = (
            round(status_dist["completed"] / total_tasks, 3) if total_tasks > 0 else 0.0
        )

        # 2. Active members count
        members, member_total = self.proj_repo.list_members(project_id, skip=0, limit=200)

        # 3. Workload per member
        member_workload: list[MemberWorkload] = []
        for m in members:
            # Query tasks assigned to this member in this project
            assigned_stmt = (
                select(Task)
                .join(TaskAssignment, Task.id == TaskAssignment.task_id)
                .where(
                    Task.project_id == project_id,
                    TaskAssignment.user_id == m.user_id,
                )
            )
            member_tasks = list(self.db.execute(assigned_stmt).scalars().all())
            assigned_count = len(member_tasks)
            in_progress_count = sum(1 for t in member_tasks if t.status == "in_progress")
            completed_count = sum(1 for t in member_tasks if t.status == "completed")

            member_workload.append(
                MemberWorkload(
                    user=UserBriefResponse.model_validate(m.user),
                    assigned_count=assigned_count,
                    in_progress_count=in_progress_count,
                    completed_count=completed_count,
                )
            )

        return ProjectStatsResponse(
            project_id=project_id,
            total_tasks=total_tasks,
            status_distribution=status_dist,
            priority_distribution=priority_dist,
            overdue_tasks_count=overdue_count,
            completed_ratio=completed_ratio,
            active_members_count=member_total,
            member_workload=member_workload,
        )
