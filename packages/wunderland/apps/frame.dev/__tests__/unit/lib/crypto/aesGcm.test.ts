/**
 * AES-256-GCM Encryption Unit Tests
 *
 * Tests for core crypto functions: key generation, encryption, decryption.
 * Uses real Web Crypto API (built-in to Node.js).
 */

import { describe, it, expect } from 'vitest'
import {
  generateRandomKey,
  exportKey,
  importKey,
  encryptWithKey,
  decryptWithKey,
  decryptToStringWithKey,
  encryptWithPassphrase,
  decryptWithPassphrase,
  decryptToStringWithPassphrase,
  deriveKeyFromPassphrase,
  randomBytes,
  randomId,
  constantTimeEqual,
} from '@/lib/crypto/aesGcm'

describe('AES-256-GCM Encryption', () => {
  describe('Key Generation', () => {
    it('generateRandomKey() returns a valid CryptoKey', async () => {
      const key = await generateRandomKey()

      expect(key).toBeDefined()
      expect(key.type).toBe('secret')
      expect(key.algorithm.name).toBe('AES-GCM')
      expect((key.algorithm as AesKeyAlgorithm).length).toBe(256)
      expect(key.extractable).toBe(true)
      expect(key.usages).toContain('encrypt')
      expect(key.usages).toContain('decrypt')
    })

    it('generateRandomKey() produces different keys each time', async () => {
      const key1 = await generateRandomKey()
      const key2 = await generateRandomKey()

      const bytes1 = await exportKey(key1)
      const bytes2 = await exportKey(key2)

      expect(bytes1).not.toEqual(bytes2)
    })
  })

  describe('Key Export/Import', () => {
    it('exportKey() returns 32 bytes for AES-256', async () => {
      const key = await generateRandomKey()
      const exported = await exportKey(key)

      expect(exported).toBeInstanceOf(Uint8Array)
      expect(exported.length).toBe(32) // 256 bits = 32 bytes
    })

    it('importKey() roundtrip preserves key material', async () => {
      const original = await generateRandomKey()
      const exported = await exportKey(original)
      const imported = await importKey(exported, true)

      const reExported = await exportKey(imported)

      expect(reExported).toEqual(exported)
    })

    it('importKey() respects extractable flag', async () => {
      const key = await generateRandomKey()
      const exported = await exportKey(key)

      const nonExtractable = await importKey(exported, false)

      expect(nonExtractable.extractable).toBe(false)
      await expect(exportKey(nonExtractable)).rejects.toThrow()
    })
  })

  describe('Encrypt/Decrypt with Key', () => {
    it('encryptWithKey/decryptWithKey roundtrip text', async () => {
      const key = await generateRandomKey()
      const plaintext = 'Hello, World!'

      const encrypted = await encryptWithKey(plaintext, key)
      const decrypted = await decryptWithKey(encrypted, key)

      const result = new TextDecoder().decode(decrypted)
      expect(result).toBe(plaintext)
    })

    it('encryptWithKey produces base64 output', async () => {
      const key = await generateRandomKey()
      const encrypted = await encryptWithKey('test', key)

      // Base64 regex
      expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/)
    })

    it('encryptWithKey produces different ciphertext each time (random IV)', async () => {
      const key = await generateRandomKey()
      const plaintext = 'Same message'

      const encrypted1 = await encryptWithKey(plaintext, key)
      const encrypted2 = await encryptWithKey(plaintext, key)

      expect(encrypted1).not.toBe(encrypted2)
    })

    it('decryptWithKey fails with wrong key', async () => {
      const key1 = await generateRandomKey()
      const key2 = await generateRandomKey()
      const encrypted = await encryptWithKey('secret', key1)

      await expect(decryptWithKey(encrypted, key2)).rejects.toThrow()
    })

    it('decryptWithKey fails with tampered ciphertext', async () => {
      const key = await generateRandomKey()
      const encrypted = await encryptWithKey('secret', key)

      // Tamper with the ciphertext (flip a character in the middle)
      const tampered = encrypted.slice(0, 20) + 'X' + encrypted.slice(21)

      await expect(decryptWithKey(tampered, key)).rejects.toThrow()
    })

    it('decryptToStringWithKey returns string directly', async () => {
      const key = await generateRandomKey()
      const plaintext = 'Direct string output'

      const encrypted = await encryptWithKey(plaintext, key)
      const decrypted = await decryptToStringWithKey(encrypted, key)

      expect(typeof decrypted).toBe('string')
      expect(decrypted).toBe(plaintext)
    })

    it('handles Uint8Array input', async () => {
      const key = await generateRandomKey()
      const data = new Uint8Array([1, 2, 3, 4, 5])

      const encrypted = await encryptWithKey(data, key)
      const decrypted = await decryptWithKey(encrypted, key)

      expect(decrypted).toEqual(data)
    })

    it('handles empty string', async () => {
      const key = await generateRandomKey()
      const encrypted = await encryptWithKey('', key)
      const decrypted = await decryptToStringWithKey(encrypted, key)

      expect(decrypted).toBe('')
    })

    it('handles unicode text', async () => {
      const key = await generateRandomKey()
      const unicode = '你好世界 🔐 مرحبا'

      const encrypted = await encryptWithKey(unicode, key)
      const decrypted = await decryptToStringWithKey(encrypted, key)

      expect(decrypted).toBe(unicode)
    })

    it('handles large data', async () => {
      const key = await generateRandomKey()
      const largeData = 'x'.repeat(100000)

      const encrypted = await encryptWithKey(largeData, key)
      const decrypted = await decryptToStringWithKey(encrypted, key)

      expect(decrypted).toBe(largeData)
    })
  })

  describe('Encrypt/Decrypt with Passphrase', () => {
    it('encryptWithPassphrase/decryptWithPassphrase roundtrip', async () => {
      const passphrase = 'my-secure-passphrase'
      const plaintext = 'Secret message'

      const encrypted = await encryptWithPassphrase(plaintext, passphrase)
      const decrypted = await decryptWithPassphrase(encrypted, passphrase)

      const result = new TextDecoder().decode(decrypted)
      expect(result).toBe(plaintext)
    })

    it('decryptToStringWithPassphrase returns string directly', async () => {
      const passphrase = 'password123'
      const plaintext = 'Hello'

      const encrypted = await encryptWithPassphrase(plaintext, passphrase)
      const decrypted = await decryptToStringWithPassphrase(encrypted, passphrase)

      expect(typeof decrypted).toBe('string')
      expect(decrypted).toBe(plaintext)
    })

    it('different passphrases produce different ciphertext', async () => {
      const plaintext = 'Same message'

      const encrypted1 = await encryptWithPassphrase(plaintext, 'pass1')
      const encrypted2 = await encryptWithPassphrase(plaintext, 'pass2')

      expect(encrypted1).not.toBe(encrypted2)
    })

    it('decryption fails with wrong passphrase', async () => {
      const encrypted = await encryptWithPassphrase('secret', 'correct')

      await expect(
        decryptWithPassphrase(encrypted, 'wrong')
      ).rejects.toThrow()
    })

    it('respects custom iteration count', async () => {
      const passphrase = 'test'
      const plaintext = 'data'

      // Use lower iterations for testing speed
      const encrypted = await encryptWithPassphrase(plaintext, passphrase, 1000)
      const decrypted = await decryptToStringWithPassphrase(
        encrypted,
        passphrase,
        1000
      )

      expect(decrypted).toBe(plaintext)
    })

    it('fails when iteration count mismatches', async () => {
      const encrypted = await encryptWithPassphrase('data', 'pass', 1000)

      // Try to decrypt with different iteration count
      await expect(
        decryptWithPassphrase(encrypted, 'pass', 2000)
      ).rejects.toThrow()
    })
  })

  describe('Key Derivation', () => {
    it('deriveKeyFromPassphrase returns valid CryptoKey', async () => {
      const salt = randomBytes(16)
      const key = await deriveKeyFromPassphrase('password', salt)

      expect(key).toBeDefined()
      expect(key.type).toBe('secret')
      expect(key.algorithm.name).toBe('AES-GCM')
    })

    it('same passphrase + salt produces same key', async () => {
      const salt = randomBytes(16)
      const key1 = await deriveKeyFromPassphrase('password', salt, 1000, ['encrypt', 'decrypt'])
      const key2 = await deriveKeyFromPassphrase('password', salt, 1000, ['encrypt', 'decrypt'])

      // We can't compare keys directly, but we can encrypt with one and decrypt with the other
      const encrypted = await encryptWithKey('test', key1)
      const decrypted = await decryptToStringWithKey(encrypted, key2)

      expect(decrypted).toBe('test')
    })

    it('different salts produce different keys', async () => {
      const salt1 = randomBytes(16)
      const salt2 = randomBytes(16)

      const key1 = await deriveKeyFromPassphrase('password', salt1, 1000, ['encrypt', 'decrypt'])
      const key2 = await deriveKeyFromPassphrase('password', salt2, 1000, ['encrypt', 'decrypt'])

      const encrypted = await encryptWithKey('test', key1)

      // Decryption should fail with key derived from different salt
      await expect(decryptWithKey(encrypted, key2)).rejects.toThrow()
    })
  })

  describe('Utility Functions', () => {
    describe('randomBytes', () => {
      it('generates correct length', () => {
        expect(randomBytes(16).length).toBe(16)
        expect(randomBytes(32).length).toBe(32)
        expect(randomBytes(1).length).toBe(1)
      })

      it('returns Uint8Array', () => {
        expect(randomBytes(8)).toBeInstanceOf(Uint8Array)
      })

      it('generates different values each time', () => {
        const a = randomBytes(16)
        const b = randomBytes(16)

        expect(a).not.toEqual(b)
      })
    })

    describe('randomId', () => {
      it('generates hex string', () => {
        const id = randomId(16)

        expect(typeof id).toBe('string')
        expect(id).toMatch(/^[0-9a-f]+$/)
      })

      it('generates correct length (2 hex chars per byte)', () => {
        expect(randomId(8).length).toBe(16)
        expect(randomId(16).length).toBe(32)
        expect(randomId(32).length).toBe(64)
      })

      it('defaults to 16 bytes (32 hex chars)', () => {
        expect(randomId().length).toBe(32)
      })

      it('generates unique values', () => {
        const ids = Array.from({ length: 100 }, () => randomId())
        const unique = new Set(ids)

        expect(unique.size).toBe(100)
      })
    })

    describe('constantTimeEqual', () => {
      it('returns true for equal arrays', () => {
        const a = new Uint8Array([1, 2, 3, 4])
        const b = new Uint8Array([1, 2, 3, 4])

        expect(constantTimeEqual(a, b)).toBe(true)
      })

      it('returns false for different arrays', () => {
        const a = new Uint8Array([1, 2, 3, 4])
        const b = new Uint8Array([1, 2, 3, 5])

        expect(constantTimeEqual(a, b)).toBe(false)
      })

      it('returns false for different lengths', () => {
        const a = new Uint8Array([1, 2, 3])
        const b = new Uint8Array([1, 2, 3, 4])

        expect(constantTimeEqual(a, b)).toBe(false)
      })

      it('handles empty arrays', () => {
        const a = new Uint8Array([])
        const b = new Uint8Array([])

        expect(constantTimeEqual(a, b)).toBe(true)
      })

      it('handles single-element difference', () => {
        const a = new Uint8Array([1])
        const b = new Uint8Array([2])

        expect(constantTimeEqual(a, b)).toBe(false)
      })
    })
  })
})
