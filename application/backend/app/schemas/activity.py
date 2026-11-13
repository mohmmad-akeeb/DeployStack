import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserBriefResponse


class ActivityLogResponse(BaseModel):
    """Activity audit trail item representation."""

    id: uuid.UUID
    project_id: uuid.UUID
    task_id: uuid.UUID | None = None
    user: UserBriefResponse | None = None
    action: str
    entity_type: str
    entity_id: uuid.UUID | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ActivityLogListResponse(BaseModel):
    """Paginated activity log items."""

    items: list[ActivityLogResponse]
    total: int
    page: int
    page_size: int

    model_config = ConfigDict(from_attributes=True)
