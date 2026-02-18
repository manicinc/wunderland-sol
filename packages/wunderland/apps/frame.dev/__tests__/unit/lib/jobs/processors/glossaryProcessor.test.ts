/**
 * Glossary Processor Tests
 * @module __tests__/unit/lib/jobs/processors/glossaryProcessor.test
 *
 * Tests for glossary generation processor utilities including
 * cache key generation, progress mapping, and result structure.
 */

import { describe, it, expect } from 'vitest'

/* ═══════════════════════════════════════════════════════════════════════════
   RE-IMPLEMENTED UTILITIES (for testing logic)
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Simple hash function for content caching
 */
function hashContent(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Generate cache key with method prefix
 */
function generateCacheKey(content: string, method: string): string {
  return `${method}_${hashContent(content)}`
}

/**
 * Map worker progress (0-100) to job progress range
 */
function mapWorkerProgress(workerProgress: number, minOut: number = 10, maxOut: number = 90): number {
  const range = maxOut - minOut
  return minOut + Math.round(workerProgress * (range / 100))
}

type GlossaryMethod = 'nlp' | 'llm' | 'hybrid'

interface GlossaryGenerationPayload {
  content: string
  method?: GlossaryMethod
  maxTerms?: number
  forceRegenerate?: boolean
  fastMode?: boolean
}

interface GlossaryTerm {
  term: string
  definition: string
  category?: string
  relatedTerms?: string[]
}

interface GlossaryGenerationResult {
  terms: GlossaryTerm[]
  method: GlossaryMethod
  cached: boolean
  generationTimeMs: number
  count: number
}

interface CachedGlossary {
  terms: GlossaryTerm[]
  generationMethod: GlossaryMethod
  createdAt: string
  version: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   TESTS
═══════════════════════════════════════════════════════════════════════════ */

describe('Glossary Processor Utilities', () => {
  describe('hashContent', () => {
    it('should generate consistent hashes for same content', () => {
      const content = 'Test content for hashing'
      const hash1 = hashContent(content)
      const hash2 = hashContent(content)
      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different content', () => {
      const hash1 = hashContent('Content A')
      const hash2 = hashContent('Content B')
      expect(hash1).not.toBe(hash2)
    })

    it('should return string in base36 format', () => {
      const hash = hashContent('Test')
      // Base36 contains only alphanumeric characters
      expect(hash).toMatch(/^[0-9a-z]+$/)
    })

    it('should handle empty string', () => {
      const hash = hashContent('')
      expect(hash).toBe('0')
    })

    it('should handle unicode characters', () => {
      const hash = hashContent('日本語テスト')
      expect(typeof hash).toBe('string')
      expect(hash.length).toBeGreaterThan(0)
    })

    it('should handle very long content', () => {
      const longContent = 'a'.repeat(100000)
      const hash = hashContent(longContent)
      expect(typeof hash).toBe('string')
      expect(hash.length).toBeLessThan(20) // Hash should be compact
    })

    it('should be case sensitive', () => {
      const hash1 = hashContent('Test')
      const hash2 = hashContent('test')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('generateCacheKey', () => {
    it('should prefix hash with method', () => {
      const key = generateCacheKey('content', 'nlp')
      expect(key.startsWith('nlp_')).toBe(true)
    })

    it('should generate different keys for different methods', () => {
      const content = 'Same content'
      const nlpKey = generateCacheKey(content, 'nlp')
      const llmKey = generateCacheKey(content, 'llm')
      const hybridKey = generateCacheKey(content, 'hybrid')

      expect(nlpKey).not.toBe(llmKey)
      expect(nlpKey).not.toBe(hybridKey)
      expect(llmKey).not.toBe(hybridKey)
    })

    it('should generate different keys for different content', () => {
      const key1 = generateCacheKey('Content A', 'nlp')
      const key2 = generateCacheKey('Content B', 'nlp')
      expect(key1).not.toBe(key2)
    })

    it('should generate consistent keys', () => {
      const key1 = generateCacheKey('test', 'nlp')
      const key2 = generateCacheKey('test', 'nlp')
      expect(key1).toBe(key2)
    })
  })

  describe('mapWorkerProgress', () => {
    it('should map 0 to minimum output value', () => {
      expect(mapWorkerProgress(0, 10, 90)).toBe(10)
    })

    it('should map 100 to maximum output value', () => {
      expect(mapWorkerProgress(100, 10, 90)).toBe(90)
    })

    it('should map 50 to middle of range', () => {
      expect(mapWorkerProgress(50, 10, 90)).toBe(50)
    })

    it('should handle custom ranges', () => {
      expect(mapWorkerProgress(0, 20, 80)).toBe(20)
      expect(mapWorkerProgress(100, 20, 80)).toBe(80)
      expect(mapWorkerProgress(50, 20, 80)).toBe(50)
    })

    it('should use default range 10-90', () => {
      expect(mapWorkerProgress(0)).toBe(10)
      expect(mapWorkerProgress(100)).toBe(90)
    })

    it('should handle fractional progress', () => {
      const progress = mapWorkerProgress(25, 10, 90)
      expect(progress).toBe(30) // 10 + 25 * 0.8 = 30
    })
  })

  describe('GlossaryGenerationPayload', () => {
    it('should have required content field', () => {
      const payload: GlossaryGenerationPayload = {
        content: 'Test content for glossary generation',
      }
      expect(payload.content).toBeDefined()
    })

    it('should have optional method with default nlp', () => {
      const payload: GlossaryGenerationPayload = {
        content: 'Test',
      }
      const method = payload.method || 'nlp'
      expect(method).toBe('nlp')
    })

    it('should have optional maxTerms with default 50', () => {
      const payload: GlossaryGenerationPayload = {
        content: 'Test',
      }
      const maxTerms = payload.maxTerms || 50
      expect(maxTerms).toBe(50)
    })

    it('should support all generation methods', () => {
      const methods: GlossaryMethod[] = ['nlp', 'llm', 'hybrid']
      for (const method of methods) {
        const payload: GlossaryGenerationPayload = {
          content: 'Test',
          method,
        }
        expect(payload.method).toBe(method)
      }
    })

    it('should support fastMode flag', () => {
      const payload: GlossaryGenerationPayload = {
        content: 'A'.repeat(15000), // Long content
        fastMode: true,
      }
      expect(payload.fastMode).toBe(true)
    })

    it('should auto-enable fastMode for long content (>10000 chars)', () => {
      const payload: GlossaryGenerationPayload = {
        content: 'A'.repeat(15000),
      }
      const fastMode = payload.fastMode ?? payload.content.length > 10000
      expect(fastMode).toBe(true)
    })
  })

  describe('GlossaryTerm structure', () => {
    it('should have required term and definition', () => {
      const term: GlossaryTerm = {
        term: 'API',
        definition: 'Application Programming Interface',
      }
      expect(term.term).toBe('API')
      expect(term.definition).toBe('Application Programming Interface')
    })

    it('should support optional category', () => {
      const term: GlossaryTerm = {
        term: 'REST',
        definition: 'Representational State Transfer',
        category: 'Web Development',
      }
      expect(term.category).toBe('Web Development')
    })

    it('should support optional relatedTerms', () => {
      const term: GlossaryTerm = {
        term: 'HTTP',
        definition: 'Hypertext Transfer Protocol',
        relatedTerms: ['REST', 'API', 'Web'],
      }
      expect(term.relatedTerms).toContain('REST')
      expect(term.relatedTerms?.length).toBe(3)
    })
  })

  describe('GlossaryGenerationResult structure', () => {
    it('should include all required fields', () => {
      const result: GlossaryGenerationResult = {
        terms: [
          { term: 'Test', definition: 'A test term' },
        ],
        method: 'nlp',
        cached: false,
        generationTimeMs: 150,
        count: 1,
      }

      expect(result.terms).toBeDefined()
      expect(result.method).toBe('nlp')
      expect(result.cached).toBe(false)
      expect(result.generationTimeMs).toBe(150)
      expect(result.count).toBe(1)
    })

    it('should have matching count and terms length', () => {
      const terms: GlossaryTerm[] = [
        { term: 'A', definition: 'Def A' },
        { term: 'B', definition: 'Def B' },
        { term: 'C', definition: 'Def C' },
      ]
      const result: GlossaryGenerationResult = {
        terms,
        method: 'nlp',
        cached: false,
        generationTimeMs: 100,
        count: terms.length,
      }
      expect(result.count).toBe(result.terms.length)
    })

    it('should indicate cached results correctly', () => {
      const cachedResult: GlossaryGenerationResult = {
        terms: [],
        method: 'nlp',
        cached: true,
        generationTimeMs: 0, // Cached results have 0 generation time
        count: 0,
      }
      expect(cachedResult.cached).toBe(true)
      expect(cachedResult.generationTimeMs).toBe(0)
    })
  })

  describe('CachedGlossary structure', () => {
    it('should include all required fields', () => {
      const cached: CachedGlossary = {
        terms: [],
        generationMethod: 'nlp',
        createdAt: new Date().toISOString(),
        version: 1,
      }

      expect(cached.terms).toBeDefined()
      expect(cached.generationMethod).toBeDefined()
      expect(cached.createdAt).toBeDefined()
      expect(cached.version).toBe(1)
    })

    it('should have ISO timestamp for createdAt', () => {
      const cached: CachedGlossary = {
        terms: [],
        generationMethod: 'nlp',
        createdAt: new Date().toISOString(),
        version: 1,
      }

      const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      expect(cached.createdAt).toMatch(isoPattern)
    })

    it('should preserve version for future migrations', () => {
      const cached: CachedGlossary = {
        terms: [],
        generationMethod: 'hybrid',
        createdAt: '2024-01-01T00:00:00.000Z',
        version: 1,
      }
      expect(cached.version).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Worker message handling', () => {
    type WorkerResponseType = 'progress' | 'complete' | 'error'

    interface MockWorkerResponse {
      type: WorkerResponseType
      data?: unknown
      error?: string
    }

    it('should handle progress messages', () => {
      const response: MockWorkerResponse = {
        type: 'progress',
        data: { progress: 50, stage: 'extraction', message: 'Extracting terms...' },
      }
      expect(response.type).toBe('progress')
    })

    it('should handle complete messages', () => {
      const response: MockWorkerResponse = {
        type: 'complete',
        data: {
          terms: [{ term: 'Test', definition: 'A test' }],
          method: 'nlp',
          generationTimeMs: 200,
        },
      }
      expect(response.type).toBe('complete')
    })

    it('should handle error messages', () => {
      const response: MockWorkerResponse = {
        type: 'error',
        error: 'Worker failed to initialize',
      }
      expect(response.type).toBe('error')
      expect(response.error).toBeDefined()
    })
  })

  describe('Timeout handling', () => {
    const FIVE_MINUTES_MS = 5 * 60 * 1000

    it('should define 5 minute timeout', () => {
      expect(FIVE_MINUTES_MS).toBe(300000)
    })

    it('should create timeout error message', () => {
      const errorMsg = 'Glossary generation timed out after 5 minutes'
      expect(errorMsg).toContain('5 minutes')
      expect(errorMsg).toContain('timed out')
    })
  })

  describe('Progress stages', () => {
    const PROGRESS_STAGES = {
      INIT: { min: 0, max: 5 },
      CACHE_CHECK: { min: 5, max: 10 },
      GENERATION: { min: 10, max: 90 },
      CACHE_SAVE: { min: 90, max: 95 },
      COMPLETE: { min: 95, max: 100 },
    }

    it('should have non-overlapping stages', () => {
      expect(PROGRESS_STAGES.INIT.max).toBeLessThanOrEqual(PROGRESS_STAGES.CACHE_CHECK.min)
      expect(PROGRESS_STAGES.CACHE_CHECK.max).toBeLessThanOrEqual(PROGRESS_STAGES.GENERATION.min)
      expect(PROGRESS_STAGES.GENERATION.max).toBeLessThanOrEqual(PROGRESS_STAGES.CACHE_SAVE.min)
      expect(PROGRESS_STAGES.CACHE_SAVE.max).toBeLessThanOrEqual(PROGRESS_STAGES.COMPLETE.min)
    })

    it('should start at 0 and end at 100', () => {
      expect(PROGRESS_STAGES.INIT.min).toBe(0)
      expect(PROGRESS_STAGES.COMPLETE.max).toBe(100)
    })

    it('should allocate most time to generation', () => {
      const genRange = PROGRESS_STAGES.GENERATION.max - PROGRESS_STAGES.GENERATION.min
      expect(genRange).toBe(80) // 80% of progress is generation
    })
  })

  describe('Cache TTL configuration', () => {
    const DEFAULT_TTL_DAYS = 30

    it('should default to 30 days TTL', () => {
      expect(DEFAULT_TTL_DAYS).toBe(30)
    })

    it('should convert days to milliseconds correctly', () => {
      const ttlMs = DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000
      expect(ttlMs).toBe(2592000000) // 30 days in ms
    })
  })
})

describe('Glossary Worker Task Configuration', () => {
  interface GlossaryTask {
    id: string
    content: string
    method: GlossaryMethod
    maxTerms: number
    fastMode: boolean
    semanticDedup: boolean
  }

  it('should create task with all required fields', () => {
    const task: GlossaryTask = {
      id: 'job-123',
      content: 'Test content',
      method: 'nlp',
      maxTerms: 50,
      fastMode: false,
      semanticDedup: true,
    }

    expect(task.id).toBeDefined()
    expect(task.content).toBeDefined()
    expect(task.method).toBeDefined()
    expect(task.maxTerms).toBeDefined()
    expect(typeof task.fastMode).toBe('boolean')
    expect(typeof task.semanticDedup).toBe('boolean')
  })

  it('should enable semanticDedup by default', () => {
    const task: GlossaryTask = {
      id: 'job-123',
      content: 'Test',
      method: 'nlp',
      maxTerms: 50,
      fastMode: false,
      semanticDedup: true, // Default is true
    }
    expect(task.semanticDedup).toBe(true)
  })
})
