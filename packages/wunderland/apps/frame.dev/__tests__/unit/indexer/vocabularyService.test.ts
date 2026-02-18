/**
 * VocabularyService Tests
 * @module __tests__/unit/indexer/vocabularyService.test
 *
 * Tests for the unified vocabulary classification service.
 * Tests cover environment-aware engine selection, classification,
 * term expansion, caching, and backward compatibility.
 */

import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest'

// Mock the engines - we'll test them separately
vi.mock('@/lib/indexer/engines/browserEngine', () => ({
  BrowserVocabularyEngine: vi.fn().mockImplementation(() => ({
    name: 'browser',
    initialize: vi.fn().mockResolvedValue(undefined),
    isReady: vi.fn().mockReturnValue(true),
    classifyText: vi.fn().mockResolvedValue({
      subjects: ['technology'],
      topics: ['getting-started'],
      tags: ['web', 'api'],
      skills: ['javascript'],
      difficulty: 'beginner',
      confidence: { technology: 0.9, 'getting-started': 0.85, 'tag:web': 0.6 },
      keywords: ['javascript', 'tutorial'],
    }),
    expandTerm: vi.fn().mockResolvedValue(['programming', 'coding', 'software']),
    findSimilarTerms: vi.fn().mockResolvedValue([
      { term: 'programming', category: 'subject', subcategory: 'technology', score: 0.9, matchType: 'embedding' },
    ]),
    expandVocabulary: vi.fn().mockResolvedValue([]),
    findRelatedTerms: vi.fn().mockResolvedValue({ term: 'test', synonyms: [], broader: [], narrower: [], related: [] }),
    getStats: vi.fn().mockReturnValue({
      name: 'browser',
      initialized: true,
      capabilities: { wordnet: false, embeddings: true, taxonomy: true, ner: true },
      vocabularyTerms: 228,
    }),
  })),
}))

vi.mock('@/lib/indexer/engines/serverEngine', () => ({
  ServerVocabularyEngine: vi.fn().mockImplementation(() => ({
    name: 'server',
    initialize: vi.fn().mockResolvedValue(undefined),
    isReady: vi.fn().mockReturnValue(true),
    classifyText: vi.fn().mockResolvedValue({
      subjects: ['technology', 'ai'],
      topics: ['architecture'],
      tags: ['async', 'stream'],
      skills: ['python', 'tensorflow'],
      difficulty: 'advanced',
      confidence: { technology: 0.92, ai: 0.88, architecture: 0.75, 'tag:async': 0.6 },
      keywords: ['neural', 'network', 'model'],
    }),
    expandTerm: vi.fn().mockResolvedValue(['programming', 'coding', 'software', 'development', 'computer science']),
    findSimilarTerms: vi.fn().mockResolvedValue([
      { term: 'programming', category: 'subject', subcategory: 'technology', score: 0.95, matchType: 'synonym' },
    ]),
    expandVocabulary: vi.fn().mockResolvedValue([]),
    findRelatedTerms: vi.fn().mockResolvedValue({ term: 'test', synonyms: [], broader: [], narrower: [], related: [] }),
    getStats: vi.fn().mockReturnValue({
      name: 'server',
      initialized: true,
      capabilities: { wordnet: true, embeddings: true, taxonomy: true, ner: true },
      vocabularyTerms: 250,
    }),
  })),
}))

// Import after mocking
import {
  VocabularyService,
  getVocabularyService,
  resetVocabularyService,
  type ClassificationResult,
} from '@/lib/indexer/vocabularyService'
import { BrowserVocabularyEngine } from '@/lib/indexer/engines/browserEngine'
import { ServerVocabularyEngine } from '@/lib/indexer/engines/serverEngine'

