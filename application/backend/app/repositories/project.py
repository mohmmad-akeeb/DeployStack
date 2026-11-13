import uuid

from sqlalchemy import distinct, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.project import Project, ProjectMember
from app.models.task import Task


class ProjectRepository:
    """Data access repository for Project and ProjectMember entities."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, project_id: uuid.UUID) -> Project | None:
        """Fetch project by ID with owner loaded."""
        stmt = (
            select(Project)
            .options(joinedload(Project.owner))
            .where(Project.id == project_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def list_for_user(
        self,
        user_id: uuid.UUID,
        status: str | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Project], int]:
        """List all projects where user is Owner or Member, with total count."""
        # A project is accessible if user is owner or listed in project_members
        base_query = (
            select(Project)
            .distinct()
            .outerjoin(ProjectMember, Project.id == ProjectMember.project_id)
            .where(
                or_(
                    Project.owner_id == user_id,
                    ProjectMember.user_id == user_id,
                )
            )
        )

        if status:
            base_query = base_query.where(Project.status == status)

        if search:
            search_pattern = f"%{search.strip().lower()}%"
            base_query = base_query.where(
                or_(
                    func.lower(Project.name).like(search_pattern),
                    func.lower(Project.description).like(search_pattern),
                )
            )

        # Count total
        subq = base_query.subquery()
        count_stmt = select(func.count(distinct(subq.c.id)))
        total = self.db.execute(count_stmt).scalar() or 0

        # Paginated fetch with owner joined
        fetch_stmt = (
            base_query.options(joinedload(Project.owner))
            .order_by(Project.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        items = list(self.db.execute(fetch_stmt).unique().scalars().all())
        return items, total

    def create(
        self,
        name: str,
        owner_id: uuid.UUID,
        description: str | None = None,
        status: str = "active",
    ) -> Project:
        """Create a new project entity."""
        project = Project(
            name=name.strip(),
            owner_id=owner_id,
            description=description.strip() if description else None,
            status=status,
        )
        self.db.add(project)
        self.db.flush()
        return project

    def update(self, project: Project) -> Project:
        """Update existing project entity."""
        self.db.add(project)
        self.db.flush()
        return project

    def delete(self, project: Project) -> None:
        """Delete project entity cascade-removing dependent children."""
        self.db.delete(project)
        self.db.flush()

    # Membership methods
    def get_member(self, project_id: uuid.UUID, user_id: uuid.UUID) -> ProjectMember | None:
        """Fetch project member by composite primary key with user profile loaded."""
        stmt = (
            select(ProjectMember)
            .options(joinedload(ProjectMember.user))
            .where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user_id,
            )
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def add_member(
        self,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
        role: str = "member",
    ) -> ProjectMember:
        """Add a member to a project."""
        member = ProjectMember(
            project_id=project_id,
            user_id=user_id,
            role=role,
        )
        self.db.add(member)
        self.db.flush()
        return member

    def remove_member(self, member: ProjectMember) -> None:
        """Remove a member from a project."""
        self.db.delete(member)
        self.db.flush()

    def list_members(
        self,
        project_id: uuid.UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[ProjectMember], int]:
        """List members of a project."""
        count_stmt = select(func.count(ProjectMember.user_id)).where(
            ProjectMember.project_id == project_id
        )
        total = self.db.execute(count_stmt).scalar() or 0

        fetch_stmt = (
            select(ProjectMember)
            .options(joinedload(ProjectMember.user))
            .where(ProjectMember.project_id == project_id)
            .order_by(ProjectMember.joined_at.asc())
            .offset(skip)
            .limit(limit)
        )
        members = list(self.db.execute(fetch_stmt).scalars().all())
        return members, total

    def count_members(self, project_id: uuid.UUID) -> int:
        """Return total active members for a project."""
        stmt = select(func.count(ProjectMember.user_id)).where(
            ProjectMember.project_id == project_id
        )
        return self.db.execute(stmt).scalar() or 0

    def count_tasks(self, project_id: uuid.UUID) -> int:
        """Return total tasks in a project."""
        stmt = select(func.count(Task.id)).where(Task.project_id == project_id)
        return self.db.execute(stmt).scalar() or 0
