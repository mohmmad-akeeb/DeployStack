import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services.attachment import AttachmentService

router = APIRouter()


@router.get(
    "/{id}/download",
    summary="Download File Attachment",
    description="Stream binary file attachment directly from S3 / MinIO.",
)
def download_attachment(
    id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StreamingResponse:
    service = AttachmentService(db)
    attachment, stream = service.get_download_stream(id, current_user)

    headers = {
        "Content-Disposition": f'attachment; filename="{attachment.file_name}"',
        "Content-Length": str(attachment.file_size),
    }
    return StreamingResponse(
        content=stream,
        media_type=attachment.content_type,
        headers=headers,
    )


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete File Attachment",
    description="Purge binary blob from S3 and delete attachment database record.",
)
def delete_attachment(
    id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    service = AttachmentService(db)
    service.delete_attachment(id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
