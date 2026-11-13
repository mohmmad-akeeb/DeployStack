import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.attachment import Attachment
from app.models.task import Task


class AttachmentRepository:
    """Data access repository for Attachment entities."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, attachment_id: uuid.UUID) -> Attachment | None:
        """Fetch attachment by ID with uploader and task joined."""
        stmt = (
            select(Attachment)
            .options(
                joinedload(Attachment.uploader),
                joinedload(Attachment.task).joinedload(Task.project),
            )
            .where(Attachment.id == attachment_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def list_for_task(self, task_id: uuid.UUID) -> list[Attachment]:
        """List all attachments belonging to a task."""
        stmt = (
            select(Attachment)
            .options(joinedload(Attachment.uploader))
            .where(Attachment.task_id == task_id)
            .order_by(Attachment.created_at.asc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def create(
        self,
        task_id: uuid.UUID,
        uploader_id: uuid.UUID,
        file_name: str,
        file_size: int,
        content_type: str,
        s3_key: str,
    ) -> Attachment:
        """Create and persist an attachment record."""
        attachment = Attachment(
            task_id=task_id,
            uploader_id=uploader_id,
            file_name=file_name,
            file_size=file_size,
            content_type=content_type,
            s3_key=s3_key,
        )
        self.db.add(attachment)
        self.db.flush()
        return attachment

    def delete(self, attachment: Attachment) -> None:
        """Delete attachment record from database."""
        self.db.delete(attachment)
        self.db.flush()
