# Security Group for Application Load Balancer
resource "aws_security_group" "alb" {
  name        = "deploystack-${var.environment}-alb-sg"
  description = "Controls HTTP/HTTPS inbound ingress to Application Load Balancer"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP inbound from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS inbound from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Outbound egress to internal services"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "deploystack-${var.environment}-alb-sg"
    Environment = var.environment
  }
}

# Security Group for Compute Tier (EC2 / FastAPI App)
resource "aws_security_group" "app" {
  name        = "deploystack-${var.environment}-app-sg"
  description = "Restricts compute ingress to ALB traffic only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Inbound port 8000 from ALB security group only"
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Allow outbound Internet traffic via NAT Gateway"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "deploystack-${var.environment}-app-sg"
    Environment = var.environment
  }
}

# Security Group for Relational Database Tier (RDS PostgreSQL)
resource "aws_security_group" "database" {
  name        = "deploystack-${var.environment}-database-sg"
  description = "Restricts database ingress to application compute tier only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL port 5432 from compute security group only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    description = "No outbound Internet egress permitted"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "deploystack-${var.environment}-database-sg"
    Environment = var.environment
  }
}
