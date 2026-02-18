#!/usr/bin/env node

/**
 * Copy esbuild WASM binary to public directory
 *
 * This script copies the WebAssembly binary from node_modules to the public
 * directory so it can be served for client-side TypeScript transpilation.
 *
 * Run this script after npm install or as part of the build process.
 */

const fs = require('fs')
const path = require('path')

const SOURCE_DIR = path.join(__dirname, '..', 'node_modules', 'esbuild-wasm')
const TARGET_DIR = path.join(__dirname, '..', 'public')

const WASM_FILE = 'esbuild.wasm'

// Ensure target directory exists
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true })
  console.log(`Created directory: ${TARGET_DIR}`)
}

// Check if source directory exists
if (!fs.existsSync(SOURCE_DIR)) {
  console.warn(`esbuild-wasm not found in node_modules. Skipping WASM copy.`)
  console.warn(`  Run 'pnpm install esbuild-wasm' to enable TypeScript execution.`)
  process.exit(0)
}

const sourcePath = path.join(SOURCE_DIR, WASM_FILE)
const targetPath = path.join(TARGET_DIR, WASM_FILE)

if (!fs.existsSync(sourcePath)) {
  console.warn(`esbuild.wasm not found at ${sourcePath}`)
  process.exit(0)
}

try {
  fs.copyFileSync(sourcePath, targetPath)
  const stats = fs.statSync(targetPath)
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
  console.log(`Copied ${WASM_FILE} (${sizeMB} MB) to public/`)
} catch (error) {
  console.error(`Failed to copy ${WASM_FILE}:`, error.message)
  process.exit(1)
}
