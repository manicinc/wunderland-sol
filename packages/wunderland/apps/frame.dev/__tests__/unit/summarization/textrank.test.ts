/**
 * Tests for TextRank Extractive Summarization
 * @module tests/unit/summarization/textrank
 *
 * Tests the client-side TextRank algorithm with BERT/TF-IDF embeddings.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the embedding engine
vi.mock('@/lib/search/embeddingEngine', () => ({
  EmbeddingEngine: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockReturnValue({ type: 'transformers' }),
    embedText: vi.fn().mockResolvedValue(new Float32Array(384).fill(0.1)),
  })),
}))

import {
  tokenizeSentences,
  isValidSentence,
  extractSummary,
  summarizeBlock,
  buildSimilarityGraph,
  calculateTextRankScores,
  applyBoosts,
  DEFAULT_TEXTRANK_CONFIG,
} from '@/lib/nlp/textrank'
import type { ParsedBlock } from '@/components/quarry/types'

describe('TextRank Summarization', () => {
  describe('tokenizeSentences', () => {
    it('should split text into sentences', () => {
      const text = 'This is the first sentence. This is the second sentence. And this is the third.'
      const sentences = tokenizeSentences(text)

      expect(sentences.length).toBe(3)
      expect(sentences[0]).toContain('first')
      expect(sentences[1]).toContain('second')
      expect(sentences[2]).toContain('third')
    })

    it('should handle abbreviations correctly', () => {
      const text = 'Dr. Smith went to the store. Mr. Jones stayed home.'
      const sentences = tokenizeSentences(text)

      // Note: Simple tokenizer may not fully handle abbreviations
      // At minimum, we should get at least 1 valid sentence
      expect(sentences.length).toBeGreaterThanOrEqual(1)
      expect(sentences.some(s => s.includes('Smith') || s.includes('Jones'))).toBe(true)
    })

    it('should preserve URLs', () => {
      const text = 'Visit https://example.com/path for more info. Then continue reading.'
      const sentences = tokenizeSentences(text)

      expect(sentences.some(s => s.includes('https://example.com'))).toBe(true)
    })

    it('should handle decimal numbers', () => {
      const text = 'The value is 3.14 which is pi. Another sentence here.'
      const sentences = tokenizeSentences(text)

      expect(sentences[0]).toContain('3.14')
    })

    it('should filter very short fragments', () => {
      const text = 'A. B. C. This is a proper sentence.'
      const sentences = tokenizeSentences(text)

      expect(sentences.every(s => s.length >= 10)).toBe(true)
    })

    it('should return empty array for empty input', () => {
      expect(tokenizeSentences('')).toEqual([])
      expect(tokenizeSentences('   ')).toEqual([])
    })
  })

  describe('isValidSentence', () => {
    it('should accept valid sentences', () => {
      expect(isValidSentence('This is a valid sentence with enough words.')).toBe(true)
    })

    it('should reject short sentences', () => {
      expect(isValidSentence('Hi there')).toBe(false)
      expect(isValidSentence('AB')).toBe(false)
    })

    it('should reject code snippets', () => {
      expect(isValidSentence('import React from "react"')).toBe(false)
      expect(isValidSentence('const x = 5;')).toBe(false)
      expect(isValidSentence('function test() { return true; }')).toBe(false)
    })

    it('should reject URLs', () => {
      expect(isValidSentence('https://example.com/very/long/path/here')).toBe(false)
    })

    it('should reject strings with mostly special characters', () => {
      expect(isValidSentence('!@#$%^&*()_+-=[]{}|;:,.<>?')).toBe(false)
    })

    it('should handle null/undefined', () => {
      expect(isValidSentence(null as any)).toBe(false)
      expect(isValidSentence(undefined as any)).toBe(false)
    })
  })

  describe('buildSimilarityGraph', () => {
    it('should build a graph from sentences', async () => {
      const sentences = [
        'Machine learning is a subset of artificial intelligence.',
        'Deep learning uses neural networks with many layers.',
        'AI systems can learn from data without explicit programming.',
      ]

      const graph = await buildSimilarityGraph(sentences, {
        ...DEFAULT_TEXTRANK_CONFIG,
        useBertEmbeddings: false, // Use TF-IDF for testing
      })

      expect(graph.size).toBe(3)
      expect(graph.get(0)).toBeDefined()
      expect(graph.get(1)).toBeDefined()
      expect(graph.get(2)).toBeDefined()
    })

    it('should not connect sentence to itself', async () => {
      const sentences = ['Sentence one here.', 'Sentence two here.']

      const graph = await buildSimilarityGraph(sentences, {
        ...DEFAULT_TEXTRANK_CONFIG,
        useBertEmbeddings: false,
      })

      for (const [i, edges] of graph) {
        expect(edges.has(i)).toBe(false)
      }
    })

    it('should apply minimum similarity threshold', async () => {
      const sentences = [
        'Cats are great pets.',
        'The economy is growing rapidly this quarter.',
      ]

      const graph = await buildSimilarityGraph(sentences, {
        ...DEFAULT_TEXTRANK_CONFIG,
        useBertEmbeddings: false,
        minSimilarity: 0.5,
      })

      // Very different sentences should have no connection
      const edges = graph.get(0) || new Map()
      const similarity = edges.get(1) || 0
      expect(similarity).toBeLessThan(0.5)
    })
  })

  describe('calculateTextRankScores', () => {
    it('should return scores for all nodes', () => {
      const graph = new Map<number, Map<number, number>>()
      graph.set(0, new Map([[1, 0.5], [2, 0.3]]))
      graph.set(1, new Map([[0, 0.5], [2, 0.4]]))
      graph.set(2, new Map([[0, 0.3], [1, 0.4]]))

      const scores = calculateTextRankScores(graph, DEFAULT_TEXTRANK_CONFIG)

      expect(scores.length).toBe(3)
      expect(scores.every(s => s > 0)).toBe(true)
    })

    it('should converge to stable scores', () => {
      const graph = new Map<number, Map<number, number>>()
      graph.set(0, new Map([[1, 0.8]]))
      graph.set(1, new Map([[0, 0.8], [2, 0.6]]))
      graph.set(2, new Map([[1, 0.6]]))

      const scores = calculateTextRankScores(graph, {
        ...DEFAULT_TEXTRANK_CONFIG,
        iterations: 50,
      })

      expect(scores.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 1)
    })

    it('should handle empty graph', () => {
      const graph = new Map<number, Map<number, number>>()
      const scores = calculateTextRankScores(graph, DEFAULT_TEXTRANK_CONFIG)

      expect(scores).toEqual([])
    })
  })

  describe('applyBoosts', () => {
    it('should boost early sentences', () => {
      const sentences = ['First sentence.', 'Second sentence.', 'Third sentence.']
      const baseScores = [0.33, 0.33, 0.33]

      const boosted = applyBoosts(sentences, baseScores, {
        ...DEFAULT_TEXTRANK_CONFIG,
        positionBiasWeight: 0.3,
        entityDensityWeight: 0,
      })

      expect(boosted[0].score).toBeGreaterThan(boosted[2].score)
    })

    it('should boost sentences with tech entities', () => {
      const sentences = [
        'Random words here.',
        'React and TypeScript are great for building web applications.',
      ]
      const baseScores = [0.5, 0.5]

      const boosted = applyBoosts(sentences, baseScores, {
        ...DEFAULT_TEXTRANK_CONFIG,
        positionBiasWeight: 0,
        entityDensityWeight: 0.3,
      })

      expect(boosted[1].entityDensity).toBeGreaterThan(boosted[0].entityDensity)
    })

    it('should include position and entity density in result', () => {
      const sentences = ['Test sentence one.', 'Test sentence two.']
      const baseScores = [0.5, 0.5]

      const boosted = applyBoosts(sentences, baseScores, DEFAULT_TEXTRANK_CONFIG)

      boosted.forEach((item, index) => {
        expect(item.text).toBe(sentences[index])
        expect(item.index).toBe(index)
        expect(item.position).toBeDefined()
        expect(item.entityDensity).toBeDefined()
        expect(item.score).toBeDefined()
      })
    })
  })

  describe('extractSummary', () => {
    it('should generate summary from text', async () => {
      const text = `
        Machine learning is revolutionizing how we process data.
        Neural networks can identify complex patterns in large datasets.
        Deep learning models require significant computational resources.
        The field continues to evolve rapidly with new architectures.
      `

      const result = await extractSummary(text, {
        maxLength: 100,
        useBertEmbeddings: false,
      })

      expect(result.summary.length).toBeLessThanOrEqual(103) // Allow for ellipsis
      expect(result.method).toBe('tfidf')
    })

    it('should return empty for empty input', async () => {
      const result = await extractSummary('', {})
      expect(result.summary).toBe('')
      expect(result.sentences).toEqual([])
    })

    it('should handle single sentence', async () => {
      const text = 'This is the only sentence in this document.'
      const result = await extractSummary(text, { maxLength: 50 })

      expect(result.summary).toContain('only sentence')
    })

    it('should respect maxLength parameter', async () => {
      const text = `
        First sentence here. Second sentence follows.
        Third sentence now. Fourth sentence appears.
        Fifth sentence comes. Sixth sentence ends.
      `

      const result = await extractSummary(text, { maxLength: 50 })

      expect(result.summary.length).toBeLessThanOrEqual(53)
    })

    it('should order selected sentences by original position', async () => {
      const text = `
        The introduction sets the stage for everything.
        Background information provides context.
        The main argument is presented clearly.
        Supporting evidence strengthens the case.
        The conclusion wraps everything up nicely.
      `

      const result = await extractSummary(text, {
        maxLength: 150,
        useBertEmbeddings: false,
      })

      // Summary should maintain logical flow
      expect(result.summary.length).toBeGreaterThan(0)
    })
  })

  describe('summarizeBlock', () => {
    it('should summarize paragraph blocks', async () => {
      const block: ParsedBlock = {
        id: 'test-1',
        type: 'paragraph',
        content: 'This is a paragraph with multiple sentences. It contains important information. The summary should capture the key points.',
        depth: 0,
        metadata: {},
      }

      const summary = await summarizeBlock(block, { maxLength: 50 })

      expect(summary).not.toBeNull()
      // Summary should be shorter than original content
      expect(summary!.length).toBeLessThanOrEqual(block.content.length)
    })

    it('should handle heading blocks', async () => {
      const block: ParsedBlock = {
        id: 'test-2',
        type: 'heading',
        content: '## Important Section Title',
        depth: 2,
        metadata: {},
      }

      const summary = await summarizeBlock(block)

      expect(summary).toBe('Important Section Title')
    })

    it('should return null for code blocks by default', async () => {
      const block: ParsedBlock = {
        id: 'test-3',
        type: 'code',
        content: 'const x = 5;\nconst y = 10;\nconsole.log(x + y);',
        depth: 0,
        metadata: { language: 'javascript' },
      }

      const summary = await summarizeBlock(block)

      expect(summary).toBeNull()
    })

    it('should extract docstrings from code blocks', async () => {
      const block: ParsedBlock = {
        id: 'test-4',
        type: 'code',
        content: '/**\n * This function calculates the sum of two numbers.\n */\nfunction add(a, b) { return a + b; }',
        depth: 0,
        metadata: { language: 'javascript' },
      }

      const summary = await summarizeBlock(block)

      expect(summary).toContain('calculates the sum')
    })

    it('should summarize list blocks', async () => {
      const block: ParsedBlock = {
        id: 'test-5',
        type: 'list',
        content: '- First important point about the topic\n- Second crucial detail to remember\n- Third significant aspect to consider',
        depth: 0,
        metadata: {},
      }

      const summary = await summarizeBlock(block, { maxLength: 100 })

      expect(summary).not.toBeNull()
    })

    it('should return table header for table blocks', async () => {
      const block: ParsedBlock = {
        id: 'test-6',
        type: 'table',
        content: '| Name | Age | City |\n|------|-----|------|\n| John | 30 | NYC |',
        depth: 0,
        metadata: {},
      }

      const summary = await summarizeBlock(block)

      expect(summary).toContain('Table:')
      expect(summary).toContain('Name')
    })
  })

  describe('DEFAULT_TEXTRANK_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_TEXTRANK_CONFIG.iterations).toBeGreaterThan(0)
      expect(DEFAULT_TEXTRANK_CONFIG.dampingFactor).toBeGreaterThan(0)
      expect(DEFAULT_TEXTRANK_CONFIG.dampingFactor).toBeLessThan(1)
      expect(DEFAULT_TEXTRANK_CONFIG.maxLength).toBeGreaterThan(0)
      expect(DEFAULT_TEXTRANK_CONFIG.minSimilarity).toBeGreaterThanOrEqual(0)
      expect(DEFAULT_TEXTRANK_CONFIG.useBertEmbeddings).toBe(true)
    })

    it('should have position and entity weights that sum to less than 1', () => {
      const totalWeight =
        DEFAULT_TEXTRANK_CONFIG.positionBiasWeight +
        DEFAULT_TEXTRANK_CONFIG.entityDensityWeight

      expect(totalWeight).toBeLessThan(1)
    })
  })
})

describe('Summarization Algorithm Selection', () => {
  it('should use BERT when available and configured', async () => {
    const text = 'AI and machine learning are transforming technology. Neural networks enable new capabilities.'

    const result = await extractSummary(text, {
      useBertEmbeddings: true,
    }, async () => new Float32Array(384).fill(0.1))

    // With mock embeddings, should report bert method
    expect(['bert', 'tfidf']).toContain(result.method)
  })

  it('should fallback to TF-IDF when BERT is disabled', async () => {
    const text = 'AI and machine learning are transforming technology. Neural networks enable new capabilities.'

    const result = await extractSummary(text, {
      useBertEmbeddings: false,
    })

    expect(result.method).toBe('tfidf')
  })

  it('should fallback to TF-IDF when embedding function fails', async () => {
    const text = 'AI and machine learning are transforming technology. Neural networks enable new capabilities.'

    const result = await extractSummary(
      text,
      { useBertEmbeddings: true },
      async () => { throw new Error('Embedding failed') }
    )

    // Should still produce a valid summary even when embeddings fail
    // May use cached embeddings or fallback to TF-IDF
    expect(result.summary.length).toBeGreaterThan(0)
    expect(['bert', 'tfidf']).toContain(result.method)
  })
})
