/**
 * Envelope Encryption
 *
 * High-level API for encrypting/decrypting data records.
 * Wraps data in an EncryptedEnvelope with metadata.
 *
 * @module lib/crypto/envelope
 */

import { encryptWithKey, decryptToStringWithKey } from './aesGcm'
import { getDeviceKey } from './deviceKey'
import type {
  EncryptedEnvelope,
  EncryptionResult,
  DecryptionResult,
} from './types'

// ============================================================================
// ENVELOPE ENCRYPTION
// ============================================================================

/**
 * Encrypt any JSON-serializable data into an envelope
 *
 * @param data - The data to encrypt (will be JSON.stringified)
 * @param dataType - Optional type hint for the encrypted content
 * @returns EncryptionResult with success status and envelope or error
 */
export async function encryptToEnvelope<T>(
  data: T,
  dataType?: string
): Promise<EncryptionResult> {
  try {
    const key = await getDeviceKey()
    const jsonData = JSON.stringify(data)
    const ciphertext = await encryptWithKey(jsonData, key)

    const envelope: EncryptedEnvelope = {
      version: 1,
      ciphertext,
      encryptedAt: Date.now(),
      dataType,
    }

    return { success: true, envelope }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Encryption failed',
    }
  }
}

/**
 * Decrypt an envelope back to its original data
 *
 * @param envelope - The encrypted envelope
 * @returns DecryptionResult with success status and data or error
 */
export async function decryptFromEnvelope<T>(
  envelope: EncryptedEnvelope
): Promise<DecryptionResult<T>> {
  try {
    // Validate envelope version
    if (envelope.version !== 1) {
      return {
        success: false,
        error: `Unsupported envelope version: ${envelope.version}`,
      }
    }

    const key = await getDeviceKey()
    const jsonData = await decryptToStringWithKey(envelope.ciphertext, key)
    const data = JSON.parse(jsonData) as T

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Decryption failed',
    }
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Encrypt a string directly (no JSON serialization)
 */
export async function encryptString(text: string): Promise<EncryptionResult> {
  try {
    const key = await getDeviceKey()
    const ciphertext = await encryptWithKey(text, key)

    const envelope: EncryptedEnvelope = {
      version: 1,
      ciphertext,
      encryptedAt: Date.now(),
      dataType: 'string',
    }

    return { success: true, envelope }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Encryption failed',
    }
  }
}

/**
 * Decrypt an envelope to a string directly (no JSON parsing)
 */
export async function decryptToString(
  envelope: EncryptedEnvelope
): Promise<DecryptionResult<string>> {
  try {
    if (envelope.version !== 1) {
      return {
        success: false,
        error: `Unsupported envelope version: ${envelope.version}`,
      }
    }

    const key = await getDeviceKey()
    const text = await decryptToStringWithKey(envelope.ciphertext, key)

    return { success: true, data: text }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Decryption failed',
    }
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Encrypt multiple items in parallel
 */
export async function encryptBatch<T>(
  items: T[],
  dataType?: string
): Promise<EncryptionResult[]> {
  return Promise.all(items.map(item => encryptToEnvelope(item, dataType)))
}

/**
 * Decrypt multiple envelopes in parallel
 */
export async function decryptBatch<T>(
  envelopes: EncryptedEnvelope[]
): Promise<DecryptionResult<T>[]> {
  return Promise.all(envelopes.map(env => decryptFromEnvelope<T>(env)))
}

// ============================================================================
// ENVELOPE UTILITIES
// ============================================================================

/**
 * Check if a value is an encrypted envelope
 */
export function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  if (typeof value !== 'object' || value === null) return false

  const obj = value as Record<string, unknown>
  return (
    obj.version === 1 &&
    typeof obj.ciphertext === 'string' &&
    typeof obj.encryptedAt === 'number'
  )
}

/**
 * Create an envelope from raw ciphertext (for migration)
 */
export function createEnvelope(
  ciphertext: string,
  dataType?: string
): EncryptedEnvelope {
  return {
    version: 1,
    ciphertext,
    encryptedAt: Date.now(),
    dataType,
  }
}

/**
 * Serialize an envelope to a string for storage
 */
export function serializeEnvelope(envelope: EncryptedEnvelope): string {
  return JSON.stringify(envelope)
}

/**
 * Parse an envelope from a string
 */
export function parseEnvelope(serialized: string): EncryptedEnvelope | null {
  try {
    const parsed = JSON.parse(serialized)
    if (isEncryptedEnvelope(parsed)) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}
