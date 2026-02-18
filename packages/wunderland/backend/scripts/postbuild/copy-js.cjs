const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', '..', 'src');
const distDir = path.resolve(__dirname, '..', '..', 'dist', 'src');

function copyJsFiles(fromDir, toDir) {
  if (!fs.existsSync(fromDir)) return;
  for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
    const fromPath = path.join(fromDir, entry.name);
    const toPath = path.join(toDir, entry.name);
    if (entry.isDirectory()) {
      copyJsFiles(fromPath, toPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      fs.mkdirSync(path.dirname(toPath), { recursive: true });
      fs.copyFileSync(fromPath, toPath);
      console.log('[copy-js] Copied', path.relative(srcDir, fromPath), '->', path.relative(path.resolve(__dirname, '..', '..'), toPath));
    }
  }
}

console.log('[copy-js] Ensuring legacy JS files under src/ are present in dist/src/ ...');
copyJsFiles(srcDir, distDir);
console.log('[copy-js] Done.');


