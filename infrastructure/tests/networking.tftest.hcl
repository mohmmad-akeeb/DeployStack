# Terraform 1.7+ Mock Provider Unit Test for Networking Module

mock_provider "aws" {}

variables {
  environment = "test"
  vpc_cidr    = "10.0.0.0/16"
}

run "verify_vpc_and_subnets" {
  command = plan

  module {
    source = "../modules/networking"
  }

  assert {
    condition     = aws_vpc.main.cidr_block == "10.0.0.0/16"
    error_message = "VPC CIDR block does not match configured variable."
  }

  assert {
    condition     = length(aws_subnet.public) == 2
    error_message = "Two public subnets must be provisioned across Availability Zones."
  }

  assert {
    condition     = length(aws_subnet.app) == 2
    error_message = "Two private application subnets must be provisioned."
  }

  assert {
    condition     = length(aws_subnet.database) == 2
    error_message = "Two private database subnets must be provisioned."
  }
}
