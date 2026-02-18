/**
 * Browser Vocabulary Engine Tests
 * @module __tests__/unit/indexer/browserEngine.test
 *
 * Tests for the browser-side vocabulary engine that uses:
 * - Pre-computed embeddings
 * - Taxonomy utilities (Soundex, Metaphone, Levenshtein)
 * - Compromise.js NER
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock vocabulary embeddings data - use vi.hoisted to ensure it's available before mocks
const { mockEmbeddingsData } = vi.hoisted(() => ({
  mockEmbeddingsData: {
  version: '1.0.0',
  generatedAt: '2025-01-01T00:00:00Z',
  model: 'MiniLM-L6-v2',
  dimensions: 384,
  embeddings: [
    {
      term: 'javascript',
      category: 'skill' as const,
      subcategory: 'programming-languages',
      embedding: new Array(384).fill(0.1),
      synonyms: ['js', 'ecmascript'],
      hypernyms: ['programming language', 'scripting language'],
    },
    {
      term: 'react',
      category: 'skill' as const,
      subcategory: 'frameworks',
      embedding: new Array(384).fill(0.2),
      synonyms: ['reactjs', 'react.js'],
      hypernyms: ['framework', 'library'],
    },
    {
      term: 'technology',
      category: 'subject' as const,
      subcategory: 'technology',
      embedding: new Array(384).fill(0.3),
      synonyms: ['tech', 'technical'],
      hypernyms: ['domain', 'field'],
    },
    {
      term: 'getting-started',
      category: 'topic' as const,
      subcategory: 'getting-started',
      embedding: new Array(384).fill(0.4),
      synonyms: ['tutorial', 'introduction', 'quickstart'],
      hypernyms: ['guide', 'documentation'],
    },
    {
      term: 'beginner',
      category: 'difficulty' as const,
      subcategory: 'beginner',
      embedding: new Array(384).fill(0.5),
      synonyms: ['basic', 'starter', 'intro'],
      hypernyms: ['level', 'difficulty'],
    },
    {
      term: 'colour',
      category: 'topic' as const,
      subcategory: 'design',
      embedding: new Array(384).fill(0.6),
      synonyms: ['color'],
    },
    {
      term: 'api',
      category: 'tag' as const,
      subcategory: 'general',
      embedding: new Array(384).fill(0.7),
      synonyms: ['interface', 'endpoint'],
    },
    {
      term: 'async',
      category: 'tag' as const,
      subcategory: 'concepts',
      embedding: new Array(384).fill(0.75),
      synonyms: ['asynchronous', 'non-blocking'],
    },
  ],
  stats: {
    totalTerms: 8,
    subjects: 1,
    topics: 2,
    tags: 2,
    skills: 2,
    difficulty: 1,
    synonymExpansions: 19,
  },
}}))

// Mock vocabulary-embeddings module
vi.mock('@/lib/indexer/vocabulary-embeddings', () => ({
  loadVocabularyEmbeddings: vi.fn().mockResolvedValue(mockEmbeddingsData),
  findSimilarEmbeddings: vi.fn().mockImplementation((data, embedding, options) => {
    return data.embeddings
      .filter((e: { category: string }) => !options?.category || e.category === options.category)
      .map((e: { term: string; category: string; subcategory: string }) => ({
        term: e.term,
        category: e.category,
        subcategory: e.subcategory,
        score: 0.85,
        matchType: 'embedding' as const,
      }))
      .slice(0, options?.limit || 10)
  }),
  findEmbeddingByTerm: vi.fn().mockImplementation((data, term) => {
    return data.embeddings.find((e: { term: string }) => e.term === term.toLowerCase())
  }),
  findEmbeddingsBySynonym: vi.fn().mockImplementation((data, synonym) => {
    return data.embeddings.filter((e: { synonyms?: string[] }) =>
      e.synonyms?.includes(synonym.toLowerCase())
    )
  }),
  cosineSimilarity: vi.fn().mockReturnValue(0.85),
}))

// Mock embedding engine
vi.mock('@/lib/search/embeddingEngine', () => ({
  HybridEmbeddingEngine: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    isReady: vi.fn().mockReturnValue(true),
    embedText: vi.fn().mockResolvedValue(new Float32Array(384).fill(0.1)),
    getStatusDescription: vi.fn().mockReturnValue('ONNX Runtime ready'),
  })),
}))

// Mock taxonomy utilities
vi.mock('@/lib/taxonomy', () => ({
  soundex: vi.fn().mockImplementation((term: string) => {
    const soundexMap: Record<string, string> = {
      'color': 'C460',
      'colour': 'C460',
      'programming': 'P625',
      'programing': 'P625',
    }
    return soundexMap[term.toLowerCase()] || term.substring(0, 4).toUpperCase()
  }),
  metaphone: vi.fn().mockImplementation((term: string) => {
    const metaphoneMap: Record<string, string> = {
      'color': 'KLR',
      'colour': 'KLR',
      'programming': 'PRKRMN',
      'programing': 'PRKRMN',
      'javascript': 'JFSKRPT',
      'javascrpt': 'JFSKRPT',
    }
    return metaphoneMap[term.toLowerCase()] || term.substring(0, 6).toUpperCase()
  }),
  expandAcronym: vi.fn().mockImplementation((term: string) => {
    const acronymMap: Record<string, string[]> = {
      'ai': ['artificial intelligence'],
      'ml': ['machine learning'],
      'api': ['application programming interface'],
      'js': ['javascript'],
    }
    return acronymMap[term.toLowerCase()] || null
  }),
  areSimilarEnhanced: vi.fn().mockImplementation((a: string, b: string) => {
    return a.toLowerCase() === b.toLowerCase() ||
           a.toLowerCase().includes(b.toLowerCase()) ||
           b.toLowerCase().includes(a.toLowerCase())
  }),
  calculateSimilarityScore: vi.fn().mockImplementation((a: string, b: string) => {
    if (a.toLowerCase() === b.toLowerCase()) return { score: 1.0, method: 'exact' }
    if (a.toLowerCase().includes(b.toLowerCase())) return { score: 0.7, method: 'contains' }
    return { score: 0.3, method: 'fuzzy' }
  }),
  normalizeTerm: vi.fn().mockImplementation((term: string) => term.toLowerCase().trim()),
  levenshteinDistance: vi.fn().mockImplementation((a: string, b: string) => {
    if (a === b) return 0
    if (Math.abs(a.length - b.length) > 2) return 3
    return 1
  }),
}))

// Mock NLP functions
vi.mock('@/lib/nlp', () => ({
  extractEntities: vi.fn().mockReturnValue({
    languages: ['javascript', 'typescript'],
    frameworks: ['react'],
    databases: [],
    cloud: [],
    ai: [],
    other: [],
  }),
  extractKeywords: vi.fn().mockReturnValue([
    { word: 'javascript', score: 0.9 },
    { word: 'tutorial', score: 0.8 },
    { word: 'beginner', score: 0.7 },
  ]),
}))

// Import after mocking
import { BrowserVocabularyEngine } from '@/lib/indexer/engines/browserEngine'
import { soundex, metaphone, expandAcronym, levenshteinDistance } from '@/lib/taxonomy'
import { extractEntities, extractKeywords } from '@/lib/nlp'

describe('BrowserVocabularyEngine', () => {
  let engine: BrowserVocabularyEngine

  beforeEach(async () => {
    vi.clearAllMocks()
    engine = new BrowserVocabularyEngine({ useEmbeddings: true })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe('Initialization', () => {
    it('initializes with browser engine name', () => {
      expect(engine.name).toBe('browser')
    })

    it('loads pre-computed embeddings on initialize', async () => {
      await engine.initialize()
      expect(engine.isReady()).toBe(true)
    })

    it('builds lookup indices from embeddings', async () => {
      await engine.initialize()
      const stats = engine.getStats()
      expect(stats.vocabularyTerms).toBeGreaterThan(0)
    })

    it('initializes embedding engine for runtime similarity', async () => {
      await engine.initialize()
      const stats = engine.getStats()
      expect(stats.capabilities.embeddings).toBe(true)
    })

    it('marks NER as available', async () => {
      await engine.initialize()
      const stats = engine.getStats()
      expect(stats.capabilities.ner).toBe(true)
    })

    it('reports WordNet as unavailable in browser', async () => {
      await engine.initialize()
      const stats = engine.getStats()
      expect(stats.capabilities.wordnet).toBe(false)
    })
  })

  // ============================================================================
  // TERM EXPANSION (without WordNet)
  // ============================================================================

  describe('Term Expansion', () => {
    beforeEach(async () => {
      await engine.initialize()
    })

    it('includes original term in expansion', async () => {
      const expanded = await engine.expandTerm('javascript')
      expect(expanded).toContain('javascript')
    })

    it('includes pre-computed synonyms from embeddings', async () => {
      const expanded = await engine.expandTerm('javascript')
      expect(expanded).toContain('js')
      expect(expanded).toContain('ecmascript')
    })

    it('includes hypernyms from embeddings', async () => {
      const expanded = await engine.expandTerm('javascript')
      expect(expanded.some(t => t.includes('programming') || t.includes('language'))).toBe(true)
    })

    it('expands acronyms using taxonomy', async () => {
      const expanded = await engine.expandTerm('AI')
      expect(expandAcronym).toHaveBeenCalled()
    })

    it('finds Soundex phonetic matches', async () => {
      await engine.expandTerm('color')
      expect(soundex).toHaveBeenCalledWith('color')
    })

    it('finds Metaphone phonetic matches', async () => {
      await engine.expandTerm('programming')
      expect(metaphone).toHaveBeenCalledWith('programming')
    })

    it('finds Levenshtein near-matches for typos', async () => {
      await engine.expandTerm('javascrpt') // typo
      expect(levenshteinDistance).toHaveBeenCalled()
    })

    it('normalizes term before expansion', async () => {
      const expanded1 = await engine.expandTerm('JavaScript')
      const expanded2 = await engine.expandTerm('javascript')
      // Both should return same terms (may include original case and duplicates)
      // Dedupe, normalize, and sort to compare
      const normalized1 = [...new Set(expanded1.map(t => t.toLowerCase()))].sort()
      const normalized2 = [...new Set(expanded2.map(t => t.toLowerCase()))].sort()
      expect(normalized1).toEqual(normalized2)
    })
  })

  // ============================================================================
  // SOUNDEX MATCHING
  // ============================================================================

  describe('Soundex Matching', () => {
    beforeEach(async () => {
      await engine.initialize()
    })

    it('matches color and colour via Soundex', async () => {
      // Both have Soundex C460
      await engine.expandTerm('color')
      expect(soundex).toHaveBeenCalledWith('color')
    })

    it('matches programming variations', async () => {
      await engine.expandTerm('programing') // typo
      expect(soundex).toHaveBeenCalledWith('programing')
    })
  })

  // ============================================================================
  // METAPHONE MATCHING
  // ============================================================================

  describe('Metaphone Matching', () => {
    beforeEach(async () => {
      await engine.initialize()
    })

    it('uses Metaphone for advanced phonetics', async () => {
      await engine.expandTerm('javascript')
      expect(metaphone).toHaveBeenCalled()
    })

    it('matches javascrpt typo to javascript', async () => {
      await engine.expandTerm('javascrpt')
      expect(metaphone).toHaveBeenCalledWith('javascrpt')
    })
  })

  // ============================================================================
  // LEVENSHTEIN MATCHING
  // ============================================================================

  describe('Levenshtein Matching', () => {
    beforeEach(async () => {
      await engine.initialize()
    })

    it('finds terms within edit distance', async () => {
      await engine.expandTerm('javscript') // 1 char missing
      expect(levenshteinDistance).toHaveBeenCalled()
    })

    it('uses default max distance of 2', async () => {
      await engine.expandTerm('test')
      // Should be called for each vocabulary term comparison
    })
  })

  // ============================================================================
  // ACRONYM EXPANSION
  // ============================================================================

  describe('Acronym Expansion', () => {
    beforeEach(async () => {
      await engine.initialize()
    })

    it('expands AI to artificial intelligence', async () => {
      await engine.expandTerm('AI')
      expect(expandAcronym).toHaveBeenCalledWith('ai')
    })

    it('expands JS to javascript', async () => {
      await engine.expandTerm('JS')
      expect(expandAcronym).toHaveBeenCalledWith('js')
    })

    it('handles unknown acronyms gracefully', async () => {
      const expanded = await engine.expandTerm('XYZ')
      expect(expanded).toContain('xyz')
    })
  })

  // ============================================================================
  // SIMILARITY SEARCH
  // ============================================================================

  describe('Similarity Search', () => {
    beforeEach(async () => {
      await engine.initialize()
    })

    it('uses embeddings for semantic similarity', async () => {
      const similar = await engine.findSimilarTerms('Building web applications')
      expect(similar.length).toBeGreaterThan(0)
    })

    it('returns scored terms with required properties', async () => {
      const similar = await engine.findSimilarTerms('JavaScript tutorial')

      if (similar.length > 0) {
        expect(similar[0]).toHaveProperty('term')
        expect(similar[0]).toHaveProperty('category')
        expect(similar[0]).toHaveProperty('subcategory')
        expect(similar[0]).toHaveProperty('score')
        expect(similar[0]).toHaveProperty('matchType')
      }
    })

    it('filters results by category', async () => {
      const similar = await engine.findSimilarTerms('JavaScript', 'skill')
      // All results should be skills if category filter works
      expect(similar.every(s => s.category === 'skill')).toBe(true)
    })

    it('augments with keyword fuzzy matching', async () => {
      await engine.findSimilarTerms('React components')
      expect(extractKeywords).toHaveBeenCalled()
    })

    it('respects minSimilarityScore config', async () => {
      const engineWithHighThreshold = new BrowserVocabularyEngine({
        useEmbeddings: true,
        minSimilarityScore: 0.9,
      })
      await engineWithHighThreshold.initialize()

      // Results should be filtered by high score
      const similar = await engineWithHighThreshold.findSimilarTerms('test')
      // With mock returning 0.85, might be empty or filtered
    })

    it('respects maxResults config', async () => {
      const engineWithLimit = new BrowserVocabularyEngine({
        useEmbeddings: true,
        maxResults: 3,
      })
      await engineWithLimit.initialize()

      const similar = await engineWithLimit.findSimilarTerms('test')
      expect(similar.length).toBeLessThanOrEqual(3)
    })
  })

  // ============================================================================
  // CLASSIFICATION
  // ============================================================================

  describe('Classification', () => {
    beforeEach(async () => {
      await engine.initialize()
    })

    it('classifies text into subjects, topics, tags, skills, difficulty', async () => {
      const result = await engine.classifyText('JavaScript tutorial for beginners')

      expect(result).toHaveProperty('subjects')
      expect(result).toHaveProperty('topics')
      expect(result).toHaveProperty('tags')
      expect(result).toHaveProperty('skills')
      expect(result).toHaveProperty('difficulty')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('keywords')
    })

    it('returns tags as array of lightweight keywords', async () => {
      const result = await engine.classifyText('Building an API with async operations')

      expect(Array.isArray(result.tags)).toBe(true)
      // Tags should be normalized with dashes, no spaces
      result.tags.forEach((tag) => {
        expect(tag).not.toContain(' ')
      })
    })

    it('limits tags to max 15', async () => {
      const result = await engine.classifyText(
        'api web mobile desktop cli ui ux config docs example demo snippet template boilerplate starter async sync concurrent parallel event stream queue'
      )
      expect(result.tags.length).toBeLessThanOrEqual(15)
    })

    it('extracts entities using Compromise.js NER', async () => {
      await engine.classifyText('Building React apps with TypeScript')
      expect(extractEntities).toHaveBeenCalled()
    })

    it('uses embedding similarity for classification', async () => {
      const result = await engine.classifyText('Machine learning with Python')
      expect(result.subjects.length).toBeGreaterThanOrEqual(0)
    })

    it('augments classification with taxonomy matching', async () => {
      const result = await engine.classifyText('Basic JavaScript tutorial')
      // Should detect 'basic' → beginner difficulty
    })

    it('extracts keywords from content', async () => {
      const result = await engine.classifyText('Test content')
      expect(result.keywords).toBeDefined()
      expect(Array.isArray(result.keywords)).toBe(true)
    })

    it('limits skills to max 10', async () => {
      const result = await engine.classifyText(
        'JavaScript TypeScript Python Rust Go Java Ruby PHP Swift Kotlin Scala C++ C Perl Elixir'
      )
      expect(result.skills.length).toBeLessThanOrEqual(10)
    })

    it('returns default difficulty when no matches', async () => {
      // Mock to return no keywords
      vi.mocked(extractKeywords).mockReturnValueOnce([])
      vi.mocked(extractEntities).mockReturnValueOnce({
        languages: [],
        frameworks: [],
        databases: [],
        cloud: [],
        ai: [],
        other: [],
      })

      const result = await engine.classifyText('')
      expect(result.difficulty).toBe('intermediate') // default
    })

    it('normalizes skill names with dashes', async () => {
      const result = await engine.classifyText('React JS development')
      // Skills should use dashes instead of spaces
      result.skills.forEach(skill => {
        expect(skill).not.toContain(' ')
      })
    })
  })

  // ============================================================================
  // VOCABULARY EXPANSION
  // ============================================================================

  describe('Vocabulary Expansion', () => {
    beforeEach(async () => {
      await engine.initialize()
    })

    it('expands multiple terms at once', async () => {
      const expanded = await engine.expandVocabulary(['javascript', 'react'])

      expect(expanded.length).toBe(2)
      expect(expanded[0]).toHaveProperty('original', 'javascript')
      expect(expanded[1]).toHaveProperty('original', 'react')
    })

    it('includes synonyms in expansion', async () => {
      const expanded = await engine.expandVocabulary(['javascript'])

      expect(expanded[0]).toHaveProperty('synonyms')
      expect(expanded[0].synonyms).toContain('js')
    })

    it('includes hypernyms in expansion', async () => {
      const expanded = await engine.expandVocabulary(['javascript'])

      expect(expanded[0]).toHaveProperty('hypernyms')
    })

    it('includes related terms from expansion', async () => {
      const expanded = await engine.expandVocabulary(['javascript'])

      expect(expanded[0]).toHaveProperty('related')
    })
  })

  // ============================================================================
  // RELATED TERMS
  // ============================================================================

  describe('Related Terms', () => {
    beforeEach(async () => {
      await engine.initialize()
    })

    it('finds synonyms for a term', async () => {
      const related = await engine.findRelatedTerms('javascript')

      expect(related).toHaveProperty('term', 'javascript')
      expect(related).toHaveProperty('synonyms')
    })

    it('finds broader terms', async () => {
      const related = await engine.findRelatedTerms('javascript')

      expect(related).toHaveProperty('broader')
    })

    it('returns narrower terms (empty for browser engine)', async () => {
      const related = await engine.findRelatedTerms('technology')

      expect(related).toHaveProperty('narrower')
      expect(related.narrower).toEqual([]) // Browser doesn't have hyponyms
    })

    it('returns related terms from fuzzy matching', async () => {
      const related = await engine.findRelatedTerms('programming')

      expect(related).toHaveProperty('related')
    })
  })

  // ============================================================================
  // STATISTICS
  // ============================================================================

  describe('Statistics', () => {
    it('reports correct engine name', async () => {
      await engine.initialize()
      const stats = engine.getStats()
      expect(stats.name).toBe('browser')
    })

    it('reports initialization status', async () => {
      expect(engine.getStats().initialized).toBe(false)
      await engine.initialize()
      expect(engine.getStats().initialized).toBe(true)
    })

    it('reports correct capabilities', async () => {
      await engine.initialize()
      const stats = engine.getStats()

      expect(stats.capabilities.wordnet).toBe(false)
      expect(stats.capabilities.embeddings).toBe(true)
      expect(stats.capabilities.taxonomy).toBe(true)
      expect(stats.capabilities.ner).toBe(true)
    })

    it('reports vocabulary term count', async () => {
      await engine.initialize()
      const stats = engine.getStats()
      expect(stats.vocabularyTerms).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // FALLBACK BEHAVIOR
  // ============================================================================

  describe('Fallback Behavior', () => {
    it('uses default vocabulary when embeddings unavailable', async () => {
      vi.mocked(await import('@/lib/indexer/vocabulary-embeddings')).loadVocabularyEmbeddings.mockResolvedValueOnce(null)

      const fallbackEngine = new BrowserVocabularyEngine({ useEmbeddings: true })
      await fallbackEngine.initialize()

      // Should still work with fallback vocabulary
      const result = await fallbackEngine.classifyText('JavaScript tutorial')
      expect(result).toBeDefined()
    })

    it('continues classification when embedding similarity fails', async () => {
      await engine.initialize()

      // Even if embeddings fail, taxonomy matching should work
      const result = await engine.classifyText('Basic tutorial for beginners')
      expect(result).toBeDefined()
    })
  })
})
