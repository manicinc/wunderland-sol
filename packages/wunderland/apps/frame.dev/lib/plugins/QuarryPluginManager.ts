/**
 * Quarry Plugin Manager
 *
 * Singleton manager for installing, enabling, and managing plugins.
 *
 * @module lib/plugins/QuarryPluginManager
 */

import type {
  PluginManifest,
  PluginState,
  PluginStatus,
  LoadResult,
  CachedPlugin,
  PluginRegistry,
  RegistryPlugin,
} from './types'
import {
  PLUGIN_STATES_KEY,
  DEFAULT_REGISTRY_URL,
} from './types'
import { isPublicAccess, getPublicAccessMessage } from '@/lib/config/publicAccess'
import { getAllBundledPlugins, getBundledPlugin, isBundledPlugin } from './bundledPlugins'
import { getDefaultSettings } from './validation'
import { QuarryPlugin } from './QuarryPlugin'
import { createPluginAPI, pluginUIRegistry, pluginEvents } from './QuarryPluginAPI'
import {
  loadFromUrl,
  loadFromZip,
  getCachedPlugin,
  getAllCachedPlugins,
  removeCachedPlugin,
  instantiatePlugin,
  injectPluginStyles,
  removePluginStyles,
  storePlugin,
} from './QuarryPluginLoader'

// ============================================================================
// STATE PERSISTENCE
// ============================================================================

interface PersistedState {
  plugins: Record<string, {
    enabled: boolean
    settings: Record<string, unknown>
    installedAt: string
    updatedAt: string
    source: string
  }>
}

function loadPersistedState(): PersistedState {
  if (typeof window === 'undefined') {
    return { plugins: {} }
  }

  try {
    const json = localStorage.getItem(PLUGIN_STATES_KEY)
    return json ? JSON.parse(json) : { plugins: {} }
  } catch {
    return { plugins: {} }
  }
}

function savePersistedState(state: PersistedState): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(PLUGIN_STATES_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('[PluginManager] Failed to save state:', e)
  }
}

// ============================================================================
// PLUGIN MANAGER
// ============================================================================

/**
 * Quarry Plugin Manager
 *
 * Manages plugin lifecycle: installation, enabling, disabling, and uninstallation.
 */
class QuarryPluginManager {
  private plugins = new Map<string, PluginState>()
  private instances = new Map<string, QuarryPlugin>()
  private registry: PluginRegistry | null = null
  private registryFetchPromise: Promise<PluginRegistry> | null = null
  private initialized = false
  private listeners = new Set<() => void>()

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  /**
   * Initialize the plugin manager
   *
   * Loads bundled plugins and cached plugins, restores enabled states.
   * Should be called once on app startup.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return
    this.initialized = true

    console.log('[PluginManager] Initializing...')

    try {
      // Load persisted state
      const persistedState = loadPersistedState()

      // First, ensure all bundled plugins are installed
      await this.ensureBundledPlugins(persistedState)

      // Load any additional cached plugins from IndexedDB
      try {
        const cachedPlugins = await getAllCachedPlugins()

        // Build plugin states for non-bundled cached plugins
        for (const cached of cachedPlugins) {
          // Skip if already added (bundled plugins)
          if (this.plugins.has(cached.id)) continue

          const persisted = persistedState.plugins[cached.id]

          const state: PluginState = {
            id: cached.id,
            manifest: cached.manifest,
            status: 'installed',
            enabled: persisted?.enabled ?? false,
            settings: persisted?.settings ?? getDefaultSettings(cached.manifest),
            installedAt: persisted?.installedAt ?? cached.cachedAt,
            updatedAt: persisted?.updatedAt ?? cached.cachedAt,
            source: cached.source,
            isBundled: false,
          }

          this.plugins.set(cached.id, state)
        }
      } catch (e) {
        console.warn('[PluginManager] Failed to load cached plugins:', e)
      }

      // Auto-enable plugins that were enabled before
      for (const [id, state] of this.plugins) {
        if (state.enabled && !this.instances.has(id)) {
          await this.enablePlugin(id, false)
        }
      }

      console.log(`[PluginManager] Initialized with ${this.plugins.size} plugins`)
      this.notifyListeners()
    } catch (error) {
      console.error('[PluginManager] Initialization error:', error)
    }
  }

  /**
   * Ensure all bundled plugins are installed
   */
  private async ensureBundledPlugins(persistedState: PersistedState): Promise<void> {
    console.log('[PluginManager] Loading bundled plugins...')

    const bundledPlugins = getAllBundledPlugins()

    for (const bundle of bundledPlugins) {
      const { manifest, code, styles } = bundle
      const persisted = persistedState.plugins[manifest.id]

      // Store bundled plugin in IndexedDB cache (for consistency)
      try {
        await storePlugin({
          id: manifest.id,
          manifest,
          mainCode: code,
          styles,
          cachedAt: new Date().toISOString(),
          source: 'bundled',
        })
      } catch (e) {
        // Ignore cache errors for bundled plugins - they work without cache
        console.debug(`[PluginManager] Could not cache bundled plugin ${manifest.id}:`, e)
      }

      const state: PluginState = {
        id: manifest.id,
        manifest,
        status: 'installed',
        enabled: persisted?.enabled ?? true, // Bundled plugins enabled by default
        settings: persisted?.settings ?? getDefaultSettings(manifest),
        installedAt: persisted?.installedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'bundled',
        isBundled: true,
      }

      this.plugins.set(manifest.id, state)
    }

    console.log(`[PluginManager] Loaded ${bundledPlugins.length} bundled plugins`)
  }

