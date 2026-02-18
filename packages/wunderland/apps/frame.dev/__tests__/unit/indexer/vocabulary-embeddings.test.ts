/**
 * Vocabulary Embeddings Tests
 * @module __tests__/unit/indexer/vocabulary-embeddings.test
 *
 * Tests for vocabulary embeddings loading, caching, and similarity utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch for loading embeddings
const mockEmbeddingsData = {
  version: '1.0.0',
  generatedAt: '2025-01-01T00:00:00Z',
  model: 'MiniLM-L6-v2',
  dimensions: 384,
  embeddings: [
    {
      term: 'javascript',
      category: 'skill' as const,
      subcategory: 'programming-languages',
      embedding: [0.1, 0.2, 0.3, ...new Array(381).fill(0.01)],
      synonyms: ['js', 'ecmascript'],
      hypernyms: ['programming language'],
    },
    {
      term: 'typescript',
      category: 'skill' as const,
      subcategory: 'programming-languages',
      embedding: [0.15, 0.25, 0.35, ...new Array(381).fill(0.015)],
      synonyms: ['ts'],
      hypernyms: ['programming language'],
    },
    {
      term: 'react',
      category: 'skill' as const,
      subcategory: 'frameworks',
      embedding: [0.2, 0.3, 0.4, ...new Array(381).fill(0.02)],
      synonyms: ['reactjs'],
      hypernyms: ['framework'],
    },
    {
      term: 'technology',
      category: 'subject' as const,
      subcategory: 'technology',
      embedding: [0.5, 0.5, 0.5, ...new Array(381).fill(0.05)],
      synonyms: ['tech'],
      hypernyms: ['domain'],
    },
    {
      term: 'getting-started',
      category: 'topic' as const,
      subcategory: 'getting-started',
      embedding: [0.3, 0.3, 0.3, ...new Array(381).fill(0.03)],
      synonyms: ['tutorial', 'introduction'],
    },
    {
      term: 'beginner',
      category: 'difficulty' as const,
      subcategory: 'beginner',
      embedding: [0.4, 0.4, 0.4, ...new Array(381).fill(0.04)],
      synonyms: ['basic', 'starter'],
    },
    // Tags - lightweight, lowest-level keywords
    {
      term: 'api',
      category: 'tag' as const,
      subcategory: 'general',
      embedding: [0.35, 0.35, 0.35, ...new Array(381).fill(0.035)],
      synonyms: ['interface', 'endpoint'],
    },
    {
      term: 'async',
      category: 'tag' as const,
      subcategory: 'concepts',
      embedding: [0.45, 0.45, 0.45, ...new Array(381).fill(0.045)],
      synonyms: ['asynchronous', 'non-blocking'],
    },
  ],
  stats: {
    totalTerms: 8,
    subjects: 1,
    topics: 1,
    tags: 2,
    skills: 3,
    difficulty: 1,
    synonymExpansions: 14,
  },
}

// Store original fetch
const originalFetch = global.fetch

// Import after setting up globals (we'll mock in beforeEach)
import {
  loadVocabularyEmbeddings,
  getEmbeddingsByCategory,
  getEmbeddingsBySubcategory,
  findEmbeddingByTerm,
  findEmbeddingsBySynonym,
  clearEmbeddingsCache,
  areEmbeddingsLoaded,
  getEmbeddingStats,
  cosineSimilarity,
  findSimilarEmbeddings,
  type VocabularyEmbeddingsData,
  type VocabularyCategory,
} from '@/lib/indexer/vocabulary-embeddings'

describe('Vocabulary Embeddings', () => {
  beforeEach(() => {
    clearEmbeddingsCache()
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockEmbeddingsData),
    } as unknown as Response)
  })

  afterEach(() => {
    vi.clearAllMocks()
    global.fetch = originalFetch
    clearEmbeddingsCache()
  })

  // ============================================================================
  // LOADING
  // ============================================================================

  describe('Loading Embeddings', () => {
    it('loads embeddings from JSON file', async () => {
      const data = await loadVocabularyEmbeddings()

      expect(data).not.toBeNull()
      expect(data?.version).toBe('1.0.0')
      expect(data?.model).toBe('MiniLM-L6-v2')
    })

    it('fetches from /data/vocabulary-embeddings.json', async () => {
      await loadVocabularyEmbeddings()

      expect(global.fetch).toHaveBeenCalledWith('/data/vocabulary-embeddings.json')
    })

    it('caches loaded embeddings', async () => {
      await loadVocabularyEmbeddings()
      await loadVocabularyEmbeddings()
      await loadVocabularyEmbeddings()

      // Should only fetch once due to caching
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('returns cached data on subsequent calls', async () => {
      const data1 = await loadVocabularyEmbeddings()
      const data2 = await loadVocabularyEmbeddings()

      expect(data1).toBe(data2) // Same reference
    })

    it('returns null on fetch error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const data = await loadVocabularyEmbeddings()
      expect(data).toBeNull()
    })

    it('returns null on non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      } as Response)

      const data = await loadVocabularyEmbeddings()
      expect(data).toBeNull()
    })

    it('handles concurrent load requests', async () => {
      // Multiple simultaneous calls should only fetch once
      const [data1, data2, data3] = await Promise.all([
        loadVocabularyEmbeddings(),
        loadVocabularyEmbeddings(),
        loadVocabularyEmbeddings(),
      ])

      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(data1).toBe(data2)
      expect(data2).toBe(data3)
    })
  })

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  describe('Cache Management', () => {
    it('clearEmbeddingsCache clears cached data', async () => {
      await loadVocabularyEmbeddings()
      expect(areEmbeddingsLoaded()).toBe(true)

      clearEmbeddingsCache()
      expect(areEmbeddingsLoaded()).toBe(false)
    })

    it('areEmbeddingsLoaded returns correct status', async () => {
      expect(areEmbeddingsLoaded()).toBe(false)

      await loadVocabularyEmbeddings()
      expect(areEmbeddingsLoaded()).toBe(true)

      clearEmbeddingsCache()
      expect(areEmbeddingsLoaded()).toBe(false)
    })

    it('getEmbeddingStats returns null before loading', () => {
      const stats = getEmbeddingStats()
      expect(stats).toBeNull()
    })

    it('getEmbeddingStats returns stats after loading', async () => {
      await loadVocabularyEmbeddings()

      const stats = getEmbeddingStats()
      expect(stats).not.toBeNull()
      expect(stats?.totalTerms).toBe(8)
      expect(stats?.subjects).toBe(1)
      expect(stats?.topics).toBe(1)
      expect(stats?.tags).toBe(2)
      expect(stats?.skills).toBe(3)
      expect(stats?.difficulty).toBe(1)
    })
  })

  // ============================================================================
  // CATEGORY FILTERING
  // ============================================================================

  describe('Category Filtering', () => {
    let data: VocabularyEmbeddingsData

    beforeEach(async () => {
      const loaded = await loadVocabularyEmbeddings()
      if (!loaded) throw new Error('Failed to load embeddings')
      data = loaded
    })

    it('getEmbeddingsByCategory filters by category', () => {
      const skills = getEmbeddingsByCategory(data, 'skill')

      expect(skills.length).toBe(3) // javascript, typescript, react
      expect(skills.every(e => e.category === 'skill')).toBe(true)
    })

    it('getEmbeddingsByCategory filters tags (lightweight keywords)', () => {
      const tags = getEmbeddingsByCategory(data, 'tag')

      expect(tags.length).toBe(2) // api, async
      expect(tags.every(e => e.category === 'tag')).toBe(true)
      expect(tags.map(t => t.term)).toContain('api')
      expect(tags.map(t => t.term)).toContain('async')
    })

    it('returns empty array for category with no matches', () => {
      // Create data with no 'difficulty' category
      const limitedData = { ...data, embeddings: data.embeddings.filter(e => e.category !== 'difficulty') }
      const difficulty = getEmbeddingsByCategory(limitedData, 'difficulty')

      expect(difficulty).toEqual([])
    })

    it('getEmbeddingsBySubcategory filters by both category and subcategory', () => {
      const frameworks = getEmbeddingsBySubcategory(data, 'skill', 'frameworks')

      expect(frameworks.length).toBe(1)
      expect(frameworks[0].term).toBe('react')
    })

    it('returns all categories correctly', () => {
      const subjects = getEmbeddingsByCategory(data, 'subject')
      const topics = getEmbeddingsByCategory(data, 'topic')
      const tags = getEmbeddingsByCategory(data, 'tag')
      const skills = getEmbeddingsByCategory(data, 'skill')
      const difficulty = getEmbeddingsByCategory(data, 'difficulty')

      expect(subjects.length).toBe(1)
      expect(topics.length).toBe(1)
      expect(tags.length).toBe(2)
      expect(skills.length).toBe(3)
      expect(difficulty.length).toBe(1)
    })
  })

  // ============================================================================
  // TERM LOOKUP
  // ============================================================================

  describe('Term Lookup', () => {
    let data: VocabularyEmbeddingsData

    beforeEach(async () => {
      const loaded = await loadVocabularyEmbeddings()
      if (!loaded) throw new Error('Failed to load embeddings')
      data = loaded
    })

    it('findEmbeddingByTerm finds exact term match', () => {
      const embedding = findEmbeddingByTerm(data, 'javascript')

      expect(embedding).not.toBeUndefined()
      expect(embedding?.term).toBe('javascript')
      expect(embedding?.category).toBe('skill')
    })

    it('findEmbeddingByTerm is case-insensitive', () => {
      const lower = findEmbeddingByTerm(data, 'javascript')
      const upper = findEmbeddingByTerm(data, 'JAVASCRIPT')
      const mixed = findEmbeddingByTerm(data, 'JavaScript')

      expect(lower).toEqual(upper)
      expect(upper).toEqual(mixed)
    })

    it('findEmbeddingByTerm trims whitespace', () => {
      const normal = findEmbeddingByTerm(data, 'react')
      const padded = findEmbeddingByTerm(data, '  react  ')

      expect(normal).toEqual(padded)
    })

    it('findEmbeddingByTerm returns undefined for unknown term', () => {
      const embedding = findEmbeddingByTerm(data, 'unknown-term-xyz')
      expect(embedding).toBeUndefined()
    })
  })

  // ============================================================================
  // SYNONYM LOOKUP
  // ============================================================================

  describe('Synonym Lookup', () => {
    let data: VocabularyEmbeddingsData

    beforeEach(async () => {
      const loaded = await loadVocabularyEmbeddings()
      if (!loaded) throw new Error('Failed to load embeddings')
      data = loaded
    })

    it('findEmbeddingsBySynonym finds terms with matching synonym', () => {
      const matches = findEmbeddingsBySynonym(data, 'js')

      expect(matches.length).toBe(1)
      expect(matches[0].term).toBe('javascript')
    })

    it('findEmbeddingsBySynonym is case-insensitive', () => {
      const lower = findEmbeddingsBySynonym(data, 'js')
      const upper = findEmbeddingsBySynonym(data, 'JS')

      expect(lower.length).toEqual(upper.length)
    })

    it('findEmbeddingsBySynonym returns empty array for no matches', () => {
      const matches = findEmbeddingsBySynonym(data, 'nonexistent-synonym')
      expect(matches).toEqual([])
    })

    it('handles terms without synonyms', () => {
      // All our mock data has synonyms, but verify it doesn't crash
      const matches = findEmbeddingsBySynonym(data, 'tutorial')
      expect(matches.length).toBeGreaterThanOrEqual(0)
    })
  })

  // ============================================================================
  // COSINE SIMILARITY
  // ============================================================================

  describe('Cosine Similarity', () => {
    it('returns 1 for identical vectors', () => {
      const v = [1, 2, 3, 4, 5]
      const similarity = cosineSimilarity(v, v)
      expect(similarity).toBeCloseTo(1, 5)
    })

    it('returns 0 for orthogonal vectors', () => {
      const v1 = [1, 0, 0]
      const v2 = [0, 1, 0]
      const similarity = cosineSimilarity(v1, v2)
      expect(similarity).toBeCloseTo(0, 5)
    })

    it('returns -1 for opposite vectors', () => {
      const v1 = [1, 2, 3]
      const v2 = [-1, -2, -3]
      const similarity = cosineSimilarity(v1, v2)
      expect(similarity).toBeCloseTo(-1, 5)
    })

    it('handles positive values correctly', () => {
      const v1 = [1, 1, 1]
      const v2 = [2, 2, 2]
      const similarity = cosineSimilarity(v1, v2)
      expect(similarity).toBeCloseTo(1, 5) // Same direction
    })

    it('handles zero vectors', () => {
      const v1 = [0, 0, 0]
      const v2 = [1, 2, 3]
      const similarity = cosineSimilarity(v1, v2)
      expect(similarity).toBe(0)
    })

    it('throws on dimension mismatch', () => {
      const v1 = [1, 2, 3]
      const v2 = [1, 2]
      expect(() => cosineSimilarity(v1, v2)).toThrow('Vector dimension mismatch')
    })

    it('handles 384-dimensional vectors', () => {
      const v1 = new Array(384).fill(0.1)
      const v2 = new Array(384).fill(0.1)
      const similarity = cosineSimilarity(v1, v2)
      expect(similarity).toBeCloseTo(1, 5)
    })

    it('computes correct similarity for realistic embeddings', () => {
      const v1 = [0.1, 0.2, 0.3, 0.4, 0.5]
      const v2 = [0.15, 0.25, 0.35, 0.45, 0.55]
      const similarity = cosineSimilarity(v1, v2)
      expect(similarity).toBeGreaterThan(0.99) // Very similar vectors
    })
  })

  // ============================================================================
  // FIND SIMILAR EMBEDDINGS
  // ============================================================================

  describe('Find Similar Embeddings', () => {
    let data: VocabularyEmbeddingsData

    beforeEach(async () => {
      const loaded = await loadVocabularyEmbeddings()
      if (!loaded) throw new Error('Failed to load embeddings')
      data = loaded
    })

    it('finds similar embeddings by query vector', () => {
      const queryEmbedding = data.embeddings[0].embedding // javascript embedding
      const similar = findSimilarEmbeddings(data, queryEmbedding)

      expect(similar.length).toBeGreaterThan(0)
      expect(similar[0].term).toBe('javascript') // Most similar to itself
    })

    it('returns scored terms with all properties', () => {
      const queryEmbedding = data.embeddings[0].embedding
      const similar = findSimilarEmbeddings(data, queryEmbedding)

      if (similar.length > 0) {
        expect(similar[0]).toHaveProperty('term')
        expect(similar[0]).toHaveProperty('category')
        expect(similar[0]).toHaveProperty('subcategory')
        expect(similar[0]).toHaveProperty('score')
        expect(similar[0]).toHaveProperty('matchType', 'embedding')
      }
    })

    it('filters by category', () => {
      const queryEmbedding = new Array(384).fill(0.1)
      const similar = findSimilarEmbeddings(data, queryEmbedding, {
        category: 'skill',
      })

      expect(similar.every(s => s.category === 'skill')).toBe(true)
    })

    it('filters by subcategory', () => {
      const queryEmbedding = new Array(384).fill(0.1)
      const similar = findSimilarEmbeddings(data, queryEmbedding, {
        category: 'skill',
        subcategory: 'frameworks',
      })

      expect(similar.every(s => s.subcategory === 'frameworks')).toBe(true)
    })

    it('respects limit parameter', () => {
      const queryEmbedding = new Array(384).fill(0.1)
      const similar = findSimilarEmbeddings(data, queryEmbedding, {
        limit: 2,
      })

      expect(similar.length).toBeLessThanOrEqual(2)
    })

    it('filters by minScore', () => {
      const queryEmbedding = new Array(384).fill(0.5)
      const similar = findSimilarEmbeddings(data, queryEmbedding, {
        minScore: 0.8,
      })

      similar.forEach(s => {
        expect(s.score).toBeGreaterThanOrEqual(0.8)
      })
    })

    it('sorts results by score descending', () => {
      const queryEmbedding = new Array(384).fill(0.1)
      const similar = findSimilarEmbeddings(data, queryEmbedding, {
        minScore: 0,
      })

      for (let i = 1; i < similar.length; i++) {
        expect(similar[i - 1].score).toBeGreaterThanOrEqual(similar[i].score)
      }
    })

    it('handles empty candidates', () => {
      const queryEmbedding = new Array(384).fill(0.1)
      const similar = findSimilarEmbeddings(data, queryEmbedding, {
        category: 'subject',
        subcategory: 'nonexistent',
      })

      expect(similar).toEqual([])
    })

    it('uses default options when not specified', () => {
      const queryEmbedding = data.embeddings[0].embedding
      const similar = findSimilarEmbeddings(data, queryEmbedding)

      expect(similar.length).toBeLessThanOrEqual(10) // default limit
    })
  })

  // ============================================================================
  // DATA STRUCTURE
  // ============================================================================

  describe('Data Structure', () => {
    let data: VocabularyEmbeddingsData

    beforeEach(async () => {
      const loaded = await loadVocabularyEmbeddings()
      if (!loaded) throw new Error('Failed to load embeddings')
      data = loaded
    })

    it('has correct version', () => {
      expect(data.version).toBe('1.0.0')
    })

    it('has correct model name', () => {
      expect(data.model).toBe('MiniLM-L6-v2')
    })

    it('has correct dimensions', () => {
      expect(data.dimensions).toBe(384)
    })

    it('has generatedAt timestamp', () => {
      expect(data.generatedAt).toBeDefined()
      expect(typeof data.generatedAt).toBe('string')
    })

    it('embeddings have correct structure', () => {
      data.embeddings.forEach(embedding => {
        expect(embedding).toHaveProperty('term')
        expect(embedding).toHaveProperty('category')
        expect(embedding).toHaveProperty('subcategory')
        expect(embedding).toHaveProperty('embedding')
        expect(embedding.embedding.length).toBe(384)
      })
    })

    it('stats match embeddings count', () => {
      expect(data.stats.totalTerms).toBe(data.embeddings.length)
    })

    it('category counts are consistent', () => {
      const subjects = data.embeddings.filter(e => e.category === 'subject').length
      const topics = data.embeddings.filter(e => e.category === 'topic').length
      const tags = data.embeddings.filter(e => e.category === 'tag').length
      const skills = data.embeddings.filter(e => e.category === 'skill').length
      const difficulty = data.embeddings.filter(e => e.category === 'difficulty').length

      expect(data.stats.subjects).toBe(subjects)
      expect(data.stats.topics).toBe(topics)
      expect(data.stats.tags).toBe(tags)
      expect(data.stats.skills).toBe(skills)
      expect(data.stats.difficulty).toBe(difficulty)
    })
  })
})
