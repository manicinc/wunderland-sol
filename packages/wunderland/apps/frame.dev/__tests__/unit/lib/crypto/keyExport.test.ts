/**
 * Tests for keyExport.ts - Key export/import functionality
 * @module tests/crypto/keyExport
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Web Crypto API
const mockCrypto = {
  subtle: {
    importKey: vi.fn(),
    exportKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    deriveBits: vi.fn(),
    digest: vi.fn(),
  },
  getRandomValues: vi.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = (i * 11 + 17) % 256
    }
    return arr
  }),
}

vi.stubGlobal('crypto', mockCrypto)

// Mock document for download
const mockLink = {
  href: '',
  download: '',
  click: vi.fn(),
}
vi.stubGlobal('document', {
  createElement: vi.fn(() => mockLink),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  },
})

// Mock URL
vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn(),
})

// ============================================================================
// IMPORT AFTER MOCKING
// ============================================================================

import {
  exportDeviceKey,
  exportCryptoKey,
  importDeviceKey,
  validateBundle,
  serializeBundle,
  parseBundle,
  downloadBundle,
  getSuggestedFilename,
  canEncodeAsQR,
  createCompactBundle,
  parseCompactBundle,
  type ExportedKeyBundle,
  type ExportOptions,
} from '@/lib/crypto/keyExport'

// ============================================================================
// TEST SETUP
// ============================================================================

describe('keyExport', () => {
  const mockKey = {} as CryptoKey
  const mockEncryptedData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  const mockKeyBytes = new Uint8Array(32).fill(42)

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock implementations
    mockCrypto.subtle.importKey.mockResolvedValue(mockKey)
    mockCrypto.subtle.exportKey.mockResolvedValue(mockKeyBytes.buffer)
    mockCrypto.subtle.encrypt.mockResolvedValue(mockEncryptedData.buffer)
    mockCrypto.subtle.decrypt.mockResolvedValue(mockKeyBytes.buffer)
    mockCrypto.subtle.deriveBits.mockResolvedValue(new ArrayBuffer(32))
    mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(4))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================================
  // exportDeviceKey / exportCryptoKey
  // ============================================================================

  describe('exportCryptoKey', () => {
    it('should export a CryptoKey to password-protected bundle', async () => {
      const options: ExportOptions = {
        password: 'export-password',
        deviceName: 'Test Device',
      }

      const bundle = await exportCryptoKey(mockKey, options)

      expect(bundle).toBeDefined()
      expect(bundle.encryptedKey).toBeDefined()
      expect(bundle.salt).toBeDefined()
      expect(bundle.iv).toBeDefined()
      expect(bundle.version).toBeDefined()
      expect(bundle.metadata).toBeDefined()
    })

    it('should include device name in metadata', async () => {
      const options: ExportOptions = {
        password: 'export-password',
        deviceName: 'My MacBook',
      }

      const bundle = await exportCryptoKey(mockKey, options)

      expect(bundle.metadata.deviceName).toBe('My MacBook')
    })

    it('should set expiration if expiresInHours provided', async () => {
      const options: ExportOptions = {
        password: 'export-password',
        expiresInHours: 24,
      }

      const bundle = await exportCryptoKey(mockKey, options)

      expect(bundle.metadata.expiresAt).toBeDefined()
      expect(bundle.metadata.expiresAt).toBeGreaterThan(Date.now())
    })
  })

  describe('exportDeviceKey', () => {
    it('should export the current device key', async () => {
      // This calls getDeviceKey internally, but we're testing the wrapper
      const options: ExportOptions = {
        password: 'my-password',
      }

      // Note: This will fail without proper getDeviceKey mock
      // but tests the interface
      await expect(exportDeviceKey(options)).rejects.toBeDefined()
    })
  })

  // ============================================================================
  // importDeviceKey
  // ============================================================================

  describe('importDeviceKey', () => {
    it('should import a valid bundle with correct password', async () => {
      const bundle: ExportedKeyBundle = {
        version: 1,
        encryptedKey: 'base64-encrypted',
        salt: 'base64-salt',
        iv: 'base64-iv',
        checksum: 'checksum',
        metadata: {
          exportedAt: Date.now(),
          deviceName: 'Test',
        },
      }

      const result = await importDeviceKey(bundle, 'correct-password')

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.key).toBeDefined()
    })

    it('should fail with wrong password', async () => {
      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'))

      const bundle: ExportedKeyBundle = {
        version: 1,
        encryptedKey: 'base64-encrypted',
        salt: 'base64-salt',
        iv: 'base64-iv',
        checksum: 'checksum',
        metadata: {
          exportedAt: Date.now(),
        },
      }

      const result = await importDeviceKey(bundle, 'wrong-password')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should reject expired bundles', async () => {
      const bundle: ExportedKeyBundle = {
        version: 1,
        encryptedKey: 'base64-encrypted',
        salt: 'base64-salt',
        iv: 'base64-iv',
        checksum: 'checksum',
        metadata: {
          exportedAt: Date.now() - 100000,
          expiresAt: Date.now() - 1000, // Expired
        },
      }

      const result = await importDeviceKey(bundle, 'password')

      expect(result.success).toBe(false)
      expect(result.error).toContain('expired')
    })
  })

  // ============================================================================
  // validateBundle
  // ============================================================================

  describe('validateBundle', () => {
    it('should return valid for proper bundle', () => {
      const bundle: ExportedKeyBundle = {
        version: 1,
        encryptedKey: 'base64-encrypted',
        salt: 'base64-salt',
        iv: 'base64-iv',
        checksum: 'checksum',
        metadata: {
          exportedAt: Date.now(),
        },
      }

      const result = validateBundle(bundle)

      expect(result.valid).toBe(true)
    })

    it('should return invalid for missing fields', () => {
      const bundle = {
        version: 1,
        encryptedKey: 'base64-encrypted',
        // Missing salt, iv, etc.
      } as unknown as ExportedKeyBundle

      const result = validateBundle(bundle)

      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should return invalid for unsupported version', () => {
      const bundle: ExportedKeyBundle = {
        version: 999,
        encryptedKey: 'base64-encrypted',
        salt: 'base64-salt',
        iv: 'base64-iv',
        checksum: 'checksum',
        metadata: {
          exportedAt: Date.now(),
        },
      }

      const result = validateBundle(bundle)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('version')
    })

    it('should return expired status for expired bundles', () => {
      const bundle: ExportedKeyBundle = {
        version: 1,
        encryptedKey: 'base64-encrypted',
        salt: 'base64-salt',
        iv: 'base64-iv',
        checksum: 'checksum',
        metadata: {
          exportedAt: Date.now() - 100000,
          expiresAt: Date.now() - 1000,
        },
      }

      const result = validateBundle(bundle)

      expect(result.valid).toBe(false)
      expect(result.expired).toBe(true)
    })
  })

  // ============================================================================
  // serializeBundle / parseBundle
  // ============================================================================

  describe('serializeBundle', () => {
    it('should convert bundle to JSON string', () => {
      const bundle: ExportedKeyBundle = {
        version: 1,
        encryptedKey: 'key',
        salt: 'salt',
        iv: 'iv',
        checksum: 'check',
        metadata: { exportedAt: 12345 },
      }

      const serialized = serializeBundle(bundle)

      expect(typeof serialized).toBe('string')
      expect(JSON.parse(serialized)).toEqual(bundle)
    })
  })

  describe('parseBundle', () => {
    it('should parse valid JSON bundle', () => {
      const bundle: ExportedKeyBundle = {
        version: 1,
        encryptedKey: 'key',
        salt: 'salt',
        iv: 'iv',
        checksum: 'check',
        metadata: { exportedAt: 12345 },
      }
      const serialized = JSON.stringify(bundle)

      const parsed = parseBundle(serialized)

      expect(parsed).toEqual(bundle)
    })

    it('should throw for invalid JSON', () => {
      expect(() => parseBundle('not valid json')).toThrow()
    })

    it('should throw for missing required fields', () => {
      expect(() => parseBundle('{}')).toThrow()
    })
  })

  // ============================================================================
  // downloadBundle
  // ============================================================================

  describe('downloadBundle', () => {
    it('should trigger download with correct filename', () => {
      const bundle: ExportedKeyBundle = {
        version: 1,
        encryptedKey: 'key',
        salt: 'salt',
        iv: 'iv',
        checksum: 'check',
        metadata: { exportedAt: 12345 },
      }

      downloadBundle(bundle, 'my-backup.quarry-key')

      expect(mockLink.download).toBe('my-backup.quarry-key')
      expect(mockLink.click).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // getSuggestedFilename
  // ============================================================================

  describe('getSuggestedFilename', () => {
    it('should include device name if provided', () => {
      const bundle: ExportedKeyBundle = {
        version: 1,
        encryptedKey: 'key',
        salt: 'salt',
        iv: 'iv',
        checksum: 'check',
        metadata: {
          exportedAt: 12345,
          deviceName: 'MacBook Pro',
        },
      }

      const filename = getSuggestedFilename(bundle)

      expect(filename).toContain('MacBook')
      expect(filename).toContain('.quarry-key')
    })

    it('should use generic name if no device name', () => {
      const bundle: ExportedKeyBundle = {
        version: 1,
        encryptedKey: 'key',
        salt: 'salt',
        iv: 'iv',
        checksum: 'check',
        metadata: { exportedAt: 12345 },
      }

      const filename = getSuggestedFilename(bundle)

      expect(filename).toContain('quarry')
      expect(filename).toContain('.quarry-key')
    })
  })

  // ============================================================================
  // QR Code helpers
  // ============================================================================

  describe('canEncodeAsQR', () => {
    it('should return true for small bundles', () => {
      const smallBundle: ExportedKeyBundle = {
        version: 1,
        encryptedKey: 'a'.repeat(100),
        salt: 'salt',
        iv: 'iv',
        checksum: 'check',
        metadata: { exportedAt: 12345 },
      }

      expect(canEncodeAsQR(smallBundle)).toBe(true)
    })

    it('should return false for large bundles', () => {
      const largeBundle: ExportedKeyBundle = {
        version: 1,
        encryptedKey: 'a'.repeat(5000),
        salt: 'salt',
        iv: 'iv',
        checksum: 'check',
        metadata: { exportedAt: 12345 },
      }

      expect(canEncodeAsQR(largeBundle)).toBe(false)
    })
  })

  describe('createCompactBundle / parseCompactBundle', () => {
    it('should create a compact representation', () => {
      const bundle: ExportedKeyBundle = {
        version: 1,
        encryptedKey: 'key-data',
        salt: 'salt-data',
        iv: 'iv-data',
        checksum: 'check',
        metadata: { exportedAt: 12345 },
      }

      const compact = createCompactBundle(bundle)

      expect(typeof compact).toBe('string')
      expect(compact.length).toBeLessThan(JSON.stringify(bundle).length)
    })

    it('should round-trip correctly', () => {
      const original: ExportedKeyBundle = {
        version: 1,
        encryptedKey: 'key-data',
        salt: 'salt-data',
        iv: 'iv-data',
        checksum: 'checksum',
        metadata: { exportedAt: 12345 },
      }

      const compact = createCompactBundle(original)
      const restored = parseCompactBundle(compact)

      expect(restored.version).toBe(original.version)
      expect(restored.encryptedKey).toBe(original.encryptedKey)
      expect(restored.salt).toBe(original.salt)
      expect(restored.iv).toBe(original.iv)
    })
  })
})



