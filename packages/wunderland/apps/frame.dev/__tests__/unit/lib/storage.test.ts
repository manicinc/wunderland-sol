/**
 * Storage Abstraction Layer Tests
 * @module __tests__/unit/lib/storage.test
 *
 * Tests for unified storage interface with multiple backends.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  Storage,
  type StorageBackend,
  type StorageOptions,
  type ExportData,
} from '@/lib/storage'

// ============================================================================
// Mock localStorage
// ============================================================================

const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => {
      store = newStore
    },
  }
}

describe('Storage', () => {
  let mockStorage: ReturnType<typeof createLocalStorageMock>

  beforeEach(() => {
    mockStorage = createLocalStorageMock()
    vi.stubGlobal('localStorage', mockStorage)
    vi.stubGlobal('window', { localStorage: mockStorage })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  // ============================================================================
  // Constructor and Backend Selection
  // ============================================================================

  describe('constructor', () => {
    it('creates storage with default options', () => {
      const storage = new Storage()
      // Default backend in browser is 'sql', but falls back to localStorage
      expect(storage.getBackend()).toBeDefined()
    })

    it('uses memory backend when window is undefined', () => {
      vi.stubGlobal('window', undefined)
      const storage = new Storage()
      expect(storage.getBackend()).toBe('memory')
    })

    it('respects explicit backend option', () => {
      const storage = new Storage({ backend: 'localStorage' })
      expect(storage.getBackend()).toBe('localStorage')
    })

    it('respects memory backend option', () => {
      const storage = new Storage({ backend: 'memory' })
      expect(storage.getBackend()).toBe('memory')
    })

    it('uses custom namespace', async () => {
      const storage = new Storage({
        backend: 'localStorage',
        namespace: 'custom-ns'
      })
      await storage.set('testKey', 'testValue')
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'custom-ns:testKey',
        expect.any(String)
      )
    })
  })

  // ============================================================================
  // Memory Backend Tests
  // ============================================================================

  describe('memory backend', () => {
    let storage: Storage

    beforeEach(async () => {
      storage = new Storage({ backend: 'memory', namespace: 'test-mem' })
      // Clear any leftover state from previous tests
      await storage.clear()
    })

    describe('get', () => {
      it('returns default value for non-existent key', async () => {
        const result = await storage.get('non-existent', 'default')
        expect(result).toBe('default')
      })

      it('returns stored value', async () => {
        await storage.set('key', { foo: 'bar' })
        const result = await storage.get('key', null)
        expect(result).toEqual({ foo: 'bar' })
      })
    })

    describe('set', () => {
      it('stores value and returns true', async () => {
        const result = await storage.set('key', 'value')
        expect(result).toBe(true)
      })

      it('stores complex objects', async () => {
        const data = { nested: { array: [1, 2, 3] } }
        await storage.set('complex', data)
        const result = await storage.get('complex', null)
        expect(result).toEqual(data)
      })

      it('overwrites existing values', async () => {
        await storage.set('key', 'first')
        await storage.set('key', 'second')
        const result = await storage.get('key', null)
        expect(result).toBe('second')
      })
    })

    describe('remove', () => {
      it('removes existing key', async () => {
        await storage.set('key', 'value')
        const removed = await storage.remove('key')
        expect(removed).toBe(true)
        const result = await storage.get('key', 'default')
        expect(result).toBe('default')
      })

      it('returns false for non-existent key', async () => {
        const removed = await storage.remove('non-existent')
        expect(removed).toBe(false)
      })
    })

    describe('has', () => {
      it('returns true for existing key', async () => {
        await storage.set('key', 'value')
        expect(await storage.has('key')).toBe(true)
      })

      it('returns false for non-existent key', async () => {
        expect(await storage.has('non-existent')).toBe(false)
      })
    })

    describe('keys', () => {
      it('returns empty array when no keys', async () => {
        const keys = await storage.keys()
        expect(keys).toEqual([])
      })

      it('returns all keys in namespace', async () => {
        await storage.set('key1', 'value1')
        await storage.set('key2', 'value2')
        const keys = await storage.keys()
        expect(keys).toContain('key1')
        expect(keys).toContain('key2')
        expect(keys).toHaveLength(2)
      })
    })

    describe('clear', () => {
      it('removes all keys in namespace', async () => {
        await storage.set('key1', 'value1')
        await storage.set('key2', 'value2')
        const cleared = await storage.clear()
        expect(cleared).toBe(true)
        const keys = await storage.keys()
        expect(keys).toEqual([])
      })
    })
  })

  // ============================================================================
  // localStorage Backend Tests
  // ============================================================================

  describe('localStorage backend', () => {
    let storage: Storage

    beforeEach(async () => {
      storage = new Storage({ backend: 'localStorage', namespace: 'test-ls' })
    })

    describe('get', () => {
      it('returns default value for non-existent key', async () => {
        const result = await storage.get('missing', { default: true })
        expect(result).toEqual({ default: true })
      })

      it('returns parsed stored value', async () => {
        mockStorage._setStore({ 'test-ls:key': JSON.stringify({ data: 123 }) })
        const result = await storage.get('key', null)
        expect(result).toEqual({ data: 123 })
      })

      it('returns default on parse error', async () => {
        mockStorage._setStore({ 'test-ls:bad': 'not valid json{' })
        const result = await storage.get('bad', 'fallback')
        expect(result).toBe('fallback')
      })
    })

    describe('set', () => {
      it('stores serialized value', async () => {
        await storage.set('key', { test: true })
        expect(mockStorage.setItem).toHaveBeenCalledWith(
          'test-ls:key',
          JSON.stringify({ test: true })
        )
      })

      it('returns true on success', async () => {
        const result = await storage.set('key', 'value')
        expect(result).toBe(true)
      })
    })

    describe('remove', () => {
      it('removes key from localStorage', async () => {
        await storage.set('key', 'value')
        await storage.remove('key')
        expect(mockStorage.removeItem).toHaveBeenCalledWith('test-ls:key')
      })
    })

    describe('has', () => {
      it('checks localStorage for key', async () => {
        mockStorage._setStore({ 'test-ls:exists': '"value"' })
        expect(await storage.has('exists')).toBe(true)
        expect(await storage.has('missing')).toBe(false)
      })
    })

    describe('keys', () => {
      it('returns keys matching namespace', async () => {
        mockStorage._setStore({
          'test-ls:key1': '"a"',
          'test-ls:key2': '"b"',
          'other-ns:key3': '"c"',
        })
        const keys = await storage.keys()
        expect(keys).toContain('key1')
        expect(keys).toContain('key2')
        expect(keys).not.toContain('key3')
      })
    })
  })

  // ============================================================================
  // Export/Import Tests
  // ============================================================================

  describe('export', () => {
    let storage: Storage

    beforeEach(() => {
      storage = new Storage({ backend: 'memory', namespace: 'export-test' })
    })

    it('exports all data with metadata', async () => {
      await storage.set('key1', 'value1')
      await storage.set('key2', { nested: true })

      const exported = await storage.export()

      expect(exported.metadata).toBeDefined()
      expect(exported.metadata.namespace).toBe('export-test')
      expect(exported.metadata.checksum).toBeDefined()
      expect(exported.metadata.exportedAt).toBeDefined()
      expect(exported.data.key1).toBe('value1')
      expect(exported.data.key2).toEqual({ nested: true })
    })

    it('skips internal keys starting with _', async () => {
      await storage.set('_internal', 'hidden')
      await storage.set('public', 'visible')

      const exported = await storage.export()

      expect(exported.data._internal).toBeUndefined()
      expect(exported.data.public).toBe('visible')
    })
  })

  describe('import', () => {
    let storage: Storage

    beforeEach(() => {
      storage = new Storage({ backend: 'memory', namespace: 'import-test' })
    })

    it('imports data from export', async () => {
      const exportData: ExportData = {
        metadata: {
          version: 1,
          exportedAt: new Date().toISOString(),
          namespace: 'import-test',
          checksum: '0', // Will be validated
        },
        data: {
          imported1: 'value1',
          imported2: { nested: true },
        },
      }

      // Calculate correct checksum
      const serialized = JSON.stringify(exportData.data)
      let hash = 0
      for (let i = 0; i < serialized.length; i++) {
        const char = serialized.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
      }
      exportData.metadata.checksum = Math.abs(hash).toString(16)

      const result = await storage.import(exportData)

      expect(result.success).toBe(true)
      expect(result.imported).toBe(2)
      expect(await storage.get('imported1', null)).toBe('value1')
      expect(await storage.get('imported2', null)).toEqual({ nested: true })
    })

    it('fails on checksum mismatch when validation enabled', async () => {
      const exportData: ExportData = {
        metadata: {
          version: 1,
          exportedAt: new Date().toISOString(),
          namespace: 'import-test',
          checksum: 'invalid',
        },
        data: { key: 'value' },
      }

      const result = await storage.import(exportData, { validate: true })

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('Checksum validation failed')
    })

    it('skips validation when disabled', async () => {
      const exportData: ExportData = {
        metadata: {
          version: 1,
          exportedAt: new Date().toISOString(),
          namespace: 'import-test',
          checksum: 'wrong',
        },
        data: { key: 'value' },
      }

      const result = await storage.import(exportData, { validate: false })

      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
    })

    it('merges with existing data when merge option is true', async () => {
      await storage.set('existing', 'keep me')

      const exportData: ExportData = {
        metadata: {
          version: 1,
          exportedAt: new Date().toISOString(),
          namespace: 'import-test',
          checksum: 'x',
        },
        data: { new: 'data' },
      }

      await storage.import(exportData, { merge: true, validate: false })

      expect(await storage.get('existing', null)).toBe('keep me')
      expect(await storage.get('new', null)).toBe('data')
    })

    it('clears existing data when merge is false', async () => {
      await storage.set('old', 'data')

      const exportData: ExportData = {
        metadata: {
          version: 1,
          exportedAt: new Date().toISOString(),
          namespace: 'import-test',
          checksum: 'x',
        },
        data: { new: 'data' },
      }

      await storage.import(exportData, { merge: false, validate: false })

      expect(await storage.get('old', 'default')).toBe('default')
      expect(await storage.get('new', null)).toBe('data')
    })
  })

  // ============================================================================
  // Metadata Tests
  // ============================================================================

  describe('getMetadata', () => {
    it('returns metadata about storage', async () => {
      const storage = new Storage({ backend: 'memory', namespace: 'meta-test', version: 2 })
      await storage.set('key', 'value')

      const metadata = await storage.getMetadata()

      expect(metadata.version).toBe(2)
      expect(metadata.backend).toBe('memory')
      expect(metadata.size).toBeGreaterThan(0)
      expect(metadata.updatedAt).toBeDefined()
    })
  })

  // ============================================================================
  // getBackend Tests
  // ============================================================================

  describe('getBackend', () => {
    it('returns current backend type', () => {
      const memStorage = new Storage({ backend: 'memory' })
      expect(memStorage.getBackend()).toBe('memory')

      const lsStorage = new Storage({ backend: 'localStorage' })
      expect(lsStorage.getBackend()).toBe('localStorage')
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('handles null values', async () => {
      const storage = new Storage({ backend: 'memory' })
      await storage.set('null-key', null)
      const result = await storage.get('null-key', 'default')
      expect(result).toBeNull()
    })

    it('handles undefined in objects', async () => {
      const storage = new Storage({ backend: 'memory' })
      const data = { a: 1, b: undefined }
      await storage.set('undef', data)
      // JSON.stringify strips undefined values
      const result = await storage.get<{ a: number; b?: undefined }>('undef', { a: 0 })
      expect(result.a).toBe(1)
      expect('b' in result).toBe(false) // b is stripped
    })

    it('handles arrays', async () => {
      const storage = new Storage({ backend: 'memory' })
      await storage.set('arr', [1, 2, 3])
      const result = await storage.get('arr', [])
      expect(result).toEqual([1, 2, 3])
    })

    it('handles empty strings', async () => {
      const storage = new Storage({ backend: 'memory' })
      await storage.set('empty', '')
      const result = await storage.get('empty', 'default')
      expect(result).toBe('')
    })

    it('handles numbers including zero', async () => {
      const storage = new Storage({ backend: 'memory' })
      await storage.set('zero', 0)
      const result = await storage.get('zero', 999)
      expect(result).toBe(0)
    })

    it('handles boolean false', async () => {
      const storage = new Storage({ backend: 'memory' })
      await storage.set('false', false)
      const result = await storage.get('false', true)
      expect(result).toBe(false)
    })

    it('handles deeply nested objects', async () => {
      const storage = new Storage({ backend: 'memory' })
      const deep = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      }
      await storage.set('deep', deep)
      const result = await storage.get('deep', null)
      expect(result).toEqual(deep)
    })

    it('handles special characters in keys', async () => {
      const storage = new Storage({ backend: 'memory' })
      await storage.set('key:with:colons', 'value1')
      await storage.set('key/with/slashes', 'value2')
      await storage.set('key with spaces', 'value3')

      expect(await storage.get('key:with:colons', null)).toBe('value1')
      expect(await storage.get('key/with/slashes', null)).toBe('value2')
      expect(await storage.get('key with spaces', null)).toBe('value3')
    })

    it('handles unicode in values', async () => {
      const storage = new Storage({ backend: 'memory' })
      await storage.set('unicode', '你好世界 🌍 مرحبا')
      const result = await storage.get('unicode', '')
      expect(result).toBe('你好世界 🌍 مرحبا')
    })

    it('handles large data', async () => {
      const storage = new Storage({ backend: 'memory' })
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: 'x'.repeat(100),
      }))
      await storage.set('large', largeArray)
      const result = await storage.get<typeof largeArray>('large', [])
      expect(result.length).toBe(1000)
      expect(result[500].id).toBe(500)
    })
  })

  // ============================================================================
  // Concurrent Operations
  // ============================================================================

  describe('concurrent operations', () => {
    it('handles concurrent writes', async () => {
      const storage = new Storage({ backend: 'memory' })

      await Promise.all([
        storage.set('key1', 'value1'),
        storage.set('key2', 'value2'),
        storage.set('key3', 'value3'),
      ])

      expect(await storage.get('key1', null)).toBe('value1')
      expect(await storage.get('key2', null)).toBe('value2')
      expect(await storage.get('key3', null)).toBe('value3')
    })

    it('handles concurrent reads', async () => {
      const storage = new Storage({ backend: 'memory' })
      await storage.set('shared', 'value')

      const results = await Promise.all([
        storage.get('shared', null),
        storage.get('shared', null),
        storage.get('shared', null),
      ])

      expect(results).toEqual(['value', 'value', 'value'])
    })
  })

  // ============================================================================
  // SSR Safety
  // ============================================================================

  describe('SSR safety', () => {
    it('uses memory backend when window is undefined', async () => {
      vi.stubGlobal('window', undefined)

      const storage = new Storage()
      expect(storage.getBackend()).toBe('memory')

      // Should not throw
      await storage.set('key', 'value')
      expect(await storage.get('key', null)).toBe('value')
    })

    it('localStorage backend returns defaults when browser unavailable', async () => {
      vi.stubGlobal('window', undefined)
      vi.stubGlobal('localStorage', undefined)

      const storage = new Storage({ backend: 'localStorage' })
      // Backend selection happens in constructor based on isBrowser()
      // which returns false when window is undefined
      expect(storage.getBackend()).toBe('memory')
    })
  })

  // ============================================================================
  // Namespace Isolation
  // ============================================================================

  describe('namespace isolation', () => {
    it('different namespaces are isolated', async () => {
      const storage1 = new Storage({ backend: 'memory', namespace: 'ns1' })
      const storage2 = new Storage({ backend: 'memory', namespace: 'ns2' })

      await storage1.set('key', 'value1')
      await storage2.set('key', 'value2')

      expect(await storage1.get('key', null)).toBe('value1')
      expect(await storage2.get('key', null)).toBe('value2')
    })

    it('clear only affects own namespace', async () => {
      const storage1 = new Storage({ backend: 'memory', namespace: 'clear1' })
      const storage2 = new Storage({ backend: 'memory', namespace: 'clear2' })

      await storage1.set('key', 'value1')
      await storage2.set('key', 'value2')

      await storage1.clear()

      expect(await storage1.get('key', 'default')).toBe('default')
      expect(await storage2.get('key', null)).toBe('value2')
    })

    it('keys returns only keys in own namespace', async () => {
      const storage1 = new Storage({ backend: 'memory', namespace: 'keys1' })
      const storage2 = new Storage({ backend: 'memory', namespace: 'keys2' })

      await storage1.set('key1', 'v1')
      await storage2.set('key2', 'v2')

      const keys1 = await storage1.keys()
      const keys2 = await storage2.keys()

      expect(keys1).toContain('key1')
      expect(keys1).not.toContain('key2')
      expect(keys2).toContain('key2')
      expect(keys2).not.toContain('key1')
    })
  })
})
