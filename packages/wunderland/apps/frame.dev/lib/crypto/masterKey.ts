/**
 * Master Key Derivation
 *
 * Derives a master encryption key from a user passphrase using Argon2id.
 * The master key is used to wrap/unwrap the device encryption key (DEK)
 * for cross-device sync.
 *
 * Security:
 * - Argon2id is memory-hard, resistant to GPU/ASIC attacks
 * - Parameters chosen for ~1 second derivation on modern hardware
 * - Salt is random per account, stored with wrapped key
 *
 * @module lib/crypto/masterKey
 */

import { randomBytes, encryptWithKey, decryptWithKey, importKey, exportKey } from './aesGcm'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Argon2id parameters for key derivation
 */
export interface Argon2Params {
  /** Time cost (iterations) */
  timeCost: number
  /** Memory cost in KB */
  memoryCost: number
  /** Parallelism (threads) */
  parallelism: number
  /** Output key length in bytes */
  keyLength: number
}

/**
 * Default Argon2id parameters
 * Balanced for security and browser performance
 */
export const DEFAULT_ARGON2_PARAMS: Argon2Params = {
  timeCost: 3,
  memoryCost: 65536, // 64MB
  parallelism: 4,
  keyLength: 32, // 256 bits
}

/**
 * Lightweight Argon2id parameters for mobile/low-memory devices
 */
export const LIGHTWEIGHT_ARGON2_PARAMS: Argon2Params = {
  timeCost: 4,
  memoryCost: 16384, // 16MB
  parallelism: 2,
  keyLength: 32,
}

/**
 * Result of master key derivation
 */
export interface MasterKeyResult {
  /** The derived master key */
  key: CryptoKey
  /** Salt used for derivation (store with wrapped DEK) */
  salt: Uint8Array
  /** Parameters used (for verification on other devices) */
  params: Argon2Params
}

/**
 * Wrapped DEK bundle for cloud storage
 */
export interface WrappedDEKBundle {
  /** Version of the bundle format */
  version: 1
  /** Salt used for master key derivation */
  salt: string
  /** DEK encrypted by master key */
  wrappedDek: string
  /** Argon2 parameters used */
  params: Argon2Params
  /** When the bundle was created */
  createdAt: number
  /** DEK version for rotation tracking */
  dekVersion: number
}

// ============================================================================
// ARGON2ID IMPLEMENTATION
// ============================================================================

/**
 * Check if Web Crypto PBKDF2 is available (fallback)
 */
function hasWebCrypto(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined'
}

/**
 * Derive key using PBKDF2 (Web Crypto fallback)
 * 
 * Note: PBKDF2 is less secure than Argon2id but works in all browsers.
 * We use high iteration count to compensate.
 */
async function deriveKeyPBKDF2(
  passphrase: string,
  salt: Uint8Array,
  iterations: number = 600000 // OWASP 2023 recommendation
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    true, // extractable for wrapping
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  )
}

/**
 * Derive key using Argon2id (via WASM)
 * 
 * Falls back to PBKDF2 if Argon2 is not available.
 */
