#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ANCHOR_DIR="$(cd "${APP_DIR}/../anchor" && pwd)"
BACKEND_DIR="$(cd "${APP_DIR}/../backend" && pwd)"

LEDGER_DIR="${TMPDIR:-/tmp}/wunderland-e2e-ledger"
E2E_DIR="${TMPDIR:-/tmp}/wunderland-e2e"
E2E_WALLET_FILE="${E2E_DIR}/e2e-wallet.json"
VALIDATOR_URL="http://127.0.0.1:8899"

APP_URL="http://127.0.0.1:3011"
BACKEND_URL="http://127.0.0.1:3001"
IPFS_API_URL="http://127.0.0.1:5199"

# Ensure the Anchor program build artifacts exist (SBF + IDL).
rm -rf "$E2E_DIR"
mkdir -p "$E2E_DIR"
BACKEND_LOG="${E2E_DIR}/backend.log"
IPFS_LOG="${E2E_DIR}/ipfs.log"
ANCHOR_LOG="${E2E_DIR}/anchor.log"

PROGRAM_SO="${ANCHOR_DIR}/target/deploy/wunderland_sol.so"
if [ ! -f "$PROGRAM_SO" ]; then
  (cd "$ANCHOR_DIR" && anchor build) >"$ANCHOR_LOG" 2>&1
fi
PROGRAM_ID="$(cd "$ANCHOR_DIR" && node -p "require('./target/idl/wunderland_sol.json').address")"

# Start a local validator for deterministic E2E (no devnet rate limits / flakiness).
rm -rf "$LEDGER_DIR"
solana-test-validator --reset --quiet --ledger "$LEDGER_DIR" --rpc-port 8899 --bind-address 127.0.0.1 --account-index program-id --bpf-program "$PROGRAM_ID" "$PROGRAM_SO" >/dev/null 2>&1 &
VALIDATOR_PID=$!
NEXT_PID=""
BACKEND_PID=""
IPFS_PID=""

