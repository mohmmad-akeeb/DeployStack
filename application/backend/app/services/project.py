import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    EntityNotFoundException,
    ForbiddenException,
)
from app.models.project import Project
from app.models.user import User
from app.repositories.activity import ActivityRepository
from app.repositories.project import ProjectRepository
from app.repositories.user import UserRepository
from app.schemas.project import (
    ProjectCreateRequest,
    ProjectListResponse,
    ProjectMemberListResponse,
    ProjectMemberResponse,
    ProjectResponse,
    ProjectUpdateRequest,
)
from app.schemas.user import UserBriefResponse


class ProjectService:
    """Service encapsulating project workspace management and access authorization."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.project_repo = ProjectRepository(db)
        self.user_repo = UserRepository(db)
        self.act_repo = ActivityRepository(db)

    def verify_project_access(
        self,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
        required_roles: list[str] | None = None,
    ) -> tuple[Project, str]:
        """Verify project exists and caller has required authorization role.

        Returns (project, user_role).
        """
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise EntityNotFoundException("Project", project_id)

        # Check ownership
        if project.owner_id == user_id:
            role = "owner"
        else:
            member = self.project_repo.get_member(project_id, user_id)
            if not member:
                raise ForbiddenException("You do not have access to this project")
            role = member.role

        if required_roles and role not in required_roles:
            raise ForbiddenException(f"Action requires one of the following roles: {required_roles}")

        return project, role

    def create_project(
        self,
        data: ProjectCreateRequest,
        current_user: User,
    ) -> ProjectResponse:
        """Create a new project workspace and enroll creator as Owner."""
        if not data.name.strip():
            raise BadRequestException("Project name cannot be empty")

        if data.status not in ("active", "archived", "completed"):
            raise BadRequestException(f"Invalid status '{data.status}'")

        project = self.project_repo.create(
            name=data.name,
            owner_id=current_user.id,
            description=data.description,
            status=data.status,
        )

        # Automatically enroll owner in project_members
        self.project_repo.add_member(
            project_id=project.id,
            user_id=current_user.id,
            role="owner",
        )

        self.act_repo.create(
            project_id=project.id,
            action="PROJECT_CREATED",
            entity_type="project",
            user_id=current_user.id,
            entity_id=project.id,
            metadata={"name": project.name},
        )

        self.db.commit()
        self.db.refresh(project)

        return ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            status=project.status,
            owner=UserBriefResponse.model_validate(current_user),
            member_count=1,
            task_count=0,
            current_user_role="owner",
            created_at=project.created_at,
            updated_at=project.updated_at,
        )

    def get_project_detail(
        self,
        project_id: uuid.UUID,
        current_user: User,
    ) -> ProjectResponse:
        """Fetch project detail ensuring caller is an active member or owner."""
        project, role = self.verify_project_access(project_id, current_user.id)
        member_count = self.project_repo.count_members(project.id)
        task_count = self.project_repo.count_tasks(project.id)

        return ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            status=project.status,
            owner=UserBriefResponse.model_validate(project.owner),
            member_count=member_count,
            task_count=task_count,
            current_user_role=role,
            created_at=project.created_at,
            updated_at=project.updated_at,
        )

    def list_projects(
        self,
        current_user: User,
        status: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> ProjectListResponse:
        """List all projects visible to current user."""
        skip = (page - 1) * page_size
        projects, total = self.project_repo.list_for_user(
            user_id=current_user.id,
            status=status,
            search=search,
            skip=skip,
            limit=page_size,
        )

        items: list[ProjectResponse] = []
        for p in projects:
            role = "owner" if p.owner_id == current_user.id else "member"
            if role != "owner":
                m = self.project_repo.get_member(p.id, current_user.id)
                if m:
                    role = m.role

            m_count = self.project_repo.count_members(p.id)
            t_count = self.project_repo.count_tasks(p.id)
            items.append(
                ProjectResponse(
                    id=p.id,
                    name=p.name,
                    description=p.description,
                    status=p.status,
                    owner=UserBriefResponse.model_validate(p.owner),
                    member_count=m_count,
                    task_count=t_count,
                    current_user_role=role,
                    created_at=p.created_at,
                    updated_at=p.updated_at,
                )
            )

        return ProjectListResponse.create(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )

    def update_project(
        self,
        project_id: uuid.UUID,
        data: ProjectUpdateRequest,
        current_user: User,
    ) -> ProjectResponse:
        """Update project metadata. Restricted to Owner or Admin."""
        project, role = self.verify_project_access(
            project_id,
            current_user.id,
            required_roles=["owner", "admin"],
        )

        if data.name is not None:
            if not data.name.strip():
                raise BadRequestException("Project name cannot be empty")
            project.name = data.name.strip()

        if data.description is not None:
            project.description = data.description.strip() if data.description else None

        if data.status is not None:
            if data.status not in ("active", "archived", "completed"):
                raise BadRequestException(f"Invalid status '{data.status}'")
            project.status = data.status

        self.project_repo.update(project)
        self.db.commit()
        self.db.refresh(project)

        m_count = self.project_repo.count_members(project.id)
        t_count = self.project_repo.count_tasks(project.id)

        return ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            status=project.status,
            owner=UserBriefResponse.model_validate(project.owner),
            member_count=m_count,
            task_count=t_count,
            current_user_role=role,
            created_at=project.created_at,
            updated_at=project.updated_at,
        )

    def delete_project(
        self,
        project_id: uuid.UUID,
        current_user: User,
    ) -> None:
        """Delete project workspace. Restricted strictly to Project Owner."""
        project, role = self.verify_project_access(
            project_id,
            current_user.id,
            required_roles=["owner"],
        )
        self.project_repo.delete(project)
        self.db.commit()

    # Membership Operations
    def list_members(
        self,
        project_id: uuid.UUID,
        current_user: User,
        page: int = 1,
        page_size: int = 50,
    ) -> ProjectMemberListResponse:
        """List all members enrolled in the project."""
        self.verify_project_access(project_id, current_user.id)
        skip = (page - 1) * page_size
        members, total = self.project_repo.list_members(project_id, skip=skip, limit=page_size)

        items = [
            ProjectMemberResponse(
                project_id=m.project_id,
                user=UserBriefResponse.model_validate(m.user),
                role=m.role,
                joined_at=m.joined_at,
            )
            for m in members
        ]
        return ProjectMemberListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )

    def add_member(
        self,
        project_id: uuid.UUID,
        email: str,
        role: str,
        current_user: User,
    ) -> ProjectMemberResponse:
        """Add a registered user to the project workspace. Restricted to Owner or Admin."""
        self.verify_project_access(
            project_id,
            current_user.id,
            required_roles=["owner", "admin"],
        )

        if role not in ("owner", "admin", "member", "viewer"):
            raise BadRequestException(f"Invalid member role '{role}'")

        target_user = self.user_repo.get_by_email(email)
        if not target_user:
            raise EntityNotFoundException(
                "User",
                email,
                message=f"No registered user found with email '{email}'",
            )

        existing = self.project_repo.get_member(project_id, target_user.id)
        if existing:
            raise ConflictException(f"User '{email}' is already a member of this project")

        member = self.project_repo.add_member(
            project_id=project_id,
            user_id=target_user.id,
            role=role,
        )
        self.db.commit()
        self.db.refresh(member)

        return ProjectMemberResponse(
            project_id=member.project_id,
            user=UserBriefResponse.model_validate(target_user),
            role=member.role,
            joined_at=member.joined_at,
        )

    def update_member_role(
        self,
        project_id: uuid.UUID,
        member_user_id: uuid.UUID,
        new_role: str,
        current_user: User,
    ) -> ProjectMemberResponse:
        """Update member role. Restricted strictly to Project Owner."""
        project, _ = self.verify_project_access(
            project_id,
            current_user.id,
            required_roles=["owner"],
        )

        if new_role not in ("admin", "member", "viewer"):
            raise BadRequestException(f"Invalid member role '{new_role}'")

        if member_user_id == project.owner_id:
            raise BadRequestException("Cannot change owner's role directly (requires ownership transfer)")

        member = self.project_repo.get_member(project_id, member_user_id)
        if not member:
            raise EntityNotFoundException("ProjectMember", member_user_id)

        member.role = new_role
        self.db.commit()
        self.db.refresh(member)

        return ProjectMemberResponse(
            project_id=member.project_id,
            user=UserBriefResponse.model_validate(member.user),
            role=member.role,
            joined_at=member.joined_at,
        )

    def remove_member(
        self,
        project_id: uuid.UUID,
        member_user_id: uuid.UUID,
        current_user: User,
    ) -> None:
        """Remove member from project workspace."""
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise EntityNotFoundException("Project", project_id)

        if member_user_id == project.owner_id:
            raise BadRequestException("Project Owner cannot leave without transferring ownership")

        member = self.project_repo.get_member(project_id, member_user_id)
        if not member:
            raise EntityNotFoundException("ProjectMember", member_user_id)

        # Check permissions:
        # Owner can remove anyone.
        # Admin can remove anyone except Owner.
        # Any member can remove themselves (leave).
        caller_role = "owner" if current_user.id == project.owner_id else None
        if not caller_role:
            caller_member = self.project_repo.get_member(project_id, current_user.id)
            if not caller_member:
                raise ForbiddenException("Caller is not enrolled in this project")
            caller_role = caller_member.role

        is_self = current_user.id == member_user_id
        if not (caller_role in ("owner", "admin") or is_self):
            raise ForbiddenException("Caller lacks permission to remove this member")

        self.project_repo.remove_member(member)
        self.db.commit()
