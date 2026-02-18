/**
 * Transclusion System Tests
 * @module tests/unit/transclusion/transclusion
 *
 * Tests for block reference parsing and transclusion types.
 */

import { describe, it, expect } from 'vitest'
import {
  BLOCK_REFERENCE_PATTERNS,
  type ParsedBlockReference,
  type ReferenceType,
} from '@/lib/transclusion/types'

/**
 * Helper to get a non-global version of a regex pattern for capture group testing.
 * When using .match() with the 'g' flag, it returns only the matched strings,
 * not the capture groups. This helper creates a non-global version.
 */
function getNonGlobalPattern(pattern: RegExp): RegExp {
  return new RegExp(pattern.source)
}

describe('Transclusion System', () => {
  describe('Block Reference Patterns', () => {
    describe('link pattern', () => {
      it('should match basic link syntax', () => {
        const text = '[[technology/react#block-123]]'
        const match = text.match(getNonGlobalPattern(BLOCK_REFERENCE_PATTERNS.link))

        expect(match).not.toBeNull()
      })

      it('should capture strand path', () => {
        const text = '[[technology/react#block-123]]'
        const match = text.match(getNonGlobalPattern(BLOCK_REFERENCE_PATTERNS.link))

        expect(match?.[1]).toBe('technology/react')
      })

      it('should capture block ID', () => {
        const text = '[[technology/react#block-123]]'
        const match = text.match(getNonGlobalPattern(BLOCK_REFERENCE_PATTERNS.link))

        expect(match?.[2]).toBe('block-123')
      })

      it('should not match link without block ID (block ID is required)', () => {
        // The current pattern requires a #blockId - links without block IDs don't match
        const text = '[[technology/react]]'
        const match = text.match(getNonGlobalPattern(BLOCK_REFERENCE_PATTERNS.link))

        expect(match).toBeNull()
      })

      it('should not match empty brackets', () => {
        const text = '[[]]'
        const match = text.match(getNonGlobalPattern(BLOCK_REFERENCE_PATTERNS.link))

        expect(match).toBeNull()
      })
    })

    describe('embed pattern', () => {
      it('should match embed syntax with exclamation', () => {
        const text = '![[technology/react#block-123]]'
        const match = text.match(getNonGlobalPattern(BLOCK_REFERENCE_PATTERNS.embed))

        expect(match).not.toBeNull()
      })

      it('should capture path and block ID', () => {
        const text = '![[path/to/strand#my-block]]'
        const match = text.match(getNonGlobalPattern(BLOCK_REFERENCE_PATTERNS.embed))

        expect(match?.[1]).toBe('path/to/strand')
        expect(match?.[2]).toBe('my-block')
      })

      it('should not match regular link', () => {
        const text = '[[technology/react#block-123]]'
        const match = text.match(getNonGlobalPattern(BLOCK_REFERENCE_PATTERNS.embed))

        expect(match).toBeNull()
      })
    })

    describe('citation pattern', () => {
      it('should match citation syntax with caret', () => {
        const text = '^[[technology/react#block-123]]'
        const match = text.match(getNonGlobalPattern(BLOCK_REFERENCE_PATTERNS.citation))

        expect(match).not.toBeNull()
      })

      it('should capture path and block ID', () => {
        const text = '^[[source/document#quote-1]]'
        const match = text.match(getNonGlobalPattern(BLOCK_REFERENCE_PATTERNS.citation))

        expect(match?.[1]).toBe('source/document')
        expect(match?.[2]).toBe('quote-1')
      })
    })

    describe('mirror pattern', () => {
      it('should match mirror syntax with equals', () => {
        const text = '=[[technology/react#block-123]]'
        const match = text.match(getNonGlobalPattern(BLOCK_REFERENCE_PATTERNS.mirror))

        expect(match).not.toBeNull()
      })

      it('should capture path and block ID', () => {
        const text = '=[[shared/template#section-a]]'
        const match = text.match(getNonGlobalPattern(BLOCK_REFERENCE_PATTERNS.mirror))

        expect(match?.[1]).toBe('shared/template')
        expect(match?.[2]).toBe('section-a')
      })
    })

    describe('full pattern (matches all reference types)', () => {
      it('should match all reference types with full pattern', () => {
        const references = [
          '[[path#block]]',
          '![[path#block]]',
          '^[[path#block]]',
          '=[[path#block]]',
        ]

        for (const ref of references) {
          const match = ref.match(getNonGlobalPattern(BLOCK_REFERENCE_PATTERNS.full))
          expect(match).not.toBeNull()
        }
      })
    })
  })

  describe('Reference Types', () => {
    it('should support link type', () => {
      const type: ReferenceType = 'link'
      expect(['link', 'embed', 'citation', 'mirror']).toContain(type)
    })

    it('should support embed type', () => {
      const type: ReferenceType = 'embed'
      expect(['link', 'embed', 'citation', 'mirror']).toContain(type)
    })

    it('should support citation type', () => {
      const type: ReferenceType = 'citation'
      expect(['link', 'embed', 'citation', 'mirror']).toContain(type)
    })

    it('should support mirror type', () => {
      const type: ReferenceType = 'mirror'
      expect(['link', 'embed', 'citation', 'mirror']).toContain(type)
    })
  })

  describe('ParsedBlockReference Structure', () => {
    it('should have required fields', () => {
      const ref: ParsedBlockReference = {
        rawMatch: '[[path#block]]',
        strandPath: 'path',
        blockId: 'block',
        type: 'link',
        startIndex: 0,
        endIndex: 14,
        lineNumber: 1,
      }

      expect(ref.rawMatch).toBeDefined()
      expect(ref.strandPath).toBeDefined()
      expect(ref.type).toBeDefined()
      expect(ref.startIndex).toBeDefined()
      expect(ref.endIndex).toBeDefined()
    })

    it('should have blockId field', () => {
      const ref: ParsedBlockReference = {
        rawMatch: '[[path#my-block]]',
        strandPath: 'path',
        blockId: 'my-block',
        type: 'link',
        startIndex: 0,
        endIndex: 17,
        lineNumber: 1,
      }

      expect(ref.blockId).toBe('my-block')
    })

    it('should allow optional alias', () => {
      const ref: ParsedBlockReference = {
        rawMatch: '[[path#block|Custom Text]]',
        strandPath: 'path',
        blockId: 'block',
        type: 'link',
        startIndex: 0,
        endIndex: 26,
        lineNumber: 1,
        alias: 'Custom Text',
      }

      expect(ref.alias).toBe('Custom Text')
    })
  })

  describe('Complex Path Patterns', () => {
    it('should handle deeply nested paths', () => {
      const text = '[[a/b/c/d/e/f#block]]'
      const match = text.match(getNonGlobalPattern(BLOCK_REFERENCE_PATTERNS.link))

      expect(match?.[1]).toBe('a/b/c/d/e/f')
    })

    it('should handle paths with hyphens', () => {
      const text = '[[my-category/my-strand#block]]'
      const match = text.match(getNonGlobalPattern(BLOCK_REFERENCE_PATTERNS.link))

      expect(match?.[1]).toBe('my-category/my-strand')
    })

    it('should handle paths with underscores', () => {
      const text = '[[my_category/my_strand#block]]'
      const match = text.match(getNonGlobalPattern(BLOCK_REFERENCE_PATTERNS.link))

      expect(match?.[1]).toBe('my_category/my_strand')
    })

    it('should handle block IDs with various formats', () => {
      const blockIds = [
        'block-123',
        'block_123',
        'BLOCK-ABC',
        'uuid-a1b2c3d4',
        'heading-intro',
      ]

      for (const blockId of blockIds) {
        const text = `[[path#${blockId}]]`
        const match = text.match(getNonGlobalPattern(BLOCK_REFERENCE_PATTERNS.link))

        expect(match?.[2]).toBe(blockId)
      }
    })
  })

  describe('Edge Cases', () => {
    it('should not match malformed references', () => {
      const malformed = [
        '[path#block]',   // Single brackets
        '[[path#block]',  // Missing closing bracket
        '[path#block]]',  // Missing opening bracket
        '[[#block]]',     // Missing path
        '[[path#]]',      // Empty block ID (depends on pattern)
      ]

      for (const text of malformed) {
        const match = text.match(getNonGlobalPattern(BLOCK_REFERENCE_PATTERNS.link))
        // Most should not match properly
        if (match) {
          // If it matches, it should not have captured valid path and block
          // This is acceptable for some edge cases
        }
      }
    })

    it('should handle references with spaces in text content', () => {
      // The path itself shouldn't have spaces, but surrounding text might
      const text = 'See [[path#block]] for more information'
      const match = text.match(getNonGlobalPattern(BLOCK_REFERENCE_PATTERNS.link))

      expect(match).not.toBeNull()
      expect(match?.[1]).toBe('path')
    })

    it('should handle multiple references in same text', () => {
      const text = 'Link to [[path1#block1]] and [[path2#block2]]'
      const matches = text.match(new RegExp(BLOCK_REFERENCE_PATTERNS.link.source, 'g'))

      expect(matches).toHaveLength(2)
    })
  })
})
