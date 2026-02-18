/**
 * Recovery Key Management
 *
 * Generates and verifies recovery keys using BIP39 mnemonics.
 * Recovery keys allow account restoration if passphrase is forgotten.
 *
 * Security:
 * - 256-bit entropy encoded as 24-word mnemonic
 * - Recovery key can restore master key or reset account
 * - Security questions provide additional recovery path
 *
 * @module lib/crypto/recoveryKey
 */

import { randomBytes, encryptWithPassphrase, decryptToStringWithPassphrase } from './aesGcm'

// ============================================================================
// BIP39 WORDLIST (English, 2048 words)
// ============================================================================

// Abbreviated for bundle size - full list loaded dynamically
const BIP39_WORDLIST_SAMPLE = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
  'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
  // ... full list loaded from external source
]

let fullWordlist: string[] | null = null

/**
 * Load full BIP39 wordlist
 */
async function loadWordlist(): Promise<string[]> {
  if (fullWordlist) return fullWordlist

  try {
    // Try to import from bip39 package with webpackIgnore to avoid bundling if not installed
    // @ts-expect-error - optional dependency, may not be installed
    const bip39 = await import(/* webpackIgnore: true */ 'bip39')
    const wordlist = bip39.wordlists?.english
    if (wordlist && Array.isArray(wordlist)) {
      fullWordlist = wordlist
      return fullWordlist
    }
    throw new Error('bip39 wordlist not available')
  } catch {
    // Fallback: fetch from CDN
    try {
      const response = await fetch(
        'https://raw.githubusercontent.com/bitcoin/bips/master/bip-0039/english.txt'
      )
      const text = await response.text()
      fullWordlist = text.trim().split('\n')
      return fullWordlist
    } catch {
      // Last resort: use sample (not for production!)
      console.warn('[recoveryKey] Using sample wordlist - recovery keys may not be compatible')
      fullWordlist = BIP39_WORDLIST_SAMPLE
      return fullWordlist
    }
  }
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Recovery key result
 */
export interface RecoveryKeyResult {
  /** 24-word mnemonic phrase */
  mnemonic: string
  /** Entropy bytes (for derivation) */
  entropy: Uint8Array
  /** Checksum for validation */
  checksum: string
}

/**
 * Security question for recovery
 */
export interface SecurityQuestion {
  /** Question text */
  question: string
  /** Hash of the answer (for verification) */
  answerHash: string
  /** Encrypted hint (decrypted by answer) */
  encryptedHint?: string
}

/**
 * Recovery data stored on server
 */
export interface RecoveryData {
  /** Hash of recovery key (for verification without storing key) */
  recoveryKeyHash: string
  /** Security question (optional) */
  securityQuestion?: SecurityQuestion
  /** When recovery was set up */
  createdAt: number
}

// ============================================================================
// MNEMONIC GENERATION
// ============================================================================

/**
 * Convert bytes to binary string
 */
function bytesToBinary(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(byte => byte.toString(2).padStart(8, '0'))
    .join('')
}

/**
 * Calculate checksum for entropy
 */
async function calculateChecksum(entropy: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', entropy.buffer as ArrayBuffer)
  const hashBits = bytesToBinary(new Uint8Array(hash))
  // Checksum is first (entropy_bits / 32) bits of hash
  const checksumLength = (entropy.length * 8) / 32
  return hashBits.slice(0, checksumLength)
}

/**
 * Generate a recovery key (24-word mnemonic)
 * 
 * @returns Recovery key result with mnemonic and entropy
 * 
 * @example
 * ```typescript
 * const recovery = await generateRecoveryKey()
 * console.log(recovery.mnemonic)
 * // "abandon ability able about above absent absorb abstract..."
 * 
 * // Store recovery.mnemonic securely offline!
 * ```
 */
export async function generateRecoveryKey(): Promise<RecoveryKeyResult> {
  const wordlist = await loadWordlist()
  
  // 256 bits of entropy = 24 words
  const entropy = randomBytes(32)
  
  // Calculate checksum
  const checksum = await calculateChecksum(entropy)
  
  // Combine entropy + checksum
  const entropyBits = bytesToBinary(entropy)
  const allBits = entropyBits + checksum
  
  // Split into 11-bit chunks, map to words
  const words: string[] = []
  for (let i = 0; i < allBits.length; i += 11) {
    const chunk = allBits.slice(i, i + 11)
    const index = parseInt(chunk, 2)
    words.push(wordlist[index])
  }
  
  return {
    mnemonic: words.join(' '),
    entropy,
    checksum,
  }
}

/**
 * Validate a mnemonic phrase
 * 
 * @param mnemonic - 24-word mnemonic to validate
 * @returns True if valid, false otherwise
 */
export async function validateMnemonic(mnemonic: string): Promise<boolean> {
  try {
    const wordlist = await loadWordlist()
    const words = mnemonic.trim().toLowerCase().split(/\s+/)
    
    // Must be 24 words
    if (words.length !== 24) return false
    
    // All words must be in wordlist
    for (const word of words) {
      if (!wordlist.includes(word)) return false
    }
    
    // Convert words back to bits
    const bits = words
      .map(word => {
        const index = wordlist.indexOf(word)
        return index.toString(2).padStart(11, '0')
      })
      .join('')
    
    // Split entropy and checksum
    const entropyBits = bits.slice(0, 256)
    const checksumBits = bits.slice(256)
    
    // Reconstruct entropy bytes
    const entropyBytes = new Uint8Array(32)
    for (let i = 0; i < 32; i++) {
      entropyBytes[i] = parseInt(entropyBits.slice(i * 8, (i + 1) * 8), 2)
    }
    
    // Verify checksum
    const expectedChecksum = await calculateChecksum(entropyBytes)
    return checksumBits === expectedChecksum
  } catch {
    return false
  }
}

/**
 * Convert mnemonic back to entropy
 * 
 * @param mnemonic - Valid 24-word mnemonic
 * @returns Entropy bytes
 */
export async function mnemonicToEntropy(mnemonic: string): Promise<Uint8Array> {
  const isValid = await validateMnemonic(mnemonic)
  if (!isValid) {
    throw new Error('Invalid mnemonic phrase')
  }
  
  const wordlist = await loadWordlist()
  const words = mnemonic.trim().toLowerCase().split(/\s+/)
  
  // Convert words to bits
  const bits = words
    .map(word => {
      const index = wordlist.indexOf(word)
      return index.toString(2).padStart(11, '0')
    })
    .join('')
  
  // Extract entropy (first 256 bits)
  const entropyBits = bits.slice(0, 256)
  const entropyBytes = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    entropyBytes[i] = parseInt(entropyBits.slice(i * 8, (i + 1) * 8), 2)
  }
  
  return entropyBytes
}

