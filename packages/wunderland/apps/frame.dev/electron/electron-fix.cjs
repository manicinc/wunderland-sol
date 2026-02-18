/**
 * Electron module resolution fix for pnpm
 *
 * This file is preloaded with --require to patch Module._load
 * BEFORE Electron's internal patching runs.
 *
 * This works by:
 * 1. Storing a reference to any electron module that gets loaded
 * 2. When 'electron' is required and returns a string, we know it's wrong
 * 3. We then look for the correct module in the cache
 */

const Module = require('module');

// Store the original _load
const originalLoad = Module._load;

// Track if we've seen the real electron module
let realElectron = null;

// Patch Module._load
Module._load = function(request, parent, isMain) {
  // Call original first
  const result = originalLoad.call(this, request, parent, isMain);

  // If this looks like the real electron module, cache it
  if (result && typeof result === 'object' && result.app && typeof result.app.quit === 'function') {
    if (!realElectron) {
      console.log('[electron-fix] Found real Electron module');
      realElectron = result;
    }
  }

  // If someone asked for 'electron' but got a string, return the real one
  if (request === 'electron' && typeof result === 'string' && realElectron) {
    console.log('[electron-fix] Returning cached Electron module instead of path string');
    return realElectron;
  }

  return result;
};

console.log('[electron-fix] Module resolution patch installed');
