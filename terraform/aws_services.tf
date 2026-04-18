#############################
# AWS services: SNS, SQS, SES, DynamoDB, CloudWatch, S3, CloudFront
# This file is a starting point - review and secure before applying in production.
#############################

# SNS Topic for user events
resource "aws_sns_topic" "user_events" {
  name = "${var.cluster_name}-user-events"
  tags = { Environment = var.environment }
}

# DLQ for SQS
resource "aws_sqs_queue" "user_events_dlq" {
  name                      = "${var.cluster_name}-user-events-dlq"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 1209600 # 14 days
  tags = { Environment = var.environment }
}

# SQS queue for user events
resource "aws_sqs_queue" "user_events_queue" {
  name                      = "${var.cluster_name}-user-events-queue"
  visibility_timeout_seconds = 30
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.user_events_dlq.arn,
    maxReceiveCount     = 3
  })
  tags = { Environment = var.environment }
}

# Subscribe SQS to SNS
resource "aws_sns_topic_subscription" "sns_to_sqs" {
  topic_arn = aws_sns_topic.user_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.user_events_queue.arn

  # allow SNS to deliver to SQS
  depends_on = [aws_sqs_queue.user_events_queue]
}

# Allow SNS to send messages to the SQS queue (policy)
resource "aws_sqs_queue_policy" "user_events_policy" {
  queue_url = aws_sqs_queue.user_events_queue.id
  policy    = data.aws_iam_policy_document.sqs_access.json
}

data "aws_iam_policy_document" "sqs_access" {
  statement {
    sid = "Allow-SNS-SendMessage"
    principals {
      type        = "Service"
      identifiers = ["sns.amazonaws.com"]
    }
    actions = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.user_events_queue.arn]
    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_sns_topic.user_events.arn]
    }
  }
}

# SES Email Identity (email identity placeholder)
resource "aws_ses_email_identity" "no_reply" {
  email = "no-reply@${var.ses_from_domain}"
}

# DynamoDB table for sessions/refresh tokens (simple design)
resource "aws_dynamodb_table" "sessions" {
  name           = "${var.cluster_name}-sessions"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "pk"
  attribute {
    name = "pk"
    type = "S"
  }
  attribute {
    name = "sk"
    type = "S"
  }
  tags = { Environment = var.environment }
}

# CloudWatch log group for services (example for auth)
resource "aws_cloudwatch_log_group" "auth_logs" {
  name              = "/${var.cluster_name}/auth"
  retention_in_days = 30
  tags = { Environment = var.environment }
}

# CloudWatch metric filter & alarm example for DLQ messages
resource "aws_cloudwatch_metric_alarm" "sqs_dlq_messages" {
  alarm_name          = "${var.cluster_name}-user-events-dlq-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = "60"
  statistic           = "Sum"
  threshold           = "0"
  dimensions = {
    QueueName = aws_sqs_queue.user_events_dlq.name
  }
  alarm_description = "Alarm when DLQ has messages"
}

# S3 bucket for frontend
resource "aws_s3_bucket" "frontend_bucket" {
  bucket = "${var.cluster_name}-frontend-${var.environment}"
  acl    = "public-read"

  versioning {
    enabled = true
  }

  tags = { Environment = var.environment }
}

# S3 website bucket policy to allow public read (for static site)
resource "aws_s3_bucket_policy" "frontend_policy" {
  bucket = aws_s3_bucket.frontend_bucket.id
  policy = data.aws_iam_policy_document.frontend_s3_policy.json
}

data "aws_iam_policy_document" "frontend_s3_policy" {
  statement {
    effect = "Allow"
    principals { type = "*" }
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend_bucket.arn}/*"]
  }
}

# CloudFront distribution (basic, default cert)
resource "aws_cloudfront_distribution" "frontend_cdn" {
  origin {
    domain_name = aws_s3_bucket.frontend_bucket.bucket_regional_domain_name
    origin_id   = aws_s3_bucket.frontend_bucket.id
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = aws_s3_bucket.frontend_bucket.id

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geolocation_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = { Environment = var.environment }
}

# S3 bucket for backups
resource "aws_s3_bucket" "backup_bucket" {
  bucket = var.s3_bucket_name
  tags   = { Environment = var.environment }
}

# Enable versioning for backup bucket
resource "aws_s3_bucket_versioning" "backup_versioning" {
  bucket = aws_s3_bucket.backup_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 lifecycle configuration for backups
resource "aws_s3_bucket_lifecycle_configuration" "backup_lifecycle" {
  bucket = aws_s3_bucket.backup_bucket.id

  rule {
    id     = "archive-to-glacier"
    status = "Enabled"

    filter {
      prefix = "${var.bucket_prefix}/"
    }

    transition {
      days          = 30
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}
