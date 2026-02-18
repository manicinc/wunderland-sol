/**
 * GitHub PAT Storage - Encrypted client-side storage
 * @module github/patStorage
 * 
 * @remarks
 * Securely stores GitHub Personal Access Tokens in localStorage
 * using AES-256-GCM encryption. PATs are never sent to servers.
 */

/**
 * Encryption key derivation from a passphrase
 */
async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('quarry-codex-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a PAT
 */
async function encryptPAT(pat: string, passphrase: string): Promise<string> {
  const key = await deriveKey(passphrase)
  const encoder = new TextEncoder()
  const data = encoder.encode(pat)
  
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)

  // Base64 encode
  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt a PAT
 */
async function decryptPAT(encryptedPAT: string, passphrase: string): Promise<string> {
  const key = await deriveKey(passphrase)
  
  // Base64 decode
  const combined = new Uint8Array(
    atob(encryptedPAT).split('').map(char => char.charCodeAt(0))
  )

  // Extract IV and encrypted data
  const iv = combined.slice(0, 12)
  const encrypted = combined.slice(12)

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch {
    throw new Error('Failed to decrypt PAT. Invalid passphrase or corrupted data.')
  }
}

/**
 * Storage key for encrypted PAT
 */
const PAT_STORAGE_KEY = 'quarry-codex-gh-pat'

/**
 * Default passphrase (in production, this should be user-provided)
 * For now, using a static passphrase for simplicity
 */
const DEFAULT_PASSPHRASE = 'quarry-codex-2024'

/**
 * Save PAT to localStorage (encrypted)
 */
export async function savePAT(pat: string): Promise<void> {
  if (!pat) {
    localStorage.removeItem(PAT_STORAGE_KEY)
    return
  }

  try {
    const encrypted = await encryptPAT(pat, DEFAULT_PASSPHRASE)
    localStorage.setItem(PAT_STORAGE_KEY, encrypted)
  } catch (error) {
    console.error('Failed to save PAT:', error)
    throw new Error('Failed to save GitHub token')
  }
}

/**
 * Get decrypted PAT from localStorage
 */
export async function getDecryptedPAT(): Promise<string | null> {
  const encrypted = localStorage.getItem(PAT_STORAGE_KEY)
  if (!encrypted) return null

  try {
    return await decryptPAT(encrypted, DEFAULT_PASSPHRASE)
  } catch (error) {
    console.error('Failed to decrypt PAT:', error)
    // Remove corrupted data
    localStorage.removeItem(PAT_STORAGE_KEY)
    return null
  }
}

/**
 * Clear stored PAT
 */
export function clearPAT(): void {
  localStorage.removeItem(PAT_STORAGE_KEY)
}

/**
 * Check if PAT is stored
 */
export function hasPAT(): boolean {
  return localStorage.getItem(PAT_STORAGE_KEY) !== null
}
