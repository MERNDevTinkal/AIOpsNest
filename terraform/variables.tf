variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "nest-auth-cluster"
}

variable "vpc_cidr" {
  description = "VPC CIDR"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnets" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnets" {
  type    = list(string)
  default = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

variable "node_instance_type" {
  description = "EC2 instance type for worker nodes"
  type        = string
  default     = "t3.medium"
}

variable "node_min_capacity" {
  type    = number
  default = 1
}

variable "node_max_capacity" {
  type    = number
  default = 3
}

variable "node_capacity" {
  type    = number
  default = 2
}

variable "mq_broker_name" {
  description = "Amazon MQ broker name (RabbitMQ)"
  type        = string
  default     = "auth-rabbitmq"
}

variable "mq_instance_type" {
  description = "Amazon MQ instance type"
  type        = string
  default     = "mq.t3.micro"
}

variable "mq_admin_user" {
  description = "Admin user for RabbitMQ broker (set via TF variables or secrets)"
  type        = string
  default     = "admin"
}

variable "mq_admin_password" {
  description = "Admin password (override in a secure way; e.g. via SSM or secrets manager)"
  type        = string
  default     = "CHANGE_ME"
}

variable "environment" {
  description = "Deployment environment tag"
  type        = string
  default     = "staging"
}

variable "ses_from_domain" {
  description = "Domain used for SES email addresses (example: example.com). Create SES identities or verify domain before sending."
  type        = string
  default     = "example.com"
}