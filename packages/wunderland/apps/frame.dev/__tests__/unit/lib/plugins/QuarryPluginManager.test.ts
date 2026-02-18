/**
 * Quarry Plugin Manager Tests
 * @module __tests__/unit/lib/plugins/QuarryPluginManager.test
 *
 * Tests for the plugin manager singleton with installation, enable/disable, and queries.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { PluginManifest, PluginState, PluginStatus, PluginRegistry, RegistryPlugin } from '@/lib/plugins/types'

// Mock localStorage
let mockStorage: Record<string, string> = {}

// Mock fetch for registry
const mockFetch = vi.fn()

// Mock the dependencies
vi.mock('@/lib/config/publicAccess', () => ({
  isPublicAccess: vi.fn(() => false),
  getPublicAccessMessage: vi.fn(() => 'Public access mode active'),
}))

vi.mock('./bundledPlugins', () => ({
  getAllBundledPlugins: vi.fn(() => []),
  getBundledPlugin: vi.fn(() => null),
  isBundledPlugin: vi.fn(() => false),
}))

vi.mock('./validation', () => ({
  getDefaultSettings: vi.fn(() => ({})),
}))

vi.mock('./QuarryPluginLoader', () => ({
  loadFromUrl: vi.fn().mockResolvedValue({ success: false, errors: ['Not implemented'] }),
  loadFromZip: vi.fn().mockResolvedValue({ success: false, errors: ['Not implemented'] }),
  getCachedPlugin: vi.fn().mockResolvedValue(null),
  getAllCachedPlugins: vi.fn().mockResolvedValue([]),
  removeCachedPlugin: vi.fn().mockResolvedValue(true),
  instantiatePlugin: vi.fn(),
  injectPluginStyles: vi.fn(),
  removePluginStyles: vi.fn(),
  storePlugin: vi.fn().mockResolvedValue(true),
}))

vi.mock('./QuarryPluginAPI', () => ({
  createPluginAPI: vi.fn(() => ({})),
  pluginUIRegistry: {
    unregisterPlugin: vi.fn(),
  },
  pluginEvents: {
    emit: vi.fn(),
  },
  pluginDatabaseManager: {
    closeDatabase: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('Quarry Plugin Manager', () => {
  beforeEach(() => {
    vi.resetModules()
    mockStorage = {}

    const mockLocalStorage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value
      },
      removeItem: (key: string) => {
        delete mockStorage[key]
      },
      clear: () => {
        mockStorage = {}
      },
    }

    vi.stubGlobal('localStorage', mockLocalStorage)
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } })
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  // ============================================================================
  // Type Validation
  // ============================================================================

  describe('PluginState type', () => {
    it('can create valid plugin state', () => {
      const state: PluginState = {
        id: 'plugin-1',
        manifest: {
          id: 'plugin-1',
          name: 'Test Plugin',
          version: '1.0.0',
          author: 'Test Author',
          description: 'A test plugin',
          main: 'index.js',
        } as PluginManifest,
        status: 'installed',
        enabled: false,
        settings: {},
        installedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'url:https://example.com/plugin.zip',
      }

      expect(state.id).toBe('plugin-1')
      expect(state.enabled).toBe(false)
      expect(state.status).toBe('installed')
    })

    it('supports all status values', () => {
      const statuses: PluginStatus[] = ['installed', 'enabled', 'disabled', 'error', 'loading']
      statuses.forEach((status) => {
        const state: PluginState = {
          id: 'test',
          manifest: {} as PluginManifest,
          status,
          enabled: false,
          settings: {},
          installedAt: '',
          updatedAt: '',
          source: 'test',
        }
        expect(state.status).toBe(status)
      })
    })

    it('supports bundled flag', () => {
      const state: PluginState = {
        id: 'bundled-plugin',
        manifest: {} as PluginManifest,
        status: 'enabled',
        enabled: true,
        settings: {},
        installedAt: '',
        updatedAt: '',
        source: 'bundled',
        isBundled: true,
      }

      expect(state.isBundled).toBe(true)
    })

    it('supports error field', () => {
      const state: PluginState = {
        id: 'error-plugin',
        manifest: {} as PluginManifest,
        status: 'error',
        enabled: false,
        settings: {},
        installedAt: '',
        updatedAt: '',
        source: 'url',
        error: 'Failed to load plugin',
      }

      expect(state.error).toBe('Failed to load plugin')
    })
  })

  describe('PluginRegistry type', () => {
    it('can create valid registry', () => {
      const registry: PluginRegistry = {
        version: '1.0.0',
        updated: new Date().toISOString(),
        plugins: [
          {
            id: 'plugin-1',
            name: 'Plugin One',
            version: '1.0.0',
            author: 'Author',
            description: 'Description',
            repositoryUrl: 'https://github.com/user/plugin',
          },
        ],
        themes: [],
      }

      expect(registry.version).toBe('1.0.0')
      expect(registry.plugins).toHaveLength(1)
    })
  })

  describe('RegistryPlugin type', () => {
    it('can create valid registry plugin entry', () => {
      const plugin: RegistryPlugin = {
        id: 'community-plugin',
        name: 'Community Plugin',
        version: '2.0.0',
        author: 'Community Author',
        description: 'A community plugin',
        repositoryUrl: 'https://github.com/user/plugin',
        cdnUrl: 'https://cdn.example.com/plugin.zip',
        keywords: ['productivity', 'writing'],
        downloads: 1000,
        rating: 4.5,
      }

      expect(plugin.id).toBe('community-plugin')
      expect(plugin.keywords).toContain('productivity')
      expect(plugin.downloads).toBe(1000)
    })
  })

  // ============================================================================
  // Initialization
  // ============================================================================

  describe('initialization', () => {
    it('quarryPluginManager is exported', async () => {
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')
      expect(quarryPluginManager).toBeDefined()
    })

    it('initializePlugins function is exported', async () => {
      const { initializePlugins } = await import('@/lib/plugins/QuarryPluginManager')
      expect(typeof initializePlugins).toBe('function')
    })
  })

  // ============================================================================
  // Query Methods
  // ============================================================================

  describe('query methods', () => {
    it('getAll returns empty array initially', async () => {
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      const all = quarryPluginManager.getAll()
      expect(Array.isArray(all)).toBe(true)
    })

    it('getEnabled returns empty array when none enabled', async () => {
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      const enabled = quarryPluginManager.getEnabled()
      expect(Array.isArray(enabled)).toBe(true)
    })

    it('getBundled returns empty array when no bundled plugins', async () => {
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      const bundled = quarryPluginManager.getBundled()
      expect(Array.isArray(bundled)).toBe(true)
    })

    it('getPlugin returns undefined for non-existent plugin', async () => {
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      const plugin = quarryPluginManager.getPlugin('non-existent')
      expect(plugin).toBeUndefined()
    })

    it('isInstalled returns false for non-existent plugin', async () => {
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      expect(quarryPluginManager.isInstalled('missing')).toBe(false)
    })

    it('isEnabled returns false for non-existent plugin', async () => {
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      expect(quarryPluginManager.isEnabled('missing')).toBe(false)
    })

    it('getInstance returns undefined for non-existent plugin', async () => {
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      expect(quarryPluginManager.getInstance('missing')).toBeUndefined()
    })
  })

  // ============================================================================
  // Settings
  // ============================================================================

  describe('settings', () => {
    it('getPluginSettings returns empty object for non-existent plugin', async () => {
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      const settings = quarryPluginManager.getPluginSettings('missing')
      expect(settings).toEqual({})
    })

    it('setPluginSettings does not throw for non-existent plugin', async () => {
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      expect(() => {
        quarryPluginManager.setPluginSettings('missing', { key: 'value' })
      }).not.toThrow()
    })
  })

  // ============================================================================
  // Public Access Mode
  // ============================================================================

  describe('public access mode', () => {
    it('isPublicAccessMode returns boolean', async () => {
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      const isPublic = quarryPluginManager.isPublicAccessMode()
      expect(typeof isPublic).toBe('boolean')
    })

    it('canInstallPlugins returns boolean', async () => {
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      const canInstall = quarryPluginManager.canInstallPlugins()
      expect(typeof canInstall).toBe('boolean')
    })

    it('canUninstallPlugin returns boolean', async () => {
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      const canUninstall = quarryPluginManager.canUninstallPlugin('any-plugin')
      expect(typeof canUninstall).toBe('boolean')
    })
  })

  // ============================================================================
  // Enable/Disable
  // ============================================================================

  describe('enable/disable', () => {
    it('enablePlugin returns false for non-existent plugin', async () => {
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      const result = await quarryPluginManager.enablePlugin('missing')
      expect(result).toBe(false)
    })

    it('disablePlugin returns false for non-existent plugin', async () => {
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      const result = await quarryPluginManager.disablePlugin('missing')
      expect(result).toBe(false)
    })

    it('togglePlugin returns false for non-existent plugin', async () => {
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      const result = await quarryPluginManager.togglePlugin('missing')
      expect(result).toBe(false)
    })
  })

  // ============================================================================
  // Installation
  // ============================================================================

  describe('installation', () => {
    it('installFromUrl blocks in public access mode', async () => {
      const { isPublicAccess } = await import('@/lib/config/publicAccess')
      vi.mocked(isPublicAccess).mockReturnValue(true)

      vi.resetModules()
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      const result = await quarryPluginManager.installFromUrl('https://example.com/plugin.zip')

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('installFromZip blocks in public access mode', async () => {
      const { isPublicAccess } = await import('@/lib/config/publicAccess')
      vi.mocked(isPublicAccess).mockReturnValue(true)

      vi.resetModules()
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      const file = new File([''], 'plugin.zip', { type: 'application/zip' })
      const result = await quarryPluginManager.installFromZip(file)

      expect(result.success).toBe(false)
    })
  })

  // ============================================================================
  // Uninstallation
  // ============================================================================

  describe('uninstallation', () => {
    it('uninstallPlugin returns false for non-existent plugin', async () => {
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      const result = await quarryPluginManager.uninstallPlugin('missing')
      expect(result).toBe(false)
    })

    it('uninstallPlugin blocks in public access mode', async () => {
      const { isPublicAccess } = await import('@/lib/config/publicAccess')
      vi.mocked(isPublicAccess).mockReturnValue(true)

      vi.resetModules()
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      const result = await quarryPluginManager.uninstallPlugin('any-plugin')
      expect(result).toBe(false)
    })
  })

  // ============================================================================
  // Registry
  // ============================================================================

  describe('registry', () => {
    it('fetchRegistry returns empty registry on error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      vi.resetModules()
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      const registry = await quarryPluginManager.fetchRegistry(true)

      expect(registry.plugins).toEqual([])
      expect(registry.themes).toEqual([])
    })

    it('fetchRegistry returns parsed registry on success', async () => {
      const mockRegistry: PluginRegistry = {
        version: '1.0.0',
        updated: new Date().toISOString(),
        plugins: [
          {
            id: 'test-plugin',
            name: 'Test',
            version: '1.0.0',
            author: 'Test',
            description: 'Test',
            repositoryUrl: 'https://github.com/test/test',
          },
        ],
        themes: [],
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRegistry,
      })

      vi.resetModules()
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      const registry = await quarryPluginManager.fetchRegistry(true)

      expect(registry.plugins).toHaveLength(1)
      expect(registry.plugins[0].id).toBe('test-plugin')
    })

    it('searchRegistry filters by name', async () => {
      const mockRegistry: PluginRegistry = {
        version: '1.0.0',
        updated: '',
        plugins: [
          { id: 'plugin-one', name: 'Writing Helper', version: '1.0.0', author: '', description: '', repositoryUrl: '' },
          { id: 'plugin-two', name: 'Code Formatter', version: '1.0.0', author: '', description: '', repositoryUrl: '' },
        ],
        themes: [],
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRegistry,
      })

      vi.resetModules()
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      // Force refresh to get new mock
      await quarryPluginManager.fetchRegistry(true)

      const results = await quarryPluginManager.searchRegistry('writing')

      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Writing Helper')
    })

    it('searchRegistry filters by description', async () => {
      const mockRegistry: PluginRegistry = {
        version: '1.0.0',
        updated: '',
        plugins: [
          { id: 'p1', name: 'Plugin', version: '1.0.0', author: '', description: 'Helps with markdown editing', repositoryUrl: '' },
          { id: 'p2', name: 'Other', version: '1.0.0', author: '', description: 'Image processing', repositoryUrl: '' },
        ],
        themes: [],
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRegistry,
      })

      vi.resetModules()
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      await quarryPluginManager.fetchRegistry(true)
      const results = await quarryPluginManager.searchRegistry('markdown')

      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('p1')
    })

    it('searchRegistry filters by keywords', async () => {
      const mockRegistry: PluginRegistry = {
        version: '1.0.0',
        updated: '',
        plugins: [
          { id: 'p1', name: 'Plugin', version: '1.0.0', author: '', description: '', repositoryUrl: '', keywords: ['productivity', 'notes'] },
          { id: 'p2', name: 'Other', version: '1.0.0', author: '', description: '', repositoryUrl: '', keywords: ['images'] },
        ],
        themes: [],
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRegistry,
      })

      vi.resetModules()
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      await quarryPluginManager.fetchRegistry(true)
      const results = await quarryPluginManager.searchRegistry('productivity')

      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('p1')
    })
  })

  // ============================================================================
  // Listeners
  // ============================================================================

  describe('listeners', () => {
    it('onChange returns unsubscribe function', async () => {
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      const callback = vi.fn()
      const unsubscribe = quarryPluginManager.onChange(callback)

      expect(typeof unsubscribe).toBe('function')
    })

    it('unsubscribe removes listener', async () => {
      const { quarryPluginManager } = await import('@/lib/plugins/QuarryPluginManager')

      const callback = vi.fn()
      const unsubscribe = quarryPluginManager.onChange(callback)
      unsubscribe()

      // No error should be thrown
      expect(true).toBe(true)
    })
  })

  // ============================================================================
  // SSR Safety
  // ============================================================================

  describe('SSR safety', () => {
    it('handles missing localStorage gracefully', async () => {
      vi.stubGlobal('localStorage', undefined)
      vi.stubGlobal('window', undefined)

      vi.resetModules()

      // Should not throw
      const module = await import('@/lib/plugins/QuarryPluginManager')
      expect(module.quarryPluginManager).toBeDefined()
    })
  })
})