// ============================================================================
// RECOVERY KEY HASHING
// ============================================================================

/**
 * Hash a recovery key for storage
 * 
 * The hash is stored on server - allows verification without
 * storing the actual recovery key.
 * 
 * @param mnemonic - Recovery key mnemonic
 * @returns Hash for storage
 */
export async function hashRecoveryKey(mnemonic: string): Promise<string> {
  const entropy = await mnemonicToEntropy(mnemonic)
  
  // Hash with SHA-256
  const hash = await crypto.subtle.digest('SHA-256', entropy.buffer as ArrayBuffer)
  
  // Convert to hex
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Verify a recovery key against stored hash
 * 
 * @param mnemonic - Recovery key to verify
 * @param storedHash - Hash from server
 * @returns True if recovery key is correct
 */
export async function verifyRecoveryKey(
  mnemonic: string,
  storedHash: string
): Promise<boolean> {
  try {
    const hash = await hashRecoveryKey(mnemonic)
    return hash === storedHash
  } catch {
    return false
  }
}

// ============================================================================
// SECURITY QUESTIONS
// ============================================================================

/**
 * Hash a security question answer
 * 
 * @param answer - User's answer (normalized)
 * @param salt - Salt for hashing
 * @returns Hash for storage
 */
export async function hashSecurityAnswer(
  answer: string,
  salt: Uint8Array
): Promise<string> {
  // Normalize answer: lowercase, trim, remove extra spaces
  const normalized = answer.toLowerCase().trim().replace(/\s+/g, ' ')
  
  const encoder = new TextEncoder()
  const answerBytes = encoder.encode(normalized)
  
  // Combine with salt
  const combined = new Uint8Array(salt.length + answerBytes.length)
  combined.set(salt)
  combined.set(answerBytes, salt.length)
  
  // Hash with SHA-256
  const hash = await crypto.subtle.digest('SHA-256', combined)
  
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Create a security question with encrypted hint
 * 
 * @param question - Security question text
 * @param answer - User's answer
 * @param hint - Password hint to encrypt with answer
 * @returns Security question data for storage
 */
export async function createSecurityQuestion(
  question: string,
  answer: string,
  hint?: string
): Promise<{ question: SecurityQuestion; salt: string }> {
  const salt = randomBytes(16)
  const answerHash = await hashSecurityAnswer(answer, salt)
  
  let encryptedHint: string | undefined
  if (hint) {
    // Encrypt hint with answer (so only correct answer can reveal it)
    encryptedHint = await encryptWithPassphrase(hint, answer, 100000)
  }
  
  return {
    question: {
      question,
      answerHash,
      encryptedHint,
    },
    salt: btoa(String.fromCharCode(...Array.from(salt))),
  }
}

/**
 * Verify security question answer
 * 
 * @param answer - User's answer attempt
 * @param storedHash - Stored answer hash
 * @param salt - Salt used for hashing
 * @returns True if answer is correct
 */
export async function verifySecurityAnswer(
  answer: string,
  storedHash: string,
  salt: string
): Promise<boolean> {
  const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0))
  const hash = await hashSecurityAnswer(answer, saltBytes)
  return hash === storedHash
}

