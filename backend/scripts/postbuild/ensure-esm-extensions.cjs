#!/usr/bin/env node
/**
 * Postbuild: two fixes for ESM ("type": "module") compatibility.
 *
 * 1. Adds .js extensions to all relative imports in dist/.
 *    Required because tsc does not rewrite specifiers for ESM.
 *
 * 2. Strips spurious /dist/ prefix from workspace package subpath imports.
 *    tsc-alias rewrites e.g. '@framers/agentos/rag' → '@framers/agentos/dist/rag'
 *    because the tsconfig paths map to dist/. At runtime, Node resolves subpaths
 *    via the package.json exports map, so the import must stay as '@framers/agentos/rag'.
 */
const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../../dist');

if (!fs.existsSync(distDir)) {
  console.log('[postbuild] dist/ not found — skipping.');
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

// ── Pass 1: Fix workspace package subpath imports ──
// tsc-alias rewrites '@framers/agentos/rag' → '@framers/agentos/dist/rag'
// We strip the /dist/ so Node uses the package.json exports map at runtime.
const WORKSPACE_DIST_RE = /((?:from|import)\s+['"])(@(?:framers|wunderland-sol)\/[^/'"]+)\/dist\/([^'"]+?)(['"])/g;
const WORKSPACE_DIST_DYN_RE = /(import\s*\(\s*['"])(@(?:framers|wunderland-sol)\/[^/'"]+)\/dist\/([^'"]+?)(['"]\s*\))/g;
// Also handle bare 'wunderland/dist/...' (no scope)
const WUNDER_DIST_RE = /((?:from|import)\s+['"])(wunderland)\/dist\/([^'"]+?)(['"])/g;

function stripWorkspaceDist(match, prefix, pkg, subpath, suffix) {
  return `${prefix}${pkg}/${subpath}${suffix}`;
}

// ── Pass 2: Add .js to relative imports ──
const STATIC_RE = /((?:from|import)\s+['"])(\.\.?\/[^'"]+?)(['"])/g;
const DYNAMIC_RE = /(import\s*\(\s*['"])(\.\.?\/[^'"]+?)(['"]\s*\))/g;
const SKIP_EXT = ['.js', '.json', '.mjs', '.cjs', '.node'];

function addExtension(match, prefix, specifier, suffix) {
  if (SKIP_EXT.some(ext => specifier.endsWith(ext))) return match;
  return `${prefix}${specifier}.js${suffix}`;
}

let totalFixed = 0;

for (const file of walk(distDir)) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Pass 1: strip /dist/ from workspace imports
  content = content.replace(WORKSPACE_DIST_RE, stripWorkspaceDist);
  content = content.replace(WORKSPACE_DIST_DYN_RE, stripWorkspaceDist);
  content = content.replace(WUNDER_DIST_RE, stripWorkspaceDist);

  // Pass 2: add .js to relative imports
  content = content.replace(STATIC_RE, addExtension);
  content = content.replace(DYNAMIC_RE, addExtension);

  if (content !== original) {
    fs.writeFileSync(file, content);
    totalFixed++;
  }
}

console.log(`[postbuild] Patched ${totalFixed} file(s) in dist/`);
