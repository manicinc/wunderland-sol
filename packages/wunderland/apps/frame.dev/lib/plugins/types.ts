/**
 * Quarry Plugin System - Type Definitions
 *
 * Obsidian-style plugin architecture for the Quarry Codex Viewer.
 * Plugins are loaded dynamically from URLs, ZIP files, or the community registry.
 *
 * @module lib/plugins/types
 */

import type { ComponentType } from 'react'
import type { StrandMetadata } from '@/components/quarry/types'
import type { StorageAdapter } from '@framers/sql-storage-adapter'

/** @deprecated Use StorageAdapter - Database is no longer exported */
type Database = StorageAdapter

// ============================================================================
// PLUGIN MANIFEST
// ============================================================================

/**
 * Plugin types determine how the plugin integrates with Quarry
 */
export type PluginType =
  | 'widget'      // Sidebar or floating widget (e.g., Pomodoro Timer)
  | 'renderer'    // Custom markdown renderer (e.g., Citation Manager)
  | 'processor'   // Content processor (transforms content before display)
  | 'theme'       // Visual theme extension
  | 'panel'       // Full sidebar panel (replaces tree/toc/tags/graph)
  | 'toolbar'     // Toolbar button/menu
  | 'command'     // Keyboard command only (no UI)

/**
 * Where to position plugin UI elements
 */
export type PluginPosition =
  | 'sidebar'         // Left sidebar area (below mode buttons)
  | 'sidebar-bottom'  // Bottom of left sidebar
  | 'metadata'        // Right metadata panel area
  | 'toolbar'         // Main toolbar row
  | 'floating'        // Floating overlay (draggable)
  | 'content'         // Inside content area (alongside markdown)

/**
 * Setting field types for plugin configuration
 */
export type SettingType = 'string' | 'number' | 'boolean' | 'select' | 'color' | 'slider'

/**
 * Individual setting definition
 */
export interface SettingDefinition {
  /** Setting field type */
  type: SettingType
  /** Default value */
  default: string | number | boolean
  /** Display label */
  label: string
  /** Help text / description */
  description?: string
  /** Options for 'select' type */
  options?: Array<{ value: string; label: string }>
  /** Min value for 'number' and 'slider' */
  min?: number
  /** Max value for 'number' and 'slider' */
  max?: number
  /** Step value for 'number' and 'slider' */
  step?: number
  /** Placeholder text for 'string' type */
  placeholder?: string
}

/**
 * Plugin manifest - the main configuration file (manifest.json)
 *
 * @example
 * ```json
 * {
 *   "id": "com.example.pomodoro-timer",
 *   "name": "Pomodoro Timer",
 *   "version": "1.0.0",
 *   "description": "A focus timer widget for your sidebar",
 *   "author": "Your Name",
 *   "minQuarryVersion": "1.0.0",
 *   "main": "main.js",
 *   "styles": "styles.css",
 *   "type": "widget",
 *   "position": "sidebar"
 * }
 * ```
 */
export interface PluginManifest {
  /** Unique identifier in reverse domain notation (e.g., "com.author.plugin-name") */
  id: string
  /** Display name */
  name: string
  /** Semantic version (e.g., "1.0.0") */
  version: string
  /** Short description */
  description: string
  /** Author name */
  author: string
  /** Author website URL */
  authorUrl?: string
  /** Donation/funding URL */
  fundingUrl?: string
  /** Minimum Quarry version required */
  minQuarryVersion: string
  /** Entry point file (e.g., "main.js") */
  main: string
  /** Optional CSS file (e.g., "styles.css") */
  styles?: string
  /** Plugin type */
  type: PluginType
  /** Where to render plugin UI (for widgets/panels) */
  position?: PluginPosition
  /** Requested permissions (reserved for future use) */
  permissions?: string[]
  /** User-configurable settings */
  settings?: Record<string, SettingDefinition>
  /** Keywords for search */
  keywords?: string[]
  /** Repository URL */
  repository?: string
  /** Bugs/issues URL */
  bugs?: string
  /** License identifier (e.g., "MIT") */
  license?: string
}

// ============================================================================
// PLUGIN STATE
// ============================================================================

/**
 * Plugin status in the manager
 */
