/**
 * Taxonomy Index Tests
 * @module __tests__/unit/lib/taxonomy/taxonomyIndex.test
 *
 * Tests for taxonomy index building and querying.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the database
vi.mock('@/lib/codexDatabase', () => ({
  getDatabase: vi.fn(),
}))

// Mock hierarchyEnforcer
vi.mock('@/lib/taxonomy/hierarchyEnforcer', () => ({
  findSimilarTerms: vi.fn((term: string, terms: string[]) => {
    // Simple mock: return terms that start with the same letter
    const normalized = term.toLowerCase()
    return terms.filter((t) => t.toLowerCase().startsWith(normalized[0]))
  }),
}))

// Mock hierarchyConfig
vi.mock('@/lib/taxonomy/hierarchyConfig', () => ({
  normalizeTerm: vi.fn((term: string) => term?.toLowerCase().trim() || ''),
  DEFAULT_TAXONOMY_CONFIG: {
    maxSubjectsPerDoc: 3,
    maxTopicsPerDoc: 5,
    similarityThreshold: 0.8,
  },
}))

// Import after mocking
import { getDatabase } from '@/lib/codexDatabase'
import {
  buildTaxonomyIndex,
  getAllSubjects,
  getAllTopics,
  getAllTags,
  findTermLevel,
  getTermsByFrequency,
  getTaxonomyIndex,
  invalidateTaxonomyIndex,
  updateIndexWithTerms,
} from '@/lib/taxonomy/taxonomyIndex'

const mockGetDatabase = vi.mocked(getDatabase)

// ============================================================================
// buildTaxonomyIndex
// ============================================================================

describe('buildTaxonomyIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    invalidateTaxonomyIndex()
  })

  it('returns empty index when database is null', async () => {
    mockGetDatabase.mockResolvedValue(null)

    const index = await buildTaxonomyIndex()

    expect(index.subjects.size).toBe(0)
    expect(index.topics.size).toBe(0)
    expect(index.tags.size).toBe(0)
    expect(index.builtAt).toBeInstanceOf(Date)
  })

  it('builds index from database rows', async () => {
    const mockDb = {
      all: vi.fn().mockResolvedValue([
        {
          path: '/doc1.md',
          subjects: '["Science", "Biology"]',
          topics: '["Evolution"]',
          tags: '["research", "important"]',
        },
        {
          path: '/doc2.md',
          subjects: '["Science"]',
          topics: '["Physics"]',
          tags: '["research"]',
        },
      ]),
    }
    mockGetDatabase.mockResolvedValue(mockDb as any)

    const index = await buildTaxonomyIndex()

    expect(index.subjects.size).toBe(2) // science, biology
    expect(index.topics.size).toBe(2) // evolution, physics
    expect(index.tags.size).toBe(2) // research, important
  })

  it('tracks document counts correctly', async () => {
    const mockDb = {
      all: vi.fn().mockResolvedValue([
        { path: '/doc1.md', subjects: '["Science"]', topics: null, tags: null },
        { path: '/doc2.md', subjects: '["Science"]', topics: null, tags: null },
        { path: '/doc3.md', subjects: '["Science"]', topics: null, tags: null },
      ]),
    }
    mockGetDatabase.mockResolvedValue(mockDb as any)

    const index = await buildTaxonomyIndex()
    const scienceEntry = index.subjects.get('science')

    expect(scienceEntry?.documentCount).toBe(3)
    expect(scienceEntry?.strandPaths).toHaveLength(3)
  })

  it('handles malformed JSON gracefully with warning', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const mockDb = {
      all: vi.fn().mockResolvedValue([
        { path: '/doc1.md', subjects: 'not valid json', topics: null, tags: null },
        { path: '/doc2.md', subjects: '["Valid"]', topics: null, tags: null },
      ]),
    }
    mockGetDatabase.mockResolvedValue(mockDb as any)

    const index = await buildTaxonomyIndex()

    // Should still process valid entries
    expect(index.subjects.size).toBe(1)
    // Should warn about malformed JSON
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[TaxonomyIndex] Failed to parse subjects'),
      expect.anything()
    )

    consoleWarnSpy.mockRestore()
  })

  it('handles database errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const mockDb = {
      all: vi.fn().mockRejectedValue(new Error('DB connection failed')),
    }
    mockGetDatabase.mockResolvedValue(mockDb as any)

    const index = await buildTaxonomyIndex()

    expect(index.subjects.size).toBe(0)
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})

// ============================================================================
// Index Query Functions
// ============================================================================

describe('getAllSubjects', () => {
  it('returns array of all subject terms', async () => {
    const mockDb = {
      all: vi.fn().mockResolvedValue([
        { path: '/doc1.md', subjects: '["Science", "Math"]', topics: null, tags: null },
      ]),
    }
    mockGetDatabase.mockResolvedValue(mockDb as any)

    const index = await buildTaxonomyIndex()
    const subjects = getAllSubjects(index)

    expect(subjects).toContain('science')
    expect(subjects).toContain('math')
    expect(subjects).toHaveLength(2)
  })
})

describe('getAllTopics', () => {
  it('returns array of all topic terms', async () => {
    const mockDb = {
      all: vi.fn().mockResolvedValue([
        { path: '/doc1.md', subjects: null, topics: '["Physics", "Chemistry"]', tags: null },
      ]),
    }
    mockGetDatabase.mockResolvedValue(mockDb as any)

    const index = await buildTaxonomyIndex()
    const topics = getAllTopics(index)

    expect(topics).toContain('physics')
    expect(topics).toContain('chemistry')
  })
})

describe('getAllTags', () => {
  it('returns array of all tag terms', async () => {
    const mockDb = {
      all: vi.fn().mockResolvedValue([
        { path: '/doc1.md', subjects: null, topics: null, tags: '["urgent", "review"]' },
      ]),
    }
    mockGetDatabase.mockResolvedValue(mockDb as any)

    const index = await buildTaxonomyIndex()
    const tags = getAllTags(index)

    expect(tags).toContain('urgent')
    expect(tags).toContain('review')
  })
})

describe('findTermLevel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    invalidateTaxonomyIndex()
  })

  it('finds term in subjects', async () => {
    const mockDb = {
      all: vi.fn().mockResolvedValue([
        { path: '/doc1.md', subjects: '["Science"]', topics: null, tags: null },
      ]),
    }
    mockGetDatabase.mockResolvedValue(mockDb as any)

    const index = await buildTaxonomyIndex()
    const result = findTermLevel(index, 'science')

    expect(result?.level).toBe('subject')
    expect(result?.entry.term).toBe('science')
  })

  it('finds term in topics', async () => {
    const mockDb = {
      all: vi.fn().mockResolvedValue([
        { path: '/doc1.md', subjects: null, topics: '["Evolution"]', tags: null },
      ]),
    }
    mockGetDatabase.mockResolvedValue(mockDb as any)

    const index = await buildTaxonomyIndex()
    const result = findTermLevel(index, 'evolution')

    expect(result?.level).toBe('topic')
  })

  it('finds term in tags', async () => {
    const mockDb = {
      all: vi.fn().mockResolvedValue([
        { path: '/doc1.md', subjects: null, topics: null, tags: '["urgent"]' },
      ]),
    }
    mockGetDatabase.mockResolvedValue(mockDb as any)

    const index = await buildTaxonomyIndex()
    const result = findTermLevel(index, 'urgent')

    expect(result?.level).toBe('tag')
  })

  it('returns null for unknown term', async () => {
    const mockDb = {
      all: vi.fn().mockResolvedValue([
        { path: '/doc1.md', subjects: '["Science"]', topics: null, tags: null },
      ]),
    }
    mockGetDatabase.mockResolvedValue(mockDb as any)

    const index = await buildTaxonomyIndex()
    const result = findTermLevel(index, 'unknown-term-xyz')

    expect(result).toBeNull()
  })
})

describe('getTermsByFrequency', () => {
  it('returns terms sorted by document count', async () => {
    const mockDb = {
      all: vi.fn().mockResolvedValue([
        { path: '/doc1.md', subjects: '["Popular"]', topics: null, tags: null },
        { path: '/doc2.md', subjects: '["Popular"]', topics: null, tags: null },
        { path: '/doc3.md', subjects: '["Popular"]', topics: null, tags: null },
        { path: '/doc4.md', subjects: '["Rare"]', topics: null, tags: null },
      ]),
    }
    mockGetDatabase.mockResolvedValue(mockDb as any)

    const index = await buildTaxonomyIndex()
    const sorted = getTermsByFrequency(index, 'subject')

    expect(sorted[0].term).toBe('popular')
    expect(sorted[0].documentCount).toBe(3)
    expect(sorted[1].term).toBe('rare')
    expect(sorted[1].documentCount).toBe(1)
  })

  it('respects limit parameter', async () => {
    const mockDb = {
      all: vi.fn().mockResolvedValue([
        { path: '/doc1.md', subjects: '["A", "B", "C", "D", "E"]', topics: null, tags: null },
      ]),
    }
    mockGetDatabase.mockResolvedValue(mockDb as any)

    const index = await buildTaxonomyIndex()
    const limited = getTermsByFrequency(index, 'subject', 2)

    expect(limited).toHaveLength(2)
  })
})

// ============================================================================
// Index Caching
// ============================================================================

describe('getTaxonomyIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    invalidateTaxonomyIndex()
  })

  it('caches index on subsequent calls', async () => {
    const mockDb = {
      all: vi.fn().mockResolvedValue([]),
    }
    mockGetDatabase.mockResolvedValue(mockDb as any)

    await getTaxonomyIndex()
    await getTaxonomyIndex()

    // Should only call database once due to caching
    expect(mockDb.all).toHaveBeenCalledTimes(1)
  })

  it('refreshes index when forceRefresh is true', async () => {
    const mockDb = {
      all: vi.fn().mockResolvedValue([]),
    }
    mockGetDatabase.mockResolvedValue(mockDb as any)

    await getTaxonomyIndex()
    await getTaxonomyIndex(true)

    expect(mockDb.all).toHaveBeenCalledTimes(2)
  })
})

describe('invalidateTaxonomyIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    invalidateTaxonomyIndex()
  })

  it('clears cached index', async () => {
    const mockDb = {
      all: vi.fn().mockResolvedValue([]),
    }
    mockGetDatabase.mockResolvedValue(mockDb as any)

    // First call should build the index
    await getTaxonomyIndex()
    expect(mockDb.all).toHaveBeenCalledTimes(1)

    // Invalidate the cache
    invalidateTaxonomyIndex()

    // Second call should rebuild the index
    await getTaxonomyIndex()
    expect(mockDb.all).toHaveBeenCalledTimes(2)
  })
})

// ============================================================================
// updateIndexWithTerms
// ============================================================================

describe('updateIndexWithTerms', () => {
  it('adds new terms to index', async () => {
    const mockDb = {
      all: vi.fn().mockResolvedValue([]),
    }
    mockGetDatabase.mockResolvedValue(mockDb as any)

    const index = await buildTaxonomyIndex()
    updateIndexWithTerms(index, '/new-doc.md', ['NewSubject'], ['NewTopic'], ['new-tag'])

    expect(index.subjects.has('newsubject')).toBe(true)
    expect(index.topics.has('newtopic')).toBe(true)
    expect(index.tags.has('new-tag')).toBe(true)
  })

  it('increments document count for existing terms', async () => {
    const mockDb = {
      all: vi.fn().mockResolvedValue([
        { path: '/doc1.md', subjects: '["Existing"]', topics: null, tags: null },
      ]),
    }
    mockGetDatabase.mockResolvedValue(mockDb as any)

    const index = await buildTaxonomyIndex()
    const beforeCount = index.subjects.get('existing')?.documentCount || 0

    updateIndexWithTerms(index, '/new-doc.md', ['Existing'], [], [])

    const afterCount = index.subjects.get('existing')?.documentCount || 0
    expect(afterCount).toBe(beforeCount + 1)
  })

  it('tracks multiple strand paths', async () => {
    const mockDb = {
      all: vi.fn().mockResolvedValue([
        { path: '/doc1.md', subjects: '["Shared"]', topics: null, tags: null },
      ]),
    }
    mockGetDatabase.mockResolvedValue(mockDb as any)

    const index = await buildTaxonomyIndex()
    updateIndexWithTerms(index, '/doc2.md', ['Shared'], [], [])

    const entry = index.subjects.get('shared')
    expect(entry?.strandPaths).toContain('/doc1.md')
    expect(entry?.strandPaths).toContain('/doc2.md')
  })
})
