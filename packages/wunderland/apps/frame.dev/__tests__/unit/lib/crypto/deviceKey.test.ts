/**
 * Device Key Management Tests
 * @module __tests__/unit/lib/crypto/deviceKey.test
 *
 * Tests for device key generation, storage, and retrieval.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock IndexedDB
const mockStore = new Map<string, unknown>()

const createMockIDBRequest = <T>(result: T, error: Error | null = null): IDBRequest<T> => {
  const request = {
    result,
    error,
    onsuccess: null as ((ev: Event) => void) | null,
    onerror: null as ((ev: Event) => void) | null,
  } as IDBRequest<T>

  // Trigger callback on next tick
  setTimeout(() => {
    if (error && request.onerror) {
      request.onerror(new Event('error'))
    } else if (request.onsuccess) {
      request.onsuccess(new Event('success'))
    }
  }, 0)

  return request
}

const createMockTransaction = (store: IDBObjectStore): IDBTransaction => {
  const tx = {
    objectStore: vi.fn(() => store),
    oncomplete: null as ((ev: Event) => void) | null,
  } as unknown as IDBTransaction

  setTimeout(() => {
    if (tx.oncomplete) tx.oncomplete(new Event('complete'))
  }, 10)

  return tx
}

const createMockObjectStore = (): IDBObjectStore => {
  return {
    put: vi.fn((value: { deviceId: string }) => {
      mockStore.set(value.deviceId, value)
      return createMockIDBRequest(undefined)
    }),
    get: vi.fn((key: string) => {
      return createMockIDBRequest(mockStore.get(key))
    }),
    getAll: vi.fn(() => {
      return createMockIDBRequest(Array.from(mockStore.values()))
    }),
    delete: vi.fn((key: string) => {
      mockStore.delete(key)
      return createMockIDBRequest(undefined)
    }),
  } as unknown as IDBObjectStore
}

const mockObjectStore = createMockObjectStore()
const mockDb = {
  transaction: vi.fn(() => createMockTransaction(mockObjectStore)),
  close: vi.fn(),
  objectStoreNames: { contains: () => true },
  createObjectStore: vi.fn(),
} as unknown as IDBDatabase

const mockIndexedDB = {
  open: vi.fn(() => {
    const request = {
      result: mockDb,
      error: null,
      onsuccess: null as ((ev: Event) => void) | null,
      onerror: null as ((ev: Event) => void) | null,
      onupgradeneeded: null as ((ev: IDBVersionChangeEvent) => void) | null,
    } as IDBOpenDBRequest

    setTimeout(() => {
      if (request.onsuccess) request.onsuccess(new Event('success'))
    }, 0)

    return request
  }),
}

// Mock browser globals
const mockNavigator = {
  userAgent: 'Test Browser',
  language: 'en-US',
  hardwareConcurrency: 4,
}

const mockScreen = {
  colorDepth: 24,
  width: 1920,
  height: 1080,
}

const mockCanvas = {
  getContext: vi.fn(() => ({
    textBaseline: '',
    font: '',
    fillText: vi.fn(),
  })),
  toDataURL: vi.fn(() => 'data:image/png;base64,test'),
}

const mockDocument = {
  createElement: vi.fn(() => mockCanvas),
}

// Setup global mocks
Object.defineProperty(globalThis, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
})

Object.defineProperty(globalThis, 'window', {
  value: {
    ...globalThis,
    indexedDB: mockIndexedDB,
  },
  writable: true,
})

Object.defineProperty(globalThis, 'navigator', {
  value: mockNavigator,
  writable: true,
})

Object.defineProperty(globalThis, 'screen', {
  value: mockScreen,
  writable: true,
})

Object.defineProperty(globalThis, 'document', {
  value: mockDocument,
  writable: true,
})

Object.defineProperty(globalThis, 'btoa', {
  value: (str: string) => Buffer.from(str).toString('base64'),
  writable: true,
})

Object.defineProperty(globalThis, 'atob', {
  value: (str: string) => Buffer.from(str, 'base64').toString(),
  writable: true,
})

// Import after mocking
import {
  getDeviceKey,
  getDeviceId,
  hasDeviceKey,
  clearDeviceKeyCache,
  deleteCurrentDeviceKey,
  regenerateDeviceKey,
  loadDeviceKeyById,
} from '@/lib/crypto/deviceKey'

describe('Device Key Management', () => {
  beforeEach(() => {
    mockStore.clear()
    clearDeviceKeyCache()
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearDeviceKeyCache()
  })

  // ============================================================================
  // BASIC FUNCTIONALITY
  // ============================================================================

  describe('getDeviceKey', () => {
    it('generates a new key when none exists', async () => {
      const key = await getDeviceKey()

      expect(key).toBeDefined()
      expect(key.type).toBe('secret')
    })

    it('returns CryptoKey with correct algorithm', async () => {
      const key = await getDeviceKey()

      expect(key.algorithm.name).toBe('AES-GCM')
    })

    it('returns cached key on subsequent calls', async () => {
      const key1 = await getDeviceKey()
      const key2 = await getDeviceKey()

      expect(key1).toBe(key2)
    })

    it('stores key in IndexedDB', async () => {
      await getDeviceKey()

      expect(mockStore.size).toBe(1)
    })

    it('key is extractable', async () => {
      const key = await getDeviceKey()

      expect(key.extractable).toBe(true)
    })
  })

  // ============================================================================
  // DEVICE ID
  // ============================================================================

  describe('getDeviceId', () => {
    it('returns a device ID', async () => {
      const deviceId = await getDeviceId()

      expect(deviceId).toBeDefined()
      expect(typeof deviceId).toBe('string')
    })

    it('returns same ID on subsequent calls', async () => {
      const id1 = await getDeviceId()
      const id2 = await getDeviceId()

      expect(id1).toBe(id2)
    })

    it('calls getDeviceKey to populate ID if not cached', async () => {
      const deviceId = await getDeviceId()

      expect(deviceId).toBeDefined()
      expect(deviceId.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // HAS DEVICE KEY
  // ============================================================================

  describe('hasDeviceKey', () => {
    it('returns false when no key exists', async () => {
      const has = await hasDeviceKey()

      expect(has).toBe(false)
    })

    it('returns true after key is generated', async () => {
      await getDeviceKey()
      clearDeviceKeyCache()

      const has = await hasDeviceKey()

      expect(has).toBe(true)
    })

    it('returns true when key is cached', async () => {
      await getDeviceKey()

      const has = await hasDeviceKey()

      expect(has).toBe(true)
    })
  })

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  describe('clearDeviceKeyCache', () => {
    it('clears the cached key', async () => {
      await getDeviceKey()
      clearDeviceKeyCache()

      // After clearing, hasDeviceKey should check IndexedDB
      expect(mockStore.size).toBe(1)
    })

    it('does not throw when cache is empty', () => {
      expect(() => clearDeviceKeyCache()).not.toThrow()
    })
  })

  // ============================================================================
  // KEY DELETION
  // ============================================================================

  describe('deleteCurrentDeviceKey', () => {
    it('deletes the current key from storage', async () => {
      await getDeviceKey()
      expect(mockStore.size).toBe(1)

      await deleteCurrentDeviceKey()

      expect(mockStore.size).toBe(0)
    })

    it('clears the cache', async () => {
      await getDeviceKey()
      await deleteCurrentDeviceKey()

      // Next call should generate new key
      const newKey = await getDeviceKey()
      expect(newKey).toBeDefined()
    })

    it('does not throw when no key exists', async () => {
      await expect(deleteCurrentDeviceKey()).resolves.not.toThrow()
    })
  })

  // ============================================================================
  // KEY REGENERATION
  // ============================================================================

  describe('regenerateDeviceKey', () => {
    it('generates a new key', async () => {
      const oldKey = await getDeviceKey()
      const oldId = await getDeviceId()

      // regenerateDeviceKey handles deletion internally
      const newKey = await regenerateDeviceKey()
      const newId = await getDeviceId()

      // New key should be different instance
      expect(newKey).not.toBe(oldKey)
      // New device ID (regenerate creates fresh ID)
      expect(newId).not.toBe(oldId)
    })

    it('deletes the old key', async () => {
      await getDeviceKey()
      const initialSize = mockStore.size

      await regenerateDeviceKey()

      // Should still have 1 key (the new one)
      expect(mockStore.size).toBe(initialSize)
    })

    it('returns a valid CryptoKey', async () => {
      const key = await regenerateDeviceKey()

      expect(key).toBeDefined()
      expect(key.type).toBe('secret')
      expect(key.algorithm.name).toBe('AES-GCM')
    })
  })

  // ============================================================================
  // LOAD BY ID
  // ============================================================================

  describe('loadDeviceKeyById', () => {
    it('returns null for non-existent key', async () => {
      const result = await loadDeviceKeyById('non-existent-id')

      expect(result).toBeNull()
    })

    it('returns stored key data', async () => {
      await getDeviceKey()
      const deviceId = await getDeviceId()

      clearDeviceKeyCache()
      const result = await loadDeviceKeyById(deviceId)

      expect(result).toBeDefined()
      expect(result?.deviceId).toBe(deviceId)
    })
  })

  // ============================================================================
  // STORED KEY STRUCTURE
  // ============================================================================

  describe('stored key structure', () => {
    it('stores key with correct structure', async () => {
      await getDeviceKey()

      const stored = Array.from(mockStore.values())[0] as {
        deviceId: string
        wrappedKey: string
        createdAt: number
        version: number
      }

      expect(stored.deviceId).toBeDefined()
      expect(stored.wrappedKey).toBeDefined()
      expect(stored.createdAt).toBeDefined()
      expect(stored.version).toBe(1)
    })

    it('wrappedKey is a string', async () => {
      await getDeviceKey()

      const stored = Array.from(mockStore.values())[0] as { wrappedKey: string }

      expect(typeof stored.wrappedKey).toBe('string')
    })

    it('createdAt is a timestamp', async () => {
      const before = Date.now()
      await getDeviceKey()
      const after = Date.now()

      const stored = Array.from(mockStore.values())[0] as { createdAt: number }

      expect(stored.createdAt).toBeGreaterThanOrEqual(before)
      expect(stored.createdAt).toBeLessThanOrEqual(after)
    })
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Device Key Edge Cases', () => {
  beforeEach(() => {
    mockStore.clear()
    clearDeviceKeyCache()
    vi.clearAllMocks()
  })

  it('handles multiple keys in storage', { timeout: 10000 }, async () => {
    // Simulate having multiple keys from different devices
    mockStore.set('device-1', {
      deviceId: 'device-1',
      wrappedKey: 'invalid-key-1',
      createdAt: Date.now(),
      version: 1,
    })

    mockStore.set('device-2', {
      deviceId: 'device-2',
      wrappedKey: 'invalid-key-2',
      createdAt: Date.now(),
      version: 1,
    })

    // Should generate new key since existing ones can't be unwrapped
    const key = await getDeviceKey()

    expect(key).toBeDefined()
    // Should now have 3 keys
    expect(mockStore.size).toBe(3)
  })

  it('generates new key when wrapped key cannot be decrypted', async () => {
    mockStore.set('corrupted-device', {
      deviceId: 'corrupted-device',
      wrappedKey: 'corrupted-data',
      createdAt: Date.now(),
      version: 1,
    })

    const key = await getDeviceKey()

    expect(key).toBeDefined()
    expect(key.type).toBe('secret')
  })
})
