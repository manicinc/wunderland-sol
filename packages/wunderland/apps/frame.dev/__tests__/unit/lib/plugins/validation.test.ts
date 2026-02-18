/**
 * Plugin Validation Tests
 * @module __tests__/unit/lib/plugins/validation.test
 *
 * Tests for plugin manifest validation and compatibility checking.
 */

import { describe, it, expect } from 'vitest'
import {
  validateManifest,
  checkCompatibility,
  parseManifest,
  getDefaultSettings,
} from '@/lib/plugins/validation'
import type { PluginManifest } from '@/lib/plugins/types'
import { QUARRY_VERSION, VALID_PLUGIN_TYPES } from '@/lib/plugins/types'

// ============================================================================
// Test Fixtures
// ============================================================================

const createValidManifest = (overrides: Partial<PluginManifest> = {}): PluginManifest => ({
  id: 'com.example.test-plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  minQuarryVersion: QUARRY_VERSION,
  type: 'widget',
  author: 'Test Author',
  description: 'A test plugin',
  main: 'index.js',
  ...overrides,
})

// ============================================================================
// validateManifest
// ============================================================================

describe('validateManifest', () => {
  describe('required fields', () => {
    it('validates a complete manifest', () => {
      const manifest = createValidManifest()
      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('fails when id is missing', () => {
      const manifest = createValidManifest({ id: undefined as unknown as string })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.toLowerCase().includes('id'))).toBe(true)
    })

    it('fails when name is missing', () => {
      const manifest = createValidManifest({ name: undefined as unknown as string })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.toLowerCase().includes('name'))).toBe(true)
    })

    it('fails when version is missing', () => {
      const manifest = createValidManifest({ version: undefined as unknown as string })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.toLowerCase().includes('version'))).toBe(true)
    })

    it('fails when type is missing', () => {
      const manifest = createValidManifest({ type: undefined as unknown as PluginManifest['type'] })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.toLowerCase().includes('type'))).toBe(true)
    })

    it('fails when description is missing', () => {
      const manifest = createValidManifest({ description: undefined as unknown as string })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.toLowerCase().includes('description'))).toBe(true)
    })

    it('fails when author is missing', () => {
      const manifest = createValidManifest({ author: undefined as unknown as string })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.toLowerCase().includes('author'))).toBe(true)
    })

    it('fails when main is missing', () => {
      const manifest = createValidManifest({ main: undefined as unknown as string })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.toLowerCase().includes('main'))).toBe(true)
    })

    it('fails when minQuarryVersion is missing', () => {
      const manifest = createValidManifest({ minQuarryVersion: undefined as unknown as string })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.toLowerCase().includes('quarryversion'))).toBe(true)
    })
  })

  describe('id validation', () => {
    it('accepts reverse domain notation', () => {
      const manifest = createValidManifest({ id: 'com.example.my-plugin' })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
    })

    it('fails with simple id format (not reverse domain)', () => {
      const manifest = createValidManifest({ id: 'my-plugin' })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('reverse domain'))).toBe(true)
    })

    it('fails with empty id', () => {
      const manifest = createValidManifest({ id: '' })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
    })

    it('fails with whitespace in id', () => {
      const manifest = createValidManifest({ id: 'com.example.my plugin' })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
    })

    it('accepts multiple domain segments', () => {
      const manifest = createValidManifest({ id: 'io.github.user.my-plugin' })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
    })
  })

  describe('version validation', () => {
    it('accepts valid semver', () => {
      const manifest = createValidManifest({ version: '1.2.3' })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
    })

    it('accepts semver with prerelease', () => {
      const manifest = createValidManifest({ version: '1.0.0-beta.1' })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
    })

    it('accepts semver with build metadata', () => {
      const manifest = createValidManifest({ version: '1.0.0+build.123' })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
    })

    it('fails with invalid version format', () => {
      const manifest = createValidManifest({ version: 'invalid' })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.toLowerCase().includes('version'))).toBe(true)
    })

    it('fails with incomplete version', () => {
      const manifest = createValidManifest({ version: '1.0' })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
    })
  })

  describe('type validation', () => {
    it.each(VALID_PLUGIN_TYPES)('accepts valid type: %s', (type) => {
      const manifest = createValidManifest({ type: type as PluginManifest['type'] })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
    })

    it('fails with invalid type', () => {
      const manifest = createValidManifest({ type: 'invalid-type' as PluginManifest['type'] })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.toLowerCase().includes('type'))).toBe(true)
    })
  })

  describe('main validation', () => {
    it('accepts .js file', () => {
      const manifest = createValidManifest({ main: 'dist/index.js' })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
    })

    it('fails when main is not a .js file', () => {
      const manifest = createValidManifest({ main: 'index.ts' })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('.js'))).toBe(true)
    })
  })

  describe('settings validation', () => {
    it('accepts valid settings object', () => {
      const manifest = createValidManifest({
        settings: {
          option1: { type: 'boolean', label: 'Option 1', default: true },
          option2: { type: 'string', label: 'Option 2', default: 'value' },
        },
      })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
    })

    it('fails when setting is missing type', () => {
      const manifest = createValidManifest({
        settings: {
          opt: { label: 'Option', default: true } as any,
        },
      })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
    })

    it('fails when setting is missing default', () => {
      const manifest = createValidManifest({
        settings: {
          opt: { type: 'boolean', label: 'Option' } as any,
        },
      })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
    })

    it('fails when setting is missing label', () => {
      const manifest = createValidManifest({
        settings: {
          opt: { type: 'boolean', default: true } as any,
        },
      })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
    })

    it('accepts all valid setting types', () => {
      const manifest = createValidManifest({
        settings: {
          bool: { type: 'boolean', label: 'Boolean', default: false },
          str: { type: 'string', label: 'String', default: '' },
          num: { type: 'number', label: 'Number', default: 0 },
          sel: { type: 'select', label: 'Select', default: 'a', options: ['a', 'b'] },
          col: { type: 'color', label: 'Color', default: '#000000' },
          sld: { type: 'slider', label: 'Slider', default: 50, min: 0, max: 100 },
        },
      })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
    })

    it('fails when select setting has no options', () => {
      const manifest = createValidManifest({
        settings: {
          sel: { type: 'select', label: 'Select', default: 'a' },
        },
      })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('options'))).toBe(true)
    })

    it('fails when slider min > max', () => {
      const manifest = createValidManifest({
        settings: {
          sld: { type: 'slider', label: 'Slider', default: 50, min: 100, max: 0 },
        },
      })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('min') && e.includes('max'))).toBe(true)
    })
  })

  describe('optional fields', () => {
    it('accepts styles as .css file', () => {
      const manifest = createValidManifest({ styles: 'styles.css' })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
    })

    it('fails when styles is not .css', () => {
      const manifest = createValidManifest({ styles: 'styles.scss' })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
    })

    it('accepts valid permissions array', () => {
      const manifest = createValidManifest({ permissions: ['storage', 'network'] })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
    })

    it('accepts valid keywords array', () => {
      const manifest = createValidManifest({ keywords: ['test', 'plugin'] })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
    })

    it('accepts valid authorUrl', () => {
      const manifest = createValidManifest({ authorUrl: 'https://example.com' })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
    })

    it('warns for invalid authorUrl', () => {
      const manifest = createValidManifest({ authorUrl: 'not-a-url' })
      const result = validateManifest(manifest)

      expect(result.warnings?.some(w => w.includes('authorUrl'))).toBe(true)
    })
  })

  describe('warnings', () => {
    it('warns when name is too long', () => {
      const manifest = createValidManifest({ name: 'A'.repeat(60) })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
      expect(result.warnings?.some(w => w.includes('Name'))).toBe(true)
    })

    it('warns when description is too long', () => {
      const manifest = createValidManifest({ description: 'A'.repeat(210) })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
      expect(result.warnings?.some(w => w.includes('Description'))).toBe(true)
    })

    it('warns when widget/panel has no position', () => {
      const manifest = createValidManifest({ type: 'widget' })
      const result = validateManifest(manifest)

      expect(result.warnings?.some(w => w.includes('position'))).toBe(true)
    })
  })
})

