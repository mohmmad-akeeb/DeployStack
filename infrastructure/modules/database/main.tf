resource "aws_db_subnet_group" "main" {
  name       = "deploystack-${var.environment}-db-subnet-group"
  subnet_ids = var.db_subnet_ids

  tags = {
    Name        = "deploystack-${var.environment}-db-subnet-group"
    Environment = var.environment
  }
}

resource "aws_db_instance" "main" {
  identifier     = "deploystack-${var.environment}-postgres"
  engine         = "postgres"
  engine_version = "16.1"
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = 100
  storage_type          = "gp3"

  db_name  = var.db_name
  username = var.db_username
  # Note: In production AWS deployment, password is managed via AWS Secrets Manager
  password = "temp_deploystack_placeholder_password_not_for_prod"

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.database_security_group_id]

  multi_az            = var.multi_az
  publicly_accessible = false
  skip_final_snapshot = true

  tags = {
    Name        = "deploystack-${var.environment}-postgres"
    Environment = var.environment
  }
}
