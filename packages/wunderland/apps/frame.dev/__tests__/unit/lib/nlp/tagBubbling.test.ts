/**
 * Tag Bubbling Tests
 * @module __tests__/unit/lib/nlp/tagBubbling.test
 *
 * Tests for tag bubbling from block level to document level.
 */

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_BUBBLING_CONFIG,
  aggregateBlockTags,
  applyBubbledTags,
  shouldTagBubble,
  getBubblingStats,
  processTagBubbling,
  formatBubblingResults,
  type BubbledTag,
  type TagBubblingConfig,
} from '@/lib/nlp/tagBubbling'
import type { BlockSummary } from '@/components/quarry/types'

// ============================================================================
// DEFAULT_BUBBLING_CONFIG
// ============================================================================

describe('DEFAULT_BUBBLING_CONFIG', () => {
  it('is defined', () => {
    expect(DEFAULT_BUBBLING_CONFIG).toBeDefined()
  })

  it('has threshold of 3', () => {
    expect(DEFAULT_BUBBLING_CONFIG.threshold).toBe(3)
  })

  it('has empty excludeDocumentTags', () => {
    expect(DEFAULT_BUBBLING_CONFIG.excludeDocumentTags).toEqual([])
  })

  it('has maxBubbledTags of 5', () => {
    expect(DEFAULT_BUBBLING_CONFIG.maxBubbledTags).toBe(5)
  })

  it('has minConfidence of 0.5', () => {
    expect(DEFAULT_BUBBLING_CONFIG.minConfidence).toBe(0.5)
  })

  it('has all required properties', () => {
    expect(DEFAULT_BUBBLING_CONFIG).toHaveProperty('threshold')
    expect(DEFAULT_BUBBLING_CONFIG).toHaveProperty('excludeDocumentTags')
    expect(DEFAULT_BUBBLING_CONFIG).toHaveProperty('maxBubbledTags')
    expect(DEFAULT_BUBBLING_CONFIG).toHaveProperty('minConfidence')
  })
})

// ============================================================================
// aggregateBlockTags
// ============================================================================

