from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.core.database import SessionLocal
from app.main import app
from app.models import (
    ActivityLog,
    Attachment,
    Project,
    ProjectMember,
    Task,
    TaskAssignment,
    User,
)


@pytest.fixture(scope="session")
def client() -> Generator[TestClient, None, None]:
    """Test client fixture for invoking FastAPI endpoints."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def clean_db() -> Generator[None, None, None]:
    """Clean database tables between tests to guarantee isolation."""
    with SessionLocal() as db:
        db.query(ActivityLog).delete()
        db.query(Attachment).delete()
        db.query(TaskAssignment).delete()
        db.query(Task).delete()
        db.query(ProjectMember).delete()
        db.query(Project).delete()
        db.query(User).delete()
        db.commit()
    yield
