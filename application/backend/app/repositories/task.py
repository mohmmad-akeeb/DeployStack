import builtins
import uuid
from datetime import datetime

from sqlalchemy import distinct, func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.task import Task, TaskAssignment


class TaskRepository:
    """Data access repository for Task and TaskAssignment entities."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, task_id: uuid.UUID) -> Task | None:
        """Fetch task by ID with relationships preloaded."""
        stmt = (
            select(Task)
            .options(
                joinedload(Task.creator),
                selectinload(Task.assignments).joinedload(TaskAssignment.user),
                selectinload(Task.assignments).joinedload(TaskAssignment.assigner),
                selectinload(Task.attachments),
            )
            .where(Task.id == task_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def list(
        self,
        project_id: uuid.UUID,
        status: str | None = None,
        priority: str | None = None,
        assignee_id: uuid.UUID | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[builtins.list[Task], int]:
        """List tasks within a project with optional filters and pagination."""
        base_query = select(Task).distinct().where(Task.project_id == project_id)

        if status:
            base_query = base_query.where(Task.status == status)

        if priority:
            base_query = base_query.where(Task.priority == priority)

        if assignee_id:
            base_query = base_query.join(TaskAssignment, Task.id == TaskAssignment.task_id).where(
                TaskAssignment.user_id == assignee_id
            )

        if search:
            search_pattern = f"%{search.strip().lower()}%"
            base_query = base_query.where(
                or_(
                    func.lower(Task.title).like(search_pattern),
                    func.lower(Task.description).like(search_pattern),
                )
            )

        # Count total
        subq = base_query.subquery()
        count_stmt = select(func.count(distinct(subq.c.id)))
        total = self.db.execute(count_stmt).scalar() or 0

        # Fetch with ordering by position ascending, created_at descending
        fetch_stmt = (
            base_query.options(
                joinedload(Task.creator),
                selectinload(Task.assignments).joinedload(TaskAssignment.user),
                selectinload(Task.assignments).joinedload(TaskAssignment.assigner),
                selectinload(Task.attachments),
            )
            .order_by(Task.position.asc(), Task.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        tasks = list(self.db.execute(fetch_stmt).unique().scalars().all())
        return tasks, total

    def create(
        self,
        project_id: uuid.UUID,
        title: str,
        created_by: uuid.UUID,
        description: str | None = None,
        status: str = "todo",
        priority: str = "medium",
        position: int = 0,
        due_date: datetime | None = None,
    ) -> Task:
        """Create a new task entity."""
        task = Task(
            project_id=project_id,
            title=title.strip(),
            created_by=created_by,
            description=description.strip() if description else None,
            status=status,
            priority=priority,
            position=position,
            due_date=due_date,
        )
        self.db.add(task)
        self.db.flush()
        return task

    def update(self, task: Task) -> Task:
        """Update and flush task entity."""
        self.db.add(task)
        self.db.flush()
        return task

    def delete(self, task: Task) -> None:
        """Delete task entity."""
        self.db.delete(task)
        self.db.flush()

    # Assignment Operations
    def get_assignment(self, task_id: uuid.UUID, user_id: uuid.UUID) -> TaskAssignment | None:
        """Fetch task assignment by composite key."""
        stmt = (
            select(TaskAssignment)
            .options(
                joinedload(TaskAssignment.user),
                joinedload(TaskAssignment.assigner),
            )
            .where(
                TaskAssignment.task_id == task_id,
                TaskAssignment.user_id == user_id,
            )
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def add_assignment(
        self,
        task_id: uuid.UUID,
        user_id: uuid.UUID,
        assigned_by: uuid.UUID | None = None,
        role: str = "assignee",
    ) -> TaskAssignment:
        """Create and persist task assignment."""
        assignment = TaskAssignment(
            task_id=task_id,
            user_id=user_id,
            assigned_by=assigned_by,
            role=role,
        )
        self.db.add(assignment)
        self.db.flush()
        return assignment

    def remove_assignment(self, assignment: TaskAssignment) -> None:
        """Delete assignment."""
        self.db.delete(assignment)
        self.db.flush()

    def list_assignments(self, task_id: uuid.UUID) -> builtins.list[TaskAssignment]:
        """List all assignments for a task."""
        stmt = (
            select(TaskAssignment)
            .options(
                joinedload(TaskAssignment.user),
                joinedload(TaskAssignment.assigner),
            )
            .where(TaskAssignment.task_id == task_id)
            .order_by(TaskAssignment.assigned_at.asc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def is_assigned(self, task_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Check if user is assigned to a task."""
        stmt = select(func.count(TaskAssignment.user_id)).where(
            TaskAssignment.task_id == task_id,
            TaskAssignment.user_id == user_id,
        )
        return (self.db.execute(stmt).scalar() or 0) > 0
