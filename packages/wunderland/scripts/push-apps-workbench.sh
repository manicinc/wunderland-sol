#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT/apps/agentos-workbench"
echo "== in $(pwd) =="
git status -sb
git checkout master || true
git status -sb
git add -A || true
if ! git diff --cached --quiet; then
  git commit -m "feat(workbench): update developer cockpit"
  git push --set-upstream origin master || git push || true
else
  echo "no changes to commit in apps/agentos-workbench"
fi
git status -sb