/**
 * Reveal hint using security question answer
 * 
 * @param encryptedHint - Encrypted hint from security question
 * @param answer - User's answer
 * @returns Decrypted hint, or null if answer is wrong
 */
export async function revealHint(
  encryptedHint: string,
  answer: string
): Promise<string | null> {
  try {
    return await decryptToStringWithPassphrase(encryptedHint, answer, 100000)
  } catch {
    return null
  }
}

// ============================================================================
// RECOVERY DATA
// ============================================================================

/**
 * Create recovery data for server storage
 * 
 * @param mnemonic - Recovery key mnemonic
 * @param securityQuestion - Optional security question
 * @returns Recovery data ready for upload
 */
export async function createRecoveryData(
  mnemonic: string,
  securityQuestion?: { question: string; answer: string; hint?: string }
): Promise<{ recoveryData: RecoveryData; salt?: string }> {
  const recoveryKeyHash = await hashRecoveryKey(mnemonic)
  
  let questionData: SecurityQuestion | undefined
  let salt: string | undefined
  
  if (securityQuestion) {
    const result = await createSecurityQuestion(
      securityQuestion.question,
      securityQuestion.answer,
      securityQuestion.hint
    )
    questionData = result.question
    salt = result.salt
  }
  
  return {
    recoveryData: {
      recoveryKeyHash,
      securityQuestion: questionData,
      createdAt: Date.now(),
    },
    salt,
  }
}

/**
 * Format mnemonic for display (groups of 4 words)
 */
export function formatMnemonic(mnemonic: string): string[] {
  const words = mnemonic.split(' ')
  const groups: string[] = []
  for (let i = 0; i < words.length; i += 4) {
    groups.push(words.slice(i, i + 4).join(' '))
  }
  return groups
}

/**
 * Parse mnemonic from user input (handles various formats)
 */
export function parseMnemonic(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

