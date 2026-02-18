#!/usr/bin/env bash

# Mirror selected subdirectories into their public repositories.
# Usage:
#   ./scripts/mirror-subtrees.sh [--push]
# When --push is provided the script will push to the remote repositories.
# Otherwise it just creates the split branches so you can inspect them.

set -euo pipefail

declare -A TARGETS=(
  ["packages/agentos"]="git@github.com:framersai/agentos.git"
  ["apps/agentos.sh"]="git@github.com:framersai/agentos.sh.git"
  ["apps/agentos-workbench"]="git@github.com:framersai/agentos-workbench.git"
  ["apps/frame.dev"]="git@github.com:framersai/frame.dev.git"
)

PUSH=false
if [[ "${1:-}" == "--push" ]]; then
  PUSH=true
fi

for prefix in "${!TARGETS[@]}"; do
  remote="${TARGETS[$prefix]}"
  branch="mirror/${prefix//\//-}"

  echo "==> Splitting ${prefix} into ${branch}"
  git subtree split --prefix="${prefix}" -b "${branch}"

  if $PUSH; then
    echo "==> Pushing ${branch} to ${remote}"
    git push "${remote}" "${branch}:main" --force
    git branch -D "${branch}"
  else
    echo "    Created local branch ${branch}. Run with --push to publish and delete."
  fi
done

