/**
 * Tests for masterKey.ts - Passphrase-based key derivation
 * @module tests/crypto/masterKey
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Web Crypto API
const mockCrypto = {
  subtle: {
    importKey: vi.fn(),
    deriveKey: vi.fn(),
    deriveBits: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    exportKey: vi.fn(),
  },
  getRandomValues: vi.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256)
    }
    return arr
  }),
}

vi.stubGlobal('crypto', mockCrypto)

// ============================================================================
// IMPORT AFTER MOCKING
// ============================================================================

import {
  deriveMasterKey,
  wrapDEK,
  unwrapDEK,
  createWrappedDEKBundle,
  restoreDEKFromBundle,
  verifyPassphrase,
  changePassphrase,
  estimateDerivationTime,
  DEFAULT_ARGON2_PARAMS,
  LIGHTWEIGHT_ARGON2_PARAMS,
} from '@/lib/crypto/masterKey'

// ============================================================================
// TEST SETUP
// ============================================================================

describe('masterKey', () => {
  const mockKey = {} as CryptoKey
  const mockWrappedData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock implementations
    mockCrypto.subtle.importKey.mockResolvedValue(mockKey)
    mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey)
    mockCrypto.subtle.deriveBits.mockResolvedValue(new ArrayBuffer(32))
    mockCrypto.subtle.encrypt.mockResolvedValue(mockWrappedData.buffer)
    mockCrypto.subtle.decrypt.mockResolvedValue(mockWrappedData.buffer)
    mockCrypto.subtle.exportKey.mockResolvedValue(new ArrayBuffer(32))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  describe('constants', () => {
    it('should export DEFAULT_ARGON2_PARAMS with correct structure', () => {
      expect(DEFAULT_ARGON2_PARAMS).toBeDefined()
      expect(DEFAULT_ARGON2_PARAMS).toHaveProperty('timeCost')
      expect(DEFAULT_ARGON2_PARAMS).toHaveProperty('memoryCost')
      expect(DEFAULT_ARGON2_PARAMS).toHaveProperty('parallelism')
      expect(DEFAULT_ARGON2_PARAMS).toHaveProperty('hashLength')
    })

    it('should export LIGHTWEIGHT_ARGON2_PARAMS for faster derivation', () => {
      expect(LIGHTWEIGHT_ARGON2_PARAMS).toBeDefined()
      // Lightweight should have lower costs
      expect(LIGHTWEIGHT_ARGON2_PARAMS.timeCost).toBeLessThanOrEqual(DEFAULT_ARGON2_PARAMS.timeCost)
    })
  })

  // ============================================================================
  // deriveMasterKey
  // ============================================================================

  describe('deriveMasterKey', () => {
    it('should derive a master key from passphrase', async () => {
      const result = await deriveMasterKey('test-passphrase')

      expect(result).toBeDefined()
      expect(result.key).toBeDefined()
      expect(result.salt).toBeDefined()
      expect(result.params).toBeDefined()
    })

    it('should use provided salt if given', async () => {
      const existingSalt = 'existing-salt-base64'
      const result = await deriveMasterKey('test-passphrase', existingSalt)

      expect(result.salt).toBe(existingSalt)
    })

    it('should respect custom params', async () => {
      const result = await deriveMasterKey('test-passphrase', undefined, LIGHTWEIGHT_ARGON2_PARAMS)

      expect(result.params).toMatchObject(LIGHTWEIGHT_ARGON2_PARAMS)
    })

    it('should reject empty passphrase', async () => {
      await expect(deriveMasterKey('')).rejects.toThrow()
    })
  })

  // ============================================================================
  // wrapDEK / unwrapDEK
  // ============================================================================

  describe('wrapDEK', () => {
    it('should wrap a DEK with a master key', async () => {
      const dek = mockKey
      const masterKey = mockKey

      const wrapped = await wrapDEK(dek, masterKey)

      expect(wrapped).toBeDefined()
      expect(typeof wrapped).toBe('string') // Base64 encoded
    })
  })

  describe('unwrapDEK', () => {
    it('should unwrap a wrapped DEK', async () => {
      // First wrap
      const wrappedDEK = 'base64-wrapped-dek-data'

      const unwrapped = await unwrapDEK(wrappedDEK, mockKey)

      expect(unwrapped).toBeDefined()
    })

    it('should throw on invalid wrapped data', async () => {
      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'))

      await expect(unwrapDEK('invalid-data', mockKey)).rejects.toThrow()
    })
  })

  // ============================================================================
  // createWrappedDEKBundle / restoreDEKFromBundle
  // ============================================================================

  describe('createWrappedDEKBundle', () => {
    it('should create a complete bundle for cloud sync', async () => {
      const deviceKey = mockKey
      const passphrase = 'my-secure-passphrase'

      const bundle = await createWrappedDEKBundle(deviceKey, passphrase)

      expect(bundle).toBeDefined()
      expect(bundle).toHaveProperty('wrappedDEK')
      expect(bundle).toHaveProperty('salt')
      expect(bundle).toHaveProperty('params')
      expect(bundle).toHaveProperty('version')
    })
  })

  describe('restoreDEKFromBundle', () => {
    it('should restore DEK from bundle with correct passphrase', async () => {
      const bundle = {
        wrappedDEK: 'base64-wrapped',
        salt: 'base64-salt',
        params: DEFAULT_ARGON2_PARAMS,
        version: 1,
      }

      const restored = await restoreDEKFromBundle(bundle, 'correct-passphrase')

      expect(restored).toBeDefined()
    })

    it('should throw with wrong passphrase', async () => {
      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'))

      const bundle = {
        wrappedDEK: 'base64-wrapped',
        salt: 'base64-salt',
        params: DEFAULT_ARGON2_PARAMS,
        version: 1,
      }

      await expect(restoreDEKFromBundle(bundle, 'wrong-passphrase')).rejects.toThrow()
    })
  })

  // ============================================================================
  // verifyPassphrase
  // ============================================================================

  describe('verifyPassphrase', () => {
    it('should return true for correct passphrase', async () => {
      const bundle = {
        wrappedDEK: 'base64-wrapped',
        salt: 'base64-salt',
        params: DEFAULT_ARGON2_PARAMS,
        version: 1,
      }

      const isValid = await verifyPassphrase(bundle, 'correct-passphrase')

      expect(isValid).toBe(true)
    })

    it('should return false for wrong passphrase', async () => {
      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'))

      const bundle = {
        wrappedDEK: 'base64-wrapped',
        salt: 'base64-salt',
        params: DEFAULT_ARGON2_PARAMS,
        version: 1,
      }

      const isValid = await verifyPassphrase(bundle, 'wrong-passphrase')

      expect(isValid).toBe(false)
    })
  })

  // ============================================================================
  // changePassphrase
  // ============================================================================

  describe('changePassphrase', () => {
    it('should re-wrap DEK with new passphrase', async () => {
      const bundle = {
        wrappedDEK: 'base64-wrapped',
        salt: 'base64-salt',
        params: DEFAULT_ARGON2_PARAMS,
        version: 1,
      }

      const newBundle = await changePassphrase(bundle, 'old-pass', 'new-pass')

      expect(newBundle).toBeDefined()
      expect(newBundle.salt).not.toBe(bundle.salt) // New salt
      expect(newBundle.version).toBe(bundle.version + 1)
    })

    it('should throw if old passphrase is wrong', async () => {
      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'))

      const bundle = {
        wrappedDEK: 'base64-wrapped',
        salt: 'base64-salt',
        params: DEFAULT_ARGON2_PARAMS,
        version: 1,
      }

      await expect(changePassphrase(bundle, 'wrong-old', 'new-pass')).rejects.toThrow()
    })
  })

  // ============================================================================
  // estimateDerivationTime
  // ============================================================================

  describe('estimateDerivationTime', () => {
    it('should return time estimate for default params', () => {
      const estimate = estimateDerivationTime(DEFAULT_ARGON2_PARAMS)

      expect(typeof estimate).toBe('number')
      expect(estimate).toBeGreaterThan(0)
    })

    it('should return lower estimate for lightweight params', () => {
      const defaultEstimate = estimateDerivationTime(DEFAULT_ARGON2_PARAMS)
      const lightEstimate = estimateDerivationTime(LIGHTWEIGHT_ARGON2_PARAMS)

      expect(lightEstimate).toBeLessThanOrEqual(defaultEstimate)
    })
  })
})



