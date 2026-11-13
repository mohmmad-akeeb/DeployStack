variable "environment" {
  description = "Target deployment environment (e.g. dev, production)"
  type        = string
}

variable "app_subnet_ids" {
  description = "List of private application subnet IDs where compute nodes run"
  type        = list(string)
}

variable "app_security_group_id" {
  description = "Security Group ID for application compute instances"
  type        = string
}

variable "target_group_arn" {
  description = "Target Group ARN for ALB traffic distribution"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "min_size" {
  description = "Minimum number of instances in Auto Scaling Group"
  type        = number
  default     = 2
}

variable "max_size" {
  description = "Maximum number of instances in Auto Scaling Group"
  type        = number
  default     = 4
}

variable "desired_capacity" {
  description = "Desired number of instances in Auto Scaling Group"
  type        = number
  default     = 2
}
