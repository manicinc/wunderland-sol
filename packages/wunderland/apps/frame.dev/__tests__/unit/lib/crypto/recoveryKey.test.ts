/**
 * Tests for recoveryKey.ts - BIP39 recovery key generation
 * @module tests/crypto/recoveryKey
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Web Crypto API
const mockCrypto = {
  subtle: {
    digest: vi.fn(),
    importKey: vi.fn(),
    sign: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  },
  getRandomValues: vi.fn((arr: Uint8Array) => {
    // Generate deterministic "random" values for testing
    for (let i = 0; i < arr.length; i++) {
      arr[i] = (i * 7 + 13) % 256
    }
    return arr
  }),
}

vi.stubGlobal('crypto', mockCrypto)

// ============================================================================
// IMPORT AFTER MOCKING
// ============================================================================

import {
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
} from '@/lib/crypto/recoveryKey'

// ============================================================================
// TEST SETUP
// ============================================================================

describe('recoveryKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock implementations
    mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32))
    mockCrypto.subtle.importKey.mockResolvedValue({} as CryptoKey)
    mockCrypto.subtle.sign.mockResolvedValue(new ArrayBuffer(32))
    mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(48))
    mockCrypto.subtle.decrypt.mockResolvedValue(new TextEncoder().encode('hint text').buffer)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================================
  // generateRecoveryKey
  // ============================================================================

  describe('generateRecoveryKey', () => {
    it('should generate a 24-word mnemonic by default', async () => {
      const result = await generateRecoveryKey()

      expect(result).toBeDefined()
      expect(result.mnemonic).toBeDefined()
      
      const words = result.mnemonic.split(' ')
      expect(words.length).toBe(24)
    })

    it('should include entropy and hash in result', async () => {
      const result = await generateRecoveryKey()

      expect(result.entropy).toBeDefined()
      expect(result.hash).toBeDefined()
    })

    it('should support 12-word mnemonic option', async () => {
      const result = await generateRecoveryKey(128) // 128 bits = 12 words

      const words = result.mnemonic.split(' ')
      expect(words.length).toBe(12)
    })
  })

  // ============================================================================
  // validateMnemonic
  // ============================================================================

  describe('validateMnemonic', () => {
    it('should return true for valid BIP39 mnemonic', async () => {
      // Generate a valid mnemonic first
      const { mnemonic } = await generateRecoveryKey()
      
      const isValid = await validateMnemonic(mnemonic)
      
      expect(isValid).toBe(true)
    })

    it('should return false for invalid word count', async () => {
      const isValid = await validateMnemonic('word1 word2 word3')
      
      expect(isValid).toBe(false)
    })

    it('should return false for non-BIP39 words', async () => {
      const invalidMnemonic = Array(24).fill('notaword').join(' ')
      
      const isValid = await validateMnemonic(invalidMnemonic)
      
      expect(isValid).toBe(false)
    })

    it('should handle extra whitespace', async () => {
      const { mnemonic } = await generateRecoveryKey()
      const messyMnemonic = '  ' + mnemonic.replace(/ /g, '   ') + '  '
      
      const isValid = await validateMnemonic(messyMnemonic)
      
      expect(isValid).toBe(true)
    })
  })

  // ============================================================================
  // mnemonicToEntropy
  // ============================================================================

  describe('mnemonicToEntropy', () => {
    it('should convert mnemonic back to entropy', async () => {
      const { mnemonic, entropy: originalEntropy } = await generateRecoveryKey()
      
      const recoveredEntropy = await mnemonicToEntropy(mnemonic)
      
      expect(recoveredEntropy).toBe(originalEntropy)
    })

    it('should throw for invalid mnemonic', async () => {
      await expect(mnemonicToEntropy('invalid words here')).rejects.toThrow()
    })
  })

  // ============================================================================
  // hashRecoveryKey / verifyRecoveryKey
  // ============================================================================

  describe('hashRecoveryKey', () => {
    it('should produce a hash string', async () => {
      const { mnemonic } = await generateRecoveryKey()
      
      const hash = await hashRecoveryKey(mnemonic)
      
      expect(typeof hash).toBe('string')
      expect(hash.length).toBeGreaterThan(0)
    })

    it('should produce consistent hashes', async () => {
      const { mnemonic } = await generateRecoveryKey()
      
      const hash1 = await hashRecoveryKey(mnemonic)
      const hash2 = await hashRecoveryKey(mnemonic)
      
      expect(hash1).toBe(hash2)
    })
  })

  describe('verifyRecoveryKey', () => {
    it('should return true for matching mnemonic and hash', async () => {
      const { mnemonic, hash } = await generateRecoveryKey()
      
      const isValid = await verifyRecoveryKey(mnemonic, hash)
      
      expect(isValid).toBe(true)
    })

    it('should return false for non-matching hash', async () => {
      const { mnemonic } = await generateRecoveryKey()
      
      const isValid = await verifyRecoveryKey(mnemonic, 'wrong-hash')
      
      expect(isValid).toBe(false)
    })
  })

  // ============================================================================
  // Security Questions
  // ============================================================================

  describe('createSecurityQuestion', () => {
    it('should create a security question object', async () => {
      const question = await createSecurityQuestion(
        'What is your pet\'s name?',
        'fluffy',
        'It starts with F'
      )

      expect(question).toBeDefined()
      expect(question.question).toBe('What is your pet\'s name?')
      expect(question.answerHash).toBeDefined()
      expect(question.salt).toBeDefined()
      expect(question.encryptedHint).toBeDefined()
    })
  })

  describe('verifySecurityAnswer', () => {
    it('should return true for correct answer', async () => {
      const question = await createSecurityQuestion(
        'What is your pet\'s name?',
        'fluffy',
        'It starts with F'
      )

      const isValid = await verifySecurityAnswer(question, 'fluffy')

      expect(isValid).toBe(true)
    })

    it('should return false for wrong answer', async () => {
      const question = await createSecurityQuestion(
        'What is your pet\'s name?',
        'fluffy',
        'It starts with F'
      )

      const isValid = await verifySecurityAnswer(question, 'wrong-answer')

      expect(isValid).toBe(false)
    })

    it('should be case-insensitive', async () => {
      const question = await createSecurityQuestion(
        'What is your pet\'s name?',
        'Fluffy',
        'It starts with F'
      )

      const isValid = await verifySecurityAnswer(question, 'FLUFFY')

      expect(isValid).toBe(true)
    })
  })

  describe('revealHint', () => {
    it('should decrypt hint after correct answer', async () => {
      const question = await createSecurityQuestion(
        'What is your pet\'s name?',
        'fluffy',
        'It starts with F'
      )

      const hint = await revealHint(question, 'fluffy')

      expect(hint).toBeDefined()
    })

    it('should throw for wrong answer', async () => {
      const question = await createSecurityQuestion(
        'What is your pet\'s name?',
        'fluffy',
        'It starts with F'
      )

      await expect(revealHint(question, 'wrong')).rejects.toThrow()
    })
  })

  // ============================================================================
  // createRecoveryData
  // ============================================================================

  describe('createRecoveryData', () => {
    it('should create complete recovery data package', async () => {
      const data = await createRecoveryData({
        securityQuestion: 'What is your pet\'s name?',
        securityAnswer: 'fluffy',
        hint: 'It starts with F',
      })

      expect(data).toBeDefined()
      expect(data.recoveryKey).toBeDefined()
      expect(data.recoveryKeyHash).toBeDefined()
      expect(data.securityQuestion).toBeDefined()
    })

    it('should work without security question', async () => {
      const data = await createRecoveryData()

      expect(data).toBeDefined()
      expect(data.recoveryKey).toBeDefined()
      expect(data.securityQuestion).toBeUndefined()
    })
  })

  // ============================================================================
  // formatMnemonic / parseMnemonic
  // ============================================================================

  describe('formatMnemonic', () => {
    it('should format mnemonic into readable groups', () => {
      const mnemonic = Array(24).fill('word').join(' ')
      
      const formatted = formatMnemonic(mnemonic)
      
      expect(formatted).toContain('\n') // Has line breaks
    })

    it('should support custom group size', () => {
      const mnemonic = Array(24).fill('word').join(' ')
      
      const formatted = formatMnemonic(mnemonic, 6)
      
      const lines = formatted.split('\n')
      expect(lines.length).toBe(4) // 24 words / 6 per line
    })
  })

  describe('parseMnemonic', () => {
    it('should normalize formatted mnemonic', () => {
      const formatted = 'word1  word2\nword3\tword4'
      
      const parsed = parseMnemonic(formatted)
      
      expect(parsed).toBe('word1 word2 word3 word4')
    })

    it('should trim whitespace', () => {
      const messy = '  word1 word2 word3  '
      
      const parsed = parseMnemonic(messy)
      
      expect(parsed).toBe('word1 word2 word3')
    })

    it('should lowercase all words', () => {
      const mixed = 'Word1 WORD2 WoRd3'
      
      const parsed = parseMnemonic(mixed)
      
      expect(parsed).toBe('word1 word2 word3')
    })
  })
})



