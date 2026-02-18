/**
 * Quarry Plugin API Implementation
 *
 * Creates API instances for plugins to interact with the viewer.
 *
 * @module lib/plugins/QuarryPluginAPI
 */

import type { ComponentType } from 'react'
import type { StrandMetadata } from '@/components/quarry/types'
import type {
  QuarryPluginAPIType,
  PluginContext,
  QuarryEventType,
  QuarryEventPayloads,
  EventCallback,
  WidgetProps,
  ToolbarButtonOptions,
  CommandOptions,
  RendererOptions,
  SidebarModeOptions,
  ModalOptions,
} from './types'
import { createDatabase, type StorageAdapter } from '@framers/sql-storage-adapter'

// ============================================================================
// EVENT EMITTER
// ============================================================================

type AnyEventCallback = (payload: any) => void

/**
 * Simple event emitter for plugin events
 */
class PluginEventEmitter {
  private listeners = new Map<QuarryEventType, Set<AnyEventCallback>>()

  on<T extends QuarryEventType>(event: T, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback as AnyEventCallback)

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback as AnyEventCallback)
    }
  }

  emit<T extends QuarryEventType>(event: T, payload: QuarryEventPayloads[T]): void {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(payload)
      } catch (error) {
        console.error(`[PluginEventEmitter] Error in event handler for ${event}:`, error)
      }
    })
  }

  removeAllListeners(): void {
    this.listeners.clear()
  }
}

// Global event emitter instance
export const pluginEvents = new PluginEventEmitter()

// ============================================================================
// UI REGISTRATIONS STORE
// ============================================================================

/**
 * Store for registered UI components from plugins
 */
class PluginUIRegistry {
  // Map of pluginId -> components
  private widgets = new Map<string, ComponentType<WidgetProps>[]>()
  private toolbarButtons = new Map<string, ToolbarButtonOptions[]>()
  private commands = new Map<string, CommandOptions[]>()
  private renderers = new Map<string, RendererOptions[]>()
  private sidebarModes = new Map<string, SidebarModeOptions[]>()

  // Aggregated views (for UI consumption)
  private _allWidgets: Array<{ pluginId: string; component: ComponentType<WidgetProps> }> = []
  private _allToolbarButtons: Array<{ pluginId: string; options: ToolbarButtonOptions }> = []
  private _allCommands: Array<{ pluginId: string; options: CommandOptions }> = []
  private _allRenderers: Array<{ pluginId: string; options: RendererOptions }> = []
  private _allSidebarModes: Array<{ pluginId: string; options: SidebarModeOptions }> = []

  // Change listeners
  private listeners = new Set<() => void>()

  registerWidget(pluginId: string, component: ComponentType<WidgetProps>): void {
    if (!this.widgets.has(pluginId)) {
      this.widgets.set(pluginId, [])
    }
    this.widgets.get(pluginId)!.push(component)
    this.rebuild()
  }

  registerToolbarButton(pluginId: string, options: ToolbarButtonOptions): void {
    if (!this.toolbarButtons.has(pluginId)) {
      this.toolbarButtons.set(pluginId, [])
    }
    this.toolbarButtons.get(pluginId)!.push(options)
    this.rebuild()
  }

  registerCommand(pluginId: string, options: CommandOptions): void {
    if (!this.commands.has(pluginId)) {
      this.commands.set(pluginId, [])
    }
    this.commands.get(pluginId)!.push(options)
    this.rebuild()
  }

  registerRenderer(pluginId: string, options: RendererOptions): void {
    if (!this.renderers.has(pluginId)) {
      this.renderers.set(pluginId, [])
    }
    this.renderers.get(pluginId)!.push(options)
    this.rebuild()
  }

  registerSidebarMode(pluginId: string, options: SidebarModeOptions): void {
    if (!this.sidebarModes.has(pluginId)) {
      this.sidebarModes.set(pluginId, [])
    }
    this.sidebarModes.get(pluginId)!.push(options)
    this.rebuild()
  }

  unregisterPlugin(pluginId: string): void {
    this.widgets.delete(pluginId)
    this.toolbarButtons.delete(pluginId)
    this.commands.delete(pluginId)
    this.renderers.delete(pluginId)
    this.sidebarModes.delete(pluginId)
    this.rebuild()
  }

  private rebuild(): void {
    this._allWidgets = []
    this._allToolbarButtons = []
    this._allCommands = []
    this._allRenderers = []
    this._allSidebarModes = []

    for (const [pluginId, widgets] of this.widgets) {
      for (const component of widgets) {
        this._allWidgets.push({ pluginId, component })
      }
    }

    for (const [pluginId, buttons] of this.toolbarButtons) {
      for (const options of buttons) {
        this._allToolbarButtons.push({ pluginId, options })
      }
    }

    for (const [pluginId, cmds] of this.commands) {
      for (const options of cmds) {
        this._allCommands.push({ pluginId, options })
      }
    }

    for (const [pluginId, renderers] of this.renderers) {
      for (const options of renderers) {
        this._allRenderers.push({ pluginId, options })
      }
    }

    for (const [pluginId, modes] of this.sidebarModes) {
      for (const options of modes) {
        this._allSidebarModes.push({ pluginId, options })
      }
    }

    // Sort renderers by priority (higher first)
    this._allRenderers.sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0))

    // Notify listeners
    this.listeners.forEach((fn) => fn())
  }

  // Getters for UI consumption
  get allWidgets() { return this._allWidgets }
  get allToolbarButtons() { return this._allToolbarButtons }
  get allCommands() { return this._allCommands }
  get allRenderers() { return this._allRenderers }
  get allSidebarModes() { return this._allSidebarModes }

  // Subscribe to changes
  onChange(callback: () => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }
}

