/**
 * Vault Configuration Types and Handle Storage
 * @module lib/vault/vaultConfig
 *
 * Defines types for vault configuration and provides utilities for
 * storing/retrieving FileSystemDirectoryHandle in IndexedDB.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Vault configuration stored in .quarry/vault.json
 */
export interface VaultConfig {
  /** Schema version for migrations */
  version: 1
  /** Unique identifier for this vault */
  id: string
  /** User-friendly vault name */
  name: string
  /** ISO timestamp when vault was created */
  createdAt: string
  /** ISO timestamp when vault was last opened */
  lastOpenedAt: string
  /** Optional vault-specific settings */
  settings?: {
    defaultWeave?: string
    theme?: string
  }
}

/**
 * Vault status for determining app flow
 */
export type VaultStatus =
  | 'ready'           // Vault is accessible and configured
  | 'needs-setup'     // First launch, no vault configured
  | 'missing'         // Vault was configured but can't be accessed
  | 'permission-needed' // Have handle but need to re-request permission
  | 'unsupported'     // Browser doesn't support File System Access API

/**
 * Result from checking vault status
 */
export interface VaultStatusResult {
  status: VaultStatus
  config?: VaultConfig
  path?: string
  handle?: FileSystemDirectoryHandle
  error?: string
}

/**
 * App settings stored in IndexedDB
 */
export interface AppSettings {
  /** Whether first-launch setup has been completed */
  firstLaunchCompleted: boolean
  /** Display path of the vault (for UI, not for access) */
  vaultPath?: string
  /** Vault name from config */
  vaultName?: string
}

// ============================================================================
// INDEXEDDB HANDLE STORAGE
// ============================================================================

const HANDLE_DB_NAME = 'quarry-vault-handles'
const HANDLE_STORE_NAME = 'handles'
const VAULT_HANDLE_KEY = 'vault-root'
const DB_VERSION = 1

/**
 * Open the IndexedDB database for handle storage
 */
function openHandleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HANDLE_DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error(`Failed to open handle database: ${request.error?.message}`))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(HANDLE_STORE_NAME)) {
        db.createObjectStore(HANDLE_STORE_NAME)
      }
    }
  })
}

/**
 * Store the vault directory handle in IndexedDB
 * This allows us to persist access across browser sessions
 */
export async function storeVaultHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openHandleDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HANDLE_STORE_NAME, 'readwrite')
    const store = transaction.objectStore(HANDLE_STORE_NAME)
    const request = store.put(handle, VAULT_HANDLE_KEY)

    request.onerror = () => {
      reject(new Error(`Failed to store vault handle: ${request.error?.message}`))
    }

    request.onsuccess = () => {
      resolve()
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

/**
 * Retrieve the stored vault directory handle from IndexedDB
 * Returns null if no handle is stored
 */
export async function getStoredVaultHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openHandleDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(HANDLE_STORE_NAME, 'readonly')
      const store = transaction.objectStore(HANDLE_STORE_NAME)
      const request = store.get(VAULT_HANDLE_KEY)

      request.onerror = () => {
        reject(new Error(`Failed to get vault handle: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch {
    return null
  }
}

/**
 * Clear the stored vault handle
 */
export async function clearVaultHandle(): Promise<void> {
  const db = await openHandleDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HANDLE_STORE_NAME, 'readwrite')
    const store = transaction.objectStore(HANDLE_STORE_NAME)
    const request = store.delete(VAULT_HANDLE_KEY)

    request.onerror = () => {
      reject(new Error(`Failed to clear vault handle: ${request.error?.message}`))
    }

    request.onsuccess = () => {
      resolve()
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

// ============================================================================
// PERMISSION HELPERS
// ============================================================================

/**
 * Check if we have permission to access the vault handle
 */
export async function checkVaultPermission(
  handle: FileSystemDirectoryHandle
): Promise<'granted' | 'denied' | 'prompt'> {
  try {
    // queryPermission is available on FileSystemHandle
    const permission = await (handle as any).queryPermission({ mode: 'readwrite' })
    return permission as 'granted' | 'denied' | 'prompt'
  } catch {
    return 'denied'
  }
}

/**
 * Request permission to access the vault handle
 * This MUST be called from a user gesture (click, etc.)
 */
export async function requestVaultPermission(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  try {
    const permission = await (handle as any).requestPermission({ mode: 'readwrite' })
    return permission === 'granted'
  } catch {
    return false
  }
}

// ============================================================================
// BROWSER SUPPORT CHECK
// ============================================================================

/**
 * Check if the File System Access API is supported
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/**
 * Get the default vault path suggestion based on platform
 */
export function getDefaultVaultPath(): string {
  // In browser context, we can't know the actual path
  // This is just for display purposes
  if (typeof navigator !== 'undefined') {
    const platform = navigator.platform?.toLowerCase() || ''
    if (platform.includes('win')) {
      return 'C:\\Users\\[You]\\Documents\\Quarry'
    } else if (platform.includes('mac')) {
      return '~/Documents/Quarry'
    } else {
      return '~/Documents/Quarry'
    }
  }
  return '~/Documents/Quarry'
}