  // =========================================================================
  // INSTALLATION
  // =========================================================================

  /**
   * Install a plugin from a URL
   */
  async installFromUrl(url: string): Promise<LoadResult> {
    // Block installation in public access mode
    if (isPublicAccess()) {
      console.warn('[PluginManager] Plugin installation blocked: public access mode')
      return {
        success: false,
        errors: [getPublicAccessMessage()],
      }
    }

    console.log(`[PluginManager] Installing from URL: ${url}`)

    const result = await loadFromUrl(url)

    if (result.success && result.manifest) {
      await this.registerInstalled(result.manifest, url)
    }

    return result
  }

  /**
   * Install a plugin from a ZIP file
   */
  async installFromZip(file: File): Promise<LoadResult> {
    // Block installation in public access mode
    if (isPublicAccess()) {
      console.warn('[PluginManager] Plugin installation blocked: public access mode')
      return {
        success: false,
        errors: [getPublicAccessMessage()],
      }
    }

    console.log(`[PluginManager] Installing from ZIP: ${file.name}`)

    const result = await loadFromZip(file)

    if (result.success && result.manifest) {
      await this.registerInstalled(result.manifest, `zip:${file.name}`)
    }

    return result
  }

  /**
   * Install a plugin from the community registry
   */
  async installFromRegistry(pluginId: string): Promise<LoadResult> {
    // Check if it's a bundled plugin - just enable it
    if (isBundledPlugin(pluginId)) {
      const existing = this.plugins.get(pluginId)
      if (existing) {
        await this.enablePlugin(pluginId)
        return { success: true, manifest: existing.manifest }
      }
    }

    // Block installation in public access mode (for non-bundled)
    if (isPublicAccess()) {
      console.warn('[PluginManager] Plugin installation blocked: public access mode')
      return {
        success: false,
        errors: [getPublicAccessMessage()],
      }
    }

    console.log(`[PluginManager] Installing from registry: ${pluginId}`)

    const registry = await this.fetchRegistry()
    const entry = registry.plugins.find((p) => p.id === pluginId)

    if (!entry) {
      return {
        success: false,
        errors: [`Plugin "${pluginId}" not found in registry`],
      }
    }

    const url = entry.cdnUrl || entry.repositoryUrl
    if (!url) {
      return {
        success: false,
        errors: [`Plugin "${pluginId}" has no download URL`],
      }
    }

    return this.installFromUrl(url)
  }

  /**
   * Register an installed plugin
   */
  private async registerInstalled(manifest: PluginManifest, source: string): Promise<void> {
    const now = new Date().toISOString()

    const state: PluginState = {
      id: manifest.id,
      manifest,
      status: 'installed',
      enabled: false,
      settings: getDefaultSettings(manifest),
      installedAt: now,
      updatedAt: now,
      source,
    }

    this.plugins.set(manifest.id, state)
    this.persistState()
    this.notifyListeners()

    pluginEvents.emit('plugin:load', { pluginId: manifest.id })
  }

  // =========================================================================
  // ENABLE/DISABLE
  // =========================================================================

