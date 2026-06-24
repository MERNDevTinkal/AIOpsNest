# Project Documentation — Server Platform

> Comprehensive reference for the NestJS TypeScript microservices project, including auth, messaging, realtime, AI-Ops, infra (Terraform/EKS), CI/CD, monitoring, backups, and operational guidance.

---

## Table of Contents
1. Summary & Goals
2. Architecture Overview
3. Services & Responsibilities
4. Local Development & Quickstart
5. Environment & Configuration
6. Deployment & Infrastructure
7. Monitoring, Logging & Alerts
8. Backups & Restore
9. Security & Secrets
10. CI/CD & Release Flow
11. Testing Strategy
12. AI-Ops (Automated Remediation)
13. Operational Runbook & Troubleshooting
14. TODOs & Next Steps

---

## 1. Summary & Goals ✅
- Purpose: Provide a production-ready, scalable microservices backend in NestJS (TypeScript) with MongoDB, messaging (RabbitMQ/Amazon MQ), email verification, realtime webhooks + Socket.IO, and an AI-Ops coordinator for automated remediation.
- Non-functional goals: reliability (DLQ + retry queues), observability (CloudWatch/metrics), secure deployment (EKS + IAM), and CI/CD pipelines (GitHub Actions + optional Jenkins).

## 2. Architecture Overview 🔧
- Pattern: Microservices + event-driven messaging.
- Core components:
  - `apps/auth` — Auth service (register, login, JWT access & refresh, email verification, refresh token storage).
  - `apps/users` — User CRUD and profile management.
  - `apps/gateway` — API gateway (proxy / aggregated endpoints).
  - `apps/email-worker` — Consumes `user.created` events, sends verification emails (SMTP or SES).
  - `apps/realtime` — Webhook receiver + Socket.IO gateway to broadcast motion analytics (speed, distance, force).
  - `apps/web` — React frontend (Vite, Redux, Zod, Tailwind) with auth pages and realtime visualizer.
  - `apps/ai-ops` — Coordinator + agents to evaluate runtime/CI alerts and suggest fixes (majority voting, non-auto-apply by default).
  - `apps/dotnet/auth` — Example ASP.NET Core auth scaffold (migration example).
- Messaging: RabbitMQ (amqplib) with retry queues and DLQ; Terraform supports Amazon MQ.
- Storage: MongoDB (Mongoose); optional DynamoDB for other needs.

## 3. Services & Responsibilities 📂
- `auth`: registration, password hash (=bcrypt), JWT tokens, refresh token revocation, publish `user.created` event.
- `email-worker`: sends verification emails. Toggle behavior with `EMAIL_ENABLED` and `EMAIL_USE_SES`.
- `realtime`: receives webhooks, computes analytics, broadcasts to Socket.IO namespace `/realtime`.
- `ai-ops`: receives alerts, runs agents (lint-fix, test-runner, revert), aggregates votes, logs decisions, can create PRs (placeholder).

## 4. Local Development & Quickstart 🚀
Prerequisites: Docker, docker-compose, Node 20, npm, git.

1. Start core infra (dev):
   - npm run compose:up  # uses docker-compose.dev.yml to boot MongoDB, RabbitMQ and core services
2. Frontend dev:
   - cd apps/web && npm install && npm run dev
3. Run tests:
   - root: npm test
   - per-app: cd apps/ai-ops && npm ci && npm test

Notes: If `npm` or `git` are not installed in your environment, install them locally or use Docker for dev.

