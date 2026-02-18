/**
 * Device Key Management
 *
 * Automatically generates and stores a device-specific encryption key.
 * The key is stored in IndexedDB, wrapped (encrypted) by a device fingerprint
 * to provide an additional layer of protection.
 *
 * This key is used for local encryption when no passphrase is set.
 * When sync is enabled, this key will be wrapped by a user-derived master key.
 *
 * @module lib/crypto/deviceKey
 */

import {
  generateRandomKey,
  exportKey,
  importKey,
  encryptWithPassphrase,
  decryptToStringWithPassphrase,
  randomId,
} from './aesGcm'
import type { StoredDeviceKey } from './types'
import { DEFAULT_CRYPTO_CONFIG } from './types'

// ============================================================================
// CONSTANTS
// ============================================================================

const DB_NAME = 'frame-crypto'
const DB_VERSION = 1
const STORE_NAME = 'keys'

// ============================================================================
// DEVICE FINGERPRINT
// ============================================================================

/**
 * Generate a device fingerprint for key wrapping
 *
 * This is NOT a security measure by itself - it's an additional layer
 * that makes the stored key slightly harder to extract.
 * The real security comes from the encryption, not the fingerprint.
 */
function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') {
    return 'server-side-render'
  }

  try {
    // Combine various browser/device properties
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth.toString(),
      screen.width.toString(),
      screen.height.toString(),
      new Date().getTimezoneOffset().toString(),
      navigator.hardwareConcurrency?.toString() || '0',
    ]

    // Create a canvas fingerprint
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillText('frame-e2ee', 2, 2)
      components.push(canvas.toDataURL().slice(0, 100))
    }

    // Hash the components
    return btoa(components.join('|')).slice(0, 32)
  } catch {
    // Fallback for environments where fingerprinting fails
    return 'fallback-fingerprint-' + Date.now().toString(36)
  }
}

// ============================================================================
// INDEXEDDB OPERATIONS
// ============================================================================

/**
 * Open the crypto database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'deviceId' })
      }
    }
  })
}

/**
 * Store a device key in IndexedDB
 */
async function storeDeviceKey(storedKey: StoredDeviceKey): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(storedKey)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()

    tx.oncomplete = () => db.close()
  })
}

/**
 * Load a device key from IndexedDB
 * @internal Reserved for future use (e.g., device management UI)
 */
async function _loadDeviceKey(deviceId: string): Promise<StoredDeviceKey | null> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(deviceId)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || null)

    tx.oncomplete = () => db.close()
  })
}

// Export for future use
export { _loadDeviceKey as loadDeviceKeyById }

/**
 * Get all device keys from IndexedDB
 */
async function getAllDeviceKeys(): Promise<StoredDeviceKey[]> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || [])

    tx.oncomplete = () => db.close()
  })
}

/**
 * Delete a device key from IndexedDB
 */
async function deleteDeviceKey(deviceId: string): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(deviceId)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()

    tx.oncomplete = () => db.close()
  })
}

// ============================================================================
// DEVICE KEY MANAGEMENT
// ============================================================================

/** Cached device key to avoid repeated IndexedDB lookups */
let cachedDeviceKey: CryptoKey | null = null
let cachedDeviceId: string | null = null

/**
 * Get or create the device encryption key
 *
 * On first call, checks IndexedDB for an existing key.
 * If none exists, generates a new random key and stores it.
 * The key is wrapped (encrypted) using the device fingerprint.
 */
export async function getDeviceKey(): Promise<CryptoKey> {
  // Return cached key if available
  if (cachedDeviceKey) {
    return cachedDeviceKey
  }

  if (typeof window === 'undefined') {
    throw new Error('Device key not available server-side')
  }

  const fingerprint = getDeviceFingerprint()
  const storedKeys = await getAllDeviceKeys()

  // Try to load and unwrap existing key
  for (const stored of storedKeys) {
    try {
      const keyJson = await decryptToStringWithPassphrase(
        stored.wrappedKey,
        fingerprint,
        DEFAULT_CRYPTO_CONFIG.pbkdf2Iterations
      )
      const keyData = JSON.parse(keyJson)
      const keyBytes = Uint8Array.from(atob(keyData.key), c => c.charCodeAt(0))

      cachedDeviceKey = await importKey(keyBytes, true)
      cachedDeviceId = stored.deviceId
      return cachedDeviceKey
    } catch {
      // Key couldn't be unwrapped (wrong device or corrupted)
      // Continue to next or generate new
    }
  }

  // No valid key found, generate a new one
  const newKey = await generateRandomKey()
  const deviceId = randomId(16)

  // Export and wrap the key
  const keyBytes = await exportKey(newKey)
  const keyData = JSON.stringify({
    key: btoa(String.fromCharCode(...keyBytes)),
    algorithm: 'AES-GCM-256',
  })

  const wrappedKey = await encryptWithPassphrase(
    keyData,
    fingerprint,
    DEFAULT_CRYPTO_CONFIG.pbkdf2Iterations
  )

  // Store the wrapped key
  const storedKey: StoredDeviceKey = {
    deviceId,
    wrappedKey,
    createdAt: Date.now(),
    version: 1,
  }

  await storeDeviceKey(storedKey)

  // Cache and return
  cachedDeviceKey = newKey
  cachedDeviceId = deviceId

  return newKey
}

/**
 * Get the current device ID
 */
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) {
    return cachedDeviceId
  }

  // Ensure key is loaded to populate deviceId
  await getDeviceKey()

  return cachedDeviceId!
}

/**
 * Check if a device key exists
 */
export async function hasDeviceKey(): Promise<boolean> {
  if (cachedDeviceKey) {
    return true
  }

  if (typeof window === 'undefined') {
    return false
  }

  const storedKeys = await getAllDeviceKeys()
  return storedKeys.length > 0
}

/**
 * Clear the cached device key (forces reload from IndexedDB)
 */
export function clearDeviceKeyCache(): void {
  cachedDeviceKey = null
  cachedDeviceId = null
}

/**
 * Delete the device key (use with caution - data will be unrecoverable!)
 */
export async function deleteCurrentDeviceKey(): Promise<void> {
  if (cachedDeviceId) {
    await deleteDeviceKey(cachedDeviceId)
  }
  clearDeviceKeyCache()
}

/**
 * Re-generate the device key (use with caution!)
 *
 * This will create a new key, making any data encrypted with
 * the old key unrecoverable.
 */
export async function regenerateDeviceKey(): Promise<CryptoKey> {
  // Delete existing key
  await deleteCurrentDeviceKey()

  // Clear cache to force regeneration
  clearDeviceKeyCache()

  // Get new key (will generate since old one is deleted)
  return getDeviceKey()
}

// ============================================================================
// ELECTRON SUPPORT
// ============================================================================

/**
 * Check if running in Electron
 */
function isElectron(): boolean {
  if (typeof window === 'undefined') return false
  return 'electronAPI' in window
}

/**
 * Get Electron API for secure storage
 * @internal Reserved for future Electron-specific key storage
 */
function _getElectronAPI(): { settings?: { get: (k: string) => Promise<unknown>, set: (k: string, v: unknown) => Promise<boolean> } } | null {
  if (!isElectron()) return null
  return (window as unknown as { electronAPI: ReturnType<typeof _getElectronAPI> }).electronAPI
}

// Future: Add Electron-specific key storage using electron-store
// For now, we use IndexedDB for both browser and Electron
void _getElectronAPI // Silence unused warning - reserved for future use
