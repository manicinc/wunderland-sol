#!/usr/bin/env bash
set -euo pipefail
ROOT="\$(git rev-parse --show-toplevel)"
cd "\$ROOT"
echo "== root status before =="
git status -sb
git add apps/agentos.sh apps/agentos-workbench packages/agentos packages/agentos-extensions scripts/*.sh || true
if ! git diff --cached --quiet; then
  git commit -m "chore: sync submodules and helper scripts"
  git push
else
  echo "nothing to commit at root"
fi
echo "== root status after =="
git status -sb
