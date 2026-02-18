#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT/apps/agentos.sh"
echo "== in $(pwd) =="
git status -sb
git checkout master || true
git status -sb
git push --set-upstream origin master || git push || true
git status -sb
