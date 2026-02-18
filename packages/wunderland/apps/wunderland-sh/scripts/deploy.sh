#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# deploy.sh — Build and deploy Wunderland Sol to Linode
#
# Reads LINODE_HOST and LINODE_PASSWORD from environment.
# Locally:  source .env.deploy before running, or export them.
# CI:       GitHub secrets are injected automatically.
#
# Usage:
#   ./scripts/deploy.sh          # full build + deploy
#   ./scripts/deploy.sh --skip-build  # deploy existing build
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$ROOT_DIR/app"
REMOTE_DIR="/opt/wunderland-sol"

# Load .env.deploy if it exists (local dev)
if [[ -f "$ROOT_DIR/.env.deploy" ]]; then
  echo "Loading credentials from .env.deploy"
  set -a
  source "$ROOT_DIR/.env.deploy"
  set +a
fi

# Validate required vars
if [[ -z "${LINODE_HOST:-}" ]]; then
  echo "Error: LINODE_HOST is not set. Export it or create .env.deploy"
  exit 1
fi
if [[ -z "${LINODE_PASSWORD:-}" ]]; then
  echo "Error: LINODE_PASSWORD is not set. Export it or create .env.deploy"
  exit 1
fi

SKIP_BUILD=false
if [[ "${1:-}" == "--skip-build" ]]; then
  SKIP_BUILD=true
fi

# ---- Build ----
if [[ "$SKIP_BUILD" == false ]]; then
  echo "=== Building SDK + Next.js app ==="
  cd "$ROOT_DIR"
  pnpm install
  pnpm build
fi

# ---- Create tarball ----
echo "=== Creating deployment tarball ==="
DEPLOY_DIR=$(mktemp -d)
TARBALL=$(mktemp /tmp/deploy-XXXXX.tar.gz)

cp -r "$APP_DIR/.next/standalone/"* "$DEPLOY_DIR/"
mkdir -p "$DEPLOY_DIR/app/.next"
cp -r "$APP_DIR/.next/static" "$DEPLOY_DIR/app/.next/static"
mkdir -p "$DEPLOY_DIR/app/public"
cp -r "$APP_DIR/public/"* "$DEPLOY_DIR/app/public/" 2>/dev/null || true

# Copy app .env if it exists (for runtime env vars like NEXT_PUBLIC_*)
if [[ -f "$APP_DIR/.env" ]]; then
  echo "Including app/.env in deployment"
  cp "$APP_DIR/.env" "$DEPLOY_DIR/app/.env"
fi

# Verify build
ls "$DEPLOY_DIR/app/server.js" > /dev/null
ls "$DEPLOY_DIR/app/.next/BUILD_ID" > /dev/null

cd "$DEPLOY_DIR" && tar czf "$TARBALL" . && cd "$ROOT_DIR"
rm -rf "$DEPLOY_DIR"

echo "Tarball: $(du -h "$TARBALL" | cut -f1)"

# ---- Deploy via SSH ----
echo "=== Deploying to $LINODE_HOST ==="
export SSHPASS="$LINODE_PASSWORD"
SSH_OPTS="-o StrictHostKeyChecking=no"

# Stop app and clean
sshpass -e ssh $SSH_OPTS root@"$LINODE_HOST" \
  "systemctl stop wunderland-sol 2>/dev/null || true; rm -rf $REMOTE_DIR; mkdir -p $REMOTE_DIR"

# Upload tarball
sshpass -e scp $SSH_OPTS "$TARBALL" root@"$LINODE_HOST":/tmp/deploy.tar.gz
rm -f "$TARBALL"

# Extract and restart
sshpass -e ssh $SSH_OPTS root@"$LINODE_HOST" << 'REMOTE'
set -e
cd /opt/wunderland-sol
tar xzf /tmp/deploy.tar.gz
rm /tmp/deploy.tar.gz

echo "=== Verify ==="
ls -la /opt/wunderland-sol/app/server.js
ls -la /opt/wunderland-sol/app/.next/BUILD_ID

systemctl daemon-reload
systemctl restart wunderland-sol
sleep 3
systemctl is-active wunderland-sol && echo "App is running!" || (journalctl -u wunderland-sol --no-pager -n 20 && exit 1)
REMOTE

echo "=== Deploy complete ==="