export type PluginStatus =
  | 'installed'   // Downloaded but not active
  | 'enabled'     // Active and running
  | 'disabled'    // Installed but turned off
  | 'error'       // Failed to load
  | 'loading'     // Currently loading

/**
 * Runtime state of an installed plugin
 */
export interface PluginState {
  /** Plugin ID from manifest */
  id: string
  /** Full manifest data */
  manifest: PluginManifest
  /** Current status */
  status: PluginStatus
  /** Whether plugin is enabled */
  enabled: boolean
  /** Error message if status is 'error' */
  error?: string
  /** User settings values */
  settings: Record<string, unknown>
  /** When plugin was installed (ISO timestamp) */
  installedAt: string
  /** When plugin was last updated (ISO timestamp) */
  updatedAt: string
  /** Source URL or path */
  source: string
  /** Whether this is a bundled default plugin */
  isBundled?: boolean
}

// ============================================================================
// PLUGIN EVENTS
// ============================================================================

/**
 * Events that plugins can subscribe to
 */
export type QuarryEventType =
  | 'file:open'           // File opened
  | 'file:close'          // File closed
  | 'file:save'           // File saved (editor)
  | 'content:change'      // Content modified (editor)
  | 'navigation:change'   // Path changed
  | 'theme:change'        // Theme toggled
  | 'settings:change'     // Plugin settings updated
  | 'sidebar:toggle'      // Sidebar opened/closed
  | 'sidebar:mode'        // Sidebar mode changed
  | 'search:query'        // Search performed
  | 'tree:expand'         // Tree node expanded
  | 'tree:collapse'       // Tree node collapsed
  | 'plugin:load'         // Another plugin loaded
  | 'plugin:unload'       // Another plugin unloaded

/**
 * Event payload types
 */
export interface QuarryEventPayloads {
  'file:open': { path: string; name: string }
  'file:close': { path: string }
  'file:save': { path: string; content: string }
  'content:change': { path: string; content: string }
  'navigation:change': { from: string; to: string }
  'theme:change': { theme: string; isDark: boolean }
  'settings:change': { pluginId: string; settings: Record<string, unknown> }
  'sidebar:toggle': { open: boolean }
  'sidebar:mode': { mode: string }
  'search:query': { query: string; results: number }
  'tree:expand': { path: string }
  'tree:collapse': { path: string }
  'plugin:load': { pluginId: string }
  'plugin:unload': { pluginId: string }
}

/**
 * Event callback function type
 */
export type EventCallback<T extends QuarryEventType = QuarryEventType> = (
  payload: QuarryEventPayloads[T]
) => void

// ============================================================================
// PLUGIN UI REGISTRATION
// ============================================================================

/**
 * Props passed to sidebar widget components
 */
export interface WidgetProps {
  /** Plugin API instance */
  api: QuarryPluginAPIType
  /** User settings */
  settings: Record<string, unknown>
  /** Current theme */
  theme: string
  /** Whether dark mode */
  isDark: boolean
  /** Whether widget is expanded to full-page modal */
  isExpanded?: boolean
}

/**
 * Toolbar button registration options
 */
export interface ToolbarButtonOptions {
  /** Unique button ID */
  id: string
  /** Button icon (React node) */
  icon: React.ReactNode
  /** Tooltip label */
  label: string
  /** Click handler */
  onClick: () => void
  /** Whether button is currently active */
  isActive?: boolean
  /** Keyboard shortcut (e.g., "mod+shift+p") */
  shortcut?: string
}

/**
 * Command registration options
 */
export interface CommandOptions {
  /** Unique command ID */
  id: string
  /** Command name (for command palette) */
  name: string
  /** Command handler */
  callback: () => void
  /** Keyboard shortcut (e.g., "mod+shift+p") */
  shortcut?: string
  /** Show in command palette */
  showInPalette?: boolean
}

/**
 * Custom markdown renderer registration options
 */
export interface RendererOptions {
  /** Pattern to match in markdown (regex) */
  pattern: RegExp
  /** React component to render matches */
  component: ComponentType<RendererProps>
  /** Priority (higher = processed first) */
  priority?: number
}

/**
 * Props passed to custom renderer components
 */
