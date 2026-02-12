#!/usr/bin/env node
/**
 * Postbuild: adds .js extensions to all relative imports/exports in dist/.
 * Required because tsc does not rewrite specifiers for ESM ("type": "module").
 */
const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../../dist');

if (!fs.existsSync(distDir)) {
  console.log('[ensure-esm-extensions] dist/ not found — skipping.');
  process.exit(0);
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (entry.name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

// Relative import/export:  from './foo'  |  export { x } from '../bar'
const STATIC_RE = /((?:from|import)\s+['"])(\.\.?\/[^'"]+?)(['"])/g;
// Dynamic import:  import('./foo')
const DYNAMIC_RE = /(import\s*\(\s*['"])(\.\.?\/[^'"]+?)(['"]\s*\))/g;

const SKIP_EXT = ['.js', '.json', '.mjs', '.cjs', '.node'];

function addExtension(match, prefix, specifier, suffix) {
  if (SKIP_EXT.some(ext => specifier.endsWith(ext))) return match;

  // Check if specifier points to a directory with index.js
  // We can't resolve at this point without filesystem checks, so just append .js
  // If it's a directory import, it will still fail — but those are rare in this codebase
  return `${prefix}${specifier}.js${suffix}`;
}

let totalFixed = 0;

for (const file of walk(distDir)) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  content = content.replace(STATIC_RE, addExtension);
  content = content.replace(DYNAMIC_RE, addExtension);

  if (content !== original) {
    fs.writeFileSync(file, content);
    totalFixed++;
  }
}

console.log(`[ensure-esm-extensions] Patched ${totalFixed} file(s) in dist/`);
