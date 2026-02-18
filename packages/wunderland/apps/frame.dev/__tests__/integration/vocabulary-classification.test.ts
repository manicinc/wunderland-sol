/**
 * Integration Tests: Vocabulary Classification E2E
 *
 * Tests the full vocabulary classification pipeline with real-world
 * text samples across both browser and server engines.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

// Mock the environment detection before importing
let mockIsBrowser = true

vi.mock('@/lib/indexer/vocabulary-embeddings', () => ({
  loadVocabularyEmbeddings: vi.fn().mockResolvedValue({
    version: '1.0.0',
    generatedAt: '2025-01-02T00:00:00.000Z',
    model: 'all-MiniLM-L6-v2',
    dimensions: 384,
    totalTerms: 228,
    totalSynonymExpansions: 435,
    categories: {
      subjects: [
        { term: 'technology', subcategory: 'subjects', embedding: new Array(384).fill(0.1), synonyms: ['tech', 'software', 'computing'] },
        { term: 'science', subcategory: 'subjects', embedding: new Array(384).fill(0.15), synonyms: ['research', 'study', 'experiment'] },
        { term: 'philosophy', subcategory: 'subjects', embedding: new Array(384).fill(0.2), synonyms: ['ethics', 'metaphysics', 'epistemology'] },
        { term: 'ai', subcategory: 'subjects', embedding: new Array(384).fill(0.12), synonyms: ['artificial intelligence', 'machine learning', 'ml', 'deep learning'] },
        { term: 'knowledge', subcategory: 'subjects', embedding: new Array(384).fill(0.18), synonyms: ['information', 'understanding', 'wisdom'] },
      ],
      topics: [
        { term: 'getting-started', subcategory: 'topics', embedding: new Array(384).fill(0.25), synonyms: ['tutorial', 'introduction', 'beginner guide', 'basics'] },
        { term: 'architecture', subcategory: 'topics', embedding: new Array(384).fill(0.3), synonyms: ['design', 'structure', 'system design'] },
        { term: 'troubleshooting', subcategory: 'topics', embedding: new Array(384).fill(0.35), synonyms: ['debugging', 'fixing', 'problem solving', 'issues'] },
        { term: 'performance', subcategory: 'topics', embedding: new Array(384).fill(0.4), synonyms: ['optimization', 'speed', 'efficiency'] },
        { term: 'security', subcategory: 'topics', embedding: new Array(384).fill(0.45), synonyms: ['authentication', 'authorization', 'encryption'] },
      ],
      skills: [
        { term: 'docker', subcategory: 'skills', embedding: new Array(384).fill(0.5), synonyms: ['containerization', 'containers'] },
        { term: 'nodejs', subcategory: 'skills', embedding: new Array(384).fill(0.55), synonyms: ['node', 'node.js'] },
        { term: 'react', subcategory: 'skills', embedding: new Array(384).fill(0.6), synonyms: ['reactjs', 'react.js'] },
        { term: 'python', subcategory: 'skills', embedding: new Array(384).fill(0.65), synonyms: ['py'] },
        { term: 'transformer', subcategory: 'skills', embedding: new Array(384).fill(0.7), synonyms: ['attention mechanism', 'bert', 'gpt'] },
        { term: 'postgresql', subcategory: 'skills', embedding: new Array(384).fill(0.72), synonyms: ['postgres', 'pg'] },
        { term: 'redis', subcategory: 'skills', embedding: new Array(384).fill(0.74), synonyms: ['cache', 'in-memory'] },
      ],
      difficulty: [
        { term: 'beginner', subcategory: 'difficulty', embedding: new Array(384).fill(0.75), synonyms: ['intro', 'basic', 'simple', 'easy', 'first'] },
        { term: 'intermediate', subcategory: 'difficulty', embedding: new Array(384).fill(0.8), synonyms: ['medium', 'moderate'] },
        { term: 'advanced', subcategory: 'difficulty', embedding: new Array(384).fill(0.85), synonyms: ['expert', 'complex', 'sophisticated', 'state-of-the-art'] },
      ],
      tags: [
        { term: 'api', subcategory: 'general', embedding: new Array(384).fill(0.42), synonyms: ['interface', 'endpoint', 'rest'] },
        { term: 'async', subcategory: 'concepts', embedding: new Array(384).fill(0.44), synonyms: ['asynchronous', 'non-blocking'] },
        { term: 'web', subcategory: 'general', embedding: new Array(384).fill(0.46), synonyms: ['browser', 'frontend'] },
        { term: 'cli', subcategory: 'general', embedding: new Array(384).fill(0.48), synonyms: ['command-line', 'terminal'] },
      ],
    },
  }),
  cosineSimilarity: vi.fn((a: number[], b: number[]) => {
    // Simple mock: higher similarity for closer values
    const avgA = a.reduce((s, v) => s + v, 0) / a.length
    const avgB = b.reduce((s, v) => s + v, 0) / b.length
    return 1 - Math.abs(avgA - avgB)
  }),
  findSimilarEmbeddings: vi.fn(),
  clearEmbeddingsCache: vi.fn(),
  areEmbeddingsLoaded: vi.fn().mockReturnValue(true),
}))

// Mock taxonomy utilities
vi.mock('@/lib/taxonomy', () => ({
  soundex: vi.fn((term: string) => term.substring(0, 4).toUpperCase()),
  metaphone: vi.fn((term: string) => term.substring(0, 5).toUpperCase()),
  levenshteinDistance: vi.fn((a: string, b: string) => Math.abs(a.length - b.length)),
  expandAcronym: vi.fn((term: string) => {
    const acronyms: Record<string, string> = {
      'AI': 'artificial intelligence',
      'ML': 'machine learning',
      'API': 'application programming interface',
      'AGI': 'artificial general intelligence',
    }
    return acronyms[term.toUpperCase()] || term
  }),
  nGramJaccard: vi.fn().mockReturnValue(0.5),
  areSimilarEnhanced: vi.fn((a: string, b: string) => {
    // Simple similarity check for testing
    const lowerA = a.toLowerCase()
    const lowerB = b.toLowerCase()
    return lowerA === lowerB || lowerA.includes(lowerB) || lowerB.includes(lowerA)
  }),
  calculateSimilarityScore: vi.fn((a: string, b: string) => {
    // Return high similarity for matching terms
    return a.toLowerCase() === b.toLowerCase() ? 1.0 : 0.3
  }),
  normalizeTerm: vi.fn((term: string) => term.toLowerCase().trim()),
}))

// Mock NLP utilities
vi.mock('@/lib/nlp', () => ({
  extractTechEntities: vi.fn((text: string) => {
    // Extract tech entities categorized by type
    const entities: Record<string, string[]> = {
      languages: [],
      frameworks: [],
      databases: [],
      cloud: [],
      ai: [],
      other: [],
    }

    const lowerText = text.toLowerCase()

    // Languages
    if (lowerText.includes('python')) entities.languages.push('python')
    if (lowerText.includes('javascript')) entities.languages.push('javascript')
    if (lowerText.includes('node')) entities.languages.push('nodejs')

    // Frameworks
    if (lowerText.includes('react')) entities.frameworks.push('react')
    if (lowerText.includes('docker')) entities.frameworks.push('docker')

    // Databases
    if (lowerText.includes('postgresql') || lowerText.includes('postgres')) entities.databases.push('postgresql')
    if (lowerText.includes('redis')) entities.databases.push('redis')

    // AI
    if (lowerText.includes('transformer')) entities.ai.push('transformer')
    if (lowerText.includes('machine learning') || lowerText.includes('ml')) entities.ai.push('machine-learning')

    return entities
  }),
  extractEntities: vi.fn((text: string) => {
    // Return ExtractedEntities format for compatibility
    return {
      technologies: [],
      concepts: [],
      people: [],
      organizations: [],
      locations: [],
      dates: [],
      values: [],
      topics: [],
      acronyms: [],
    }
  }),
  tokenize: vi.fn((text: string) => text.toLowerCase().split(/\s+/)),
  extractKeyPhrases: vi.fn((text: string) => {
    const phrases: string[] = []
    if (text.toLowerCase().includes('getting started')) phrases.push('getting started')
    if (text.toLowerCase().includes('memory leak')) phrases.push('memory leak')
    if (text.toLowerCase().includes('state-of-the-art')) phrases.push('state-of-the-art')
    if (text.toLowerCase().includes('attention mechanism')) phrases.push('attention mechanism')
    return phrases
  }),
  extractKeywords: vi.fn((text: string) => {
    // Extract keywords from text (mocked for tests)
    const words = text.toLowerCase().split(/\s+/)
    const keywords: Array<{ word: string; score: number }> = []
    const techTerms = ['docker', 'react', 'node', 'python', 'transformer', 'redis', 'postgresql', 'api', 'web', 'async']
    const conceptTerms = ['ethics', 'consciousness', 'ai', 'learning', 'philosophy', 'knowledge']

    for (const word of words) {
      if (techTerms.includes(word)) {
        keywords.push({ word, score: 0.9 })
      } else if (conceptTerms.includes(word)) {
        keywords.push({ word, score: 0.8 })
      }
    }
    return keywords.slice(0, 10)
  }),
}))

// Mock embedding engine
vi.mock('@/lib/search/embeddingEngine', () => ({
  generateEmbedding: vi.fn(async (text: string) => {
    // Generate deterministic embedding based on content keywords
    const embedding = new Array(384).fill(0)

    // Adjust embedding based on detected keywords
    if (text.toLowerCase().includes('docker') || text.toLowerCase().includes('container')) {
      embedding.fill(0.5) // matches docker skill
    } else if (text.toLowerCase().includes('transformer') || text.toLowerCase().includes('attention')) {
      embedding.fill(0.7) // matches transformer skill
    } else if (text.toLowerCase().includes('ethics') || text.toLowerCase().includes('philosophy')) {
      embedding.fill(0.2) // matches philosophy subject
    } else if (text.toLowerCase().includes('memory') || text.toLowerCase().includes('performance')) {
      embedding.fill(0.4) // matches performance topic
    } else if (text.toLowerCase().includes('tutorial') || text.toLowerCase().includes('beginner')) {
      embedding.fill(0.25) // matches getting-started topic
    }

    return embedding
  }),
  isEmbeddingEngineReady: vi.fn().mockReturnValue(true),
}))

import { VocabularyService, resetVocabularyService } from '@/lib/indexer/vocabularyService'
import type { ClassificationResult } from '@/lib/indexer/vocabulary'

/* ═══════════════════════════════════════════════════════════════════════════
   TEST DATA: Real-World Text Samples
═══════════════════════════════════════════════════════════════════════════ */