describe('aggregateBlockTags', () => {
  const createBlockSummary = (
    blockId: string,
    tags: string[] = [],
    suggestedTags: Array<{ tag: string; confidence: number }> = []
  ): BlockSummary => ({
    blockId,
    tags,
    suggestedTags,
    keywords: [],
    entities: {},
    worthiness: { score: 0.5, worthy: true, signals: { topicShift: 0, entityDensity: 0, semanticNovelty: 0 }, reasoning: '' },
  })

  it('returns empty array for empty input', () => {
    const result = aggregateBlockTags([])
    expect(result).toEqual([])
  })

  it('returns empty array when no tag meets threshold', () => {
    const blocks = [
      createBlockSummary('b1', ['typescript']),
      createBlockSummary('b2', ['react']),
    ]
    const result = aggregateBlockTags(blocks)
    expect(result).toEqual([])
  })

  it('bubbles tag that meets default threshold of 3', () => {
    const blocks = [
      createBlockSummary('b1', ['typescript']),
      createBlockSummary('b2', ['typescript']),
      createBlockSummary('b3', ['typescript']),
    ]
    const result = aggregateBlockTags(blocks)
    expect(result).toHaveLength(1)
    expect(result[0].tag).toBe('typescript')
    expect(result[0].blockCount).toBe(3)
  })

  it('respects custom threshold', () => {
    const blocks = [
      createBlockSummary('b1', ['react']),
      createBlockSummary('b2', ['react']),
    ]
    const result = aggregateBlockTags(blocks, { threshold: 2 })
    expect(result).toHaveLength(1)
    expect(result[0].tag).toBe('react')
    expect(result[0].blockCount).toBe(2)
  })

  it('excludes document-level tags', () => {
    const blocks = [
      createBlockSummary('b1', ['typescript', 'react']),
      createBlockSummary('b2', ['typescript', 'react']),
      createBlockSummary('b3', ['typescript', 'react']),
    ]
    const result = aggregateBlockTags(blocks, { excludeDocumentTags: ['TypeScript'] })
    expect(result).toHaveLength(1)
    expect(result[0].tag).toBe('react')
  })

  it('normalizes tag comparison (case-insensitive)', () => {
    const blocks = [
      createBlockSummary('b1', ['TypeScript']),
      createBlockSummary('b2', ['typescript']),
      createBlockSummary('b3', ['TYPESCRIPT']),
    ]
    const result = aggregateBlockTags(blocks)
    expect(result).toHaveLength(1)
    expect(result[0].blockCount).toBe(3)
  })

  it('sorts by block count then confidence', () => {
    const blocks = [
      createBlockSummary('b1', ['react', 'vue']),
      createBlockSummary('b2', ['react', 'vue']),
      createBlockSummary('b3', ['react', 'vue']),
      createBlockSummary('b4', ['react']),
    ]
    const result = aggregateBlockTags(blocks)
    expect(result[0].tag).toBe('react')
    expect(result[0].blockCount).toBe(4)
    expect(result[1].tag).toBe('vue')
    expect(result[1].blockCount).toBe(3)
  })

  it('limits to maxBubbledTags', () => {
    const blocks = [
      createBlockSummary('b1', ['a', 'b', 'c', 'd', 'e', 'f', 'g']),
      createBlockSummary('b2', ['a', 'b', 'c', 'd', 'e', 'f', 'g']),
      createBlockSummary('b3', ['a', 'b', 'c', 'd', 'e', 'f', 'g']),
    ]
    const result = aggregateBlockTags(blocks, { maxBubbledTags: 3 })
    expect(result).toHaveLength(3)
  })

  it('includes high-confidence suggested tags', () => {
    const blocks = [
      createBlockSummary('b1', [], [{ tag: 'machine-learning', confidence: 0.8 }]),
      createBlockSummary('b2', [], [{ tag: 'machine-learning', confidence: 0.7 }]),
      createBlockSummary('b3', [], [{ tag: 'machine-learning', confidence: 0.9 }]),
    ]
    const result = aggregateBlockTags(blocks)
    expect(result).toHaveLength(1)
    expect(result[0].tag).toBe('machine-learning')
  })

  it('ignores low-confidence suggested tags', () => {
    const blocks = [
      createBlockSummary('b1', [], [{ tag: 'maybe-tag', confidence: 0.3 }]),
      createBlockSummary('b2', [], [{ tag: 'maybe-tag', confidence: 0.2 }]),
      createBlockSummary('b3', [], [{ tag: 'maybe-tag', confidence: 0.4 }]),
    ]
    const result = aggregateBlockTags(blocks)
    expect(result).toEqual([])
  })

  it('includes reasoning in bubbled tags', () => {
    const blocks = [
      createBlockSummary('b1', ['api']),
      createBlockSummary('b2', ['api']),
      createBlockSummary('b3', ['api']),
    ]
    const result = aggregateBlockTags(blocks)
    expect(result[0].reasoning).toContain('3 blocks')
  })

  it('tracks source blocks', () => {
    const blocks = [
      createBlockSummary('block-1', ['testing']),
      createBlockSummary('block-2', ['testing']),
      createBlockSummary('block-3', ['testing']),
    ]
    const result = aggregateBlockTags(blocks)
    expect(result[0].sourceBlocks).toEqual(['block-1', 'block-2', 'block-3'])
  })
})

// ============================================================================
// applyBubbledTags
// ============================================================================

describe('applyBubbledTags', () => {
  const createBubbledTag = (tag: string): BubbledTag => ({
    tag,
    blockCount: 3,
    confidence: 1.0,
    sourceBlocks: [],
    reasoning: 'test',
  })

  it('returns original tags when no bubbled tags', () => {
    const documentTags = ['react', 'typescript']
    const result = applyBubbledTags(documentTags, [])
    expect(result).toEqual(['react', 'typescript'])
  })

  it('adds bubbled tags to document tags', () => {
    const documentTags = ['react']
    const bubbledTags = [createBubbledTag('testing'), createBubbledTag('api')]
    const result = applyBubbledTags(documentTags, bubbledTags)
    expect(result).toEqual(['react', 'testing', 'api'])
  })

  it('avoids duplicates (case-insensitive)', () => {
    const documentTags = ['React', 'TypeScript']
    const bubbledTags = [createBubbledTag('react'), createBubbledTag('typescript')]
    const result = applyBubbledTags(documentTags, bubbledTags)
    expect(result).toEqual(['React', 'TypeScript'])
  })

  it('preserves original tag casing', () => {
    const documentTags = ['React']
    const bubbledTags = [createBubbledTag('Testing')]
    const result = applyBubbledTags(documentTags, bubbledTags)
    expect(result).toContain('React')
    expect(result).toContain('Testing')
  })

  it('does not mutate original array', () => {
    const documentTags = ['original']
    const bubbledTags = [createBubbledTag('new-tag')]
    const result = applyBubbledTags(documentTags, bubbledTags)
    expect(documentTags).toEqual(['original'])
    expect(result).toEqual(['original', 'new-tag'])
  })
})

