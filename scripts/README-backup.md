Backup script: backup-to-s3.sh

What it does
- Creates a timestamped tar.gz snapshot of configured directories every INTERVAL_SECONDS (default 30s)
- Optionally includes a MongoDB dump if MONGO_URI is set and mongodump is available
- Uploads the archive to an S3 bucket using storage class STANDARD
- Performs a best-effort cleanup of S3 objects older than RETENTION_DAYS (recommended: use an S3 lifecycle policy instead)

Quickstart
1) Configure environment variables (recommended to use systemd Environment or export in your shell):
   export BUCKET_NAME=my-backup-bucket
   export AWS_REGION=us-east-1
   export TARGET_DIRS="/home /etc /var/www"
   export INTERVAL_SECONDS=30
   export RETENTION_DAYS=7
   (optional) export MONGO_URI="mongodb://user:pass@localhost:27017"

2) Make script executable:
   chmod +x scripts/backup-to-s3.sh

3) Run once as dry-run to verify (won't upload):
   DRY_RUN=1 RUN_ONCE=1 ./scripts/backup-to-s3.sh

4) To run continuously (systemd recommended):
   place the service file at /etc/systemd/system/backup-to-s3.service (or use provided file), edit env vars in it, then:
     sudo systemctl daemon-reload
     sudo systemctl enable --now backup-to-s3
   Logs: sudo journalctl -u backup-to-s3 -f

IAM minimal S3 policy (least privilege)
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BackupUpload",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:ListBucket", "s3:DeleteObject"],
      "Resource": [
        "arn:aws:s3:::<BUCKET_NAME>",
        "arn:aws:s3:::<BUCKET_NAME>/backups/*"
      ]
    }
  ]
}

Notes & Recommendations
- Taking snapshots every 30s can generate a lot of data; ensure your S3 costs and network are acceptable.
- Prefer using S3 Lifecycle rules to expire old objects instead of relying on client-side deletion.
- For production, run the agent with an IAM role (EC2/ECS/EKS) rather than static keys.
- Test carefully with DRY_RUN=1 before enabling automatic uploads.
- Avoid snapshotting very large directories or live DB files directly; prefer DB dumps for consistent backups.

Docker snapshots & ECR
- Set DOCKER_CONTAINERS to a space-separated list of container ids or names you want snapshotted.
- The script can perform 'docker commit' and either save the image to a tar and upload to S3 (default) or push it to ECR (if USE_ECR=1).
- Required env vars for ECR: USE_ECR=1, AWS_ACCOUNT_ID, ECR_REPO.

Cognito
- If you prefer to obtain temporary AWS credentials via Cognito, set USE_COGNITO=1 and provide COGNITO_IDENTITY_POOL_ID.
- The script will call Cognito Identity to request an identity and then get temporary credentials used for S3/ECR operations.

Security
- It's recommended to run this script under a least-privilege IAM role (instance/profile/task role) rather than with long-lived credentials.
- For ECR pushes in production, ensure the repo exists and the role has ecr:CreateRepository, ecr:PutImage, ecr:InitiateLayerUpload, ecr:UploadLayerPart, ecr:CompleteLayerUpload, and ecr:BatchCheckLayerAvailability.

Monitoring & Alerts
- The script publishes a CloudWatch metric `AiOps/Backup:BackupSuccess` with value 1 on successful backup and 0 on failure (when not in DRY_RUN).
- You can configure an SNS topic and set `SNS_TOPIC_ARN` to receive failure notifications.
- The included Terraform config `terraform/monitoring.tf` creates an SNS topic, CloudWatch Log Group `/aiops/backup`, a metric filter that counts `ERROR` occurrences, and two alarms:
  - `BackupLogErrors`: triggers when log ERRORs occur (pushes to SNS)
  - `BackupMissingAlarm`: triggers if `BackupSuccess` sum < 1 over 2 minutes (pushes to SNS)

Autoscaling
- For Kubernetes/EKS, a sample HPA manifest is provided at `k8s/backup-hpa.yaml` (CPU-based). For custom metrics (queue size, backup success), integrate the metrics adapter and external metrics provider.
- For node autoscaling, install and configure the AWS "cluster-autoscaler" on EKS and ensure nodegroup AutoScalingGroup has proper tags.

IAM
- `terraform/monitoring.tf` contains a sample `aws_iam_policy` for the backup runner with minimal S3, CloudWatch, and SNS permissions. Attach this policy to the instance/role running the backup script.
