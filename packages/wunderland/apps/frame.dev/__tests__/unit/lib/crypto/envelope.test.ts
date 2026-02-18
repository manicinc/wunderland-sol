/**
 * Envelope Encryption Unit Tests
 *
 * Tests for high-level encryption API: encryptToEnvelope, decryptFromEnvelope,
 * batch operations, and envelope utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the device key module to avoid IndexedDB dependency
// Use vi.hoisted to create mock before vi.mock is hoisted
const { mockGetDeviceKey, keyStore } = vi.hoisted(() => {
  const store = { key: null as CryptoKey | null }
  return {
    mockGetDeviceKey: vi.fn(async () => {
      if (!store.key) {
        store.key = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        )
      }
      return store.key
    }),
    keyStore: store,
  }
})

vi.mock('@/lib/crypto/deviceKey', () => ({
  getDeviceKey: mockGetDeviceKey,
}))

// Import after mocking
import {
  encryptToEnvelope,
  decryptFromEnvelope,
  encryptString,
  decryptToString,
  encryptBatch,
  decryptBatch,
  isEncryptedEnvelope,
  createEnvelope,
  serializeEnvelope,
  parseEnvelope,
} from '@/lib/crypto/envelope'
import type { EncryptedEnvelope } from '@/lib/crypto/types'

describe('Envelope Encryption', () => {
  beforeEach(() => {
    // Reset mock call history but keep the cached key
    mockGetDeviceKey.mockClear()
  })

  afterEach(() => {
    // Clear call history after each test
    mockGetDeviceKey.mockClear()
  })

  describe('encryptToEnvelope', () => {
    it('creates valid envelope structure', async () => {
      const data = { message: 'hello' }
      const result = await encryptToEnvelope(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.envelope.version).toBe(1)
        expect(typeof result.envelope.ciphertext).toBe('string')
        expect(typeof result.envelope.encryptedAt).toBe('number')
        expect(result.envelope.encryptedAt).toBeGreaterThan(0)
      }
    })

    it('includes optional dataType', async () => {
      const result = await encryptToEnvelope({ x: 1 }, 'task')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.envelope.dataType).toBe('task')
      }
    })

    it('handles complex nested objects', async () => {
      const data = {
        nested: {
          deeply: {
            value: 'test',
            array: [1, 2, { inner: true }],
          },
        },
        date: '2024-01-01',
      }
      const result = await encryptToEnvelope(data)

      expect(result.success).toBe(true)
    })

    it('handles arrays', async () => {
      const data = [1, 2, 3, 'four', { five: 5 }]
      const result = await encryptToEnvelope(data)

      expect(result.success).toBe(true)
    })

    it('handles null and undefined values', async () => {
      const data = { nullVal: null, undefinedVal: undefined }
      const result = await encryptToEnvelope(data)

      expect(result.success).toBe(true)
    })
  })

  describe('decryptFromEnvelope', () => {
    it('recovers original data', async () => {
      const original = { secret: 'data', count: 42 }
      const encResult = await encryptToEnvelope(original)

      expect(encResult.success).toBe(true)
      if (!encResult.success) return

      const decResult = await decryptFromEnvelope<typeof original>(encResult.envelope)

      expect(decResult.success).toBe(true)
      if (decResult.success) {
        expect(decResult.data).toEqual(original)
      }
    })

    it('recovers arrays correctly', async () => {
      const original = ['a', 'b', 'c', 1, 2, 3]
      const encResult = await encryptToEnvelope(original)

      expect(encResult.success).toBe(true)
      if (!encResult.success) return

      const decResult = await decryptFromEnvelope<typeof original>(encResult.envelope)

      expect(decResult.success).toBe(true)
      if (decResult.success) {
        expect(decResult.data).toEqual(original)
      }
    })

    it('rejects unsupported envelope version', async () => {
      const badEnvelope: EncryptedEnvelope = {
        version: 99 as 1, // Force wrong version
        ciphertext: 'doesnt-matter',
        encryptedAt: Date.now(),
      }

      const result = await decryptFromEnvelope(badEnvelope)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Unsupported envelope version')
      }
    })

    it('returns error for invalid ciphertext', async () => {
      const badEnvelope: EncryptedEnvelope = {
        version: 1,
        ciphertext: 'not-valid-base64-ciphertext!!!',
        encryptedAt: Date.now(),
      }

      const result = await decryptFromEnvelope(badEnvelope)

      expect(result.success).toBe(false)
    })
  })

  describe('encryptString / decryptToString', () => {
    it('handles raw strings without JSON', async () => {
      const text = 'Hello, World! This is raw text.'
      const encResult = await encryptString(text)

      expect(encResult.success).toBe(true)
      if (!encResult.success) return

      expect(encResult.envelope.dataType).toBe('string')

      const decResult = await decryptToString(encResult.envelope)

      expect(decResult.success).toBe(true)
      if (decResult.success) {
        expect(decResult.data).toBe(text)
      }
    })

    it('preserves unicode in raw strings', async () => {
      const text = '你好 🔐 مرحبا 日本語'
      const encResult = await encryptString(text)

      expect(encResult.success).toBe(true)
      if (!encResult.success) return

      const decResult = await decryptToString(encResult.envelope)

      expect(decResult.success).toBe(true)
      if (decResult.success) {
        expect(decResult.data).toBe(text)
      }
    })

    it('handles empty strings', async () => {
      const encResult = await encryptString('')

      expect(encResult.success).toBe(true)
      if (!encResult.success) return

      const decResult = await decryptToString(encResult.envelope)

      expect(decResult.success).toBe(true)
      if (decResult.success) {
        expect(decResult.data).toBe('')
      }
    })
  })

  describe('Batch Operations', () => {
    describe('encryptBatch', () => {
      it('encrypts multiple items in parallel', async () => {
        const items = [
          { id: 1, name: 'first' },
          { id: 2, name: 'second' },
          { id: 3, name: 'third' },
        ]

        const results = await encryptBatch(items, 'item')

        expect(results).toHaveLength(3)
        results.forEach(result => {
          expect(result.success).toBe(true)
          if (result.success) {
            expect(result.envelope.dataType).toBe('item')
          }
        })
      })

      it('handles empty array', async () => {
        const results = await encryptBatch([])

        expect(results).toHaveLength(0)
      })

      it('handles large batches', async () => {
        const items = Array.from({ length: 100 }, (_, i) => ({ index: i }))

        const results = await encryptBatch(items)

        expect(results).toHaveLength(100)
        expect(results.every(r => r.success)).toBe(true)
      })
    })

    describe('decryptBatch', () => {
      it('decrypts multiple envelopes in parallel', async () => {
        // Encrypt items first with the same key that will be used for decryption
        const items = [
          { id: 1, value: 'a' },
          { id: 2, value: 'b' },
          { id: 3, value: 'c' },
        ]

        // Encrypt all items
        const encResults = await encryptBatch(items)

        // Verify encryption succeeded
        expect(encResults.every(r => r.success)).toBe(true)

        const envelopes = encResults
          .filter((r): r is { success: true; envelope: EncryptedEnvelope } => r.success)
          .map(r => r.envelope)

        expect(envelopes).toHaveLength(3)

        // Decrypt all items (using same mock key since we haven't reset)
        const decResults = await decryptBatch<typeof items[0]>(envelopes)

        expect(decResults).toHaveLength(3)

        // Check each result
        for (let i = 0; i < decResults.length; i++) {
          const result = decResults[i]
          expect(result.success).toBe(true)
          if (result.success) {
            expect(result.data).toEqual(items[i])
          }
        }
      })

      it('handles empty array', async () => {
        const results = await decryptBatch([])

        expect(results).toHaveLength(0)
      })
    })
  })

  describe('Envelope Utilities', () => {
    describe('isEncryptedEnvelope', () => {
      it('returns true for valid envelope', () => {
        const envelope: EncryptedEnvelope = {
          version: 1,
          ciphertext: 'base64data',
          encryptedAt: Date.now(),
        }

        expect(isEncryptedEnvelope(envelope)).toBe(true)
      })

      it('returns true for envelope with optional fields', () => {
        const envelope: EncryptedEnvelope = {
          version: 1,
          ciphertext: 'base64data',
          encryptedAt: Date.now(),
          dataType: 'task',
        }

        expect(isEncryptedEnvelope(envelope)).toBe(true)
      })

      it('returns false for null', () => {
        expect(isEncryptedEnvelope(null)).toBe(false)
      })

      it('returns false for undefined', () => {
        expect(isEncryptedEnvelope(undefined)).toBe(false)
      })

      it('returns false for non-objects', () => {
        expect(isEncryptedEnvelope('string')).toBe(false)
        expect(isEncryptedEnvelope(123)).toBe(false)
        expect(isEncryptedEnvelope(true)).toBe(false)
      })

      it('returns false for missing version', () => {
        expect(isEncryptedEnvelope({
          ciphertext: 'data',
          encryptedAt: 123,
        })).toBe(false)
      })

      it('returns false for wrong version', () => {
        expect(isEncryptedEnvelope({
          version: 2,
          ciphertext: 'data',
          encryptedAt: 123,
        })).toBe(false)
      })

      it('returns false for missing ciphertext', () => {
        expect(isEncryptedEnvelope({
          version: 1,
          encryptedAt: 123,
        })).toBe(false)
      })

      it('returns false for missing encryptedAt', () => {
        expect(isEncryptedEnvelope({
          version: 1,
          ciphertext: 'data',
        })).toBe(false)
      })

      it('returns false for wrong ciphertext type', () => {
        expect(isEncryptedEnvelope({
          version: 1,
          ciphertext: 123,
          encryptedAt: 123,
        })).toBe(false)
      })

      it('returns false for wrong encryptedAt type', () => {
        expect(isEncryptedEnvelope({
          version: 1,
          ciphertext: 'data',
          encryptedAt: 'not-a-number',
        })).toBe(false)
      })

      it('returns false for version 0', () => {
        expect(isEncryptedEnvelope({
          version: 0,
          ciphertext: 'data',
          encryptedAt: 123,
        })).toBe(false)
      })

      it('returns false for version as string "1"', () => {
        expect(isEncryptedEnvelope({
          version: '1',
          ciphertext: 'data',
          encryptedAt: 123,
        })).toBe(false)
      })

      it('returns false for empty object', () => {
        expect(isEncryptedEnvelope({})).toBe(false)
      })

      it('returns false for array', () => {
        expect(isEncryptedEnvelope([])).toBe(false)
        expect(isEncryptedEnvelope([1, 2, 3])).toBe(false)
      })

      it('returns true for empty ciphertext', () => {
        expect(isEncryptedEnvelope({
          version: 1,
          ciphertext: '',
          encryptedAt: 123,
        })).toBe(true)
      })

      it('returns true for very long ciphertext', () => {
        expect(isEncryptedEnvelope({
          version: 1,
          ciphertext: 'a'.repeat(100000),
          encryptedAt: 123,
        })).toBe(true)
      })

      it('returns true for encryptedAt of 0', () => {
        expect(isEncryptedEnvelope({
          version: 1,
          ciphertext: 'data',
          encryptedAt: 0,
        })).toBe(true)
      })

      it('returns true for maximum safe integer encryptedAt', () => {
        expect(isEncryptedEnvelope({
          version: 1,
          ciphertext: 'data',
          encryptedAt: Number.MAX_SAFE_INTEGER,
        })).toBe(true)
      })
    })

    describe('createEnvelope', () => {
      it('creates envelope from raw ciphertext', () => {
        const ciphertext = 'some-encrypted-data'
        const envelope = createEnvelope(ciphertext)

        expect(envelope.version).toBe(1)
        expect(envelope.ciphertext).toBe(ciphertext)
        expect(envelope.encryptedAt).toBeGreaterThan(0)
        expect(envelope.dataType).toBeUndefined()
      })

      it('includes optional dataType', () => {
        const envelope = createEnvelope('data', 'note')

        expect(envelope.dataType).toBe('note')
      })

      it('handles empty ciphertext', () => {
        const envelope = createEnvelope('')
        expect(envelope.ciphertext).toBe('')
      })

      it('preserves special characters in ciphertext', () => {
        const ciphertext = 'abc+/=\n\t🔐'
        const envelope = createEnvelope(ciphertext)
        expect(envelope.ciphertext).toBe(ciphertext)
      })

      it('returns valid envelope per isEncryptedEnvelope', () => {
        const envelope = createEnvelope('test', 'string')
        expect(isEncryptedEnvelope(envelope)).toBe(true)
      })

      it('creates independent envelopes with increasing timestamps', async () => {
        const envelope1 = createEnvelope('first')
        await new Promise(resolve => setTimeout(resolve, 5))
        const envelope2 = createEnvelope('second')

        expect(envelope2.encryptedAt).toBeGreaterThanOrEqual(envelope1.encryptedAt)
      })
    })

    describe('serializeEnvelope / parseEnvelope', () => {
      it('roundtrip preserves envelope', () => {
        const envelope: EncryptedEnvelope = {
          version: 1,
          ciphertext: 'encrypted-content',
          encryptedAt: 1704067200000,
          dataType: 'task',
        }

        const serialized = serializeEnvelope(envelope)
        const parsed = parseEnvelope(serialized)

        expect(parsed).toEqual(envelope)
      })

      it('serializeEnvelope returns valid JSON', () => {
        const envelope: EncryptedEnvelope = {
          version: 1,
          ciphertext: 'test',
          encryptedAt: Date.now(),
        }

        const serialized = serializeEnvelope(envelope)

        expect(() => JSON.parse(serialized)).not.toThrow()
      })

      it('parseEnvelope returns null for invalid JSON', () => {
        expect(parseEnvelope('not-json')).toBe(null)
        expect(parseEnvelope('{invalid')).toBe(null)
      })

      it('parseEnvelope returns null for non-envelope JSON', () => {
        expect(parseEnvelope('{"foo":"bar"}')).toBe(null)
        expect(parseEnvelope('{"version":2}')).toBe(null)
      })

      it('parseEnvelope returns null for empty string', () => {
        expect(parseEnvelope('')).toBe(null)
      })

      it('serializeEnvelope preserves special characters', () => {
        const envelope: EncryptedEnvelope = {
          version: 1,
          ciphertext: 'data+/=\n\t🔐',
          encryptedAt: Date.now(),
          dataType: 'unicode-test',
        }

        const serialized = serializeEnvelope(envelope)
        const parsed = parseEnvelope(serialized)

        expect(parsed?.ciphertext).toBe(envelope.ciphertext)
      })

      it('parseEnvelope handles whitespace in JSON', () => {
        const json = `{
          "version": 1,
          "ciphertext": "test",
          "encryptedAt": 123456
        }`

        const parsed = parseEnvelope(json)

        expect(parsed).not.toBe(null)
        expect(parsed?.version).toBe(1)
        expect(parsed?.ciphertext).toBe('test')
      })

      it('parseEnvelope returns null for array JSON', () => {
        expect(parseEnvelope('[]')).toBe(null)
        expect(parseEnvelope('[1, 2, 3]')).toBe(null)
      })

      it('parseEnvelope returns null for number JSON', () => {
        expect(parseEnvelope('123')).toBe(null)
      })

      it('parseEnvelope returns null for string JSON', () => {
        expect(parseEnvelope('"just a string"')).toBe(null)
      })

      it('parseEnvelope returns null for null JSON', () => {
        expect(parseEnvelope('null')).toBe(null)
      })

      it('parseEnvelope returns null for boolean JSON', () => {
        expect(parseEnvelope('true')).toBe(null)
        expect(parseEnvelope('false')).toBe(null)
      })

      it('parseEnvelope returns null for partial envelope (missing ciphertext)', () => {
        expect(parseEnvelope('{"version":1,"encryptedAt":123}')).toBe(null)
      })

      it('parseEnvelope returns null for partial envelope (missing encryptedAt)', () => {
        expect(parseEnvelope('{"version":1,"ciphertext":"data"}')).toBe(null)
      })

      it('parseEnvelope returns null for wrong version type', () => {
        expect(parseEnvelope('{"version":"1","ciphertext":"data","encryptedAt":123}')).toBe(null)
      })

      it('parseEnvelope accepts envelope with extra properties', () => {
        const json = '{"version":1,"ciphertext":"data","encryptedAt":123,"extraProp":"ignored"}'
        const parsed = parseEnvelope(json)

        expect(parsed).not.toBe(null)
        expect(parsed?.version).toBe(1)
        expect((parsed as Record<string, unknown>)?.extraProp).toBe('ignored')
      })
    })
  })

  describe('Error Handling', () => {
    it('encryptToEnvelope returns error on failure', async () => {
      // Save original implementation
      const originalImpl = mockGetDeviceKey.getMockImplementation()

      // Mock getDeviceKey to throw once
      mockGetDeviceKey.mockRejectedValueOnce(new Error('Key not available'))

      const result = await encryptToEnvelope({ data: 'test' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Key not available')
      }

      // Restore original implementation
      if (originalImpl) {
        mockGetDeviceKey.mockImplementation(originalImpl)
      }
    })

    it('decryptFromEnvelope returns error for tampered ciphertext', async () => {
      const encResult = await encryptToEnvelope({ secret: 'data' })

      expect(encResult.success).toBe(true)
      if (!encResult.success) return

      // Tamper with the ciphertext
      const tampered: EncryptedEnvelope = {
        ...encResult.envelope,
        ciphertext: encResult.envelope.ciphertext.slice(0, -5) + 'XXXXX',
      }

      const decResult = await decryptFromEnvelope(tampered)

      expect(decResult.success).toBe(false)
    })
  })

  describe('Integration', () => {
    it('full roundtrip with various data types', async () => {
      const testCases = [
        'simple string',
        123,
        true,
        null,
        [1, 2, 3],
        { nested: { object: 'value' } },
        { mixed: [1, 'two', { three: 3 }] },
      ]

      for (const original of testCases) {
        const encResult = await encryptToEnvelope(original)
        expect(encResult.success).toBe(true)
        if (!encResult.success) continue

        const decResult = await decryptFromEnvelope(encResult.envelope)
        expect(decResult.success).toBe(true)
        if (decResult.success) {
          expect(decResult.data).toEqual(original)
        }
      }
    })
  })
})