// ============================================================================
// checkCompatibility
// ============================================================================

describe('checkCompatibility', () => {
  it('returns compatible when minQuarryVersion equals current version', () => {
    const manifest = createValidManifest({ minQuarryVersion: QUARRY_VERSION })
    const result = checkCompatibility(manifest)

    expect(result.compatible).toBe(true)
  })

  it('returns compatible when minQuarryVersion is lower than current', () => {
    const manifest = createValidManifest({ minQuarryVersion: '0.0.1' })
    const result = checkCompatibility(manifest)

    expect(result.compatible).toBe(true)
  })

  it('returns incompatible when minQuarryVersion is higher than current', () => {
    const manifest = createValidManifest({ minQuarryVersion: '99.0.0' })
    const result = checkCompatibility(manifest)

    expect(result.compatible).toBe(false)
    expect(result.reason).toBeDefined()
    expect(result.reason).toContain('99.0.0')
  })

  it('reason contains both versions when incompatible', () => {
    const manifest = createValidManifest({ minQuarryVersion: '99.0.0' })
    const result = checkCompatibility(manifest)

    expect(result.reason).toContain('99.0.0')
    expect(result.reason).toContain(QUARRY_VERSION)
  })
})

// ============================================================================
// parseManifest
// ============================================================================

describe('parseManifest', () => {
  it('parses valid JSON manifest', () => {
    const json = JSON.stringify(createValidManifest())
    const result = parseManifest(json)

    expect(result.valid).toBe(true)
    expect(result.manifest).toBeDefined()
    expect(result.manifest?.id).toBe('com.example.test-plugin')
  })

  it('returns error for invalid JSON', () => {
    const result = parseManifest('not valid json')

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Invalid JSON'))).toBe(true)
  })

  it('returns error for null input', () => {
    const result = parseManifest('null')

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('object'))).toBe(true)
  })

  it('returns error for array input', () => {
    const result = parseManifest('[]')

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('returns error for empty string', () => {
    const result = parseManifest('')

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('preserves all manifest fields', () => {
    const manifest = createValidManifest({
      repository: 'https://github.com/example/plugin',
      license: 'MIT',
    })
    const json = JSON.stringify(manifest)
    const result = parseManifest(json)

    expect(result.manifest?.repository).toBe('https://github.com/example/plugin')
    expect(result.manifest?.license).toBe('MIT')
  })

  it('handles manifest with settings', () => {
    const manifest = createValidManifest({
      settings: {
        enabled: { type: 'boolean', label: 'Enabled', default: true },
      },
    })
    const json = JSON.stringify(manifest)
    const result = parseManifest(json)

    expect(result.manifest?.settings).toBeDefined()
    expect(result.manifest?.settings?.enabled).toBeDefined()
    expect(result.manifest?.settings?.enabled.default).toBe(true)
  })
})

// ============================================================================
// getDefaultSettings
// ============================================================================

describe('getDefaultSettings', () => {
  it('returns empty object for manifest without settings', () => {
    const manifest = createValidManifest({ settings: undefined })
    const defaults = getDefaultSettings(manifest)

    expect(defaults).toEqual({})
  })

  it('returns empty object for empty settings object', () => {
    const manifest = createValidManifest({ settings: {} })
    const defaults = getDefaultSettings(manifest)

    expect(defaults).toEqual({})
  })

  it('extracts default values from settings', () => {
    const manifest = createValidManifest({
      settings: {
        enabled: { type: 'boolean', label: 'Enabled', default: true },
        name: { type: 'string', label: 'Name', default: 'default' },
        count: { type: 'number', label: 'Count', default: 10 },
      },
    })
    const defaults = getDefaultSettings(manifest)

    expect(defaults).toEqual({
      enabled: true,
      name: 'default',
      count: 10,
    })
  })

  it('handles boolean false as default', () => {
    const manifest = createValidManifest({
      settings: {
        disabled: { type: 'boolean', label: 'Disabled', default: false },
      },
    })
    const defaults = getDefaultSettings(manifest)

    expect(defaults.disabled).toBe(false)
  })

  it('handles number zero as default', () => {
    const manifest = createValidManifest({
      settings: {
        offset: { type: 'number', label: 'Offset', default: 0 },
      },
    })
    const defaults = getDefaultSettings(manifest)

    expect(defaults.offset).toBe(0)
  })

  it('handles empty string as default', () => {
    const manifest = createValidManifest({
      settings: {
        prefix: { type: 'string', label: 'Prefix', default: '' },
      },
    })
    const defaults = getDefaultSettings(manifest)

    expect(defaults.prefix).toBe('')
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  describe('validateManifest edge cases', () => {
    it('handles non-object input', () => {
      const result = validateManifest('not an object')

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('object'))).toBe(true)
    })

    it('handles null input', () => {
      const result = validateManifest(null)

      expect(result.valid).toBe(false)
    })

    it('handles undefined input', () => {
      const result = validateManifest(undefined)

      expect(result.valid).toBe(false)
    })

    it('handles unicode in name', () => {
      const manifest = createValidManifest({ name: 'プラグイン Test 🔌' })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
    })

    it('handles all optional fields present', () => {
      const manifest = createValidManifest({
        authorUrl: 'https://example.com',
        fundingUrl: 'https://sponsor.me',
        styles: 'styles.css',
        position: 'sidebar',
        permissions: ['storage'],
        keywords: ['test'],
        repository: 'https://github.com/test/plugin',
        license: 'MIT',
      })
      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
    })
  })
})
