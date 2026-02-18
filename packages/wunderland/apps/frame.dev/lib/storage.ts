/**
 * Storage Abstraction Layer
 * 
 * Provides unified storage interface with multiple backends:
 * - IndexedDB via @framers/sql-storage-adapter (primary, offline-first)
 * - localStorage (fallback, synchronous)
 * - In-memory (for testing/SSR)
 * 
 * Features:
 * - Automatic serialization/deserialization
 * - Namespaced keys to prevent collisions
 * - Export/Import functionality
 * - Migration support
 * - Graceful degradation (IndexedDB → localStorage → memory)
 * - Offline-first design for static GitHub Pages hosting
 * 
 * @module lib/storage
 */

// ============================================================================
// TYPES
// ============================================================================

export type StorageBackend = 'sql' | 'localStorage' | 'memory'

export interface StorageOptions {
  /** Storage backend to use */
  backend?: StorageBackend
  /** Namespace prefix for all keys */
  namespace?: string
  /** Version for migration support */
  version?: number
  /** Database name for SQL backend */
  dbName?: string
}

export interface StorageMetadata {
  version: number
  createdAt: string
  updatedAt: string
  backend: StorageBackend
  size: number
}

export interface ExportData {
  metadata: {
    version: number
    exportedAt: string
    namespace: string
    checksum: string
  }
  data: Record<string, unknown>
}

// ============================================================================
// IN-MEMORY STORE (for SSR/testing)
// ============================================================================

const memoryStore = new Map<string, string>()

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a simple checksum for data integrity
 */
function generateChecksum(data: string): string {
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16)
}

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

/**
 * Safely stringify value with error handling
 */
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch (error) {
    console.error('[Storage] Failed to stringify value:', error)
    return ''
  }
}

/**
 * Safely parse JSON with error handling
 */
function safeParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch (error) {
    console.error('[Storage] Failed to parse JSON:', error)
    return fallback
  }
}

// ============================================================================
// SQL DATABASE SINGLETON
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sqlDb: any = null
let sqlDbPromise: Promise<boolean> | null = null
let sqlDbFailed = false

/**
 * Initialize SQL database with graceful fallback
 * Uses IndexedDB adapter for browser persistence
 */
