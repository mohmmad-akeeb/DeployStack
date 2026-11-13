import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserBriefResponse


class AttachmentResponse(BaseModel):
    """File attachment metadata response schema."""

    id: uuid.UUID
    task_id: uuid.UUID
    file_name: str
    file_size: int
    content_type: str
    uploader: UserBriefResponse
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
