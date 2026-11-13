variable "environment" {
  description = "Target deployment environment (e.g. dev, production)"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where security groups are instantiated"
  type        = string
}
