#!/usr/bin/env node
/**
 * Bundle Electron main process with esbuild
 * This bundles all Node.js dependencies into a single file so they don't need
 * to be included in the electron-builder package.
 */

const esbuild = require('esbuild')
const path = require('path')

const isWatch = process.argv.includes('--watch')

async function bundle() {
  // Early logging code that must run before anything else
  const earlyLogBanner = `
// Early startup logging - runs before any other code
(function() {
  try {
    var fs = require('fs');
    var os = require('os');
    var path = require('path');
    var logPath = path.join(os.tmpdir(), 'quarry-early.log');
    fs.appendFileSync(logPath, '[' + new Date().toISOString() + '] Bundle starting, pid: ' + process.pid + '\\n');
    fs.appendFileSync(logPath, '[' + new Date().toISOString() + '] execPath: ' + process.execPath + '\\n');
  } catch(e) { /* ignore */ }
})();
`;

  const ctx = await esbuild.context({
    entryPoints: [
      path.join(__dirname, '../electron/main.ts'),
      path.join(__dirname, '../electron/preload.ts'),
    ],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outdir: path.join(__dirname, '../electron-dist'),
    format: 'cjs',
    sourcemap: true,
    // External: only Electron itself (provided by electron-builder)
    external: ['electron'],
    // Tree-shake unused code
    treeShaking: true,
    // Minify for smaller bundle
    minify: !isWatch,
    // Keep names for better debugging
    keepNames: true,
    // Banner to run early logging before anything else
    banner: {
      js: earlyLogBanner,
    },
  })

  if (isWatch) {
    await ctx.watch()
    console.log('Watching for changes...')
  } else {
    await ctx.rebuild()
    await ctx.dispose()
    console.log('✓ Electron main process bundled')
  }
}

bundle().catch((err) => {
  console.error('Bundle failed:', err)
  process.exit(1)
})