async function deriveKeyArgon2(
  passphrase: string,
  salt: Uint8Array,
  params: Argon2Params = DEFAULT_ARGON2_PARAMS
): Promise<CryptoKey> {
  // Try to use argon2-browser WASM if available
  try {
    // Dynamic import with webpackIgnore to avoid bundling if not installed
    // @ts-expect-error - optional dependency, may not be installed
    const argon2 = await import(/* webpackIgnore: true */ 'argon2-browser')
    
    const result = await argon2.hash({
      pass: passphrase,
      salt,
      time: params.timeCost,
      mem: params.memoryCost,
      parallelism: params.parallelism,
      hashLen: params.keyLength,
      type: argon2.ArgonType.Argon2id,
    })

    // Import the derived bytes as an AES key
    return crypto.subtle.importKey(
      'raw',
      result.hash,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    )
  } catch {
    // Argon2 not available, fall back to PBKDF2
    console.warn('[masterKey] Argon2 not available, using PBKDF2 fallback')
    return deriveKeyPBKDF2(passphrase, salt)
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Derive a master key from a passphrase
 * 
 * @param passphrase - User's passphrase (should be strong)
 * @param existingSalt - Existing salt (for re-deriving on another device)
 * @param params - Argon2 parameters (use existing for compatibility)
 * @returns Master key result with key, salt, and params
 * 
 * @example
 * ```typescript
 * // First device - generate new salt
 * const result = await deriveMasterKey('my-secure-passphrase')
 * // Store result.salt and result.params with wrapped DEK
 * 
 * // Other device - use existing salt
 * const result2 = await deriveMasterKey('my-secure-passphrase', storedSalt, storedParams)
 * // result2.key can unwrap the DEK
 * ```
 */
export async function deriveMasterKey(
  passphrase: string,
  existingSalt?: Uint8Array,
  params: Argon2Params = DEFAULT_ARGON2_PARAMS
): Promise<MasterKeyResult> {
  if (!hasWebCrypto()) {
    throw new Error('Web Crypto API not available')
  }

  if (!passphrase || passphrase.length < 8) {
    throw new Error('Passphrase must be at least 8 characters')
  }

  // Use existing salt or generate new one
  const salt = existingSalt || randomBytes(16)

  // Derive the master key
  const key = await deriveKeyArgon2(passphrase, salt, params)

  return { key, salt, params }
}

/**
 * Wrap (encrypt) a device encryption key with the master key
 * 
 * @param dek - Device encryption key to wrap
 * @param masterKey - Master key derived from passphrase
 * @returns Wrapped DEK as base64 string
 */
export async function wrapDEK(
  dek: CryptoKey,
  masterKey: CryptoKey
): Promise<string> {
  // Export DEK to raw bytes
  const dekBytes = await exportKey(dek)
  
  // Encrypt with master key
  const wrapped = await encryptWithKey(dekBytes, masterKey)
  
  return wrapped
}

/**
 * Unwrap (decrypt) a device encryption key with the master key
 * 
 * @param wrappedDek - Wrapped DEK from wrapDEK()
 * @param masterKey - Master key derived from same passphrase
 * @returns Unwrapped device encryption key
 */
export async function unwrapDEK(
  wrappedDek: string,
  masterKey: CryptoKey
): Promise<CryptoKey> {
  // Decrypt with master key
  const dekBytes = await decryptWithKey(wrappedDek, masterKey)
  
  // Import as AES key
  return importKey(dekBytes, true)
}

/**
 * Create a wrapped DEK bundle for cloud storage
 * 
 * @param dek - Device encryption key
 * @param passphrase - User's passphrase
 * @param dekVersion - Version number for key rotation
 * @returns Bundle ready for upload to server
 */
export async function createWrappedDEKBundle(
  dek: CryptoKey,
  passphrase: string,
  dekVersion: number = 1
): Promise<WrappedDEKBundle> {
  // Derive master key with new salt
  const { key: masterKey, salt, params } = await deriveMasterKey(passphrase)
  
  // Wrap DEK
  const wrappedDek = await wrapDEK(dek, masterKey)
  
  // Create bundle
  return {
    version: 1,
    salt: btoa(String.fromCharCode(...Array.from(salt))),
    wrappedDek,
    params,
    createdAt: Date.now(),
    dekVersion,
  }
}

/**
 * Restore DEK from a wrapped bundle
 * 
 * @param bundle - Wrapped DEK bundle from server
 * @param passphrase - User's passphrase
 * @returns Unwrapped device encryption key
 */
export async function restoreDEKFromBundle(
  bundle: WrappedDEKBundle,
  passphrase: string
): Promise<CryptoKey> {
  // Decode salt
  const salt = Uint8Array.from(atob(bundle.salt), c => c.charCodeAt(0))
  
  // Derive master key with same salt and params
  const { key: masterKey } = await deriveMasterKey(passphrase, salt, bundle.params)
  
  // Unwrap DEK
  return unwrapDEK(bundle.wrappedDek, masterKey)
}

/**
 * Verify a passphrase against a wrapped bundle
 * 
 * @param bundle - Wrapped DEK bundle
 * @param passphrase - Passphrase to verify
 * @returns True if passphrase is correct
 */
export async function verifyPassphrase(
  bundle: WrappedDEKBundle,
  passphrase: string
): Promise<boolean> {
  try {
    await restoreDEKFromBundle(bundle, passphrase)
    return true
  } catch {
    return false
  }
}

/**
 * Change passphrase by re-wrapping DEK with new passphrase
 * 
 * @param bundle - Current wrapped bundle
 * @param currentPassphrase - Current passphrase
 * @param newPassphrase - New passphrase
 * @returns New bundle with DEK wrapped by new passphrase
 */
export async function changePassphrase(
  bundle: WrappedDEKBundle,
  currentPassphrase: string,
  newPassphrase: string
): Promise<WrappedDEKBundle> {
  // Unwrap with current passphrase
  const dek = await restoreDEKFromBundle(bundle, currentPassphrase)
  
  // Create new bundle with new passphrase
  return createWrappedDEKBundle(dek, newPassphrase, bundle.dekVersion)
}

/**
 * Estimate derivation time for given parameters
 * Useful for UI progress indication
 */
export function estimateDerivationTime(params: Argon2Params): number {
  // Rough estimate: ~100ms per iteration per MB memory
  const estimatedMs = params.timeCost * (params.memoryCost / 1024) * 10
  return Math.max(500, Math.min(estimatedMs, 5000)) // Clamp 0.5s - 5s
}

