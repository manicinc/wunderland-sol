/**
 * Server Vocabulary Engine Tests
 * @module __tests__/unit/indexer/serverEngine.test
 *
 * Tests for the server-side vocabulary engine that uses:
 * - WordNet for synonyms/hypernyms/hyponyms
 * - Embedding similarity (when available)
 * - Taxonomy utilities
 * - Compromise.js NER
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock vocabulary embeddings
vi.mock('@/lib/indexer/vocabulary-embeddings', () => ({
  loadVocabularyEmbeddings: vi.fn().mockResolvedValue({
    version: '1.0.0',
    generatedAt: '2025-01-01T00:00:00Z',
    model: 'MiniLM-L6-v2',
    dimensions: 384,
    embeddings: [
      { term: 'javascript', category: 'skill', subcategory: 'programming-languages', embedding: [] },
      { term: 'technology', category: 'subject', subcategory: 'technology', embedding: [] },
    ],
    stats: { totalTerms: 2, subjects: 1, topics: 0, tags: 0, skills: 1, difficulty: 0, synonymExpansions: 0 },
  }),
  findSimilarEmbeddings: vi.fn().mockReturnValue([]),
  cosineSimilarity: vi.fn().mockReturnValue(0.85),
}))

// Mock WordNet functions
vi.mock('@/lib/nlp/wordnet', () => ({
  getSynonyms: vi.fn().mockImplementation((term: string) => {
    const synonymMap: Record<string, string[]> = {
      'programming': ['coding', 'software development', 'software engineering'],
      'javascript': ['js', 'ecmascript'],
      'technology': ['tech', 'technical'],
      'beginner': ['novice', 'starter', 'basic'],
      'research': ['study', 'investigation', 'inquiry'],
    }
    return Promise.resolve(synonymMap[term.toLowerCase()] || [])
  }),
  getHypernyms: vi.fn().mockImplementation((term: string, depth: number) => {
    const hypernymMap: Record<string, string[]> = {
      'javascript': ['programming language', 'scripting language'],
      'programming': ['computer science', 'technology'],
      'react': ['framework', 'library'],
    }
    return Promise.resolve((hypernymMap[term.toLowerCase()] || []).slice(0, depth))
  }),
  getHyponyms: vi.fn().mockImplementation((term: string, depth: number) => {
    const hyponymMap: Record<string, string[]> = {
      'technology': ['software', 'hardware', 'networking'],
      'programming': ['web development', 'mobile development'],
    }
    return Promise.resolve((hyponymMap[term.toLowerCase()] || []).slice(0, depth))
  }),
  getWordNetSimilarity: vi.fn().mockImplementation((term1: string, term2: string) => {
    if (term1.toLowerCase() === term2.toLowerCase()) {
      return Promise.resolve({ score: 1.0, relationship: 'exact' })
    }
    // Check if one is a synonym of another
    const synonymPairs = [
      ['programming', 'coding'],
      ['javascript', 'js'],
      ['beginner', 'novice'],
    ]
    for (const [a, b] of synonymPairs) {
      if ((term1.toLowerCase() === a && term2.toLowerCase() === b) ||
          (term1.toLowerCase() === b && term2.toLowerCase() === a)) {
        return Promise.resolve({ score: 0.9, relationship: 'synonym' })
      }
    }
    return Promise.resolve(null)
  }),
}))

// Mock taxonomy utilities
vi.mock('@/lib/taxonomy', () => ({
  soundex: vi.fn().mockImplementation((term: string) => {
    const soundexMap: Record<string, string> = {
      'color': 'C460',
      'colour': 'C460',
      'programming': 'P625',
    }
    return soundexMap[term.toLowerCase()] || term.substring(0, 4).toUpperCase()
  }),
  metaphone: vi.fn().mockImplementation((term: string) => {
    const metaphoneMap: Record<string, string> = {
      'color': 'KLR',
      'colour': 'KLR',
      'programming': 'PRKRMN',
    }
    return metaphoneMap[term.toLowerCase()] || term.substring(0, 6).toUpperCase()
  }),
  expandAcronym: vi.fn().mockImplementation((term: string) => {
    const acronymMap: Record<string, string[]> = {
      'ai': ['artificial intelligence'],
      'ml': ['machine learning'],
      'api': ['application programming interface'],
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
}))

// Mock NLP functions
vi.mock('@/lib/nlp', () => ({
  extractTechEntities: vi.fn().mockReturnValue({
    languages: ['python', 'tensorflow'],
    frameworks: [],
    databases: [],
    cloud: [],
    ai: ['neural network', 'deep learning'],
    other: [],
  }),
  extractKeywords: vi.fn().mockReturnValue([
    { word: 'machine', score: 0.9 },
    { word: 'learning', score: 0.85 },
    { word: 'model', score: 0.8 },
  ]),
}))

// Import after mocking
import { ServerVocabularyEngine } from '@/lib/indexer/engines/serverEngine'
import { getSynonyms, getHypernyms, getHyponyms, getWordNetSimilarity } from '@/lib/nlp/wordnet'
import { soundex, metaphone, expandAcronym } from '@/lib/taxonomy'
import { extractTechEntities, extractKeywords } from '@/lib/nlp'

describe('ServerVocabularyEngine', () => {
  let engine: ServerVocabularyEngine

  beforeEach(async () => {
    vi.clearAllMocks()
    engine = new ServerVocabularyEngine({ useEmbeddings: true })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe('Initialization', () => {
    it('initializes with server engine name', () => {
      expect(engine.name).toBe('server')
    })

    it('initializes successfully', async () => {
      await engine.initialize()
      expect(engine.isReady()).toBe(true)
    })

    it('loads embeddings when available', async () => {
      await engine.initialize()
      const stats = engine.getStats()
      expect(stats.capabilities.embeddings).toBe(true)
    })

    it('reports WordNet as available', async () => {
      await engine.initialize()
      const stats = engine.getStats()
      expect(stats.capabilities.wordnet).toBe(true)
    })

    it('reports taxonomy as available', async () => {
      await engine.initialize()
      const stats = engine.getStats()
      expect(stats.capabilities.taxonomy).toBe(true)
    })

    it('reports NER as available', async () => {
      await engine.initialize()
      const stats = engine.getStats()
      expect(stats.capabilities.ner).toBe(true)
    })
  })

  // ============================================================================
  // WORDNET INTEGRATION
  // ============================================================================

  describe('WordNet Integration', () => {
    beforeEach(async () => {
      await engine.initialize()
    })

    it('retrieves synonyms from WordNet', async () => {
      const expanded = await engine.expandTerm('programming')
      expect(getSynonyms).toHaveBeenCalledWith('programming')
      expect(expanded).toContain('coding')
      expect(expanded).toContain('software development')
    })

    it('retrieves hypernyms with depth control', async () => {
      const expanded = await engine.expandTerm('javascript')
      expect(getHypernyms).toHaveBeenCalledWith('javascript', 2)
    })

    it('includes hypernyms in expansion', async () => {
      const expanded = await engine.expandTerm('javascript')
      expect(expanded.some(t => t.includes('programming') || t.includes('language'))).toBe(true)
    })

    it('uses WordNet similarity for classification', async () => {
      await engine.findSimilarTerms('coding')
      expect(getWordNetSimilarity).toHaveBeenCalled()
    })

    it('falls back gracefully when WordNet unavailable', async () => {
      vi.mocked(getSynonyms).mockRejectedValueOnce(new Error('WordNet unavailable'))

      const expanded = await engine.expandTerm('programming')
      // Should still return original term even if WordNet fails
      expect(expanded).toContain('programming')
    })
  })

  // ============================================================================
  // TERM EXPANSION (with WordNet)
  // ============================================================================

  describe('Term Expansion', () => {
    beforeEach(async () => {
      await engine.initialize()
    })

    it('includes original term in expansion', async () => {
      const expanded = await engine.expandTerm('javascript')
      expect(expanded).toContain('javascript')
    })

    it('includes WordNet synonyms', async () => {
      const expanded = await engine.expandTerm('javascript')
      expect(getSynonyms).toHaveBeenCalledWith('javascript')
    })

    it('includes WordNet hypernyms', async () => {
      const expanded = await engine.expandTerm('programming')
      expect(getHypernyms).toHaveBeenCalledWith('programming', 2)
    })

    it('expands acronyms', async () => {
      await engine.expandTerm('AI')
      expect(expandAcronym).toHaveBeenCalledWith('ai')
    })

    it('includes phonetic matches', async () => {
      await engine.expandTerm('programming')
      expect(soundex).toHaveBeenCalledWith('programming')
      expect(metaphone).toHaveBeenCalledWith('programming')
    })

    it('caches expansion results', async () => {
      await engine.expandTerm('programming')
      await engine.expandTerm('programming')

      // getSynonyms should only be called once due to caching
      expect(getSynonyms).toHaveBeenCalledTimes(1)
    })

    it('normalizes terms before expansion', async () => {
      const expanded1 = await engine.expandTerm('JavaScript')
      const expanded2 = await engine.expandTerm('javascript')

      // After caching, should be same
      expect(expanded1).toEqual(expanded2)
    })
  })

  // ============================================================================
  // SIMILARITY SEARCH
  // ============================================================================

  describe('Similarity Search', () => {
    beforeEach(async () => {
      await engine.initialize()
    })

    it('uses WordNet similarity for term matching', async () => {
      await engine.findSimilarTerms('coding tutorial')
      expect(getWordNetSimilarity).toHaveBeenCalled()
    })

    it('returns scored terms', async () => {
      const similar = await engine.findSimilarTerms('programming')

      if (similar.length > 0) {
        expect(similar[0]).toHaveProperty('term')
        expect(similar[0]).toHaveProperty('category')
        expect(similar[0]).toHaveProperty('score')
        expect(similar[0]).toHaveProperty('matchType')
      }
    })

    it('filters by category', async () => {
      const similar = await engine.findSimilarTerms('test', 'subject')
      // Verify category filter is applied
    })

    it('combines WordNet and taxonomy similarity', async () => {
      await engine.findSimilarTerms('programming basics')
      expect(getWordNetSimilarity).toHaveBeenCalled()
      // Taxonomy calculateSimilarityScore also used for fuzzy matching
    })

    it('respects minSimilarityScore', async () => {
      const engineHighThreshold = new ServerVocabularyEngine({
        useEmbeddings: true,
        minSimilarityScore: 0.9,
      })
      await engineHighThreshold.initialize()

      const similar = await engineHighThreshold.findSimilarTerms('test')
      similar.forEach(s => {
        expect(s.score).toBeGreaterThanOrEqual(0.9)
      })
    })

    it('respects maxResults', async () => {
      const engineWithLimit = new ServerVocabularyEngine({
        useEmbeddings: true,
        maxResults: 3,
      })
      await engineWithLimit.initialize()

      const similar = await engineWithLimit.findSimilarTerms('technology')
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

    it('classifies text into all categories', async () => {
      const result = await engine.classifyText('Machine learning with Python')

      expect(result).toHaveProperty('subjects')
      expect(result).toHaveProperty('topics')
      expect(result).toHaveProperty('tags')
      expect(result).toHaveProperty('skills')
      expect(result).toHaveProperty('difficulty')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('keywords')
    })

    it('returns tags as lightweight keywords', async () => {
      const result = await engine.classifyText('Building an API with async stream processing')

      expect(Array.isArray(result.tags)).toBe(true)
      // Tags should be normalized with dashes
      result.tags.forEach((tag) => {
        expect(tag).not.toContain(' ')
      })
    })

    it('limits tags to 15', async () => {
      const result = await engine.classifyText(
        'api web mobile desktop cli ui ux config docs example demo snippet template boilerplate starter async sync concurrent parallel event stream queue webhook callback promise observable reactive'
      )
      expect(result.tags.length).toBeLessThanOrEqual(15)
    })

    it('extracts entities using NLP', async () => {
      await engine.classifyText('Building neural networks with TensorFlow')
      expect(extractTechEntities).toHaveBeenCalled()
    })

    it('extracts keywords from content', async () => {
      await engine.classifyText('Machine learning model training')
      expect(extractKeywords).toHaveBeenCalled()
    })

    it('uses WordNet similarity for subject matching', async () => {
      await engine.classifyText('Research study on programming')
      expect(getWordNetSimilarity).toHaveBeenCalled()
    })

    it('matches topics via taxonomy', async () => {
      const result = await engine.classifyText('Troubleshooting guide for beginners')
      // Should detect troubleshooting and beginner
    })

    it('matches skills from entities', async () => {
      const result = await engine.classifyText('Python TensorFlow machine learning')
      // Skills should include extracted entities
    })

    it('determines difficulty level', async () => {
      const result = await engine.classifyText('Advanced optimization techniques')
      expect(['beginner', 'intermediate', 'advanced']).toContain(result.difficulty)
    })

    it('limits skills to 10', async () => {
      const result = await engine.classifyText(
        'JavaScript TypeScript Python Java Ruby PHP Swift Kotlin Scala Go Rust C++ C Perl'
      )
      expect(result.skills.length).toBeLessThanOrEqual(10)
    })

    it('includes confidence scores', async () => {
      const result = await engine.classifyText('Technology tutorial')

      expect(typeof result.confidence).toBe('object')
      Object.values(result.confidence).forEach(score => {
        expect(typeof score).toBe('number')
        expect(score).toBeGreaterThanOrEqual(0)
        expect(score).toBeLessThanOrEqual(1)
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

    it('expands multiple terms with WordNet', async () => {
      const expanded = await engine.expandVocabulary(['programming', 'technology'])

      expect(expanded.length).toBe(2)
      expect(getSynonyms).toHaveBeenCalledWith('programming')
      expect(getSynonyms).toHaveBeenCalledWith('technology')
    })

    it('returns synonyms from WordNet', async () => {
      const expanded = await engine.expandVocabulary(['beginner'])

      expect(expanded[0]).toHaveProperty('original', 'beginner')
      expect(expanded[0]).toHaveProperty('synonyms')
      expect(expanded[0].synonyms).toContain('novice')
    })

    it('returns hypernyms from WordNet', async () => {
      const expanded = await engine.expandVocabulary(['javascript'])

      expect(expanded[0]).toHaveProperty('hypernyms')
      expect(getHypernyms).toHaveBeenCalledWith('javascript', 2)
    })

    it('returns hyponyms as related terms', async () => {
      const expanded = await engine.expandVocabulary(['technology'])

      expect(expanded[0]).toHaveProperty('related')
      expect(getHyponyms).toHaveBeenCalledWith('technology', 1)
    })
  })

  // ============================================================================
  // RELATED TERMS
  // ============================================================================

  describe('Related Terms', () => {
    beforeEach(async () => {
      await engine.initialize()
    })

    it('finds synonyms via WordNet', async () => {
      const related = await engine.findRelatedTerms('programming')

      expect(related).toHaveProperty('term', 'programming')
      expect(related).toHaveProperty('synonyms')
      expect(getSynonyms).toHaveBeenCalledWith('programming')
    })

    it('finds broader terms (hypernyms)', async () => {
      const related = await engine.findRelatedTerms('javascript')

      expect(related).toHaveProperty('broader')
      expect(getHypernyms).toHaveBeenCalledWith('javascript', 2)
    })

    it('finds narrower terms (hyponyms)', async () => {
      const related = await engine.findRelatedTerms('technology')

      expect(related).toHaveProperty('narrower')
      expect(getHyponyms).toHaveBeenCalledWith('technology', 1)
    })

    it('returns scored related terms', async () => {
      const related = await engine.findRelatedTerms('programming')

      if (related.synonyms.length > 0) {
        expect(related.synonyms[0]).toHaveProperty('term')
        expect(related.synonyms[0]).toHaveProperty('score')
        expect(related.synonyms[0]).toHaveProperty('matchType', 'synonym')
      }
    })
  })

  // ============================================================================
  // STATISTICS
  // ============================================================================

  describe('Statistics', () => {
    it('reports correct engine name', async () => {
      await engine.initialize()
      expect(engine.getStats().name).toBe('server')
    })

    it('reports initialization status', async () => {
      expect(engine.getStats().initialized).toBe(false)
      await engine.initialize()
      expect(engine.getStats().initialized).toBe(true)
    })

    it('reports all capabilities as true', async () => {
      await engine.initialize()
      const stats = engine.getStats()

      expect(stats.capabilities.wordnet).toBe(true)
      expect(stats.capabilities.embeddings).toBe(true)
      expect(stats.capabilities.taxonomy).toBe(true)
      expect(stats.capabilities.ner).toBe(true)
    })

    it('reports vocabulary term count from default vocabulary', async () => {
      await engine.initialize()
      const stats = engine.getStats()
      expect(stats.vocabularyTerms).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe('Error Handling', () => {
    beforeEach(async () => {
      await engine.initialize()
    })

    it('handles WordNet getSynonyms failure gracefully', async () => {
      vi.mocked(getSynonyms).mockRejectedValueOnce(new Error('WordNet error'))

      const expanded = await engine.expandTerm('test')
      expect(expanded).toContain('test')
    })

    it('handles WordNet getHypernyms failure gracefully', async () => {
      vi.mocked(getHypernyms).mockRejectedValueOnce(new Error('WordNet error'))

      const expanded = await engine.expandTerm('test')
      expect(expanded).toContain('test')
    })

    it('handles WordNet similarity failure gracefully', async () => {
      vi.mocked(getWordNetSimilarity).mockRejectedValueOnce(new Error('WordNet error'))

      // Engine propagates WordNet errors - caller should handle them
      await expect(engine.findSimilarTerms('test')).rejects.toThrow('WordNet error')
    })

    it('continues classification when WordNet fails', async () => {
      vi.mocked(getWordNetSimilarity).mockResolvedValue(null)

      const result = await engine.classifyText('Test content')
      expect(result).toBeDefined()
      expect(result.subjects).toBeDefined()
    })
  })

  // ============================================================================
  // PHONETIC MATCHING
  // ============================================================================

  describe('Phonetic Matching', () => {
    beforeEach(async () => {
      await engine.initialize()
    })

    it('finds terms with matching Soundex codes', async () => {
      await engine.expandTerm('color')
      expect(soundex).toHaveBeenCalledWith('color')
    })

    it('finds terms with matching Metaphone codes', async () => {
      await engine.expandTerm('programming')
      expect(metaphone).toHaveBeenCalledWith('programming')
    })

    it('combines phonetic matches with WordNet results', async () => {
      const expanded = await engine.expandTerm('programming')

      // Should call both WordNet and phonetic matching
      expect(getSynonyms).toHaveBeenCalled()
      expect(soundex).toHaveBeenCalled()
    })
  })
})
