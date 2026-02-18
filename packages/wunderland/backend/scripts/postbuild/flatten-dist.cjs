const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', '..', 'dist');
const nestedDir = path.join(distDir, 'backend');

if (!fs.existsSync(distDir)) {
  console.warn('[flatten-dist] dist directory does not exist, nothing to flatten.');
  process.exit(0);
}

if (!fs.existsSync(nestedDir)) {
  // Nothing to flatten; this can happen if TypeScript emits directly into dist/
  process.exit(0);
}

console.log('[flatten-dist] Flattening backend/dist structure...');

for (const entry of fs.readdirSync(nestedDir)) {
  const from = path.join(nestedDir, entry);
  const to = path.join(distDir, entry);
  fs.cpSync(from, to, { recursive: true, force: true });
}

fs.rmSync(nestedDir, { recursive: true, force: true });

console.log('[flatten-dist] Done.');

