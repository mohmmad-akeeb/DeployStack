provider "aws" {
  region = var.aws_region
}

module "networking" {
  source             = "../../modules/networking"
  environment        = var.environment
  vpc_cidr           = "10.0.0.0/16"
  enable_nat_gateway = true
}

module "security" {
  source      = "../../modules/security"
  environment = var.environment
  vpc_id      = module.networking.vpc_id
}

module "load_balancer" {
  source                = "../../modules/load-balancer"
  environment           = var.environment
  vpc_id                = module.networking.vpc_id
  public_subnet_ids     = module.networking.public_subnet_ids
  alb_security_group_id = module.security.alb_security_group_id
}

module "compute" {
  source                = "../../modules/compute"
  environment           = var.environment
  app_subnet_ids        = module.networking.app_subnet_ids
  app_security_group_id = module.security.app_security_group_id
  target_group_arn      = module.load_balancer.target_group_arn
  instance_type         = "t3.medium"
  min_size              = 2
  max_size              = 4
  desired_capacity      = 2
}

module "database" {
  source                     = "../../modules/database"
  environment                = var.environment
  db_subnet_ids              = module.networking.db_subnet_ids
  database_security_group_id = module.security.database_security_group_id
  allocated_storage          = 50
  instance_class             = "db.t4g.small"
  multi_az                   = true
}

module "storage" {
  source      = "../../modules/storage"
  environment = var.environment
  bucket_name = "deploystack-attachments"
}
