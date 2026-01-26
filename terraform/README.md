# Terraform - EKS + VPC + ECR + Amazon MQ (RabbitMQ)

This folder contains a **starting skeleton** to provision an EKS cluster (using terraform-aws-modules), a VPC, an ECR repository, and an Amazon MQ RabbitMQ broker.

IMPORTANT: This is a scaffold and **not** a production-ready full infra. Please review, add remote state, and secure secrets before applying.

Prerequisites
- Terraform >= 1.5.0
- AWS credentials with privileges to create VPC, EKS, ECR, and Amazon MQ
- (Recommended) An S3 bucket + DynamoDB table for remote state locking (see `backend.tf`)

Quick start
1. Copy variables example: `cp terraform.tfvars.example terraform.tfvars` and edit values.
2. Authenticate with AWS (AWS CLI, env vars, or assume role).
3. Initialize: `terraform init` (if using S3 backend, ensure backend config is set).
4. Plan: `terraform plan -var-file=terraform.tfvars`.
5. Apply: `terraform apply -var-file=terraform.tfvars`.

Notes & Security
- Do **not** hardcode sensitive values (e.g., mq_admin_password) in source control — use AWS SSM Parameter Store or Secrets Manager.
- Use a remote backend (S3 + DynamoDB) for team workflows.
- After provisioning EKS, use the module outputs to generate kubeconfig or use `aws eks update-kubeconfig`.

Next steps I can do for you
- Add Terraform modules split (vpc/, eks/, mq/, ecr/) and make them reusable
- Configure an S3 remote backend with sample bucket/DynamoDB config
- Add IAM roles & OIDC provider for IRSA (service account IAM) to allow services to access AWS resources securely
- Add optional EKS managed nodegroup to use Fargate for compute optimization

If you'd like, I can now scaffold the monorepo and services and create a CI workflow that builds images and pushes them to the ECR created by Terraform.
