/**
 * BM25 Search Engine Tests
 * @module __tests__/unit/lib/search/bm25.test
 *
 * Tests for BM25 text search algorithm implementation.
 */

import { describe, it, expect } from 'vitest'
import { BM25Engine } from '@/lib/search/bm25'
import type { CodexSearchIndex, CodexSearchDoc } from '@/lib/search/types'

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockDoc(overrides: Partial<CodexSearchDoc> & { path: string }): CodexSearchDoc {
  return {
    title: 'Test Document',
    summary: 'Test summary',
    docLength: 100,
    ...overrides,
  }
}

function createMockIndex(overrides: Partial<CodexSearchIndex> = {}): CodexSearchIndex {
  return {
    generatedAt: new Date().toISOString(),
    stats: {
      totalDocs: 3,
      avgDocLength: 100,
      vocabularySize: 10,
    },
    docs: [
      createMockDoc({ path: 'doc1', title: 'Introduction to JavaScript', summary: 'Learn JavaScript basics' }),
      createMockDoc({ path: 'doc2', title: 'Advanced TypeScript', summary: 'TypeScript advanced patterns' }),
      createMockDoc({ path: 'doc3', title: 'React Components', summary: 'Building React components' }),
    ],
    vocabulary: {
      javascript: [[0, 2]], // doc 0, term frequency 2
      introduction: [[0, 1]],
      learn: [[0, 1]],
      basics: [[0, 1]],
      typescript: [[1, 3]], // doc 1, term frequency 3
      advanced: [[1, 2]],
      patterns: [[1, 1]],
      react: [[2, 2]], // doc 2, term frequency 2
      components: [[2, 3]],
      building: [[2, 1]],
    },
    embeddings: {
      size: 0,
      data: '',
    },
    ...overrides,
  }
}

// ============================================================================
// BM25Engine Constructor
// ============================================================================

