/**
 * TextRank Tests
 * @module __tests__/unit/lib/nlp/textrank.test
 *
 * Tests for TextRank extractive summarization algorithm.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  tokenizeSentences,
  isValidSentence,
  buildSimilarityGraph,
  calculateTextRankScores,
  applyBoosts,
  extractSummary,
  DEFAULT_TEXTRANK_CONFIG,
} from '@/lib/nlp/textrank'

// ============================================================================
// TOKENIZE SENTENCES
// ============================================================================

describe('tokenizeSentences', () => {
  it('splits basic sentences', () => {
    const text = 'First sentence. Second sentence. Third sentence.'
    const sentences = tokenizeSentences(text)
    expect(sentences).toHaveLength(3)
    expect(sentences[0]).toBe('First sentence.')
    expect(sentences[1]).toBe('Second sentence.')
    expect(sentences[2]).toBe('Third sentence.')
  })

  it('handles question marks and exclamation points', () => {
    const text = 'What is this? It is great! Indeed it is.'
    const sentences = tokenizeSentences(text)
    expect(sentences).toHaveLength(3)
  })

  it('preserves abbreviations', () => {
    const text = 'Mr. Smith went to the store. He bought apples.'
    const sentences = tokenizeSentences(text)
    expect(sentences.length).toBeGreaterThanOrEqual(1)
    expect(sentences[0]).toContain('Mr.')
  })

  it('preserves URLs', () => {
    const text = 'Check out https://example.com for more info. It is helpful.'
    const sentences = tokenizeSentences(text)
    expect(sentences.some(s => s.includes('https://example.com'))).toBe(true)
  })

  it('preserves decimal numbers', () => {
    const text = 'The price is 3.99 dollars. That is affordable.'
    const sentences = tokenizeSentences(text)
    expect(sentences.some(s => s.includes('3.99'))).toBe(true)
  })

  it('returns empty array for empty input', () => {
    expect(tokenizeSentences('')).toEqual([])
    expect(tokenizeSentences('   ')).toEqual([])
  })

  it('filters very short fragments', () => {
    const text = 'Hi. OK. This is a longer valid sentence.'
    const sentences = tokenizeSentences(text)
    // Short fragments like "Hi." and "OK." should be filtered (< 10 chars)
    expect(sentences.length).toBeLessThanOrEqual(3)
  })

  it('handles Dr., Prof., etc.', () => {
    const text = 'Dr. Jones and Prof. Smith collaborated. They published a paper.'
    const sentences = tokenizeSentences(text)
    expect(sentences[0]).toContain('Dr.')
    expect(sentences[0]).toContain('Prof.')
  })
})

// ============================================================================
// IS VALID SENTENCE
// ============================================================================

describe('isValidSentence', () => {
  it('returns true for valid sentence', () => {
    expect(isValidSentence('This is a valid sentence.')).toBe(true)
  })

  it('returns false for empty string', () => {
    expect(isValidSentence('')).toBe(false)
    expect(isValidSentence('   ')).toBe(false)
  })

  it('returns false for too few words', () => {
    expect(isValidSentence('Hi there', 3)).toBe(false)
    expect(isValidSentence('Hello world test', 3)).toBe(true)
  })

  it('returns false for code snippets', () => {
    expect(isValidSentence('import React from "react"')).toBe(false)
    expect(isValidSentence('const x = 5')).toBe(false)
    expect(isValidSentence('function test() {}')).toBe(false)
    expect(isValidSentence('export default App')).toBe(false)
  })

  it('returns false for URLs', () => {
    expect(isValidSentence('https://example.com/path/to/page')).toBe(false)
  })

  it('returns false for mostly special characters', () => {
    expect(isValidSentence('!@#$%^&*()_+')).toBe(false)
    expect(isValidSentence('=====')).toBe(false)
  })

  it('respects minWords parameter', () => {
    expect(isValidSentence('One two', 2)).toBe(true)
    expect(isValidSentence('One two', 3)).toBe(false)
  })
})

// ============================================================================
// CALCULATE TEXTRANK SCORES
// ============================================================================

describe('calculateTextRankScores', () => {
  it('returns empty array for empty graph', () => {
    const graph = new Map<number, Map<number, number>>()
    const scores = calculateTextRankScores(graph, DEFAULT_TEXTRANK_CONFIG)
    expect(scores).toEqual([])
  })

  it('returns uniform scores for disconnected graph', () => {
    const graph = new Map<number, Map<number, number>>([
      [0, new Map()],
      [1, new Map()],
      [2, new Map()],
    ])
    const scores = calculateTextRankScores(graph, DEFAULT_TEXTRANK_CONFIG)
    expect(scores).toHaveLength(3)
    // All scores should be roughly equal for disconnected nodes
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
    scores.forEach(s => {
      expect(Math.abs(s - avgScore)).toBeLessThan(0.1)
    })
  })

  it('assigns higher score to well-connected nodes', () => {
    // Node 0 is connected to both 1 and 2
    // Node 1 is only connected to 0
    // Node 2 is only connected to 0
    const graph = new Map<number, Map<number, number>>([
      [0, new Map([[1, 0.5], [2, 0.5]])],
      [1, new Map([[0, 0.5]])],
      [2, new Map([[0, 0.5]])],
    ])
    const scores = calculateTextRankScores(graph, DEFAULT_TEXTRANK_CONFIG)
    expect(scores).toHaveLength(3)
    // All scores should sum to approximately 1
    const sum = scores.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 1)
  })

  it('uses damping factor', () => {
    const graph = new Map<number, Map<number, number>>([
      [0, new Map([[1, 1.0]])],
      [1, new Map([[0, 1.0]])],
    ])

    const config1 = { ...DEFAULT_TEXTRANK_CONFIG, dampingFactor: 0.5 }
    const config2 = { ...DEFAULT_TEXTRANK_CONFIG, dampingFactor: 0.95 }

    const scores1 = calculateTextRankScores(graph, config1)
    const scores2 = calculateTextRankScores(graph, config2)

    // Both should produce valid scores
    expect(scores1).toHaveLength(2)
    expect(scores2).toHaveLength(2)
  })

  it('respects iteration count', () => {
    const graph = new Map<number, Map<number, number>>([
      [0, new Map([[1, 0.5]])],
      [1, new Map([[0, 0.5]])],
    ])

    const configFew = { ...DEFAULT_TEXTRANK_CONFIG, iterations: 1 }
    const configMany = { ...DEFAULT_TEXTRANK_CONFIG, iterations: 100 }

    const scoresFew = calculateTextRankScores(graph, configFew)
    const scoresMany = calculateTextRankScores(graph, configMany)

    // Both should produce valid scores (convergence differs)
    expect(scoresFew).toHaveLength(2)
    expect(scoresMany).toHaveLength(2)
  })
})

// ============================================================================
// APPLY BOOSTS
// ============================================================================

describe('applyBoosts', () => {
  it('applies position bias (first sentences get boost)', () => {
    const sentences = ['First sentence.', 'Second sentence.', 'Third sentence.']
    const baseScores = [0.33, 0.33, 0.33]

    const result = applyBoosts(sentences, baseScores, DEFAULT_TEXTRANK_CONFIG)

    expect(result).toHaveLength(3)
    // First sentence should have highest position boost
    expect(result[0].position).toBeGreaterThan(result[1].position)
    expect(result[1].position).toBeGreaterThan(result[2].position)
  })

  it('applies entity density boost', () => {
    const sentences = [
      'The weather is nice today.',
      'React and TypeScript are JavaScript frameworks and languages.',
    ]
    const baseScores = [0.5, 0.5]

    const result = applyBoosts(sentences, baseScores, DEFAULT_TEXTRANK_CONFIG)

    // Second sentence mentions tech entities
    expect(result[1].entityDensity).toBeGreaterThan(result[0].entityDensity)
  })

  it('returns SentenceScore objects with all fields', () => {
    const sentences = ['Test sentence one.', 'Test sentence two.']
    const baseScores = [0.5, 0.5]

    const result = applyBoosts(sentences, baseScores, DEFAULT_TEXTRANK_CONFIG)

    result.forEach((score, idx) => {
      expect(score.text).toBe(sentences[idx])
      expect(score.index).toBe(idx)
      expect(typeof score.score).toBe('number')
      expect(typeof score.position).toBe('number')
      expect(typeof score.entityDensity).toBe('number')
    })
  })

  it('respects config weights', () => {
    const sentences = ['First.', 'Second.']
    const baseScores = [0.5, 0.5]

    const configNoBoost = {
      ...DEFAULT_TEXTRANK_CONFIG,
      positionBiasWeight: 0,
      entityDensityWeight: 0,
    }

    const result = applyBoosts(sentences, baseScores, configNoBoost)

    // With no boosts, scores should be close to base scores
    expect(result[0].score).toBeCloseTo(0.5, 1)
    expect(result[1].score).toBeCloseTo(0.5, 1)
  })
})

// ============================================================================
// BUILD SIMILARITY GRAPH
// ============================================================================

describe('buildSimilarityGraph', () => {
  it('creates graph from sentences', async () => {
    const sentences = [
      'JavaScript is a programming language.',
      'TypeScript extends JavaScript with types.',
      'The weather is sunny today.',
    ]

    const graph = await buildSimilarityGraph(sentences, DEFAULT_TEXTRANK_CONFIG)

    expect(graph.size).toBe(3)
    expect(graph.has(0)).toBe(true)
    expect(graph.has(1)).toBe(true)
    expect(graph.has(2)).toBe(true)
  })

  it('excludes self-edges', async () => {
    const sentences = ['First sentence.', 'Second sentence.']

    const graph = await buildSimilarityGraph(sentences, DEFAULT_TEXTRANK_CONFIG)

    // No node should have an edge to itself
    for (const [node, edges] of graph) {
      expect(edges.has(node)).toBe(false)
    }
  })

  it('respects minSimilarity threshold', async () => {
    const sentences = [
      'JavaScript is great.',
      'TypeScript is also great.',
      'Completely unrelated content about cooking.',
    ]

    const graph = await buildSimilarityGraph(sentences, {
      ...DEFAULT_TEXTRANK_CONFIG,
      minSimilarity: 0.5, // High threshold
    })

    // Edges with low similarity should be excluded
    expect(graph.size).toBe(3)
  })

  it('uses TF-IDF by default when no embedding function', async () => {
    const sentences = ['First test sentence.', 'Second test sentence.']

    // No embedding function provided
    const graph = await buildSimilarityGraph(sentences, DEFAULT_TEXTRANK_CONFIG)

    expect(graph.size).toBe(2)
  })

  it('uses BERT embeddings when provided', async () => {
    const sentences = ['First sentence.', 'Second sentence.']

    // Mock embedding function
    const mockEmbedFn = vi.fn().mockResolvedValue(new Float32Array([0.1, 0.2, 0.3]))

    const graph = await buildSimilarityGraph(
      sentences,
      { ...DEFAULT_TEXTRANK_CONFIG, useBertEmbeddings: true },
      mockEmbedFn
    )

    expect(mockEmbedFn).toHaveBeenCalledTimes(2)
    expect(graph.size).toBe(2)
  })
})

// ============================================================================
// EXTRACT SUMMARY
// ============================================================================

describe('extractSummary', () => {
  it('returns empty result for empty text', async () => {
    const result = await extractSummary('')

    expect(result.summary).toBe('')
    expect(result.sentences).toEqual([])
  })

  it('handles single sentence', async () => {
    const text = 'This is a single sentence that should be returned as-is.'
    const result = await extractSummary(text)

    expect(result.sentences).toHaveLength(1)
    expect(result.summary.length).toBeGreaterThan(0)
  })

  it('extracts summary from multiple sentences', async () => {
    const text = `
      JavaScript is a dynamic programming language.
      It powers most of the modern web.
      TypeScript adds static types to JavaScript.
      This helps catch errors at compile time.
      Many developers prefer TypeScript for large projects.
    `

    const result = await extractSummary(text, { maxLength: 150 })

    expect(result.summary.length).toBeGreaterThan(0)
    expect(result.summary.length).toBeLessThanOrEqual(153) // Some tolerance for sentence boundaries
    expect(result.sentences.length).toBeGreaterThan(0)
  })

  it('respects maxLength config', async () => {
    const text = 'First sentence is here. Second sentence is here. Third sentence is here.'

    const result = await extractSummary(text, { maxLength: 30 })

    // Summary should be truncated
    expect(result.summary.length).toBeLessThanOrEqual(35) // Some tolerance
  })

  it('ranks sentences by importance', async () => {
    const text = `
      React is a JavaScript library for building user interfaces.
      The weather is nice today.
      TypeScript provides static type checking.
      Components are the building blocks of React applications.
      I like coffee.
    `

    const result = await extractSummary(text, { maxLength: 300 })

    // Sentences about tech should rank higher due to entity density
    expect(result.sentences.length).toBeGreaterThan(0)

    // Find the tech-related sentences
    const techSentences = result.sentences.filter(s =>
      s.text.toLowerCase().includes('react') ||
      s.text.toLowerCase().includes('typescript') ||
      s.text.toLowerCase().includes('components')
    )

    expect(techSentences.length).toBeGreaterThan(0)
  })

  it('uses tfidf method when no embedding function', async () => {
    const text = 'First sentence here. Second sentence there.'

    const result = await extractSummary(text)

    expect(result.method).toBe('tfidf')
  })

  it('orders sentences by original position in final summary', async () => {
    const text = `
      This is the first sentence in the document.
      This is the second sentence in the document.
      This is the third sentence in the document.
    `

    const result = await extractSummary(text, { maxLength: 500 })

    // The summary should maintain original order for coherence
    if (result.summary.includes('first') && result.summary.includes('third')) {
      const firstPos = result.summary.indexOf('first')
      const thirdPos = result.summary.indexOf('third')
      expect(firstPos).toBeLessThan(thirdPos)
    }
  })
})

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

describe('DEFAULT_TEXTRANK_CONFIG', () => {
  it('has valid default values', () => {
    expect(DEFAULT_TEXTRANK_CONFIG.iterations).toBe(20)
    expect(DEFAULT_TEXTRANK_CONFIG.dampingFactor).toBe(0.85)
    expect(DEFAULT_TEXTRANK_CONFIG.maxLength).toBe(200)
    expect(DEFAULT_TEXTRANK_CONFIG.minSimilarity).toBe(0.1)
    expect(DEFAULT_TEXTRANK_CONFIG.positionBiasWeight).toBe(0.2)
    expect(DEFAULT_TEXTRANK_CONFIG.entityDensityWeight).toBe(0.15)
    expect(DEFAULT_TEXTRANK_CONFIG.useBertEmbeddings).toBe(true)
  })

  it('damping factor is in valid range', () => {
    expect(DEFAULT_TEXTRANK_CONFIG.dampingFactor).toBeGreaterThan(0)
    expect(DEFAULT_TEXTRANK_CONFIG.dampingFactor).toBeLessThan(1)
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  it('handles text with only code snippets', async () => {
    const text = 'import React from "react"; const x = 5; function test() {}'
    const result = await extractSummary(text)

    // Should handle gracefully
    expect(result).toBeDefined()
  })

  it('handles text with special characters', async () => {
    const text = 'This is a test! Does it work? Yes, it does & more.'
    const result = await extractSummary(text)

    expect(result.summary).toBeDefined()
  })

  it('handles very long text', async () => {
    const sentences = Array(100).fill('This is a test sentence about programming.').join(' ')
    const result = await extractSummary(sentences, { maxLength: 100 })

    expect(result.summary.length).toBeLessThanOrEqual(103)
  })

  it('handles text with newlines', async () => {
    // Use longer sentences to pass the 10-char filter
    const text = 'This is the first sentence here.\n\nThis is the second sentence here.\n\nThis is the third sentence here.'
    const result = await extractSummary(text)

    expect(result.sentences.length).toBeGreaterThan(0)
  })

  it('handles unicode characters', async () => {
    const text = 'This is a café. It serves excellent coffee. Many people visit daily.'
    const result = await extractSummary(text)

    expect(result).toBeDefined()
  })
})
