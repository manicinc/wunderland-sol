#!/usr/bin/env node

/**
 * Copy PDF.js worker and cmaps to public directory
 *
 * This script copies the pdf.worker.min.mjs file and optional cmaps from 
 * node_modules to the public directory so they can be served for client-side
 * PDF parsing in static mode (GitHub Pages, etc.).
 *
 * The PDF.js worker runs in a Web Worker to avoid blocking the main thread
 * during PDF parsing operations.
 *
 * Run this script after npm install or as part of the build process.
 */

const fs = require('fs')
const path = require('path')

const PDFJS_DIR = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist')
const TARGET_DIR = path.join(__dirname, '..', 'public', 'pdfjs')

// Files to copy
const FILES_TO_COPY = [
  // Main worker file (ES module version)
  { src: 'build/pdf.worker.min.mjs', dest: 'pdf.worker.min.mjs' },
  // Legacy worker for older browsers
  { src: 'legacy/build/pdf.worker.min.mjs', dest: 'pdf.worker.legacy.min.mjs', optional: true },
]

// Ensure target directory exists
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true })
  console.log(`✓ Created directory: ${TARGET_DIR}`)
}

// Check if pdfjs-dist is installed
if (!fs.existsSync(PDFJS_DIR)) {
  console.warn(`⚠ pdfjs-dist not found in node_modules. Skipping PDF.js worker copy.`)
  console.warn(`  Client-side PDF parsing will not be available.`)
  console.warn(`  Run 'pnpm install pdfjs-dist' to enable PDF parsing in static mode.`)
  process.exit(0)
}

let copiedCount = 0

for (const file of FILES_TO_COPY) {
  const sourcePath = path.join(PDFJS_DIR, file.src)
  const targetPath = path.join(TARGET_DIR, file.dest)

  if (!fs.existsSync(sourcePath)) {
    if (file.optional) {
      console.log(`  Skipping optional file: ${file.src} (not found)`)
      continue
    }
    console.warn(`⚠ Required file not found: ${file.src}`)
    continue
  }

  try {
    fs.copyFileSync(sourcePath, targetPath)
    const stats = fs.statSync(targetPath)
    const sizeKB = (stats.size / 1024).toFixed(0)
    console.log(`✓ Copied ${file.dest} (${sizeKB} KB)`)
    copiedCount++
  } catch (error) {
    console.error(`✗ Failed to copy ${file.dest}:`, error.message)
  }
}

// Copy cmaps directory for CJK character support (optional but recommended)
const cmapsSource = path.join(PDFJS_DIR, 'cmaps')
const cmapsTarget = path.join(TARGET_DIR, 'cmaps')

if (fs.existsSync(cmapsSource)) {
  try {
    if (!fs.existsSync(cmapsTarget)) {
      fs.mkdirSync(cmapsTarget, { recursive: true })
    }
    
    const cmapFiles = fs.readdirSync(cmapsSource)
    let cmapCount = 0
    
    for (const file of cmapFiles) {
      const srcPath = path.join(cmapsSource, file)
      const destPath = path.join(cmapsTarget, file)
      
      if (fs.statSync(srcPath).isFile()) {
        fs.copyFileSync(srcPath, destPath)
        cmapCount++
      }
    }
    
    console.log(`✓ Copied ${cmapCount} CMap files for CJK support`)
  } catch (error) {
    console.warn(`⚠ Failed to copy cmaps:`, error.message)
  }
} else {
  console.log(`  Skipping cmaps (not found in pdfjs-dist)`)
}

if (copiedCount > 0) {
  console.log(`\n✓ PDF.js worker files ready for client-side PDF parsing`)
} else {
  console.warn(`\n⚠ No PDF.js worker files were copied. Check pdfjs-dist installation.`)
}

