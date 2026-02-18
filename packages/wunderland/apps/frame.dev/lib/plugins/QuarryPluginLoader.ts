/**
 * Quarry Plugin Loader
 *
 * Handles loading plugins from URLs, ZIP files, and IndexedDB cache.
 *
 * @module lib/plugins/QuarryPluginLoader
 */

import type {
  PluginManifest,
  CachedPlugin,
  LoadResult,
} from './types'
import {
  PLUGINS_DB_NAME,
  PLUGINS_STORE_NAME,
} from './types'
import { parseManifest, checkCompatibility } from './validation'
import { QuarryPlugin, isPluginClass } from './QuarryPlugin'

// ============================================================================
// INDEXEDDB HELPERS
// ============================================================================

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * Get or create the IndexedDB database
 */
async function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is not available in server-side context')
  }

  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(PLUGINS_DB_NAME, 1)

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create plugins store
      if (!db.objectStoreNames.contains(PLUGINS_STORE_NAME)) {
        const store = db.createObjectStore(PLUGINS_STORE_NAME, { keyPath: 'id' })
        store.createIndex('cachedAt', 'cachedAt', { unique: false })
      }
    }
  })

  return dbPromise
}

/**
 * Store a plugin in IndexedDB
 */
export async function storePlugin(plugin: CachedPlugin): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PLUGINS_STORE_NAME, 'readwrite')
    const store = tx.objectStore(PLUGINS_STORE_NAME)
    const request = store.put(plugin)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error('Failed to store plugin'))
  })
}

/**
 * Get a plugin from IndexedDB
 */
async function getStoredPlugin(id: string): Promise<CachedPlugin | null> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PLUGINS_STORE_NAME, 'readonly')
    const store = tx.objectStore(PLUGINS_STORE_NAME)
    const request = store.get(id)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(new Error('Failed to get plugin'))
  })
}

/**
 * Get all stored plugins
 */
async function getAllStoredPlugins(): Promise<CachedPlugin[]> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PLUGINS_STORE_NAME, 'readonly')
    const store = tx.objectStore(PLUGINS_STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(new Error('Failed to get plugins'))
  })
}

/**
 * Delete a plugin from IndexedDB
 */
async function deleteStoredPlugin(id: string): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PLUGINS_STORE_NAME, 'readwrite')
    const store = tx.objectStore(PLUGINS_STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error('Failed to delete plugin'))
  })
}

// ============================================================================
// PLUGIN LOADER
// ============================================================================

/**
 * Load a plugin from a URL
 *
 * @param url - Base URL of the plugin (should contain manifest.json)
 * @returns Load result with manifest or errors
 *
 * @example
 * ```typescript
 * const result = await loadFromUrl('https://example.com/my-plugin/')
 * if (result.success) {
 *   console.log('Installed:', result.manifest?.name)
 * }
 * ```
 */
