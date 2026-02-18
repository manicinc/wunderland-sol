#!/usr/bin/env bash
# Push .env files to production servers.
# Usage: ./deployment/deploy-env.sh [wunderland|rabbithole|all]

set -euo pipefail

SSH_KEY="$HOME/.ssh/wunderland-linode"
WUNDERLAND_HOST="50.116.46.76"
RABBITHOLE_HOST="50.116.46.22"

DIR="$(cd "$(dirname "$0")" && pwd)"

push_wunderland() {
  echo "→ Pushing .env to wunderland ($WUNDERLAND_HOST)..."
  scp -i "$SSH_KEY" "$DIR/wunderland-sol/.env" "root@$WUNDERLAND_HOST:/app/wunderland/deployment/wunderland-sol/.env"
  echo "  Done."
}

push_rabbithole() {
  echo "→ Pushing .env to rabbithole ($RABBITHOLE_HOST)..."
  scp -i "$SSH_KEY" "$DIR/rabbithole/.env" "root@$RABBITHOLE_HOST:/app/rabbithole/deployment/rabbithole/.env"
  echo "  Done."
}

case "${1:-all}" in
  wunderland) push_wunderland ;;
  rabbithole) push_rabbithole ;;
  all)        push_wunderland; push_rabbithole ;;
  *)          echo "Usage: $0 [wunderland|rabbithole|all]"; exit 1 ;;
esac
