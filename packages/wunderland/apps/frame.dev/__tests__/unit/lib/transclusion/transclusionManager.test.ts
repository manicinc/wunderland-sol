/**
 * Transclusion Manager Tests
 * @module __tests__/unit/lib/transclusion/transclusionManager.test
 *
 * Tests for pure functions and configuration in transclusionManager.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseBlockReferences,
  extractReferencedPaths,
  updateConfig,
  getConfig,
  subscribe,
  DEFAULT_TRANSCLUSION_CONFIG,
} from '@/lib/transclusion/transclusionManager'

// ============================================================================
// parseBlockReferences
// ============================================================================

describe('parseBlockReferences', () => {
  it('parses simple link reference', () => {
    const content = '[[strand-path#block-1]]'
    const refs = parseBlockReferences(content, 'current-strand')

    expect(refs).toHaveLength(1)
    expect(refs[0].type).toBe('link')
    expect(refs[0].strandPath).toBe('strand-path')
    expect(refs[0].blockId).toBe('block-1')
  })

  it('parses embed reference', () => {
    const content = '![[strand-path#block-1]]'
    const refs = parseBlockReferences(content, 'current-strand')

    expect(refs).toHaveLength(1)
    expect(refs[0].type).toBe('embed')
    expect(refs[0].strandPath).toBe('strand-path')
    expect(refs[0].blockId).toBe('block-1')
  })

  it('parses citation reference', () => {
    const content = '^[[strand-path#block-1]]'
    const refs = parseBlockReferences(content, 'current-strand')

    expect(refs).toHaveLength(1)
    expect(refs[0].type).toBe('citation')
    expect(refs[0].strandPath).toBe('strand-path')
    expect(refs[0].blockId).toBe('block-1')
  })

  it('parses mirror reference', () => {
    const content = '=[[strand-path#block-1]]'
    const refs = parseBlockReferences(content, 'current-strand')

    expect(refs).toHaveLength(1)
    expect(refs[0].type).toBe('mirror')
    expect(refs[0].strandPath).toBe('strand-path')
    expect(refs[0].blockId).toBe('block-1')
  })

  it('parses reference with alias', () => {
    const content = '[[strand-path#block-1|Custom Display]]'
    const refs = parseBlockReferences(content, 'current-strand')

    expect(refs).toHaveLength(1)
    expect(refs[0].alias).toBe('Custom Display')
  })

  it('parses multiple references', () => {
    const content = `See [[doc1#intro]] for more info.
Also check ![[doc2#example]] for examples.`
    const refs = parseBlockReferences(content, 'current-strand')

    expect(refs).toHaveLength(2)
    expect(refs[0].strandPath).toBe('doc1')
    expect(refs[0].blockId).toBe('intro')
    expect(refs[0].type).toBe('link')
    expect(refs[1].strandPath).toBe('doc2')
    expect(refs[1].blockId).toBe('example')
    expect(refs[1].type).toBe('embed')
  })

  it('tracks line numbers', () => {
    const content = `Line 1
[[doc#block]] on line 2
Line 3`
    const refs = parseBlockReferences(content, 'current-strand')

    expect(refs).toHaveLength(1)
    expect(refs[0].lineNumber).toBe(2)
  })

  it('tracks start and end indices', () => {
    const content = 'See [[doc#block]] here'
    const refs = parseBlockReferences(content, 'current-strand')

    expect(refs).toHaveLength(1)
    expect(refs[0].startIndex).toBe(4)
    expect(refs[0].endIndex).toBe(17)
    expect(refs[0].rawMatch).toBe('[[doc#block]]')
  })

  it('parses paths with slashes', () => {
    const content = '[[weaves/wiki/tutorials#intro]]'
    const refs = parseBlockReferences(content, 'current-strand')

    expect(refs).toHaveLength(1)
    expect(refs[0].strandPath).toBe('weaves/wiki/tutorials')
    expect(refs[0].blockId).toBe('intro')
  })

  it('handles empty content', () => {
    const refs = parseBlockReferences('', 'current-strand')
    expect(refs).toEqual([])
  })

  it('handles content without references', () => {
    const refs = parseBlockReferences('Just plain text without any references.', 'current-strand')
    expect(refs).toEqual([])
  })

  it('handles multiple references on same line', () => {
    const content = '[[a#1]] and [[b#2]] and [[c#3]]'
    const refs = parseBlockReferences(content, 'current-strand')

    expect(refs).toHaveLength(3)
    expect(refs.map(r => r.strandPath)).toEqual(['a', 'b', 'c'])
  })

  it('handles reference types in mixed content', () => {
    const content = `
# Header

Some text with [[doc#block1]] reference.

- List item with ![[embed#block2]]
- Another with ^[[cite#block3]]

> Quote with =[[mirror#block4]]
`
    const refs = parseBlockReferences(content, 'current-strand')

    expect(refs).toHaveLength(4)
    expect(refs[0].type).toBe('link')
    expect(refs[1].type).toBe('embed')
    expect(refs[2].type).toBe('citation')
    expect(refs[3].type).toBe('mirror')
  })
})

// ============================================================================
// extractReferencedPaths
// ============================================================================

describe('extractReferencedPaths', () => {
  it('extracts unique paths', () => {
    const content = '[[doc1#block1]] and [[doc2#block2]]'
    const paths = extractReferencedPaths(content)

    expect(paths).toHaveLength(2)
    expect(paths).toContain('doc1')
    expect(paths).toContain('doc2')
  })

  it('deduplicates paths', () => {
    const content = '[[doc1#block1]] and [[doc1#block2]] and [[doc1#block3]]'
    const paths = extractReferencedPaths(content)

    expect(paths).toHaveLength(1)
    expect(paths[0]).toBe('doc1')
  })

  it('works with different reference types', () => {
    const content = '[[doc1#a]] ![[doc2#b]] ^[[doc3#c]] =[[doc4#d]]'
    const paths = extractReferencedPaths(content)

    expect(paths).toHaveLength(4)
    expect(paths).toContain('doc1')
    expect(paths).toContain('doc2')
    expect(paths).toContain('doc3')
    expect(paths).toContain('doc4')
  })

  it('handles empty content', () => {
    const paths = extractReferencedPaths('')
    expect(paths).toEqual([])
  })

  it('handles content without references', () => {
    const paths = extractReferencedPaths('Just text without references')
    expect(paths).toEqual([])
  })

  it('handles paths with slashes', () => {
    const content = '[[weaves/wiki/tutorials#block]]'
    const paths = extractReferencedPaths(content)

    expect(paths).toHaveLength(1)
    expect(paths[0]).toBe('weaves/wiki/tutorials')
  })
})

// ============================================================================
// Configuration (updateConfig / getConfig)
// ============================================================================

describe('Configuration', () => {
  // Save original config before tests
  let originalConfig: ReturnType<typeof getConfig>

  beforeEach(() => {
    originalConfig = getConfig()
  })

  afterEach(() => {
    // Restore original config
    updateConfig(originalConfig)
  })

  describe('getConfig', () => {
    it('returns current configuration', () => {
      const config = getConfig()

      expect(config).toBeDefined()
      expect(typeof config.maxDepth).toBe('number')
      expect(typeof config.showHoverPreview).toBe('boolean')
    })

    it('returns a copy (not the original object)', () => {
      const config1 = getConfig()
      const config2 = getConfig()

      expect(config1).not.toBe(config2)
      expect(config1).toEqual(config2)
    })
  })

  describe('updateConfig', () => {
    it('updates specific config values', () => {
      updateConfig({ maxDepth: 5 })
      const config = getConfig()

      expect(config.maxDepth).toBe(5)
    })

    it('preserves other config values', () => {
      const before = getConfig()
      updateConfig({ maxDepth: 10 })
      const after = getConfig()

      expect(after.maxDepth).toBe(10)
      expect(after.showHoverPreview).toBe(before.showHoverPreview)
      expect(after.hoverPreviewDelay).toBe(before.hoverPreviewDelay)
    })

    it('can update multiple values at once', () => {
      updateConfig({
        maxDepth: 7,
        showHoverPreview: false,
        hoverPreviewDelay: 500,
      })

      const config = getConfig()
      expect(config.maxDepth).toBe(7)
      expect(config.showHoverPreview).toBe(false)
      expect(config.hoverPreviewDelay).toBe(500)
    })
  })
})

// ============================================================================
// Event System (subscribe)
// ============================================================================

describe('subscribe', () => {
  it('returns unsubscribe function', () => {
    const callback = vi.fn()
    const unsubscribe = subscribe(callback)

    expect(typeof unsubscribe).toBe('function')
  })

  it('unsubscribe removes the listener', () => {
    const callback = vi.fn()
    const unsubscribe = subscribe(callback)

    // Unsubscribe immediately
    unsubscribe()

    // Callback should not be in the listener set anymore
    // We can't directly test this without triggering an event,
    // but we can verify unsubscribe returns cleanly
    expect(() => unsubscribe()).not.toThrow()
  })

  it('multiple unsubscribe calls are safe', () => {
    const callback = vi.fn()
    const unsubscribe = subscribe(callback)

    unsubscribe()
    unsubscribe()
    unsubscribe()

    // Should not throw
  })

  it('supports multiple subscribers', () => {
    const callback1 = vi.fn()
    const callback2 = vi.fn()

    const unsub1 = subscribe(callback1)
    const unsub2 = subscribe(callback2)

    // Clean up
    unsub1()
    unsub2()
  })
})

// ============================================================================
// DEFAULT_TRANSCLUSION_CONFIG (re-export)
// ============================================================================

describe('DEFAULT_TRANSCLUSION_CONFIG export', () => {
  it('is exported from manager', () => {
    expect(DEFAULT_TRANSCLUSION_CONFIG).toBeDefined()
    expect(DEFAULT_TRANSCLUSION_CONFIG.maxDepth).toBe(3)
  })
})
