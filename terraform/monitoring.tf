# CloudWatch & SNS for backup monitoring

variable "backup_sns_email" {
  type = string
  default = ""
  description = "Email address to subscribe to backup SNS alerts (leave empty to skip subscription)"
}

resource "aws_cloudwatch_log_group" "backup" {
  name              = "/aiops/backup"
  retention_in_days = 14
}

# Create a metric filter that counts ERROR occurrences in the backup log group
resource "aws_cloudwatch_log_metric_filter" "backup_errors" {
  name           = "BackupErrorsFilter"
  log_group_name = aws_cloudwatch_log_group.backup.name
  pattern        = "ERROR"

  metric_transformation {
    name      = "BackupErrors"
    namespace = "AiOps/Backup/Logs"
    value     = "1"
    default_value = 0
  }
}

# SNS topic for backup alerts
resource "aws_sns_topic" "backup_alerts" {
  name = "backup-alerts"
}

resource "aws_sns_topic_subscription" "backup_email" {
  topic_arn = aws_sns_topic.backup_alerts.arn
  protocol  = "email"
  endpoint  = var.backup_sns_email
}

# Alarm when log filter reports any error in 1 minute
resource "aws_cloudwatch_metric_alarm" "backup_log_errors" {
  alarm_name          = "BackupLogErrors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = aws_cloudwatch_log_metric_filter.backup_errors.metric_transformation[0].name
  namespace           = aws_cloudwatch_log_metric_filter.backup_errors.metric_transformation[0].namespace
  period              = 60
  threshold           = 0.5
  alarm_description   = "Alarm when backup logs show errors"

  alarm_actions = [aws_sns_topic.backup_alerts.arn]
}

# Alarm for missing backups (based on custom metric BackupSuccess published by script)
resource "aws_cloudwatch_metric_alarm" "backup_missing" {
  alarm_name          = "BackupMissingAlarm"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "BackupSuccess"
  namespace           = "AiOps/Backup"
  period              = 60
  threshold           = 1
  statistic           = "Sum"
  alarm_description   = "Alarm if backups are not succeeding (sum of BackupSuccess < 1 over 2 minutes)"

  alarm_actions = [aws_sns_topic.backup_alerts.arn]
}

# IAM policy fragment for backup runner (example)
resource "aws_iam_policy" "backup_policy" {
  name        = "backup-runner-policy"
  description = "Least-privilege policy for backup runner to upload to S3, push metrics and publish SNS"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = ["s3:PutObject", "s3:ListBucket", "s3:DeleteObject"],
        Resource = [
          aws_s3_bucket.backup_bucket.arn,
          "${aws_s3_bucket.backup_bucket.arn}/${var.bucket_prefix}/*"
        ]
      },
      {
        Effect = "Allow",
        Action = ["cloudwatch:PutMetricData"],
        Resource = "*"
      },
      {
        Effect = "Allow",
        Action = ["sns:Publish"],
        Resource = [aws_sns_topic.backup_alerts.arn]
      }
    ]
  })
}

output "backup_sns_topic_arn" {
  value = aws_sns_topic.backup_alerts.arn
}

output "backup_log_group" {
  value = aws_cloudwatch_log_group.backup.name
}