// ============================================================================
// shouldTagBubble
// ============================================================================

describe('shouldTagBubble', () => {
  const createBlockSummary = (blockId: string, tags: string[]): BlockSummary => ({
    blockId,
    tags,
    suggestedTags: [],
    keywords: [],
    entities: {},
    worthiness: { score: 0.5, worthy: true, signals: { topicShift: 0, entityDensity: 0, semanticNovelty: 0 }, reasoning: '' },
  })

  it('returns false for empty blocks', () => {
    expect(shouldTagBubble('react', [])).toBe(false)
  })

  it('returns false when below threshold', () => {
    const blocks = [
      createBlockSummary('b1', ['react']),
      createBlockSummary('b2', ['react']),
    ]
    expect(shouldTagBubble('react', blocks)).toBe(false)
  })

  it('returns true when meets default threshold of 3', () => {
    const blocks = [
      createBlockSummary('b1', ['react']),
      createBlockSummary('b2', ['react']),
      createBlockSummary('b3', ['react']),
    ]
    expect(shouldTagBubble('react', blocks)).toBe(true)
  })

  it('respects custom threshold', () => {
    const blocks = [
      createBlockSummary('b1', ['vue']),
      createBlockSummary('b2', ['vue']),
    ]
    expect(shouldTagBubble('vue', blocks, 2)).toBe(true)
    expect(shouldTagBubble('vue', blocks, 3)).toBe(false)
  })

  it('compares case-insensitively', () => {
    const blocks = [
      createBlockSummary('b1', ['TypeScript']),
      createBlockSummary('b2', ['typescript']),
      createBlockSummary('b3', ['TYPESCRIPT']),
    ]
    expect(shouldTagBubble('typescript', blocks)).toBe(true)
    expect(shouldTagBubble('TypeScript', blocks)).toBe(true)
  })

  it('returns false for non-existent tag', () => {
    const blocks = [
      createBlockSummary('b1', ['react']),
      createBlockSummary('b2', ['vue']),
      createBlockSummary('b3', ['angular']),
    ]
    expect(shouldTagBubble('svelte', blocks)).toBe(false)
  })
})

// ============================================================================
// getBubblingStats
// ============================================================================

