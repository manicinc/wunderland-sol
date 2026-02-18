/**
 * Patches the electron npm package to work correctly with pnpm
 *
 * This script replaces node_modules/electron/index.js with a version
 * that returns the internal electron module when running inside Electron.
 */

const fs = require('fs');
const path = require('path');

const electronIndexPath = path.join(__dirname, '..', 'node_modules', 'electron', 'index.js');

const patchedContent = `
const fs = require('fs');
const path = require('path');

const pathFile = path.join(__dirname, 'path.txt');

function getElectronPath() {
  let executablePath;
  if (fs.existsSync(pathFile)) {
    executablePath = fs.readFileSync(pathFile, 'utf-8');
  }
  if (process.env.ELECTRON_OVERRIDE_DIST_PATH) {
    return path.join(process.env.ELECTRON_OVERRIDE_DIST_PATH, executablePath || 'electron');
  }
  if (executablePath) {
    return path.join(__dirname, 'dist', executablePath);
  } else {
    throw new Error('Electron failed to install correctly, please delete node_modules/electron and try installing again');
  }
}

// Check if we're running inside the Electron runtime
// If so, return the internal electron module instead of the path
if (process.versions && process.versions.electron) {
  // We're inside Electron - need to get the internal module
  // The internal module is available through a special mechanism

  // Method 1: Check if it's already cached with the real exports
  const Module = require('module');
  for (const key of Object.keys(require.cache)) {
    const mod = require.cache[key];
    if (mod && mod.exports && mod.exports.app && typeof mod.exports.app.quit === 'function') {
      module.exports = mod.exports;
      return;
    }
  }

  // Method 2: For Electron's internal API, try getting it from the original loader
  // This is a workaround - Electron patches Module._load, but we're getting called
  // through the npm package first. We need to defer loading.

  // Create a lazy loader that tries to find the real module on first access
  let realModule = null;
  let searchAttempted = false;

  function findRealElectron() {
    if (searchAttempted) return realModule;
    searchAttempted = true;

    // Search cache for the real electron module
    const Module = require('module');
    for (const key of Object.keys(require.cache)) {
      const mod = require.cache[key];
      // Skip our own module
      if (key.includes('node_modules/electron/index.js')) continue;
      // Look for something with app.quit
      if (mod && mod.exports && mod.exports.app && typeof mod.exports.app.quit === 'function') {
        console.log('[electron-patch] Found real Electron at:', key);
        realModule = mod.exports;
        return realModule;
      }
    }
    return null;
  }

  const handler = {
    get(target, prop) {
      const real = findRealElectron();
      if (real) {
        return real[prop];
      }
      // Not found - this shouldn't happen if running inside Electron
      console.error('[electron-patch] Cannot find Electron module for prop:', String(prop));
      return undefined;
    },
    has(target, prop) {
      const real = findRealElectron();
      return real ? prop in real : false;
    }
  };

  module.exports = new Proxy({}, handler);
} else {
  // Not inside Electron runtime - return the path (used by electron-builder, etc.)
  module.exports = getElectronPath();
}
`;

try {
  // Backup original
  const backupPath = electronIndexPath + '.original';
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(electronIndexPath, backupPath);
    console.log('[patch-electron] Backed up original to:', backupPath);
  }

  // Write patched version
  fs.writeFileSync(electronIndexPath, patchedContent);
  console.log('[patch-electron] Patched electron/index.js for pnpm compatibility');
} catch (err) {
  console.error('[patch-electron] Failed to patch:', err.message);
  process.exit(1);
}
