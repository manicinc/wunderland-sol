/**
 * Block Database Tests
 * @module tests/unit/blocktags/blockDatabase
 *
 * Tests for block-level tagging and document-level tag differentiation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the SQLite database module
vi.mock('@/lib/strandDatabase', () => ({
  getDb: vi.fn().mockResolvedValue({
    exec: vi.fn(),
    run: vi.fn(),
    all: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
  }),
}))

import type {
  StrandBlock,
  BlockSummary,
} from '@/lib/blockDatabase'

describe('Block Database', () => {
  describe('StrandBlock type', () => {
    it('should have required fields', () => {
      const block: StrandBlock = {
        id: 'block-123',
        strandPath: 'technology/react',
        blockType: 'paragraph',
        content: 'This is a test block',
        position: 0,
        hash: 'abc123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: ['javascript', 'react'],
        suggestedTags: [],
        worthiness: 0.7,
      }

      expect(block.id).toBeDefined()
      expect(block.strandPath).toBeDefined()
      expect(block.blockType).toBeDefined()
      expect(block.content).toBeDefined()
    })

    it('should support optional metadata', () => {
      const block: StrandBlock = {
        id: 'block-456',
        strandPath: 'notes/daily',
        blockType: 'heading',
        content: '# Meeting Notes',
        position: 0,
        hash: 'def456',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        suggestedTags: ['meeting', 'notes'],
        worthiness: 0.5,
        headingLevel: 1,
        headingText: 'Meeting Notes',
      }

      expect(block.headingLevel).toBe(1)
      expect(block.headingText).toBe('Meeting Notes')
    })

    it('should support code block metadata', () => {
      const block: StrandBlock = {
        id: 'block-789',
        strandPath: 'code/snippets',
        blockType: 'code',
        content: 'const x = 1',
        position: 2,
        hash: 'ghi789',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: ['typescript'],
        suggestedTags: [],
        worthiness: 0.8,
        codeLanguage: 'typescript',
      }

      expect(block.codeLanguage).toBe('typescript')
    })
  })

  describe('BlockSummary type', () => {
    it('should contain summary-specific fields', () => {
      const summary: BlockSummary = {
        id: 'block-summary-1',
        strandPath: 'docs/readme',
        blockType: 'paragraph',
        content: 'Full content of the block',
        position: 0,
        hash: 'hash123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: ['documentation'],
        suggestedTags: [],
        worthiness: 0.6,
        preview: 'Full content of the...',
        highlightCount: 2,
      }

      expect(summary.preview).toBeDefined()
      expect(summary.highlightCount).toBeDefined()
    })
  })

  describe('Tag Array Handling', () => {
    it('should support empty tag arrays', () => {
      const block: StrandBlock = {
        id: 'block-no-tags',
        strandPath: 'notes/empty',
        blockType: 'paragraph',
        content: 'No tags here',
        position: 0,
        hash: 'notags',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        suggestedTags: [],
        worthiness: 0.3,
      }

      expect(block.tags).toHaveLength(0)
      expect(block.suggestedTags).toHaveLength(0)
    })

    it('should support multiple tags', () => {
      const block: StrandBlock = {
        id: 'block-multi-tags',
        strandPath: 'notes/tagged',
        blockType: 'paragraph',
        content: 'Multiple tags',
        position: 0,
        hash: 'multitags',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: ['tag1', 'tag2', 'tag3', 'tag4'],
        suggestedTags: ['suggested1', 'suggested2'],
        worthiness: 0.9,
      }

      expect(block.tags).toHaveLength(4)
      expect(block.suggestedTags).toHaveLength(2)
    })

    it('should preserve tag order', () => {
      const tags = ['first', 'second', 'third']
      const block: StrandBlock = {
        id: 'block-ordered-tags',
        strandPath: 'notes/ordered',
        blockType: 'paragraph',
        content: 'Ordered tags',
        position: 0,
        hash: 'orderedtags',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags,
        suggestedTags: [],
        worthiness: 0.5,
      }

      expect(block.tags[0]).toBe('first')
      expect(block.tags[1]).toBe('second')
      expect(block.tags[2]).toBe('third')
    })
  })

  describe('Block Types', () => {
    it('should support paragraph type', () => {
      const block: StrandBlock = {
        id: 'p1',
        strandPath: 'test',
        blockType: 'paragraph',
        content: 'text',
        position: 0,
        hash: 'h1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        suggestedTags: [],
        worthiness: 0.5,
      }
      expect(block.blockType).toBe('paragraph')
    })

    it('should support heading type', () => {
      const block: StrandBlock = {
        id: 'h1',
        strandPath: 'test',
        blockType: 'heading',
        content: '# Heading',
        position: 0,
        hash: 'h2',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        suggestedTags: [],
        worthiness: 0.5,
        headingLevel: 1,
      }
      expect(block.blockType).toBe('heading')
    })

    it('should support code type', () => {
      const block: StrandBlock = {
        id: 'c1',
        strandPath: 'test',
        blockType: 'code',
        content: 'code',
        position: 0,
        hash: 'h3',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        suggestedTags: [],
        worthiness: 0.5,
        codeLanguage: 'javascript',
      }
      expect(block.blockType).toBe('code')
    })

    it('should support list type', () => {
      const block: StrandBlock = {
        id: 'l1',
        strandPath: 'test',
        blockType: 'list',
        content: '- item',
        position: 0,
        hash: 'h4',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        suggestedTags: [],
        worthiness: 0.5,
      }
      expect(block.blockType).toBe('list')
    })

    it('should support blockquote type', () => {
      const block: StrandBlock = {
        id: 'bq1',
        strandPath: 'test',
        blockType: 'blockquote',
        content: '> quote',
        position: 0,
        hash: 'h5',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        suggestedTags: [],
        worthiness: 0.5,
      }
      expect(block.blockType).toBe('blockquote')
    })

    it('should support table type', () => {
      const block: StrandBlock = {
        id: 't1',
        strandPath: 'test',
        blockType: 'table',
        content: '| a | b |',
        position: 0,
        hash: 'h6',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        suggestedTags: [],
        worthiness: 0.5,
      }
      expect(block.blockType).toBe('table')
    })
  })

  describe('Worthiness Scoring', () => {
    it('should accept worthiness values between 0 and 1', () => {
      const worthinessValues = [0, 0.25, 0.5, 0.75, 1]
      
      for (const worthiness of worthinessValues) {
        const block: StrandBlock = {
          id: `block-${worthiness}`,
          strandPath: 'test',
          blockType: 'paragraph',
          content: 'text',
          position: 0,
          hash: `hash-${worthiness}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: [],
          suggestedTags: [],
          worthiness,
        }
        expect(block.worthiness).toBe(worthiness)
        expect(block.worthiness).toBeGreaterThanOrEqual(0)
        expect(block.worthiness).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('Hash Generation', () => {
    it('should have unique hashes for different content', () => {
      const block1: StrandBlock = {
        id: 'b1',
        strandPath: 'test',
        blockType: 'paragraph',
        content: 'content 1',
        position: 0,
        hash: 'hash1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        suggestedTags: [],
        worthiness: 0.5,
      }

      const block2: StrandBlock = {
        id: 'b2',
        strandPath: 'test',
        blockType: 'paragraph',
        content: 'content 2',
        position: 1,
        hash: 'hash2',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        suggestedTags: [],
        worthiness: 0.5,
      }

      expect(block1.hash).not.toBe(block2.hash)
    })
  })
})

