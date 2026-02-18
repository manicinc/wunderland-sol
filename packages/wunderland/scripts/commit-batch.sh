#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

# apps updates
if ! git diff --quiet -- apps/agentos-workbench apps/agentos.sh 2>/dev/null; then
  git add apps/agentos-workbench apps/agentos.sh || true
  if ! git diff --cached --quiet; then
    git commit -m "feat(apps): update agentos surfaces"
  fi
fi

# docs (docs/ folder)
if ! git diff --quiet -- docs 2>/dev/null; then
  git add docs || true
  if ! git diff --cached --quiet; then
    git commit -m "docs: update architecture and registry docs"
  fi
fi

# wiki docs
if ! git diff --quiet -- wiki 2>/dev/null; then
  git add wiki || true
  if ! git diff --cached --quiet; then
    git commit -m "docs(wiki): refresh documentation"
  fi
fi

# scripts added/changed
if ! git diff --quiet -- scripts 2>/dev/null; then
  git add scripts || true
  if ! git diff --cached --quiet; then
    git commit -m "chore(scripts): add git maintenance scripts"
  fi
fi

git status -sb
git push
