#!/usr/bin/env bash
set -euo pipefail

# rewrite agentos-extensions commit history with short, lowercase conventional commits
# usage: bash scripts/rewrite-extensions-history.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT_DIR="$ROOT_DIR/packages/agentos-extensions"

cd "$EXT_DIR"

# fetch latest
git fetch origin

# base commit to anchor on (keep as stable base)
BASE_SHA="33acd57"

# ordered list of original shas to rewrite with new messages
declare -a CHERRIES=(
  "f28eac5:feat(registry): add auth extension entry"
  "2b5b3f2:docs(auth): add metadata and readme"
  "d7aabfe:feat(auth): add implementation"
  "3f57cc1:test(auth): add tests"
  "7c60015:docs(auth): add examples"
)

# new work branch from base
git checkout -B tmp/history-fix "$BASE_SHA"

# replay each commit with new messages
for entry in "${CHERRIES[@]}"; do
  sha="${entry%%:*}"
  msg="${entry#*:}"
  git cherry-pick "$sha" --no-commit
  git commit -m "$msg"
done

# move master and push (non-interactive)
git branch -f master
git checkout master
git push origin master --force-with-lease

# update submodule pointer in main repo
cd "$ROOT_DIR"
git add packages/agentos-extensions
git commit -m "chore(submodules): update extensions pointer" || true
git push || true

echo "done: extensions history rewritten and pushed; submodule pointer updated."


