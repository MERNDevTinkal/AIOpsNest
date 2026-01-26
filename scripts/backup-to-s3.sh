#!/usr/bin/env bash
# backup-to-s3.sh
# Purpose: take periodic snapshots (filesystem + optional mongodump) and upload to S3 (STANDARD).
# Additionally: can snapshot Docker containers (docker commit + save or push to ECR) and optionally obtain AWS credentials via Cognito.
# Usage: set env vars (see README); Defaults: INTERVAL_SECONDS=30, RETENTION_DAYS=7

set -euo pipefail
IFS=$'\n\t'

# --- Configuration (override with env vars) ---
BUCKET_NAME=${BUCKET_NAME:-""}          # S3 bucket name (not required when DRY_RUN=1)
BUCKET_PREFIX=${BUCKET_PREFIX:-"backups"}
AWS_REGION=${AWS_REGION:-"us-east-1"}
INTERVAL_SECONDS=${INTERVAL_SECONDS:-30}
RETENTION_DAYS=${RETENTION_DAYS:-7}      # optional retention cleanup (uses awscli)
TARGET_DIRS=${TARGET_DIRS:-"/home /etc /var/www"}  # space-separated list of dirs to snapshot
MONGO_URI=${MONGO_URI:-""}              # optional: set to enable mongodump
DRY_RUN=${DRY_RUN:-0}                    # if 1, don't upload to S3/ECR (for testing)
RUN_ONCE=${RUN_ONCE:-0}                  # if 1, perform one snapshot and exit

# Docker snapshot options
DOCKER_CONTAINERS=${DOCKER_CONTAINERS:-""}  # space-separated list of container names or ids
DOCKER_COMMIT_PREFIX=${DOCKER_COMMIT_PREFIX:-"snapshot"}
DOCKER_SAVE_TO_S3=${DOCKER_SAVE_TO_S3:-1}    # if 1, save image tar to S3; if 0 and USE_ECR=1, push to ECR
USE_ECR=${USE_ECR:-0}                        # if 1, push committed images to AWS ECR
ECR_REPO=${ECR_REPO:-""}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-""}

# Cognito (optional) - exchange identity pool for temporary AWS creds
USE_COGNITO=${USE_COGNITO:-0}
COGNITO_IDENTITY_POOL_ID=${COGNITO_IDENTITY_POOL_ID:-""}

LOG_PREFIX="[backup-to-s3]"

# --- Helpers ---
_log() { echo "${LOG_PREFIX} $*"; }
_err() { echo "${LOG_PREFIX} ERROR: $*" >&2; }

# If not in DRY_RUN mode, BUCKET_NAME is required
if [[ "${DRY_RUN}" != "1" && -z "${BUCKET_NAME}" ]]; then
  _err "BUCKET_NAME is not set. Export BUCKET_NAME and try again, or run DRY_RUN=1 for testing."
  exit 2
fi

if [[ -z "${DOCKER_CONTAINERS}" ]]; then
  _log "DOCKER_CONTAINERS not set - skipping docker snapshots"
fi

if ! command -v aws >/dev/null 2>&1; then
  _err "aws CLI is required (https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)"
  exit 3
fi

if ! command -v tar >/dev/null 2>&1; then
  _err "tar is required"
  exit 4
fi

if [[ -n "${MONGO_URI}" ]] && ! command -v mongodump >/dev/null 2>&1; then
  _log "mongodump not found; MongoDB dump will be skipped"
  MONGO_URI=""
fi

if [[ -n "${DOCKER_CONTAINERS}" ]] && ! command -v docker >/dev/null 2>&1; then
  _log "docker not found; Docker snapshots will be skipped"
  DOCKER_CONTAINERS=""
fi

# Cognito helper: obtain temporary credentials and export them for aws CLI
assume_cognito() {
  if [[ "${USE_COGNITO}" != "1" ]]; then
    return 0
  fi
  if [[ -z "${COGNITO_IDENTITY_POOL_ID}" ]]; then
    _err "USE_COGNITO=1 but COGNITO_IDENTITY_POOL_ID is not set"
    return 1
  fi

  _log "requesting Cognito identity id for pool ${COGNITO_IDENTITY_POOL_ID}"
  ID=$(aws cognito-identity get-id --identity-pool-id "${COGNITO_IDENTITY_POOL_ID}" --region "${AWS_REGION}" --query 'IdentityId' --output text 2>/dev/null) || ID=""
  if [[ -z "$ID" ]]; then
    _err "failed to get Cognito identity id"
    return 1
  fi

  _log "requesting temporary credentials for identity ${ID}"
  AWS_ACCESS_KEY_ID=$(aws cognito-identity get-credentials-for-identity --identity-id "$ID" --region "${AWS_REGION}" --query 'Credentials.AccessKeyId' --output text 2>/dev/null) || AWS_ACCESS_KEY_ID=""
  AWS_SECRET_ACCESS_KEY=$(aws cognito-identity get-credentials-for-identity --identity-id "$ID" --region "${AWS_REGION}" --query 'Credentials.SecretKey' --output text 2>/dev/null) || AWS_SECRET_ACCESS_KEY=""
  AWS_SESSION_TOKEN=$(aws cognito-identity get-credentials-for-identity --identity-id "$ID" --region "${AWS_REGION}" --query 'Credentials.SessionToken' --output text 2>/dev/null) || AWS_SESSION_TOKEN=""

  if [[ -z "$AWS_ACCESS_KEY_ID" || -z "$AWS_SECRET_ACCESS_KEY" ]]; then
    _err "failed to obtain credentials from Cognito"
    return 1
  fi

  export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
  _log "exported AWS temporary credentials from Cognito"
}

