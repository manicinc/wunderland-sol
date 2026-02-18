#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# deploy-env.sh — Copy local .env files to production servers
# ============================================================
# Usage:
#   ./scripts/deploy-env.sh              # deploy to both
#   ./scripts/deploy-env.sh rabbithole   # deploy to rabbithole only
#   ./scripts/deploy-env.sh wunderland   # deploy to wunderland only
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

SSH_KEY="$HOME/.ssh/wunderland-linode"

# Server IPs
RABBITHOLE_HOST="50.116.46.22"
WUNDERLAND_HOST="50.116.46.76"

# Remote paths (where docker-compose.yml expects .env)
RABBITHOLE_REMOTE_DIR="/app/rabbithole/deployment/rabbithole"
WUNDERLAND_REMOTE_DIR="/app/wunderland/deployment/wunderland-sol"

# Local .env sources
BACKEND_ENV="$REPO_ROOT/backend/.env"
RABBITHOLE_ENV="$REPO_ROOT/apps/rabbithole/.env"

TARGET="${1:-all}"

ssh_cmd() {
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "root@$1" "${@:2}"
}

scp_cmd() {
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$1" "root@$2:$3"
}

deploy_rabbithole() {
  echo "=== Deploying .env to rabbithole ($RABBITHOLE_HOST) ==="

  if [ ! -f "$BACKEND_ENV" ]; then
    echo "ERROR: backend/.env not found at $BACKEND_ENV"
    exit 1
  fi
  if [ ! -f "$RABBITHOLE_ENV" ]; then
    echo "ERROR: apps/rabbithole/.env not found at $RABBITHOLE_ENV"
    exit 1
  fi

  # Ensure remote dir exists
  ssh_cmd "$RABBITHOLE_HOST" "mkdir -p $RABBITHOLE_REMOTE_DIR"

  # Merge backend + rabbithole .env into one file for docker-compose
  echo "[rabbithole] Merging backend/.env + apps/rabbithole/.env → server .env"
  {
    echo "# === Backend (NestJS) ==="
    cat "$BACKEND_ENV"
    echo ""
    echo "# === Frontend (RabbitHole Next.js) ==="
    cat "$RABBITHOLE_ENV"
  } > /tmp/rabbithole-merged.env

  scp_cmd /tmp/rabbithole-merged.env "$RABBITHOLE_HOST" "$RABBITHOLE_REMOTE_DIR/.env"
  rm -f /tmp/rabbithole-merged.env

  echo "[rabbithole] .env deployed successfully"
  ssh_cmd "$RABBITHOLE_HOST" "wc -l $RABBITHOLE_REMOTE_DIR/.env"
}

deploy_wunderland() {
  echo "=== Deploying .env to wunderland-sol ($WUNDERLAND_HOST) ==="

  if [ ! -f "$BACKEND_ENV" ]; then
    echo "ERROR: backend/.env not found at $BACKEND_ENV"
    exit 1
  fi

  # Ensure remote dir exists
  ssh_cmd "$WUNDERLAND_HOST" "mkdir -p $WUNDERLAND_REMOTE_DIR"

  # Backend .env is the main one for wunderland-sol
  echo "[wunderland] Copying backend/.env → server .env"
  scp_cmd "$BACKEND_ENV" "$WUNDERLAND_HOST" "$WUNDERLAND_REMOTE_DIR/.env"

  echo "[wunderland] .env deployed successfully"
  ssh_cmd "$WUNDERLAND_HOST" "wc -l $WUNDERLAND_REMOTE_DIR/.env"
}

case "$TARGET" in
  rabbithole|rabbit)
    deploy_rabbithole
    ;;
  wunderland|wunder)
    deploy_wunderland
    ;;
  all|both)
    deploy_rabbithole
    echo ""
    deploy_wunderland
    ;;
  *)
    echo "Usage: $0 [rabbithole|wunderland|all]"
    exit 1
    ;;
esac

echo ""
echo "Done. Run 'docker compose up -d --build' on the server to apply."
