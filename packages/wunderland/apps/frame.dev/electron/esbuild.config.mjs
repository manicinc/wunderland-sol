/**
 * esbuild configuration for Electron main process
 *
 * This bundles the main process code while marking electron as external,
 * which fixes pnpm module resolution issues.
 */

import * as esbuild from 'esbuild'

const isWatch = process.argv.includes('--watch')

const buildOptions = {
  entryPoints: ['electron/main.ts', 'electron/preload.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outdir: 'electron-dist',
  format: 'cjs',
  sourcemap: true,
  // Mark electron and special modules as external
  // - electron/electron-serve: provided by Electron runtime
  // - better-sqlite3: native module with .node bindings
  // - electron-store/electron-log: special Electron integration
  external: ['electron', 'electron-serve', 'better-sqlite3', 'electron-store', 'electron-log'],
  // Minify for production
  minify: !isWatch,
  // Log level
  logLevel: 'info',
}

if (isWatch) {
  const ctx = await esbuild.context(buildOptions)
  await ctx.watch()
  console.log('Watching for changes...')
} else {
  await esbuild.build(buildOptions)
  console.log('Build complete!')
}
