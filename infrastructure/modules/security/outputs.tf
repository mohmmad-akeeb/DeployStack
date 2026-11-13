output "alb_security_group_id" {
  description = "Security Group ID of the Application Load Balancer"
  value       = aws_security_group.alb.id
}

output "app_security_group_id" {
  description = "Security Group ID of the Application Compute tier"
  value       = aws_security_group.app.id
}

output "database_security_group_id" {
  description = "Security Group ID of the Database tier"
  value       = aws_security_group.database.id
}