export interface RendererProps {
  /** Regex match array */
  match: RegExpMatchArray
  /** Plugin API instance */
  api: QuarryPluginAPIType
  /** Raw matched content */
  content: string
}

/**
 * Sidebar mode registration options
 */
export interface SidebarModeOptions {
  /** Unique mode ID */
  id: string
  /** Display name */
  name: string
  /** Mode icon */
  icon: React.ReactNode
  /** React component for the sidebar panel */
  component: ComponentType<WidgetProps>
}

/**
 * Modal options for showModal API
 */
export interface ModalOptions {
  /** Modal title */
  title: string
  /** Modal content (React node or component) */
  content?: React.ReactNode
  /** React component for modal body */
  component?: ComponentType<{ api: QuarryPluginAPIType; onClose: () => void }>
  /** Show confirm button */
  showConfirm?: boolean
  /** Confirm button text */
  confirmText?: string
  /** Cancel button text */
  cancelText?: string
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

// ============================================================================
// PLUGIN API INTERFACE
// ============================================================================

/**
 * Current context available to plugins
 */
export interface PluginContext {
  /** Current file info */
  currentFile: {
    path: string
    name: string
    content: string
  } | null
  /** Current directory path */
  currentPath: string
  /** File metadata */
  metadata: StrandMetadata | null
  /** Current theme name */
  theme: string
  /** Whether dark mode is active */
  isDark: boolean
  /** Plugin's user settings */
  settings: Record<string, unknown>
}

/**
 * The API object passed to plugins for interacting with Quarry
 */
export interface QuarryPluginAPIType {
  // === Navigation ===
  /** Navigate to a path in the viewer */
  navigateTo(path: string): void
  /** Open a specific file */
  openFile(path: string): Promise<void>
  /** Go back in history */
  goBack(): void
  /** Go forward in history */
  goForward(): void

  // === Content ===
  /** Get current file content */
  getContent(): string
  /** Get current file metadata */
  getMetadata(): StrandMetadata | null
  /** Get current context */
  getContext(): PluginContext

  // === UI Notifications ===
  /** Show a toast notification */
  showNotice(message: string, type?: 'info' | 'success' | 'warning' | 'error', timeout?: number): void
  /** Show a modal dialog */
  showModal(options: ModalOptions): Promise<boolean>

  // === Storage ===
  /** Get stored data for this plugin (localStorage key-value) */
  getData<T>(key: string): T | null
  /** Set stored data for this plugin (localStorage key-value) */
  setData<T>(key: string, value: T): void
  /** Delete stored data (localStorage key-value) */
  deleteData(key: string): void

  // === SQL Storage ===
  /** Get plugin's SQL database instance (isolated per plugin) */
  getSqlDatabase(): Promise<Database>
  /** Run a SQL query (SELECT) and return all rows */
  sqlQuery<T = any>(sql: string, params?: any[]): Promise<T[]>
  /** Execute a SQL statement (INSERT/UPDATE/DELETE) */
  sqlExecute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid?: string | number | null }>
  /** Run multiple SQL statements in a transaction */
  sqlTransaction(statements: Array<{ sql: string; params?: any[] }>): Promise<void>
  /** Export SQL database as Uint8Array (not currently supported) */
  sqlExport(): Promise<Uint8Array>
  /** Import SQL database from Uint8Array (not currently supported) */
  sqlImport(data: Uint8Array): Promise<void>

  // === Events ===
  /** Subscribe to an event */
  on<T extends QuarryEventType>(event: T, callback: EventCallback<T>): () => void
  /** Emit an event (for plugin-to-plugin communication) */
  emit<T extends QuarryEventType>(event: T, payload: QuarryEventPayloads[T]): void

  // === Tree Access ===
  /** Get the full knowledge tree */
  getKnowledgeTree(): any[]
  /** Expand a tree node */
  expandNode(path: string): void
  /** Collapse a tree node */
  collapseNode(path: string): void

  // === Search ===
  /** Perform a search */
  search(query: string): Promise<Array<{ path: string; name: string; score: number }>>