export async function loadFromUrl(url: string): Promise<LoadResult> {
  try {
    // Normalize URL
    const baseUrl = url.endsWith('/') ? url : `${url}/`

    // Fetch manifest
    const manifestUrl = `${baseUrl}manifest.json`
    const manifestResponse = await fetch(manifestUrl)

    if (!manifestResponse.ok) {
      return {
        success: false,
        errors: [`Failed to fetch manifest: ${manifestResponse.status} ${manifestResponse.statusText}`],
      }
    }

    const manifestText = await manifestResponse.text()
    const parseResult = parseManifest(manifestText)

    if (!parseResult.valid) {
      return {
        success: false,
        errors: parseResult.errors,
      }
    }

    const manifest = parseResult.manifest!

    // Check compatibility
    const compat = checkCompatibility(manifest)
    if (!compat.compatible) {
      return {
        success: false,
        errors: [compat.reason!],
      }
    }

    // Fetch main.js
    const mainUrl = `${baseUrl}${manifest.main}`
    const mainResponse = await fetch(mainUrl)

    if (!mainResponse.ok) {
      return {
        success: false,
        errors: [`Failed to fetch main.js: ${mainResponse.status}`],
      }
    }

    const mainCode = await mainResponse.text()

    // Fetch styles.css if present
    let styles = ''
    if (manifest.styles) {
      const stylesUrl = `${baseUrl}${manifest.styles}`
      const stylesResponse = await fetch(stylesUrl)
      if (stylesResponse.ok) {
        styles = await stylesResponse.text()
      }
    }

    // Store in IndexedDB
    const cached: CachedPlugin = {
      id: manifest.id,
      manifest,
      mainCode,
      styles,
      cachedAt: new Date().toISOString(),
      source: url,
    }

    await storePlugin(cached)

    return {
      success: true,
      manifest,
    }
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to load plugin: ${(error as Error).message}`],
    }
  }
}

/**
 * Load a plugin from a ZIP file
 *
 * @param file - The ZIP file
 * @returns Load result with manifest or errors
 */
export async function loadFromZip(file: File): Promise<LoadResult> {
  try {
    // Dynamically import JSZip
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(file)

    // Find manifest.json
    const manifestFile = zip.file('manifest.json')
    if (!manifestFile) {
      return {
        success: false,
        errors: ['ZIP file must contain manifest.json at the root'],
      }
    }

    const manifestText = await manifestFile.async('string')
    const parseResult = parseManifest(manifestText)

    if (!parseResult.valid) {
      return {
        success: false,
        errors: parseResult.errors,
      }
    }

    const manifest = parseResult.manifest!

    // Check compatibility
    const compat = checkCompatibility(manifest)
    if (!compat.compatible) {
      return {
        success: false,
        errors: [compat.reason!],
      }
    }

    // Get main.js
    const mainFile = zip.file(manifest.main)
    if (!mainFile) {
      return {
        success: false,
        errors: [`Main file "${manifest.main}" not found in ZIP`],
      }
    }

    const mainCode = await mainFile.async('string')

    // Get styles.css if present
    let styles = ''
    if (manifest.styles) {
      const stylesFile = zip.file(manifest.styles)
      if (stylesFile) {
        styles = await stylesFile.async('string')
      }
    }

    // Store in IndexedDB
    const cached: CachedPlugin = {
      id: manifest.id,
      manifest,
      mainCode,
      styles,
      cachedAt: new Date().toISOString(),
      source: `zip:${file.name}`,
    }

    await storePlugin(cached)

    return {
      success: true,
      manifest,
    }
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to load ZIP: ${(error as Error).message}`],
    }
  }
}

/**
 * Get a cached plugin by ID
 */
export async function getCachedPlugin(id: string): Promise<CachedPlugin | null> {
  return getStoredPlugin(id)
}

/**
 * Get all cached plugins
 */
export async function getAllCachedPlugins(): Promise<CachedPlugin[]> {
  return getAllStoredPlugins()
}

/**
 * Remove a plugin from cache
 */
export async function removeCachedPlugin(id: string): Promise<void> {
  return deleteStoredPlugin(id)
}

// ============================================================================
// PLUGIN INSTANTIATION
// ============================================================================

/**
 * Provide modules to plugin code
 */
function createRequire(): (id: string) => unknown {
  // Modules available to plugins
  const modules: Record<string, unknown> = {
    react: require('react'),
    'framer-motion': require('framer-motion'),
    'lucide-react': require('lucide-react'),
  }

  return (id: string) => {
    if (id in modules) {
      return modules[id]
    }
    throw new Error(`Module "${id}" is not available to plugins`)
  }
}

/**
 * Instantiate a plugin from cached code
 *
 * @param cached - The cached plugin data
 * @returns The plugin class constructor
 */
export function instantiatePlugin(cached: CachedPlugin): new () => QuarryPlugin {
  // Create a module wrapper
  const exports: Record<string, unknown> = {}
  const module = { exports }

  // Execute the plugin code
  // This is intentionally not sandboxed - plugins have full access
  const pluginFunction = new Function(
    'exports',
    'module',
    'require',
    'React',
    cached.mainCode
  )

  // Get React for convenience
  const React = require('react')

  try {
    pluginFunction(exports, module, createRequire(), React)
  } catch (error) {
    console.error(`[PluginLoader] Failed to execute plugin code:`, error)
    throw error
  }

  // Get the plugin class (default export or exports.default)
  const PluginClass = (module.exports as any).default || module.exports

  if (!isPluginClass(PluginClass)) {
    throw new Error('Plugin must export a class extending QuarryPlugin')
  }

  return PluginClass
}

/**
 * Inject plugin styles into the document
 */
export function injectPluginStyles(pluginId: string, css: string): void {
  if (typeof document === 'undefined') return

  // Remove existing styles for this plugin
  removePluginStyles(pluginId)

  if (!css) return

  // Create and inject style element
  const style = document.createElement('style')
  style.id = `quarry-plugin-styles-${pluginId}`
  style.textContent = css
  document.head.appendChild(style)
}

/**
 * Remove plugin styles from the document
 */
export function removePluginStyles(pluginId: string): void {
  if (typeof document === 'undefined') return

  const existing = document.getElementById(`quarry-plugin-styles-${pluginId}`)
  existing?.remove()
}
