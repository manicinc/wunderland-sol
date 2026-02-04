#!/usr/bin/env bash
# Wunderland Sol — Development Loop
# Runs Claude Code CLI to evaluate and iterate on the project.
#
# Usage:
#   ./scripts/dev-loop.sh
#   ./scripts/dev-loop.sh --task "build feature"
#   ./scripts/dev-loop.sh --cycles 3

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SYNINT="${PROJECT_DIR}/prompts/SYNINT_FRAMEWORK.md"
CYCLES=${1:-1}
TASK=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --cycles) CYCLES="$2"; shift 2 ;;
    --task) TASK="$2"; shift 2 ;;
    *) shift ;;
  esac
done

echo "Wunderland Sol — Dev Loop (${CYCLES} cycles)"

for ((i = 1; i <= CYCLES; i++)); do
  echo "--- Cycle ${i}/${CYCLES} ---"
  if [[ -n "${TASK}" ]]; then
    echo "${TASK}" | claude --print --output-format text --max-turns 20
  else
    npx tsx scripts/orchestrator.ts
  fi
  [[ $i -lt $CYCLES ]] && sleep 5
done

echo "Dev loop complete."