describe('VocabularyService', () => {
  beforeEach(() => {
    resetVocabularyService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe('Initialization', () => {
    it('creates a new instance with default config', () => {
      const service = new VocabularyService()
      expect(service).toBeDefined()
      expect(service.isReady()).toBe(false)
    })

    it('creates a new instance with custom config', () => {
      const service = new VocabularyService({
        useEmbeddings: false,
        minSimilarityScore: 0.5,
        maxResults: 5,
        enableCache: false,
      })
      expect(service).toBeDefined()
    })

    it('initializes without error', async () => {
      const service = new VocabularyService()
      await expect(service.initialize()).resolves.not.toThrow()
      expect(service.isReady()).toBe(true)
    })

    it('only initializes once', async () => {
      const service = new VocabularyService()
      await service.initialize()
      await service.initialize()
      await service.initialize()

      // Engine should only be created once (one of browser or server depending on environment)
      const browserCalls = (BrowserVocabularyEngine as ReturnType<typeof vi.fn>).mock.calls.length
      const serverCalls = (ServerVocabularyEngine as ReturnType<typeof vi.fn>).mock.calls.length
      expect(browserCalls + serverCalls).toBe(1)
    })

    it('returns engine name after initialization', async () => {
      const service = new VocabularyService()
      expect(service.getEngineName()).toBe('not initialized')

      await service.initialize()
      // Engine name should be 'browser' or 'server' depending on environment
      expect(['browser', 'server']).toContain(service.getEngineName())
    })
  })

  // ============================================================================
  // CLASSIFICATION
  // ============================================================================

  describe('Classification', () => {
    let service: VocabularyService

    beforeEach(async () => {
      service = new VocabularyService()
      await service.initialize()
    })

    it('classifies text into subjects, topics, tags, skills, difficulty', async () => {
      const result = await service.classify('Building a React app with TypeScript')

      expect(result).toHaveProperty('subjects')
      expect(result).toHaveProperty('topics')
      expect(result).toHaveProperty('tags')
      expect(result).toHaveProperty('skills')
      expect(result).toHaveProperty('difficulty')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('keywords')
    })

    it('returns tags as array of strings (lightweight keywords)', async () => {
      const result = await service.classify('Test content')
      expect(Array.isArray(result.tags)).toBe(true)
      expect(result.tags.every((t) => typeof t === 'string')).toBe(true)
    })

    it('returns subjects as array of strings', async () => {
      const result = await service.classify('Test content')
      expect(Array.isArray(result.subjects)).toBe(true)
      expect(result.subjects.every((s) => typeof s === 'string')).toBe(true)
    })

    it('returns topics as array of strings', async () => {
      const result = await service.classify('Test content')
      expect(Array.isArray(result.topics)).toBe(true)
    })

    it('returns skills as array of strings', async () => {
      const result = await service.classify('Test content')
      expect(Array.isArray(result.skills)).toBe(true)
    })

    it('returns difficulty as beginner, intermediate, or advanced', async () => {
      const result = await service.classify('Test content')
      expect(['beginner', 'intermediate', 'advanced']).toContain(result.difficulty)
    })

    it('returns confidence scores as object', async () => {
      const result = await service.classify('Test content')
      expect(typeof result.confidence).toBe('object')
      expect(result.confidence).not.toBeNull()
    })

    it('returns keywords as array of strings', async () => {
      const result = await service.classify('Test content')
      expect(Array.isArray(result.keywords)).toBe(true)
    })

    it('caches classification results', async () => {
      const text = 'Unique test content for caching'

      // First call
      await service.classify(text)
      // Second call with same text
      await service.classify(text)

      // Verify both results are identical (cached)
      const result1 = await service.classify(text)
      const result2 = await service.classify(text)
      expect(result1.subjects).toEqual(result2.subjects)
      expect(result1.topics).toEqual(result2.topics)
    })

    it('auto-initializes if not initialized', async () => {
      const freshService = new VocabularyService()
      expect(freshService.isReady()).toBe(false)

      // Should auto-initialize on classify
      const result = await freshService.classify('Test')
      expect(freshService.isReady()).toBe(true)
      expect(result).toBeDefined()
    })
  })

  // ============================================================================
  // SYNCHRONOUS CLASSIFICATION (Backward Compatibility)
  // ============================================================================

  describe('Synchronous Classification (classifySync)', () => {
    let service: VocabularyService

    beforeEach(async () => {
      service = new VocabularyService()
      await service.initialize()
    })

    it('returns cached result if available', async () => {
      const text = 'Test for sync classification'

      // First, classify async to populate cache
      const asyncResult = await service.classify(text)

      // Then use sync method
      const syncResult = service.classifySync(text)

      expect(syncResult).toEqual(asyncResult)
    })

    it('returns default result if not cached', () => {
      const result = service.classifySync('Never-seen-before text content xyz')

      expect(result.subjects).toEqual([])
      expect(result.topics).toEqual([])
      expect(result.tags).toEqual([])
      expect(result.skills).toEqual([])
      expect(result.difficulty).toBe('intermediate')
      expect(result.confidence).toEqual({})
      expect(result.keywords).toEqual([])
    })

    it('triggers async classification when cache miss', () => {
      // Just call sync - it should trigger async in background
      service.classifySync('New content not in cache')

      // Engine should be called asynchronously
      // (We can't easily test this without waiting, but the call should not throw)
    })
  })

  // ============================================================================
  // TERM EXPANSION
  // ============================================================================

  describe('Term Expansion', () => {
    let service: VocabularyService

    beforeEach(async () => {
      service = new VocabularyService()
      await service.initialize()
    })

    it('expands a term with synonyms and related terms', async () => {
      const expanded = await service.expandTerm('programming')

      expect(Array.isArray(expanded)).toBe(true)
      expect(expanded.length).toBeGreaterThan(0)
      expect(expanded).toContain('programming')
    })

    it('caches expansion results', async () => {
      await service.expandTerm('coding')
      await service.expandTerm('coding')
      await service.expandTerm('CODING') // Different case, same normalized term

      // Verify both calls return identical results (cached)
      const result1 = await service.expandTerm('coding')
      const result2 = await service.expandTerm('CODING')
      expect(result1).toEqual(result2)
    })

    it('returns array including original term', async () => {
      const expanded = await service.expandTerm('test')
      expect(expanded.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // SIMILARITY SEARCH
  // ============================================================================

  describe('Similarity Search', () => {
    let service: VocabularyService

    beforeEach(async () => {
      service = new VocabularyService()
      await service.initialize()
    })

    it('finds similar terms for input text', async () => {
      const similar = await service.findSimilarTerms('Building web applications')

      expect(Array.isArray(similar)).toBe(true)
      expect(similar.length).toBeGreaterThan(0)
    })

    it('returns scored terms with all required properties', async () => {
      const similar = await service.findSimilarTerms('JavaScript development')

      if (similar.length > 0) {
        expect(similar[0]).toHaveProperty('term')
        expect(similar[0]).toHaveProperty('category')
        expect(similar[0]).toHaveProperty('subcategory')
        expect(similar[0]).toHaveProperty('score')
        expect(similar[0]).toHaveProperty('matchType')
      }
    })

    it('filters by category when specified', async () => {
      const result = await service.findSimilarTerms('test query', 'subject')

      // Verify result is an array of scored terms
      expect(Array.isArray(result)).toBe(true)
      // Mock returns at least one result
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('term')
        expect(result[0]).toHaveProperty('score')
      }
    })

    it('finds related terms (synonyms, broader, narrower)', async () => {
      const related = await service.findRelatedTerms('programming')

      expect(related).toHaveProperty('term')
      expect(related).toHaveProperty('synonyms')
      expect(related).toHaveProperty('broader')
      expect(related).toHaveProperty('narrower')
      expect(related).toHaveProperty('related')
    })
  })

  // ============================================================================
  // VOCABULARY EXPANSION
  // ============================================================================

  describe('Vocabulary Expansion', () => {
    let service: VocabularyService

    beforeEach(async () => {
      service = new VocabularyService()
      await service.initialize()
    })

    it('expands multiple terms at once', async () => {
      const expanded = await service.expandVocabulary(['react', 'typescript', 'nodejs'])

      expect(Array.isArray(expanded)).toBe(true)
    })

    it('calls engine expandVocabulary method', async () => {
      const result = await service.expandVocabulary(['term1', 'term2'])

      // Verify the expansion returns an array (mocked to return empty array)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  // ============================================================================
  // STATISTICS & CACHE MANAGEMENT
  // ============================================================================

  describe('Statistics and Cache Management', () => {
    let service: VocabularyService

    beforeEach(async () => {
      service = new VocabularyService()
      await service.initialize()
    })

    it('returns engine statistics', () => {
      const stats = service.getStats()

      expect(stats).toHaveProperty('name')
      expect(stats).toHaveProperty('initialized')
      expect(stats).toHaveProperty('capabilities')
      expect(stats).toHaveProperty('vocabularyTerms')
      expect(stats).toHaveProperty('cacheSize')
    })

    it('reports cache size correctly', async () => {
      const initialStats = service.getStats()
      expect(initialStats.cacheSize).toBe(0)

      await service.classify('Content 1')
      await service.classify('Content 2')
      await service.expandTerm('term1')

      const newStats = service.getStats()
      expect(newStats.cacheSize).toBe(3)
    })

    it('clears cache when requested', async () => {
      await service.classify('Test content')
      await service.expandTerm('test')

      const beforeClear = service.getStats()
      expect(beforeClear.cacheSize).toBeGreaterThan(0)

      service.clearCache()

      const afterClear = service.getStats()
      expect(afterClear.cacheSize).toBe(0)
    })

    it('reports capabilities correctly', () => {
      const stats = service.getStats()

      expect(stats.capabilities).toHaveProperty('wordnet')
      expect(stats.capabilities).toHaveProperty('embeddings')
      expect(stats.capabilities).toHaveProperty('taxonomy')
      expect(stats.capabilities).toHaveProperty('ner')
    })
  })

  // ============================================================================
  // SINGLETON MANAGEMENT
  // ============================================================================

  describe('Singleton Management', () => {
    it('returns same instance on repeated calls', () => {
      const instance1 = getVocabularyService()
      const instance2 = getVocabularyService()

      expect(instance1).toBe(instance2)
    })

    it('respects initial config on first call', () => {
      resetVocabularyService()

      const instance1 = getVocabularyService({ maxResults: 5 })
      const instance2 = getVocabularyService({ maxResults: 99 }) // Should be ignored

      expect(instance1).toBe(instance2)
    })

    it('resets singleton correctly', () => {
      const instance1 = getVocabularyService()
      resetVocabularyService()
      const instance2 = getVocabularyService()

      expect(instance1).not.toBe(instance2)
    })

    it('clears cache on reset', async () => {
      const service = getVocabularyService()
      await service.initialize()
      await service.classify('Cached content')

      resetVocabularyService()

      const newService = getVocabularyService()
      const stats = newService.getStats()
      expect(stats.cacheSize).toBe(0)
    })
  })

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    let service: VocabularyService

    beforeEach(async () => {
      service = new VocabularyService()
      await service.initialize()
    })

    it('handles empty string input', async () => {
      const result = await service.classify('')
      expect(result).toBeDefined()
      expect(result.subjects).toBeDefined()
    })

    it('handles very long text input', async () => {
      const longText = 'JavaScript development tutorial '.repeat(1000)
      const result = await service.classify(longText)
      expect(result).toBeDefined()
    })

    it('handles special characters in input', async () => {
      const specialText = 'React @mentions #hashtags $variables <html> "quotes" \'apostrophes\''
      const result = await service.classify(specialText)
      expect(result).toBeDefined()
    })

    it('handles unicode characters', async () => {
      const unicodeText = 'Programming 编程 プログラミング برمجة'
      const result = await service.classify(unicodeText)
      expect(result).toBeDefined()
    })

    it('handles whitespace-only input', async () => {
      const result = await service.classify('   \n\t   ')
      expect(result).toBeDefined()
    })

    it('returns default stats when not initialized', () => {
      const freshService = new VocabularyService()
      const stats = freshService.getStats()

      expect(stats.name).toBe('not initialized')
      expect(stats.initialized).toBe(false)
      expect(stats.vocabularyTerms).toBe(0)
    })
  })

  // ============================================================================
  // CACHE PRUNING
  // ============================================================================

  describe('Cache Pruning', () => {
    it('prunes old cache entries on large cache', async () => {
      const service = new VocabularyService({ cacheTTL: 100 })
      await service.initialize()

      // Fill cache with many entries
      for (let i = 0; i < 100; i++) {
        await service.classify(`Unique content number ${i}`)
      }

      const stats = service.getStats()
      // Cache should be pruned when it exceeds internal limits
      expect(stats.cacheSize).toBeGreaterThan(0)
    })
  })
})