  /**
   * Enable a plugin
   */
  async enablePlugin(id: string, persist = true): Promise<boolean> {
    const state = this.plugins.get(id)
    if (!state) {
      console.error(`[PluginManager] Plugin "${id}" not found`)
      return false
    }

    if (state.enabled && this.instances.has(id)) {
      return true // Already enabled
    }

    console.log(`[PluginManager] Enabling plugin: ${id}`)

    try {
      let code: string
      let styles: string | undefined

      // Check if it's a bundled plugin - use bundled code
      if (isBundledPlugin(id)) {
        const bundle = getBundledPlugin(id)
        if (!bundle) {
          throw new Error('Bundled plugin not found')
        }
        code = bundle.code
        styles = bundle.styles
      } else {
        // Get cached plugin data
        const cached = await getCachedPlugin(id)
        if (!cached) {
          throw new Error('Plugin not found in cache')
        }
        code = cached.mainCode
        styles = cached.styles
      }

      // Instantiate the plugin
      const PluginClass = instantiatePlugin({
        mainCode: code,
        manifest: state.manifest,
        id: state.id,
        styles,
        cachedAt: new Date().toISOString(),
        source: state.source,
      })
      const instance = new PluginClass()

      // Inject API and context
      instance.manifest = state.manifest
      instance.api = createPluginAPI(id, () => state.settings)
      instance.context = {
        currentFile: null,
        currentPath: '',
        metadata: null,
        theme: 'light',
        isDark: false,
        settings: state.settings,
      }

      // Inject styles
      if (styles) {
        injectPluginStyles(id, styles)
      }

      // Call onLoad
      await instance.onLoad()

      // Store instance
      this.instances.set(id, instance)

      // Update state
      state.status = 'enabled'
      state.enabled = true
      state.error = undefined

      if (persist) {
        this.persistState()
      }

      this.notifyListeners()
      pluginEvents.emit('plugin:load', { pluginId: id })

      console.log(`[PluginManager] Plugin enabled: ${state.manifest.name}`)
      return true
    } catch (error) {
      console.error(`[PluginManager] Failed to enable plugin "${id}":`, error)

      state.status = 'error'
      state.enabled = false
      state.error = (error as Error).message

      this.notifyListeners()
      return false
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(id: string): Promise<boolean> {
    const state = this.plugins.get(id)
    if (!state) {
      console.error(`[PluginManager] Plugin "${id}" not found`)
      return false
    }

    console.log(`[PluginManager] Disabling plugin: ${id}`)

    try {
      // Get instance and call onUnload
      const instance = this.instances.get(id)
      if (instance) {
        await instance.onUnload?.()
        this.instances.delete(id)
      }

      // Remove styles
      removePluginStyles(id)

      // Unregister UI components
      pluginUIRegistry.unregisterPlugin(id)

      // Close SQL database
      const { pluginDatabaseManager } = await import('./QuarryPluginAPI')
      await pluginDatabaseManager.closeDatabase(id)

      // Update state
      state.status = 'disabled'
      state.enabled = false

      this.persistState()
      this.notifyListeners()
      pluginEvents.emit('plugin:unload', { pluginId: id })

      console.log(`[PluginManager] Plugin disabled: ${state.manifest.name}`)
      return true
    } catch (error) {
      console.error(`[PluginManager] Failed to disable plugin "${id}":`, error)
      return false
    }
  }

  /**
   * Toggle a plugin's enabled state
   */
  async togglePlugin(id: string): Promise<boolean> {
    const state = this.plugins.get(id)
    if (!state) return false

    if (state.enabled) {
      return this.disablePlugin(id)
    } else {
      return this.enablePlugin(id)
    }
  }

  // =========================================================================
  // UNINSTALLATION
  // =========================================================================

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(id: string): Promise<boolean> {
    // Block uninstallation in public access mode
    if (isPublicAccess()) {
      console.warn('[PluginManager] Plugin uninstallation blocked: public access mode')
      return false
    }

    // Cannot uninstall bundled plugins
    if (isBundledPlugin(id)) {
      console.warn(`[PluginManager] Cannot uninstall bundled plugin "${id}"`)
      return false
    }

    const state = this.plugins.get(id)
    if (!state) return false

    console.log(`[PluginManager] Uninstalling plugin: ${id}`)

    // Disable first
    if (state.enabled) {
      await this.disablePlugin(id)
    }

    // Remove from cache
    await removeCachedPlugin(id)

    // Ensure SQL database is closed and cleaned up
    const { pluginDatabaseManager } = await import('./QuarryPluginAPI')
    await pluginDatabaseManager.closeDatabase(id)

    // Remove from state
    this.plugins.delete(id)

    this.persistState()
    this.notifyListeners()

    console.log(`[PluginManager] Plugin uninstalled: ${state.manifest.name}`)
    return true
  }

  // =========================================================================
  // PUBLIC ACCESS HELPERS
  // =========================================================================

  /**
   * Check if we're in public access mode
   */
  isPublicAccessMode(): boolean {
    return isPublicAccess()
  }

  /**
   * Check if new plugins can be installed
   */
  canInstallPlugins(): boolean {
    return !isPublicAccess()
  }

  /**
   * Check if a plugin can be uninstalled
   */
  canUninstallPlugin(id: string): boolean {
    if (isPublicAccess()) return false
    if (isBundledPlugin(id)) return false
    return true
  }

  // =========================================================================
  // SETTINGS
  // =========================================================================

  /**
   * Get plugin settings
   */
  getPluginSettings(id: string): Record<string, unknown> {
    return this.plugins.get(id)?.settings ?? {}
  }

  /**
   * Update plugin settings
   */
  setPluginSettings(id: string, settings: Record<string, unknown>): void {
    const state = this.plugins.get(id)
    if (!state) return

    state.settings = { ...state.settings, ...settings }
    state.updatedAt = new Date().toISOString()

    // Notify plugin instance
    const instance = this.instances.get(id)
    instance?.onSettingsChange?.(state.settings)

    this.persistState()
    this.notifyListeners()

    pluginEvents.emit('settings:change', { pluginId: id, settings: state.settings })
  }

  // =========================================================================
  // QUERIES
  // =========================================================================

  /**
   * Get all plugins
   */
  getAll(): PluginState[] {
    return Array.from(this.plugins.values())
  }

  /**
   * Get enabled plugins
   */
  getEnabled(): PluginState[] {
    return this.getAll().filter((p) => p.enabled)
  }

  /**
   * Get bundled plugins
   */
  getBundled(): PluginState[] {
    return this.getAll().filter((p) => p.isBundled)
  }

  /**
   * Get a plugin by ID
   */
  getPlugin(id: string): PluginState | undefined {
    return this.plugins.get(id)
  }

  /**
   * Check if a plugin is installed
   */
  isInstalled(id: string): boolean {
    return this.plugins.has(id)
  }

  /**
   * Check if a plugin is enabled
   */
  isEnabled(id: string): boolean {
    return this.plugins.get(id)?.enabled ?? false
  }

  /**
   * Get plugin instance (for advanced usage)
   */
  getInstance(id: string): QuarryPlugin | undefined {
    return this.instances.get(id)
  }

  // =========================================================================
  // REGISTRY
  // =========================================================================

  /**
   * Fetch the community plugin registry
   */
  async fetchRegistry(force = false): Promise<PluginRegistry> {
    if (this.registry && !force) {
      return this.registry
    }

    if (this.registryFetchPromise && !force) {
      return this.registryFetchPromise
    }

    this.registryFetchPromise = (async () => {
      try {
        const response = await fetch(DEFAULT_REGISTRY_URL)
        if (!response.ok) {
          throw new Error(`Failed to fetch registry: ${response.status}`)
        }
        this.registry = await response.json()
        return this.registry!
      } catch (error) {
        console.error('[PluginManager] Failed to fetch registry:', error)
        // Return empty registry on error
        return { version: '1.0.0', updated: '', plugins: [], themes: [] }
      }
    })()

    return this.registryFetchPromise
  }

  /**
   * Search the registry
   */
  async searchRegistry(query: string): Promise<RegistryPlugin[]> {
    const registry = await this.fetchRegistry()
    const lower = query.toLowerCase()

    return registry.plugins.filter((p) =>
      p.name.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower) ||
      p.keywords?.some((k) => k.toLowerCase().includes(lower))
    )
  }

  // =========================================================================
  // PERSISTENCE
  // =========================================================================

  private persistState(): void {
    const state: PersistedState = { plugins: {} }

    for (const [id, plugin] of this.plugins) {
      state.plugins[id] = {
        enabled: plugin.enabled,
        settings: plugin.settings,
        installedAt: plugin.installedAt,
        updatedAt: plugin.updatedAt,
        source: plugin.source,
      }
    }

    savePersistedState(state)
  }

  // =========================================================================
  // LISTENERS
  // =========================================================================

  /**
   * Subscribe to plugin state changes
   */
  onChange(callback: () => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners(): void {
    this.listeners.forEach((fn) => fn())
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Global plugin manager instance
 */
export const quarryPluginManager = new QuarryPluginManager()

/**
 * Initialize the plugin manager (call once on app startup)
 */
export async function initializePlugins(): Promise<void> {
  await quarryPluginManager.initialize()
}
