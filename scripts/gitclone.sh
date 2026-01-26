#!/usr/bin/env bash
# gitclone.sh - Clone a repository and perform safe initial setup steps
# Usage: ./scripts/gitclone.sh <repo-url> [branch] [--install] [--compose] [--terraform-init]

set -euo pipefail
IFS=$'\n\t'

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git is required. Install git and try again." >&2
  exit 2
fi

REPO_URL=${1:-}
BRANCH=${2:-main}
INSTALL_FLAG=0
COMPOSE_FLAG=0
TF_INIT_FLAG=0

# parse flags if present in args
for arg in "$@"; do
  case "$arg" in
    --install) INSTALL_FLAG=1 ;;
    --compose) COMPOSE_FLAG=1 ;;
    --terraform-init) TF_INIT_FLAG=1 ;;
  esac
done

if [[ -z "$REPO_URL" ]]; then
  echo "Usage: $0 <git-repo-url> [branch] [--install] [--compose] [--terraform-init]"
  exit 1
fi

DIR=$(basename -s .git "$REPO_URL")
if [[ -d "$DIR" ]]; then
  echo "Target directory '$DIR' already exists. Aborting to avoid overwriting." >&2
  exit 1
fi

echo "Cloning $REPO_URL (branch: $BRANCH) into $DIR..."
git clone --branch "$BRANCH" "$REPO_URL" "$DIR"
cd "$DIR"

echo "Initializing repository: $PWD"

# Copy .env.example to .env safely (do not overwrite existing .env)
if [[ -f ".env.example" ]]; then
  if [[ ! -f ".env" ]]; then
    cp .env.example .env
    echo "Created .env from .env.example — edit it to add secrets (DO NOT commit)."
  else
    echo ".env already exists — leaving it intact."
  fi
else
  echo "No .env.example found — create .env manually as needed."
fi

# Optional: install node deps
if [[ "$INSTALL_FLAG" -eq 1 ]]; then
  if command -v npm >/dev/null 2>&1; then
    echo "Installing npm dependencies at workspace root (may be a monorepo)..."
    npm ci || echo "npm ci failed — you may run npm install manually"
  else
    echo "npm not found; skipping npm install step."
  fi
fi

# Optional: start docker-compose dev environment if docker-compose file exists
if [[ "$COMPOSE_FLAG" -eq 1 ]]; then
  if command -v docker >/dev/null 2>&1 && [[ -f "docker-compose.dev.yml" || -f "docker-compose.yml" ]]; then
    FILE=docker-compose.dev.yml
    if [[ ! -f $FILE ]]; then FILE=docker-compose.yml; fi
    echo "Starting docker-compose ($FILE) in detached mode..."
    docker compose -f "$FILE" up -d || echo "docker compose failed — ensure Docker is running"
  else
    echo "Docker or compose file not found; skipping compose step."
  fi
fi

# Optional: run terraform init in terraform/ if requested
if [[ "$TF_INIT_FLAG" -eq 1 ]]; then
  if command -v terraform >/dev/null 2>&1 && [[ -d "terraform" ]]; then
    echo "Initializing terraform in ./terraform"
    (cd terraform && terraform init) || echo "terraform init failed"
  else
    echo "terraform not found or ./terraform missing; skipping terraform init"
  fi
fi

# Final notes and next steps
cat <<'EOF'

Clone + bootstrap finished.
Next recommended steps:
  1) Edit the .env file and fill required secrets (MONGO_URI, JWT secrets, AWS credentials or IAM role config).
  2) Read docs: docs/PROJECT_DOCUMENTATION.md and scripts/README-backup.md
  3) Test backup script dry-run: DRY_RUN=1 RUN_ONCE=1 ./scripts/backup-to-s3.sh
  4) If using Terraform, review variables in terraform/ and run 'terraform plan' before apply.

Security reminder: Do NOT commit secrets into git. Use Secrets Manager / SSM / IRSA or environment-specific secret stores.

EOF

exit 0
