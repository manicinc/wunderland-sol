#!/usr/bin/env bash
set -euo pipefail

# Forces packages/agentos-extensions master to the already-rewritten tmp/history-fix
# Then shows short log for verification.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT_DIR="$ROOT_DIR/packages/agentos-extensions"

echo "== moving to: $EXT_DIR =="
cd "$EXT_DIR"

echo "== current branch =="
git branch --show-current || true

echo "== checkout master =="
git checkout master

echo "== hard reset master -> tmp/history-fix =="
git reset --hard tmp/history-fix

echo "== push (force-with-lease) =="
git push origin master --force-with-lease

echo "== final log (last 6) =="
git log --oneline -6

echo "done."


