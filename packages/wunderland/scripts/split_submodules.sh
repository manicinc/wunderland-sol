#!/usr/bin/env bash

# Split configured folders into standalone repos (preserving history when available),
# normalize commit messages (optional), enforce licenses, seed CI/docs templates,
# push to GitHub, and convert folders into submodules in the monorepo.
#
# Usage:
#   scripts/split_submodules.sh [--dry-run] [--no-templates] [--no-message-rewrite] [--no-submodules]
#                               [--branch <name>] [--fallback-snapshot]
# Notes:
# - Run from the root of the monorepo.
# - Requires: git, git-filter-repo (or Python git_filter_repo), and optionally python for message rewrite.
# - Safe to run repeatedly; uses force-with-lease for pushes and idempotent submodule handling.

set -euo pipefail

# -----------------------------------------------------------------------------
# CONFIGURATION
# -----------------------------------------------------------------------------

# Define submodules to split. Format:
#   "path|git@github.com:org/repo.git|branch|license"
# license: "mit" or "apache-2.0"
# You can add/remove entries as needed; non-existent paths are skipped gracefully.
SUBMODULES=(
  "packages/agentos|git@github.com:framersai/agentos.git|master|apache-2.0"
  "packages/agentos-extensions|git@github.com:framersai/agentos-extensions.git|master|mit"
  "packages/agentos-guardrails|git@github.com:framersai/agentos-guardrails.git|master|mit"
  "apps/agentos-workbench|git@github.com:framersai/agentos-workbench.git|master|mit"
  "apps/agentos.sh|git@github.com:framersai/agentos.sh.git|master|mit"
  "packages/sql-storage-adapter|git@github.com:framersai/sql-storage-adapter.git|master|mit"
)

# Default options (overridable via flags)
DRY_RUN=0
WITH_TEMPLATES=1
REWRITE_MESSAGES=1
ADD_SUBMODULES=1
DEFAULT_BRANCH="master"
FALLBACK_SNAPSHOT=1   # If no history extracted for path, create a fresh snapshot repo
COPYRIGHT_HOLDER="${COPYRIGHT_HOLDER:-Framers}"
WEBSITE="${WEBSITE:-https://frame.dev}"
EMAIL="${EMAIL:-team@frame.dev}"

# Relative paths for templates within this repository
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$SCRIPT_DIR/templates"
MESSAGE_CALLBACK="$SCRIPT_DIR/rename_commits.py"

# Resolved commands (arrays to support spaces in interpreter names like "py -3")
PY_CMD=()
GIT_FILTER_REPO=(git filter-repo)

# -----------------------------------------------------------------------------
# UTILITIES
# -----------------------------------------------------------------------------

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --dry-run              Do not push or change submodules; print actions only
  --no-templates         Do not seed CI/docs/license templates into split repos
  --no-message-rewrite   Do not rewrite commit messages to Conventional Commits
  --no-submodules        Do not link folders back as git submodules
  --branch <name>        Default branch to use when creating/updating repos (default: ${DEFAULT_BRANCH})
  --fallback-snapshot    When history extraction is empty, create a fresh snapshot repo (default: enabled)
  -h, --help             Show this help

Environment:
  Ensure git and git-filter-repo are installed and on PATH. On Windows, Python module fallback is supported.
EOF
}

require() { command -v "$1" >/dev/null 2>&1 || { echo "Missing tool: $1" >&2; exit 1; }; }

ensure_python() {
  if command -v python >/dev/null 2>&1; then PY_CMD=(python); return 0; fi
  if command -v python3 >/dev/null 2>&1; then PY_CMD=(python3); return 0; fi
  if command -v py >/dev/null 2>&1; then PY_CMD=(py -3); return 0; fi
  return 1
}

ensure_git_filter_repo() {
  # Fast path: git extension present
  if git filter-repo --version >/dev/null 2>&1; then
    GIT_FILTER_REPO=(git filter-repo)
    return 0
  fi
  # Try Python module fallback
  if ensure_python; then
    if "${PY_CMD[@]}" -c 'import importlib, sys; sys.exit(0 if importlib.util.find_spec("git_filter_repo") else 1)' >/dev/null 2>&1; then
      GIT_FILTER_REPO=("${PY_CMD[@]}" -m git_filter_repo)
      return 0
    fi
  fi
  echo "Missing tool: git-filter-repo" >&2
  echo "Hint: pip install --user git-filter-repo" >&2
  exit 1
}

