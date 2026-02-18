#!/usr/bin/env node

/**
 * Registry Builder
 *
 * Scans all plugins and themes directories and builds registry.json
 * Usage: node build-registry.js
 */

const fs = require('fs')
const path = require('path')

const PLUGINS_DIR = path.join(__dirname, '..', 'plugins')
const THEMES_DIR = path.join(__dirname, '..', 'themes')
const REGISTRY_PATH = path.join(__dirname, '..', 'registry.json')
const CDN_BASE = 'https://cdn.frame.dev/plugins'
const REPO_BASE = 'https://github.com/fabric-plugins/fabric-plugins/tree/main'

/**
 * Read manifest from a plugin directory
 */
function readManifest(dir) {
  const manifestPath = path.join(dir, 'manifest.json')
  if (!fs.existsSync(manifestPath)) {
    return null
  }

  try {
    const content = fs.readFileSync(manifestPath, 'utf-8')
    return JSON.parse(content)
  } catch (err) {
    console.error(`Failed to read manifest in ${dir}: ${err.message}`)
    return null
  }
}

/**
 * Scan a directory for plugins/themes
 */
function scanDirectory(baseDir, type) {
  if (!fs.existsSync(baseDir)) {
    return []
  }

  const items = []
  const entries = fs.readdirSync(baseDir, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue

    const itemDir = path.join(baseDir, entry.name)
    const manifest = readManifest(itemDir)

    if (!manifest) {
      console.warn(`Skipping ${entry.name}: no valid manifest.json`)
      continue
    }

    // Build registry entry
    const registryEntry = {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      authorUrl: manifest.authorUrl || null,
      type: manifest.type,
      position: manifest.position || null,
      verified: isVerifiedPlugin(manifest.id),
      featured: isFeaturedPlugin(manifest.id),
      downloads: 0, // Would be fetched from analytics
      rating: 0, // Would be fetched from ratings API
      tags: extractTags(manifest),
      cdnUrl: `${CDN_BASE}/${entry.name}`,
      repoUrl: `${REPO_BASE}/${type}/${entry.name}`,
      minFabricVersion: manifest.minFabricVersion,
    }

    items.push(registryEntry)
  }

  return items
}

/**
 * Check if plugin is verified (official or reviewed)
 */
function isVerifiedPlugin(id) {
  const verifiedPrefixes = ['com.fabric.', 'dev.frame.']
  return verifiedPrefixes.some((prefix) => id.startsWith(prefix))
}

/**
 * Check if plugin is featured
 */
function isFeaturedPlugin(id) {
  const featuredPlugins = [
    'com.fabric.pomodoro-timer',
    'com.fabric.citation-manager',
    'com.fabric.custom-callouts',
  ]
  return featuredPlugins.includes(id)
}

/**
 * Extract tags from manifest
 */
function extractTags(manifest) {
  const tags = []

  // Add type as tag
  if (manifest.type) {
    tags.push(manifest.type)
  }

  // Add position as tag if widget
  if (manifest.type === 'widget' && manifest.position) {
    tags.push(manifest.position)
  }

  // Extract from description (basic keyword extraction)
  const keywords = ['timer', 'citation', 'academic', 'markdown', 'callout', 'theme', 'productivity']
  const descLower = (manifest.description || '').toLowerCase()

  for (const keyword of keywords) {
    if (descLower.includes(keyword) && !tags.includes(keyword)) {
      tags.push(keyword)
    }
  }

  return tags
}

/**
 * Main entry point
 */
function main() {
  console.log('Building plugin registry...\n')

  // Scan plugins
  console.log('Scanning plugins directory...')
  const plugins = scanDirectory(PLUGINS_DIR, 'plugins')
  console.log(`  Found ${plugins.length} plugins`)

  // Scan themes
  console.log('Scanning themes directory...')
  const themes = scanDirectory(THEMES_DIR, 'themes')
  console.log(`  Found ${themes.length} themes`)

  // Load existing registry for categories
  let existingRegistry = { categories: [] }
  if (fs.existsSync(REGISTRY_PATH)) {
    try {
      existingRegistry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'))
    } catch (err) {
      console.warn('Could not read existing registry, using defaults')
    }
  }

  // Build registry
  const registry = {
    version: '1.0.0',
    updated: new Date().toISOString(),
    plugins: plugins.sort((a, b) => a.name.localeCompare(b.name)),
    themes: themes.sort((a, b) => a.name.localeCompare(b.name)),
    categories: existingRegistry.categories || [
      {
        id: 'productivity',
        name: 'Productivity',
        description: 'Tools to help you stay focused and productive',
      },
      {
        id: 'academic',
        name: 'Academic',
        description: 'Plugins for research and academic writing',
      },
      {
        id: 'markdown',
        name: 'Markdown',
        description: 'Extend markdown with custom syntax',
      },
      {
        id: 'visualization',
        name: 'Visualization',
        description: 'Charts, graphs, and visual tools',
      },
      {
        id: 'integration',
        name: 'Integration',
        description: 'Connect with external services',
      },
    ],
  }

  // Write registry
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2))
  console.log(`\n✅ Registry written to ${REGISTRY_PATH}`)
  console.log(`   ${plugins.length} plugins, ${themes.length} themes`)
}

main()
