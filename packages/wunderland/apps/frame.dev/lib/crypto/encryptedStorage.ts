/**
 * Encrypted Storage Adapter
 *
 * Wraps the existing Storage class to automatically encrypt/decrypt data.
 * Drop-in replacement - same API, transparent encryption.
 *
 * @module lib/crypto/encryptedStorage
 */

import { Storage, type StorageOptions, type StorageMetadata, type ExportData } from '../storage'
import { encrypt, decrypt, isReady, isEncryptSuccess, isDecryptSuccess } from './index'
import type { EncryptedEnvelope } from './types'

// ============================================================================
// TYPES
// ============================================================================

export interface EncryptedStorageOptions extends StorageOptions {
  /**
   * Keys that should NOT be encrypted (e.g., metadata, sync status)
   * Supports glob-like patterns: 'sync:*', '_*'
   */
  plaintextKeys?: string[]
  /**
   * Whether to throw on encryption/decryption errors (default: false)
   * When false, operations fail silently and return defaults
   */
  throwOnError?: boolean
}

// ============================================================================
// ENCRYPTED STORAGE CLASS
// ============================================================================

/**
 * Storage adapter with transparent encryption
 *
 * Usage:
 * ```typescript
 * const storage = new EncryptedStorage({ namespace: 'myapp' })
 *
 * // Data is automatically encrypted before storage
 * await storage.set('secret', { password: '123' })
 *
 * // Data is automatically decrypted on retrieval
 * const data = await storage.get('secret', null)
 * // data = { password: '123' }
 * ```
 */
export class EncryptedStorage {
  private storage: Storage
  private plaintextPatterns: RegExp[]
  private throwOnError: boolean
  private ready: boolean | null = null

  constructor(options: EncryptedStorageOptions = {}) {
    this.storage = new Storage(options)
    this.throwOnError = options.throwOnError ?? false

    // Convert plaintext key patterns to RegExp
    this.plaintextPatterns = (options.plaintextKeys || []).map(pattern => {
      // Convert glob-like pattern to regex
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
      return new RegExp(`^${regexPattern}$`)
    })

    // Default: don't encrypt internal keys
    this.plaintextPatterns.push(/^_.*/) // Keys starting with _
  }

  /**
   * Check if a key should be stored as plaintext (not encrypted)
   */
  private isPlaintextKey(key: string): boolean {
    return this.plaintextPatterns.some(pattern => pattern.test(key))
  }

  /**
   * Check if crypto is available
   */
  private async ensureReady(): Promise<boolean> {
    if (this.ready !== null) return this.ready
    this.ready = await isReady()
    return this.ready
  }

  /**
   * Get value from storage (automatically decrypts)
   */
  async get<T>(key: string, defaultValue: T): Promise<T> {
    // Plaintext keys bypass encryption
    if (this.isPlaintextKey(key)) {
      return this.storage.get(key, defaultValue)
    }

    // Check if crypto is ready
    if (!(await this.ensureReady())) {
      // Crypto not available - fall back to plaintext
      console.warn('[EncryptedStorage] Crypto not available, using plaintext')
      return this.storage.get(key, defaultValue)
    }

    try {
      // Get the encrypted envelope from storage
      const envelope = await this.storage.get<EncryptedEnvelope | null>(key, null)

      // If no data or not an envelope, return default
      if (!envelope || !isValidEnvelope(envelope)) {
        // Check if it's legacy unencrypted data
        const legacyData = await this.storage.get<T | null>(key, null)
        if (legacyData !== null && !isValidEnvelope(legacyData as unknown)) {
          // Legacy data found - return it (will be encrypted on next write)
          return legacyData
        }
        return defaultValue
      }

      // Decrypt the envelope
      const result = await decrypt<T>(envelope)

      if (isDecryptSuccess(result)) {
        return result.data
      }

      // Decryption failed
      if (this.throwOnError) {
        throw new Error(`Decryption failed for key "${key}": ${result.error}`)
      }

      console.error(`[EncryptedStorage] Decryption failed for "${key}":`, result.error)
      return defaultValue
    } catch (error) {
      if (this.throwOnError) throw error
      console.error(`[EncryptedStorage] Error getting "${key}":`, error)
      return defaultValue
    }
  }

