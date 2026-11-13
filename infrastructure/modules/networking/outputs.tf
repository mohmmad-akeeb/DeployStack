output "vpc_id" {
  description = "The ID of the created VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "List of IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "app_subnet_ids" {
  description = "List of IDs of private application subnets"
  value       = aws_subnet.app[*].id
}

output "db_subnet_ids" {
  description = "List of IDs of private database subnets"
  value       = aws_subnet.database[*].id
}
