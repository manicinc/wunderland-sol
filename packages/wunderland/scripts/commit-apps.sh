#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
git add apps/agentos-workbench apps/agentos.sh || true
if ! git diff --cached --quiet; then
  git commit -m "feat(apps): update agentos surfaces"
  git push
else
  echo "no app changes to commit"
fi
git status -sb
