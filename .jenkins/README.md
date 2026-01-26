Jenkins pipeline templates

- `.jenkins/Jenkinsfile` - a declarative pipeline template that builds the .NET auth service, runs tests, builds and pushes Docker images to ECR, and performs Terraform plan/apply with a manual approval stage.

How to use:
- Configure credentials in Jenkins (aws keys, ecr registry, etc.) and reference them in the pipeline or credential bindings.
- Create a per-service Jenkinsfile or point jobs to include this template and set service-specific parameters.

Notes:
- This is a scaffold; update security practices and credential storage before using in production.
- If your organization prefers GitHub Actions for PR checks, consider keeping simple checks there and using Jenkins for environment deployment gates.