describe('getBubblingStats', () => {
  const createBlockSummary = (blockId: string, tags: string[]): BlockSummary => ({
    blockId,
    tags,
    suggestedTags: [],
    keywords: [],
    entities: {},
    worthiness: { score: 0.5, worthy: true, signals: { topicShift: 0, entityDensity: 0, semanticNovelty: 0 }, reasoning: '' },
  })

  it('returns zeros for empty input', () => {
    const stats = getBubblingStats([], [])
    expect(stats).toEqual({
      totalBlockTags: 0,
      uniqueBlockTags: 0,
      candidatesForBubbling: 0,
      alreadyAtDocLevel: 0,
    })
  })

  it('counts total block tags', () => {
    const blocks = [
      createBlockSummary('b1', ['a', 'b']),
      createBlockSummary('b2', ['a', 'c']),
    ]
    const stats = getBubblingStats(blocks, [])
    expect(stats.totalBlockTags).toBe(4)
  })

  it('counts unique block tags', () => {
    const blocks = [
      createBlockSummary('b1', ['a', 'b']),
      createBlockSummary('b2', ['a', 'c']),
    ]
    const stats = getBubblingStats(blocks, [])
    expect(stats.uniqueBlockTags).toBe(3)
  })

  it('counts candidates for bubbling (3+ occurrences)', () => {
    const blocks = [
      createBlockSummary('b1', ['react']),
      createBlockSummary('b2', ['react']),
      createBlockSummary('b3', ['react']),
      createBlockSummary('b4', ['vue']),
    ]
    const stats = getBubblingStats(blocks, [])
    expect(stats.candidatesForBubbling).toBe(1)
  })

  it('counts tags already at document level', () => {
    const blocks = [
      createBlockSummary('b1', ['typescript']),
      createBlockSummary('b2', ['typescript']),
      createBlockSummary('b3', ['typescript']),
    ]
    const stats = getBubblingStats(blocks, ['typescript'])
    expect(stats.alreadyAtDocLevel).toBe(1)
    expect(stats.candidatesForBubbling).toBe(0)
  })

  it('handles case-insensitive comparison for doc tags', () => {
    const blocks = [
      createBlockSummary('b1', ['React']),
      createBlockSummary('b2', ['react']),
      createBlockSummary('b3', ['REACT']),
    ]
    const stats = getBubblingStats(blocks, ['react'])
    expect(stats.alreadyAtDocLevel).toBe(1)
    expect(stats.candidatesForBubbling).toBe(0)
  })
})

// ============================================================================
// processTagBubbling
// ============================================================================

describe('processTagBubbling', () => {
  const createBlockSummary = (blockId: string, tags: string[]): BlockSummary => ({
    blockId,
    tags,
    suggestedTags: [],
    keywords: [],
    entities: {},
    worthiness: { score: 0.5, worthy: true, signals: { topicShift: 0, entityDensity: 0, semanticNovelty: 0 }, reasoning: '' },
  })

  it('returns not applied when disabled in config', () => {
    const blocks = [
      createBlockSummary('b1', ['react']),
      createBlockSummary('b2', ['react']),
      createBlockSummary('b3', ['react']),
    ]
    const result = processTagBubbling(blocks, [], { enableTagBubbling: false } as any)
    expect(result.applied).toBe(false)
    expect(result.bubbledTags).toEqual([])
    expect(result.updatedDocumentTags).toEqual([])
  })

  it('returns not applied when no tags meet threshold', () => {
    const blocks = [
      createBlockSummary('b1', ['a']),
      createBlockSummary('b2', ['b']),
    ]
    const result = processTagBubbling(blocks, [])
    expect(result.applied).toBe(false)
  })

  it('bubbles tags that meet threshold', () => {
    const blocks = [
      createBlockSummary('b1', ['api', 'testing']),
      createBlockSummary('b2', ['api', 'testing']),
      createBlockSummary('b3', ['api', 'testing']),
    ]
    const result = processTagBubbling(blocks, [])
    expect(result.applied).toBe(true)
    expect(result.bubbledTags).toHaveLength(2)
    expect(result.updatedDocumentTags).toContain('api')
    expect(result.updatedDocumentTags).toContain('testing')
  })

  it('respects custom threshold from config', () => {
    const blocks = [
      createBlockSummary('b1', ['graphql']),
      createBlockSummary('b2', ['graphql']),
    ]
    const result = processTagBubbling(blocks, [], { tagBubblingThreshold: 2 } as any)
    expect(result.applied).toBe(true)
    expect(result.bubbledTags[0].tag).toBe('graphql')
  })

  it('excludes existing document tags', () => {
    const blocks = [
      createBlockSummary('b1', ['existing', 'new-tag']),
      createBlockSummary('b2', ['existing', 'new-tag']),
      createBlockSummary('b3', ['existing', 'new-tag']),
    ]
    const result = processTagBubbling(blocks, ['existing'])
    expect(result.updatedDocumentTags).toContain('existing')
    expect(result.updatedDocumentTags).toContain('new-tag')
    expect(result.bubbledTags).toHaveLength(1)
    expect(result.bubbledTags[0].tag).toBe('new-tag')
  })
})

// ============================================================================
// formatBubblingResults
// ============================================================================

