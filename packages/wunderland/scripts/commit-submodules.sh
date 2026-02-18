#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
git add packages/agentos-extensions packages/agentos || true
if ! git diff --cached --quiet; then
  git commit -m "chore(submodules): sync agentos repos"
else
  echo "no submodule pointer changes to commit"
fi
git status -sb
