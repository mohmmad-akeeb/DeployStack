resource "aws_s3_bucket" "attachments" {
  bucket        = "${var.bucket_name}-${var.environment}"
  force_destroy = var.environment == "dev"

  tags = {
    Name        = "deploystack-${var.environment}-attachments"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "attachments" {
  bucket = aws_s3_bucket.attachments.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block all public ingress to ensure zero data leakage
resource "aws_s3_bucket_public_access_block" "attachments" {
  bucket = aws_s3_bucket.attachments.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
