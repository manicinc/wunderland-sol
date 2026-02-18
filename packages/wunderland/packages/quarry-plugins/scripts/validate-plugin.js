#!/usr/bin/env node

/**
 * Plugin Manifest Validator
 *
 * Validates plugin manifest.json files against the FABRIC plugin schema.
 * Usage: node validate-plugin.js path/to/manifest.json
 */

const fs = require('fs')
const path = require('path')

// Valid plugin types
const VALID_TYPES = ['widget', 'renderer', 'processor', 'theme', 'panel', 'toolbar', 'command']

// Valid positions
const VALID_POSITIONS = ['sidebar', 'sidebar-bottom', 'metadata', 'toolbar', 'floating', 'content']

// Valid setting types
const VALID_SETTING_TYPES = ['string', 'number', 'boolean', 'select', 'color', 'hotkey']

// Semver regex
const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/

// ID format regex (reverse domain)
const ID_REGEX = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/

/**
 * Validate a manifest object
 */
function validateManifest(manifest, filePath) {
  const errors = []
  const warnings = []

  // Required fields
  const requiredFields = ['id', 'name', 'version', 'description', 'author', 'minFabricVersion', 'main', 'type']

  for (const field of requiredFields) {
    if (!manifest[field]) {
      errors.push(`Missing required field: ${field}`)
    }
  }

  // Validate ID format
  if (manifest.id && !ID_REGEX.test(manifest.id)) {
    errors.push(`Invalid ID format: "${manifest.id}". Must be reverse domain notation (e.g., com.author.plugin-name)`)
  }

  // Validate version format
  if (manifest.version && !SEMVER_REGEX.test(manifest.version)) {
    errors.push(`Invalid version format: "${manifest.version}". Must be semver (e.g., 1.0.0)`)
  }

  // Validate minFabricVersion format
  if (manifest.minFabricVersion && !SEMVER_REGEX.test(manifest.minFabricVersion)) {
    errors.push(`Invalid minFabricVersion format: "${manifest.minFabricVersion}". Must be semver`)
  }

  // Validate type
  if (manifest.type && !VALID_TYPES.includes(manifest.type)) {
    errors.push(`Invalid type: "${manifest.type}". Must be one of: ${VALID_TYPES.join(', ')}`)
  }

  // Validate position
  if (manifest.position && !VALID_POSITIONS.includes(manifest.position)) {
    errors.push(`Invalid position: "${manifest.position}". Must be one of: ${VALID_POSITIONS.join(', ')}`)
  }

  // Check main file exists
  if (manifest.main) {
    const dir = path.dirname(filePath)
    const mainPath = path.join(dir, manifest.main)
    const mainTsPath = path.join(dir, manifest.main.replace('.js', '.ts'))

    if (!fs.existsSync(mainPath) && !fs.existsSync(mainTsPath)) {
      warnings.push(`Main file not found: ${manifest.main} (might be built later)`)
    }
  }

  // Check styles file exists if specified
  if (manifest.styles) {
    const dir = path.dirname(filePath)
    const stylesPath = path.join(dir, manifest.styles)

    if (!fs.existsSync(stylesPath)) {
      warnings.push(`Styles file not found: ${manifest.styles}`)
    }
  }

  // Validate settings
  if (manifest.settings) {
    for (const [key, setting] of Object.entries(manifest.settings)) {
      if (!setting.type) {
        errors.push(`Setting "${key}" missing type`)
      } else if (!VALID_SETTING_TYPES.includes(setting.type)) {
        errors.push(`Setting "${key}" has invalid type: "${setting.type}"`)
      }

      if (setting.default === undefined) {
        warnings.push(`Setting "${key}" has no default value`)
      }

      if (!setting.label) {
        warnings.push(`Setting "${key}" has no label`)
      }

      if (setting.type === 'select' && (!setting.options || !Array.isArray(setting.options))) {
        errors.push(`Setting "${key}" is type "select" but has no options array`)
      }
    }
  }

  // Warnings for recommended fields
  if (!manifest.authorUrl) {
    warnings.push('Missing recommended field: authorUrl')
  }

  if (!manifest.description || manifest.description.length < 10) {
    warnings.push('Description should be at least 10 characters')
  }

  return { errors, warnings }
}

/**
 * Main entry point
 */
function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('Usage: node validate-plugin.js <manifest.json>')
    process.exit(1)
  }

  const filePath = args[0]

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  let manifest
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    manifest = JSON.parse(content)
  } catch (err) {
    console.error(`Failed to parse JSON: ${err.message}`)
    process.exit(1)
  }

  const { errors, warnings } = validateManifest(manifest, filePath)

  // Print results
  console.log(`\nValidating: ${filePath}`)
  console.log('─'.repeat(50))

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Manifest is valid!')
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:')
    for (const warning of warnings) {
      console.log(`   - ${warning}`)
    }
  }

  if (errors.length > 0) {
    console.log('\n❌ Errors:')
    for (const error of errors) {
      console.log(`   - ${error}`)
    }
    process.exit(1)
  }

  console.log('')
}

main()
