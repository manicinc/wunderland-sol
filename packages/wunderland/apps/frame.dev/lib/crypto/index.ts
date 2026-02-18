/**
 * E2EE Crypto Module
 *
 * End-to-End Encryption module for Frame.
 * Provides transparent encryption for local data storage.
 *
 * ## Usage
 *
 * ```typescript
 * import { encrypt, decrypt, isReady } from '@/lib/crypto'
 *
 * // Check if crypto is available
 * if (await isReady()) {
 *   // Encrypt any JSON-serializable data
 *   const result = await encrypt({ secret: 'data' })
 *   if (result.success) {
 *     // Store result.envelope
 *   }
 *
 *   // Decrypt back
 *   const decrypted = await decrypt(result.envelope)
 *   if (decrypted.success) {
 *     console.log(decrypted.data) // { secret: 'data' }
 *   }
 * }
 * ```
 *
 * ## Architecture
 *
 * - Uses AES-256-GCM for encryption (Web Crypto API)
 * - Auto-generates device encryption key on first use
 * - Device key stored in IndexedDB (wrapped by device fingerprint)
 * - Zero user interaction required for local encryption
 *
 * ## Future: Cloud Sync
 *
 * When cloud sync is enabled:
 * 1. User sets a passphrase
 * 2. Passphrase derives a master key (Argon2id)
 * 3. Device key is wrapped by master key
 * 4. Wrapped key syncs to server
 * 5. Other devices can unwrap with same passphrase
 *
 * @module lib/crypto
 */

// ============================================================================
// RE-EXPORTS
// ============================================================================

// Types
export type {
  EncryptedEnvelope,
  EncryptResult,
  EncryptError,
  DecryptResult,
  DecryptError,
  EncryptionResult,
  DecryptionResult,
  StoredDeviceKey,
  KeyDerivationParams,
  CryptoConfig,
} from './types'

export {
  DEFAULT_CRYPTO_CONFIG,
  isEncryptSuccess,
  isDecryptSuccess,
} from './types'

// Envelope (high-level API)
export {
  encryptToEnvelope,
  decryptFromEnvelope,
  encryptString,
  decryptToString,
  encryptBatch,
  decryptBatch,
  isEncryptedEnvelope,
  createEnvelope,
  serializeEnvelope,
  parseEnvelope,
} from './envelope'

// Device key management
export {
  getDeviceKey,
  getDeviceId,
  hasDeviceKey,
  clearDeviceKeyCache,
  deleteCurrentDeviceKey,
  regenerateDeviceKey,
} from './deviceKey'

// Low-level crypto (for advanced use)
export {
  encryptWithKey,
  decryptWithKey,
  decryptToStringWithKey,
  encryptWithPassphrase,
  decryptWithPassphrase,
  decryptToStringWithPassphrase,
  deriveKeyFromPassphrase,
  generateRandomKey,
  exportKey,
  importKey,
  randomBytes,
  randomId,
  constantTimeEqual,
} from './aesGcm'

// Encrypted storage adapter
export {
  EncryptedStorage,
  getEncryptedStorage,
  createEncryptedStorage,
  type EncryptedStorageOptions,
} from './encryptedStorage'

// Sync mode (stubs for now)
export {
  getSyncManager,
  initializeSyncMode,
  isSyncEnabled,
  getSyncConfig,
  type SyncModeStatus,
  type SyncConfig,
  type SyncDevice,
  type SyncOperation,
  type WrappedKeyBundle,
  DEFAULT_SYNC_CONFIG,
} from './syncMode'

// Configuration
export {
  getEncryptionStatus,
  loadEncryptionPreferences,
  saveEncryptionPreferences,
  resetEncryptionPreferences,
  getFeatureFlags,
  setFeatureFlags,
  isEncryptionEnabledFor,
  type EncryptionMode,
  type EncryptionStatus,
  type EncryptionPreferences,
  type EncryptionFeatureFlags,
  DEFAULT_ENCRYPTION_PREFERENCES,
  DEFAULT_FEATURE_FLAGS,
} from './config'

