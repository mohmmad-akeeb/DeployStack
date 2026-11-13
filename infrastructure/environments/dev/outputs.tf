output "vpc_id" {
  description = "VPC ID of the dev environment"
  value       = module.networking.vpc_id
}

output "alb_dns_name" {
  description = "Application Load Balancer entry DNS"
  value       = module.load_balancer.alb_dns_name
}

output "db_endpoint" {
  description = "PostgreSQL RDS endpoint"
  value       = module.database.db_endpoint
}

output "s3_bucket" {
  description = "Attachments S3 bucket name"
  value       = module.storage.bucket_id
}
