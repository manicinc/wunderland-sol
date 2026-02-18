/**
 * Bundled Plugins Tests
 * @module __tests__/unit/lib/plugins/bundledPlugins.test
 *
 * Tests for bundled plugin management functions and constants.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isPublicAccess,
  isBundledPlugin,
  canUninstallPlugin,
  canInstallPlugins,
  BUNDLED_PLUGIN_IDS,
  BUNDLED_MANIFESTS,
  BUNDLED_CODE,
  getBundledPlugin,
  getAllBundledPlugins,
} from '@/lib/plugins/bundledPlugins'

describe('Bundled Plugins', () => {
  // ============================================================================
  // BUNDLED_PLUGIN_IDS constant
  // ============================================================================

  describe('BUNDLED_PLUGIN_IDS', () => {
    it('is an array', () => {
      expect(Array.isArray(BUNDLED_PLUGIN_IDS)).toBe(true)
    })

    it('contains expected plugins', () => {
      expect(BUNDLED_PLUGIN_IDS).toContain('com.quarry.pomodoro-timer')
      expect(BUNDLED_PLUGIN_IDS).toContain('com.quarry.citation-manager')
      expect(BUNDLED_PLUGIN_IDS).toContain('com.quarry.custom-callouts')
      expect(BUNDLED_PLUGIN_IDS).toContain('com.quarry.latex-math')
    })

    it('has correct number of plugins', () => {
      expect(BUNDLED_PLUGIN_IDS).toHaveLength(4)
    })

    it('all IDs follow naming convention', () => {
      for (const id of BUNDLED_PLUGIN_IDS) {
        expect(id).toMatch(/^com\.quarry\.[a-z-]+$/)
      }
    })
  })

  // ============================================================================
  // BUNDLED_MANIFESTS constant
  // ============================================================================

  describe('BUNDLED_MANIFESTS', () => {
    it('has manifests for all bundled plugins', () => {
      for (const id of BUNDLED_PLUGIN_IDS) {
        expect(BUNDLED_MANIFESTS[id]).toBeDefined()
      }
    })

    it('pomodoro manifest has correct structure', () => {
      const manifest = BUNDLED_MANIFESTS['com.quarry.pomodoro-timer']
      expect(manifest.id).toBe('com.quarry.pomodoro-timer')
      expect(manifest.name).toBe('Pomodoro Timer')
      expect(manifest.version).toBe('1.0.0')
      expect(manifest.author).toBe('Quarry Team')
      expect(manifest.type).toBe('widget')
    })

    it('citation manager manifest has correct structure', () => {
      const manifest = BUNDLED_MANIFESTS['com.quarry.citation-manager']
      expect(manifest.id).toBe('com.quarry.citation-manager')
      expect(manifest.name).toBe('Citation Manager')
      expect(manifest.type).toBe('renderer')
    })

    it('custom callouts manifest has correct structure', () => {
      const manifest = BUNDLED_MANIFESTS['com.quarry.custom-callouts']
      expect(manifest.id).toBe('com.quarry.custom-callouts')
      expect(manifest.name).toBe('Custom Callouts')
      expect(manifest.type).toBe('renderer')
    })

    it('latex math manifest has correct structure', () => {
      const manifest = BUNDLED_MANIFESTS['com.quarry.latex-math']
      expect(manifest.id).toBe('com.quarry.latex-math')
      expect(manifest.name).toBe('LaTeX Math Renderer')
      expect(manifest.type).toBe('renderer')
    })

    it('all manifests have required fields', () => {
      for (const id of BUNDLED_PLUGIN_IDS) {
        const manifest = BUNDLED_MANIFESTS[id]
        expect(manifest.id).toBeDefined()
        expect(manifest.name).toBeDefined()
        expect(manifest.version).toBeDefined()
        expect(manifest.description).toBeDefined()
        expect(manifest.author).toBeDefined()
        expect(manifest.minQuarryVersion).toBeDefined()
        expect(manifest.main).toBeDefined()
        expect(manifest.type).toBeDefined()
      }
    })

    it('all manifests have settings', () => {
      for (const id of BUNDLED_PLUGIN_IDS) {
        const manifest = BUNDLED_MANIFESTS[id]
        expect(manifest.settings).toBeDefined()
        expect(typeof manifest.settings).toBe('object')
      }
    })

    it('pomodoro has expected settings', () => {
      const settings = BUNDLED_MANIFESTS['com.quarry.pomodoro-timer'].settings!
      expect(settings.workDuration).toBeDefined()
      expect(settings.workDuration.type).toBe('number')
      expect(settings.workDuration.default).toBe(25)
      expect(settings.breakDuration).toBeDefined()
      expect(settings.longBreakDuration).toBeDefined()
      expect(settings.autoStartBreaks).toBeDefined()
      expect(settings.soundEnabled).toBeDefined()
    })

    it('citation manager has expected settings', () => {
      const settings = BUNDLED_MANIFESTS['com.quarry.citation-manager'].settings!
      expect(settings.citationStyle).toBeDefined()
      expect(settings.citationStyle.type).toBe('select')
      expect(settings.citationStyle.default).toBe('apa')
      expect(settings.showTooltips).toBeDefined()
      expect(settings.linkToDOI).toBeDefined()
    })

    it('latex math has expected settings', () => {
      const settings = BUNDLED_MANIFESTS['com.quarry.latex-math'].settings!
      expect(settings.displayMode).toBeDefined()
      expect(settings.renderQuality).toBeDefined()
      expect(settings.enableChem).toBeDefined()
      expect(settings.enableCopyOnClick).toBeDefined()
      expect(settings.fontSize).toBeDefined()
      expect(settings.errorColor).toBeDefined()
    })
  })

  // ============================================================================
  // BUNDLED_CODE constant
  // ============================================================================

  describe('BUNDLED_CODE', () => {
    it('has code for all bundled plugins', () => {
      for (const id of BUNDLED_PLUGIN_IDS) {
        expect(BUNDLED_CODE[id]).toBeDefined()
      }
    })

    it('each entry has code and styles', () => {
      for (const id of BUNDLED_PLUGIN_IDS) {
        expect(BUNDLED_CODE[id].code).toBeDefined()
        expect(typeof BUNDLED_CODE[id].code).toBe('string')
        expect(BUNDLED_CODE[id].code.length).toBeGreaterThan(0)

        expect(BUNDLED_CODE[id].styles).toBeDefined()
        expect(typeof BUNDLED_CODE[id].styles).toBe('string')
      }
    })

    it('pomodoro code contains expected class', () => {
      expect(BUNDLED_CODE['com.quarry.pomodoro-timer'].code).toContain('PomodoroTimerPlugin')
    })

    it('citation manager code contains expected class', () => {
      expect(BUNDLED_CODE['com.quarry.citation-manager'].code).toContain('CitationManagerPlugin')
    })

    it('callouts code contains expected class', () => {
      expect(BUNDLED_CODE['com.quarry.custom-callouts'].code).toContain('CustomCalloutsPlugin')
    })

    it('latex code contains expected class', () => {
      expect(BUNDLED_CODE['com.quarry.latex-math'].code).toContain('LatexMathPlugin')
    })
  })

  // ============================================================================
  // isBundledPlugin
  // ============================================================================

  describe('isBundledPlugin', () => {
    it('returns true for bundled plugin', () => {
      expect(isBundledPlugin('com.quarry.pomodoro-timer')).toBe(true)
      expect(isBundledPlugin('com.quarry.citation-manager')).toBe(true)
      expect(isBundledPlugin('com.quarry.custom-callouts')).toBe(true)
      expect(isBundledPlugin('com.quarry.latex-math')).toBe(true)
    })

    it('returns false for non-bundled plugin', () => {
      expect(isBundledPlugin('com.example.my-plugin')).toBe(false)
      expect(isBundledPlugin('random-plugin')).toBe(false)
      expect(isBundledPlugin('')).toBe(false)
    })

    it('is case-sensitive', () => {
      expect(isBundledPlugin('com.quarry.Pomodoro-Timer')).toBe(false)
      expect(isBundledPlugin('COM.QUARRY.POMODORO-TIMER')).toBe(false)
    })
  })

  // ============================================================================
  // getBundledPlugin
  // ============================================================================

  describe('getBundledPlugin', () => {
    it('returns plugin data for bundled plugin', () => {
      const result = getBundledPlugin('com.quarry.pomodoro-timer')
      expect(result).not.toBeNull()
      expect(result!.manifest).toBeDefined()
      expect(result!.code).toBeDefined()
      expect(result!.styles).toBeDefined()
    })

    it('returns correct manifest', () => {
      const result = getBundledPlugin('com.quarry.citation-manager')
      expect(result!.manifest.id).toBe('com.quarry.citation-manager')
      expect(result!.manifest.name).toBe('Citation Manager')
    })

    it('returns null for non-bundled plugin', () => {
      expect(getBundledPlugin('com.example.not-bundled')).toBeNull()
      expect(getBundledPlugin('')).toBeNull()
      expect(getBundledPlugin('random')).toBeNull()
    })

    it('returns all three components', () => {
      for (const id of BUNDLED_PLUGIN_IDS) {
        const result = getBundledPlugin(id)
        expect(result).not.toBeNull()
        expect(result!.manifest.id).toBe(id)
        expect(typeof result!.code).toBe('string')
        expect(typeof result!.styles).toBe('string')
      }
    })
  })

  // ============================================================================
  // getAllBundledPlugins
  // ============================================================================

  describe('getAllBundledPlugins', () => {
    it('returns array of all bundled plugins', () => {
      const plugins = getAllBundledPlugins()
      expect(Array.isArray(plugins)).toBe(true)
      expect(plugins).toHaveLength(BUNDLED_PLUGIN_IDS.length)
    })

    it('each plugin has manifest, code, and styles', () => {
      const plugins = getAllBundledPlugins()
      for (const plugin of plugins) {
        expect(plugin.manifest).toBeDefined()
        expect(plugin.code).toBeDefined()
        expect(plugin.styles).toBeDefined()
      }
    })

    it('includes all expected plugins', () => {
      const plugins = getAllBundledPlugins()
      const ids = plugins.map(p => p.manifest.id)

      expect(ids).toContain('com.quarry.pomodoro-timer')
      expect(ids).toContain('com.quarry.citation-manager')
      expect(ids).toContain('com.quarry.custom-callouts')
      expect(ids).toContain('com.quarry.latex-math')
    })
  })

  // ============================================================================
  // isPublicAccess (requires environment mocking)
  // ============================================================================

  describe('isPublicAccess', () => {
    const originalWindow = global.window
    const originalEnv = process.env.NEXT_PUBLIC_ACCESS

    afterEach(() => {
      // Restore original values
      global.window = originalWindow
      process.env.NEXT_PUBLIC_ACCESS = originalEnv
    })

    it('returns false when env is not set (server-side)', () => {
      // @ts-ignore - intentionally setting window to undefined
      global.window = undefined
      delete process.env.NEXT_PUBLIC_ACCESS
      expect(isPublicAccess()).toBe(false)
    })

    it('returns true when env is "true" (server-side)', () => {
      // @ts-ignore
      global.window = undefined
      process.env.NEXT_PUBLIC_ACCESS = 'true'
      expect(isPublicAccess()).toBe(true)
    })

    it('returns false when env is "false" (server-side)', () => {
      // @ts-ignore
      global.window = undefined
      process.env.NEXT_PUBLIC_ACCESS = 'false'
      expect(isPublicAccess()).toBe(false)
    })

    it('checks window.__QUARRY_PUBLIC_ACCESS__ when window exists', () => {
      // @ts-ignore
      global.window = { __QUARRY_PUBLIC_ACCESS__: true }
      expect(isPublicAccess()).toBe(true)
    })

    it('returns false when window exists but flag is not set', () => {
      // @ts-ignore
      global.window = {}
      expect(isPublicAccess()).toBe(false)
    })
  })

  // ============================================================================
  // canUninstallPlugin
  // ============================================================================

  describe('canUninstallPlugin', () => {
    const originalWindow = global.window

    afterEach(() => {
      global.window = originalWindow
    })

    it('allows uninstall when not in public access mode', () => {
      // @ts-ignore
      global.window = undefined
      delete process.env.NEXT_PUBLIC_ACCESS

      expect(canUninstallPlugin('com.quarry.pomodoro-timer')).toBe(true)
      expect(canUninstallPlugin('com.example.custom')).toBe(true)
    })

    it('blocks bundled plugin uninstall in public access mode', () => {
      // @ts-ignore
      global.window = { __QUARRY_PUBLIC_ACCESS__: true }

      expect(canUninstallPlugin('com.quarry.pomodoro-timer')).toBe(false)
      expect(canUninstallPlugin('com.quarry.citation-manager')).toBe(false)
    })

    it('allows non-bundled plugin uninstall in public access mode', () => {
      // @ts-ignore
      global.window = { __QUARRY_PUBLIC_ACCESS__: true }

      expect(canUninstallPlugin('com.example.custom-plugin')).toBe(true)
    })
  })

  // ============================================================================
  // canInstallPlugins
  // ============================================================================

  describe('canInstallPlugins', () => {
    const originalWindow = global.window

    afterEach(() => {
      global.window = originalWindow
    })

    it('returns true when not in public access mode', () => {
      // @ts-ignore
      global.window = undefined
      delete process.env.NEXT_PUBLIC_ACCESS

      expect(canInstallPlugins()).toBe(true)
    })

    it('returns false in public access mode', () => {
      // @ts-ignore
      global.window = { __QUARRY_PUBLIC_ACCESS__: true }

      expect(canInstallPlugins()).toBe(false)
    })
  })

  // ============================================================================
  // Plugin manifest setting types
  // ============================================================================

  describe('plugin setting types', () => {
    it('supports number type settings', () => {
      const settings = BUNDLED_MANIFESTS['com.quarry.pomodoro-timer'].settings!
      const workDuration = settings.workDuration

      expect(workDuration.type).toBe('number')
      expect(workDuration.min).toBeDefined()
      expect(workDuration.max).toBeDefined()
    })

    it('supports boolean type settings', () => {
      const settings = BUNDLED_MANIFESTS['com.quarry.pomodoro-timer'].settings!
      const autoStart = settings.autoStartBreaks

      expect(autoStart.type).toBe('boolean')
      expect(typeof autoStart.default).toBe('boolean')
    })

    it('supports select type settings with options', () => {
      const settings = BUNDLED_MANIFESTS['com.quarry.citation-manager'].settings!
      const citationStyle = settings.citationStyle

      expect(citationStyle.type).toBe('select')
      expect(citationStyle.options).toBeDefined()
      expect(Array.isArray(citationStyle.options)).toBe(true)
      expect(citationStyle.options!.length).toBeGreaterThan(0)
    })

    it('supports slider type settings', () => {
      const settings = BUNDLED_MANIFESTS['com.quarry.latex-math'].settings!
      const fontSize = settings.fontSize

      expect(fontSize.type).toBe('slider')
      expect(fontSize.min).toBeDefined()
      expect(fontSize.max).toBeDefined()
      expect(fontSize.step).toBeDefined()
    })
  })

  // ============================================================================
  // Plugin code content validation
  // ============================================================================

  describe('plugin code content', () => {
    it('pomodoro code exports plugin class', () => {
      const code = BUNDLED_CODE['com.quarry.pomodoro-timer'].code
      expect(code).toContain('module.exports')
      expect(code).toContain('onLoad')
      expect(code).toContain('onUnload')
    })

    it('citation code has markdown renderer', () => {
      const code = BUNDLED_CODE['com.quarry.citation-manager'].code
      expect(code).toContain('registerMarkdownRenderer')
    })

    it('callouts code has callout types', () => {
      const code = BUNDLED_CODE['com.quarry.custom-callouts'].code
      expect(code).toContain('tip')
      expect(code).toContain('warning')
      expect(code).toContain('danger')
      expect(code).toContain('info')
    })

    it('latex code handles math patterns', () => {
      const code = BUNDLED_CODE['com.quarry.latex-math'].code
      expect(code).toContain('$')
      expect(code).toContain('katex')
    })
  })
})
