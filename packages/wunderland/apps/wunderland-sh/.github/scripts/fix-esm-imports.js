#!/usr/bin/env node
/**
 * Recursively rewrite relative import/export specifiers in .js files
 * to include explicit .js (or /index.js) extensions for Node ESM.
 *
 * Usage: node .github/scripts/fix-esm-imports.js <distDir>
 */
const fs = require('fs');
const path = require('path');

function collectJsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectJsFiles(full));
    else if (entry.isFile() && full.endsWith('.js')) out.push(full);
  }
  return out;
}

function resolveSpecifier(filePath, spec) {
  if (!spec.startsWith('.')) return spec;
  // already has extension?
  if (/\.(?:[cm]?js|json|node)$/i.test(spec)) return spec;
  const baseDir = path.dirname(filePath);
  const asJs = path.resolve(baseDir, `${spec}.js`);
  if (fs.existsSync(asJs)) return `${spec}.js`;
  const asIndex = path.resolve(baseDir, spec, 'index.js');
  if (fs.existsSync(asIndex)) return `${spec}/index.js`;
  return spec;
}

function rewriteFile(filePath) {
  const orig = fs.readFileSync(filePath, 'utf8');
  let modified = orig;
  let changed = false;
  const patterns = [
    /(from\s+['"])(\.{1,2}\/[^'"#?]+)(['"])/g,
    /(import\(\s*['"])(\.{1,2}\/[^'"#?]+)(['"]\s*\))/g,
  ];

  // Add JSON import assertion if a .json specifier is present and assertion missing.
  modified = modified.replace(/from\s+['"](\.\.?(?:\/[^'\"#?]+)+\.json)['"]/g, (m, spec) => {
    changed = true;
    return `from '${spec}' assert { type: "json" }`;
  });
  // Handle dynamic import of JSON (Node supports assertion-style second arg)
  modified = modified.replace(/import\(\s*['"](\.\.?(?:\/[^'\"#?]+)+\.json)['"]\s*\)/g, (m, spec) => {
    changed = true;
    return `import('${spec}', { assert: { type: "json" } })`;
  });

  for (const pat of patterns) {
    modified = modified.replace(pat, (m, p1, spec, p3) => {
      const rew = resolveSpecifier(filePath, spec);
      if (rew !== spec) {
        changed = true;
        return `${p1}${rew}${p3}`;
      }
      return m;
    });
  }
  if (changed) fs.writeFileSync(filePath, modified, 'utf8');
}

function main() {
  const distDir = process.argv[2];
  if (!distDir) {
    console.log('Usage: fix-esm-imports.js <distDir>');
    process.exit(1);
  }
  if (!fs.existsSync(distDir)) {
    console.log(`[fix-esm-imports] ${distDir} missing; skipping`);
    return;
  }
  const files = collectJsFiles(distDir);
  files.forEach(rewriteFile);
  console.log(`[fix-esm-imports] Processed ${files.length} files under ${distDir}`);
}

main();


