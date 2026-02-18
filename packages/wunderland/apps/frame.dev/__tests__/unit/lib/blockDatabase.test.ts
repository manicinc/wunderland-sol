/**
 * Block Database Tests
 * @module __tests__/unit/lib/blockDatabase.test
 *
 * Tests for block database types and helper functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  blockSummaryToStrandBlock,
  type MarkdownBlockType,
  type SuggestedTag,
  type StrandBlock,
  type BlockSearchResult,
  type BlockQueryOptions,
  type TagLevelInfo,
} from '@/lib/blockDatabase'

// Mock codexDatabase
vi.mock('@/lib/codexDatabase', () => ({
  getDatabase: vi.fn(() => null),
}))

describe('Block Database', () => {
  // ============================================================================
  // Type Validation
  // ============================================================================

  describe('MarkdownBlockType type', () => {
    it('includes all expected block types', () => {
      const types: MarkdownBlockType[] = [
        'heading',
        'paragraph',
        'code',
        'list',
        'blockquote',
        'table',
        'html',
      ]
      expect(types).toHaveLength(7)
    })
  })

  describe('SuggestedTag type', () => {
    it('can create valid suggested tag', () => {
      const tag: SuggestedTag = {
        tag: 'javascript',
        confidence: 0.85,
        source: 'llm',
        reasoning: 'Code contains JavaScript syntax',
      }
      expect(tag.tag).toBe('javascript')
      expect(tag.confidence).toBe(0.85)
      expect(tag.source).toBe('llm')
    })

    it('can create tag without reasoning', () => {
      const tag: SuggestedTag = {
        tag: 'react',
        confidence: 0.7,
        source: 'nlp',
      }
      expect(tag.reasoning).toBeUndefined()
    })

    it('supports all source types', () => {
      const sources: SuggestedTag['source'][] = ['inline', 'llm', 'nlp', 'existing']
      sources.forEach((source) => {
        const tag: SuggestedTag = { tag: 'test', confidence: 0.5, source }
        expect(tag.source).toBe(source)
      })
    })
  })

  describe('StrandBlock type', () => {
    it('can create minimal block', () => {
      const block: StrandBlock = {
        id: 'block-123',
        strandId: 'strand-456',
        strandPath: 'weaves/wiki/strands/test.md',
        blockId: 'heading-intro',
        blockType: 'heading',
        startLine: 1,
        endLine: 5,
        tags: [],
        suggestedTags: [],
        worthinessScore: 0,
        worthinessSignals: {
          topicShift: 0,
          entityDensity: 0,
          semanticNovelty: 0,
        },
        warrantsIllustration: false,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      }
      expect(block.id).toBe('block-123')
      expect(block.blockType).toBe('heading')
    })

    it('can include all optional fields', () => {
      const block: StrandBlock = {
        id: 'block-123',
        strandId: 'strand-456',
        strandPath: 'weaves/wiki/strands/test.md',
        blockId: 'heading-intro',
        blockType: 'heading',
        headingLevel: 2,
        headingSlug: 'introduction',
        startLine: 1,
        endLine: 5,
        rawContent: '## Introduction',
        extractiveSummary: 'Introduction section',
        tags: ['overview', 'getting-started'],
        suggestedTags: [{ tag: 'tutorial', confidence: 0.8, source: 'nlp' }],
        worthinessScore: 0.75,
        worthinessSignals: {
          topicShift: 0.5,
          entityDensity: 0.3,
          semanticNovelty: 0.7,
        },
        warrantsIllustration: true,
        sourceFile: '/docs/intro.md',
        sourceUrl: 'https://example.com/intro',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      }
      expect(block.headingLevel).toBe(2)
      expect(block.headingSlug).toBe('introduction')
      expect(block.tags).toContain('overview')
    })
  })

  describe('BlockSearchResult type', () => {
    it('can create search result', () => {
      const result: BlockSearchResult = {
        block: {
          id: 'block-123',
          strandId: 'strand-456',
          strandPath: 'weaves/wiki/strands/test.md',
          blockId: 'heading-intro',
          blockType: 'heading',
          startLine: 1,
          endLine: 5,
          tags: ['javascript'],
          suggestedTags: [],
          worthinessScore: 0.5,
          worthinessSignals: {
            topicShift: 0,
            entityDensity: 0,
            semanticNovelty: 0,
          },
          warrantsIllustration: false,
          createdAt: '',
          updatedAt: '',
        },
        strandTitle: 'Test Document',
        strandPath: 'weaves/wiki/strands/test.md',
        matchedTag: 'javascript',
        snippet: 'This is a JavaScript tutorial...',
      }
      expect(result.strandTitle).toBe('Test Document')
      expect(result.matchedTag).toBe('javascript')
    })
  })

  describe('BlockQueryOptions type', () => {
    it('can create minimal options', () => {
      const options: BlockQueryOptions = {}
      expect(options.limit).toBeUndefined()
    })

    it('can include all options', () => {
      const options: BlockQueryOptions = {
        limit: 50,
        offset: 10,
        weave: 'wiki',
        loom: 'intro',
        blockTypes: ['heading', 'paragraph'],
        minWorthiness: 0.5,
        hasSuggestedTags: true,
      }
      expect(options.limit).toBe(50)
      expect(options.blockTypes).toContain('heading')
    })
  })

  describe('TagLevelInfo type', () => {
    it('can represent doc-level tag', () => {
      const info: TagLevelInfo = {
        tag: 'javascript',
        docCount: 5,
        blockCount: 0,
        level: 'doc',
      }
      expect(info.level).toBe('doc')
    })

    it('can represent block-level tag', () => {
      const info: TagLevelInfo = {
        tag: 'function',
        docCount: 0,
        blockCount: 15,
        level: 'block',
      }
      expect(info.level).toBe('block')
    })

    it('can represent tag at both levels', () => {
      const info: TagLevelInfo = {
        tag: 'react',
        docCount: 3,
        blockCount: 12,
        level: 'both',
      }
      expect(info.level).toBe('both')
    })
  })

  // ============================================================================
  // blockSummaryToStrandBlock helper
  // ============================================================================

  describe('blockSummaryToStrandBlock', () => {
    it('converts minimal BlockSummary to StrandBlock', () => {
      const summary = {
        blockId: 'para-1',
        blockType: 'paragraph',
        startLine: 10,
        endLine: 15,
      }

      const result = blockSummaryToStrandBlock(
        summary as any,
        'strand-123',
        'weaves/wiki/strands/test.md'
      )

      expect(result.strandId).toBe('strand-123')
      expect(result.strandPath).toBe('weaves/wiki/strands/test.md')
      expect(result.blockId).toBe('para-1')
      expect(result.blockType).toBe('paragraph')
      expect(result.startLine).toBe(10)
      expect(result.endLine).toBe(15)
      expect(result.tags).toEqual([])
      expect(result.suggestedTags).toEqual([])
      expect(result.worthinessScore).toBe(0)
    })

    it('converts BlockSummary with all fields', () => {
      const summary = {
        blockId: 'heading-intro',
        blockType: 'heading',
        headingLevel: 2,
        headingSlug: 'introduction',
        startLine: 1,
        endLine: 3,
        rawContent: '## Introduction',
        extractive: 'Intro section',
        tags: ['overview'],
        suggestedTags: [
          { tag: 'tutorial', confidence: 0.9, source: 'llm', reasoning: 'Looks like tutorial' },
        ],
        worthinessScore: 0.8,
        worthinessSignals: {
          topicShift: 0.6,
          entityDensity: 0.4,
          semanticNovelty: 0.7,
        },
        warrantsNewIllustration: true,
      }

      const result = blockSummaryToStrandBlock(
        summary as any,
        'strand-123',
        'weaves/wiki/strands/test.md',
        '/source/file.md',
        'https://example.com/source'
      )

      expect(result.headingLevel).toBe(2)
      expect(result.headingSlug).toBe('introduction')
      expect(result.rawContent).toBe('## Introduction')
      expect(result.extractiveSummary).toBe('Intro section')
      expect(result.tags).toEqual(['overview'])
      expect(result.suggestedTags[0].tag).toBe('tutorial')
      expect(result.suggestedTags[0].confidence).toBe(0.9)
      expect(result.worthinessScore).toBe(0.8)
      expect(result.warrantsIllustration).toBe(true)
      expect(result.sourceFile).toBe('/source/file.md')
      expect(result.sourceUrl).toBe('https://example.com/source')
    })

    it('handles missing optional fields with defaults', () => {
      const summary = {
        blockId: 'code-1',
        blockType: 'code',
        startLine: 5,
        endLine: 10,
      }

      const result = blockSummaryToStrandBlock(
        summary as any,
        'strand-123',
        'weaves/wiki/strands/test.md'
      )

      expect(result.headingLevel).toBeUndefined()
      expect(result.headingSlug).toBeUndefined()
      expect(result.rawContent).toBeUndefined()
      expect(result.extractiveSummary).toBeUndefined()
      expect(result.tags).toEqual([])
      expect(result.suggestedTags).toEqual([])
      expect(result.worthinessScore).toBe(0)
      expect(result.worthinessSignals).toEqual({
        topicShift: 0,
        entityDensity: 0,
        semanticNovelty: 0,
      })
      expect(result.warrantsIllustration).toBe(false)
      expect(result.sourceFile).toBeUndefined()
      expect(result.sourceUrl).toBeUndefined()
    })

    it('maps extractive property to extractiveSummary', () => {
      const summary = {
        blockId: 'para-1',
        blockType: 'paragraph',
        startLine: 1,
        endLine: 5,
        extractive: 'This is the extractive summary',
      }

      const result = blockSummaryToStrandBlock(
        summary as any,
        'strand-123',
        'path'
      )

      expect(result.extractiveSummary).toBe('This is the extractive summary')
    })

    it('maps warrantsNewIllustration to warrantsIllustration', () => {
      const summary = {
        blockId: 'para-1',
        blockType: 'paragraph',
        startLine: 1,
        endLine: 5,
        warrantsNewIllustration: true,
      }

      const result = blockSummaryToStrandBlock(
        summary as any,
        'strand-123',
        'path'
      )

      expect(result.warrantsIllustration).toBe(true)
    })

    it('preserves suggested tag structure', () => {
      const summary = {
        blockId: 'para-1',
        blockType: 'paragraph',
        startLine: 1,
        endLine: 5,
        suggestedTags: [
          { tag: 'api', confidence: 0.9, source: 'llm', reasoning: 'API documentation' },
          { tag: 'rest', confidence: 0.7, source: 'nlp' },
        ],
      }

      const result = blockSummaryToStrandBlock(
        summary as any,
        'strand-123',
        'path'
      )

      expect(result.suggestedTags).toHaveLength(2)
      expect(result.suggestedTags[0]).toEqual({
        tag: 'api',
        confidence: 0.9,
        source: 'llm',
        reasoning: 'API documentation',
      })
      expect(result.suggestedTags[1]).toEqual({
        tag: 'rest',
        confidence: 0.7,
        source: 'nlp',
        reasoning: undefined,
      })
    })
  })

  // ============================================================================
  // SSR Safety - Database operations return empty when no DB
  // ============================================================================

  describe('SSR safety (no database)', () => {
    let originalWindow: typeof globalThis.window

    beforeEach(() => {
      originalWindow = globalThis.window
      // @ts-ignore - SSR mode
      globalThis.window = undefined
    })

    afterEach(() => {
      globalThis.window = originalWindow
    })

    it('getStrandBlocks returns empty array when no database', async () => {
      const { getStrandBlocks } = await import('@/lib/blockDatabase')
      const result = await getStrandBlocks('weaves/test.md')
      expect(result).toEqual([])
    })

    it('getBlockById returns null when no database', async () => {
      const { getBlockById } = await import('@/lib/blockDatabase')
      const result = await getBlockById('weaves/test.md', 'block-1')
      expect(result).toBeNull()
    })

    it('searchBlocksByTag returns empty array when no database', async () => {
      const { searchBlocksByTag } = await import('@/lib/blockDatabase')
      const result = await searchBlocksByTag('javascript')
      expect(result).toEqual([])
    })

    it('searchBlocksFullText returns empty array when no database', async () => {
      const { searchBlocksFullText } = await import('@/lib/blockDatabase')
      const result = await searchBlocksFullText('search query')
      expect(result).toEqual([])
    })

    it('getAllBlockTags returns empty array when no database', async () => {
      const { getAllBlockTags } = await import('@/lib/blockDatabase')
      const result = await getAllBlockTags()
      expect(result).toEqual([])
    })

    it('getBlockTagCounts returns empty map when no database', async () => {
      const { getBlockTagCounts } = await import('@/lib/blockDatabase')
      const result = await getBlockTagCounts()
      expect(result.size).toBe(0)
    })

    it('getBlocksWithSuggestedTags returns empty array when no database', async () => {
      const { getBlocksWithSuggestedTags } = await import('@/lib/blockDatabase')
      const result = await getBlocksWithSuggestedTags()
      expect(result).toEqual([])
    })

    it('getWorthyBlocks returns empty array when no database', async () => {
      const { getWorthyBlocks } = await import('@/lib/blockDatabase')
      const result = await getWorthyBlocks(0.5)
      expect(result).toEqual([])
    })

    it('getBlockStatistics returns zeros when no database', async () => {
      const { getBlockStatistics } = await import('@/lib/blockDatabase')
      const result = await getBlockStatistics()
      expect(result.totalBlocks).toBe(0)
      expect(result.taggedBlocks).toBe(0)
      expect(result.worthyBlocks).toBe(0)
      expect(result.blocksWithSuggestions).toBe(0)
      expect(result.averageWorthiness).toBe(0)
    })
  })
})
