/**
 * Quarry Plugin Base Class
 *
 * Base class that all Quarry plugins extend. Provides lifecycle hooks
 * and access to the plugin API.
 *
 * @module lib/plugins/QuarryPlugin
 *
 * @example
 * ```typescript
 * import { QuarryPlugin } from '@quarry/plugins'
 *
 * class MyPlugin extends QuarryPlugin {
 *   async onLoad() {
 *     this.api.registerSidebarWidget(MyWidget)
 *     this.api.registerCommand({
 *       id: 'my-command',
 *       name: 'Do Something',
 *       callback: () => this.doSomething(),
 *     })
 *     this.log('Plugin loaded!')
 *   }
 *
 *   async onUnload() {
 *     this.log('Plugin unloaded!')
 *   }
 *
 *   doSomething() {
 *     this.api.showNotice('Done!', 'success')
 *   }
 * }
 *
 * export default MyPlugin
 * ```
 */

import type {
  PluginManifest,
  QuarryPluginAPIType,
  PluginContext,
  QuarryPluginInterface,
} from './types'

/**
 * Abstract base class for Quarry plugins
 *
 * Plugins must extend this class and implement the `onLoad` method.
 * The plugin manager injects the `api`, `manifest`, and `context` before calling `onLoad`.
 */
export abstract class QuarryPlugin implements QuarryPluginInterface {
  /**
   * Plugin manifest data from manifest.json
   * Injected by the plugin manager before onLoad()
   */
  manifest!: PluginManifest

  /**
   * API for interacting with Quarry
   * Injected by the plugin manager before onLoad()
   */
  api!: QuarryPluginAPIType

  /**
   * Current context (file, theme, settings)
   * Injected by the plugin manager before onLoad()
   */
  context!: PluginContext

  /**
   * Called when the plugin is loaded
   *
   * This is where you should:
   * - Register UI components (widgets, toolbar buttons, etc.)
   * - Register commands and keyboard shortcuts
   * - Subscribe to events
   * - Initialize any resources
   *
   * @example
   * ```typescript
   * async onLoad() {
   *   // Register a sidebar widget
   *   this.api.registerSidebarWidget(TimerWidget)
   *
   *   // Register a command
   *   this.api.registerCommand({
   *     id: 'start-timer',
   *     name: 'Start Timer',
   *     shortcut: 'mod+shift+t',
   *     callback: () => this.startTimer(),
   *   })
   *
   *   // Subscribe to events
   *   this.api.on('file:open', (payload) => {
   *     this.log('File opened:', payload.path)
   *   })
   * }
   * ```
   */
  abstract onLoad(): Promise<void>

  /**
   * Called when the plugin is unloaded
   *
   * This is where you should:
   * - Clean up timers and intervals
   * - Close connections
   * - Release resources
   *
   * Note: UI component registrations are automatically cleaned up.
   * You only need to clean up resources you created directly.
   *
   * @example
   * ```typescript
   * async onUnload() {
   *   if (this.intervalId) {
   *     clearInterval(this.intervalId)
   *   }
   *   await this.connection?.close()
   *   this.log('Cleaned up!')
   * }
   * ```
   */
  async onUnload(): Promise<void> {
    // Override in subclass if cleanup is needed
  }

  /**
   * Called when the user changes plugin settings
   *
   * @param settings - The new settings values
   *
   * @example
   * ```typescript
   * onSettingsChange(settings) {
   *   this.workDuration = settings.workDuration as number
   *   this.breakDuration = settings.breakDuration as number
   *   this.log('Settings updated:', settings)
   * }
   * ```
   */
  onSettingsChange?(settings: Record<string, unknown>): void

  // =========================================================================
  // CONVENIENCE LOGGING METHODS
  // =========================================================================

  /**
   * Log an info message with plugin prefix
   */
  protected log(message: string, ...args: unknown[]): void {
    this.api?.log?.(`[${this.manifest?.name || 'Plugin'}] ${message}`, ...args)
  }

  /**
   * Log a warning with plugin prefix
   */
  protected warn(message: string, ...args: unknown[]): void {
    this.api?.warn?.(`[${this.manifest?.name || 'Plugin'}] ${message}`, ...args)
  }

  /**
   * Log an error with plugin prefix
   */
  protected error(message: string, error?: Error): void {
    this.api?.error?.(`[${this.manifest?.name || 'Plugin'}] ${message}`, error)
  }

  // =========================================================================
  // CONVENIENCE STORAGE METHODS
  // =========================================================================

  /**
   * Get a setting value with type safety
   */
  protected getSetting<T>(key: string, defaultValue: T): T {
    const value = this.context?.settings?.[key]
    return (value as T) ?? defaultValue
  }

  /**
   * Store data persistently for this plugin
   */
  protected store<T>(key: string, value: T): void {
    this.api?.setData(key, value)
  }

  /**
   * Retrieve stored data for this plugin
   */
  protected retrieve<T>(key: string): T | null {
    return this.api?.getData<T>(key) ?? null
  }

  // =========================================================================
  // CONVENIENCE UI METHODS
  // =========================================================================

  /**
   * Show a success notification
   */
  protected success(message: string): void {
    this.api?.showNotice(message, 'success')
  }

  /**
   * Show an info notification
   */
  protected info(message: string): void {
    this.api?.showNotice(message, 'info')
  }

  /**
   * Show a warning notification
   */
  protected warning(message: string): void {
    this.api?.showNotice(message, 'warning')
  }

  /**
   * Show an error notification
   */
  protected errorNotice(message: string): void {
    this.api?.showNotice(message, 'error')
  }
}

/**
 * Helper type for plugin class constructors
 */
export type PluginConstructor = new () => QuarryPlugin

/**
 * Type guard to check if an object is a valid plugin class
 */
export function isPluginClass(obj: unknown): obj is PluginConstructor {
  if (typeof obj !== 'function') return false
  const proto = obj.prototype
  return (
    proto &&
    typeof proto.onLoad === 'function'
  )
}

/**
 * Type guard to check if an object is a plugin instance
 */
export function isPluginInstance(obj: unknown): obj is QuarryPlugin {
  return (
    obj instanceof QuarryPlugin ||
    (typeof obj === 'object' &&
      obj !== null &&
      'onLoad' in obj &&
      typeof (obj as any).onLoad === 'function')
  )
}