describe('formatBubblingResults', () => {
  const createBubbledTag = (
    tag: string,
    blockCount: number,
    confidence: number
  ): BubbledTag => ({
    tag,
    blockCount,
    confidence,
    sourceBlocks: [],
    reasoning: 'test',
  })

  it('returns message when no tags bubbled', () => {
    const result = formatBubblingResults([])
    expect(result).toBe('No tags bubbled up to document level.')
  })

  it('formats single bubbled tag', () => {
    const bubbledTags = [createBubbledTag('typescript', 4, 0.95)]
    const result = formatBubblingResults(bubbledTags)
    expect(result).toContain('Bubbled 1 tag(s)')
    expect(result).toContain('typescript')
    expect(result).toContain('4 blocks')
    expect(result).toContain('95% confidence')
  })

  it('formats multiple bubbled tags', () => {
    const bubbledTags = [
      createBubbledTag('react', 5, 1.0),
      createBubbledTag('hooks', 3, 0.8),
    ]
    const result = formatBubblingResults(bubbledTags)
    expect(result).toContain('Bubbled 2 tag(s)')
    expect(result).toContain('react')
    expect(result).toContain('hooks')
  })

  it('formats confidence as percentage', () => {
    const bubbledTags = [createBubbledTag('api', 3, 0.756)]
    const result = formatBubblingResults(bubbledTags)
    expect(result).toContain('76% confidence')
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('tag bubbling integration', () => {
  const createBlockSummary = (
    blockId: string,
    tags: string[],
    suggestedTags: Array<{ tag: string; confidence: number }> = []
  ): BlockSummary => ({
    blockId,
    tags,
    suggestedTags,
    keywords: [],
    entities: {},
    worthiness: { score: 0.5, worthy: true, signals: { topicShift: 0, entityDensity: 0, semanticNovelty: 0 }, reasoning: '' },
  })

  it('full workflow: aggregate, apply, format', () => {
    const blocks = [
      createBlockSummary('b1', ['react', 'hooks', 'state']),
      createBlockSummary('b2', ['react', 'hooks', 'effects']),
      createBlockSummary('b3', ['react', 'hooks', 'context']),
      createBlockSummary('b4', ['react', 'router']),
    ]
    const documentTags = ['javascript', 'frontend']

    // Step 1: Aggregate
    const bubbledTags = aggregateBlockTags(blocks, {
      excludeDocumentTags: documentTags,
    })
    expect(bubbledTags.length).toBeGreaterThan(0)
    expect(bubbledTags[0].tag).toBe('react')
    expect(bubbledTags[1].tag).toBe('hooks')

    // Step 2: Apply
    const updatedTags = applyBubbledTags(documentTags, bubbledTags)
    expect(updatedTags).toContain('javascript')
    expect(updatedTags).toContain('frontend')
    expect(updatedTags).toContain('react')
    expect(updatedTags).toContain('hooks')

    // Step 3: Format
    const summary = formatBubblingResults(bubbledTags)
    expect(summary).toContain('Bubbled')
    expect(summary).toContain('react')
  })

  it('processTagBubbling handles real-world scenario', () => {
    const blocks = [
      createBlockSummary('intro', ['overview']),
      createBlockSummary('setup', ['installation', 'npm']),
      createBlockSummary('api-1', ['api', 'rest', 'endpoints']),
      createBlockSummary('api-2', ['api', 'rest', 'authentication']),
      createBlockSummary('api-3', ['api', 'rest', 'pagination']),
      createBlockSummary('testing', ['testing', 'jest']),
    ]

    const result = processTagBubbling(blocks, ['documentation'])

    expect(result.applied).toBe(true)
    expect(result.bubbledTags.some(t => t.tag === 'api')).toBe(true)
    expect(result.bubbledTags.some(t => t.tag === 'rest')).toBe(true)
    expect(result.updatedDocumentTags).toContain('documentation')
    expect(result.updatedDocumentTags).toContain('api')
  })

  it('handles blocks with no tags', () => {
    const blocks = [
      createBlockSummary('b1', []),
      createBlockSummary('b2', []),
      createBlockSummary('b3', ['single-tag']),
    ]

    const result = processTagBubbling(blocks, [])
    expect(result.applied).toBe(false)
    expect(result.bubbledTags).toEqual([])
  })
})
