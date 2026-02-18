/**
 * Key Export/Import
 *
 * Allows exporting device encryption keys to a password-protected file
 * for backup or transfer to another device.
 *
 * Security:
 * - Keys are wrapped with user-provided export password
 * - PBKDF2 with high iteration count for password derivation
 * - HMAC checksum for integrity verification
 * - File format includes version for future compatibility
 *
 * @module lib/crypto/keyExport
 */

import {
  randomBytes,
  randomId,
  encryptWithPassphrase,
  decryptToStringWithPassphrase,
  exportKey,
  importKey,
} from './aesGcm'
import { getDeviceKey, getDeviceId } from './deviceKey'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Exported key bundle format
 */
export interface ExportedKeyBundle {
  /** Format version */
  version: 1
  /** Type of export */
  type: 'device-key' | 'master-key' | 'full-backup'
  /** Device ID that created this export */
  deviceId: string
  /** Human-readable device name (optional) */
  deviceName?: string
  /** Salt for password derivation (base64) */
  salt: string
  /** Encrypted key data (base64) */
  encryptedData: string
  /** HMAC checksum for integrity (hex) */
  checksum: string
  /** When exported */
  exportedAt: number
  /** Export expiration (optional, for time-limited transfers) */
  expiresAt?: number
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Export options
 */
export interface ExportOptions {
  /** Export password (required, min 8 chars) */
  password: string
  /** Human-readable device name */
  deviceName?: string
  /** Expiration time in hours (0 = no expiration) */
  expiresInHours?: number
  /** Additional metadata to include */
  metadata?: Record<string, unknown>
}

/**
 * Import result
 */
export interface ImportResult {
  /** Whether import succeeded */
  success: boolean
  /** Imported key (if successful) */
  key?: CryptoKey
  /** Device ID from export */
  deviceId?: string
  /** Export metadata */
  metadata?: Record<string, unknown>
  /** Error message (if failed) */
  error?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const EXPORT_FILE_EXTENSION = '.quarry-key'
const EXPORT_MIME_TYPE = 'application/json'
const PBKDF2_ITERATIONS = 600000 // OWASP 2023 recommendation
const CHECKSUM_KEY = 'quarry-key-export-v1'

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Calculate HMAC checksum for integrity verification
 */
async function calculateChecksum(data: string, password: string): Promise<string> {
  const encoder = new TextEncoder()
  
  // Import password as key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password + CHECKSUM_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  // Sign data
  const signature = await crypto.subtle.sign(
    'HMAC',
    keyMaterial,
    encoder.encode(data)
  )
  
  // Convert to hex
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Verify HMAC checksum
 */
async function verifyChecksum(
  data: string,
  checksum: string,
  password: string
): Promise<boolean> {
  const calculated = await calculateChecksum(data, password)
  return calculated === checksum
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export device encryption key to password-protected bundle
 * 
 * @param options - Export options including password
 * @returns Exportable key bundle
 * 
 * @example
 * ```typescript
 * const bundle = await exportDeviceKey({
 *   password: 'export-password-123',
 *   deviceName: 'MacBook Pro',
 *   expiresInHours: 24,
 * })
 * 
 * // Save to file
 * downloadKeyBundle(bundle, 'my-backup.quarry-key')
 * ```
 */
export async function exportDeviceKey(
  options: ExportOptions
): Promise<ExportedKeyBundle> {
  if (!options.password || options.password.length < 8) {
    throw new Error('Export password must be at least 8 characters')
  }

  // Get device key and ID
  const deviceKey = await getDeviceKey()
  const deviceId = await getDeviceId()
  
  // Export key to raw bytes
  const keyBytes = await exportKey(deviceKey)
  const keyB64 = btoa(String.fromCharCode(...Array.from(keyBytes)))
  
  // Create payload
  const payload = JSON.stringify({
    key: keyB64,
    algorithm: 'AES-GCM-256',
  })
  
  // Generate salt for password derivation
  const salt = randomBytes(16)
  const saltB64 = btoa(String.fromCharCode(...Array.from(salt)))
  
  // Encrypt with password
  const encryptedData = await encryptWithPassphrase(
    payload,
    options.password,
    PBKDF2_ITERATIONS
  )
  
  // Calculate checksum
  const checksumData = `${saltB64}:${encryptedData}`
  const checksum = await calculateChecksum(checksumData, options.password)
  
  // Build bundle
  const bundle: ExportedKeyBundle = {
    version: 1,
    type: 'device-key',
    deviceId,
    deviceName: options.deviceName,
    salt: saltB64,
    encryptedData,
    checksum,
    exportedAt: Date.now(),
    metadata: options.metadata,
  }
  
  // Add expiration if specified
  if (options.expiresInHours && options.expiresInHours > 0) {
    bundle.expiresAt = Date.now() + options.expiresInHours * 60 * 60 * 1000
  }
  
  return bundle
}

/**
 * Export key as CryptoKey (for custom encryption)
 * 
 * @param key - CryptoKey to export
 * @param password - Export password
 * @returns Exported bundle
 */
export async function exportCryptoKey(
  key: CryptoKey,
  password: string,
  type: 'device-key' | 'master-key' = 'device-key'
): Promise<ExportedKeyBundle> {
  if (!password || password.length < 8) {
    throw new Error('Export password must be at least 8 characters')
  }

  // Export key to raw bytes
  const keyBytes = await exportKey(key)
  const keyB64 = btoa(String.fromCharCode(...Array.from(keyBytes)))
  
  // Create payload
  const payload = JSON.stringify({
    key: keyB64,
    algorithm: 'AES-GCM-256',
  })
  
  // Generate salt
  const salt = randomBytes(16)
  const saltB64 = btoa(String.fromCharCode(...Array.from(salt)))
  
  // Encrypt with password
  const encryptedData = await encryptWithPassphrase(
    payload,
    password,
    PBKDF2_ITERATIONS
  )
  
  // Calculate checksum
  const checksumData = `${saltB64}:${encryptedData}`
  const checksum = await calculateChecksum(checksumData, password)
  
  return {
    version: 1,
    type,
    deviceId: randomId(16),
    salt: saltB64,
    encryptedData,
    checksum,
    exportedAt: Date.now(),
  }
}

// ============================================================================
// IMPORT FUNCTIONS
// ============================================================================

/**
 * Import device encryption key from bundle
 * 
 * @param bundle - Exported key bundle
 * @param password - Export password
 * @returns Import result with key if successful
 * 
 * @example
 * ```typescript
 * const bundle = await loadKeyBundle(file)
 * const result = await importDeviceKey(bundle, 'export-password-123')
 * 
 * if (result.success) {
 *   // Store imported key as device key
 *   await storeImportedKey(result.key)
 * }
 * ```
 */
export async function importDeviceKey(
  bundle: ExportedKeyBundle,
  password: string
): Promise<ImportResult> {
  try {
    // Validate bundle
    if (!bundle || bundle.version !== 1) {
      return { success: false, error: 'Invalid or unsupported bundle format' }
    }
    
    // Check expiration
    if (bundle.expiresAt && Date.now() > bundle.expiresAt) {
      return { success: false, error: 'Export has expired' }
    }
    
    // Verify checksum
    const checksumData = `${bundle.salt}:${bundle.encryptedData}`
    const isValid = await verifyChecksum(checksumData, bundle.checksum, password)
    
    if (!isValid) {
      return { success: false, error: 'Invalid password or corrupted data' }
    }
    
    // Decrypt payload
    const payloadJson = await decryptToStringWithPassphrase(
      bundle.encryptedData,
      password,
      PBKDF2_ITERATIONS
    )
    
    const payload = JSON.parse(payloadJson)
    
    // Import key
    const keyBytes = Uint8Array.from(atob(payload.key), c => c.charCodeAt(0))
    const key = await importKey(keyBytes, true)
    
    return {
      success: true,
      key,
      deviceId: bundle.deviceId,
      metadata: bundle.metadata,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to import key',
    }
  }
}

/**
 * Validate a bundle without importing
 * 
 * @param bundle - Bundle to validate
 * @returns Validation result
 */
export function validateBundle(bundle: unknown): {
  valid: boolean
  error?: string
  bundle?: ExportedKeyBundle
} {
  try {
    if (!bundle || typeof bundle !== 'object') {
      return { valid: false, error: 'Invalid bundle format' }
    }
    
    const b = bundle as ExportedKeyBundle
    
    if (b.version !== 1) {
      return { valid: false, error: 'Unsupported bundle version' }
    }
    
    if (!b.salt || !b.encryptedData || !b.checksum) {
      return { valid: false, error: 'Missing required fields' }
    }
    
    if (b.expiresAt && Date.now() > b.expiresAt) {
      return { valid: false, error: 'Export has expired' }
    }
    
    return { valid: true, bundle: b }
  } catch {
    return { valid: false, error: 'Invalid bundle' }
  }
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * Serialize bundle for file download
 */
export function serializeBundle(bundle: ExportedKeyBundle): string {
  return JSON.stringify(bundle, null, 2)
}

/**
 * Parse bundle from file content
 */
export function parseBundle(content: string): ExportedKeyBundle {
  const parsed = JSON.parse(content)
  const validation = validateBundle(parsed)
  
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid bundle')
  }
  
  return validation.bundle!
}

/**
 * Download key bundle as file
 * 
 * @param bundle - Bundle to download
 * @param filename - Filename (without extension)
 */
export function downloadBundle(
  bundle: ExportedKeyBundle,
  filename: string = 'quarry-key-backup'
): void {
  const content = serializeBundle(bundle)
  const blob = new Blob([content], { type: EXPORT_MIME_TYPE })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith(EXPORT_FILE_EXTENSION)
    ? filename
    : `${filename}${EXPORT_FILE_EXTENSION}`
  
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  
  URL.revokeObjectURL(url)
}

/**
 * Read bundle from file
 * 
 * @param file - File to read
 * @returns Parsed bundle
 */
export async function readBundleFromFile(file: File): Promise<ExportedKeyBundle> {
  const content = await file.text()
  return parseBundle(content)
}

/**
 * Get suggested filename for export
 */
export function getSuggestedFilename(deviceName?: string): string {
  const date = new Date().toISOString().split('T')[0]
  const name = deviceName
    ? deviceName.toLowerCase().replace(/[^a-z0-9]/g, '-')
    : 'backup'
  return `quarry-key-${name}-${date}${EXPORT_FILE_EXTENSION}`
}

// ============================================================================
// QR CODE (for easy mobile transfer)
// ============================================================================

/**
 * Check if bundle is small enough for QR code
 * QR codes can hold ~4000 bytes max
 */
export function canEncodeAsQR(bundle: ExportedKeyBundle): boolean {
  const serialized = serializeBundle(bundle)
  return serialized.length < 2500 // Leave margin for QR overhead
}

/**
 * Create a compact bundle for QR encoding
 * Removes optional fields to reduce size
 */
export function createCompactBundle(bundle: ExportedKeyBundle): string {
  const compact = {
    v: bundle.version,
    t: bundle.type,
    d: bundle.deviceId,
    s: bundle.salt,
    e: bundle.encryptedData,
    c: bundle.checksum,
    x: bundle.expiresAt,
  }
  return JSON.stringify(compact)
}

/**
 * Parse compact bundle from QR code
 */
export function parseCompactBundle(data: string): ExportedKeyBundle {
  const compact = JSON.parse(data)
  return {
    version: compact.v,
    type: compact.t,
    deviceId: compact.d,
    salt: compact.s,
    encryptedData: compact.e,
    checksum: compact.c,
    expiresAt: compact.x,
    exportedAt: Date.now(),
  }
}

