#!/usr/bin/env node
/**
 * Icon Generation Script for Electron Builds
 *
 * This script helps generate app icons for different platforms.
 * For production builds, you should use a proper design tool.
 *
 * Requirements:
 * - For macOS .icns: Use `sips` (built-in) or ImageMagick
 * - For Windows .ico: Use ImageMagick or online converter
 *
 * Usage:
 * 1. Place a 1024x1024 PNG at build/icon-source.png
 * 2. Run: node scripts/generate-icons.js
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const BUILD_DIR = path.join(__dirname, '..', 'build')
const SOURCE_ICON = path.join(BUILD_DIR, 'icon-source.png')

// Ensure build directory exists
if (!fs.existsSync(BUILD_DIR)) {
  fs.mkdirSync(BUILD_DIR, { recursive: true })
}

function generateMacOSIcons() {
  const iconsetPath = path.join(BUILD_DIR, 'icon.iconset')
  const icnsPath = path.join(BUILD_DIR, 'icon.icns')

  // Check if source icon exists
  if (!fs.existsSync(SOURCE_ICON)) {
    console.log(`⚠️  Source icon not found at: ${SOURCE_ICON}`)
    console.log('   Please create a 1024x1024 PNG icon and place it at build/icon-source.png')
    console.log('   Or use the existing SVG files in public/ to generate one.')
    return false
  }

  console.log('🍎 Generating macOS icons...')

  // Create iconset directory
  if (fs.existsSync(iconsetPath)) {
    fs.rmSync(iconsetPath, { recursive: true })
  }
  fs.mkdirSync(iconsetPath)

  // Icon sizes for macOS
  const sizes = [16, 32, 64, 128, 256, 512, 1024]

  try {
    for (const size of sizes) {
      // Standard resolution
      execSync(`sips -z ${size} ${size} "${SOURCE_ICON}" --out "${path.join(iconsetPath, `icon_${size}x${size}.png`)}"`, { stdio: 'pipe' })

      // Retina (@2x) - skip for 1024 as there's no 2048
      if (size <= 512) {
        const retinaSize = size * 2
        const halfSize = size
        execSync(`sips -z ${retinaSize} ${retinaSize} "${SOURCE_ICON}" --out "${path.join(iconsetPath, `icon_${halfSize}x${halfSize}@2x.png`)}"`, { stdio: 'pipe' })
      }
    }

    // Convert iconset to icns
    execSync(`iconutil -c icns "${iconsetPath}" -o "${icnsPath}"`, { stdio: 'pipe' })

    // Clean up iconset
    fs.rmSync(iconsetPath, { recursive: true })

    console.log(`✅ Created: ${icnsPath}`)
    return true
  } catch (error) {
    console.error('❌ Failed to generate macOS icons:', error.message)
    console.log('   Make sure you have sips and iconutil available (macOS built-in)')
    return false
  }
}

function generateWindowsIcon() {
  // This requires ImageMagick
  const icoPath = path.join(BUILD_DIR, 'icon.ico')

  if (!fs.existsSync(SOURCE_ICON)) {
    console.log('⚠️  Source icon not found, skipping Windows icon generation')
    return false
  }

  console.log('🪟 Generating Windows icon...')

  try {
    // Use ImageMagick if available
    execSync(`convert "${SOURCE_ICON}" -define icon:auto-resize=256,128,64,48,32,16 "${icoPath}"`, { stdio: 'pipe' })
    console.log(`✅ Created: ${icoPath}`)
    return true
  } catch {
    console.log('⚠️  ImageMagick not found, skipping Windows icon generation')
    console.log('   Install with: brew install imagemagick')
    return false
  }
}

function createPlaceholderIcon() {
  // Create a simple placeholder SVG that can be converted
  const placeholderSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00C896"/>
      <stop offset="100%" style="stop-color:#00A67E"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="200" fill="url(#bg)"/>
  <text x="512" y="580" font-family="system-ui, -apple-system, sans-serif" font-size="400" font-weight="bold" fill="white" text-anchor="middle">F</text>
</svg>`

  const svgPath = path.join(BUILD_DIR, 'icon-placeholder.svg')
  fs.writeFileSync(svgPath, placeholderSvg)
  console.log(`📝 Created placeholder SVG: ${svgPath}`)
  console.log('   Convert to PNG at 1024x1024 and save as build/icon-source.png')
}

// Main
console.log('🎨 Frame.dev Icon Generator\n')

if (!fs.existsSync(SOURCE_ICON)) {
  createPlaceholderIcon()
  console.log('\n⚠️  To generate proper icons:')
  console.log('   1. Export the placeholder SVG (or your own design) to a 1024x1024 PNG')
  console.log('   2. Save it as: build/icon-source.png')
  console.log('   3. Run this script again: node scripts/generate-icons.js\n')
} else {
  const macSuccess = generateMacOSIcons()
  const winSuccess = generateWindowsIcon()

  if (macSuccess || winSuccess) {
    console.log('\n✨ Icon generation complete!')
  }
}