// React hooks
export {
  useEncryptionStatus,
  useEncryptionPreferences,
  useEncryptedStorage,
  useSyncMode,
  useEncryptedValue,
} from './hooks'

// ============================================================================
// CLOUD SYNC PREPARATION (Client-side, ready for future backend)
// ============================================================================

// Master key derivation (passphrase → key for cloud sync)
export {
  deriveMasterKey,
  wrapDEK,
  unwrapDEK,
  createWrappedDEKBundle,
  restoreDEKFromBundle,
  verifyPassphrase,
  changePassphrase,
  estimateDerivationTime,
  type Argon2Params,
  type MasterKeyResult,
  type WrappedDEKBundle as MasterKeyWrappedBundle,
  DEFAULT_ARGON2_PARAMS,
  LIGHTWEIGHT_ARGON2_PARAMS,
} from './masterKey'

// Recovery key (BIP39 mnemonic for account recovery)
export {
  generateRecoveryKey,
  validateMnemonic,
  mnemonicToEntropy,
  hashRecoveryKey,
  verifyRecoveryKey,
  createSecurityQuestion,
  verifySecurityAnswer,
  revealHint,
  createRecoveryData,
  formatMnemonic,
  parseMnemonic,
  type RecoveryKeyResult,
  type SecurityQuestion,
  type RecoveryData,
} from './recoveryKey'

// Key export/import (backup & device transfer)
export {
  exportDeviceKey,
  exportCryptoKey,
  importDeviceKey,
  validateBundle,
  serializeBundle,
  parseBundle,
  downloadBundle,
  readBundleFromFile,
  getSuggestedFilename,
  canEncodeAsQR,
  createCompactBundle,
  parseCompactBundle,
  type ExportedKeyBundle,
  type ExportOptions,
  type ImportResult,
} from './keyExport'

// ============================================================================
// CONVENIENCE ALIASES
// ============================================================================

import { encryptToEnvelope, decryptFromEnvelope } from './envelope'
import { hasDeviceKey, getDeviceKey } from './deviceKey'

/**
 * Encrypt data (alias for encryptToEnvelope)
 */
export const encrypt = encryptToEnvelope

/**
 * Decrypt data (alias for decryptFromEnvelope)
 */
export const decrypt = decryptFromEnvelope

/**
 * Check if the crypto module is ready for use
 *
 * Returns false if:
 * - Running server-side (no IndexedDB)
 * - Web Crypto API not available
 */
export async function isReady(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (typeof crypto === 'undefined' || !crypto.subtle) return false
  if (typeof indexedDB === 'undefined') return false

  try {
    // Try to get/create device key to verify everything works
    await getDeviceKey()
    return true
  } catch {
    return false
  }
}

/**
 * Check if encryption is enabled (device key exists)
 */
export async function isEncryptionEnabled(): Promise<boolean> {
  return hasDeviceKey()
}

/**
 * Initialize the crypto module
 *
 * Call this early in app startup to pre-warm the device key.
 * This is optional - the key will be created on first use anyway.
 */
export async function initialize(): Promise<boolean> {
  try {
    await getDeviceKey()
    return true
  } catch {
    return false
  }
}

// ============================================================================
// STATUS
// ============================================================================

/**
 * Get crypto module status
 */
export async function getStatus(): Promise<{
  available: boolean
  initialized: boolean
  deviceId: string | null
}> {
  const available = await isReady()

  if (!available) {
    return {
      available: false,
      initialized: false,
      deviceId: null,
    }
  }

  try {
    const { getDeviceId } = await import('./deviceKey')
    const deviceId = await getDeviceId()
    return {
      available: true,
      initialized: true,
      deviceId,
    }
  } catch {
    return {
      available: true,
      initialized: false,
      deviceId: null,
    }
  }
}
