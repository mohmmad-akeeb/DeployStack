import uuid

from app.models import (
    ActivityLog,
    Attachment,
    Project,
    Task,
    User,
)


def test_models_metadata_registered() -> None:
    """Verify all 6 core tables are mapped and registered on Base.metadata."""
    table_names = set(User.metadata.tables.keys())
    expected = {
        "users",
        "projects",
        "project_members",
        "tasks",
        "task_assignments",
        "attachments",
        "activity_logs",
    }
    assert expected.issubset(table_names)


def test_user_model_attributes() -> None:
    """Verify User model columns and types."""
    user = User(
        email="test@example.com",
        hashed_password="hashed_pw",
        full_name="Test User",
        is_active=True,
        is_superuser=False,
    )
    assert user.email == "test@example.com"
    assert user.full_name == "Test User"
    assert user.is_active is True
    assert user.is_superuser is False
    assert User.__table__.c.is_active.default.arg is True
    assert User.__table__.c.is_superuser.default.arg is False


def test_project_and_task_models() -> None:
    """Verify Project and Task model initialization."""
    user_id = uuid.uuid4()
    project = Project(
        name="Test Project",
        description="Description",
        owner_id=user_id,
        status="active",
    )
    assert project.name == "Test Project"
    assert project.status == "active"
    assert project.owner_id == user_id
    assert Project.__table__.c.status.default.arg == "active"

    task = Task(
        project_id=project.id,
        title="Test Task",
        created_by=user_id,
        status="todo",
        priority="medium",
        position=0,
    )
    assert task.title == "Test Task"
    assert task.status == "todo"
    assert task.priority == "medium"
    assert task.position == 0
    assert Task.__table__.c.status.default.arg == "todo"
    assert Task.__table__.c.priority.default.arg == "medium"
    assert Task.__table__.c.position.default.arg == 0


def test_attachment_and_activity_models() -> None:
    """Verify Attachment and ActivityLog models."""
    task_id = uuid.uuid4()
    user_id = uuid.uuid4()
    attachment = Attachment(
        task_id=task_id,
        uploader_id=user_id,
        file_name="diagram.png",
        file_size=1024,
        content_type="image/png",
        s3_key="attachments/proj/task/uuid-diagram.png",
    )
    assert attachment.file_name == "diagram.png"
    assert attachment.file_size == 1024

    activity = ActivityLog(
        project_id=uuid.uuid4(),
        task_id=task_id,
        user_id=user_id,
        action="TASK_CREATED",
        entity_type="task",
        entity_id=task_id,
        meta={"title": "Test Task"},
    )
    assert activity.action == "TASK_CREATED"
    assert activity.entity_type == "task"
    assert activity.meta["title"] == "Test Task"
