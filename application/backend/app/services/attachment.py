import re
import uuid
from typing import Any, BinaryIO

from sqlalchemy.orm import Session

from app.core.exceptions import (
    BadRequestException,
    EntityNotFoundException,
    ForbiddenException,
    PayloadTooLargeException,
)
from app.core.storage import storage_client
from app.models.attachment import Attachment
from app.models.user import User
from app.repositories.attachment import AttachmentRepository
from app.repositories.project import ProjectRepository
from app.repositories.task import TaskRepository
from app.schemas.attachment import AttachmentResponse
from app.schemas.user import UserBriefResponse

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def sanitize_filename(filename: str) -> str:
    """Sanitize original filename to prevent path traversal and unsafe characters."""
    clean = re.sub(r"[^a-zA-Z0-9_.-]", "_", filename.strip())
    return clean[:100] if clean else "attachment"


class AttachmentService:
    """Service encapsulating task file attachment uploads, downloads, and storage lifecycle."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.att_repo = AttachmentRepository(db)
        self.task_repo = TaskRepository(db)
        self.proj_repo = ProjectRepository(db)

    def upload_attachment(
        self,
        task_id: uuid.UUID,
        file_name: str,
        content_type: str,
        file_stream: BinaryIO,
        current_user: User,
    ) -> AttachmentResponse:
        """Upload file attachment to MinIO / S3 and persist metadata."""
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise EntityNotFoundException("Task", task_id)

        # Verify caller has write access to project
        project = self.proj_repo.get_by_id(task.project_id)
        if not project:
            raise EntityNotFoundException("Project", task.project_id)

        if project.owner_id != current_user.id:
            member = self.proj_repo.get_member(project.id, current_user.id)
            if not member or member.role == "viewer":
                raise ForbiddenException("User does not have permission to upload attachments")

        # Read file bytes & validate size
        data = file_stream.read()
        file_size = len(data)

        if file_size == 0:
            raise BadRequestException("Cannot upload an empty file")

        if file_size > MAX_FILE_SIZE_BYTES:
            raise PayloadTooLargeException("Uploaded file exceeds the maximum 10MB limit")

        safe_name = sanitize_filename(file_name)
        file_uuid = uuid.uuid4()
        s3_key = f"attachments/{task.project_id}/{task.id}/{file_uuid}-{safe_name}"

        # Upload to MinIO / S3
        storage_client.put_object(
            key=s3_key,
            data=data,
            content_type=content_type or "application/octet-stream",
        )

        # Save metadata to PostgreSQL
        attachment = self.att_repo.create(
            task_id=task.id,
            uploader_id=current_user.id,
            file_name=safe_name,
            file_size=file_size,
            content_type=content_type or "application/octet-stream",
            s3_key=s3_key,
        )
        self.db.commit()
        self.db.refresh(attachment)

        return AttachmentResponse(
            id=attachment.id,
            task_id=attachment.task_id,
            file_name=attachment.file_name,
            file_size=attachment.file_size,
            content_type=attachment.content_type,
            uploader=UserBriefResponse.model_validate(current_user),
            created_at=attachment.created_at,
        )

    def list_attachments(
        self,
        task_id: uuid.UUID,
        current_user: User,
    ) -> list[AttachmentResponse]:
        """List all attachments for a task."""
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise EntityNotFoundException("Task", task_id)

        project = self.proj_repo.get_by_id(task.project_id)
        if not project or (
            project.owner_id != current_user.id
            and not self.proj_repo.get_member(project.id, current_user.id)
        ):
            raise ForbiddenException("Access to task attachments forbidden")

        attachments = self.att_repo.list_for_task(task_id)
        return [
            AttachmentResponse(
                id=a.id,
                task_id=a.task_id,
                file_name=a.file_name,
                file_size=a.file_size,
                content_type=a.content_type,
                uploader=UserBriefResponse.model_validate(a.uploader),
                created_at=a.created_at,
            )
            for a in attachments
        ]

    def get_download_stream(
        self,
        attachment_id: uuid.UUID,
        current_user: User,
    ) -> tuple[Attachment, Any]:
        """Retrieve binary stream and metadata for downloading attachment."""
        attachment = self.att_repo.get_by_id(attachment_id)
        if not attachment:
            raise EntityNotFoundException("Attachment", attachment_id)

        project = attachment.task.project
        if project.owner_id != current_user.id and not self.proj_repo.get_member(
            project.id, current_user.id
        ):
            raise ForbiddenException("Access to attachment download forbidden")

        stream = storage_client.get_object_stream(attachment.s3_key)
        return attachment, stream

    def delete_attachment(
        self,
        attachment_id: uuid.UUID,
        current_user: User,
    ) -> None:
        """Purge binary from S3 and delete attachment record."""
        attachment = self.att_repo.get_by_id(attachment_id)
        if not attachment:
            raise EntityNotFoundException("Attachment", attachment_id)

        project = attachment.task.project
        is_owner = project.owner_id == current_user.id
        is_uploader = attachment.uploader_id == current_user.id
        member = self.proj_repo.get_member(project.id, current_user.id)
        is_admin = member is not None and member.role == "admin"

        if not (is_owner or is_admin or is_uploader):
            raise ForbiddenException("Caller lacks permission to delete this attachment")

        # Purge from S3
        storage_client.delete_object(attachment.s3_key)

        # Delete database row
        self.att_repo.delete(attachment)
        self.db.commit()
