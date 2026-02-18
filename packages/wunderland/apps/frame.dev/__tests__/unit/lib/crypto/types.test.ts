/**
 * Crypto Types Tests
 * @module __tests__/unit/lib/crypto/types.test
 *
 * Tests for crypto module types, type guards, and configuration.
 */

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_CRYPTO_CONFIG,
  isEncryptSuccess,
  isDecryptSuccess,
  type EncryptionResult,
  type DecryptionResult,
  type CryptoConfig,
} from '@/lib/crypto/types'

// ============================================================================
// DEFAULT_CRYPTO_CONFIG
// ============================================================================

describe('DEFAULT_CRYPTO_CONFIG', () => {
  it('is defined', () => {
    expect(DEFAULT_CRYPTO_CONFIG).toBeDefined()
  })

  it('has deviceKeyStorageKey', () => {
    expect(DEFAULT_CRYPTO_CONFIG.deviceKeyStorageKey).toBe('frame-e2ee-device-key')
  })

  it('has pbkdf2Iterations', () => {
    expect(DEFAULT_CRYPTO_CONFIG.pbkdf2Iterations).toBe(100000)
  })

  it('pbkdf2Iterations is a secure value', () => {
    expect(DEFAULT_CRYPTO_CONFIG.pbkdf2Iterations).toBeGreaterThanOrEqual(100000)
  })

  it('has all required properties', () => {
    expect(DEFAULT_CRYPTO_CONFIG).toHaveProperty('deviceKeyStorageKey')
    expect(DEFAULT_CRYPTO_CONFIG).toHaveProperty('pbkdf2Iterations')
  })

  it('is immutable (spread creates copy)', () => {
    const copy: CryptoConfig = { ...DEFAULT_CRYPTO_CONFIG }
    copy.pbkdf2Iterations = 50000
    expect(DEFAULT_CRYPTO_CONFIG.pbkdf2Iterations).toBe(100000)
  })
})

// ============================================================================
// isEncryptSuccess
// ============================================================================

describe('isEncryptSuccess', () => {
  it('returns true for successful encryption result', () => {
    const result: EncryptionResult = {
      success: true,
      envelope: {
        version: 1,
        ciphertext: 'encrypted-data-base64',
        encryptedAt: Date.now(),
      },
    }
    expect(isEncryptSuccess(result)).toBe(true)
  })

  it('returns false for failed encryption result', () => {
    const result: EncryptionResult = {
      success: false,
      error: 'Encryption failed',
    }
    expect(isEncryptSuccess(result)).toBe(false)
  })

  it('narrows type correctly for success case', () => {
    const result: EncryptionResult = {
      success: true,
      envelope: {
        version: 1,
        ciphertext: 'test',
        encryptedAt: 12345,
        dataType: 'string',
      },
    }

    if (isEncryptSuccess(result)) {
      expect(result.envelope.version).toBe(1)
      expect(result.envelope.ciphertext).toBe('test')
      expect(result.envelope.encryptedAt).toBe(12345)
      expect(result.envelope.dataType).toBe('string')
    } else {
      throw new Error('Expected success')
    }
  })

  it('narrows type correctly for error case', () => {
    const result: EncryptionResult = {
      success: false,
      error: 'Key not available',
    }

    if (!isEncryptSuccess(result)) {
      expect(result.error).toBe('Key not available')
    } else {
      throw new Error('Expected failure')
    }
  })

  describe('envelope data types', () => {
    it('handles envelope with dataType', () => {
      const result: EncryptionResult = {
        success: true,
        envelope: {
          version: 1,
          ciphertext: 'abc123',
          encryptedAt: Date.now(),
          dataType: 'json',
        },
      }
      expect(isEncryptSuccess(result)).toBe(true)
      if (isEncryptSuccess(result)) {
        expect(result.envelope.dataType).toBe('json')
      }
    })

    it('handles envelope without dataType', () => {
      const result: EncryptionResult = {
        success: true,
        envelope: {
          version: 1,
          ciphertext: 'abc123',
          encryptedAt: Date.now(),
        },
      }
      expect(isEncryptSuccess(result)).toBe(true)
      if (isEncryptSuccess(result)) {
        expect(result.envelope.dataType).toBeUndefined()
      }
    })
  })
})

// ============================================================================
// isDecryptSuccess
// ============================================================================