## 5. Environment & Configuration 🔑
- Global env: `.env.example` at repository root includes placeholders for `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `EMAIL_*` configs.
- Per-service env: check `apps/*/.env.example` or service `ConfigModule` wiring in `src/config`.
- Recommended: Use AWS Secrets Manager / SSM Parameter Store for production secrets and IRSA or instance profiles for EKS.

## 6. Deployment & Infrastructure ☁️
- Terraform (dir: `terraform/`) contains skeleton to provision VPC, EKS, ECR, Amazon MQ, SNS/SQS/SES, DynamoDB, CloudWatch, S3, CloudFront.
- Kubernetes manifests: `k8s/` includes sample `Deployment`, `Service`, `HPA` (CPU example) and health probes.
- Docker: each app includes `Dockerfile`. Images are pushed to ECR in CI.
- CI/CD: GitHub Actions workflows present for backend builds, frontend deploy to S3/CloudFront, and Terraform plan/apply scaffolding. Jenkins templates are provided for alternate pipelines.

## 7. Monitoring, Logging & Alerts 📊
- Logs:
  - CloudWatch: The backup runner writes logs; Terraform creates a Log Group `/aiops/backup` and a metric filter for `ERROR` occurrences.
- Metrics:
  - Script emits `AiOps/Backup:BackupSuccess` via CloudWatch `PutMetricData`.
- Alerts:
  - SNS topic `backup-alerts` (Terraform) + `BackupLogErrors` and `BackupMissingAlarm` metric alarms.
- Recommendations: integrate Prometheus + Grafana + Jaeger for more detailed app metrics/tracing.

## 8. Backups & Restore 🗄️
- Script: `scripts/backup-to-s3.sh`
  - Default behaviour: snapshots configured directories and optional `mongodump` every INTERVAL_SECONDS (default 30s), uploads to S3 (STANDARD), and emits CloudWatch metric.
  - Safety: `DRY_RUN` and `RUN_ONCE` flags for testing. Systemd service example provided at `scripts/backup-to-s3.service`.
  - Docker snapshots: set `DOCKER_CONTAINERS` to commit container images and optionally push to ECR or save tar to S3.
  - Credentials: Prefer IAM role or Cognito temporary creds (optional `USE_COGNITO`).
- Restore: download the relevant tar.gz from S3, extract files, and run database restore from `mongodump` archives if included.
- Note: Frequent (30s) snapshots produce large overhead; tune interval and retention.

## 9. Security & Secrets 🔒
- Use least-privilege IAM policies (example policy in `terraform/monitoring.tf`).
- Do not embed secrets in source. Use environment variables, Secrets Manager, or IRSA for EKS workloads.
- Use TLS for frontend + API endpoints and verify SES sender domains before enabling SES.

## 10. CI/CD & Release Flow ⚙️
- GitHub Actions are configured for backend image builds and frontend deploys to S3 + CloudFront.
- Terraform flows: `terraform plan` via Actions; `terraform apply` guarded by manual approval (recommended).
- Jenkins: declarative pipeline templates in `.jenkins/` for on-premise CI.

## 11. Testing Strategy ✅
- Unit tests: Jest configured at root and per-app (examples: `src/auth/auth.service.spec.ts`, `apps/realtime/...`)
- Integration/e2e: recommended to use `supertest` for HTTP + socket.io tests for `realtime` flows. Use docker-compose to spin test DBs.
- Coverage: add coverage step in CI and enforce thresholds.

## 12. AI-Ops (Automated Remediation) 🤖
- `apps/ai-ops` contains a coordinator that runs registered agents and aggregates votes.
- Agents included: `lint-fix-agent`, `test-runner-agent`, `revert-agent` (scaffolds only).
- Safety: auto-apply is disabled by default. Recommended flow: agent suggests changes → open PR → require human approvals or run canary tests → merge and deploy.
- Extensibility: add static analysis, dependency patching, or automated rollbacks as agents.

## 13. Operational Runbook & Troubleshooting 🧭
- Backup failures: check `journalctl -u backup-to-s3` and CloudWatch metrics/alarms; SNS notifies subscribed addresses.
- Email issues: confirm SES or SMTP credentials; check `email-worker` logs and RabbitMQ DLQ.
- Realtime: verify webhooks are delivered; confirm `apps/realtime` health and socket.io namespace `/realtime`.
- Missing images in ECR: ensure ECR repo exists and IAM role has push permissions; check GitHub Actions logs.

## 14. TODOs & Next Steps 📌
- Finish password-reset flow and end-to-end tests.
- Harden observability with Prometheus/Grafana and distributed tracing (Jaeger).
- Add Helm charts and Kustomize overlays for environments (dev/stage/prod).
- Implement safe PR creation and automated patching in `apps/ai-ops` (hooks, tests, and dry-run validations).
- [x] Add S3 lifecycle rules and archival (Glacier) for long-term retention.

---

## Appendix: Useful Commands
- Start local compose: npm run compose:up
- Run AI-Ops tests: cd apps/ai-ops && npm ci && npm test
- Run backup script in dry-run one-shot: DRY_RUN=1 RUN_ONCE=1 ./scripts/backup-to-s3.sh
- Terraform plan (example): terraform -chdir=terraform init && terraform -chdir=terraform plan -var "s3_bucket_name=..."

---

If you want, I can also export this Markdown into a `.docx` file and attach it, or generate a condensed PDF. Which format would you prefer? 🎯
