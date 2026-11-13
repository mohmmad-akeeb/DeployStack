variable "environment" {
  description = "Target deployment environment (e.g. dev, production)"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where the target group is created"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs to attach to the ALB"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "Security Group ID to associate with the ALB"
  type        = string
}