clean_worktree() {
  [[ -z "$(git status --porcelain)" ]] || { echo "Working tree not clean." >&2; exit 1; }
}

remote_empty() {
  local url="$1"
  git ls-remote --heads "$url" >/dev/null 2>&1 || return 0
  local out
  out=$(git ls-remote --heads "$url" 2>/dev/null || true)
  [[ -z "$out" ]]
}

extract_history() {
  local path="$1" outdir="$2"
  "${GIT_FILTER_REPO[@]}" --force --path "$path" --path-rename "$path":"" --target "$outdir" >/dev/null 2>&1 || true
}

normalize_messages() {
  local repo="$1"
  [[ $REWRITE_MESSAGES -eq 1 ]] || return 0
  [[ -f "$MESSAGE_CALLBACK" ]] || return 0
  (
    cd "$repo"
    cp -f "$MESSAGE_CALLBACK" ./rename_commits.py
    "${GIT_FILTER_REPO[@]}" --force --message-callback "import importlib.util,sys; spec=importlib.util.spec_from_file_location('rename_commits','./rename_commits.py'); mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod.rename_message(message)"
  )
}

copy_tree() {
  local src="$1" dst="$2"
  local -a EXCLUDES=(
    ".git" "node_modules" ".next" "dist" "build" "out" ".turbo" ".cache" "coverage" "tmp"
    "data" "html" "*.db" "*.db*" "*.sqlite" "*.sqlite*" "*.log" "logs" "pgdata" "postgres"
  )
  if command -v rsync >/dev/null 2>&1; then
    local rsync_args=("-a")
    for e in "${EXCLUDES[@]}"; do rsync_args+=(--exclude "$e"); done
    rsync "${rsync_args[@]}" "$src/" "$dst/" >/dev/null 2>&1 || true
    return 0
  fi
  if command -v tar >/dev/null 2>&1; then
    local tar_excl=()
    for e in "${EXCLUDES[@]}"; do tar_excl+=(--exclude="$e"); done
    (cd "$src" && tar -cf - "${tar_excl[@]}" .) | (cd "$dst" && tar -xf -)
    return 0
  fi
  # Fallback: cp including dotfiles
  local olddotglob
  olddotglob=$(shopt -p dotglob || true)
  shopt -s dotglob
  cp -r "$src"/* "$dst"/ 2>/dev/null || true
  [[ -n "$olddotglob" ]] && eval "$olddotglob"
}

render_template() {
  local in_file="$1" out_file="$2"
  local year="${YEAR_OVERRIDE:-$(date +%Y)}"
  # Use | as sed delimiter to tolerate URLs
  sed "s/{{YEAR}}/${year}/g; s/{{COPYRIGHT_HOLDER}}/${COPYRIGHT_HOLDER}/g; s|{{WEBSITE}}|${WEBSITE}|g; s/{{EMAIL}}/${EMAIL}/g" \
    "$in_file" > "$out_file"
}

snapshot_commit() {
  local srcPath="$1" outdir="$2"
  mkdir -p "$outdir"
  copy_tree "$srcPath" "$outdir"
  (
    cd "$outdir"
    # default ignore
    if [[ ! -f .gitignore ]]; then
      cat > .gitignore <<'GI'
# dependencies
node_modules/

# builds
dist/
build/
out/
.next/
.turbo/
coverage/
.cache/
tmp/

# databases & local data
data/
*.db*
*.sqlite*

# static site dumps
html/

# misc
*.log
.DS_Store
Thumbs.db
GI
    fi
    git init -q
    git add .
    git commit -m "chore: initial import from monorepo" || echo "[Info] Snapshot had no changes to commit."
  )
}

ensure_license() {
  local repo="$1" license="$2"
  [[ $WITH_TEMPLATES -eq 1 ]] || return 0
  local target="$repo/LICENSE"
  case "$license" in
    mit)
      render_template "$TEMPLATES_DIR/licenses/LICENSE-MIT" "$target"
      ;;
    apache-2.0|apache|apache2)
      render_template "$TEMPLATES_DIR/licenses/LICENSE-APACHE-2.0" "$target"
      # Create a minimal NOTICE file for Apache projects
      if [[ ! -f "$repo/NOTICE" ]]; then
        cat > "$repo/NOTICE" <<EOF
${COPYRIGHT_HOLDER}
${WEBSITE}
EOF
      fi
      ;;
    *)
      echo "[Warn] Unknown license '$license' for $repo; skipping LICENSE copy."
      return 0
      ;;
  esac
  (
    cd "$repo"
    git add LICENSE || true
  )
}

ensure_workflows_and_docs() {
  local repo="$1"
  [[ $WITH_TEMPLATES -eq 1 ]] || return 0
  mkdir -p "$repo/.github/workflows"
  # Node CI always safe; publish on tag only if package.json exists and private != true
  cp -f "$TEMPLATES_DIR/workflows/node-ci.yml" "$repo/.github/workflows/ci.yml"
  if [[ -f "$repo/package.json" ]]; then
    cp -f "$TEMPLATES_DIR/workflows/node-publish-on-tag.yml" "$repo/.github/workflows/release-on-tag.yml"
    # Typedoc docs (conditional if typedoc.json exists)
    if [[ ! -f "$repo/typedoc.json" ]]; then
      cp -f "$TEMPLATES_DIR/typedoc.json" "$repo/typedoc.json"
    fi
    cp -f "$TEMPLATES_DIR/workflows/pages-typedoc.yml" "$repo/.github/workflows/pages-typedoc.yml"
  fi
  (
    cd "$repo"
    git add .github workflows >/dev/null 2>&1 || true
    git add .github || true
    git add typedoc.json || true
  )
}

ensure_readme_branding() {
  local repo="$1"
  local mono_path="${2:-}"
  local readme="$repo/README.md"
  [[ -f "$readme" ]] || return 0
  # Skip branding for sql-storage-adapter per requirements
  if [[ "$mono_path" == "packages/sql-storage-adapter" ]]; then
    return 0
  fi
  # Determine logo base path
  local base
  if [[ -d "$repo/public/logos" ]]; then
    base="public/logos"
  elif [[ -d "$repo/assets/logos" ]]; then
    base="assets/logos"
  else
    base="logos"
  fi
  # Pick agentos logo (prefer transparent with tagline)
  local agentos_logo="$base/agentos-primary-transparent-2x.png"
  if [[ ! -f "$repo/$agentos_logo" ]]; then
    if [[ -f "$repo/$base/agentos-primary-transparent-4x.png" ]]; then agentos_logo="$base/agentos-primary-transparent-4x.png"; fi
    if [[ ! -f "$repo/$agentos_logo" && -f "$repo/$base/agentos-primary-no-tagline.svg" ]]; then agentos_logo="$base/agentos-primary-no-tagline.svg"; fi
    if [[ ! -f "$repo/$agentos_logo" && -f "$repo/$base/agentos.svg" ]]; then agentos_logo="$base/agentos.svg"; fi
  fi
  # Pick frame logo
  local frame_logo="$base/frame-wordmark.svg"
  if [[ ! -f "$repo/$frame_logo" && -f "$repo/$base/frame.svg" ]]; then frame_logo="$base/frame.svg"; fi
  # Avoid duplicate injection
  if grep -qiE '^<!--\s*BRANDING-LOGOS\s*-->' "$readme"; then
    return 0
  fi
  local tmp="$repo/.readme.tmp"
  {
    echo "<!-- BRANDING-LOGOS -->"
    echo "<p align=\"center\">"
    echo "  <a href=\"https://agentos.sh\"><img src=\"$agentos_logo\" alt=\"AgentOS\" height=\"64\" /></a>"
    echo "</p>"
    echo "<p align=\"center\">"
    echo "  <a href=\"https://frame.dev\"><img src=\"$frame_logo\" alt=\"Frame\" height=\"28\" /></a>"
    echo "</p>"
    echo
    cat "$readme"
  } > "$tmp"
  mv "$tmp" "$readme"
  (
    cd "$repo"
    git add README.md || true
  )
}

ensure_community_health() {
  local repo="$1"
  mkdir -p "$repo/.github/ISSUE_TEMPLATE"
  # Render templates to inject email/website
  render_template "$TEMPLATES_DIR/community/CODE_OF_CONDUCT.md" "$repo/.github/CODE_OF_CONDUCT.md"
  render_template "$TEMPLATES_DIR/community/CONTRIBUTING.md" "$repo/.github/CONTRIBUTING.md"
  render_template "$TEMPLATES_DIR/community/SECURITY.md" "$repo/.github/SECURITY.md"
  cp -f "$TEMPLATES_DIR/community/pull_request_template.md" "$repo/.github/pull_request_template.md"
  cp -f "$TEMPLATES_DIR/community/ISSUE_TEMPLATE/bug_report.yml" "$repo/.github/ISSUE_TEMPLATE/bug_report.yml"
  cp -f "$TEMPLATES_DIR/community/ISSUE_TEMPLATE/feature_request.yml" "$repo/.github/ISSUE_TEMPLATE/feature_request.yml"
  (
    cd "$repo"
    git add .github || true
  )
}

ensure_branding_assets() {
  local repo="$1"
  local mono_path="${2:-}"
  # Skip for sql-storage-adapter
  if [[ "$mono_path" == "packages/sql-storage-adapter" ]]; then
    return 0
  fi
  # Source logos from monorepo root 'logos' dir, if present
  local src_logos="./logos"
  [[ -d "$src_logos" ]] || return 0
  # Prefer 'public/logos' if public exists, else 'assets/logos', else 'logos'
  local dest_base
  if [[ -d "$repo/public" ]]; then
    dest_base="$repo/public/logos"
  elif [[ -d "$repo/assets" ]]; then
    dest_base="$repo/assets/logos"
  else
    dest_base="$repo/logos"
  fi
  mkdir -p "$dest_base"
  # Copy only common image/logo types
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --include="*/" --include="*.svg" --include="*.png" --include="*.jpg" --include="*.jpeg" --exclude="*" "$src_logos/" "$dest_base/" >/dev/null 2>&1 || true
  else
    shopt -s nullglob
    for f in "$src_logos"/*.{svg,png,jpg,jpeg}; do
      cp -f "$f" "$dest_base/" 2>/dev/null || true
    done
    shopt -u nullglob
  fi
  (
    cd "$repo"
    git add "$(realpath --relative-to="$repo" "$dest_base" 2>/dev/null || echo "${dest_base#$repo/}")" || true
  )
}

ensure_readme_links() {
  local repo="$1" url="$2"
  local readme="$repo/README.md"
  # Compute slug and friendly URLs
  local slug="${url##*:}"        # framersai/repo.git
  slug="${slug%.git}"
  local gh_url="https://github.com/$slug"
  # Try to find npm package name if present
  local npm_url="https://www.npmjs.com/org/framers"
  if [[ -f "$repo/package.json" ]]; then
    local pkg_name
    pkg_name=$(node -e "try{console.log(require(process.argv[1]).name||'') }catch(e){console.log('')}" "$repo/package.json" 2>/dev/null || true)
    local is_private
    is_private=$(node -e "try{console.log(require(process.argv[1]).private===true?'true':'false') }catch(e){console.log('false')}" "$repo/package.json" 2>/dev/null || true)
    if [[ -n "$pkg_name" && "$is_private" != "true" ]]; then
      npm_url="https://www.npmjs.com/package/$pkg_name"
    fi
  fi
  # Append Links section if not present
  if [[ -f "$readme" ]]; then
    if ! grep -qiE '^##\s+Links\b' "$readme"; then
      cat >> "$readme" <<EOF

## Links
- Website: ${WEBSITE}
- AgentOS: https://agentos.sh
- Marketplace: https://vca.chat
- GitHub: ${gh_url}
- npm: ${npm_url}
## Related Repos
- AgentOS core: https://github.com/framersai/agentos
- Extensions: https://github.com/framersai/agentos-extensions
- Guardrails: https://github.com/framersai/agentos-guardrails
- Workbench: https://github.com/framersai/agentos-workbench
- Site: https://github.com/framersai/agentos.sh
## Contributing & Security
- Contributing: ./\.github/CONTRIBUTING.md
- Code of Conduct: ./\.github/CODE_OF_CONDUCT.md
- Security Policy: ./\.github/SECURITY.md
EOF
      (
        cd "$repo"
        git add README.md || true
      )
    fi
  fi
}

commit_repo_bootstrap() {
  local repo="$1"
  (
    cd "$repo"
    git commit -m "chore: bootstrap repo (license, CI, docs templates)" || true
  )
}

push_repo() {
  local repo="$1" url="$2" branch="$3"
  (
    cd "$repo"
    git branch -M "$branch" || true
    git remote add origin "$url" 2>/dev/null || git remote set-url origin "$url"
    git fetch origin "$branch" || true
    git push origin "$branch" --force-with-lease
    git push origin --tags || true
    # Try to remove 'main' branch remotely if present
    git push origin :main || true
    # If gh CLI is available, set default branch to master
    if command -v gh >/dev/null 2>&1; then
      gh repo edit "$(echo "$url" | sed -E 's#(git@github.com:|https://github.com/)##; s/\\.git$//')" --default-branch master || true
    fi
  )
}

link_submodule() {
  local path="$1" url="$2"
  if git ls-files --stage -- "$path" | grep -q '160000'; then
    echo "Already a submodule: $path"
    git -C "$path" remote set-url origin "$url" || true
    return
  fi
  # Remove tracked files and working tree to make room for the submodule
  git rm -r --quiet -- "$path" || true
  # Force-remove any leftover directory/files (Windows can leave artifacts)
  if [[ -d "$path" || -f "$path" ]]; then
    rm -rf -- "$path" 2>/dev/null || true
  fi
  git submodule add "$url" "$path"
}

# -----------------------------------------------------------------------------
# ARGUMENTS
# -----------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --no-templates) WITH_TEMPLATES=0; shift ;;
    --no-message-rewrite) REWRITE_MESSAGES=0; shift ;;
    --no-submodules) ADD_SUBMODULES=0; shift ;;
    --branch) DEFAULT_BRANCH="${2:-$DEFAULT_BRANCH}"; shift 2 ;;
    --fallback-snapshot) FALLBACK_SNAPSHOT=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1 ;;
  esac
done

# -----------------------------------------------------------------------------
# MAIN
# -----------------------------------------------------------------------------

require git
ensure_git_filter_repo
clean_worktree

TMP_ROOT=$(mktemp -d)
trap 'rm -rf "$TMP_ROOT"' EXIT

for entry in "${SUBMODULES[@]}"; do
  IFS='|' read -r path url branch license <<<"$entry"
  branch="${branch:-$DEFAULT_BRANCH}"
  license="${license:-mit}"
  if [[ ! -d "$path" ]]; then
    echo -e "\n[Skip] $path does not exist in this monorepo; skipping."
    continue
  fi

  echo -e "\n=== Processing $path -> $url ($branch) [license: $license] ==="
  OUT_REPO="$TMP_ROOT/$(basename "$path")-repo"

  rm -rf "$OUT_REPO"
  extract_history "$path" "$OUT_REPO"

  if [[ ! -d "$OUT_REPO/.git" ]]; then
    if [[ $FALLBACK_SNAPSHOT -eq 1 ]]; then
      echo "No history extracted; creating snapshot commit..."
      snapshot_commit "$path" "$OUT_REPO"
    else
      echo "Skipping $path (no history extracted)"
      continue
    fi
  fi

  normalize_messages "$OUT_REPO"

  if [[ $WITH_TEMPLATES -eq 1 ]]; then
    ensure_license "$OUT_REPO" "$license"
    ensure_workflows_and_docs "$OUT_REPO"
    ensure_community_health "$OUT_REPO"
    ensure_branding_assets "$OUT_REPO" "$path"
    ensure_readme_branding "$OUT_REPO" "$path"
    ensure_readme_links "$OUT_REPO" "$url"
    commit_repo_bootstrap "$OUT_REPO"
  fi

  if [[ $DRY_RUN -eq 0 ]]; then
    push_repo "$OUT_REPO" "$url" "$branch"
  else
    echo "[DryRun] would push to $url ($branch)"
  fi

  if [[ $ADD_SUBMODULES -eq 1 ]]; then
    if [[ $DRY_RUN -eq 0 ]]; then
      link_submodule "$path" "$url"
    else
      echo "[DryRun] git submodule add $url $path"
    fi
  fi
done

if [[ $ADD_SUBMODULES -eq 1 ]]; then
  if [[ $DRY_RUN -eq 0 ]]; then
    git commit -m "chore(submodules): add and point to split repositories" || true
    git submodule update --init --recursive
    git push || true
  else
    echo "[DryRun] git commit + push (submodules)"
  fi
fi

echo "All done."


