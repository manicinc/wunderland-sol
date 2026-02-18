/**
 * Vault Configuration Tests
 * @module __tests__/unit/lib/vault/vaultConfig.test
 *
 * Tests for vault configuration types and utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isFileSystemAccessSupported,
  getDefaultVaultPath,
  type VaultConfig,
  type VaultStatus,
  type VaultStatusResult,
  type AppSettings,
} from '@/lib/vault/vaultConfig'

describe('Vault Configuration', () => {
  // ============================================================================
  // Type validation tests
  // ============================================================================

  describe('VaultConfig type', () => {
    it('can create valid VaultConfig object', () => {
      const config: VaultConfig = {
        version: 1,
        id: 'vault-123',
        name: 'My Vault',
        createdAt: '2025-01-01T00:00:00Z',
        lastOpenedAt: '2025-01-15T12:00:00Z',
      }

      expect(config.version).toBe(1)
      expect(config.id).toBe('vault-123')
      expect(config.name).toBe('My Vault')
    })

    it('can include optional settings', () => {
      const config: VaultConfig = {
        version: 1,
        id: 'vault-123',
        name: 'My Vault',
        createdAt: '2025-01-01T00:00:00Z',
        lastOpenedAt: '2025-01-15T12:00:00Z',
        settings: {
          defaultWeave: 'default-weave',
          theme: 'dark',
        },
      }

      expect(config.settings?.defaultWeave).toBe('default-weave')
      expect(config.settings?.theme).toBe('dark')
    })

    it('settings can be partial', () => {
      const config: VaultConfig = {
        version: 1,
        id: 'vault-123',
        name: 'My Vault',
        createdAt: '2025-01-01T00:00:00Z',
        lastOpenedAt: '2025-01-15T12:00:00Z',
        settings: {
          theme: 'light',
        },
      }

      expect(config.settings?.theme).toBe('light')
      expect(config.settings?.defaultWeave).toBeUndefined()
    })
  })

  describe('VaultStatus type', () => {
    it('includes all expected status values', () => {
      const statuses: VaultStatus[] = [
        'ready',
        'needs-setup',
        'missing',
        'permission-needed',
        'unsupported',
      ]

      expect(statuses).toHaveLength(5)
      expect(statuses).toContain('ready')
      expect(statuses).toContain('needs-setup')
      expect(statuses).toContain('missing')
      expect(statuses).toContain('permission-needed')
      expect(statuses).toContain('unsupported')
    })
  })

  describe('VaultStatusResult type', () => {
    it('can create minimal result', () => {
      const result: VaultStatusResult = {
        status: 'ready',
      }

      expect(result.status).toBe('ready')
      expect(result.config).toBeUndefined()
    })

    it('can include all optional fields', () => {
      const result: VaultStatusResult = {
        status: 'ready',
        config: {
          version: 1,
          id: 'vault-123',
          name: 'Test Vault',
          createdAt: '2025-01-01T00:00:00Z',
          lastOpenedAt: '2025-01-15T12:00:00Z',
        },
        path: '/path/to/vault',
        error: undefined,
      }

      expect(result.status).toBe('ready')
      expect(result.config?.name).toBe('Test Vault')
      expect(result.path).toBe('/path/to/vault')
    })

    it('can include error message', () => {
      const result: VaultStatusResult = {
        status: 'missing',
        error: 'Vault directory not found',
      }

      expect(result.status).toBe('missing')
      expect(result.error).toBe('Vault directory not found')
    })
  })

  describe('AppSettings type', () => {
    it('can create minimal settings', () => {
      const settings: AppSettings = {
        firstLaunchCompleted: false,
      }

      expect(settings.firstLaunchCompleted).toBe(false)
    })

    it('can include vault info', () => {
      const settings: AppSettings = {
        firstLaunchCompleted: true,
        vaultPath: '/Users/test/Documents/Quarry',
        vaultName: 'My Notes',
      }

      expect(settings.firstLaunchCompleted).toBe(true)
      expect(settings.vaultPath).toBe('/Users/test/Documents/Quarry')
      expect(settings.vaultName).toBe('My Notes')
    })
  })

  // ============================================================================
  // isFileSystemAccessSupported
  // ============================================================================

  describe('isFileSystemAccessSupported', () => {
    const originalWindow = global.window

    afterEach(() => {
      global.window = originalWindow
    })

    it('returns false when window is undefined (SSR)', () => {
      // @ts-ignore - intentionally setting window to undefined for testing
      global.window = undefined

      expect(isFileSystemAccessSupported()).toBe(false)
    })

    it('returns false when showDirectoryPicker is not available', () => {
      // @ts-ignore
      global.window = {}

      expect(isFileSystemAccessSupported()).toBe(false)
    })

    it('returns true when showDirectoryPicker is available', () => {
      // @ts-ignore
      global.window = {
        showDirectoryPicker: () => {},
      }

      expect(isFileSystemAccessSupported()).toBe(true)
    })
  })

  // ============================================================================
  // getDefaultVaultPath
  // ============================================================================

  describe('getDefaultVaultPath', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('returns path for Windows platform', () => {
      vi.stubGlobal('navigator', { platform: 'Win32' })

      const path = getDefaultVaultPath()
      expect(path).toContain('C:\\')
      expect(path).toContain('Quarry')
    })

    it('returns path for Mac platform', () => {
      vi.stubGlobal('navigator', { platform: 'MacIntel' })

      const path = getDefaultVaultPath()
      expect(path).toContain('~/')
      expect(path).toContain('Documents/Quarry')
    })

    it('returns path for Linux platform', () => {
      vi.stubGlobal('navigator', { platform: 'Linux x86_64' })

      const path = getDefaultVaultPath()
      expect(path).toContain('~/')
      expect(path).toContain('Documents/Quarry')
    })

    it('returns default path when platform is empty', () => {
      vi.stubGlobal('navigator', { platform: '' })

      const path = getDefaultVaultPath()
      expect(path).toContain('Quarry')
    })

    it('returns default path when platform is undefined', () => {
      vi.stubGlobal('navigator', {})

      const path = getDefaultVaultPath()
      expect(path).toContain('Documents/Quarry')
    })

    it('handles case insensitive platform check', () => {
      vi.stubGlobal('navigator', { platform: 'MACINTEL' })

      const path = getDefaultVaultPath()
      expect(path).toContain('Documents/Quarry')
    })
  })

  // ============================================================================
  // Edge cases and validation
  // ============================================================================

  describe('edge cases', () => {
    it('VaultConfig with empty strings', () => {
      const config: VaultConfig = {
        version: 1,
        id: '',
        name: '',
        createdAt: '',
        lastOpenedAt: '',
      }

      expect(config.id).toBe('')
      expect(config.name).toBe('')
    })

    it('VaultConfig with long strings', () => {
      const longString = 'a'.repeat(1000)
      const config: VaultConfig = {
        version: 1,
        id: longString,
        name: longString,
        createdAt: '2025-01-01T00:00:00Z',
        lastOpenedAt: '2025-01-01T00:00:00Z',
      }

      expect(config.id.length).toBe(1000)
      expect(config.name.length).toBe(1000)
    })

    it('VaultConfig with unicode in name', () => {
      const config: VaultConfig = {
        version: 1,
        id: 'vault-123',
        name: '我的笔记本 📝 Notes',
        createdAt: '2025-01-01T00:00:00Z',
        lastOpenedAt: '2025-01-01T00:00:00Z',
      }

      expect(config.name).toContain('📝')
      expect(config.name).toContain('我的')
    })

    it('VaultConfig with special characters in path', () => {
      const result: VaultStatusResult = {
        status: 'ready',
        path: '/Users/test user/Documents/My Vault (1)/Quarry',
      }

      expect(result.path).toContain(' ')
      expect(result.path).toContain('(')
      expect(result.path).toContain(')')
    })

    it('VaultStatusResult with all possible statuses', () => {
      const statuses: VaultStatus[] = [
        'ready',
        'needs-setup',
        'missing',
        'permission-needed',
        'unsupported',
      ]

      statuses.forEach(status => {
        const result: VaultStatusResult = { status }
        expect(result.status).toBe(status)
      })
    })

    it('AppSettings with various boolean states', () => {
      const notCompleted: AppSettings = { firstLaunchCompleted: false }
      const completed: AppSettings = { firstLaunchCompleted: true }

      expect(notCompleted.firstLaunchCompleted).toBe(false)
      expect(completed.firstLaunchCompleted).toBe(true)
    })
  })

  // ============================================================================
  // Constants validation
  // ============================================================================

  describe('constants', () => {
    it('version should always be 1', () => {
      const config: VaultConfig = {
        version: 1,
        id: 'test',
        name: 'test',
        createdAt: '',
        lastOpenedAt: '',
      }

      // VaultConfig type enforces version: 1
      expect(config.version).toBe(1)
    })
  })
})