// Global UI registry instance
export const pluginUIRegistry = new PluginUIRegistry()

// ============================================================================
// SQL DATABASE MANAGER
// ============================================================================

/**
 * Manages SQL databases for plugins (one database per plugin)
 */
class PluginDatabaseManager {
  private databases = new Map<string, StorageAdapter>()
  private initPromises = new Map<string, Promise<StorageAdapter>>()

  /**
   * Get or create a database for a specific plugin
   */
  async getDatabase(pluginId: string): Promise<StorageAdapter> {
    // Return existing database if already created
    if (this.databases.has(pluginId)) {
      return this.databases.get(pluginId)!
    }

    // Return pending initialization if in progress
    if (this.initPromises.has(pluginId)) {
      return this.initPromises.get(pluginId)!
    }

    // Create new database
    const initPromise = this.createPluginDatabase(pluginId)
    this.initPromises.set(pluginId, initPromise)

    try {
      const db = await initPromise
      this.databases.set(pluginId, db)
      this.initPromises.delete(pluginId)
      return db
    } catch (error) {
      this.initPromises.delete(pluginId)
      throw error
    }
  }

  /**
   * Create a new database instance for a plugin
   */
  private async createPluginDatabase(pluginId: string): Promise<StorageAdapter> {
    // Use IndexedDB for browser, better-sqlite3 for Node/Electron
    const db = await createDatabase({
      priority: ['indexeddb', 'better-sqlite3', 'sqljs'],
      indexedDb: {
        dbName: `quarry-plugin-${pluginId}`,
        storeName: 'sqliteDb',
        autoSave: true,
        saveIntervalMs: 5000, // Auto-save every 5 seconds
      },
      // For better-sqlite3 (Node/Electron)
      file: `quarry-plugin-${pluginId}.db`,
    })

    return db
  }

  /**
   * Close database for a specific plugin
   */
  async closeDatabase(pluginId: string): Promise<void> {
    const db = this.databases.get(pluginId)
    if (db) {
      await db.close()
      this.databases.delete(pluginId)
    }
  }

  /**
   * Close all databases
   */
  async closeAll(): Promise<void> {
    const promises = Array.from(this.databases.values()).map((db) => db.close())
    await Promise.all(promises)
    this.databases.clear()
  }
}

// Global database manager instance
export const pluginDatabaseManager = new PluginDatabaseManager()

// ============================================================================
// VIEWER HOOKS (set by QuarryViewer)
// ============================================================================

export interface ViewerHooks {
  navigateTo: (path: string) => void
  openFile: (path: string) => Promise<void>
  goBack: () => void
  goForward: () => void
  getContent: () => string
  getMetadata: () => StrandMetadata | null
  getKnowledgeTree: () => any[]
  expandNode: (path: string) => void
  collapseNode: (path: string) => void
  search: (query: string) => Promise<Array<{ path: string; name: string; score: number }>>
  showNotice: (message: string, type?: 'info' | 'success' | 'warning' | 'error', timeout?: number) => void
  showModal: (options: ModalOptions) => Promise<boolean>
  getCurrentFile: () => { path: string; name: string; content: string } | null
  getCurrentPath: () => string
  getTheme: () => { theme: string; isDark: boolean }
}

let viewerHooks: ViewerHooks | null = null

/**
 * Set viewer hooks (called by QuarryViewer on mount)
 */
export function setViewerHooks(hooks: ViewerHooks): void {
  viewerHooks = hooks
}

/**
 * Clear viewer hooks (called by QuarryViewer on unmount)
 */
export function clearViewerHooks(): void {
  viewerHooks = null
}

// ============================================================================
// API FACTORY
// ============================================================================

/**
 * Create a plugin API instance for a specific plugin
 *
 * @param pluginId - The plugin's unique ID
 * @param getSettings - Function to get current plugin settings
 */
