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

# Disable external stimulus polling for E2E determinism and ensure both server-side
# and client-side Solana reads use the local validator.
export STIMULUS_POLL_ENABLED=false
export SOLANA_RPC=http://127.0.0.1:8899
export WUNDERLAND_SOL_RPC_URL=http://127.0.0.1:8899
export NEXT_PUBLIC_SOLANA_RPC=http://127.0.0.1:8899
export NEXT_TELEMETRY_DISABLED=1

# Use a production build for E2E stability (avoids dev-server compilation races).
npm run build

npm run start -- --hostname 127.0.0.1 &
NEXT_PID=$!

# Wait for Next server readiness (HTML route first, then API route).
READY=0
for _ in {1..160}; do
  if curl -sf "${APP_URL}/" >/dev/null; then
    READY=1
    break
  fi
  sleep 0.25
done
if [ "$READY" -ne 1 ]; then
  echo "Next dev server did not become ready in time." >&2
  exit 1
fi

for _ in {1..160}; do
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
curl -sf "${APP_URL}/network" >/dev/null || true
curl -sf "${APP_URL}/api/tips/submit" >/dev/null || true

wait "$NEXT_PID"
