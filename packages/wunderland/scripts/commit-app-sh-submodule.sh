#!/usr/bin/env bash
set -euo pipefail
cd apps/agentos.sh
git status -sb
git checkout master
git add -A
if ! git diff --cached --quiet; then
  git commit -m "feat(site): update marketing site"
  git push
else
  echo "no changes to commit in apps/agentos.sh"
fi
git log --oneline -3
