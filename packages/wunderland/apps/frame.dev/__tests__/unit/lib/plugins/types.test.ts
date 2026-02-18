/**
 * Plugin Types Tests
 * @module __tests__/unit/lib/plugins/types.test
 *
 * Tests for plugin system type definitions and constants.
 */

import { describe, it, expect } from 'vitest'
import {
  QUARRY_VERSION,
  VALID_PLUGIN_TYPES,
  VALID_PLUGIN_POSITIONS,
  DEFAULT_REGISTRY_URL,
  PLUGINS_DB_NAME,
  PLUGINS_STORE_NAME,
  PLUGIN_STATES_KEY,
  type PluginType,
  type PluginPosition,
  type SettingType,
  type SettingDefinition,
  type PluginManifest,
  type PluginStatus,
  type PluginState,
  type QuarryEventType,
  type WidgetProps,
  type ToolbarButtonOptions,
  type CommandOptions,
  type RendererOptions,
  type SidebarModeOptions,
  type ModalOptions,
  type PluginContext,
  type RegistryPlugin,
  type PluginRegistry,
  type LoadResult,
  type CachedPlugin,
  type ValidationResult,
} from '@/lib/plugins/types'

describe('Plugin Types', () => {
  // ============================================================================
  // Constants
  // ============================================================================

  describe('QUARRY_VERSION', () => {
    it('is a semantic version string', () => {
      expect(QUARRY_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
    })

    it('is 1.0.0', () => {
      expect(QUARRY_VERSION).toBe('1.0.0')
    })
  })

  describe('VALID_PLUGIN_TYPES', () => {
    it('contains all expected plugin types', () => {
      const expected: PluginType[] = [
        'widget',
        'renderer',
        'processor',
        'theme',
        'panel',
        'toolbar',
        'command',
      ]
      expect(VALID_PLUGIN_TYPES).toEqual(expected)
    })

    it('has 7 plugin types', () => {
      expect(VALID_PLUGIN_TYPES).toHaveLength(7)
    })

    it('includes widget type', () => {
      expect(VALID_PLUGIN_TYPES).toContain('widget')
    })

    it('includes renderer type', () => {
      expect(VALID_PLUGIN_TYPES).toContain('renderer')
    })

    it('includes processor type', () => {
      expect(VALID_PLUGIN_TYPES).toContain('processor')
    })

    it('includes theme type', () => {
      expect(VALID_PLUGIN_TYPES).toContain('theme')
    })

    it('includes panel type', () => {
      expect(VALID_PLUGIN_TYPES).toContain('panel')
    })

    it('includes toolbar type', () => {
      expect(VALID_PLUGIN_TYPES).toContain('toolbar')
    })

    it('includes command type', () => {
      expect(VALID_PLUGIN_TYPES).toContain('command')
    })
  })

  describe('VALID_PLUGIN_POSITIONS', () => {
    it('contains all expected positions', () => {
      const expected: PluginPosition[] = [
        'sidebar',
        'sidebar-bottom',
        'metadata',
        'toolbar',
        'floating',
        'content',
      ]
      expect(VALID_PLUGIN_POSITIONS).toEqual(expected)
    })

    it('has 6 positions', () => {
      expect(VALID_PLUGIN_POSITIONS).toHaveLength(6)
    })

    it('includes sidebar position', () => {
      expect(VALID_PLUGIN_POSITIONS).toContain('sidebar')
    })

    it('includes sidebar-bottom position', () => {
      expect(VALID_PLUGIN_POSITIONS).toContain('sidebar-bottom')
    })

    it('includes metadata position', () => {
      expect(VALID_PLUGIN_POSITIONS).toContain('metadata')
    })

    it('includes toolbar position', () => {
      expect(VALID_PLUGIN_POSITIONS).toContain('toolbar')
    })

    it('includes floating position', () => {
      expect(VALID_PLUGIN_POSITIONS).toContain('floating')
    })

    it('includes content position', () => {
      expect(VALID_PLUGIN_POSITIONS).toContain('content')
    })
  })

  describe('DEFAULT_REGISTRY_URL', () => {
    it('is a valid URL', () => {
      expect(DEFAULT_REGISTRY_URL).toMatch(/^https?:\/\//)
    })

    it('points to GitHub raw content', () => {
      expect(DEFAULT_REGISTRY_URL).toContain('raw.githubusercontent.com')
    })

    it('points to registry.json', () => {
      expect(DEFAULT_REGISTRY_URL).toContain('registry.json')
    })
  })

  describe('PLUGINS_DB_NAME', () => {
    it('is quarry-plugins', () => {
      expect(PLUGINS_DB_NAME).toBe('quarry-plugins')
    })
  })

  describe('PLUGINS_STORE_NAME', () => {
    it('is plugins', () => {
      expect(PLUGINS_STORE_NAME).toBe('plugins')
    })
  })

  describe('PLUGIN_STATES_KEY', () => {
    it('is quarry-plugin-states', () => {
      expect(PLUGIN_STATES_KEY).toBe('quarry-plugin-states')
    })
  })

  // ============================================================================
  // PluginType
  // ============================================================================

  describe('PluginType', () => {
    it('accepts widget', () => {
      const type: PluginType = 'widget'
      expect(type).toBe('widget')
    })

    it('accepts renderer', () => {
      const type: PluginType = 'renderer'
      expect(type).toBe('renderer')
    })

    it('accepts processor', () => {
      const type: PluginType = 'processor'
      expect(type).toBe('processor')
    })

    it('accepts theme', () => {
      const type: PluginType = 'theme'
      expect(type).toBe('theme')
    })

    it('accepts panel', () => {
      const type: PluginType = 'panel'
      expect(type).toBe('panel')
    })

    it('accepts toolbar', () => {
      const type: PluginType = 'toolbar'
      expect(type).toBe('toolbar')
    })

    it('accepts command', () => {
      const type: PluginType = 'command'
      expect(type).toBe('command')
    })
  })

  // ============================================================================
  // PluginPosition
  // ============================================================================

  describe('PluginPosition', () => {
    it('accepts sidebar', () => {
      const position: PluginPosition = 'sidebar'
      expect(position).toBe('sidebar')
    })

    it('accepts sidebar-bottom', () => {
      const position: PluginPosition = 'sidebar-bottom'
      expect(position).toBe('sidebar-bottom')
    })

    it('accepts metadata', () => {
      const position: PluginPosition = 'metadata'
      expect(position).toBe('metadata')
    })

    it('accepts toolbar', () => {
      const position: PluginPosition = 'toolbar'
      expect(position).toBe('toolbar')
    })

    it('accepts floating', () => {
      const position: PluginPosition = 'floating'
      expect(position).toBe('floating')
    })

    it('accepts content', () => {
      const position: PluginPosition = 'content'
      expect(position).toBe('content')
    })
  })

  // ============================================================================
  // SettingType
  // ============================================================================

  describe('SettingType', () => {
    it('accepts string', () => {
      const type: SettingType = 'string'
      expect(type).toBe('string')
    })

    it('accepts number', () => {
      const type: SettingType = 'number'
      expect(type).toBe('number')
    })

    it('accepts boolean', () => {
      const type: SettingType = 'boolean'
      expect(type).toBe('boolean')
    })

    it('accepts select', () => {
      const type: SettingType = 'select'
      expect(type).toBe('select')
    })

    it('accepts color', () => {
      const type: SettingType = 'color'
      expect(type).toBe('color')
    })

    it('accepts slider', () => {
      const type: SettingType = 'slider'
      expect(type).toBe('slider')
    })
  })

  // ============================================================================
  // SettingDefinition
  // ============================================================================

  describe('SettingDefinition', () => {
    it('creates minimal string setting', () => {
      const setting: SettingDefinition = {
        type: 'string',
        default: 'hello',
        label: 'Greeting',
      }
      expect(setting.type).toBe('string')
      expect(setting.default).toBe('hello')
      expect(setting.label).toBe('Greeting')
    })

    it('creates number setting with range', () => {
      const setting: SettingDefinition = {
        type: 'number',
        default: 25,
        label: 'Duration',
        min: 1,
        max: 60,
        step: 5,
      }
      expect(setting.min).toBe(1)
      expect(setting.max).toBe(60)
      expect(setting.step).toBe(5)
    })

    it('creates boolean setting', () => {
      const setting: SettingDefinition = {
        type: 'boolean',
        default: true,
        label: 'Enable feature',
        description: 'Turn this on to enable the feature',
      }
      expect(setting.default).toBe(true)
      expect(setting.description).toContain('enable')
    })

    it('creates select setting with options', () => {
      const setting: SettingDefinition = {
        type: 'select',
        default: 'medium',
        label: 'Size',
        options: [
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
        ],
      }
      expect(setting.options).toHaveLength(3)
      expect(setting.options?.[1].value).toBe('medium')
    })

    it('creates slider setting', () => {
      const setting: SettingDefinition = {
        type: 'slider',
        default: 50,
        label: 'Volume',
        min: 0,
        max: 100,
        step: 1,
      }
      expect(setting.type).toBe('slider')
      expect(setting.min).toBe(0)
      expect(setting.max).toBe(100)
    })

    it('creates string setting with placeholder', () => {
      const setting: SettingDefinition = {
        type: 'string',
        default: '',
        label: 'API Key',
        placeholder: 'Enter your API key',
      }
      expect(setting.placeholder).toBe('Enter your API key')
    })
  })

  // ============================================================================
  // PluginManifest
  // ============================================================================

  describe('PluginManifest', () => {
    it('creates minimal manifest', () => {
      const manifest: PluginManifest = {
        id: 'com.example.test',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'Test Author',
        minQuarryVersion: '1.0.0',
        main: 'main.js',
        type: 'widget',
      }
      expect(manifest.id).toBe('com.example.test')
      expect(manifest.type).toBe('widget')
    })

    it('creates full manifest', () => {
      const manifest: PluginManifest = {
        id: 'com.example.pomodoro',
        name: 'Pomodoro Timer',
        version: '2.0.0',
        description: 'A focus timer',
        author: 'Author Name',
        authorUrl: 'https://example.com',
        fundingUrl: 'https://donate.example.com',
        minQuarryVersion: '1.0.0',
        main: 'main.js',
        styles: 'styles.css',
        type: 'widget',
        position: 'sidebar',
        permissions: ['storage', 'notifications'],
        settings: {
          duration: {
            type: 'number',
            default: 25,
            label: 'Duration',
          },
        },
        keywords: ['timer', 'focus', 'productivity'],
        repository: 'https://github.com/example/pomodoro',
        bugs: 'https://github.com/example/pomodoro/issues',
        license: 'MIT',
      }
      expect(manifest.authorUrl).toBe('https://example.com')
      expect(manifest.styles).toBe('styles.css')
      expect(manifest.position).toBe('sidebar')
      expect(manifest.permissions).toHaveLength(2)
      expect(manifest.keywords).toContain('timer')
      expect(manifest.license).toBe('MIT')
    })

    it('supports all plugin types', () => {
      const types: PluginType[] = [
        'widget',
        'renderer',
        'processor',
        'theme',
        'panel',
        'toolbar',
        'command',
      ]
      for (const type of types) {
        const manifest: PluginManifest = {
          id: `com.test.${type}`,
          name: `Test ${type}`,
          version: '1.0.0',
          description: 'Test',
          author: 'Test',
          minQuarryVersion: '1.0.0',
          main: 'main.js',
          type,
        }
        expect(manifest.type).toBe(type)
      }
    })
  })

  // ============================================================================
  // PluginStatus
  // ============================================================================

  describe('PluginStatus', () => {
    it('accepts installed', () => {
      const status: PluginStatus = 'installed'
      expect(status).toBe('installed')
    })

    it('accepts enabled', () => {
      const status: PluginStatus = 'enabled'
      expect(status).toBe('enabled')
    })

    it('accepts disabled', () => {
      const status: PluginStatus = 'disabled'
      expect(status).toBe('disabled')
    })

    it('accepts error', () => {
      const status: PluginStatus = 'error'
      expect(status).toBe('error')
    })

    it('accepts loading', () => {
      const status: PluginStatus = 'loading'
      expect(status).toBe('loading')
    })
  })

  // ============================================================================
  // PluginState
  // ============================================================================

  describe('PluginState', () => {
    it('creates minimal plugin state', () => {
      const state: PluginState = {
        id: 'com.example.test',
        manifest: {
          id: 'com.example.test',
          name: 'Test',
          version: '1.0.0',
          description: 'Test',
          author: 'Test',
          minQuarryVersion: '1.0.0',
          main: 'main.js',
          type: 'widget',
        },
        status: 'enabled',
        enabled: true,
        settings: {},
        installedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        source: 'https://example.com/plugin.zip',
      }
      expect(state.id).toBe('com.example.test')
      expect(state.status).toBe('enabled')
      expect(state.enabled).toBe(true)
    })

    it('creates error state with error message', () => {
      const state: PluginState = {
        id: 'com.example.broken',
        manifest: {
          id: 'com.example.broken',
          name: 'Broken',
          version: '1.0.0',
          description: 'A broken plugin',
          author: 'Test',
          minQuarryVersion: '1.0.0',
          main: 'main.js',
          type: 'widget',
        },
        status: 'error',
        enabled: false,
        error: 'Failed to load main.js',
        settings: {},
        installedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        source: 'https://example.com/broken.zip',
      }
      expect(state.status).toBe('error')
      expect(state.error).toBe('Failed to load main.js')
    })

    it('creates bundled plugin state', () => {
      const state: PluginState = {
        id: 'com.quarry.default-theme',
        manifest: {
          id: 'com.quarry.default-theme',
          name: 'Default Theme',
          version: '1.0.0',
          description: 'The default Quarry theme',
          author: 'Quarry',
          minQuarryVersion: '1.0.0',
          main: 'main.js',
          type: 'theme',
        },
        status: 'enabled',
        enabled: true,
        settings: {},
        installedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        source: 'bundled',
        isBundled: true,
      }
      expect(state.isBundled).toBe(true)
    })
  })

  // ============================================================================
  // QuarryEventType
  // ============================================================================

  describe('QuarryEventType', () => {
    const events: QuarryEventType[] = [
      'file:open',
      'file:close',
      'file:save',
      'content:change',
      'navigation:change',
      'theme:change',
      'settings:change',
      'sidebar:toggle',
      'sidebar:mode',
      'search:query',
      'tree:expand',
      'tree:collapse',
      'plugin:load',
      'plugin:unload',
    ]

    it('has all expected event types', () => {
      expect(events).toHaveLength(14)
    })

    it('accepts file events', () => {
      const open: QuarryEventType = 'file:open'
      const close: QuarryEventType = 'file:close'
      const save: QuarryEventType = 'file:save'
      expect(open).toBe('file:open')
      expect(close).toBe('file:close')
      expect(save).toBe('file:save')
    })

    it('accepts navigation events', () => {
      const nav: QuarryEventType = 'navigation:change'
      expect(nav).toBe('navigation:change')
    })

    it('accepts theme events', () => {
      const theme: QuarryEventType = 'theme:change'
      expect(theme).toBe('theme:change')
    })

    it('accepts sidebar events', () => {
      const toggle: QuarryEventType = 'sidebar:toggle'
      const mode: QuarryEventType = 'sidebar:mode'
      expect(toggle).toBe('sidebar:toggle')
      expect(mode).toBe('sidebar:mode')
    })

    it('accepts plugin events', () => {
      const load: QuarryEventType = 'plugin:load'
      const unload: QuarryEventType = 'plugin:unload'
      expect(load).toBe('plugin:load')
      expect(unload).toBe('plugin:unload')
    })
  })

  // ============================================================================
  // ModalOptions
  // ============================================================================

  describe('ModalOptions', () => {
    it('creates minimal modal options', () => {
      const options: ModalOptions = {
        title: 'Confirm Action',
      }
      expect(options.title).toBe('Confirm Action')
    })

    it('creates full modal options', () => {
      const options: ModalOptions = {
        title: 'Delete Item',
        showConfirm: true,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        size: 'md',
      }
      expect(options.showConfirm).toBe(true)
      expect(options.confirmText).toBe('Delete')
      expect(options.size).toBe('md')
    })

    it('supports all modal sizes', () => {
      const sizes: Array<'sm' | 'md' | 'lg' | 'xl'> = ['sm', 'md', 'lg', 'xl']
      for (const size of sizes) {
        const options: ModalOptions = { title: 'Test', size }
        expect(options.size).toBe(size)
      }
    })
  })

  // ============================================================================
  // PluginContext
  // ============================================================================

  describe('PluginContext', () => {
    it('creates context with no current file', () => {
      const context: PluginContext = {
        currentFile: null,
        currentPath: '/',
        metadata: null,
        theme: 'light',
        isDark: false,
        settings: {},
      }
      expect(context.currentFile).toBeNull()
      expect(context.isDark).toBe(false)
    })

    it('creates context with current file', () => {
      const context: PluginContext = {
        currentFile: {
          path: '/docs/readme.md',
          name: 'readme.md',
          content: '# Hello World',
        },
        currentPath: '/docs',
        metadata: { title: 'Readme' } as any,
        theme: 'dark',
        isDark: true,
        settings: { enabled: true },
      }
      expect(context.currentFile?.path).toBe('/docs/readme.md')
      expect(context.isDark).toBe(true)
    })
  })

  // ============================================================================
  // RegistryPlugin
  // ============================================================================

  describe('RegistryPlugin', () => {
    it('creates minimal registry plugin', () => {
      const plugin: RegistryPlugin = {
        id: 'com.example.plugin',
        name: 'Example Plugin',
        version: '1.0.0',
        description: 'An example plugin',
        author: 'Author',
        type: 'widget',
        verified: false,
      }
      expect(plugin.verified).toBe(false)
    })

    it('creates full registry plugin', () => {
      const plugin: RegistryPlugin = {
        id: 'com.example.premium',
        name: 'Premium Plugin',
        version: '2.0.0',
        description: 'A premium plugin',
        author: 'Premium Author',
        type: 'panel',
        downloads: 10000,
        rating: 4.5,
        verified: true,
        cdnUrl: 'https://cdn.example.com/plugin.zip',
        repositoryUrl: 'https://github.com/example/plugin',
        keywords: ['premium', 'panel'],
        updatedAt: '2025-01-01T00:00:00Z',
      }
      expect(plugin.downloads).toBe(10000)
      expect(plugin.rating).toBe(4.5)
      expect(plugin.verified).toBe(true)
    })
  })

  // ============================================================================
  // PluginRegistry
  // ============================================================================

  describe('PluginRegistry', () => {
    it('creates minimal registry', () => {
      const registry: PluginRegistry = {
        version: '1.0.0',
        updated: '2025-01-01T00:00:00Z',
        plugins: [],
      }
      expect(registry.plugins).toHaveLength(0)
    })

    it('creates registry with plugins and themes', () => {
      const registry: PluginRegistry = {
        version: '1.0.0',
        updated: '2025-01-01T00:00:00Z',
        plugins: [
          {
            id: 'com.example.widget',
            name: 'Widget',
            version: '1.0.0',
            description: 'A widget',
            author: 'Author',
            type: 'widget',
            verified: true,
          },
        ],
        themes: [
          {
            id: 'com.example.theme',
            name: 'Theme',
            version: '1.0.0',
            description: 'A theme',
            author: 'Author',
            type: 'theme',
            verified: true,
          },
        ],
      }
      expect(registry.plugins).toHaveLength(1)
      expect(registry.themes).toHaveLength(1)
    })
  })

  // ============================================================================
  // LoadResult
  // ============================================================================

  describe('LoadResult', () => {
    it('creates successful result', () => {
      const result: LoadResult = {
        success: true,
        manifest: {
          id: 'com.example.test',
          name: 'Test',
          version: '1.0.0',
          description: 'Test',
          author: 'Test',
          minQuarryVersion: '1.0.0',
          main: 'main.js',
          type: 'widget',
        },
      }
      expect(result.success).toBe(true)
      expect(result.manifest).toBeDefined()
    })

    it('creates failed result with errors', () => {
      const result: LoadResult = {
        success: false,
        errors: ['Invalid manifest', 'Missing main.js'],
      }
      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(2)
    })
  })

  // ============================================================================
  // CachedPlugin
  // ============================================================================

  describe('CachedPlugin', () => {
    it('creates cached plugin', () => {
      const cached: CachedPlugin = {
        id: 'com.example.cached',
        manifest: {
          id: 'com.example.cached',
          name: 'Cached Plugin',
          version: '1.0.0',
          description: 'A cached plugin',
          author: 'Author',
          minQuarryVersion: '1.0.0',
          main: 'main.js',
          type: 'widget',
        },
        mainCode: 'export default class Plugin {}',
        styles: '.plugin { color: red; }',
        cachedAt: '2025-01-01T00:00:00Z',
        source: 'https://example.com/plugin.zip',
      }
      expect(cached.mainCode).toContain('export default')
      expect(cached.styles).toContain('.plugin')
    })

    it('creates bundled cached plugin', () => {
      const cached: CachedPlugin = {
        id: 'com.quarry.bundled',
        manifest: {
          id: 'com.quarry.bundled',
          name: 'Bundled',
          version: '1.0.0',
          description: 'Bundled plugin',
          author: 'Quarry',
          minQuarryVersion: '1.0.0',
          main: 'main.js',
          type: 'widget',
        },
        mainCode: '/* bundled */',
        styles: '',
        cachedAt: '2025-01-01T00:00:00Z',
        source: 'bundled',
        isBundled: true,
      }
      expect(cached.isBundled).toBe(true)
    })
  })

  // ============================================================================
  // ValidationResult
  // ============================================================================

  describe('ValidationResult', () => {
    it('creates valid result', () => {
      const result: ValidationResult = {
        valid: true,
        errors: [],
      }
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('creates invalid result with errors', () => {
      const result: ValidationResult = {
        valid: false,
        errors: ['Missing id', 'Invalid version format'],
      }
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(2)
    })

    it('creates result with warnings', () => {
      const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: ['Consider adding a description', 'No styles file found'],
      }
      expect(result.valid).toBe(true)
      expect(result.warnings).toHaveLength(2)
    })
  })

  // ============================================================================
  // CommandOptions
  // ============================================================================

  describe('CommandOptions', () => {
    it('creates minimal command', () => {
      const command: CommandOptions = {
        id: 'my-command',
        name: 'My Command',
        callback: () => {},
      }
      expect(command.id).toBe('my-command')
      expect(command.callback).toBeDefined()
    })

    it('creates full command', () => {
      const command: CommandOptions = {
        id: 'format-document',
        name: 'Format Document',
        callback: () => {},
        shortcut: 'mod+shift+f',
        showInPalette: true,
      }
      expect(command.shortcut).toBe('mod+shift+f')
      expect(command.showInPalette).toBe(true)
    })
  })

  // ============================================================================
  // ToolbarButtonOptions
  // ============================================================================

  describe('ToolbarButtonOptions', () => {
    it('creates minimal toolbar button', () => {
      const button: ToolbarButtonOptions = {
        id: 'my-button',
        icon: null as any,
        label: 'My Button',
        onClick: () => {},
      }
      expect(button.id).toBe('my-button')
      expect(button.onClick).toBeDefined()
    })

    it('creates full toolbar button', () => {
      const button: ToolbarButtonOptions = {
        id: 'toggle-feature',
        icon: null as any,
        label: 'Toggle Feature',
        onClick: () => {},
        isActive: true,
        shortcut: 'mod+t',
      }
      expect(button.isActive).toBe(true)
      expect(button.shortcut).toBe('mod+t')
    })
  })
})
