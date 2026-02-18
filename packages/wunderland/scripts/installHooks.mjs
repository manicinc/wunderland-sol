#!/usr/bin/env node

/**
 * Install pre-commit secret scan hooks in this repo and any git submodules.
 *
 * - Writes a portable shell hook that calls scripts/scanSecrets.mjs
 *   from the repo root or one/two levels up (covers submodules).
 * - Works on Windows (Git Bash) and Unix-like systems.
 */

import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

function readGitDir(fromDir) {
  const dotGitPath = path.join(fromDir, '.git')
  if (!fs.existsSync(dotGitPath)) return null
  const stat = fs.statSync(dotGitPath)
  if (stat.isDirectory()) {
    return dotGitPath
  }
  // .git is a file pointing to the real gitdir
  const content = fs.readFileSync(dotGitPath, 'utf8').trim()
  const m = content.match(/^gitdir:\s*(.+)\s*$/i)
  if (!m) return null
  const gitdir = m[1]
  return path.resolve(fromDir, gitdir)
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

const preCommitContent = `#!/usr/bin/env sh
# Auto-installed by scripts/installHooks.mjs
# Run the free local secret scanner before commit

set -e

# find the scanner relative to this repo/subrepo
if [ -f "scripts/scanSecrets.mjs" ]; then
  SCAN="scripts/scanSecrets.mjs"
elif [ -f "../scripts/scanSecrets.mjs" ]; then
  SCAN="../scripts/scanSecrets.mjs"
elif [ -f "../../scripts/scanSecrets.mjs" ]; then
  SCAN="../../scripts/scanSecrets.mjs"
elif [ -f "../../../scripts/scanSecrets.mjs" ]; then
  SCAN="../../../scripts/scanSecrets.mjs"
else
  # If not found, allow commit (repo may not include the script)
  exit 0
fi

node "$SCAN"
`

const prePushContent = `#!/usr/bin/env sh
# Auto-installed by scripts/installHooks.mjs
# Run the free local secret scanner on commits being pushed

set -e

# find the pre-push scanner relative to this repo/subrepo
if [ -f "scripts/scanPrePush.mjs" ]; then
  SCAN="scripts/scanPrePush.mjs"
elif [ -f "../scripts/scanPrePush.mjs" ]; then
  SCAN="../scripts/scanPrePush.mjs"
elif [ -f "../../scripts/scanPrePush.mjs" ]; then
  SCAN="../../scripts/scanPrePush.mjs"
elif [ -f "../../../scripts/scanPrePush.mjs" ]; then
  SCAN="../../../scripts/scanPrePush.mjs"
else
  # If not found, allow push (repo may not include the script)
  exit 0
fi

node "$SCAN" "$@"
`

function installHookIntoGitDir(gitdir, kind = 'pre-commit') {
  const hooksDir = path.join(gitdir, 'hooks')
  ensureDir(hooksDir)
  const hookPath = path.join(hooksDir, kind)
  fs.writeFileSync(hookPath, kind === 'pre-push' ? prePushContent : preCommitContent, { encoding: 'utf8' })
  try {
    // On Windows this is a no-op, but harmless
    fs.chmodSync(hookPath, 0o755)
  } catch {}
  return hookPath
}

function getSubmodulePaths() {
  const gitmodules = path.join(repoRoot, '.gitmodules')
  if (!fs.existsSync(gitmodules)) return []
  const txt = fs.readFileSync(gitmodules, 'utf8')
  const paths = []
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*path\s*=\s*(.+)\s*$/)
    if (m) {
      paths.push(m[1].trim())
    }
  }
  return paths
}

const installed = []

// Root repo
const rootGitDir = readGitDir(repoRoot)
if (rootGitDir) {
  const p1 = installHookIntoGitDir(rootGitDir, 'pre-commit')
  const p2 = installHookIntoGitDir(rootGitDir, 'pre-push')
  installed.push(p1, p2)
}

// Submodules
for (const subPath of getSubmodulePaths()) {
  const abs = path.resolve(repoRoot, subPath)
  const gd = readGitDir(abs)
  if (!gd) continue // uninitialized submodule
  const p1 = installHookIntoGitDir(gd, 'pre-commit')
  const p2 = installHookIntoGitDir(gd, 'pre-push')
  installed.push(p1, p2)
}

console.log('[installHooks] Installed pre-commit hook(s):')
for (const p of installed.filter((x) => x.endsWith('pre-commit'))) console.log(` - ${p}`)
console.log('[installHooks] Installed pre-push hook(s):')
for (const p of installed.filter((x) => x.endsWith('pre-push'))) console.log(` - ${p}`)
if (installed.length === 0) {
  console.log('[installHooks] No .git directories found. Did you clone with submodules?')
}


