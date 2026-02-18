/**
 * Sync Mode Tests
 * @module __tests__/unit/lib/crypto/syncMode.test
 *
 * Tests for sync mode types and constants.
 */

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SYNC_CONFIG,
  type SyncModeStatus,
  type SyncConfig,
  type WrappedKeyBundle,
  type SyncDevice,
  type SyncOperation,
} from '@/lib/crypto/syncMode'

describe('Sync Mode', () => {
  // ============================================================================
  // DEFAULT_SYNC_CONFIG
  // ============================================================================

  describe('DEFAULT_SYNC_CONFIG', () => {
    it('has enabled set to false', () => {
      expect(DEFAULT_SYNC_CONFIG.enabled).toBe(false)
    })

    it('has status set to disabled', () => {
      expect(DEFAULT_SYNC_CONFIG.status).toBe('disabled')
    })

    it('does not have optional fields', () => {
      expect(DEFAULT_SYNC_CONFIG.enabledAt).toBeUndefined()
      expect(DEFAULT_SYNC_CONFIG.lastSyncAt).toBeUndefined()
      expect(DEFAULT_SYNC_CONFIG.serverUrl).toBeUndefined()
      expect(DEFAULT_SYNC_CONFIG.accountId).toBeUndefined()
      expect(DEFAULT_SYNC_CONFIG.error).toBeUndefined()
    })
  })

  // ============================================================================
  // SyncModeStatus type
  // ============================================================================

  describe('SyncModeStatus type', () => {
    it('accepts disabled', () => {
      const status: SyncModeStatus = 'disabled'
      expect(status).toBe('disabled')
    })

    it('accepts setup', () => {
      const status: SyncModeStatus = 'setup'
      expect(status).toBe('setup')
    })

    it('accepts active', () => {
      const status: SyncModeStatus = 'active'
      expect(status).toBe('active')
    })

    it('accepts error', () => {
      const status: SyncModeStatus = 'error'
      expect(status).toBe('error')
    })
  })

  // ============================================================================
  // SyncConfig type
  // ============================================================================

  describe('SyncConfig type', () => {
    it('creates minimal disabled config', () => {
      const config: SyncConfig = {
        enabled: false,
        status: 'disabled',
      }
      expect(config.enabled).toBe(false)
      expect(config.status).toBe('disabled')
    })

    it('creates setup config', () => {
      const config: SyncConfig = {
        enabled: false,
        status: 'setup',
        serverUrl: 'https://sync.example.com',
      }
      expect(config.status).toBe('setup')
      expect(config.serverUrl).toBe('https://sync.example.com')
    })

    it('creates active config', () => {
      const config: SyncConfig = {
        enabled: true,
        status: 'active',
        enabledAt: Date.now(),
        lastSyncAt: Date.now(),
        serverUrl: 'https://sync.example.com',
        accountId: 'user-123',
      }
      expect(config.enabled).toBe(true)
      expect(config.status).toBe('active')
      expect(config.accountId).toBe('user-123')
    })

    it('creates error config', () => {
      const config: SyncConfig = {
        enabled: true,
        status: 'error',
        error: 'Connection failed',
      }
      expect(config.status).toBe('error')
      expect(config.error).toBe('Connection failed')
    })

    it('tracks sync timestamps', () => {
      const now = Date.now()
      const config: SyncConfig = {
        enabled: true,
        status: 'active',
        enabledAt: now - 86400000, // 1 day ago
        lastSyncAt: now,
      }
      expect(config.enabledAt).toBeLessThan(config.lastSyncAt!)
    })
  })

  // ============================================================================
  // WrappedKeyBundle type
  // ============================================================================

  describe('WrappedKeyBundle type', () => {
    it('creates key bundle', () => {
      const bundle: WrappedKeyBundle = {
        version: 1,
        salt: 'base64salt',
        wrappedDek: 'encryptedKeyData',
        dekVersion: 1,
        createdAt: Date.now(),
        createdByDeviceId: 'device-123',
      }
      expect(bundle.version).toBe(1)
      expect(bundle.salt).toBe('base64salt')
      expect(bundle.wrappedDek).toBe('encryptedKeyData')
    })

    it('tracks DEK version for rotation', () => {
      const bundle: WrappedKeyBundle = {
        version: 1,
        salt: 'salt',
        wrappedDek: 'key',
        dekVersion: 5,
        createdAt: Date.now(),
        createdByDeviceId: 'device-1',
      }
      expect(bundle.dekVersion).toBe(5)
    })

    it('stores device origin', () => {
      const bundle: WrappedKeyBundle = {
        version: 1,
        salt: 'salt',
        wrappedDek: 'key',
        dekVersion: 1,
        createdAt: Date.now(),
        createdByDeviceId: 'laptop-macbook-pro',
      }
      expect(bundle.createdByDeviceId).toBe('laptop-macbook-pro')
    })
  })

  // ============================================================================
  // SyncDevice type
  // ============================================================================

  describe('SyncDevice type', () => {
    it('creates minimal device', () => {
      const device: SyncDevice = {
        deviceId: 'device-abc123',
        deviceName: 'MacBook Pro',
        registeredAt: Date.now(),
        lastActiveAt: Date.now(),
        revoked: false,
      }
      expect(device.deviceId).toBe('device-abc123')
      expect(device.deviceName).toBe('MacBook Pro')
      expect(device.revoked).toBe(false)
    })

    it('creates device with public key', () => {
      const device: SyncDevice = {
        deviceId: 'device-xyz',
        deviceName: 'iPhone 15',
        registeredAt: Date.now(),
        lastActiveAt: Date.now(),
        revoked: false,
        publicKey: 'base64EncodedPublicKey',
      }
      expect(device.publicKey).toBe('base64EncodedPublicKey')
    })

    it('creates revoked device', () => {
      const device: SyncDevice = {
        deviceId: 'device-old',
        deviceName: 'Old Laptop',
        registeredAt: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
        lastActiveAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        revoked: true,
      }
      expect(device.revoked).toBe(true)
    })

    it('tracks activity timestamps', () => {
      const registered = Date.now() - 86400000 // 1 day ago
      const lastActive = Date.now()
      const device: SyncDevice = {
        deviceId: 'device-active',
        deviceName: 'Active Device',
        registeredAt: registered,
        lastActiveAt: lastActive,
        revoked: false,
      }
      expect(device.registeredAt).toBeLessThan(device.lastActiveAt)
    })
  })

  // ============================================================================
  // SyncOperation type
  // ============================================================================

  describe('SyncOperation type', () => {
    it('creates create operation', () => {
      const op: SyncOperation = {
        id: 'op-123',
        type: 'create',
        resourceType: 'note',
        resourceId: 'note-456',
        payload: {
          version: 1,
          iv: 'base64iv',
          ciphertext: 'encryptedData',
        },
        timestamp: Date.now(),
        retryCount: 0,
      }
      expect(op.type).toBe('create')
      expect(op.resourceType).toBe('note')
      expect(op.retryCount).toBe(0)
    })

    it('creates update operation', () => {
      const op: SyncOperation = {
        id: 'op-456',
        type: 'update',
        resourceType: 'task',
        resourceId: 'task-789',
        payload: {
          version: 1,
          iv: 'iv',
          ciphertext: 'data',
        },
        timestamp: Date.now(),
        retryCount: 0,
      }
      expect(op.type).toBe('update')
    })

    it('creates delete operation', () => {
      const op: SyncOperation = {
        id: 'op-789',
        type: 'delete',
        resourceType: 'attachment',
        resourceId: 'att-123',
        payload: {
          version: 1,
          iv: 'iv',
          ciphertext: 'marker',
        },
        timestamp: Date.now(),
        retryCount: 0,
      }
      expect(op.type).toBe('delete')
    })

    it('tracks retry attempts', () => {
      const op: SyncOperation = {
        id: 'op-retry',
        type: 'create',
        resourceType: 'note',
        resourceId: 'note-fail',
        payload: {
          version: 1,
          iv: 'iv',
          ciphertext: 'data',
        },
        timestamp: Date.now(),
        retryCount: 3,
        lastError: 'Network timeout',
      }
      expect(op.retryCount).toBe(3)
      expect(op.lastError).toBe('Network timeout')
    })

    it('stores encrypted payload', () => {
      const op: SyncOperation = {
        id: 'op-encrypted',
        type: 'create',
        resourceType: 'secret',
        resourceId: 'secret-1',
        payload: {
          version: 1,
          iv: 'randomIV123456',
          ciphertext: 'encryptedSecretData',
          tag: 'authTag123',
        },
        timestamp: Date.now(),
        retryCount: 0,
      }
      expect(op.payload.ciphertext).toBe('encryptedSecretData')
      expect(op.payload.version).toBe(1)
    })
  })

  // ============================================================================
  // Type relationships
  // ============================================================================

  describe('type relationships', () => {
    it('SyncConfig can transition through all statuses', () => {
      const statuses: SyncModeStatus[] = ['disabled', 'setup', 'active', 'error']
      for (const status of statuses) {
        const config: SyncConfig = {
          enabled: status === 'active',
          status,
        }
        expect(config.status).toBe(status)
      }
    })

    it('SyncDevice can have all operation types', () => {
      const types: Array<'create' | 'update' | 'delete'> = ['create', 'update', 'delete']
      for (const type of types) {
        const op: SyncOperation = {
          id: `op-${type}`,
          type,
          resourceType: 'test',
          resourceId: 'test-1',
          payload: { version: 1, iv: '', ciphertext: '' },
          timestamp: Date.now(),
          retryCount: 0,
        }
        expect(op.type).toBe(type)
      }
    })
  })

  // ============================================================================
  // Real-world scenarios
  // ============================================================================

  describe('real-world scenarios', () => {
    it('new user starts with disabled sync', () => {
      const config: SyncConfig = { ...DEFAULT_SYNC_CONFIG }
      expect(config.enabled).toBe(false)
      expect(config.status).toBe('disabled')
    })

    it('user initiates sync setup', () => {
      const config: SyncConfig = {
        enabled: false,
        status: 'setup',
        serverUrl: 'https://sync.frame.dev',
      }
      expect(config.status).toBe('setup')
      expect(config.enabled).toBe(false) // Not enabled until passphrase set
    })

    it('sync becomes active after setup', () => {
      const now = Date.now()
      const config: SyncConfig = {
        enabled: true,
        status: 'active',
        enabledAt: now,
        lastSyncAt: now,
        serverUrl: 'https://sync.frame.dev',
        accountId: 'user-abc123',
      }
      expect(config.enabled).toBe(true)
      expect(config.status).toBe('active')
    })

    it('sync enters error state on failure', () => {
      const config: SyncConfig = {
        enabled: true,
        status: 'error',
        serverUrl: 'https://sync.frame.dev',
        accountId: 'user-abc123',
        error: 'Server unreachable after 5 retries',
      }
      expect(config.status).toBe('error')
      expect(config.error).toBeDefined()
    })

    it('multiple devices can be registered', () => {
      const devices: SyncDevice[] = [
        {
          deviceId: 'device-1',
          deviceName: 'MacBook Pro',
          registeredAt: Date.now() - 86400000,
          lastActiveAt: Date.now(),
          revoked: false,
        },
        {
          deviceId: 'device-2',
          deviceName: 'iPhone 15 Pro',
          registeredAt: Date.now() - 3600000,
          lastActiveAt: Date.now() - 1800000,
          revoked: false,
        },
        {
          deviceId: 'device-3',
          deviceName: 'Old iPad',
          registeredAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
          lastActiveAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
          revoked: true, // Revoked old device
        },
      ]
      expect(devices).toHaveLength(3)
      expect(devices.filter(d => !d.revoked)).toHaveLength(2)
    })

    it('operations queue for offline sync', () => {
      const operations: SyncOperation[] = [
        {
          id: 'op-1',
          type: 'create',
          resourceType: 'note',
          resourceId: 'note-1',
          payload: { version: 1, iv: 'iv1', ciphertext: 'data1' },
          timestamp: Date.now() - 5000,
          retryCount: 0,
        },
        {
          id: 'op-2',
          type: 'update',
          resourceType: 'note',
          resourceId: 'note-1',
          payload: { version: 1, iv: 'iv2', ciphertext: 'data2' },
          timestamp: Date.now() - 3000,
          retryCount: 0,
        },
        {
          id: 'op-3',
          type: 'delete',
          resourceType: 'attachment',
          resourceId: 'att-1',
          payload: { version: 1, iv: 'iv3', ciphertext: 'marker' },
          timestamp: Date.now() - 1000,
          retryCount: 1,
          lastError: 'Network error',
        },
      ]
      expect(operations).toHaveLength(3)
      expect(operations.filter(op => op.retryCount > 0)).toHaveLength(1)
    })
  })
})
