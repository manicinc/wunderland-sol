/**
 * Quarry Plugin System
 *
 * Obsidian-style plugin architecture for the Quarry Codex Viewer.
 *
 * @module lib/plugins
 *
 * @example
 * ```typescript
 * // In your plugin's main.ts
 * import { QuarryPlugin } from '@quarry/plugins'
 *
 * class MyPlugin extends QuarryPlugin {
 *   async onLoad() {
 *     this.api.registerSidebarWidget(MyWidget)
 *     this.success('Plugin loaded!')
 *   }
 * }
 *
 * export default MyPlugin
 * ```
 *
 * @example
 * ```typescript
 * // In your app code
 * import { quarryPluginManager, initializePlugins } from '@/lib/plugins'
 *
 * // On app startup
 * await initializePlugins()
 *
 * // Install a plugin
 * await quarryPluginManager.installFromUrl('https://example.com/my-plugin/')
 *
 * // Enable it
 * await quarryPluginManager.enablePlugin('com.example.my-plugin')
 * ```
 */

// Core types
export * from './types'

// Base class
export { QuarryPlugin, isPluginClass, isPluginInstance } from './QuarryPlugin'
export type { PluginConstructor } from './QuarryPlugin'

// Validation
export {
  validateManifest,
  checkCompatibility,
  parseManifest,
  getDefaultSettings,
} from './validation'

// API
export {
  createPluginAPI,
  pluginEvents,
  pluginUIRegistry,
  pluginDatabaseManager,
  setViewerHooks,
  clearViewerHooks,
} from './QuarryPluginAPI'
export type { ViewerHooks } from './QuarryPluginAPI'

// Loader
export {
  loadFromUrl,
  loadFromZip,
  getCachedPlugin,
  getAllCachedPlugins,
  removeCachedPlugin,
  instantiatePlugin,
  injectPluginStyles,
  removePluginStyles,
} from './QuarryPluginLoader'

// Manager
export {
  quarryPluginManager,
  initializePlugins,
} from './QuarryPluginManager'

// Bundled Plugins
export {
  isPublicAccess,
  isBundledPlugin,
  canUninstallPlugin,
  canInstallPlugins,
  getAllBundledPlugins,
  getBundledPlugin,
  BUNDLED_PLUGIN_IDS,
} from './bundledPlugins'
