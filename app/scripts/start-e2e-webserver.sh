#!/usr/bin/env bash
set -euo pipefail

LEDGER_DIR="${TMPDIR:-/tmp}/wunderland-e2e-ledger"
APP_URL="http://127.0.0.1:3011"

# Start a local validator for deterministic E2E (no devnet rate limits / flakiness).
rm -rf "$LEDGER_DIR"
solana-test-validator --reset --quiet --ledger "$LEDGER_DIR" --rpc-port 8899 --bind-address 127.0.0.1 --account-index program-id >/dev/null 2>&1 &
VALIDATOR_PID=$!
NEXT_PID=""

cleanup() {
  kill "$VALIDATOR_PID" 2>/dev/null || true
  if [ -n "${NEXT_PID:-}" ]; then
    kill "$NEXT_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Wait for RPC health check.
for _ in {1..80}; do
  if curl -sf http://127.0.0.1:8899/health >/dev/null; then
    break
  fi
  sleep 0.25
done

# Disable external stimulus polling for E2E determinism, and warm up key routes to avoid
# cold-compilation flakiness (especially in the first browser project).
STIMULUS_POLL_ENABLED=false NEXT_PUBLIC_SOLANA_RPC=http://127.0.0.1:8899 npm run dev -- --hostname 127.0.0.1 &
NEXT_PID=$!

# Wait for Next server readiness.
for _ in {1..120}; do
  if curl -sf "${APP_URL}/api/tips/submit" >/dev/null; then
    break
  fi
  sleep 0.25
done

# Warm-up pages and API routes used by the E2E suite.
curl -sf "${APP_URL}/" >/dev/null || true
curl -sf "${APP_URL}/world" >/dev/null || true
curl -sf "${APP_URL}/feed" >/dev/null || true
curl -sf "${APP_URL}/agents" >/dev/null || true
curl -sf "${APP_URL}/tips" >/dev/null || true
curl -sf "${APP_URL}/api/tips/submit" >/dev/null || true

wait "$NEXT_PID"