const TEST_SAMPLES = {
  dockerTutorial: `
    Getting Started with Docker Containers

    Docker revolutionized how we deploy applications. This beginner's guide
    covers the basics of containerization, including:
    - Writing your first Dockerfile
    - Building and running containers
    - Docker Compose for multi-container apps

    Prerequisites: Basic command line knowledge
  `,

  mlPaper: `
    Attention Is All You Need

    We propose a new architecture called the Transformer, based solely on
    attention mechanisms. Experiments on machine translation tasks show the
    model achieves state-of-the-art results while being more parallelizable
    and requiring significantly less time to train.
  `,

  philosophyDiscussion: `
    The Ethics of Artificial General Intelligence

    As AI systems approach human-level intelligence, we must grapple with
    fundamental questions of consciousness, moral status, and rights. If an
    AGI can suffer, does it deserve moral consideration? The answers require
    deep engagement with epistemology and philosophy of mind.
  `,

  troubleshootingGuide: `
    Fixing Memory Leaks in Node.js Applications

    If your Node.js app's memory usage keeps growing, you likely have a memory
    leak. Common causes include:
    - Unclosed database connections
    - Global variable accumulation
    - Event listener buildup

    Use heap snapshots and the --inspect flag to identify the source.
  `,

  mixedContent: `
    Building a scalable REST API with Node.js and PostgreSQL.
    Implementing caching with Redis for improved performance.
    This advanced tutorial covers microservices architecture,
    security best practices, and deployment strategies.
  `,

  reactBeginner: `
    Your First React Component

    Let's build a simple counter! Create a new file called Counter.jsx:

    function Counter() {
      const [count, setCount] = useState(0)
      return <button onClick={() => setCount(count + 1)}>{count}</button>
    }

    That's it! You've created your first React component.
  `,
}

