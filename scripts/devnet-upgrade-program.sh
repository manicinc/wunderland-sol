#!/usr/bin/env bash
set -euo pipefail

# Upgrade + verify the `wunderland_sol` program on Solana devnet (or other cluster).
#
# Defaults:
# - PROGRAM_ID: Wunderland devnet program id
# - CLUSTER: devnet
# - MAX_LEN: 1000000 bytes (future-proof; adjust if you want lower rent)
#
# Usage:
#   ./scripts/devnet-upgrade-program.sh
#   PROGRAM_ID=... CLUSTER=devnet MAX_LEN=900000 ./scripts/devnet-upgrade-program.sh
#   DOCKER_IMAGE=backpackapp/build:v0.30.1-anza-rust ./scripts/devnet-upgrade-program.sh

PROGRAM_ID="${PROGRAM_ID:-3Z4e2eQuUJKvoi3egBdwKYc2rdZm8XFw9UNDf99xpDJo}"
CLUSTER="${CLUSTER:-devnet}"
MAX_LEN="${MAX_LEN:-1000000}"
DOCKER_IMAGE="${DOCKER_IMAGE:-}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ANCHOR_DIR="$ROOT_DIR/anchor"
SO_PATH="$ANCHOR_DIR/target/verifiable/wunderland_sol.so"

echo "== Config =="
echo "CLUSTER:    $CLUSTER"
echo "PROGRAM_ID: $PROGRAM_ID"
echo "MAX_LEN:    $MAX_LEN"

echo
echo "== Wallet =="
solana address
solana balance -u "$CLUSTER" || true
BALANCE_LAMPORTS="$(solana balance --lamports -u "$CLUSTER" | awk '{print $1}')"

echo
echo "== Build (verifiable) =="
BUILD_ARGS=(-v)
if [[ -n "$DOCKER_IMAGE" ]]; then
  BUILD_ARGS+=(--docker-image "$DOCKER_IMAGE")
fi
(cd "$ANCHOR_DIR" && anchor build "${BUILD_ARGS[@]}")

if [[ ! -f "$SO_PATH" ]]; then
  echo "Error: missing verifiable binary: $SO_PATH"
  exit 1
fi

SO_BYTES="$(wc -c < "$SO_PATH" | tr -d ' ')"
echo "Program bytes: $SO_BYTES"
echo "Rent (binary size): $(solana rent "$SO_BYTES" -u "$CLUSTER" | tr -d '\n')"
echo "Rent (MAX_LEN):     $(solana rent "$MAX_LEN" -u "$CLUSTER" | tr -d '\n')"
RENT_MAX_LEN_LAMPORTS="$(solana rent --lamports "$MAX_LEN" -u "$CLUSTER" | awk '{print $3}')"

if [[ -n "${BALANCE_LAMPORTS:-}" && -n "${RENT_MAX_LEN_LAMPORTS:-}" ]]; then
  # Rough fee buffer (signatures + a few txs). Intentionally conservative but small.
  FEE_BUFFER_LAMPORTS=5000000
  if (( BALANCE_LAMPORTS < RENT_MAX_LEN_LAMPORTS + FEE_BUFFER_LAMPORTS )); then
    echo
    echo "Error: insufficient funds to deploy."
    echo "Balance:  $BALANCE_LAMPORTS lamports"
    echo "Need:     $RENT_MAX_LEN_LAMPORTS lamports (rent for MAX_LEN) + ~$FEE_BUFFER_LAMPORTS fees"
    echo
    echo "Devnet note: CLI airdrops are often rate-limited. Use https://faucet.solana.com in a browser."
    exit 2
  fi
fi

echo
echo "== Deploy/Upgrade =="
solana program deploy \
  --url "$CLUSTER" \
  --program-id "$PROGRAM_ID" \
  --upgrade-authority ~/.config/solana/id.json \
  --max-len "$MAX_LEN" \
  "$SO_PATH"

echo
echo "== Program Show =="
solana program show -u "$CLUSTER" "$PROGRAM_ID"

echo
echo "== Verify =="
VERIFY_ARGS=(--provider.cluster "$CLUSTER" "$PROGRAM_ID")
if [[ -n "$DOCKER_IMAGE" ]]; then
  VERIFY_ARGS=(--docker-image "$DOCKER_IMAGE" "${VERIFY_ARGS[@]}")
fi
(cd "$ANCHOR_DIR" && anchor verify "${VERIFY_ARGS[@]}")

echo
echo "== Done =="
