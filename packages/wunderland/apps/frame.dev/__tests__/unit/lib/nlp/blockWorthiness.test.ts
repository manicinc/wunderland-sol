/**
 * Block Worthiness Tests
 * @module __tests__/unit/lib/nlp/blockWorthiness.test
 *
 * Tests for block worthiness calculation for tagging decisions.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  DEFAULT_WORTHINESS_WEIGHTS,
  DEFAULT_WORTHINESS_THRESHOLD,
  calculateTopicShift,
  calculateEntityDensity,
  calculateSemanticNovelty,
  calculateBlockWorthiness,
  calculateAllBlockWorthiness,
  filterWorthyBlocks,
} from '@/lib/nlp/blockWorthiness'
import type { ParsedBlock } from '@/lib/nlp'
import type { WorthinessResult } from '@/components/quarry/types'

// ============================================================================
// DEFAULT_WORTHINESS_WEIGHTS
// ============================================================================

describe('DEFAULT_WORTHINESS_WEIGHTS', () => {
  it('is defined', () => {
    expect(DEFAULT_WORTHINESS_WEIGHTS).toBeDefined()
  })

  it('has topicShift weight of 0.4', () => {
    expect(DEFAULT_WORTHINESS_WEIGHTS.topicShift).toBe(0.4)
  })

  it('has entityDensity weight of 0.3', () => {
    expect(DEFAULT_WORTHINESS_WEIGHTS.entityDensity).toBe(0.3)
  })

  it('has semanticNovelty weight of 0.3', () => {
    expect(DEFAULT_WORTHINESS_WEIGHTS.semanticNovelty).toBe(0.3)
  })

  it('weights sum to 1.0', () => {
    const sum =
      DEFAULT_WORTHINESS_WEIGHTS.topicShift +
      DEFAULT_WORTHINESS_WEIGHTS.entityDensity +
      DEFAULT_WORTHINESS_WEIGHTS.semanticNovelty
    expect(sum).toBe(1.0)
  })
})

// ============================================================================
// DEFAULT_WORTHINESS_THRESHOLD
// ============================================================================

describe('DEFAULT_WORTHINESS_THRESHOLD', () => {
  it('is defined', () => {
    expect(DEFAULT_WORTHINESS_THRESHOLD).toBeDefined()
  })

  it('is 0.5', () => {
    expect(DEFAULT_WORTHINESS_THRESHOLD).toBe(0.5)
  })

  it('is between 0 and 1', () => {
    expect(DEFAULT_WORTHINESS_THRESHOLD).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_WORTHINESS_THRESHOLD).toBeLessThanOrEqual(1)
  })
})

// ============================================================================
// calculateTopicShift
// ============================================================================

describe('calculateTopicShift', () => {
  it('returns 0 for empty content', () => {
    expect(calculateTopicShift('', [], '')).toBe(0)
    expect(calculateTopicShift('   ', [], '')).toBe(0)
  })

  it('returns 0 for very short content', () => {
    expect(calculateTopicShift('short', [], '')).toBe(0)
    expect(calculateTopicShift('under 20 chars', [], '')).toBe(0)
  })

  it('returns value between 0 and 1', () => {
    const result = calculateTopicShift(
      'This is a paragraph about React and TypeScript development with hooks and state management.',
      ['python', 'django'],
      'Full document content here'
    )
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(1)
  })

  it('returns higher score for unique topics', () => {
    const blockContent = 'Machine learning and neural networks with TensorFlow and PyTorch for deep learning.'
    const documentTags = ['web-development', 'frontend', 'css']

    const result = calculateTopicShift(blockContent, documentTags, '')
    expect(result).toBeGreaterThan(0.3)
  })

  it('returns lower score when block matches document tags', () => {
    const blockContent = 'Using React and TypeScript together for frontend development.'
    const documentTags = ['react', 'typescript', 'frontend']

    const result = calculateTopicShift(blockContent, documentTags, '')
    expect(result).toBeLessThan(0.7)
  })

  it('handles hyphenated document tags', () => {
    const blockContent = 'Machine learning models for natural language processing.'
    const documentTags = ['machine-learning', 'nlp']

    const result = calculateTopicShift(blockContent, documentTags, '')
    expect(result).toBeDefined()
    expect(typeof result).toBe('number')
  })
})

// ============================================================================
// calculateEntityDensity
// ============================================================================

describe('calculateEntityDensity', () => {
  it('returns 0 for empty content', () => {
    expect(calculateEntityDensity('')).toBe(0)
    expect(calculateEntityDensity('   ')).toBe(0)
  })

  it('returns 0 for very short content', () => {
    expect(calculateEntityDensity('too short')).toBe(0)
  })

  it('returns value between 0 and 1', () => {
    const result = calculateEntityDensity(
      'React and TypeScript are popular JavaScript frameworks used for building web applications with Node.js on AWS.'
    )
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(1)
  })

  it('returns higher score for entity-rich content', () => {
    const entityRich = 'React TypeScript Node.js Express MongoDB Redis AWS Lambda Docker Kubernetes PostgreSQL GraphQL REST API'
    const entityPoor = 'This is a simple paragraph without many technical terms or specific technologies mentioned.'

    const richScore = calculateEntityDensity(entityRich)
    const poorScore = calculateEntityDensity(entityPoor)

    expect(richScore).toBeGreaterThan(poorScore)
  })

  it('counts acronyms as entities', () => {
    const withAcronyms = 'The API uses REST and JSON formats. Check the SDK documentation for more info about the CLI and GUI features.'
    const result = calculateEntityDensity(withAcronyms)
    expect(result).toBeGreaterThan(0)
  })

  it('excludes common acronyms like THE, AND, FOR', () => {
    const content = 'THE AND FOR NOT BUT ARE WAS HAS HAD CAN ALL these words here in the sentence.'
    const result = calculateEntityDensity(content)
    // Should not inflate score with common words
    expect(result).toBeLessThan(0.5)
  })
})

// ============================================================================
// calculateSemanticNovelty
// ============================================================================

describe('calculateSemanticNovelty', () => {
  it('returns 0 for empty content', async () => {
    const result = await calculateSemanticNovelty('', [])
    expect(result).toBe(0)
  })

  it('returns 0 for very short content', async () => {
    const result = await calculateSemanticNovelty('short text', ['other block'])
    expect(result).toBe(0)
  })

  it('returns 0.5 for first block with no context', async () => {
    const result = await calculateSemanticNovelty(
      'This is a reasonably long paragraph about software development and programming.',
      []
    )
    expect(result).toBe(0.5)
  })

  it('returns value between 0 and 1', async () => {
    const result = await calculateSemanticNovelty(
      'This paragraph discusses machine learning algorithms and neural network architectures.',
      [
        'The previous paragraph talked about web development and frontend frameworks.',
        'Another paragraph about database design and SQL queries for data management.',
      ]
    )
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(1)
  })

  it('returns higher novelty for distinct content', async () => {
    // Use content with shared vocabulary so n-gram overlap can be measured
    const novelContent = 'Machine learning models predict outcomes based on training data. Neural networks process information using multiple layers.'
    const relatedContent = 'React components render UI elements based on state changes. TypeScript provides type safety for React component development.'
    const surroundingBlocks = [
      'React hooks manage state in functional components. The useState hook tracks component state changes.',
      'TypeScript interfaces define the shape of React props. Component types ensure type safety in React apps.',
    ]

    const novelScore = await calculateSemanticNovelty(novelContent, surroundingBlocks)
    const relatedScore = await calculateSemanticNovelty(relatedContent, surroundingBlocks)

    // Both should have valid scores between 0 and 1
    expect(novelScore).toBeGreaterThanOrEqual(0)
    expect(novelScore).toBeLessThanOrEqual(1)
    expect(relatedScore).toBeGreaterThanOrEqual(0)
    expect(relatedScore).toBeLessThanOrEqual(1)
    // Novel content about ML should have higher or equal novelty than React content
    // when compared to React-focused surrounding blocks
    expect(novelScore).toBeGreaterThanOrEqual(relatedScore)
  })

  it('uses embedding function when provided', async () => {
    const mockEmbeddingFn = vi.fn().mockResolvedValue([0.1, 0.2, 0.3, 0.4])

    await calculateSemanticNovelty(
      'This is a test paragraph with enough content to process.',
      ['Another paragraph for comparison with similar length.'],
      mockEmbeddingFn
    )

    expect(mockEmbeddingFn).toHaveBeenCalled()
  })

  it('falls back to n-gram when embedding fails', async () => {
    const mockEmbeddingFn = vi.fn().mockRejectedValue(new Error('Embedding failed'))

    const result = await calculateSemanticNovelty(
      'This is a test paragraph with enough content to process correctly.',
      ['Another paragraph for comparison with different content.'],
      mockEmbeddingFn
    )

    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(1)
  })
})

// ============================================================================
// calculateBlockWorthiness
// ============================================================================

describe('calculateBlockWorthiness', () => {
  const createParsedBlock = (
    id: string,
    content: string,
    type: string = 'paragraph'
  ): ParsedBlock => ({
    id,
    content,
    type: type as any,
    startLine: 0,
    endLine: 1,
    rawMarkdown: content,
    metadata: {},
  })

  it('marks table blocks as not worthy', async () => {
    const block = createParsedBlock('table-1', 'Some table content', 'table')
    const result = await calculateBlockWorthiness(block, {
      documentContent: '',
      documentTags: [],
      surroundingBlocks: [],
    })

    expect(result.worthy).toBe(false)
    expect(result.reasoning).toContain('table')
  })

  it('marks html blocks as not worthy', async () => {
    const block = createParsedBlock('html-1', '<div>HTML content</div>', 'html')
    const result = await calculateBlockWorthiness(block, {
      documentContent: '',
      documentTags: [],
      surroundingBlocks: [],
    })

    expect(result.worthy).toBe(false)
    expect(result.reasoning).toContain('html')
  })

  it('marks very short blocks as not worthy', async () => {
    const block = createParsedBlock('short-1', 'Too short', 'paragraph')
    const result = await calculateBlockWorthiness(block, {
      documentContent: '',
      documentTags: [],
      surroundingBlocks: [],
    })

    expect(result.worthy).toBe(false)
    expect(result.reasoning).toContain('too short')
  })

  it('returns worthiness result with all signals', async () => {
    const block = createParsedBlock(
      'para-1',
      'This is a paragraph about React and TypeScript development with hooks, state management, and component patterns for building modern web applications.',
      'paragraph'
    )

    const result = await calculateBlockWorthiness(block, {
      documentContent: 'Full document content',
      documentTags: ['javascript'],
      surroundingBlocks: [],
    })

    expect(result).toHaveProperty('score')
    expect(result).toHaveProperty('signals')
    expect(result).toHaveProperty('worthy')
    expect(result).toHaveProperty('reasoning')
    expect(result.signals).toHaveProperty('topicShift')
    expect(result.signals).toHaveProperty('entityDensity')
    expect(result.signals).toHaveProperty('semanticNovelty')
  })

  it('uses custom weights from config', async () => {
    const block = createParsedBlock(
      'para-1',
      'This is a paragraph about React and TypeScript development with hooks and state management for modern applications.',
      'paragraph'
    )

    const result = await calculateBlockWorthiness(
      block,
      {
        documentContent: '',
        documentTags: [],
        surroundingBlocks: [],
        config: {
          worthinessWeights: {
            topicShift: 1.0,
            entityDensity: 0,
            semanticNovelty: 0,
          },
        } as any,
      }
    )

    // Score should be entirely from topicShift
    expect(result.score).toBeCloseTo(result.signals.topicShift, 1)
  })

  it('uses custom threshold from config', async () => {
    const block = createParsedBlock(
      'para-1',
      'This is a basic paragraph with some content that might or might not be worthy of tagging.',
      'paragraph'
    )

    const lowThreshold = await calculateBlockWorthiness(block, {
      documentContent: '',
      documentTags: [],
      surroundingBlocks: [],
      config: { blockWorthinessThreshold: 0.1 } as any,
    })

    const highThreshold = await calculateBlockWorthiness(block, {
      documentContent: '',
      documentTags: [],
      surroundingBlocks: [],
      config: { blockWorthinessThreshold: 0.9 } as any,
    })

    // Same score, different worthiness
    expect(lowThreshold.score).toBe(highThreshold.score)
    // Low threshold more likely to be worthy
    expect(lowThreshold.worthy || !highThreshold.worthy).toBe(true)
  })

  it('includes reasoning about signals', async () => {
    const block = createParsedBlock(
      'para-1',
      'This paragraph introduces React, TypeScript, Node.js, MongoDB, AWS, Docker, and Kubernetes for cloud-native development.',
      'paragraph'
    )

    const result = await calculateBlockWorthiness(block, {
      documentContent: '',
      documentTags: ['python'],
      surroundingBlocks: [],
    })

    expect(result.reasoning).toBeTruthy()
    expect(typeof result.reasoning).toBe('string')
  })
})

// ============================================================================
// calculateAllBlockWorthiness
// ============================================================================

describe('calculateAllBlockWorthiness', () => {
  const createParsedBlock = (
    id: string,
    content: string
  ): ParsedBlock => ({
    id,
    content,
    type: 'paragraph',
    startLine: 0,
    endLine: 1,
    rawMarkdown: content,
    metadata: {},
  })

  it('returns empty map for empty blocks', async () => {
    const results = await calculateAllBlockWorthiness([], '', [])
    expect(results.size).toBe(0)
  })

  it('returns result for each block', async () => {
    const blocks = [
      createParsedBlock('block-1', 'First paragraph with React and TypeScript development patterns and practices.'),
      createParsedBlock('block-2', 'Second paragraph about Node.js and Express backend development with MongoDB.'),
      createParsedBlock('block-3', 'Third paragraph discussing AWS Lambda and serverless architecture patterns.'),
    ]

    const results = await calculateAllBlockWorthiness(blocks, '', [])

    expect(results.size).toBe(3)
    expect(results.has('block-1')).toBe(true)
    expect(results.has('block-2')).toBe(true)
    expect(results.has('block-3')).toBe(true)
  })

  it('uses surrounding blocks for context', async () => {
    const blocks = [
      createParsedBlock('intro', 'Introduction to React component patterns and hooks.'),
      createParsedBlock('main', 'Completely different topic about machine learning and neural networks with TensorFlow.'),
      createParsedBlock('outro', 'Conclusion about React performance optimization techniques.'),
    ]

    const results = await calculateAllBlockWorthiness(blocks, '', ['react'])

    // The ML block should have higher novelty than React blocks
    const mainResult = results.get('main')
    expect(mainResult).toBeDefined()
    expect(mainResult!.signals.semanticNovelty).toBeGreaterThan(0)
  })
})

// ============================================================================
// filterWorthyBlocks
// ============================================================================

describe('filterWorthyBlocks', () => {
  const createParsedBlock = (id: string): ParsedBlock => ({
    id,
    content: 'test content',
    type: 'paragraph',
    startLine: 0,
    endLine: 1,
    rawMarkdown: 'test content',
    metadata: {},
  })

  const createWorthinessResult = (worthy: boolean): WorthinessResult => ({
    score: worthy ? 0.7 : 0.3,
    signals: { topicShift: 0.5, entityDensity: 0.5, semanticNovelty: 0.5 },
    worthy,
    reasoning: worthy ? 'Block worthy' : 'Block not worthy',
  })

  it('returns empty array for empty input', () => {
    const result = filterWorthyBlocks([], new Map())
    expect(result).toEqual([])
  })

  it('filters to only worthy blocks', () => {
    const blocks = [
      createParsedBlock('worthy-1'),
      createParsedBlock('not-worthy'),
      createParsedBlock('worthy-2'),
    ]

    const worthinessMap = new Map<string, WorthinessResult>([
      ['worthy-1', createWorthinessResult(true)],
      ['not-worthy', createWorthinessResult(false)],
      ['worthy-2', createWorthinessResult(true)],
    ])

    const result = filterWorthyBlocks(blocks, worthinessMap)

    expect(result).toHaveLength(2)
    expect(result.map(b => b.id)).toEqual(['worthy-1', 'worthy-2'])
  })

  it('excludes blocks not in worthiness map', () => {
    const blocks = [
      createParsedBlock('in-map'),
      createParsedBlock('not-in-map'),
    ]

    const worthinessMap = new Map<string, WorthinessResult>([
      ['in-map', createWorthinessResult(true)],
    ])

    const result = filterWorthyBlocks(blocks, worthinessMap)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('in-map')
  })

  it('returns empty when all blocks are not worthy', () => {
    const blocks = [
      createParsedBlock('block-1'),
      createParsedBlock('block-2'),
    ]

    const worthinessMap = new Map<string, WorthinessResult>([
      ['block-1', createWorthinessResult(false)],
      ['block-2', createWorthinessResult(false)],
    ])

    const result = filterWorthyBlocks(blocks, worthinessMap)
    expect(result).toEqual([])
  })

  it('preserves block order', () => {
    const blocks = [
      createParsedBlock('z-block'),
      createParsedBlock('a-block'),
      createParsedBlock('m-block'),
    ]

    const worthinessMap = new Map<string, WorthinessResult>([
      ['z-block', createWorthinessResult(true)],
      ['a-block', createWorthinessResult(true)],
      ['m-block', createWorthinessResult(true)],
    ])

    const result = filterWorthyBlocks(blocks, worthinessMap)

    expect(result.map(b => b.id)).toEqual(['z-block', 'a-block', 'm-block'])
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('block worthiness integration', () => {
  const createParsedBlock = (
    id: string,
    content: string,
    type: string = 'paragraph'
  ): ParsedBlock => ({
    id,
    content,
    type: type as any,
    startLine: 0,
    endLine: 1,
    rawMarkdown: content,
    metadata: {},
  })

  it('full workflow: calculate all and filter worthy', async () => {
    const blocks = [
      createParsedBlock(
        'intro',
        'This is a short introduction.'
      ),
      createParsedBlock(
        'tech-heavy',
        'Using React, TypeScript, Node.js, MongoDB, Docker, Kubernetes, AWS Lambda, and GraphQL for building scalable microservices architecture.'
      ),
      createParsedBlock(
        'table-block',
        'Table content',
        'table'
      ),
    ]

    const results = await calculateAllBlockWorthiness(blocks, '', [])
    const worthyBlocks = filterWorthyBlocks(blocks, results)

    // Short intro and table should not be worthy
    // Only tech-heavy might be worthy
    for (const block of worthyBlocks) {
      expect(block.type).not.toBe('table')
      expect(block.content.length).toBeGreaterThanOrEqual(50)
    }
  })

  it('weighted score calculation', async () => {
    const block = createParsedBlock(
      'test',
      'This paragraph about Python and Django web development with PostgreSQL database and Redis caching for high-performance applications.'
    )

    const result = await calculateBlockWorthiness(block, {
      documentContent: '',
      documentTags: [],
      surroundingBlocks: [],
    })

    // Verify weighted calculation
    const expectedScore =
      result.signals.topicShift * DEFAULT_WORTHINESS_WEIGHTS.topicShift +
      result.signals.entityDensity * DEFAULT_WORTHINESS_WEIGHTS.entityDensity +
      result.signals.semanticNovelty * DEFAULT_WORTHINESS_WEIGHTS.semanticNovelty

    expect(result.score).toBeCloseTo(expectedScore, 5)
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('edge cases', () => {
  const createParsedBlock = (
    id: string,
    content: string,
    type: string = 'paragraph'
  ): ParsedBlock => ({
    id,
    content,
    type: type as any,
    startLine: 0,
    endLine: 1,
    rawMarkdown: content,
    metadata: {},
  })

  describe('calculateTopicShift edge cases', () => {
    it('handles exactly 20 character content', () => {
      const content = 'exactly twenty char' // 19 chars - should return 0
      const result = calculateTopicShift(content, [], '')
      expect(result).toBe(0)

      const content20 = 'exactly twentyyy now' // 20 chars - should process
      const result20 = calculateTopicShift(content20, [], '')
      expect(typeof result20).toBe('number')
    })

    it('handles document tags with spaces', () => {
      const blockContent = 'This paragraph discusses machine learning concepts and implementations.'
      const documentTags = ['machine learning', 'artificial intelligence']

      const result = calculateTopicShift(blockContent, documentTags, '')
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(1)
    })

    it('handles empty document tags array', () => {
      const blockContent = 'React TypeScript Node.js development with hooks and state management patterns.'
      const result = calculateTopicShift(blockContent, [], '')

      // All terms should be "unique" with no doc tags to match
      expect(result).toBeGreaterThan(0)
    })

    it('handles blocks with only stop words', () => {
      const blockContent = 'the and but for not has was are can'
      const result = calculateTopicShift(blockContent, [], '')
      // May return 0 or a low score depending on extraction
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(1)
    })
  })

  describe('calculateEntityDensity edge cases', () => {
    it('handles exactly 5 words', () => {
      const content = 'one two three four five'
      const result = calculateEntityDensity(content)
      // 5 words with no entities = low score
      expect(result).toBeGreaterThanOrEqual(0)
    })

    it('handles content with only whitespace between words', () => {
      const content = 'React    TypeScript     Node.js     MongoDB    Express and GraphQL'
      const result = calculateEntityDensity(content)
      // Multiple spaces are collapsed, should have 7 words with entities
      expect(result).toBeGreaterThan(0)
    })

    it('handles single long word', () => {
      const content = 'superlongwordwithoutanyspacesatall'
      const result = calculateEntityDensity(content)
      expect(result).toBe(0) // < 5 words
    })
  })

  describe('calculateSemanticNovelty edge cases', () => {
    it('handles exactly 30 character content', async () => {
      const shortContent = 'exactly 29 characters here.' // < 30
      const result = await calculateSemanticNovelty(shortContent, ['other block'])
      expect(result).toBe(0)
    })

    it('skips short surrounding blocks', async () => {
      const blockContent = 'This is a sufficiently long paragraph about React development.'
      const surroundingBlocks = [
        'short',
        'also short',
        'This is a sufficiently long paragraph that should be used for comparison.',
      ]

      const result = await calculateSemanticNovelty(blockContent, surroundingBlocks)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(1)
    })

    it('handles embedding returning similar vectors', async () => {
      const mockEmbeddingFn = vi.fn().mockResolvedValue([0.5, 0.5, 0.5, 0.5])

      const result = await calculateSemanticNovelty(
        'This is a test paragraph with enough content to process.',
        ['Another paragraph for comparison with similar length content.'],
        mockEmbeddingFn
      )

      // Same embeddings = high similarity = low novelty
      expect(result).toBeLessThanOrEqual(0.3)
    })

    it('handles embedding returning orthogonal vectors', async () => {
      const mockEmbeddingFn = vi.fn()
        .mockResolvedValueOnce([1, 0, 0, 0])
        .mockResolvedValueOnce([0, 1, 0, 0])

      const result = await calculateSemanticNovelty(
        'This is a test paragraph with enough content to process.',
        ['Another paragraph for comparison with similar length content.'],
        mockEmbeddingFn
      )

      // Orthogonal embeddings = 0 similarity = high novelty (1.0)
      expect(result).toBeGreaterThanOrEqual(0.9)
    })

    it('handles embedding with empty vector', async () => {
      const mockEmbeddingFn = vi.fn().mockResolvedValue([])

      const result = await calculateSemanticNovelty(
        'This is a test paragraph with enough content to process.',
        ['Another paragraph for comparison with similar length content.'],
        mockEmbeddingFn
      )

      // Empty vectors should fall back to n-gram
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(1)
    })

    it('handles all surrounding blocks being too short', async () => {
      const result = await calculateSemanticNovelty(
        'This is a sufficiently long paragraph about software development.',
        ['short', 'tiny', 'small text']
      )

      // No valid comparisons = moderate novelty (0.5)
      expect(result).toBe(0.5)
    })
  })

  describe('calculateBlockWorthiness edge cases', () => {
    it('handles block with exactly 50 characters', async () => {
      const block = createParsedBlock('edge', 'This is exactly fifty characters long text here.')
      expect(block.content.length).toBeLessThan(50)

      const result = await calculateBlockWorthiness(block, {
        documentContent: '',
        documentTags: [],
        surroundingBlocks: [],
      })

      expect(result.worthy).toBe(false)
      expect(result.reasoning).toContain('too short')
    })

    it('generates reasoning for medium scores', async () => {
      const block = createParsedBlock(
        'test',
        'This paragraph about React components includes some topic variation with moderate entity density.'
      )

      const result = await calculateBlockWorthiness(block, {
        documentContent: '',
        documentTags: [],
        surroundingBlocks: [],
      })

      // Should have some reasoning text regardless of worthiness
      expect(result.reasoning.length).toBeGreaterThan(0)
    })

    it('handles code block type', async () => {
      const block = createParsedBlock(
        'code',
        'function hello() { return "world"; } // This is a JavaScript function with enough content.',
        'code'
      )

      const result = await calculateBlockWorthiness(block, {
        documentContent: '',
        documentTags: [],
        surroundingBlocks: [],
      })

      // Code blocks should still be processed (not skipped like table/html)
      expect(result.score).toBeGreaterThanOrEqual(0)
    })
  })

  describe('filterWorthyBlocks edge cases', () => {
    it('handles undefined result in map', () => {
      const blocks = [
        createParsedBlock('block-1', 'content'),
      ]

      const worthinessMap = new Map<string, WorthinessResult>()
      // Intentionally don't add block-1 to the map

      const result = filterWorthyBlocks(blocks, worthinessMap)
      expect(result).toHaveLength(0)
    })
  })
})
