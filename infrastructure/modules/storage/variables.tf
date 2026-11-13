variable "environment" {
  description = "Target deployment environment (e.g. dev, production)"
  type        = string
}

variable "bucket_name" {
  description = "Name for the attachments S3 bucket"
  type        = string
  default     = "deploystack-attachments"
}
