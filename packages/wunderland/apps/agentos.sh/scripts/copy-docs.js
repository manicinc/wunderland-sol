#!/usr/bin/env node
/**
 * Copy generated documentation to Next.js public folder
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', '..', '..', 'docs-generated');
const TARGET_DIR = path.join(__dirname, '..', 'public', 'docs-generated');
const enableWatch = process.argv.includes('--watch');

/**
 * Recursively copy docs-generated output into the Next.js public directory.
 */
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }

  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
    return;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

/**
 * Copy docs and report status so the watcher output stays readable.
 */
function syncDocs() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.warn('[docs] No docs-generated directory found yet. Waiting for TypeDoc output...');
    return;
  }

  if (fs.existsSync(TARGET_DIR)) {
    fs.rmSync(TARGET_DIR, { recursive: true, force: true });
  }

  copyRecursive(SOURCE_DIR, TARGET_DIR);
  console.log('[docs] Synced documentation to public/docs-generated/');
}

syncDocs();

if (enableWatch) {
  console.log('[docs] Watching docs-generated/ for changes...');
  let debounceTimer = null;

  const scheduleSync = () => {
    if (debounceTimer) return;
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      syncDocs();
    }, 250);
  };

  const tryWatch = (dir) => {
    try {
      fs.watch(dir, { recursive: true }, (_event, filename) => {
        if (!filename) return;
        if (!filename.startsWith('docs-generated')) return;
        scheduleSync();
      });
    } catch (error) {
      console.warn(`[docs] Unable to watch ${dir}:`, error.message);
    }
  };

  // Watch both the docs-generated directory (if present) and its parent so we catch first-run output.
  if (fs.existsSync(SOURCE_DIR)) {
    tryWatch(SOURCE_DIR);
  }
  tryWatch(path.join(__dirname, '..', '..', '..'));
}
