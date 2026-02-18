/**
 * Tests for Flashcard Cache Service
 * @module __tests__/unit/generation/flashcardCache.test
 *
 * Tests persistent caching for generated flashcards with TTL support.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock database
const mockDbAll = vi.fn()
const mockDbRun = vi.fn()
const mockGetDatabase = vi.fn()

vi.mock('@/lib/codexDatabase', () => ({
  getDatabase: () => mockGetDatabase(),
}))

import {
  hashContent,
  generateCacheKey,
  getFromCache,
  saveToCache,
  invalidateCache,
  cleanupExpired,
  getCacheStats,
  resetStats,
  isCached,
  getCacheAge,
  getCachedForStrand,
  getAllCachedFlashcards,
  type CachedFlashcards,
} from '@/lib/generation/flashcardCache'

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockDb() {
  return {
    all: mockDbAll,
    run: mockDbRun,
  }
}

function createMockCachedFlashcards(overrides: Partial<CachedFlashcards> = {}): CachedFlashcards {
  return {
    cards: [
      {
        id: 'fc-1',
        type: 'basic',
        front: 'What is X?',
        back: 'X is Y',
        tags: ['test'],
        source: 'static',
        confidence: 0.9,
      },
    ],
    generationMethod: 'static',
    strandSlug: 'test-strand',
    createdAt: new Date().toISOString(),
    version: 1,
    ...overrides,
  }
}

// ============================================================================
// HASHING TESTS
// ============================================================================

describe('hashContent', () => {
  it('returns consistent hash for same input', () => {
    const content = 'test content'
    const hash1 = hashContent(content)
    const hash2 = hashContent(content)

    expect(hash1).toBe(hash2)
  })

  it('returns different hash for different input', () => {
    const hash1 = hashContent('content A')
    const hash2 = hashContent('content B')

    expect(hash1).not.toBe(hash2)
  })

  it('returns 8-character hex string', () => {
    const hash = hashContent('test')

    expect(hash).toMatch(/^[0-9a-f]{8}$/)
  })

  it('handles empty string', () => {
    const hash = hashContent('')

    expect(hash).toBeDefined()
    expect(hash).toMatch(/^[0-9a-f]{8}$/)
  })

  it('handles long content', () => {
    const longContent = 'a'.repeat(10000)
    const hash = hashContent(longContent)

    expect(hash).toMatch(/^[0-9a-f]{8}$/)
  })

  it('handles unicode content', () => {
    const hash = hashContent('こんにちは世界')

    expect(hash).toMatch(/^[0-9a-f]{8}$/)
  })

  it('is case-sensitive', () => {
    const hashLower = hashContent('test')
    const hashUpper = hashContent('TEST')

    expect(hashLower).not.toBe(hashUpper)
  })
})

describe('generateCacheKey', () => {
  it('includes strand slug in key', () => {
    const key = generateCacheKey('content', 'my-strand', false)

    expect(key).toContain('my-strand')
  })

  it('includes method (static/llm) in key', () => {
    const staticKey = generateCacheKey('content', 'strand', false)
    const llmKey = generateCacheKey('content', 'strand', true)

    expect(staticKey).toContain('_static_')
    expect(llmKey).toContain('_llm_')
  })

  it('starts with fc_ prefix', () => {
    const key = generateCacheKey('content', 'strand', false)

    expect(key).toMatch(/^fc_/)
  })

  it('includes content hash at end', () => {
    const key = generateCacheKey('content', 'strand', false)
    const parts = key.split('_')
    const hash = parts[parts.length - 1]

    expect(hash).toMatch(/^[0-9a-f]{8}$/)
  })

  it('different content produces different keys', () => {
    const key1 = generateCacheKey('content A', 'strand', false)
    const key2 = generateCacheKey('content B', 'strand', false)

    expect(key1).not.toBe(key2)
  })

  it('different strands produce different keys', () => {
    const key1 = generateCacheKey('content', 'strand-1', false)
    const key2 = generateCacheKey('content', 'strand-2', false)

    expect(key1).not.toBe(key2)
  })
})

// ============================================================================
// CACHE OPERATIONS TESTS
// ============================================================================

describe('getFromCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStats()
  })

  it('returns null when database is unavailable', async () => {
    mockGetDatabase.mockReturnValue(null)

    const result = await getFromCache('hash123')

    expect(result).toBeNull()
  })

  it('returns null when no cache entry found', async () => {
    mockGetDatabase.mockReturnValue(createMockDb())
    mockDbAll.mockResolvedValue([])

    const result = await getFromCache('hash123')

    expect(result).toBeNull()
    expect(mockDbAll).toHaveBeenCalledWith(
      expect.stringContaining('SELECT'),
      ['hash123']
    )
  })

  it('returns cached data when found', async () => {
    const mockData = createMockCachedFlashcards()
    mockGetDatabase.mockReturnValue(createMockDb())
    mockDbAll.mockResolvedValue([
      {
        flashcard_data: JSON.stringify(mockData),
        generation_method: 'static',
        strand_slug: 'test-strand',
        created_at: new Date().toISOString(),
        version: 1,
        expires_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      },
    ])

    const result = await getFromCache('hash123')

    expect(result).not.toBeNull()
    expect(result?.cards).toBeDefined()
    expect(result?.generationMethod).toBe('static')
  })

  it('deletes and returns null for expired entries', async () => {
    const mockData = createMockCachedFlashcards()
    mockGetDatabase.mockReturnValue(createMockDb())
    mockDbAll.mockResolvedValue([
      {
        flashcard_data: JSON.stringify(mockData),
        generation_method: 'static',
        strand_slug: 'test-strand',
        created_at: new Date().toISOString(),
        version: 1,
        expires_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday (expired)
      },
    ])
    mockDbRun.mockResolvedValue({ changes: 1 })

    const result = await getFromCache('hash123')

    expect(result).toBeNull()
    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('DELETE'),
      ['hash123']
    )
  })

  it('handles database errors gracefully', async () => {
    mockGetDatabase.mockReturnValue(createMockDb())
    mockDbAll.mockRejectedValue(new Error('DB error'))

    const result = await getFromCache('hash123')

    expect(result).toBeNull()
  })
})

describe('saveToCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns false when database is unavailable', async () => {
    mockGetDatabase.mockReturnValue(null)

    const result = await saveToCache('hash', 'strand', createMockCachedFlashcards())

    expect(result).toBe(false)
  })

  it('inserts data with correct parameters', async () => {
    mockGetDatabase.mockReturnValue(createMockDb())
    mockDbRun.mockResolvedValue({ changes: 1 })
    const mockData = createMockCachedFlashcards()

    const result = await saveToCache('hash123', 'my-strand', mockData)

    expect(result).toBe(true)
    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO flashcard_cache'),
      expect.arrayContaining([
        'hash123',
        'my-strand',
        expect.any(String), // JSON data
        'static',
        1, // card count
        expect.any(String), // created_at
        expect.any(String), // expires_at
        1, // version
      ])
    )
  })

  it('uses default TTL of 30 days', async () => {
    mockGetDatabase.mockReturnValue(createMockDb())
    mockDbRun.mockResolvedValue({ changes: 1 })

    await saveToCache('hash', 'strand', createMockCachedFlashcards())

    const callArgs = mockDbRun.mock.calls[0][1]
    const expiresAt = new Date(callArgs[6])
    const createdAt = new Date(callArgs[5])
    const diffDays = (expiresAt.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000)

    expect(Math.round(diffDays)).toBe(30)
  })

  it('uses custom TTL when provided', async () => {
    mockGetDatabase.mockReturnValue(createMockDb())
    mockDbRun.mockResolvedValue({ changes: 1 })

    await saveToCache('hash', 'strand', createMockCachedFlashcards(), 7)

    const callArgs = mockDbRun.mock.calls[0][1]
    const expiresAt = new Date(callArgs[6])
    const createdAt = new Date(callArgs[5])
    const diffDays = (expiresAt.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000)

    expect(Math.round(diffDays)).toBe(7)
  })

  it('returns false on database error', async () => {
    mockGetDatabase.mockReturnValue(createMockDb())
    mockDbRun.mockRejectedValue(new Error('DB error'))

    const result = await saveToCache('hash', 'strand', createMockCachedFlashcards())

    expect(result).toBe(false)
  })
})

describe('invalidateCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 0 when database is unavailable', async () => {
    mockGetDatabase.mockReturnValue(null)

    const result = await invalidateCache('hash')

    expect(result.deleted).toBe(0)
  })

  it('deletes by content hash', async () => {
    mockGetDatabase.mockReturnValue(createMockDb())
    mockDbRun.mockResolvedValue({ changes: 1 })

    const result = await invalidateCache('hash123')

    expect(result.deleted).toBe(1)
    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM flashcard_cache WHERE content_hash'),
      ['hash123']
    )
  })

  it('deletes by strand slug', async () => {
    mockGetDatabase.mockReturnValue(createMockDb())
    mockDbAll.mockResolvedValue([{ count: 5 }])
    mockDbRun.mockResolvedValue({ changes: 5 })

    const result = await invalidateCache(undefined, 'my-strand')

    expect(result.deleted).toBe(5)
    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM flashcard_cache WHERE strand_slug'),
      ['my-strand']
    )
  })

  it('deletes all entries when no filter provided', async () => {
    mockGetDatabase.mockReturnValue(createMockDb())
    mockDbAll.mockResolvedValue([{ count: 10 }])
    mockDbRun.mockResolvedValue({ changes: 10 })

    const result = await invalidateCache()

    expect(result.deleted).toBe(10)
    expect(mockDbRun).toHaveBeenCalledWith(
      'DELETE FROM flashcard_cache'
    )
  })

  it('handles database error gracefully', async () => {
    mockGetDatabase.mockReturnValue(createMockDb())
    mockDbRun.mockRejectedValue(new Error('DB error'))

    const result = await invalidateCache('hash')

    expect(result.deleted).toBe(0)
  })
})

describe('cleanupExpired', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 0 when database is unavailable', async () => {
    mockGetDatabase.mockReturnValue(null)

    const result = await cleanupExpired()

    expect(result.deleted).toBe(0)
  })

  it('deletes expired entries', async () => {
    mockGetDatabase.mockReturnValue(createMockDb())
    mockDbAll.mockResolvedValue([{ count: 3 }])
    mockDbRun.mockResolvedValue({ changes: 3 })

    const result = await cleanupExpired()

    expect(result.deleted).toBe(3)
    expect(mockDbAll).toHaveBeenCalledWith(
      expect.stringContaining('expires_at <'),
      expect.any(Array)
    )
    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM flashcard_cache WHERE expires_at <'),
      expect.any(Array)
    )
  })
})

// ============================================================================
// STATISTICS TESTS
// ============================================================================

describe('getCacheStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbAll.mockReset()
    mockDbRun.mockReset()
    mockGetDatabase.mockReset()
    resetStats()
  })

  it('returns default stats when database is unavailable', async () => {
    mockGetDatabase.mockReturnValue(null)

    const stats = await getCacheStats()

    expect(stats.totalEntries).toBe(0)
    expect(stats.totalCards).toBe(0)
    expect(stats.hitCount).toBe(0)
    expect(stats.missCount).toBe(0)
    expect(stats.hitRate).toBe(0)
  })

  it('returns stats from database', async () => {
    mockGetDatabase.mockReturnValue(createMockDb())
    mockDbAll
      .mockResolvedValueOnce([{ count: 5, total_cards: 25 }]) // count query
      .mockResolvedValueOnce([{ created_at: '2024-01-01T00:00:00Z' }]) // oldest
      .mockResolvedValueOnce([{ created_at: '2024-12-01T00:00:00Z' }]) // newest

    const stats = await getCacheStats()

    expect(stats.totalEntries).toBe(5)
    expect(stats.totalCards).toBe(25)
    expect(stats.oldestEntry).toBe('2024-01-01T00:00:00Z')
    expect(stats.newestEntry).toBe('2024-12-01T00:00:00Z')
  })

  it('calculates hit rate correctly', async () => {
    mockGetDatabase.mockReturnValue(createMockDb())

    // Set up all mocks before making any calls
    // First: miss lookup (returns empty)
    // Second: hit lookup (returns data)
    // Third-Fifth: getCacheStats queries
    mockDbAll
      .mockResolvedValueOnce([]) // miss1 lookup
      .mockResolvedValueOnce([  // hit1 lookup
        {
          flashcard_data: JSON.stringify(createMockCachedFlashcards()),
          generation_method: 'static',
          strand_slug: 'test',
          created_at: new Date().toISOString(),
          version: 1,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        },
      ])
      .mockResolvedValueOnce([{ count: 1, total_cards: 5 }]) // stats count query
      .mockResolvedValueOnce([]) // oldest
      .mockResolvedValueOnce([]) // newest

    // Simulate cache miss
    await getFromCache('miss1')

    // Simulate cache hit
    await getFromCache('hit1')

    const stats = await getCacheStats()

    expect(stats.hitCount).toBe(1)
    expect(stats.missCount).toBe(1)
    expect(stats.hitRate).toBe(0.5)
  })
})

describe('resetStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbAll.mockReset()
    mockDbRun.mockReset()
    mockGetDatabase.mockReset()
    resetStats()
  })

  it('resets hit and miss counts', async () => {
    mockGetDatabase.mockReturnValue(createMockDb())

    // Set up all mocks upfront: 2 misses, then 3 for stats
    mockDbAll
      .mockResolvedValueOnce([]) // miss1
      .mockResolvedValueOnce([]) // miss2
      .mockResolvedValueOnce([{ count: 0, total_cards: 0 }]) // stats count
      .mockResolvedValueOnce([]) // oldest
      .mockResolvedValueOnce([]) // newest

    // Generate some misses
    await getFromCache('test1')
    await getFromCache('test2')

    // Reset the stats
    resetStats()

    const stats = await getCacheStats()

    expect(stats.hitCount).toBe(0)
    expect(stats.missCount).toBe(0)
  })
})

// ============================================================================
// HELPER FUNCTIONS TESTS
// ============================================================================

describe('isCached', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbAll.mockReset()
    mockDbRun.mockReset()
    mockGetDatabase.mockReset()
    resetStats()
  })

  it('returns true when entry exists', async () => {
    mockGetDatabase.mockReturnValue(createMockDb())
    mockDbAll.mockResolvedValueOnce([
      {
        flashcard_data: JSON.stringify(createMockCachedFlashcards()),
        generation_method: 'static',
        strand_slug: 'test',
        created_at: new Date().toISOString(),
        version: 1,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
    ])

    const result = await isCached('hash123')

    expect(result).toBe(true)
  })

  it('returns false when entry does not exist', async () => {
    mockGetDatabase.mockReturnValue(createMockDb())
    mockDbAll.mockResolvedValueOnce([])

    const result = await isCached('hash123')

    expect(result).toBe(false)
  })
})

describe('getCacheAge', () => {
  it('returns 0 for entry created today', () => {
    const now = new Date()
    const age = getCacheAge(now.toISOString())

    expect(age).toBe(0)
  })

  it('returns correct age for older entries', () => {
    const daysAgo = 7
    const pastDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
    const age = getCacheAge(pastDate.toISOString())

    expect(age).toBe(daysAgo)
  })
})

describe('getCachedForStrand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbAll.mockReset()
    mockDbRun.mockReset()
    mockGetDatabase.mockReset()
    resetStats()
  })

  it('returns empty array when database is unavailable', async () => {
    mockGetDatabase.mockReturnValue(null)

    const result = await getCachedForStrand('my-strand')

    expect(result).toEqual([])
  })

  it('returns cached entries for strand', async () => {
    const mockData = createMockCachedFlashcards()
    mockGetDatabase.mockReturnValue(createMockDb())
    mockDbAll.mockResolvedValueOnce([
      {
        flashcard_data: JSON.stringify(mockData),
        generation_method: 'static',
        strand_slug: 'my-strand',
        created_at: new Date().toISOString(),
        version: 1,
      },
      {
        flashcard_data: JSON.stringify(mockData),
        generation_method: 'llm',
        strand_slug: 'my-strand',
        created_at: new Date().toISOString(),
        version: 1,
      },
    ])

    const result = await getCachedForStrand('my-strand')

    expect(result).toHaveLength(2)
    expect(result[0].strandSlug).toBe('my-strand')
    expect(result[1].strandSlug).toBe('my-strand')
  })

  it('returns empty array when no entries found', async () => {
    mockGetDatabase.mockReturnValue(createMockDb())
    mockDbAll.mockResolvedValueOnce([])

    const result = await getCachedForStrand('unknown-strand')

    expect(result).toEqual([])
  })
})

describe('getAllCachedFlashcards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbAll.mockReset()
    mockDbRun.mockReset()
    mockGetDatabase.mockReset()
  })

  it('returns empty array when database is unavailable', async () => {
    mockGetDatabase.mockReturnValue(null)

    const result = await getAllCachedFlashcards()

    expect(result).toEqual([])
  })

  it('returns all cached entries', async () => {
    const mockData = createMockCachedFlashcards()
    mockGetDatabase.mockReturnValue(createMockDb())
    mockDbAll.mockResolvedValueOnce([
      {
        flashcard_data: JSON.stringify(mockData),
        generation_method: 'static',
        strand_slug: 'strand-1',
        created_at: new Date().toISOString(),
        version: 1,
      },
      {
        flashcard_data: JSON.stringify(mockData),
        generation_method: 'llm',
        strand_slug: 'strand-2',
        created_at: new Date().toISOString(),
        version: 1,
      },
    ])

    const result = await getAllCachedFlashcards()

    expect(result).toHaveLength(2)
  })

  it('handles database error gracefully', async () => {
    mockGetDatabase.mockReturnValue(createMockDb())
    mockDbAll.mockRejectedValue(new Error('DB error'))

    const result = await getAllCachedFlashcards()

    expect(result).toEqual([])
  })
})
