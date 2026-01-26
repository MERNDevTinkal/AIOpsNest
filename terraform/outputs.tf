output "cluster_name" {
  value = module.eks.cluster_id
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "cluster_certificate_authority_data" {
  value = module.eks.cluster_certificate_authority_data
}

output "ecr_repo_url" {
  value = aws_ecr_repository.services.repository_url
}

output "mq_broker_id" {
  value = aws_mq_broker.rabbitmq.id
}

output "mq_broker_arn" {
  value = aws_mq_broker.rabbitmq.arn
}

output "frontend_bucket" {
  value = aws_s3_bucket.frontend_bucket.bucket
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.frontend_cdn.domain_name
}

output "sns_topic_user_events_arn" {
  value = aws_sns_topic.user_events.arn
}

output "sqs_user_events_queue_url" {
  value = aws_sqs_queue.user_events_queue.id
}

output "dynamodb_sessions_table" {
  value = aws_dynamodb_table.sessions.name
}