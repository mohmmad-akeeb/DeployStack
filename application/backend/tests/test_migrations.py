from sqlalchemy import inspect

from alembic.command import upgrade
from alembic.config import Config
from app.core.database import engine


def test_alembic_upgrade_and_downgrade() -> None:
    """Verify that Alembic migrations run cleanly up and down."""
    alembic_cfg = Config("alembic.ini")

    # Run upgrade head
    upgrade(alembic_cfg, "head")

    inspector = inspect(engine)
    tables = inspector.get_table_names()
    assert "users" in tables
    assert "projects" in tables
    assert "project_members" in tables
    assert "tasks" in tables
    assert "task_assignments" in tables
    assert "attachments" in tables
    assert "activity_logs" in tables