async function initSqlDb(dbName: string = 'openstrand'): Promise<boolean> {
  if (sqlDb) return true
  if (sqlDbFailed) return false
  
  // Return existing initialization promise if in progress
  if (sqlDbPromise) return sqlDbPromise
  
  sqlDbPromise = (async () => {
    if (!isBrowser()) {
      sqlDbFailed = true
      return false
    }
    
    try {
      // Dynamic import to avoid bundling issues on server
      const { createDatabase } = await import('@framers/sql-storage-adapter')
      
      // Create database with IndexedDB priority (browser-native, offline-first)
      // Falls back to sql.js (in-memory) if IndexedDB fails
      sqlDb = await createDatabase({
        priority: ['indexeddb', 'sqljs'],
        // Configure sql.js WASM location for browser deployment
        // Use absolute URL to avoid path resolution issues on nested routes
        indexedDb: {
          dbName: dbName,
          autoSave: true,
          saveIntervalMs: 3000,
          sqlJsConfig: {
            locateFile: (file: string) => {
              const origin = typeof window !== 'undefined' ? window.location.origin : ''
              return `${origin}/wasm/${file}`
            },
          },
        },
      })
      
      // Create key-value table for storage
      await sqlDb.exec(`
        CREATE TABLE IF NOT EXISTS kv_store (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      console.log('[Storage] SQL database initialized with IndexedDB persistence')
      return true
    } catch (error) {
      console.warn('[Storage] SQL database failed, falling back to localStorage:', error)
      sqlDbFailed = true
      return false
    }
  })()
  
  return sqlDbPromise
}

// ============================================================================
// STORAGE CLASS
// ============================================================================

/**
 * Unified storage class with multiple backend support
 * Prioritizes SQL (IndexedDB) for offline-first persistence
 */
export class Storage {
  private namespace: string
  private version: number
  private backend: StorageBackend
  private dbName: string
  private initialized = false

  constructor(options: StorageOptions = {}) {
    this.namespace = options.namespace || 'openstrand'
    this.version = options.version || 1
    this.dbName = options.dbName || 'openstrand_db'
    
    // Determine best available backend
    if (!isBrowser()) {
      this.backend = 'memory'
    } else if (options.backend) {
      this.backend = options.backend
    } else {
      // Default to SQL (IndexedDB) for persistence, will fallback gracefully
      this.backend = 'sql'
    }
  }

  /**
   * Initialize storage backend (lazy)
   */
  private async init(): Promise<void> {
    if (this.initialized) return
    
    if (this.backend === 'sql') {
      const success = await initSqlDb(this.dbName)
      if (!success) {
        console.log('[Storage] Falling back to localStorage')
        this.backend = 'localStorage'
      }
    }
    
    this.initialized = true
  }

  /**
   * Get prefixed key
   */
  private getKey(key: string): string {
    return `${this.namespace}:${key}`
  }

  /**
   * Get value from storage
   */
  async get<T>(key: string, defaultValue: T): Promise<T> {
    await this.init()
    const fullKey = this.getKey(key)

    try {
      switch (this.backend) {
        case 'memory':
          const memValue = memoryStore.get(fullKey)
          return memValue ? safeParse(memValue, defaultValue) : defaultValue

        case 'sql':
          if (sqlDb) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rows = await sqlDb.all(
              'SELECT value FROM kv_store WHERE key = ?',
              [fullKey]
            ) as any[]
            if (rows && rows.length > 0) {
              return safeParse(rows[0].value, defaultValue)
            }
          }
          return defaultValue

        case 'localStorage':
        default:
          if (!isBrowser()) return defaultValue
          const stored = localStorage.getItem(fullKey)
          return stored ? safeParse(stored, defaultValue) : defaultValue
      }
    } catch (error) {
      console.error(`[Storage] Error getting key "${key}":`, error)
      return defaultValue
    }
  }

  /**
   * Set value in storage
   */
  async set<T>(key: string, value: T): Promise<boolean> {
    await this.init()
    const fullKey = this.getKey(key)
    const serialized = safeStringify(value)
    
    if (!serialized) return false

    try {
      switch (this.backend) {
        case 'memory':
          memoryStore.set(fullKey, serialized)
          return true

        case 'sql':
          if (sqlDb) {
            await sqlDb.run(
              `INSERT INTO kv_store (key, value, updated_at) 
               VALUES (?, ?, CURRENT_TIMESTAMP)
               ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
              [fullKey, serialized]
            )
            return true
          }
          return false

        case 'localStorage':
        default:
          if (!isBrowser()) return false
          localStorage.setItem(fullKey, serialized)
          return true
      }
    } catch (error) {
      console.error(`[Storage] Error setting key "${key}":`, error)
      // Handle quota exceeded
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('[Storage] Storage quota exceeded')
      }
      return false
    }
  }

  /**
   * Remove value from storage
   */
  async remove(key: string): Promise<boolean> {
    await this.init()
    const fullKey = this.getKey(key)

    try {
      switch (this.backend) {
        case 'memory':
          return memoryStore.delete(fullKey)

        case 'sql':
          if (sqlDb) {
            await sqlDb.run('DELETE FROM kv_store WHERE key = ?', [fullKey])
            return true
          }
          return false

        case 'localStorage':
        default:
          if (!isBrowser()) return false
          localStorage.removeItem(fullKey)
          return true
      }
    } catch (error) {
      console.error(`[Storage] Error removing key "${key}":`, error)
      return false
    }
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    await this.init()
    const fullKey = this.getKey(key)

    try {
      switch (this.backend) {
        case 'memory':
          return memoryStore.has(fullKey)

        case 'sql':
          if (sqlDb) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rows = await sqlDb.all(
              'SELECT COUNT(*) as count FROM kv_store WHERE key = ?',
              [fullKey]
            ) as any[]
            return rows && rows.length > 0 && rows[0].count > 0
          }
          return false

        case 'localStorage':
        default:
          if (!isBrowser()) return false
          return localStorage.getItem(fullKey) !== null
      }
    } catch (error) {
      return false
    }
  }

  /**
   * Get all keys in namespace
   */
  async keys(): Promise<string[]> {
    await this.init()
    const prefix = `${this.namespace}:`
    const keys: string[] = []

    try {
      switch (this.backend) {
        case 'memory':
          for (const key of memoryStore.keys()) {
            if (key.startsWith(prefix)) {
              keys.push(key.slice(prefix.length))
            }
          }
          break

        case 'sql':
          if (sqlDb) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rows = await sqlDb.all(
              'SELECT key FROM kv_store WHERE key LIKE ?',
              [`${prefix}%`]
            ) as any[]
            if (rows) {
              for (const row of rows) {
                keys.push(row.key.slice(prefix.length))
              }
            }
          }
          break

        case 'localStorage':
        default:
          if (!isBrowser()) break
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith(prefix)) {
              keys.push(key.slice(prefix.length))
            }
          }
      }
    } catch (error) {
      console.error('[Storage] Error getting keys:', error)
    }

    return keys
  }

  /**
   * Clear all data in namespace
   */
  async clear(): Promise<boolean> {
    await this.init()
    
    try {
      if (this.backend === 'sql' && sqlDb) {
        const prefix = `${this.namespace}:`
        await sqlDb.run('DELETE FROM kv_store WHERE key LIKE ?', [`${prefix}%`])
        return true
      }
      
      // Fallback: delete keys one by one
      const allKeys = await this.keys()
      for (const key of allKeys) {
        await this.remove(key)
      }
      return true
    } catch (error) {
      console.error('[Storage] Error clearing storage:', error)
      return false
    }
  }

  /**
   * Get storage metadata
   */
  async getMetadata(): Promise<StorageMetadata> {
    const keys = await this.keys()
    let size = 0

    for (const key of keys) {
      const value = await this.get(key, null)
      if (value) {
        size += safeStringify(value).length
      }
    }

    return {
      version: this.version,
      createdAt: await this.get('_created', new Date().toISOString()),
      updatedAt: new Date().toISOString(),
      backend: this.backend,
      size
    }
  }

  /**
   * Export all data
   */
  async export(): Promise<ExportData> {
    const keys = await this.keys()
    const data: Record<string, unknown> = {}

    for (const key of keys) {
      // Skip internal keys
      if (key.startsWith('_')) continue
      data[key] = await this.get(key, null)
    }

    const serialized = safeStringify(data)
    
    return {
      metadata: {
        version: this.version,
        exportedAt: new Date().toISOString(),
        namespace: this.namespace,
        checksum: generateChecksum(serialized)
      },
      data
    }
  }

  /**
   * Import data from export
   */
  async import(exportData: ExportData, options?: { 
    merge?: boolean 
    validate?: boolean 
  }): Promise<{ success: boolean; imported: number; errors: string[] }> {
    const { merge = false, validate = true } = options || {}
    const errors: string[] = []
    let imported = 0

    // Validate checksum if requested
    if (validate) {
      const serialized = safeStringify(exportData.data)
      const checksum = generateChecksum(serialized)
      if (checksum !== exportData.metadata.checksum) {
        return {
          success: false,
          imported: 0,
          errors: ['Checksum validation failed - data may be corrupted']
        }
      }
    }

    // Clear existing data if not merging
    if (!merge) {
      await this.clear()
    }

    // Import data
    for (const [key, value] of Object.entries(exportData.data)) {
      try {
        await this.set(key, value)
        imported++
      } catch (error) {
        errors.push(`Failed to import key "${key}": ${error}`)
      }
    }

    return {
      success: errors.length === 0,
      imported,
      errors
    }
  }

  /**
   * Create a backup download
   */
  async downloadBackup(filename?: string): Promise<void> {
    if (!isBrowser()) return

    const exportData = await this.export()
    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `openstrand-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Restore from uploaded file
   */
  async restoreFromFile(file: File, options?: { merge?: boolean }): Promise<{
    success: boolean
    imported: number
    errors: string[]
  }> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        try {
          const json = e.target?.result as string
          const exportData = safeParse<ExportData>(json, null as unknown as ExportData)
          
          if (!exportData || !exportData.metadata || !exportData.data) {
            resolve({
              success: false,
              imported: 0,
              errors: ['Invalid backup file format']
            })
            return
          }

          const result = await this.import(exportData, options)
          resolve(result)
        } catch (error) {
          resolve({
            success: false,
            imported: 0,
            errors: [`Failed to parse backup file: ${error}`]
          })
        }
      }

      reader.onerror = () => {
        resolve({
          success: false,
          imported: 0,
          errors: ['Failed to read backup file']
        })
      }

      reader.readAsText(file)
    })
  }
  
  /**
   * Get the current backend being used
   */
  getBackend(): StorageBackend {
    return this.backend
  }
}

// ============================================================================
// DEFAULT INSTANCES
// ============================================================================

/** Default storage instance for user profile */
export const profileStorage = new Storage({ 
  namespace: 'openstrand_profile',
  version: 1 
})

/** Storage instance for flashcard data */
export const flashcardStorage = new Storage({ 
  namespace: 'openstrand_flashcards',
  version: 1 
})

/** Storage instance for study progress */
export const progressStorage = new Storage({ 
  namespace: 'openstrand_progress',
  version: 1 
})

/** Storage instance for app settings */
export const settingsStorage = new Storage({ 
  namespace: 'openstrand_settings',
  version: 1 
})

/** Storage instance for codex cache */
export const codexStorage = new Storage({
  namespace: 'codex_cache',
  version: 1,
  dbName: 'fabric_codex'
})

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get combined export of all OpenStrand data
 */
export async function exportAllData(): Promise<{
  profile: ExportData
  flashcards: ExportData
  progress: ExportData
  settings: ExportData
}> {
  return {
    profile: await profileStorage.export(),
    flashcards: await flashcardStorage.export(),
    progress: await progressStorage.export(),
    settings: await settingsStorage.export()
  }
}

/**
 * Import combined data export
 */
export async function importAllData(data: {
  profile?: ExportData
  flashcards?: ExportData
  progress?: ExportData
  settings?: ExportData
}, options?: { merge?: boolean }): Promise<{
  success: boolean
  results: Record<string, { imported: number; errors: string[] }>
}> {
  const results: Record<string, { imported: number; errors: string[] }> = {}
  let allSuccess = true

  if (data.profile) {
    const result = await profileStorage.import(data.profile, options)
    results.profile = { imported: result.imported, errors: result.errors }
    if (!result.success) allSuccess = false
  }

  if (data.flashcards) {
    const result = await flashcardStorage.import(data.flashcards, options)
    results.flashcards = { imported: result.imported, errors: result.errors }
    if (!result.success) allSuccess = false
  }

  if (data.progress) {
    const result = await progressStorage.import(data.progress, options)
    results.progress = { imported: result.imported, errors: result.errors }
    if (!result.success) allSuccess = false
  }

  if (data.settings) {
    const result = await settingsStorage.import(data.settings, options)
    results.settings = { imported: result.imported, errors: result.errors }
    if (!result.success) allSuccess = false
  }

  return { success: allSuccess, results }
}

/**
 * Check storage availability and report capabilities
 */
export async function getStorageCapabilities(): Promise<{
  sqlAvailable: boolean
  indexedDbAvailable: boolean
  localStorageAvailable: boolean
  recommendedBackend: StorageBackend
}> {
  const localStorageAvailable = isBrowser() && typeof localStorage !== 'undefined'
  const indexedDbAvailable = isBrowser() && typeof indexedDB !== 'undefined'
  
  // Try to init SQL to check availability
  let sqlAvailable = false
  if (isBrowser()) {
    try {
      sqlAvailable = await initSqlDb('capability_check')
    } catch {
      sqlAvailable = false
    }
  }
  
  return {
    sqlAvailable,
    indexedDbAvailable,
    localStorageAvailable,
    recommendedBackend: sqlAvailable ? 'sql' : (localStorageAvailable ? 'localStorage' : 'memory')
  }
}
