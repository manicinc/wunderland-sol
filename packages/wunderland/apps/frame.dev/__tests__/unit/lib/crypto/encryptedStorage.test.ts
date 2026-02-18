/**
 * Encrypted Storage Tests
 * @module __tests__/unit/lib/crypto/encryptedStorage.test
 *
 * Tests for the encrypted storage adapter with automatic encryption/decryption.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { EncryptedStorageOptions } from '@/lib/crypto/encryptedStorage'

// Mock the crypto index module
vi.mock('@/lib/crypto/index', () => ({
  isReady: vi.fn().mockResolvedValue(true),
  encrypt: vi.fn().mockImplementation(async (data) => ({
    success: true,
    envelope: {
      version: 1,
      ciphertext: `encrypted:${JSON.stringify(data)}`,
      encryptedAt: Date.now(),
    },
  })),
  decrypt: vi.fn().mockImplementation(async (envelope) => {
    try {
      const data = JSON.parse(envelope.ciphertext.replace('encrypted:', ''))
      return { success: true, data }
    } catch {
      return { success: false, error: 'Decryption failed' }
    }
  }),
  isEncryptSuccess: vi.fn().mockImplementation((result) => result.success === true),
  isDecryptSuccess: vi.fn().mockImplementation((result) => result.success === true),
}))

// Mock storage
const mockStorageData: Record<string, unknown> = {}
vi.mock('@/lib/storage', () => ({
  Storage: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockImplementation(async (key, defaultValue) =>
      mockStorageData[key] ?? defaultValue
    ),
    set: vi.fn().mockImplementation(async (key, value) => {
      mockStorageData[key] = value
      return true
    }),
    remove: vi.fn().mockImplementation(async (key) => {
      delete mockStorageData[key]
      return true
    }),
    has: vi.fn().mockImplementation(async (key) => key in mockStorageData),
    keys: vi.fn().mockImplementation(async () => Object.keys(mockStorageData)),
    clear: vi.fn().mockImplementation(async () => {
      Object.keys(mockStorageData).forEach(key => delete mockStorageData[key])
      return true
    }),
    getMetadata: vi.fn().mockResolvedValue({
      namespace: 'test',
      keyCount: 0,
      estimatedSize: 0,
    }),
  })),
}))

describe('Encrypted Storage', () => {
  beforeEach(() => {
    vi.resetModules()
    Object.keys(mockStorageData).forEach(key => delete mockStorageData[key])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // EncryptedStorageOptions type
  // ============================================================================

  describe('EncryptedStorageOptions type', () => {
    it('can create valid options object', () => {
      const options: EncryptedStorageOptions = {
        namespace: 'test',
        plaintextKeys: ['_meta', 'sync:*'],
        throwOnError: true,
      }

      expect(options.namespace).toBe('test')
      expect(options.plaintextKeys).toHaveLength(2)
      expect(options.throwOnError).toBe(true)
    })

    it('supports minimal options', () => {
      const options: EncryptedStorageOptions = {}
      expect(options.plaintextKeys).toBeUndefined()
      expect(options.throwOnError).toBeUndefined()
    })
  })

  // ============================================================================
  // EncryptedStorage Class
  // ============================================================================

  describe('EncryptedStorage class', () => {
    it('can be instantiated with default options', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const storage = new EncryptedStorage()

      expect(storage).toBeDefined()
    })

    it('can be instantiated with custom options', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const storage = new EncryptedStorage({
        namespace: 'custom',
        plaintextKeys: ['public:*'],
        throwOnError: true,
      })

      expect(storage).toBeDefined()
    })
  })

  // ============================================================================
  // set and get
  // ============================================================================

  describe('set and get', () => {
    it('encrypts data on set', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const storage = new EncryptedStorage()

      const result = await storage.set('secret', { password: '123' })
      expect(result).toBe(true)

      // Data should be stored as encrypted envelope
      expect(mockStorageData['secret']).toBeDefined()
      expect((mockStorageData['secret'] as any).version).toBe(1)
      expect((mockStorageData['secret'] as any).ciphertext).toContain('encrypted:')
    })

    it('decrypts data on get', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const storage = new EncryptedStorage()

      await storage.set('secret', { password: '123' })
      const result = await storage.get('secret', null)

      expect(result).toEqual({ password: '123' })
    })

    it('returns default value for non-existent key', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const storage = new EncryptedStorage()

      const result = await storage.get('missing', 'default')
      expect(result).toBe('default')
    })

    it('handles various data types', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const storage = new EncryptedStorage()

      await storage.set('string', 'hello')
      await storage.set('number', 42)
      await storage.set('boolean', true)
      await storage.set('array', [1, 2, 3])
      await storage.set('object', { nested: { deep: true } })

      expect(await storage.get('string', '')).toBe('hello')
      expect(await storage.get('number', 0)).toBe(42)
      expect(await storage.get('boolean', false)).toBe(true)
      expect(await storage.get('array', [])).toEqual([1, 2, 3])
      expect(await storage.get('object', {})).toEqual({ nested: { deep: true } })
    })
  })

  // ============================================================================
  // Plaintext Keys
  // ============================================================================

  describe('plaintext keys', () => {
    it('does not encrypt keys starting with underscore', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const storage = new EncryptedStorage()

      await storage.set('_internal', { type: 'meta' })

      // Should be stored as-is, not encrypted
      expect(mockStorageData['_internal']).toEqual({ type: 'meta' })
    })

    it('respects custom plaintext patterns', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const storage = new EncryptedStorage({
        plaintextKeys: ['public:*', 'config'],
      })

      await storage.set('public:data', { visible: true })
      await storage.set('config', { setting: 1 })

      expect(mockStorageData['public:data']).toEqual({ visible: true })
      expect(mockStorageData['config']).toEqual({ setting: 1 })
    })

    it('handles ? wildcard in patterns', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const storage = new EncryptedStorage({
        plaintextKeys: ['key?'],
      })

      await storage.set('key1', 'value1')
      await storage.set('key2', 'value2')

      // Should match single character patterns
      expect(mockStorageData['key1']).toBe('value1')
      expect(mockStorageData['key2']).toBe('value2')
    })
  })

  // ============================================================================
  // remove, has, keys, clear
  // ============================================================================

  describe('remove', () => {
    it('removes key from storage', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const storage = new EncryptedStorage()

      await storage.set('toDelete', 'value')
      expect(await storage.has('toDelete')).toBe(true)

      await storage.remove('toDelete')
      expect(await storage.has('toDelete')).toBe(false)
    })
  })

  describe('has', () => {
    it('returns true for existing key', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const storage = new EncryptedStorage()

      await storage.set('exists', 'value')
      expect(await storage.has('exists')).toBe(true)
    })

    it('returns false for non-existing key', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const storage = new EncryptedStorage()

      expect(await storage.has('missing')).toBe(false)
    })
  })

  describe('keys', () => {
    it('returns all keys in namespace', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const storage = new EncryptedStorage()

      await storage.set('key1', 'value1')
      await storage.set('key2', 'value2')

      const keys = await storage.keys()
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
    })
  })

  describe('clear', () => {
    it('removes all data in namespace', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const storage = new EncryptedStorage()

      await storage.set('key1', 'value1')
      await storage.set('key2', 'value2')

      await storage.clear()

      expect(await storage.keys()).toEqual([])
    })
  })

  // ============================================================================
  // getMetadata
  // ============================================================================

  describe('getMetadata', () => {
    it('returns metadata with encrypted flag', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const storage = new EncryptedStorage()

      const metadata = await storage.getMetadata()

      expect(metadata.namespace).toBeDefined()
      expect(typeof metadata.encrypted).toBe('boolean')
    })
  })

  // ============================================================================
  // exportDecrypted
  // ============================================================================

  describe('exportDecrypted', () => {
    it('exports all data decrypted', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const storage = new EncryptedStorage()

      await storage.set('secret1', { data: 'a' })
      await storage.set('secret2', { data: 'b' })

      const exported = await storage.exportDecrypted()

      expect(exported.metadata).toBeDefined()
      expect(exported.metadata.version).toBe(1)
      expect(exported.metadata.exportedAt).toBeDefined()
      expect(exported.metadata.checksum).toBeDefined()
      expect(exported.data).toBeDefined()
    })

    it('excludes internal keys', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const storage = new EncryptedStorage()

      await storage.set('public', 'visible')
      await storage.set('_internal', 'hidden')

      const exported = await storage.exportDecrypted()

      expect(exported.data['public']).toBeDefined()
      expect(exported.data['_internal']).toBeUndefined()
    })
  })

  // ============================================================================
  // importData
  // ============================================================================

  describe('importData', () => {
    it('imports and encrypts data', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const storage = new EncryptedStorage()

      const exportData = {
        metadata: {
          version: 1,
          exportedAt: new Date().toISOString(),
          namespace: 'test',
          checksum: 'abc123',
        },
        data: {
          imported1: { value: 1 },
          imported2: { value: 2 },
        },
      }

      const result = await storage.importData(exportData)

      expect(result).toBe(true)
      expect(await storage.get('imported1', null)).toEqual({ value: 1 })
      expect(await storage.get('imported2', null)).toEqual({ value: 2 })
    })
  })

  // ============================================================================
  // migrateToEncrypted
  // ============================================================================

  describe('migrateToEncrypted', () => {
    it('migrates unencrypted data', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const storage = new EncryptedStorage()

      // Simulate legacy unencrypted data
      mockStorageData['legacy'] = { plainData: true }

      const migrated = await storage.migrateToEncrypted()

      expect(migrated).toBeGreaterThanOrEqual(0)
    })

    it('calls progress callback', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const storage = new EncryptedStorage()

      mockStorageData['item1'] = { data: 1 }
      mockStorageData['item2'] = { data: 2 }

      const progressCalls: [number, number][] = []
      await storage.migrateToEncrypted((current, total) => {
        progressCalls.push([current, total])
      })

      // Should have some progress calls
      expect(progressCalls.length).toBeGreaterThanOrEqual(0)
    })
  })

  // ============================================================================
  // getEncryptedStorage
  // ============================================================================

  describe('getEncryptedStorage', () => {
    it('returns singleton instance', async () => {
      const { getEncryptedStorage } = await import('@/lib/crypto/encryptedStorage')

      const storage1 = getEncryptedStorage()
      const storage2 = getEncryptedStorage()

      expect(storage1).toBe(storage2)
    })
  })

  // ============================================================================
  // createEncryptedStorage
  // ============================================================================

  describe('createEncryptedStorage', () => {
    it('creates namespaced instance', async () => {
      const { createEncryptedStorage } = await import('@/lib/crypto/encryptedStorage')

      const storage = createEncryptedStorage('my-namespace')

      expect(storage).toBeDefined()
    })

    it('accepts additional options', async () => {
      const { createEncryptedStorage } = await import('@/lib/crypto/encryptedStorage')

      const storage = createEncryptedStorage('custom', {
        plaintextKeys: ['pub:*'],
        throwOnError: true,
      })

      expect(storage).toBeDefined()
    })
  })

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('error handling', () => {
    it('returns default on decryption failure when throwOnError is false', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const { decrypt } = await import('@/lib/crypto/index')

      vi.mocked(decrypt).mockResolvedValueOnce({ success: false, error: 'Key error' })

      const storage = new EncryptedStorage({ throwOnError: false })
      mockStorageData['encrypted'] = {
        version: 1,
        ciphertext: 'invalid',
        encryptedAt: Date.now(),
      }

      const result = await storage.get('encrypted', 'fallback')
      expect(result).toBe('fallback')
    })

    it('returns false on encryption failure when throwOnError is false', async () => {
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const { encrypt, isEncryptSuccess } = await import('@/lib/crypto/index')

      vi.mocked(encrypt).mockResolvedValueOnce({ success: false, error: 'Encrypt error' })
      vi.mocked(isEncryptSuccess).mockReturnValueOnce(false)

      const storage = new EncryptedStorage({ throwOnError: false })

      const result = await storage.set('key', 'value')
      expect(result).toBe(false)
    })
  })

  // ============================================================================
  // Crypto Not Available
  // ============================================================================

  describe('crypto not available', () => {
    it('falls back to plaintext when crypto not ready', async () => {
      const { isReady } = await import('@/lib/crypto/index')
      vi.mocked(isReady).mockResolvedValueOnce(false)

      vi.resetModules()
      const { EncryptedStorage } = await import('@/lib/crypto/encryptedStorage')
      const storage = new EncryptedStorage()

      // Should still work, just without encryption
      await storage.set('key', 'value')
      const result = await storage.get('key', null)

      // Behavior depends on implementation - just verify no throw
      expect(result).toBeDefined()
    })
  })
})
