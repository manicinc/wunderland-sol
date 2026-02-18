/**
 * Transclusion Types Tests
 * @module __tests__/unit/lib/transclusion/types.test
 *
 * Tests for transclusion type definitions, constants, and regex patterns.
 */

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_TRANSCLUSION_CONFIG,
  BLOCK_REFERENCE_PATTERNS,
} from '@/lib/transclusion/types'

// ============================================================================
// DEFAULT_TRANSCLUSION_CONFIG
// ============================================================================

describe('DEFAULT_TRANSCLUSION_CONFIG', () => {
  it('has maxDepth of 3', () => {
    expect(DEFAULT_TRANSCLUSION_CONFIG.maxDepth).toBe(3)
  })

  it('has hover preview enabled by default', () => {
    expect(DEFAULT_TRANSCLUSION_CONFIG.showHoverPreview).toBe(true)
  })

  it('has hover preview delay of 300ms', () => {
    expect(DEFAULT_TRANSCLUSION_CONFIG.hoverPreviewDelay).toBe(300)
  })

  it('has mirror disabled by default', () => {
    expect(DEFAULT_TRANSCLUSION_CONFIG.enableMirror).toBe(false)
  })

  it('has citation tracking enabled', () => {
    expect(DEFAULT_TRANSCLUSION_CONFIG.trackCitations).toBe(true)
  })

  it('has backlink indicators enabled', () => {
    expect(DEFAULT_TRANSCLUSION_CONFIG.showBacklinkIndicators).toBe(true)
  })

  it('has auto-update backlinks enabled', () => {
    expect(DEFAULT_TRANSCLUSION_CONFIG.autoUpdateBacklinks).toBe(true)
  })
})

// ============================================================================
// BLOCK_REFERENCE_PATTERNS
// ============================================================================