describe('isDecryptSuccess', () => {
  it('returns true for successful decryption result', () => {
    const result: DecryptionResult<string> = {
      success: true,
      data: 'decrypted string',
    }
    expect(isDecryptSuccess(result)).toBe(true)
  })

  it('returns false for failed decryption result', () => {
    const result: DecryptionResult<string> = {
      success: false,
      error: 'Decryption failed',
    }
    expect(isDecryptSuccess(result)).toBe(false)
  })

  it('narrows type correctly for success case', () => {
    const result: DecryptionResult<{ name: string; value: number }> = {
      success: true,
      data: { name: 'test', value: 42 },
    }

    if (isDecryptSuccess(result)) {
      expect(result.data.name).toBe('test')
      expect(result.data.value).toBe(42)
    } else {
      throw new Error('Expected success')
    }
  })

  it('narrows type correctly for error case', () => {
    const result: DecryptionResult = {
      success: false,
      error: 'Invalid key',
    }

    if (!isDecryptSuccess(result)) {
      expect(result.error).toBe('Invalid key')
    } else {
      throw new Error('Expected failure')
    }
  })

  describe('generic type support', () => {
    it('works with string data', () => {
      const result: DecryptionResult<string> = {
        success: true,
        data: 'hello world',
      }
      if (isDecryptSuccess(result)) {
        expect(typeof result.data).toBe('string')
      }
    })

    it('works with number data', () => {
      const result: DecryptionResult<number> = {
        success: true,
        data: 12345,
      }
      if (isDecryptSuccess(result)) {
        expect(typeof result.data).toBe('number')
      }
    })

    it('works with array data', () => {
      const result: DecryptionResult<string[]> = {
        success: true,
        data: ['a', 'b', 'c'],
      }
      if (isDecryptSuccess(result)) {
        expect(Array.isArray(result.data)).toBe(true)
        expect(result.data).toHaveLength(3)
      }
    })

    it('works with complex object data', () => {
      interface UserData {
        id: string
        email: string
        preferences: { theme: string }
      }
      const result: DecryptionResult<UserData> = {
        success: true,
        data: {
          id: 'user-123',
          email: 'test@example.com',
          preferences: { theme: 'dark' },
        },
      }
      if (isDecryptSuccess(result)) {
        expect(result.data.id).toBe('user-123')
        expect(result.data.preferences.theme).toBe('dark')
      }
    })

    it('works with unknown type', () => {
      const result: DecryptionResult = {
        success: true,
        data: { anything: true },
      }
      expect(isDecryptSuccess(result)).toBe(true)
    })
  })

  describe('error messages', () => {
    it('captures various error messages', () => {
      const errors = [
        'Invalid key',
        'Corrupted data',
        'Authentication failed',
        'Wrong password',
        'Key expired',
      ]

      errors.forEach((error) => {
        const result: DecryptionResult = {
          success: false,
          error,
        }
        expect(isDecryptSuccess(result)).toBe(false)
        if (!isDecryptSuccess(result)) {
          expect(result.error).toBe(error)
        }
      })
    })
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('crypto types integration', () => {
  it('type guards work in conditional flow', () => {
    function processEncryption(result: EncryptionResult): string {
      if (isEncryptSuccess(result)) {
        return result.envelope.ciphertext
      }
      return result.error
    }

    const success: EncryptionResult = {
      success: true,
      envelope: { version: 1, ciphertext: 'encrypted', encryptedAt: 0 },
    }
    const failure: EncryptionResult = {
      success: false,
      error: 'Failed',
    }

    expect(processEncryption(success)).toBe('encrypted')
    expect(processEncryption(failure)).toBe('Failed')
  })

  it('type guards work with decryption flow', () => {
    function processDecryption(result: DecryptionResult<string>): string {
      if (isDecryptSuccess(result)) {
        return result.data.toUpperCase()
      }
      return `Error: ${result.error}`
    }

    const success: DecryptionResult<string> = {
      success: true,
      data: 'hello',
    }
    const failure: DecryptionResult<string> = {
      success: false,
      error: 'Bad key',
    }

    expect(processDecryption(success)).toBe('HELLO')
    expect(processDecryption(failure)).toBe('Error: Bad key')
  })

  it('DEFAULT_CRYPTO_CONFIG can be spread and modified', () => {
    const customConfig: CryptoConfig = {
      ...DEFAULT_CRYPTO_CONFIG,
      pbkdf2Iterations: 200000,
    }

    expect(customConfig.deviceKeyStorageKey).toBe(DEFAULT_CRYPTO_CONFIG.deviceKeyStorageKey)
    expect(customConfig.pbkdf2Iterations).toBe(200000)
    expect(DEFAULT_CRYPTO_CONFIG.pbkdf2Iterations).toBe(100000) // unchanged
  })
})
