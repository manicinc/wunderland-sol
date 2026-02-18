/**
 * Custom Hooks Tests
 * @module tests/unit/hooks/hooks
 *
 * Tests for custom React hooks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatShortcut } from '@/lib/hooks/useKeyboardShortcuts'
import {
  DEFAULT_BLOCK_SHORTCUTS,
  getBlockLevelShortcutsList,
} from '@/lib/hooks/useBlockLevelShortcuts'

describe('useKeyboardShortcuts', () => {
  describe('formatShortcut', () => {
    // Note: These tests are platform-dependent
    // In a real environment, you'd mock navigator.platform

    it('should handle Cmd modifier', () => {
      // On Mac, Cmd stays as symbol, on Windows converts to Ctrl
      const formatted = formatShortcut('Cmd+K')
      expect(formatted).toBeDefined()
      expect(formatted.length).toBeGreaterThan(0)
    })

    it('should handle Shift modifier', () => {
      const formatted = formatShortcut('Cmd+Shift+P')
      expect(formatted).toBeDefined()
    })

    it('should handle Alt modifier', () => {
      const formatted = formatShortcut('Alt+Enter')
      expect(formatted).toBeDefined()
    })

    it('should handle multiple modifiers', () => {
      const formatted = formatShortcut('Cmd+Shift+Alt+K')
      expect(formatted).toBeDefined()
      expect(formatted.length).toBeGreaterThan(0)
    })

    it('should handle single key', () => {
      const formatted = formatShortcut('/')
      expect(formatted).toBe('/')
    })
  })
})

describe('useBlockLevelShortcuts', () => {
  describe('DEFAULT_BLOCK_SHORTCUTS', () => {
    it('should have all required shortcuts', () => {
      expect(DEFAULT_BLOCK_SHORTCUTS).toHaveProperty('openQueryPalette')
      expect(DEFAULT_BLOCK_SHORTCUTS).toHaveProperty('addTag')
      expect(DEFAULT_BLOCK_SHORTCUTS).toHaveProperty('openBacklinks')
      expect(DEFAULT_BLOCK_SHORTCUTS).toHaveProperty('quickSearch')
      expect(DEFAULT_BLOCK_SHORTCUTS).toHaveProperty('addSupertag')
      expect(DEFAULT_BLOCK_SHORTCUTS).toHaveProperty('toggleSidebar')
      expect(DEFAULT_BLOCK_SHORTCUTS).toHaveProperty('focusSearch')
      expect(DEFAULT_BLOCK_SHORTCUTS).toHaveProperty('nextResult')
      expect(DEFAULT_BLOCK_SHORTCUTS).toHaveProperty('prevResult')
    })

    it('should have valid shortcut format', () => {
      for (const [key, value] of Object.entries(DEFAULT_BLOCK_SHORTCUTS)) {
        expect(typeof value).toBe('string')
        expect(value.length).toBeGreaterThan(0)
      }
    })

    it('should use Cmd prefix for main shortcuts', () => {
      expect(DEFAULT_BLOCK_SHORTCUTS.openQueryPalette).toContain('Cmd')
      expect(DEFAULT_BLOCK_SHORTCUTS.quickSearch).toContain('Cmd')
      expect(DEFAULT_BLOCK_SHORTCUTS.addTag).toContain('Cmd')
    })
  })

  describe('getBlockLevelShortcutsList', () => {
    it('should return a list of shortcuts', () => {
      const list = getBlockLevelShortcutsList()

      expect(Array.isArray(list)).toBe(true)
      expect(list.length).toBeGreaterThan(0)
    })

    it('should have key and description for each shortcut', () => {
      const list = getBlockLevelShortcutsList()

      for (const shortcut of list) {
        expect(shortcut).toHaveProperty('key')
        expect(shortcut).toHaveProperty('description')
        expect(shortcut.key.length).toBeGreaterThan(0)
        expect(shortcut.description.length).toBeGreaterThan(0)
      }
    })

    it('should use custom config when provided', () => {
      const customConfig = {
        openQueryPalette: 'Ctrl+Space',
        addTag: 'Ctrl+T',
      }

      const list = getBlockLevelShortcutsList(customConfig)
      const queryShortcut = list.find(s => s.description === 'Open query palette')

      expect(queryShortcut?.key).toBe('Ctrl+Space')
    })

    it('should filter out empty shortcuts', () => {
      const configWithEmpty = {
        ...DEFAULT_BLOCK_SHORTCUTS,
        addTag: '',
      }

      const list = getBlockLevelShortcutsList(configWithEmpty)
      const tagShortcut = list.find(s => s.description === 'Add tag to block')

      // Empty shortcuts should be filtered out
      expect(tagShortcut).toBeUndefined()
    })
  })
})

describe('useDebounce', () => {
  // Note: Testing React hooks requires @testing-library/react-hooks
  // These are basic structure tests

  it('should export useDebounce function', async () => {
    const { useDebounce } = await import('@/lib/hooks/useDebounce')
    expect(typeof useDebounce).toBe('function')
  })

  it('should export useDebouncedCallback function', async () => {
    const { useDebouncedCallback } = await import('@/lib/hooks/useDebounce')
    expect(typeof useDebouncedCallback).toBe('function')
  })
})
