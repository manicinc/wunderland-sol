#!/usr/bin/env node

/**
 * SKILL.md validator for @framers/agentos-skills
 *
 * Usage:
 *   node scripts/validate-skill.mjs registry/community/my-skill/SKILL.md
 *   node scripts/validate-skill.mjs                                        # validates ALL skills
 *
 * Exit code 0 on pass, 1 on fail.
 * Zero external dependencies — uses only Node.js built-ins.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, basename, dirname, join } from 'node:path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = new Set([
  'information',
  'developer-tools',
  'communication',
  'productivity',
  'devops',
  'media',
  'security',
  'creative',
]);

const VALID_NAMESPACES = new Set(['wunderland', 'community']);

const REQUIRED_FIELDS = ['name', 'version', 'description', 'author', 'namespace', 'category', 'tags'];

const MAX_DESCRIPTION_LENGTH = 200;

/** Patterns that suggest accidentally-committed secrets. */
const SECRET_PATTERNS = [
  /(?:api[_-]?key|apikey)\s*[:=]\s*["']?[A-Za-z0-9_\-]{16,}/i,
  /(?:secret|token|password|passwd|pwd)\s*[:=]\s*["']?[A-Za-z0-9_\-]{16,}/i,
  /sk-[A-Za-z0-9]{20,}/,                          // OpenAI-style keys
  /ghp_[A-Za-z0-9]{36,}/,                          // GitHub personal access tokens
  /gho_[A-Za-z0-9]{36,}/,                          // GitHub OAuth tokens
  /xox[bpors]-[A-Za-z0-9\-]{10,}/,                 // Slack tokens
  /AKIA[0-9A-Z]{16}/,                              // AWS access key IDs
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,       // Private keys
  /Bearer\s+[A-Za-z0-9_\-\.]{20,}/,                // Bearer tokens
];

// ---------------------------------------------------------------------------
// Simple YAML frontmatter parser (no dependencies)
// ---------------------------------------------------------------------------

/**
 * Parse basic YAML key-value pairs from frontmatter lines.
 * Handles:
 *   key: value           -> string
 *   key: 'value'         -> string (strip quotes)
 *   key: "value"         -> string (strip quotes)
 *   key: [a, b, c]       -> string[]
 *   key: []              -> string[] (empty)
 *
 * Nested keys (like metadata.agentos.emoji) are ignored — only top-level
 * keys matter for required-field validation.
 */
function parseSimpleYaml(yamlText) {
  const result = {};
  const lines = yamlText.split('\n');

  for (const line of lines) {
    // Skip blank lines and comments
    const trimmed = line.trimStart();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Only parse top-level keys (no leading whitespace)
    if (line[0] === ' ' || line[0] === '\t') continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();

    if (!key) continue;

    // Inline array: [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      if (inner === '') {
        result[key] = [];
      } else {
        result[key] = inner.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
      }
      continue;
    }

    // Strip surrounding quotes
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate a single SKILL.md file. Returns an object with:
 *   { path, passed, errors[] }
 */
function validateSkill(filePath) {
  const errors = [];
  const absolutePath = resolve(filePath);

  // --- Read file --------------------------------------------------------

  let content;
  try {
    content = readFileSync(absolutePath, 'utf-8');
  } catch (err) {
    return { path: absolutePath, passed: false, errors: [`Cannot read file: ${err.message}`] };
  }

  // --- Split frontmatter / body ----------------------------------------

  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = content.match(fmRegex);

  if (!match) {
    return {
      path: absolutePath,
      passed: false,
      errors: ['File does not contain valid YAML frontmatter (expected --- delimiters).'],
    };
  }

  const yamlText = match[1];
  const markdownBody = match[2];

  // --- Parse YAML -------------------------------------------------------

  const meta = parseSimpleYaml(yamlText);

  // --- Required fields --------------------------------------------------

  for (const field of REQUIRED_FIELDS) {
    if (meta[field] === undefined || meta[field] === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // --- Category ---------------------------------------------------------

  if (meta.category && !VALID_CATEGORIES.has(meta.category)) {
    errors.push(
      `Invalid category "${meta.category}". Must be one of: ${[...VALID_CATEGORIES].join(', ')}`,
    );
  }

  // --- Namespace --------------------------------------------------------

  if (meta.namespace && !VALID_NAMESPACES.has(meta.namespace)) {
    errors.push(
      `Invalid namespace "${meta.namespace}". Must be one of: ${[...VALID_NAMESPACES].join(', ')}`,
    );
  }

  // --- Description length -----------------------------------------------

  if (meta.description && typeof meta.description === 'string' && meta.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(
      `Description is ${meta.description.length} characters (max ${MAX_DESCRIPTION_LENGTH}).`,
    );
  }

  // --- Tags -------------------------------------------------------------

  if (meta.tags !== undefined) {
    if (!Array.isArray(meta.tags)) {
      errors.push('tags must be an array.');
    } else if (meta.tags.length === 0) {
      errors.push('tags array must contain at least 1 tag.');
    }
  }

  // --- Name matches directory -------------------------------------------

  const dirName = basename(dirname(absolutePath));
  if (meta.name && meta.name !== dirName) {
    errors.push(
      `Skill name "${meta.name}" does not match directory name "${dirName}".`,
    );
  }

  // --- Markdown body not empty ------------------------------------------

  if (!markdownBody || markdownBody.trim().length === 0) {
    errors.push('Markdown body is empty. Include usage instructions, Examples, and Constraints.');
  }

  // --- Secret pattern scan ----------------------------------------------

  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      errors.push(`Possible secret or credential detected (pattern: ${pattern.source}). Remove it before submitting.`);
    }
  }

  return { path: absolutePath, passed: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Discover all SKILL.md files
// ---------------------------------------------------------------------------

function discoverSkills(rootDir) {
  const skills = [];
  const tiers = ['curated', 'community'];

  for (const tier of tiers) {
    const tierDir = join(rootDir, 'registry', tier);
    if (!existsSync(tierDir)) continue;

    for (const entry of readdirSync(tierDir)) {
      const skillDir = join(tierDir, entry);
      if (!statSync(skillDir).isDirectory()) continue;

      const skillFile = join(skillDir, 'SKILL.md');
      if (existsSync(skillFile)) {
        skills.push(skillFile);
      }
    }
  }

  return skills;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);

  let filesToValidate;

  if (args.length === 0) {
    // Validate all skills
    const rootDir = resolve(dirname(new URL(import.meta.url).pathname), '..');
    filesToValidate = discoverSkills(rootDir);
    if (filesToValidate.length === 0) {
      console.log('No SKILL.md files found in registry/curated/ or registry/community/.');
      process.exit(0);
    }
    console.log(`Validating ${filesToValidate.length} skill(s)...\n`);
  } else {
    filesToValidate = [resolve(args[0])];
  }

  let allPassed = true;

  for (const filePath of filesToValidate) {
    const result = validateSkill(filePath);

    if (result.passed) {
      console.log(`  PASS  ${result.path}`);
    } else {
      allPassed = false;
      console.log(`  FAIL  ${result.path}`);
      for (const err of result.errors) {
        console.log(`        - ${err}`);
      }
    }
  }

  console.log('');

  if (allPassed) {
    console.log(`All ${filesToValidate.length} skill(s) passed validation.`);
    process.exit(0);
  } else {
    const failCount = filesToValidate.length - filesToValidate.filter((_, i) => {
      // Re-validate to count (cheap for small set)
      return validateSkill(filesToValidate[i]).passed;
    }).length;
    // Simpler: just fail
    console.log('Validation failed. Fix the errors above and re-run.');
    process.exit(1);
  }
}

main();