describe('BM25Engine', () => {
  describe('constructor', () => {
    it('creates engine with default parameters', () => {
      const index = createMockIndex()
      const engine = new BM25Engine(index)

      expect(engine).toBeDefined()
    })

    it('creates engine with custom k1 and b parameters', () => {
      const index = createMockIndex()
      const engine = new BM25Engine(index, 1.2, 0.5)

      expect(engine).toBeDefined()
    })

    it('handles empty index', () => {
      const index = createMockIndex({
        docs: [],
        vocabulary: {},
        stats: { totalDocs: 0, avgDocLength: 0, vocabularySize: 0 },
      })
      const engine = new BM25Engine(index)

      expect(engine).toBeDefined()
    })
  })

  // ============================================================================
  // search() Basic Functionality
  // ============================================================================

  describe('search', () => {
    describe('basic search', () => {
      it('finds matching documents', () => {
        const index = createMockIndex()
        const engine = new BM25Engine(index)

        const results = engine.search('javascript')

        expect(results.length).toBe(1)
        expect(results[0].path).toBe('doc1')
      })

      it('returns results with required fields', () => {
        const index = createMockIndex()
        const engine = new BM25Engine(index)

        const results = engine.search('javascript')

        expect(results[0].docId).toBeDefined()
        expect(results[0].path).toBeDefined()
        expect(results[0].title).toBeDefined()
        expect(results[0].summary).toBeDefined()
        expect(results[0].bm25Score).toBeDefined()
        expect(results[0].combinedScore).toBeDefined()
      })

      it('returns positive scores', () => {
        const index = createMockIndex()
        const engine = new BM25Engine(index)

        const results = engine.search('typescript')

        expect(results[0].bm25Score).toBeGreaterThan(0)
        expect(results[0].combinedScore).toBeGreaterThan(0)
      })

      it('finds multiple terms in query', () => {
        const index = createMockIndex({
          vocabulary: {
            javascript: [[0, 2], [1, 1]], // Both doc 0 and doc 1
            typescript: [[1, 3]],
          },
        })
        const engine = new BM25Engine(index)

        const results = engine.search('javascript typescript')

        expect(results.length).toBeGreaterThan(0)
      })
    })

    // ============================================================================
    // search() Empty and No Results
    // ============================================================================

    describe('empty queries', () => {
      it('returns empty array for empty query', () => {
        const index = createMockIndex()
        const engine = new BM25Engine(index)

        const results = engine.search('')

        expect(results).toEqual([])
      })

      it('returns empty array for whitespace-only query', () => {
        const index = createMockIndex()
        const engine = new BM25Engine(index)

        const results = engine.search('   ')

        expect(results).toEqual([])
      })

      it('returns empty array for query with only stop words', () => {
        const index = createMockIndex()
        const engine = new BM25Engine(index)

        // "the", "a", "is", "in" are stop words
        const results = engine.search('the a is in')

        expect(results).toEqual([])
      })

      it('returns empty array for query with only short words', () => {
        const index = createMockIndex()
        const engine = new BM25Engine(index)

        // Words <= 2 characters are filtered out
        const results = engine.search('a b c')

        expect(results).toEqual([])
      })
    })

    describe('no matches', () => {
      it('returns empty array when no terms match', () => {
        const index = createMockIndex()
        const engine = new BM25Engine(index)

        const results = engine.search('python django flask')

        expect(results).toEqual([])
      })
    })

    // ============================================================================
    // search() Query Processing
    // ============================================================================

    describe('query processing', () => {
      it('is case insensitive', () => {
        const index = createMockIndex()
        const engine = new BM25Engine(index)

        const lowerResults = engine.search('javascript')
        const upperResults = engine.search('JAVASCRIPT')
        const mixedResults = engine.search('JavaScript')

        expect(lowerResults).toEqual(upperResults)
        expect(lowerResults).toEqual(mixedResults)
      })

      it('handles punctuation', () => {
        const index = createMockIndex()
        const engine = new BM25Engine(index)

        const plainResults = engine.search('javascript')
        const punctuatedResults = engine.search('javascript!')
        const quotedResults = engine.search('"javascript"')

        expect(plainResults.length).toBe(punctuatedResults.length)
        expect(plainResults.length).toBe(quotedResults.length)
      })

      it('filters out stop words', () => {
        const index = createMockIndex()
        const engine = new BM25Engine(index)

        // "the" is a stop word, "javascript" is not
        const results = engine.search('the javascript')

        expect(results.length).toBe(1)
        expect(results[0].path).toBe('doc1')
      })

      it('filters out short words', () => {
        const index = createMockIndex()
        const engine = new BM25Engine(index)

        // "a", "to" are filtered (length <= 2)
        const results = engine.search('a to javascript')

        expect(results.length).toBe(1)
      })
    })

    // ============================================================================
    // search() Scoring
    // ============================================================================

    describe('scoring', () => {
      it('higher term frequency gives higher score', () => {
        const index = createMockIndex({
          vocabulary: {
            test: [
              [0, 1], // doc 0 has TF=1
              [1, 5], // doc 1 has TF=5
            ],
          },
        })
        const engine = new BM25Engine(index)

        const results = engine.search('test')

        expect(results[0].docId).toBe(1) // Higher TF should rank first
        expect(results[0].bm25Score).toBeGreaterThan(results[1].bm25Score)
      })

      it('sorts results by score descending', () => {
        const index = createMockIndex({
          vocabulary: {
            programming: [
              [0, 1],
              [1, 3],
              [2, 2],
            ],
          },
        })
        const engine = new BM25Engine(index)

        const results = engine.search('programming')

        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].bm25Score).toBeGreaterThanOrEqual(results[i + 1].bm25Score)
        }
      })

      it('combinedScore equals bm25Score', () => {
        const index = createMockIndex()
        const engine = new BM25Engine(index)

        const results = engine.search('javascript')

        expect(results[0].bm25Score).toBe(results[0].combinedScore)
      })

      it('accumulates scores for multiple matching terms', () => {
        const index = createMockIndex({
          docs: [
            createMockDoc({ path: 'doc1', title: 'Test', summary: 'Test' }),
          ],
          vocabulary: {
            react: [[0, 2]],
            components: [[0, 1]],
          },
          stats: { totalDocs: 1, avgDocLength: 100, vocabularySize: 2 },
        })
        const engine = new BM25Engine(index)

        const singleTermResults = engine.search('react')
        const multiTermResults = engine.search('react components')

        expect(multiTermResults[0].bm25Score).toBeGreaterThan(singleTermResults[0].bm25Score)
      })
    })

    // ============================================================================
    // search() Options
    // ============================================================================

    describe('options', () => {
      it('respects limit option', () => {
        const index = createMockIndex({
          docs: Array.from({ length: 10 }, (_, i) =>
            createMockDoc({ path: `doc${i}`, title: `Doc ${i}`, summary: `Summary ${i}` })
          ),
          vocabulary: {
            test: Array.from({ length: 10 }, (_, i) => [i, 1] as [number, number]),
          },
          stats: { totalDocs: 10, avgDocLength: 100, vocabularySize: 1 },
        })
        const engine = new BM25Engine(index)

        const results = engine.search('test', { limit: 5 })

        expect(results.length).toBe(5)
      })

      it('uses default limit of 20', () => {
        const index = createMockIndex({
          docs: Array.from({ length: 30 }, (_, i) =>
            createMockDoc({ path: `doc${i}`, title: `Doc ${i}`, summary: `Summary ${i}` })
          ),
          vocabulary: {
            test: Array.from({ length: 30 }, (_, i) => [i, 1] as [number, number]),
          },
          stats: { totalDocs: 30, avgDocLength: 100, vocabularySize: 1 },
        })
        const engine = new BM25Engine(index)

        const results = engine.search('test')

        expect(results.length).toBe(20)
      })

      it('returns all results if fewer than limit', () => {
        const index = createMockIndex()
        const engine = new BM25Engine(index)

        const results = engine.search('javascript', { limit: 100 })

        expect(results.length).toBe(1)
      })
    })

    // ============================================================================
    // search() Document Fields
    // ============================================================================

    describe('document fields', () => {
      it('includes weave in results', () => {
        const index = createMockIndex({
          docs: [
            createMockDoc({ path: 'doc1', title: 'Test', summary: 'Test', weave: 'wiki' }),
          ],
          vocabulary: {
            test: [[0, 1]],
          },
          stats: { totalDocs: 1, avgDocLength: 100, vocabularySize: 1 },
        })
        const engine = new BM25Engine(index)

        const results = engine.search('test')

        expect(results[0].weave).toBe('wiki')
      })

      it('includes loom in results', () => {
        const index = createMockIndex({
          docs: [
            createMockDoc({ path: 'doc1', title: 'Test', summary: 'Test', loom: 'introduction' }),
          ],
          vocabulary: {
            test: [[0, 1]],
          },
          stats: { totalDocs: 1, avgDocLength: 100, vocabularySize: 1 },
        })
        const engine = new BM25Engine(index)

        const results = engine.search('test')

        expect(results[0].loom).toBe('introduction')
      })

      it('preserves original title and summary', () => {
        const index = createMockIndex()
        const engine = new BM25Engine(index)

        const results = engine.search('javascript')

        expect(results[0].title).toBe('Introduction to JavaScript')
        expect(results[0].summary).toBe('Learn JavaScript basics')
      })
    })

    // ============================================================================
    // search() Edge Cases
    // ============================================================================

    describe('edge cases', () => {
      it('handles document with zero length', () => {
        const index = createMockIndex({
          docs: [
            createMockDoc({ path: 'doc1', title: 'Test', summary: 'Test', docLength: 0 }),
          ],
          vocabulary: {
            test: [[0, 1]],
          },
          stats: { totalDocs: 1, avgDocLength: 100, vocabularySize: 1 },
        })
        const engine = new BM25Engine(index)

        const results = engine.search('test')

        expect(results.length).toBe(1)
        expect(results[0].bm25Score).toBeGreaterThan(0)
      })

      it('handles index with zero avgDocLength', () => {
        const index = createMockIndex({
          stats: { totalDocs: 1, avgDocLength: 0, vocabularySize: 1 },
        })
        const engine = new BM25Engine(index)

        const results = engine.search('javascript')

        expect(results.length).toBe(1)
      })

      it('handles very long queries', () => {
        const index = createMockIndex()
        const engine = new BM25Engine(index)

        const longQuery = 'javascript '.repeat(100)
        const results = engine.search(longQuery)

        expect(results.length).toBe(1)
      })

      it('handles special characters in query', () => {
        const index = createMockIndex()
        const engine = new BM25Engine(index)

        const results = engine.search('javascript@#$%^&*()')

        expect(results.length).toBe(1)
      })

      it('handles unicode in query', () => {
        const index = createMockIndex()
        const engine = new BM25Engine(index)

        // Should still find "javascript" even with unicode
        const results = engine.search('javascript 日本語')

        expect(results.length).toBe(1)
      })
    })
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('BM25Engine integration', () => {
  it('performs realistic search scenario', () => {
    const index: CodexSearchIndex = {
      generatedAt: new Date().toISOString(),
      stats: {
        totalDocs: 5,
        avgDocLength: 150,
        vocabularySize: 20,
      },
      docs: [
        createMockDoc({
          path: 'getting-started',
          title: 'Getting Started Guide',
          summary: 'Learn how to get started with our application',
          docLength: 200,
        }),
        createMockDoc({
          path: 'api-reference',
          title: 'API Reference',
          summary: 'Complete API documentation and reference',
          docLength: 500,
        }),
        createMockDoc({
          path: 'tutorials/basics',
          title: 'Basic Tutorials',
          summary: 'Step by step tutorials for beginners',
          docLength: 300,
        }),
        createMockDoc({
          path: 'tutorials/advanced',
          title: 'Advanced Tutorials',
          summary: 'Advanced patterns and techniques',
          docLength: 400,
        }),
        createMockDoc({
          path: 'faq',
          title: 'Frequently Asked Questions',
          summary: 'Common questions and answers',
          docLength: 100,
        }),
      ],
      vocabulary: {
        getting: [[0, 2]],
        started: [[0, 3]],
        guide: [[0, 1]],
        application: [[0, 1]],
        reference: [[1, 4]],
        documentation: [[1, 2]],
        complete: [[1, 1]],
        tutorials: [[2, 3], [3, 2]],
        basics: [[2, 2]],
        beginners: [[2, 1]],
        step: [[2, 2]],
        advanced: [[3, 4]],
        patterns: [[3, 2]],
        techniques: [[3, 1]],
        questions: [[4, 3]],
        answers: [[4, 2]],
        common: [[4, 1]],
      },
      embeddings: { size: 0, data: '' },
    }

    const engine = new BM25Engine(index)

    // Search for tutorials
    const tutorialResults = engine.search('tutorials')
    expect(tutorialResults.length).toBe(2)
    expect(tutorialResults.map((r) => r.path)).toContain('tutorials/basics')
    expect(tutorialResults.map((r) => r.path)).toContain('tutorials/advanced')

    // Search for API docs
    const apiResults = engine.search('reference documentation')
    expect(apiResults[0].path).toBe('api-reference')

    // Search for getting started
    const startResults = engine.search('getting started')
    expect(startResults[0].path).toBe('getting-started')

    // Search for advanced content
    const advancedResults = engine.search('advanced patterns')
    expect(advancedResults[0].path).toBe('tutorials/advanced')
  })
})