  /**
   * Set value in storage (automatically encrypts)
   */
  async set<T>(key: string, value: T): Promise<boolean> {
    // Plaintext keys bypass encryption
    if (this.isPlaintextKey(key)) {
      return this.storage.set(key, value)
    }

    // Check if crypto is ready
    if (!(await this.ensureReady())) {
      // Crypto not available - store as plaintext with warning
      console.warn('[EncryptedStorage] Crypto not available, storing as plaintext')
      return this.storage.set(key, value)
    }

    try {
      // Encrypt the data
      const result = await encrypt(value)

      if (!isEncryptSuccess(result)) {
        if (this.throwOnError) {
          throw new Error(`Encryption failed for key "${key}": ${result.error}`)
        }
        console.error(`[EncryptedStorage] Encryption failed for "${key}":`, result.error)
        return false
      }

      // Store the encrypted envelope
      return this.storage.set(key, result.envelope)
    } catch (error) {
      if (this.throwOnError) throw error
      console.error(`[EncryptedStorage] Error setting "${key}":`, error)
      return false
    }
  }

  /**
   * Remove value from storage
   */
  async remove(key: string): Promise<boolean> {
    return this.storage.remove(key)
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    return this.storage.has(key)
  }

  /**
   * Get all keys in namespace
   */
  async keys(): Promise<string[]> {
    return this.storage.keys()
  }

  /**
   * Clear all data in namespace
   */
  async clear(): Promise<boolean> {
    return this.storage.clear()
  }

  /**
   * Get storage metadata
   */
  async getMetadata(): Promise<StorageMetadata & { encrypted: boolean }> {
    const metadata = await this.storage.getMetadata()
    return {
      ...metadata,
      encrypted: await this.ensureReady(),
    }
  }

  /**
   * Export all data (decrypted)
   *
   * WARNING: Exports data in plaintext for backup/migration purposes
   */
  async exportDecrypted(): Promise<ExportData> {
    const keys = await this.keys()
    const data: Record<string, unknown> = {}

    for (const key of keys) {
      if (key.startsWith('_')) continue
      data[key] = await this.get(key, null)
    }

    const serialized = JSON.stringify(data)

    return {
      metadata: {
        version: 1,
        exportedAt: new Date().toISOString(),
        namespace: 'encrypted',
        checksum: generateChecksum(serialized),
      },
      data,
    }
  }

  /**
   * Import data (encrypts during import)
   */
  async importData(exportData: ExportData): Promise<boolean> {
    try {
      for (const [key, value] of Object.entries(exportData.data)) {
        await this.set(key, value)
      }
      return true
    } catch (error) {
      console.error('[EncryptedStorage] Import failed:', error)
      return false
    }
  }

  /**
   * Migrate unencrypted data to encrypted
   *
   * Reads all keys and re-writes them (encrypting in the process)
   */
  async migrateToEncrypted(onProgress?: (current: number, total: number) => void): Promise<number> {
    if (!(await this.ensureReady())) {
      throw new Error('Crypto not available')
    }

    const keys = await this.keys()
    let migrated = 0

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]

      // Skip plaintext keys
      if (this.isPlaintextKey(key)) continue

      // Read raw value from underlying storage
      const raw = await this.storage.get<unknown>(key, null)
      if (raw === null) continue

      // Check if already encrypted
      if (isValidEnvelope(raw)) continue

      // Re-write to encrypt
      await this.set(key, raw)
      migrated++

      onProgress?.(i + 1, keys.length)
    }

    return migrated
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a value is an encrypted envelope
 */
function isValidEnvelope(value: unknown): value is EncryptedEnvelope {
  if (typeof value !== 'object' || value === null) return false

  const obj = value as Record<string, unknown>
  return (
    obj.version === 1 &&
    typeof obj.ciphertext === 'string' &&
    typeof obj.encryptedAt === 'number'
  )
}

/**
 * Generate a simple checksum for data integrity
 */
function generateChecksum(data: string): string {
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let defaultInstance: EncryptedStorage | null = null

/**
 * Get the default encrypted storage instance
 */
export function getEncryptedStorage(options?: EncryptedStorageOptions): EncryptedStorage {
  if (!defaultInstance) {
    defaultInstance = new EncryptedStorage({
      namespace: 'frame-encrypted',
      plaintextKeys: [
        '_*',           // Internal keys
        'sync:*',       // Sync metadata
        'migration:*',  // Migration status
      ],
      ...options,
    })
  }
  return defaultInstance
}

/**
 * Create a namespaced encrypted storage instance
 */
export function createEncryptedStorage(
  namespace: string,
  options?: Omit<EncryptedStorageOptions, 'namespace'>
): EncryptedStorage {
  return new EncryptedStorage({
    namespace,
    ...options,
  })
}
