provider "aws" {
  region = var.region
}

# VPC (community module)
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 3.0"

  name = var.cluster_name
  cidr = var.vpc_cidr

  azs             = ["${var.region}a", "${var.region}b", "${var.region}c"]
  public_subnets  = var.public_subnets
  private_subnets = var.private_subnets

  enable_nat_gateway = true
}

# EKS cluster (community module)
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  cluster_version = "1.27"
  subnets         = module.vpc.private_subnets

  node_groups = {
    default = {
      desired_capacity = var.node_capacity
      max_capacity     = var.node_max_capacity
      min_capacity     = var.node_min_capacity
      instance_type    = var.node_instance_type
    }
  }

  tags = {
    Environment = var.environment
  }
}

# ECR repository for services
resource "aws_ecr_repository" "services" {
  name                 = "${var.cluster_name}-services"
  image_tag_mutability = "MUTABLE"
  tags = {
    Environment = var.environment
  }
}

# Amazon MQ (RabbitMQ)
resource "aws_mq_broker" "rabbitmq" {
  broker_name        = var.mq_broker_name
  engine_type        = "RabbitMQ"
  engine_version     = "3.8.35"
  host_instance_type = var.mq_instance_type
  deployment_mode    = "SINGLE_INSTANCE"

  users {
    username = var.mq_admin_user
    password = var.mq_admin_password
  }

  maintenance_window_start_time {
    day_of_week = "SUNDAY"
    time_of_day = "02:00"
    time_zone   = "UTC"
  }

  tags = {
    Environment = var.environment
  }
}