export function createPluginAPI(
  pluginId: string,
  getSettings: () => Record<string, unknown>
): QuarryPluginAPIType {
  const storagePrefix = `quarry-plugin-data:${pluginId}:`

  return {
    // === Navigation ===
    navigateTo(path: string): void {
      viewerHooks?.navigateTo(path)
    },

    async openFile(path: string): Promise<void> {
      await viewerHooks?.openFile(path)
    },

    goBack(): void {
      viewerHooks?.goBack()
    },

    goForward(): void {
      viewerHooks?.goForward()
    },

    // === Content ===
    getContent(): string {
      return viewerHooks?.getContent() ?? ''
    },

    getMetadata(): StrandMetadata | null {
      return viewerHooks?.getMetadata() ?? null
    },

    getContext(): PluginContext {
      const theme = viewerHooks?.getTheme() ?? { theme: 'light', isDark: false }
      return {
        currentFile: viewerHooks?.getCurrentFile() ?? null,
        currentPath: viewerHooks?.getCurrentPath() ?? '',
        metadata: viewerHooks?.getMetadata() ?? null,
        theme: theme.theme,
        isDark: theme.isDark,
        settings: getSettings(),
      }
    },

    // === UI Notifications ===
    showNotice(
      message: string,
      type: 'info' | 'success' | 'warning' | 'error' = 'info',
      timeout?: number
    ): void {
      viewerHooks?.showNotice(message, type, timeout)
    },

    async showModal(options: ModalOptions): Promise<boolean> {
      return viewerHooks?.showModal(options) ?? false
    },

    // === Storage ===
    getData<T>(key: string): T | null {
      if (typeof window === 'undefined') return null
      try {
        const value = localStorage.getItem(storagePrefix + key)
        return value ? JSON.parse(value) : null
      } catch {
        return null
      }
    },

    setData<T>(key: string, value: T): void {
      if (typeof window === 'undefined') return
      try {
        localStorage.setItem(storagePrefix + key, JSON.stringify(value))
      } catch (e) {
        console.error(`[Plugin ${pluginId}] Failed to save data:`, e)
      }
    },

    deleteData(key: string): void {
      if (typeof window === 'undefined') return
      localStorage.removeItem(storagePrefix + key)
    },

    // === SQL Storage ===
    async getSqlDatabase(): Promise<StorageAdapter> {
      return pluginDatabaseManager.getDatabase(pluginId)
    },

    async sqlQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
      const db = await pluginDatabaseManager.getDatabase(pluginId)
      return db.all<T>(sql, params)
    },

    async sqlExecute(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid?: string | number | null }> {
      const db = await pluginDatabaseManager.getDatabase(pluginId)
      return db.run(sql, params)
    },

    async sqlTransaction(statements: Array<{ sql: string; params?: any[] }>): Promise<void> {
      const db = await pluginDatabaseManager.getDatabase(pluginId)

      await db.exec('BEGIN TRANSACTION')
      try {
        for (const stmt of statements) {
          await db.run(stmt.sql, stmt.params || [])
        }
        await db.exec('COMMIT')
      } catch (error) {
        await db.exec('ROLLBACK')
        throw error
      }
    },

    // Note: export/import not available on StorageAdapter abstraction
    // Plugins should use sqlQuery to read data and sqlExecute for bulk inserts
    async sqlExport(): Promise<Uint8Array> {
      throw new Error('sqlExport is not supported. Use sqlQuery to read data.')
    },

    async sqlImport(_data: Uint8Array): Promise<void> {
      throw new Error('sqlImport is not supported. Use sqlExecute for bulk inserts.')
    },

    // === Events ===
    on<T extends QuarryEventType>(event: T, callback: EventCallback<T>): () => void {
      return pluginEvents.on(event, callback)
    },

    emit<T extends QuarryEventType>(event: T, payload: QuarryEventPayloads[T]): void {
      pluginEvents.emit(event, payload)
    },

    // === Tree Access ===
    getKnowledgeTree(): any[] {
      return viewerHooks?.getKnowledgeTree() ?? []
    },

    expandNode(path: string): void {
      viewerHooks?.expandNode(path)
    },

    collapseNode(path: string): void {
      viewerHooks?.collapseNode(path)
    },

    // === Search ===
    async search(query: string): Promise<Array<{ path: string; name: string; score: number }>> {
      return viewerHooks?.search(query) ?? []
    },

    // === Registration ===
    registerSidebarWidget(component: ComponentType<WidgetProps>): void {
      pluginUIRegistry.registerWidget(pluginId, component)
    },

    registerToolbarButton(options: ToolbarButtonOptions): void {
      pluginUIRegistry.registerToolbarButton(pluginId, options)
    },

    registerCommand(options: CommandOptions): void {
      pluginUIRegistry.registerCommand(pluginId, options)
    },

    registerMarkdownRenderer(options: RendererOptions): void {
      pluginUIRegistry.registerRenderer(pluginId, options)
    },

    registerSidebarMode(options: SidebarModeOptions): void {
      pluginUIRegistry.registerSidebarMode(pluginId, options)
    },

    // === Logging ===
    log(message: string, ...args: unknown[]): void {
      console.log(`[Plugin:${pluginId}]`, message, ...args)
    },

    warn(message: string, ...args: unknown[]): void {
      console.warn(`[Plugin:${pluginId}]`, message, ...args)
    },

    error(message: string, error?: Error): void {
      console.error(`[Plugin:${pluginId}]`, message, error)
    },
  }
}