describe('BLOCK_REFERENCE_PATTERNS', () => {
  describe('full pattern', () => {
    it('matches basic link reference', () => {
      const text = '[[strand-path#block-1]]'
      const matches = [...text.matchAll(BLOCK_REFERENCE_PATTERNS.full)]

      expect(matches).toHaveLength(1)
      expect(matches[0][1]).toBe('') // No prefix
      expect(matches[0][2]).toBe('strand-path')
      expect(matches[0][3]).toBe('block-1')
    })

    it('matches embed reference', () => {
      const text = '![[strand-path#block-1]]'
      const matches = [...text.matchAll(BLOCK_REFERENCE_PATTERNS.full)]

      expect(matches).toHaveLength(1)
      expect(matches[0][1]).toBe('!')
      expect(matches[0][2]).toBe('strand-path')
      expect(matches[0][3]).toBe('block-1')
    })

    it('matches citation reference', () => {
      const text = '^[[strand-path#block-1]]'
      const matches = [...text.matchAll(BLOCK_REFERENCE_PATTERNS.full)]

      expect(matches).toHaveLength(1)
      expect(matches[0][1]).toBe('^')
      expect(matches[0][2]).toBe('strand-path')
      expect(matches[0][3]).toBe('block-1')
    })

    it('matches mirror reference', () => {
      const text = '=[[strand-path#block-1]]'
      const matches = [...text.matchAll(BLOCK_REFERENCE_PATTERNS.full)]

      expect(matches).toHaveLength(1)
      expect(matches[0][1]).toBe('=')
      expect(matches[0][2]).toBe('strand-path')
      expect(matches[0][3]).toBe('block-1')
    })

    it('matches reference with alias', () => {
      const text = '[[strand-path#block-1|Custom Text]]'
      const matches = [...text.matchAll(BLOCK_REFERENCE_PATTERNS.full)]

      expect(matches).toHaveLength(1)
      expect(matches[0][2]).toBe('strand-path')
      expect(matches[0][3]).toBe('block-1')
      expect(matches[0][4]).toBe('Custom Text')
    })

    it('matches reference with path containing slashes', () => {
      const text = '[[weaves/wiki/tutorials#intro]]'
      const matches = [...text.matchAll(BLOCK_REFERENCE_PATTERNS.full)]

      expect(matches).toHaveLength(1)
      expect(matches[0][2]).toBe('weaves/wiki/tutorials')
      expect(matches[0][3]).toBe('intro')
    })

    it('matches multiple references', () => {
      const text = '[[path1#block1]] and ![[path2#block2]]'
      const matches = [...text.matchAll(BLOCK_REFERENCE_PATTERNS.full)]

      expect(matches).toHaveLength(2)
      expect(matches[0][2]).toBe('path1')
      expect(matches[1][2]).toBe('path2')
    })

    it('does not match regular wiki links without block ID', () => {
      const text = '[[strand-path]]'
      const matches = [...text.matchAll(BLOCK_REFERENCE_PATTERNS.full)]

      expect(matches).toHaveLength(0)
    })
  })

  describe('embed pattern', () => {
    it('matches embed references', () => {
      const text = '![[strand-path#block-1]]'
      const matches = [...text.matchAll(BLOCK_REFERENCE_PATTERNS.embed)]

      expect(matches).toHaveLength(1)
      expect(matches[0][1]).toBe('strand-path')
      expect(matches[0][2]).toBe('block-1')
    })

    it('does not match link references', () => {
      const text = '[[strand-path#block-1]]'
      const matches = [...text.matchAll(BLOCK_REFERENCE_PATTERNS.embed)]

      expect(matches).toHaveLength(0)
    })

    it('matches embed with alias', () => {
      const text = '![[strand-path#block-1|Display Text]]'
      const matches = [...text.matchAll(BLOCK_REFERENCE_PATTERNS.embed)]

      expect(matches).toHaveLength(1)
      expect(matches[0][3]).toBe('Display Text')
    })
  })

  describe('citation pattern', () => {
    it('matches citation references', () => {
      const text = '^[[strand-path#block-1]]'
      const matches = [...text.matchAll(BLOCK_REFERENCE_PATTERNS.citation)]

      expect(matches).toHaveLength(1)
      expect(matches[0][1]).toBe('strand-path')
      expect(matches[0][2]).toBe('block-1')
    })

    it('does not match embed references', () => {
      const text = '![[strand-path#block-1]]'
      const matches = [...text.matchAll(BLOCK_REFERENCE_PATTERNS.citation)]

      expect(matches).toHaveLength(0)
    })
  })

  describe('mirror pattern', () => {
    it('matches mirror references', () => {
      const text = '=[[strand-path#block-1]]'
      const matches = [...text.matchAll(BLOCK_REFERENCE_PATTERNS.mirror)]

      expect(matches).toHaveLength(1)
      expect(matches[0][1]).toBe('strand-path')
      expect(matches[0][2]).toBe('block-1')
    })

    it('does not match embed references', () => {
      const text = '![[strand-path#block-1]]'
      const matches = [...text.matchAll(BLOCK_REFERENCE_PATTERNS.mirror)]

      expect(matches).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('handles block IDs with numbers and hyphens', () => {
      const text = '[[path#block-123-abc]]'
      const matches = [...text.matchAll(BLOCK_REFERENCE_PATTERNS.full)]

      expect(matches).toHaveLength(1)
      expect(matches[0][3]).toBe('block-123-abc')
    })

    it('handles paths with special characters', () => {
      const text = '[[path-to_strand#block]]'
      const matches = [...text.matchAll(BLOCK_REFERENCE_PATTERNS.full)]

      expect(matches).toHaveLength(1)
      expect(matches[0][2]).toBe('path-to_strand')
    })

    it('handles adjacent references', () => {
      const text = '[[a#1]][[b#2]]'
      const matches = [...text.matchAll(BLOCK_REFERENCE_PATTERNS.full)]

      expect(matches).toHaveLength(2)
    })

    it('handles references in multiline text', () => {
      const text = `Line one [[path1#block1]]
Line two ![[path2#block2]]
Line three ^[[path3#block3]]`
      const matches = [...text.matchAll(BLOCK_REFERENCE_PATTERNS.full)]

      expect(matches).toHaveLength(3)
    })
  })
})