# Graceful shutdown
cleanup() {
  [[ -n "${TMPDIR:-}" ]] && rm -rf "${TMPDIR}" || true
}
trap cleanup EXIT INT TERM

# Convert TARGET_DIRS string into array
read -ra DIRS <<< "${TARGET_DIRS}"
read -ra CONTAINERS <<< "${DOCKER_CONTAINERS}"

docker_snapshot() {
  [[ ${#CONTAINERS[@]} -eq 0 ]] && return 0
  TS=$1
  HOST=$(hostname -s)

  for c in "${CONTAINERS[@]}"; do
    IMAGE_TAG="${DOCKER_COMMIT_PREFIX}-${HOST}-${TS}-${c//[^a-zA-Z0-9_-]/_}"
    _log "committing container ${c} -> ${IMAGE_TAG}"
    if [[ "${DRY_RUN}" == "1" ]]; then
      _log "DRY_RUN=1 - would run: docker commit ${c} ${IMAGE_TAG}"
    else
      if ! docker commit "${c}" "${IMAGE_TAG}" >/dev/null 2>&1; then
        _err "docker commit failed for ${c}; skipping"
        continue
      fi
    fi

    # If ECR push is requested
    if [[ "${USE_ECR}" == "1" ]]; then
      if [[ -z "${AWS_ACCOUNT_ID}" || -z "${ECR_REPO}" ]]; then
        _err "USE_ECR=1 but AWS_ACCOUNT_ID or ECR_REPO is not set; skipping ECR push"
      else
        ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${IMAGE_TAG}"
        _log "tagging image ${IMAGE_TAG} -> ${ECR_URI}"
        if [[ "${DRY_RUN}" == "1" ]]; then
          _log "DRY_RUN=1 - would tag ${IMAGE_TAG} as ${ECR_URI} and push to ECR"
        else
          # ensure repo exists
          if ! aws ecr describe-repositories --repository-names "${ECR_REPO}" --region "${AWS_REGION}" >/dev/null 2>&1; then
            _log "creating ECR repository ${ECR_REPO}"
            aws ecr create-repository --repository-name "${ECR_REPO}" --region "${AWS_REGION}" >/dev/null 2>&1 || _err "failed to create ecr repo"
          fi
          # login
          aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com" >/dev/null 2>&1 || _err "docker login to ECR failed"
          docker tag "${IMAGE_TAG}" "${ECR_URI}" || _err "docker tag failed"
          docker push "${ECR_URI}" || _err "docker push failed"
        fi
      fi
    fi

    # Optionally save tar and upload to S3
    if [[ "${DOCKER_SAVE_TO_S3}" == "1" ]]; then
      TAR_NAME="docker-${IMAGE_TAG}.tar"
      TMPDIR_IMG=$(mktemp -d)
      if [[ "${DRY_RUN}" == "1" ]]; then
        _log "DRY_RUN=1 - would save image ${IMAGE_TAG} to ${TAR_NAME} and upload to s3://${BUCKET_NAME}/${BUCKET_PREFIX%/}/${TAR_NAME}"
      else
        docker save "${IMAGE_TAG}" -o "${TMPDIR_IMG}/${TAR_NAME}" || _err "docker save failed for ${IMAGE_TAG}"
        aws s3 cp "${TMPDIR_IMG}/${TAR_NAME}" "s3://${BUCKET_NAME}/${BUCKET_PREFIX%/}/${TAR_NAME}" --region "${AWS_REGION}" --storage-class STANDARD || _err "upload failed"
        rm -rf "${TMPDIR_IMG}" || true
      fi
    fi
  done
}

_loop_once() {
  TS=$(date -u +"%Y%m%dT%H%M%SZ")
  HOST=$(hostname -s)
  FILE_NAME="backup-${HOST}-${TS}.tar.gz"
  OBJECT_KEY="${BUCKET_PREFIX%/}/${FILE_NAME}"

  TMPDIR=$(mktemp -d)
  _log "created tmpdir ${TMPDIR}"

  # Optionally assume Cognito identity to set AWS credentials
  if [[ "${USE_COGNITO}" == "1" ]]; then
    assume_cognito || _err "Cognito auth failed"
  fi

  # Optional: run mongodump
  if [[ -n "${MONGO_URI}" ]]; then
    _log "running mongodump"
    if ! mongodump --uri="$MONGO_URI" --archive="$TMPDIR/mongodump.archive" --gzip >/dev/null 2>&1; then
      _err "mongodump failed; continuing without DB dump"
      rm -f "$TMPDIR/mongodump.archive" || true
    fi
  fi

  # create tar. Use absolute paths (may require permissions). We ignore non-fatal tar warnings.
  TAR_PATH="$TMPDIR/archive.tar.gz"
  _log "creating tar ${TAR_PATH}"
  set +e
  tar -czf "$TAR_PATH" ${DIRS[*]} 2>/dev/null
  TAR_STATUS=$?
  set -e
  if [[ $TAR_STATUS -ne 0 ]]; then
    _log "tar command finished with warnings/errors (code=$TAR_STATUS). Some files may be missing due to permissions."
  fi

  # include mongodump if present
  if [[ -f "$TMPDIR/mongodump.archive" ]]; then
    _log "adding mongodump to archive"
    gzip -c "$TMPDIR/mongodump.archive" > "$TMPDIR/mongodump.archive.gz" || true
    tar -rf "$TAR_PATH" -C "$TMPDIR" "mongodump.archive.gz" || true
    # recompress tar to gz
    mv "$TAR_PATH" "$TAR_PATH.tmp" && gzip -c "$TAR_PATH.tmp" > "$TAR_PATH" && rm -f "$TAR_PATH.tmp" || true
  fi

  # Snapshot docker containers if requested
  if [[ -n "${DOCKER_CONTAINERS}" ]]; then
    docker_snapshot "$TS"
  fi

  # perform upload and mark success/failure
  UPLOAD_OK=0
  if [[ "${DRY_RUN}" == "1" ]]; then
    _log "DRY_RUN=1 - would upload ${TAR_PATH} -> s3://${BUCKET_NAME}/${OBJECT_KEY}"
    UPLOAD_OK=1
  else
    _log "uploading to s3://${BUCKET_NAME}/${OBJECT_KEY} (storage class: STANDARD)"
    if aws s3 cp "$TAR_PATH" "s3://${BUCKET_NAME}/${OBJECT_KEY}" --region "${AWS_REGION}" --storage-class STANDARD >/dev/null 2>&1; then
      UPLOAD_OK=1
    else
      _err "upload failed"
      UPLOAD_OK=0
    fi
  fi

  # Emit CloudWatch metric for backup success (1) / failure (0)
  if command -v aws >/dev/null 2>&1 && [[ "${DRY_RUN}" != "1" ]]; then
    _log "publishing CloudWatch metric: BackupSuccess=${UPLOAD_OK}"
    aws cloudwatch put-metric-data --namespace "AiOps/Backup" --metric-name "BackupSuccess" --value "${UPLOAD_OK}" --dimensions Host="${HOST}",Bucket="${BUCKET_NAME}" --region "${AWS_REGION}" >/dev/null 2>&1 || _err "failed to put metric"
  fi

  # On failure, publish to SNS if configured
  if [[ "${UPLOAD_OK}" -ne 1 && -n "${SNS_TOPIC_ARN:-}" ]]; then
    _log "publishing failure notification to SNS: ${SNS_TOPIC_ARN}"
    MSG="Backup failed for host ${HOST} at ${TS}. Object: s3://${BUCKET_NAME}/${OBJECT_KEY}. Check logs for details."
    aws sns publish --topic-arn "${SNS_TOPIC_ARN}" --subject "Backup failure on ${HOST}" --message "$MSG" --region "${AWS_REGION}" >/dev/null 2>&1 || _err "failed to publish SNS message"
  fi

  # local cleanup
  rm -rf "$TMPDIR" || true

  # Remote retention: delete objects older than RETENTION_DAYS (best-effort)
  if [[ -n "${RETENTION_DAYS}" && "${RETENTION_DAYS}" -gt 0 ]]; then
    _log "pruning S3 objects older than ${RETENTION_DAYS} days under prefix ${BUCKET_PREFIX} (best-effort)"
    # Use awscli + jmespath to find objects older than cutoff
    CUTOFF=$(date -u -d "${RETENTION_DAYS} days ago" +"%Y-%m-%dT%H:%M:%SZ")
    # list keys and filter by LastModified <= cutoff
    KEYS=$(aws s3api list-objects-v2 --bucket "${BUCKET_NAME}" --prefix "${BUCKET_PREFIX%/}/" --query "Contents[?LastModified<= '${CUTOFF}' ].Key" --output text 2>/dev/null) || KEYS=""
    # Note: JMESPath date comparison may vary by environment. If this fails, prefer an S3 lifecycle policy instead.
    if [[ -n "$KEYS" ]]; then
      while read -r key; do
        [[ -z "$key" ]] && continue
        _log "deleting s3://${BUCKET_NAME}/$key"
        aws s3 rm "s3://${BUCKET_NAME}/$key" || _err "failed to delete s3://${BUCKET_NAME}/$key"
      done <<< "$KEYS"
    fi
  fi
}

_log "starting backup loop (interval=${INTERVAL_SECONDS}s). Press Ctrl+C to stop."
if [[ "${RUN_ONCE}" == "1" ]]; then
  _loop_once
  _log "run-once completed"
  exit 0
fi

while true; do
  _loop_once || _err "iteration failed"
  sleep ${INTERVAL_SECONDS}
done
