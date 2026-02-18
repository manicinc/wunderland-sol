#!/usr/bin/env node

/**
 * Copy ONNX Runtime Web WASM binaries to public directory
 * 
 * This script copies the WebAssembly binaries from node_modules to the public
 * directory so they can be served locally instead of relying on a CDN.
 * 
 * Run this script after npm install or as part of the build process.
 */

const fs = require('fs')
const path = require('path')

const SOURCE_DIR = path.join(__dirname, '..', 'node_modules', 'onnxruntime-web', 'dist')
const TARGET_DIR = path.join(__dirname, '..', 'public', 'onnx-wasm')

// Discover all available .wasm files dynamically to be robust across ORT versions
function listWasmFiles(dir) {
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith('.wasm'))
  } catch {
    return []
  }
}

// Ensure target directory exists
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true })
  console.log(`✓ Created directory: ${TARGET_DIR}`)
}

// Check if source directory exists
if (!fs.existsSync(SOURCE_DIR)) {
  console.warn(`⚠ ONNX Runtime Web not found in node_modules. Skipping WASM copy.`)
  console.warn(`  Run 'npm install onnxruntime-web' to enable semantic search.`)
  process.exit(0)
}

const WASM_FILES = listWasmFiles(SOURCE_DIR)
if (WASM_FILES.length === 0) {
  console.warn(`⚠ No ORT .wasm files found in ${SOURCE_DIR}`)
}

// Copy each WASM file found
let copiedCount = 0
let skippedCount = 0

for (const file of WASM_FILES) {
  const sourcePath = path.join(SOURCE_DIR, file)
  const targetPath = path.join(TARGET_DIR, file)
  
  if (!fs.existsSync(sourcePath)) {
    console.warn(`⚠ File not found: ${file}`)
    skippedCount++
    continue
  }
  
  try {
    fs.copyFileSync(sourcePath, targetPath)
    const stats = fs.statSync(targetPath)
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
    console.log(`✓ Copied ${file} (${sizeMB} MB)`)
    copiedCount++
  } catch (error) {
    console.error(`✗ Failed to copy ${file}:`, error.message)
    skippedCount++
  }
}

console.log(`\n✓ Copied ${copiedCount} WASM files to public/onnx-wasm/`)
if (skippedCount > 0) {
  console.warn(`⚠ Skipped ${skippedCount} files`)
}