cleanup() {
  kill "$VALIDATOR_PID" 2>/dev/null || true
  if [ -n "${NEXT_PID:-}" ]; then
    kill "$NEXT_PID" 2>/dev/null || true
  fi
  if [ -n "${BACKEND_PID:-}" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "${IPFS_PID:-}" ]; then
    kill "$IPFS_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Wait for RPC health check.
for _ in {1..80}; do
  if curl -sf "${VALIDATOR_URL}/health" >/dev/null; then
    break
  fi
  sleep 0.25
done

# Create an ephemeral wallet for:
# - initializing the Anchor program PDAs
# - signing mint + managed-hosting onboarding in the browser (E2E adapter)
solana-keygen new --no-bip39-passphrase -s --force -o "$E2E_WALLET_FILE" >/dev/null 2>&1
E2E_WALLET_PUBKEY="$(solana-keygen pubkey "$E2E_WALLET_FILE")"
AIRDROP_OK=0
for _ in {1..10}; do
  if solana airdrop 50 "$E2E_WALLET_PUBKEY" --url "$VALIDATOR_URL" >/dev/null 2>&1; then
    AIRDROP_OK=1
    break
  fi
  sleep 0.25
done
if [ "$AIRDROP_OK" -ne 1 ]; then
  echo "Airdrop failed for E2E wallet." >&2
  exit 1
fi

# Initialize ProgramConfig + EconomicsConfig PDAs for minting.
(cd "$ANCHOR_DIR" && ANCHOR_PROVIDER_URL="$VALIDATOR_URL" ANCHOR_WALLET="$E2E_WALLET_FILE" WUNDERLAND_SOL_PROGRAM_ID="$PROGRAM_ID" node scripts/e2e-init.cjs) >>"$ANCHOR_LOG" 2>&1 || {
  echo "Anchor init script failed." >&2
  tail -n 200 "$ANCHOR_LOG" >&2 || true
  exit 1
}

# Start a lightweight fake IPFS HTTP API (no kubo dependency) so pin-metadata can run in E2E.
node "${APP_DIR}/scripts/fake-ipfs-server.mjs" --host 127.0.0.1 --port 5199 >"$IPFS_LOG" 2>&1 &
IPFS_PID=$!
for _ in {1..80}; do
  if curl -sf "${IPFS_API_URL}/health" >/dev/null; then
    break
  fi
  sleep 0.25
done
if ! curl -sf "${IPFS_API_URL}/health" >/dev/null; then
  echo "Fake IPFS server did not become ready in time." >&2
  tail -n 200 "$IPFS_LOG" >&2 || true
  exit 1
fi

# Start backend (NestJS) on 3001 (Next API routes proxy to it).
: >"$BACKEND_LOG"
(cd "$BACKEND_DIR" && npm run build) >>"$BACKEND_LOG" 2>&1 || {
  echo "Backend build failed." >&2
  tail -n 200 "$BACKEND_LOG" >&2 || true
  exit 1
}

(cd "$BACKEND_DIR" && exec env \
  PORT=3001 \
  FRONTEND_URL="$APP_URL" \
  WUNDERLAND_ENABLED=true \
  GLOBAL_ACCESS_PASSWORD="e2e-password" \
  WUNDERLAND_SOL_RPC_URL="$VALIDATOR_URL" \
  WUNDERLAND_SOL_PROGRAM_ID="$PROGRAM_ID" \
  WUNDERLAND_SOL_CLUSTER="devnet" \
  CHAINSTACK_RPC_ENDPOINT="" \
  CHAINSTACK_RPC_ENDPOINT_2="" \
  WUNDERLAND_AUTONOMOUS="false" \
  ENABLE_SOCIAL_ORCHESTRATION="false" \
  WUNDERLAND_WORLD_FEED_INGESTION_ENABLED="false" \
  WUNDERLAND_GITHUB_JOBS_ENABLED="false" \
  ENABLE_JOB_SCANNING="false" \
  node --experimental-specifier-resolution=node dist/src/main.js) >>"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

for _ in {1..600}; do
  if curl -sf "${BACKEND_URL}/api/wunderland/status" >/dev/null; then
    break
  fi
  sleep 0.25
done
if ! curl -sf "${BACKEND_URL}/api/wunderland/status" >/dev/null; then
  echo "Backend did not become ready in time." >&2
  tail -n 200 "$BACKEND_LOG" >&2 || true
  exit 1
fi

# Disable external stimulus polling for E2E determinism and ensure both server-side
# and client-side Solana reads use the local validator.
export STIMULUS_POLL_ENABLED=false
export SOLANA_RPC="${VALIDATOR_URL}"
export WUNDERLAND_SOL_RPC_URL="${VALIDATOR_URL}"
export WUNDERLAND_SOL_PROGRAM_ID="${PROGRAM_ID}"
export WUNDERLAND_SOL_CLUSTER="devnet"
export SOLANA_CLUSTER="devnet"
export PROGRAM_ID="${PROGRAM_ID}"
export NEXT_PUBLIC_SOLANA_RPC="${VALIDATOR_URL}"
export NEXT_PUBLIC_PROGRAM_ID="${PROGRAM_ID}"
export NEXT_PUBLIC_CLUSTER="devnet"
export WUNDERLAND_BACKEND_URL="${BACKEND_URL}"
export WUNDERLAND_IPFS_API_URL="${IPFS_API_URL}"
export WUNDERLAND_IPFS_GATEWAY_URL="${IPFS_API_URL}"
export CHAINSTACK_RPC_ENDPOINT=""
export CHAINSTACK_RPC_ENDPOINT_2=""
export NEXT_PUBLIC_E2E_WALLET="true"
export NEXT_PUBLIC_E2E_WALLET_SECRET_KEY_JSON="$(tr -d '\n\r' < "$E2E_WALLET_FILE")"
export NEXT_TELEMETRY_DISABLED=1

# Use a production build for E2E stability (avoids dev-server compilation races).
(cd "$APP_DIR" && npm run build) >/dev/null

# Next 15+ with `output: standalone` requires running the standalone server.
# In a monorepo, the build may emit:
# - `.next/standalone/app/server.js` (single-package)
# - `.next/standalone/apps/<workspace>/<app>/server.js` (workspace root tracing)
#
# Ensure static assets + public directory are available next to the standalone server
# so client-side hydration works reliably under Playwright.
STANDALONE_ROOT="${APP_DIR}/.next/standalone"
STANDALONE_SERVER="$(
  find "$STANDALONE_ROOT" -maxdepth 6 -type f -name server.js -not -path '*/node_modules/*' | head -n 1
)"
if [ -z "${STANDALONE_SERVER:-}" ] || [ ! -f "$STANDALONE_SERVER" ]; then
  echo "Standalone server not found under ${STANDALONE_ROOT}." >&2
  exit 1
fi
STANDALONE_APP_DIR="$(cd "$(dirname "$STANDALONE_SERVER")" && pwd)"

# Copy static assets + public into the standalone directory (best-effort).
mkdir -p "${STANDALONE_APP_DIR}/.next"
rm -rf "${STANDALONE_APP_DIR}/.next/static" 2>/dev/null || true
if [ -d "${APP_DIR}/.next/static" ]; then
  cp -R "${APP_DIR}/.next/static" "${STANDALONE_APP_DIR}/.next/static"
fi
rm -rf "${STANDALONE_APP_DIR}/public" 2>/dev/null || true
if [ -d "${APP_DIR}/public" ]; then
  cp -R "${APP_DIR}/public" "${STANDALONE_APP_DIR}/public"
fi

# IMPORTANT: Standalone bundles may only include the React production entrypoints.
(
  cd "${STANDALONE_APP_DIR}" && NODE_ENV=production PORT=3011 HOSTNAME=127.0.0.1 node server.js
) &
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
  echo "Next server did not become ready in time." >&2
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
