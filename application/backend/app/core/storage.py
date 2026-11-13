import logging
from typing import Any, BinaryIO

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageClient:
    """S3-compatible object storage client for MinIO and AWS S3."""

    def __init__(self) -> None:
        self.bucket = settings.S3_BUCKET_NAME
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_DEFAULT_REGION,
            config=Config(signature_version="s3v4"),
        )
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        """Create storage bucket if it does not already exist."""
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code")
            if error_code in ("404", "NoSuchBucket"):
                try:
                    self.client.create_bucket(Bucket=self.bucket)
                    logger.info("Created S3 bucket: %s", self.bucket)
                except Exception as create_exc:
                    logger.warning("Could not auto-create S3 bucket: %s", create_exc)
            else:
                logger.debug("S3 bucket check failed: %s", exc)

    def put_object(self, key: str, data: bytes | BinaryIO, content_type: str) -> None:
        """Upload binary object bytes or stream to S3 / MinIO."""
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )

    def get_object_stream(self, key: str) -> Any:
        """Retrieve streaming body for an object key."""
        response = self.client.get_object(
            Bucket=self.bucket,
            Key=key,
        )
        return response["Body"]

    def delete_object(self, key: str) -> None:
        """Delete an object from S3 / MinIO."""
        try:
            self.client.delete_object(
                Bucket=self.bucket,
                Key=key,
            )
        except ClientError as exc:
            logger.warning("Failed to delete S3 object '%s': %s", key, exc)


storage_client = StorageClient()
