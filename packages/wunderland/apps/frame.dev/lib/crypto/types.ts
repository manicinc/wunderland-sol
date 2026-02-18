/**
 * Crypto Module Types
 *
 * Type definitions for the E2EE crypto module.
 *
 * @module lib/crypto/types
 */

// ============================================================================
// ENCRYPTED DATA TYPES
// ============================================================================

/**
 * Encrypted envelope containing encrypted data with metadata
 */
export interface EncryptedEnvelope {
  /** Version of the encryption format */
  version: 1
  /** Base64-encoded encrypted data (salt + iv + ciphertext) */
  ciphertext: string
  /** Timestamp when encrypted */
  encryptedAt: number
  /** Data type hint for the encrypted content */
  dataType?: string
}

/**
 * Result of an encryption operation
 */
export interface EncryptResult {
  /** Whether encryption succeeded */
  success: true
  /** The encrypted envelope */
  envelope: EncryptedEnvelope
}

/**
 * Result of a failed encryption operation
 */
export interface EncryptError {
  /** Whether encryption succeeded */
  success: false
  /** Error message */
  error: string
}

/**
 * Result of a decryption operation
 */
export interface DecryptResult<T = unknown> {
  /** Whether decryption succeeded */
  success: true
  /** The decrypted data */
  data: T
}

/**
 * Result of a failed decryption operation
 */
export interface DecryptError {
  /** Whether decryption succeeded */
  success: false
  /** Error message */
  error: string
}

// ============================================================================
// KEY TYPES
// ============================================================================

/**
 * Device encryption key stored in IndexedDB
 */
export interface StoredDeviceKey {
  /** Unique identifier for this device */
  deviceId: string
  /** Base64-encoded wrapped key (encrypted by device fingerprint) */
  wrappedKey: string
  /** When the key was generated */
  createdAt: number
  /** Version of the key format */
  version: 1
}

/**
 * Key derivation parameters for passphrase-based encryption (future use)
 */
export interface KeyDerivationParams {
  /** Algorithm used (pbkdf2 or argon2id) */
  algorithm: 'pbkdf2' | 'argon2id'
  /** Salt for key derivation */
  salt: Uint8Array
  /** Iteration count (PBKDF2) or time cost (Argon2id) */
  iterations: number
  /** Memory cost in KB (Argon2id only) */
  memoryCost?: number
}

// ============================================================================
// CRYPTO CONFIGURATION
// ============================================================================

/**
 * Configuration for the crypto module
 */
export interface CryptoConfig {
  /** Storage key for device key in IndexedDB */
  deviceKeyStorageKey: string
  /** PBKDF2 iteration count for device fingerprint encryption */
  pbkdf2Iterations: number
}

/**
 * Default crypto configuration
 */
export const DEFAULT_CRYPTO_CONFIG: CryptoConfig = {
  deviceKeyStorageKey: 'frame-e2ee-device-key',
  pbkdf2Iterations: 100000,
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Union type for encryption results
 */
export type EncryptionResult = EncryptResult | EncryptError

/**
 * Union type for decryption results
 */
export type DecryptionResult<T = unknown> = DecryptResult<T> | DecryptError

/**
 * Type guard for successful encryption
 */
export function isEncryptSuccess(result: EncryptionResult): result is EncryptResult {
  return result.success === true
}

/**
 * Type guard for successful decryption
 */
export function isDecryptSuccess<T>(result: DecryptionResult<T>): result is DecryptResult<T> {
  return result.success === true
}
