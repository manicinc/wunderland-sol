#!/usr/bin/env node

/**
 * Simple, free secret scanner for staged changes.
 *
 * Runs on pre-commit and looks for common secret patterns across the monorepo,
 * including subpackages and subrepos checked in under this tree.
 *
 * This is intentionally conservative: it will sometimes flag false positives,
 * but should never silently allow obvious real secrets.
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
    return output
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

const ignorePatterns = [
  /^node_modules\//,
  /^dist\//,
  /^build\//,
  /^coverage\//,
  /^\.git\//,
  /^\.husky\//,
  /^\.github\//,
  /^pnpm-lock\.yaml$/,
  /^package-lock\.json$/,
  /^yarn-lock\.yaml$/,
  /^.*\.lock$/,
  /^.*\.min\.(js|css)$/,
  /^.*\.map$/,
  /^.*\.svg$/,
  /^.*\.png$/,
  /^.*\.jpg$/,
  /^.*\.jpeg$/,
  /^.*\.gif$/,
  /^.*\.webp$/,
  /^.*\.ico$/
]

function shouldIgnore(file) {
  return ignorePatterns.some((re) => re.test(file))
}

const rules = [
  {
    name: 'Google API key',
    regex: /AIza[0-9A-Za-z\-_]{35}/
  },
  {
    name: 'Google OAuth Client ID',
    regex: /[0-9]+-[0-9A-Za-z_\-]+\.apps\.googleusercontent\.com/
  },
  {
    name: 'Google OAuth Client Secret (GOCSPX)',
    regex: /GOCSPX-[0-9A-Za-z\-_]+/
  },
  {
    name: 'Google client secret variable',
    regex: /(GOOGLE_CLIENT_SECRET[\"'=:\s]*)([A-Za-z0-9_\-]{8,})/i
  },
  {
    name: 'Postgres URL with inline password',
    regex: /postgres(?:ql)?:\/\/[^:\s/]+:[^@\s]+@/i
  },
  {
    name: 'Redis URL with inline password',
    regex: /redis:\/\/[^@\s]+@/i
  },
  {
    name: 'Generic database password in URL',
    regex: /(mysql|mssql|sqlserver|mongodb(?:\+srv)?):\/\/[^:\s/]+:[^@\s]+@/i
  },
  {
    name: 'AWS access key ID',
    regex: /AKIA[0-9A-Z]{16}/
  },
  {
    name: 'AWS secret access key',
    regex: /aws_secret_access_key\s*[:=]\s*['"]?[A-Za-z0-9\/+=]{40}['"]?/i
  },
  {
    name: 'Private key block',
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/
  },
  {
    name: 'Slack token',
    regex: /xox[abprs]-[0-9A-Za-z-]+/
  },
  {
    name: 'Generic API key variable',
    regex: /\b(API_KEY|ACCESS_TOKEN|SECRET_KEY|CLIENT_SECRET)\b\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i
  }
]

function isProbablyBinary(buffer) {
  // Simple heuristic: null bytes usually indicate binary
  const len = Math.min(buffer.length, 8000)
  for (let i = 0; i < len; i++) {
    if (buffer[i] === 0) return true
  }
  return false
}

const stagedFiles = getStagedFiles()

if (stagedFiles.length === 0) {
  process.exit(0)
}

const findings = []

for (const file of stagedFiles) {
  if (shouldIgnore(file)) continue

  let buffer
  try {
    const stat = fs.statSync(file)
    // Skip very large files
    if (stat.size > 1024 * 1024) continue
    buffer = fs.readFileSync(file)
  } catch {
    continue
  }

  if (isProbablyBinary(buffer)) continue

  const content = buffer.toString('utf8')
  const lines = content.split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    for (const rule of rules) {
      const match = line.match(rule.regex)
      if (match) {
        findings.push({
          file,
          line: i + 1,
          rule: rule.name,
          snippet: match[0].slice(0, 100)
        })
      }
    }
  }
}

if (findings.length === 0) {
  process.exit(0)
}

console.error('\n[secret-scan] Potential secrets detected in staged changes. Commit has been blocked.\n')

const maxToShow = 20
findings.slice(0, maxToShow).forEach((f) => {
  console.error(
    `  - ${f.file}:${f.line} [${f.rule}]  →  ${f.snippet.replace(/\s+/g, ' ')}`
  )
})

if (findings.length > maxToShow) {
  console.error(`\n  ... and ${findings.length - maxToShow} more matches.\n`)
} else {
  console.error('')
}

console.error(
  [
    'If these are false positives (e.g. clearly dummy values in docs/tests), update',
    'the allow/ignore rules in scripts/scanSecrets.mjs instead of committing real secrets.',
    '',
    'Real credentials should ALWAYS live in your secret manager or CI secrets and',
    'be injected via environment variables, never committed to git history.'
  ].join('\n')
)

process.exit(1)


