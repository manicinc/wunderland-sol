#!/usr/bin/env node

/**
 * Pre-push secret scanner (free).
 *
 * Reads ref updates from stdin (as provided by Git pre-push hook) and scans
 * the to-be-pushed commits for secret patterns using `git grep` against each
 * commit's tree.
 *
 * Exit code:
 *   0 - no findings
 *   1 - potential secrets found (push should be blocked)
 */

import { spawnSync } from 'node:child_process'

// Patterns to search for (same spirit as scanSecrets.mjs)
const rules = [
  { name: 'Google API key', pattern: 'AIza[0-9A-Za-z\\-_]{35}' },
  { name: 'Google OAuth Client ID', pattern: '[0-9]+-[0-9A-Za-z_\\-]+\\.apps\\.googleusercontent\\.com' },
  { name: 'Google OAuth Client Secret (GOCSPX)', pattern: 'GOCSPX-[0-9A-Za-z\\-_]+' },
  { name: 'GOOGLE_CLIENT_SECRET literal', pattern: '(?i)GOOGLE_CLIENT_SECRET[\"\'=: \\t]*[A-Za-z0-9_\\-]{8,}' },
  { name: 'Postgres URL with password', pattern: 'postgres(?:ql)?:\\/\\/[^:\\n\\r\\/\\s]+:[^@\\n\\r\\s]+@' },
  { name: 'Redis URL with password', pattern: 'redis:\\/\\/[^@\\n\\r\\s]+@' },
  { name: 'AWS access key ID', pattern: 'AKIA[0-9A-Z]{16}' },
  { name: 'AWS secret access key', pattern: '(?i)aws_secret_access_key[ \\t]*[:=][ \\t]*[\\\"\\\']?[A-Za-z0-9\\/+=]{40}[\\\"\\\']?' },
  { name: 'Private key block', pattern: '-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----' },
  { name: 'Generic API key in code', pattern: '\\b(API_KEY|ACCESS_TOKEN|SECRET_KEY|CLIENT_SECRET)\\b[ \\t]*[:=][ \\t]*[\\\"\\\'][A-Za-z0-9_\\-]{16,}[\\\"\\\']' },
]

function readStdin() {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => (data += chunk))
    process.stdin.on('end', () => resolve(data))
    process.stdin.resume()
  })
}

function zero40(s) {
  return /^0{40}$/.test(s || '')
}

function git(args, input) {
  const res = spawnSync('git', args, {
    encoding: 'utf8',
    input
  })
  if (res.error) throw res.error
  return { code: res.status ?? 0, stdout: res.stdout || '', stderr: res.stderr || '' }
}

function listCommits(remoteSha, localSha) {
  if (!localSha || zero40(localSha)) return []
  if (!remoteSha || zero40(remoteSha)) {
    // Initial push of this ref
    const out = git(['rev-list', localSha])
    if (out.code !== 0) return []
    return out.stdout.trim().split('\n').filter(Boolean)
  }
  const out = git(['rev-list', `${remoteSha}..${localSha}`])
  if (out.code !== 0) return []
  return out.stdout.trim().split('\n').filter(Boolean)
}

function grepCommitForRule(commit, rule) {
  // git grep -I -n -E <pattern> <commit>
  return git(['grep', '-I', '-n', '-E', rule.pattern, commit])
}

function dedupeFindings(findings) {
  const seen = new Set()
  const out = []
  for (const f of findings) {
    const key = `${f.commit}:${f.file}:${f.line}:${f.rule}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(f)
  }
  return out
}

const stdinData = await readStdin()
const lines = stdinData
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean)

// Each line: <local ref> <local sha1> <remote ref> <remote sha1>
const refUpdates = []
for (const line of lines) {
  const parts = line.split(/\s+/)
  if (parts.length < 4) continue
  refUpdates.push({
    localRef: parts[0],
    localSha: parts[1],
    remoteRef: parts[2],
    remoteSha: parts[3]
  })
}

// If no stdin (some tools), fallback to HEAD vs origin/<current>
if (refUpdates.length === 0) {
  try {
    const head = git(['rev-parse', 'HEAD']).stdout.trim()
    let upstream = ''
    try {
      upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']).stdout.trim()
    } catch {}
    let upstreamSha = ''
    if (upstream) {
      upstreamSha = git(['rev-parse', upstream]).stdout.trim()
    }
    refUpdates.push({ localRef: 'HEAD', localSha: head, remoteRef: upstream, remoteSha: upstreamSha })
  } catch {
    // nothing to scan
  }
}

let findings = []

for (const upd of refUpdates) {
  const commits = listCommits(upd.remoteSha, upd.localSha)
  for (const c of commits) {
    for (const rule of rules) {
      const r = grepCommitForRule(c, rule)
      if (r.code === 0 && r.stdout) {
        // Lines are like: <path>:<line>:<match>
        const lines = r.stdout.split('\n').filter(Boolean)
        for (const ln of lines) {
          const m = ln.match(/^([^:]+):(\d+):(.*)$/)
          if (!m) continue
          findings.push({
            commit: c,
            file: m[1],
            line: Number(m[2]),
            rule: rule.name,
            snippet: (m[3] || '').slice(0, 120)
          })
        }
      }
    }
  }
}

findings = dedupeFindings(findings)

if (findings.length === 0) {
  process.exit(0)
}

console.error('\n[pre-push secret scan] Potential secrets found in commits being pushed:\n')
const maxToShow = 40
for (const f of findings.slice(0, maxToShow)) {
  console.error(`  - ${f.commit.slice(0, 12)} ${f.file}:${f.line} [${f.rule}] → ${f.snippet.replace(/\s+/g, ' ')}`)
}
if (findings.length > maxToShow) {
  console.error(`\n  ... and ${findings.length - maxToShow} more matches.\n`)
}
console.error('Push has been blocked. Remove/redact the secrets or update placeholders before retrying.\n')
process.exit(1)