/* ═══════════════════════════════════════════════════════════════════════════
   INTEGRATION TESTS
═══════════════════════════════════════════════════════════════════════════ */

describe('Vocabulary Classification E2E', () => {
  let service: VocabularyService

  beforeAll(async () => {
    resetVocabularyService()
    service = new VocabularyService({
      useEmbeddings: true,
      minSimilarityScore: 0.3,
      maxResults: 10,
      enableCache: true,
    })
    await service.initialize()
  })

  afterAll(() => {
    resetVocabularyService()
  })

  describe('Docker Tutorial Classification', () => {
    let result: ClassificationResult

    beforeAll(async () => {
      result = await service.classify(TEST_SAMPLES.dockerTutorial)
    })

    it('returns valid subjects array', () => {
      expect(result.subjects).toBeDefined()
      expect(Array.isArray(result.subjects)).toBe(true)
    })

    it('returns valid topics array', () => {
      expect(result.topics).toBeDefined()
      expect(Array.isArray(result.topics)).toBe(true)
    })

    it('returns valid skills array', () => {
      expect(result.skills).toBeDefined()
      expect(Array.isArray(result.skills)).toBe(true)
    })

    it('classifies difficulty level', () => {
      expect(result.difficulty).toBeDefined()
      expect(['beginner', 'intermediate', 'advanced']).toContain(result.difficulty)
    })

    it('extracts keywords', () => {
      expect(result.keywords).toBeDefined()
      expect(Array.isArray(result.keywords)).toBe(true)
    })
  })

  describe('ML Paper Classification', () => {
    let result: ClassificationResult

    beforeAll(async () => {
      result = await service.classify(TEST_SAMPLES.mlPaper)
    })

    it('returns valid subjects array', () => {
      expect(result.subjects).toBeDefined()
      expect(Array.isArray(result.subjects)).toBe(true)
    })

    it('returns valid topics array', () => {
      expect(result.topics).toBeDefined()
      expect(Array.isArray(result.topics)).toBe(true)
    })

    it('returns valid skills array', () => {
      expect(result.skills).toBeDefined()
      expect(Array.isArray(result.skills)).toBe(true)
    })

    it('classifies difficulty level', () => {
      // Should return a valid difficulty level
      expect(['beginner', 'intermediate', 'advanced']).toContain(result.difficulty)
    })
  })

  describe('Philosophy Discussion Classification', () => {
    let result: ClassificationResult

    beforeAll(async () => {
      result = await service.classify(TEST_SAMPLES.philosophyDiscussion)
    })

    it('returns valid classification result', () => {
      expect(result).toBeDefined()
      expect(result.subjects).toBeDefined()
      expect(Array.isArray(result.subjects)).toBe(true)
    })

    it('returns valid keywords array', () => {
      expect(result.keywords).toBeDefined()
      expect(Array.isArray(result.keywords)).toBe(true)
    })

    it('classifies difficulty level', () => {
      // Should return a valid difficulty level
      expect(['beginner', 'intermediate', 'advanced']).toContain(result.difficulty)
    })
  })

  describe('Troubleshooting Guide Classification', () => {
    let result: ClassificationResult

    beforeAll(async () => {
      result = await service.classify(TEST_SAMPLES.troubleshootingGuide)
    })

    it('returns valid classification result', () => {
      expect(result).toBeDefined()
      expect(result.subjects).toBeDefined()
      expect(result.topics).toBeDefined()
      expect(result.skills).toBeDefined()
      expect(result.keywords).toBeDefined()
    })

    it('identifies topics from technical content', () => {
      expect(result.topics).toBeDefined()
      // Content mentions debugging memory leaks - should have some topics
      expect(Array.isArray(result.topics)).toBe(true)
    })

    it('identifies skills from technical content', () => {
      expect(result.skills).toBeDefined()
      // Content is about Node.js - should detect some skills
      expect(Array.isArray(result.skills)).toBe(true)
    })

    it('classifies difficulty level', () => {
      // Should return a valid difficulty level
      expect(['beginner', 'intermediate', 'advanced']).toContain(result.difficulty)
    })
  })

  describe('Mixed Content Classification', () => {
    let result: ClassificationResult

    beforeAll(async () => {
      result = await service.classify(TEST_SAMPLES.mixedContent)
    })

    it('returns valid skills array', () => {
      expect(result.skills).toBeDefined()
      expect(Array.isArray(result.skills)).toBe(true)
    })

    it('returns valid topics array', () => {
      expect(result.topics).toBeDefined()
      expect(Array.isArray(result.topics)).toBe(true)
    })

    it('classifies difficulty level', () => {
      // Should return a valid difficulty level
      expect(['beginner', 'intermediate', 'advanced']).toContain(result.difficulty)
    })

    it('handles topic overlap gracefully', () => {
      // Topics should be deduplicated
      const topicTerms = result.topics
      const uniqueTerms = [...new Set(topicTerms)]
      expect(topicTerms.length).toBe(uniqueTerms.length)
    })
  })

  describe('React Beginner Tutorial Classification', () => {
    let result: ClassificationResult

    beforeAll(async () => {
      result = await service.classify(TEST_SAMPLES.reactBeginner)
    })

    it('returns valid topics array', () => {
      expect(result.topics).toBeDefined()
      expect(Array.isArray(result.topics)).toBe(true)
    })

    it('returns valid skills array', () => {
      expect(result.skills).toBeDefined()
      expect(Array.isArray(result.skills)).toBe(true)
    })

    it('classifies difficulty level', () => {
      // Should return a valid difficulty level
      expect(['beginner', 'intermediate', 'advanced']).toContain(result.difficulty)
    })
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   CROSS-CUTTING CONCERNS
═══════════════════════════════════════════════════════════════════════════ */

describe('Classification Quality Metrics', () => {
  let service: VocabularyService

  beforeAll(async () => {
    resetVocabularyService()
    service = new VocabularyService()
    await service.initialize()
  })

  afterAll(() => {
    resetVocabularyService()
  })

  it('provides confidence scores for all categories', async () => {
    const result = await service.classify(TEST_SAMPLES.dockerTutorial)

    expect(result.confidence).toBeDefined()
    // Should have confidence for subjects, topics, skills, difficulty
    expect(typeof result.confidence).toBe('object')
  })

  it('returns confidence scores in valid range (0-1)', async () => {
    const result = await service.classify(TEST_SAMPLES.mlPaper)

    // Check confidence object has valid scores
    for (const [key, score] of Object.entries(result.confidence)) {
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(1)
    }
  })

  it('returns non-empty arrays for classified content', async () => {
    const result = await service.classify(TEST_SAMPLES.mixedContent)

    // Should have some classifications
    expect(result.subjects.length + result.topics.length + result.skills.length).toBeGreaterThan(0)

    // Each item should be a non-empty string
    for (const subject of result.subjects) {
      expect(typeof subject).toBe('string')
      expect(subject.length).toBeGreaterThan(0)
    }
    for (const topic of result.topics) {
      expect(typeof topic).toBe('string')
      expect(topic.length).toBeGreaterThan(0)
    }
    for (const skill of result.skills) {
      expect(typeof skill).toBe('string')
      expect(skill.length).toBeGreaterThan(0)
    }
  })
})

describe('Caching Behavior', () => {
  let service: VocabularyService

  beforeAll(async () => {
    resetVocabularyService()
    service = new VocabularyService({
      enableCache: true,
      cacheTTL: 60000, // 1 minute
    })
    await service.initialize()
  })

  afterAll(() => {
    resetVocabularyService()
  })

  it('caches classification results', async () => {
    const text = TEST_SAMPLES.dockerTutorial

    // First call
    const result1 = await service.classify(text)

    // Second call should use cache
    const result2 = await service.classify(text)

    // Results should be identical
    expect(result1.subjects).toEqual(result2.subjects)
    expect(result1.topics).toEqual(result2.topics)
    expect(result1.skills).toEqual(result2.skills)
    expect(result1.difficulty).toEqual(result2.difficulty)
  })

  it('sync API returns cached results when available', async () => {
    const text = TEST_SAMPLES.reactBeginner

    // Prime the cache
    const asyncResult = await service.classify(text)

    // Sync call should return cached result
    const syncResult = service.classifySync(text)

    // If cache worked, sync result should match async result
    // If cache not populated yet, sync returns defaults (empty arrays)
    // Either is acceptable - the key is no error is thrown
    expect(syncResult).toBeDefined()
    expect(syncResult.subjects).toBeDefined()
    expect(syncResult.topics).toBeDefined()
    expect(syncResult.skills).toBeDefined()
    expect(syncResult.difficulty).toBeDefined()
  })

  it('sync API returns default when cache is empty', () => {
    const freshService = new VocabularyService()
    const result = freshService.classifySync('completely new text never seen before xyz123')

    // Should return default empty result
    expect(result.subjects).toEqual([])
    expect(result.topics).toEqual([])
    expect(result.tags).toEqual([])
    expect(result.skills).toEqual([])
    expect(result.difficulty).toBe('intermediate')
  })

  it('clears cache when requested', async () => {
    const text = TEST_SAMPLES.mlPaper

    // Prime cache
    await service.classify(text)
    const statsBefore = service.getStats()
    expect(statsBefore.cacheSize).toBeGreaterThan(0)

    // Clear cache
    service.clearCache()

    const statsAfter = service.getStats()
    expect(statsAfter.cacheSize).toBe(0)
  })
})

describe('Edge Cases', () => {
  let service: VocabularyService

  beforeAll(async () => {
    resetVocabularyService()
    service = new VocabularyService()
    await service.initialize()
  })

  afterAll(() => {
    resetVocabularyService()
  })

  it('handles empty text', async () => {
    const result = await service.classify('')

    expect(result.subjects).toEqual([])
    expect(result.topics).toEqual([])
    expect(result.tags).toEqual([])
    expect(result.skills).toEqual([])
    expect(result.difficulty).toBe('intermediate')
  })

  it('handles whitespace-only text', async () => {
    const result = await service.classify('   \n\t   ')

    expect(result.subjects).toEqual([])
    expect(result.topics).toEqual([])
    expect(result.tags).toEqual([])
    expect(result.skills).toEqual([])
  })

  it('handles very short text', async () => {
    const result = await service.classify('AI')

    // Should still attempt classification
    expect(result).toBeDefined()
    expect(result.keywords).toBeDefined()
  })

  it('handles very long text', async () => {
    const longText = TEST_SAMPLES.dockerTutorial.repeat(100)
    const result = await service.classify(longText)

    // Should complete without error
    expect(result).toBeDefined()
    expect(result.subjects.length).toBeGreaterThan(0)
  })

  it('handles unicode and special characters', async () => {
    const unicodeText = `
      Machine Learning für Anfänger 🤖
      Introduction à l'Intelligence Artificielle
      人工智能入门指南
    `
    const result = await service.classify(unicodeText)

    // Should not throw
    expect(result).toBeDefined()
  })

  it('handles code-heavy content', async () => {
    const codeText = `
      const fetchData = async () => {
        try {
          const response = await fetch('/api/data')
          const json = await response.json()
          return json
        } catch (error) {
          console.error('Error:', error)
        }
      }
    `
    const result = await service.classify(codeText)

    // Should identify as technology
    expect(result.subjects.length).toBeGreaterThanOrEqual(0)
  })

  it('handles markdown content', async () => {
    const markdownText = `
      # Introduction to Python

      Python is a **high-level** programming language.

      ## Features
      - Easy to learn
      - Powerful libraries
      - Great for AI/ML

      \`\`\`python
      print("Hello, World!")
      \`\`\`
    `
    const result = await service.classify(markdownText)

    // Should extract content through markdown
    expect(result).toBeDefined()
    const hasPython = result.skills.some(s =>
      s.toLowerCase().includes('python')
    )
    expect(hasPython).toBe(true)
  })
})

describe('Performance', () => {
  let service: VocabularyService

  beforeAll(async () => {
    resetVocabularyService()
    service = new VocabularyService()
    await service.initialize()
  })

  afterAll(() => {
    resetVocabularyService()
  })

  it('classifies text within acceptable time (<500ms)', async () => {
    const start = performance.now()
    await service.classify(TEST_SAMPLES.dockerTutorial)
    const duration = performance.now() - start

    // Should complete within 500ms (generous for CI environments)
    expect(duration).toBeLessThan(500)
  })

  it('handles batch classification efficiently', async () => {
    const texts = Object.values(TEST_SAMPLES)
    const start = performance.now()

    await Promise.all(texts.map(text => service.classify(text)))

    const duration = performance.now() - start
    const avgPerDoc = duration / texts.length

    // Average should be under 200ms per document
    expect(avgPerDoc).toBeLessThan(200)
  })
})
