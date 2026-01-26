Kubernetes manifests (basic)

These are starter manifests for deploying services to a Kubernetes cluster (EKS). They are intentionally minimal — replace image placeholders with your ECR repo URLs and review security, RBAC, config maps and secrets before applying.

Recommended next steps:
- Replace `<ECR_REPO>/...:latest` with image URLs produced by CI/ECR
- Add Secrets for DB connection and SMTP credentials (do NOT store in plaintext manifests)
- Consider creating Helm charts for parameterization and templating
- Add probes, resource limits, HPA, PodDisruptionBudget, NetworkPolicies, and RBAC as needed

Apply examples:
  kubectl apply -f k8s/auth-deployment.yaml
  kubectl apply -f k8s/users-deployment.yaml
  kubectl apply -f k8s/gateway-deployment.yaml
  kubectl apply -f k8s/email-worker-deployment.yaml