  // === Registration ===
  /** Register a sidebar widget */
  registerSidebarWidget(component: ComponentType<WidgetProps>): void
  /** Register a toolbar button */
  registerToolbarButton(options: ToolbarButtonOptions): void
  /** Register a command */
  registerCommand(options: CommandOptions): void
  /** Register a custom markdown renderer */
  registerMarkdownRenderer(options: RendererOptions): void
  /** Register a custom sidebar mode */
  registerSidebarMode(options: SidebarModeOptions): void

  // === Logging ===
  /** Log info message */
  log(message: string, ...args: unknown[]): void
  /** Log warning */
  warn(message: string, ...args: unknown[]): void
  /** Log error */
  error(message: string, error?: Error): void
}

// ============================================================================
// PLUGIN BASE CLASS
// ============================================================================

/**
 * Base class that plugins extend
 */
export interface QuarryPluginInterface {
  /** Plugin manifest */
  manifest: PluginManifest
  /** API instance */
  api: QuarryPluginAPIType
  /** Current context */
  context: PluginContext

  /** Called when plugin is loaded - register UI elements here */
  onLoad(): Promise<void>
  /** Called when plugin is unloaded - cleanup resources here */
  onUnload?(): Promise<void>
  /** Called when user changes plugin settings */
  onSettingsChange?(settings: Record<string, unknown>): void
}

// ============================================================================
// REGISTRY TYPES
// ============================================================================

/**
 * Plugin entry in the community registry
 */
export interface RegistryPlugin {
  /** Plugin ID */
  id: string
  /** Display name */
  name: string
  /** Version */
  version: string
  /** Description */
  description: string
  /** Author name */
  author: string
  /** Plugin type */
  type: PluginType
  /** Download count */
  downloads?: number
  /** Average rating (1-5) */
  rating?: number
  /** Whether plugin is verified */
  verified: boolean
  /** CDN URL for direct download */
  cdnUrl?: string
  /** GitHub repository URL */
  repositoryUrl?: string
  /** Keywords for search */
  keywords?: string[]
  /** Last update timestamp */
  updatedAt?: string
}

/**
 * Community plugin registry format
 */
export interface PluginRegistry {
  /** Registry format version */
  version: string
  /** Last update timestamp */
  updated: string
  /** Available plugins */
  plugins: RegistryPlugin[]
  /** Available themes */
  themes?: RegistryPlugin[]
}

// ============================================================================
// LOADER TYPES
// ============================================================================

/**
 * Result of loading/installing a plugin
 */
export interface LoadResult {
  /** Whether operation succeeded */
  success: boolean
  /** Plugin manifest (if successful) */
  manifest?: PluginManifest
  /** Error messages */
  errors?: string[]
}

/**
 * Cached plugin data in IndexedDB
 */
export interface CachedPlugin {
  /** Plugin ID */
  id: string
  /** Full manifest */
  manifest: PluginManifest
  /** Compiled JavaScript code */
  mainCode: string
  /** CSS styles */
  styles: string
  /** When cached */
  cachedAt: string
  /** Source URL */
  source: string
  /** Whether this is a bundled default plugin */
  isBundled?: boolean
}

/**
 * Validation result for manifests
 */
export interface ValidationResult {
  /** Whether manifest is valid */
  valid: boolean
  /** Validation errors */
  errors: string[]
  /** Validation warnings */
  warnings?: string[]
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Current Quarry version (for compatibility checking) */
export const QUARRY_VERSION = '1.0.0'

/** Valid plugin types */
export const VALID_PLUGIN_TYPES: PluginType[] = [
  'widget',
  'renderer',
  'processor',
  'theme',
  'panel',
  'toolbar',
  'command',
]

/** Valid plugin positions */
export const VALID_PLUGIN_POSITIONS: PluginPosition[] = [
  'sidebar',
  'sidebar-bottom',
  'metadata',
  'toolbar',
  'floating',
  'content',
]

/** Default registry URL */
export const DEFAULT_REGISTRY_URL = 'https://raw.githubusercontent.com/framersai/quarry-plugins/main/registry.json'

/** IndexedDB database name */
export const PLUGINS_DB_NAME = 'quarry-plugins'

/** IndexedDB store name */
export const PLUGINS_STORE_NAME = 'plugins'

/** localStorage key for plugin states */
export const PLUGIN_STATES_KEY = 'quarry-plugin-states'
