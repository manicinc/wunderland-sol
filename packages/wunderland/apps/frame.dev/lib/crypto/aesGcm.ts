/**
 * AES-256-GCM Encryption
 *
 * Core encryption/decryption functions using Web Crypto API.
 * Uses AES-256-GCM which provides both confidentiality and authenticity.
 *
 * @module lib/crypto/aesGcm
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Salt length in bytes (128 bits) */
const SALT_LENGTH = 16

/** IV length in bytes (96 bits, recommended for GCM) */
const IV_LENGTH = 12

/** Key length in bits (256 bits for AES-256) */
const KEY_LENGTH = 256

/** Default PBKDF2 iteration count */
const DEFAULT_ITERATIONS = 100000

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert Uint8Array to ArrayBuffer for Web Crypto API compatibility
 * This handles stricter TypeScript typing where Uint8Array's buffer
 * property is typed as ArrayBufferLike instead of ArrayBuffer
 */
function toBuffer(arr: Uint8Array): ArrayBuffer {
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer
}

// ============================================================================
// LOW-LEVEL CRYPTO FUNCTIONS
// ============================================================================

/**
 * Derive an AES-256 key from a passphrase using PBKDF2
 */
export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array,
  iterations: number = DEFAULT_ITERATIONS,
  usage: KeyUsage[] = ['encrypt', 'decrypt']
): Promise<CryptoKey> {
  const encoder = new TextEncoder()

  // Import passphrase as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    toBuffer(encoder.encode(passphrase)),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )

  // Derive AES-256 key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toBuffer(salt),
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false, // not extractable for security
    usage
  )
}

/**
 * Generate a random AES-256 key
 */
export async function generateRandomKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: KEY_LENGTH },
    true, // extractable so we can wrap/store it
    ['encrypt', 'decrypt']
  )
}

/**
 * Export a CryptoKey to raw bytes
 */
export async function exportKey(key: CryptoKey): Promise<Uint8Array> {
  const exported = await crypto.subtle.exportKey('raw', key)
  return new Uint8Array(exported)
}

/**
 * Import raw bytes as a CryptoKey
 */
export async function importKey(
  keyBytes: Uint8Array,
  extractable: boolean = false
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    toBuffer(keyBytes),
    { name: 'AES-GCM', length: KEY_LENGTH },
    extractable,
    ['encrypt', 'decrypt']
  )
}

// ============================================================================
// ENCRYPT/DECRYPT WITH KEY
// ============================================================================

/**
 * Encrypt data using an AES-256-GCM key
 *
 * @param data - The data to encrypt (string or Uint8Array)
 * @param key - The AES-256-GCM CryptoKey
 * @returns Base64-encoded string: IV (12 bytes) + ciphertext + auth tag
 */
export async function encryptWithKey(
  data: string | Uint8Array,
  key: CryptoKey
): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toBuffer(iv) },
    key,
    toBuffer(dataBuffer)
  )

  // Combine IV + ciphertext (auth tag is appended by GCM)
  const combined = new Uint8Array(IV_LENGTH + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), IV_LENGTH)

  // Return as base64
  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt data using an AES-256-GCM key
 *
 * @param ciphertext - Base64-encoded string: IV (12 bytes) + ciphertext + auth tag
 * @param key - The AES-256-GCM CryptoKey
 * @returns Decrypted data as Uint8Array
 * @throws Error if decryption fails (e.g., wrong key, tampered data)
 */
export async function decryptWithKey(
  ciphertext: string,
  key: CryptoKey
): Promise<Uint8Array> {
  // Decode base64
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))

  // Extract IV and encrypted data
  const iv = combined.slice(0, IV_LENGTH)
  const encryptedData = combined.slice(IV_LENGTH)

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toBuffer(iv) },
    key,
    toBuffer(encryptedData)
  )

  return new Uint8Array(decrypted)
}

/**
 * Decrypt data to a string using an AES-256-GCM key
 */
export async function decryptToStringWithKey(
  ciphertext: string,
  key: CryptoKey
): Promise<string> {
  const decrypted = await decryptWithKey(ciphertext, key)
  return new TextDecoder().decode(decrypted)
}

// ============================================================================
// ENCRYPT/DECRYPT WITH PASSPHRASE (includes salt)
// ============================================================================

/**
 * Encrypt data using a passphrase
 *
 * Derives a key using PBKDF2 with a random salt.
 *
 * @param data - The data to encrypt
 * @param passphrase - The passphrase to derive the key from
 * @param iterations - PBKDF2 iteration count
 * @returns Base64-encoded string: salt (16 bytes) + IV (12 bytes) + ciphertext + auth tag
 */
export async function encryptWithPassphrase(
  data: string | Uint8Array,
  passphrase: string,
  iterations: number = DEFAULT_ITERATIONS
): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

  // Derive key from passphrase
  const key = await deriveKeyFromPassphrase(passphrase, salt, iterations, ['encrypt'])

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toBuffer(iv) },
    key,
    toBuffer(dataBuffer)
  )

  // Combine salt + IV + ciphertext
  const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + encrypted.byteLength)
  combined.set(salt, 0)
  combined.set(iv, SALT_LENGTH)
  combined.set(new Uint8Array(encrypted), SALT_LENGTH + IV_LENGTH)

  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt data using a passphrase
 *
 * @param ciphertext - Base64-encoded string from encryptWithPassphrase
 * @param passphrase - The passphrase used to encrypt
 * @param iterations - PBKDF2 iteration count (must match encryption)
 * @returns Decrypted data as Uint8Array
 * @throws Error if decryption fails
 */
export async function decryptWithPassphrase(
  ciphertext: string,
  passphrase: string,
  iterations: number = DEFAULT_ITERATIONS
): Promise<Uint8Array> {
  // Decode base64
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))

  // Extract salt, IV, and encrypted data
  const salt = combined.slice(0, SALT_LENGTH)
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const encryptedData = combined.slice(SALT_LENGTH + IV_LENGTH)

  // Derive key from passphrase
  const key = await deriveKeyFromPassphrase(passphrase, salt, iterations, ['decrypt'])

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toBuffer(iv) },
    key,
    toBuffer(encryptedData)
  )

  return new Uint8Array(decrypted)
}

/**
 * Decrypt data to a string using a passphrase
 */
export async function decryptToStringWithPassphrase(
  ciphertext: string,
  passphrase: string,
  iterations: number = DEFAULT_ITERATIONS
): Promise<string> {
  const decrypted = await decryptWithPassphrase(ciphertext, passphrase, iterations)
  return new TextDecoder().decode(decrypted)
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate random bytes
 */
export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

/**
 * Generate a random ID (hex string)
 */
export function randomId(bytes: number = 16): string {
  const arr = randomBytes(bytes)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Constant-time comparison of two byte arrays
 * Prevents timing attacks when comparing secrets
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i]
  }

  return result === 0
}
