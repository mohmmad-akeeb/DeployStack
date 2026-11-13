output "db_endpoint" {
  description = "The connection endpoint of the PostgreSQL database"
  value       = aws_db_instance.main.endpoint
}

output "db_instance_id" {
  description = "RDS instance identifier"
  value       = aws_db_instance.main.id
}

output "db_port" {
  description = "Database listening port"
  value       = aws_db_instance.main.port
}
