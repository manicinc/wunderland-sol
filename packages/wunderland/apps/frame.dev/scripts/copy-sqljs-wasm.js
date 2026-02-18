#!/usr/bin/env node

/**
 * Copy sql.js WASM binary to public directory
 *
 * This script copies the sql-wasm.wasm file from node_modules to the public
 * directory so it can be served locally for the SQL storage adapter.
 *
 * The sql.js WASM file is required for the IndexedDB adapter to work in browsers.
 * Without it, the storage adapter falls back to memory-only cache.
 *
 * Run this script after npm install or as part of the build process.
 */

const fs = require('fs')
const path = require('path')

const SOURCE_FILE = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
const TARGET_DIR = path.join(__dirname, '..', 'public', 'wasm')
const TARGET_FILE = path.join(TARGET_DIR, 'sql-wasm.wasm')

// Ensure target directory exists
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true })
  console.log(`✓ Created directory: ${TARGET_DIR}`)
}

// Check if source file exists
if (!fs.existsSync(SOURCE_FILE)) {
  console.warn(`⚠ sql.js WASM not found in node_modules. Skipping WASM copy.`)
  console.warn(`  The SQL storage adapter will fall back to memory cache.`)
  console.warn(`  Run 'npm install sql.js' to enable persistent IndexedDB storage.`)
  process.exit(0)
}

try {
  fs.copyFileSync(SOURCE_FILE, TARGET_FILE)
  const stats = fs.statSync(TARGET_FILE)
  const sizeKB = (stats.size / 1024).toFixed(0)
  console.log(`✓ Copied sql-wasm.wasm (${sizeKB} KB) to public/wasm/`)
} catch (error) {
  console.error(`✗ Failed to copy sql-wasm.wasm:`, error.message)
  console.warn(`  The SQL storage adapter will fall back to memory cache.`)
  process.exit(0)
}
