variable "environment" {
  description = "Target deployment environment (e.g. dev, production)"
  type        = string
}

variable "db_subnet_ids" {
  description = "Subnet IDs for RDS DB subnet group"
  type        = list(string)
}

variable "database_security_group_id" {
  description = "Security Group ID for RDS PostgreSQL"
  type        = string
}

variable "allocated_storage" {
  description = "Allocated storage size in gigabytes"
  type        = number
  default     = 20
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "deploystack_db"
}

variable "db_username" {
  description = "Master database username"
  type        = string
  default     = "deploystack"
}

variable "multi_az" {
  description = "Whether to deploy Multi-AZ RDS instance"
  type        = bool
  default     = false
}
