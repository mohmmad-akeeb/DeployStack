import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import (
    BadRequestException,
    EntityNotFoundException,
    ForbiddenException,
)
from app.models.task import Task
from app.models.user import User
from app.repositories.activity import ActivityRepository
from app.repositories.project import ProjectRepository
from app.repositories.task import TaskRepository
from app.repositories.user import UserRepository
from app.schemas.task import (
    TaskAssigneeResponse,
    TaskAttachmentBriefResponse,
    TaskCreateRequest,
    TaskDetailResponse,
    TaskListResponse,
    TaskUpdateRequest,
)
from app.schemas.user import UserBriefResponse


class TaskService:
    """Service encapsulating Task CRUD, Kanban status transitions, and decoupled assignments."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.task_repo = TaskRepository(db)
        self.project_repo = ProjectRepository(db)
        self.user_repo = UserRepository(db)
        self.act_repo = ActivityRepository(db)

    def _verify_project_membership(
        self,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
        required_write: bool = False,
    ) -> tuple[str, bool]:
        """Verify user is enrolled in project. Returns (user_role, is_owner)."""
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise EntityNotFoundException("Project", project_id)

        if project.owner_id == user_id:
            return "owner", True

        member = self.project_repo.get_member(project_id, user_id)
        if not member:
            raise ForbiddenException("User is not a member of this project")

        if required_write and member.role == "viewer":
            raise ForbiddenException("Write access required for this action")

        return member.role, False

    def _to_detail_response(self, task: Task) -> TaskDetailResponse:
        """Map SQLAlchemy Task model to TaskDetailResponse schema."""
        assignees = [
            TaskAssigneeResponse(
                task_id=a.task_id,
                user=UserBriefResponse.model_validate(a.user),
                role=a.role,
                assigned_by=UserBriefResponse.model_validate(a.assigner) if a.assigner else None,
                assigned_at=a.assigned_at,
            )
            for a in task.assignments
        ]
        attachments = [
            TaskAttachmentBriefResponse(
                id=att.id,
                file_name=att.file_name,
                file_size=att.file_size,
                content_type=att.content_type,
                uploader_id=att.uploader_id,
                created_at=att.created_at,
            )
            for att in task.attachments
        ]
        return TaskDetailResponse(
            id=task.id,
            project_id=task.project_id,
            title=task.title,
            description=task.description,
            status=task.status,
            priority=task.priority,
            position=task.position,
            due_date=task.due_date,
            created_by=UserBriefResponse.model_validate(task.creator),
            assignees=assignees,
            attachments=attachments,
            created_at=task.created_at,
            updated_at=task.updated_at,
        )

    def create_task(self, data: TaskCreateRequest, current_user: User) -> TaskDetailResponse:
        """Create a new task work item within a project."""
        self._verify_project_membership(data.project_id, current_user.id, required_write=True)

        if data.status not in ("todo", "in_progress", "completed"):
            raise BadRequestException(f"Invalid status '{data.status}'")
        if data.priority not in ("low", "medium", "high", "urgent"):
            raise BadRequestException(f"Invalid priority '{data.priority}'")
        if data.position < 0:
            raise BadRequestException("Position index must be non-negative")

        # Validate assignees belong to project
        if data.assigned_user_ids:
            for uid in data.assigned_user_ids:
                proj = self.project_repo.get_by_id(data.project_id)
                if proj and proj.owner_id == uid:
                    continue
                m = self.project_repo.get_member(data.project_id, uid)
                if not m:
                    raise BadRequestException(
                        f"One or more assigned_user_ids ({uid}) are not active members of this project"
                    )

        task = self.task_repo.create(
            project_id=data.project_id,
            title=data.title,
            created_by=current_user.id,
            description=data.description,
            status=data.status,
            priority=data.priority,
            position=data.position,
            due_date=data.due_date,
        )

        for uid in data.assigned_user_ids:
            self.task_repo.add_assignment(
                task_id=task.id,
                user_id=uid,
                assigned_by=current_user.id,
                role="assignee",
            )

        self.act_repo.create(
            project_id=task.project_id,
            action="TASK_CREATED",
            entity_type="task",
            user_id=current_user.id,
            task_id=task.id,
            entity_id=task.id,
            metadata={"title": task.title, "priority": task.priority},
        )

        self.db.commit()
        # Fetch fresh with relationships loaded
        reloaded = self.task_repo.get_by_id(task.id)
        assert reloaded is not None
        return self._to_detail_response(reloaded)

    def get_task(self, task_id: uuid.UUID, current_user: User) -> TaskDetailResponse:
        """Fetch task details ensuring user has project access."""
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise EntityNotFoundException("Task", task_id)

        self._verify_project_membership(task.project_id, current_user.id, required_write=False)
        return self._to_detail_response(task)

    def list_tasks(
        self,
        project_id: uuid.UUID,
        current_user: User,
        status: str | None = None,
        priority: str | None = None,
        assignee_id: uuid.UUID | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> TaskListResponse:
        """List tasks in project with filtering and pagination."""
        self._verify_project_membership(project_id, current_user.id, required_write=False)

        skip = (page - 1) * page_size
        tasks, total = self.task_repo.list(
            project_id=project_id,
            status=status,
            priority=priority,
            assignee_id=assignee_id,
            search=search,
            skip=skip,
            limit=page_size,
        )
        items = [self._to_detail_response(t) for t in tasks]
        return TaskListResponse.create(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )

    def update_task(
        self,
        task_id: uuid.UUID,
        data: TaskUpdateRequest,
        current_user: User,
    ) -> TaskDetailResponse:
        """Update task details. Allowed for Owner, Admin, author, or assigned member."""
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise EntityNotFoundException("Task", task_id)

        role, is_owner = self._verify_project_membership(task.project_id, current_user.id)
        is_creator = task.created_by == current_user.id
        is_assigned = self.task_repo.is_assigned(task.id, current_user.id)

        if not (is_owner or role == "admin" or is_creator or is_assigned):
            raise ForbiddenException("Caller lacks permission to edit this task")

        if data.title is not None:
            if not data.title.strip():
                raise BadRequestException("Task title cannot be empty")
            task.title = data.title.strip()

        if data.description is not None:
            task.description = data.description.strip() if data.description else None

        if data.priority is not None:
            if data.priority not in ("low", "medium", "high", "urgent"):
                raise BadRequestException(f"Invalid priority '{data.priority}'")
            task.priority = data.priority

        if data.due_date is not None:
            task.due_date = data.due_date

        self.task_repo.update(task)
        self.db.commit()
        reloaded = self.task_repo.get_by_id(task.id)
        assert reloaded is not None
        return self._to_detail_response(reloaded)

    def delete_task(self, task_id: uuid.UUID, current_user: User) -> None:
        """Permanently delete a task. Restricted to Owner, Admin, or author."""
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise EntityNotFoundException("Task", task_id)

        role, is_owner = self._verify_project_membership(task.project_id, current_user.id)
        is_creator = task.created_by == current_user.id

        if not (is_owner or role == "admin" or is_creator):
            raise ForbiddenException("Caller is not authorized to delete this task")

        self.act_repo.create(
            project_id=task.project_id,
            action="TASK_DELETED",
            entity_type="task",
            user_id=current_user.id,
            task_id=task.id,
            entity_id=task.id,
            metadata={"task_title": task.title},
        )

        self.task_repo.delete(task)
        self.db.commit()

    def update_task_status(
        self,
        task_id: uuid.UUID,
        new_status: str,
        position: int,
        current_user: User,
    ) -> TaskDetailResponse:
        """Transition task status across Kanban columns and update position."""
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise EntityNotFoundException("Task", task_id)

        self._verify_project_membership(task.project_id, current_user.id, required_write=True)

        if new_status not in ("todo", "in_progress", "completed"):
            raise BadRequestException(f"Invalid status '{new_status}'")
        if position < 0:
            raise BadRequestException("Position must be non-negative")

        old_status = task.status
        task.status = new_status
        task.position = position
        self.task_repo.update(task)

        self.act_repo.create(
            project_id=task.project_id,
            action="TASK_STATUS_CHANGED",
            entity_type="task",
            user_id=current_user.id,
            task_id=task.id,
            entity_id=task.id,
            metadata={
                "old_status": old_status,
                "new_status": new_status,
                "task_title": task.title,
            },
        )

        self.db.commit()

        reloaded = self.task_repo.get_by_id(task.id)
        assert reloaded is not None
        return self._to_detail_response(reloaded)

    # Assignment Operations
    def list_assignments(
        self,
        task_id: uuid.UUID,
        current_user: User,
    ) -> list[TaskAssigneeResponse]:
        """List assignees of a task."""
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise EntityNotFoundException("Task", task_id)

        self._verify_project_membership(task.project_id, current_user.id)
        assignments = self.task_repo.list_assignments(task_id)
        return [
            TaskAssigneeResponse(
                task_id=a.task_id,
                user=UserBriefResponse.model_validate(a.user),
                role=a.role,
                assigned_by=UserBriefResponse.model_validate(a.assigner) if a.assigner else None,
                assigned_at=a.assigned_at,
            )
            for a in assignments
        ]

    def assign_users(
        self,
        task_id: uuid.UUID,
        user_ids: list[uuid.UUID],
        role: str,
        current_user: User,
    ) -> list[TaskAssigneeResponse]:
        """Assign users to a task."""
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise EntityNotFoundException("Task", task_id)

        self._verify_project_membership(task.project_id, current_user.id, required_write=True)

        if role not in ("assignee", "reviewer", "watcher"):
            raise BadRequestException(f"Invalid assignment role '{role}'")

        # Verify all user_ids belong to the project
        proj = self.project_repo.get_by_id(task.project_id)
        for uid in user_ids:
            if proj and proj.owner_id == uid:
                continue
            m = self.project_repo.get_member(task.project_id, uid)
            if not m:
                raise BadRequestException(
                    f"User '{uid}' is not an active member of this project"
                )

        for uid in user_ids:
            existing = self.task_repo.get_assignment(task_id, uid)
            if existing:
                existing.role = role
                existing.assigned_by = current_user.id
            else:
                self.task_repo.add_assignment(
                    task_id=task_id,
                    user_id=uid,
                    assigned_by=current_user.id,
                    role=role,
                )

        self.db.commit()
        return self.list_assignments(task_id, current_user)

    def remove_assignment(
        self,
        task_id: uuid.UUID,
        target_user_id: uuid.UUID,
        current_user: User,
    ) -> None:
        """Remove user assignment from task."""
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise EntityNotFoundException("Task", task_id)

        proj_role, is_owner = self._verify_project_membership(task.project_id, current_user.id)
        is_creator = task.created_by == current_user.id
        is_self = current_user.id == target_user_id

        if not (is_owner or proj_role == "admin" or is_creator or is_self):
            raise ForbiddenException("Caller lacks permission to modify task assignments")

        assignment = self.task_repo.get_assignment(task_id, target_user_id)
        if not assignment:
            raise EntityNotFoundException("TaskAssignment", target_user_id)

        self.task_repo.remove_assignment(assignment)
        self.db.commit()
