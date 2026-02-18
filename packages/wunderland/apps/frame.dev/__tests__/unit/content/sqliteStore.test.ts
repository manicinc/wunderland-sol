/**
 * SQLite Content Store Tests
 * @module __tests__/unit/content/sqliteStore.test
 *
 * Tests for SQLite-based content storage operations.
 * Mocks database and vault functions for isolated testing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock database
const mockDbAll = vi.fn()
const mockDbRun = vi.fn()
const mockGetDatabase = vi.fn()

vi.mock('@/lib/codexDatabase', () => ({
  getDatabase: () => mockGetDatabase(),
}))

// Mock vault functions
vi.mock('@/lib/vault', () => ({
  checkVaultStatus: vi.fn(() => Promise.resolve({ status: 'not-configured' })),
  readVaultFile: vi.fn(),
  writeVaultFile: vi.fn(),
  getStoredVaultHandle: vi.fn(),
  requestVaultPermission: vi.fn(),
  isElectronWithVault: vi.fn(() => false),
}))

// Import after mocks
import { SQLiteContentStore } from '@/lib/content/sqliteStore'

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockDb() {
  return {
    all: mockDbAll,
    run: mockDbRun,
  }
}

function resetAllMocks() {
  vi.clearAllMocks()
  mockDbAll.mockReset()
  mockDbRun.mockReset()
  mockGetDatabase.mockReset()
}

// ============================================================================
// SQLiteContentStore CLASS TESTS
// ============================================================================

describe('SQLiteContentStore', () => {
  let store: SQLiteContentStore

  beforeEach(() => {
    resetAllMocks()
    // Create a new instance for each test to avoid singleton issues
    store = new SQLiteContentStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  describe('initialize', () => {
    it('initializes successfully with database', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll.mockResolvedValueOnce([]) // getSyncStatus

      await expect(store.initialize()).resolves.not.toThrow()
    })

    it('throws when database is unavailable', async () => {
      mockGetDatabase.mockReturnValue(null)

      await expect(store.initialize()).rejects.toThrow('Database not available')
    })
  })

  describe('isVaultReady', () => {
    it('returns false when not initialized', () => {
      expect(store.isVaultReady()).toBe(false)
    })
  })

  // ==========================================================================
  // Knowledge Tree
  // ==========================================================================

  describe('getKnowledgeTree', () => {
    it('returns empty array when database unavailable', async () => {
      mockGetDatabase.mockReturnValue(null)

      const tree = await store.getKnowledgeTree()

      expect(tree).toEqual([])
    })

    it('returns tree structure from database', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll
        .mockResolvedValueOnce([{ // weaves
          id: 'w1',
          slug: 'programming',
          name: 'Programming',
          description: 'Programming topics',
          path: 'programming',
          strand_count: 2,
        }])
        .mockResolvedValueOnce([{ // looms
          id: 'l1',
          weave_id: 'w1',
          parent_loom_id: null,
          slug: 'javascript',
          name: 'JavaScript',
          description: null,
          path: 'programming/javascript',
          depth: 1,
          strand_count: 1,
        }])
        .mockResolvedValueOnce([{ // strands
          id: 's1',
          slug: 'intro',
          title: 'Introduction',
          path: 'programming/javascript/intro',
          weave_id: 'w1',
          loom_id: 'l1',
          difficulty: 'beginner',
          status: 'published',
          tags: '["basics"]',
        }])

      const tree = await store.getKnowledgeTree()

      expect(tree).toHaveLength(1)
      expect(tree[0].type).toBe('weave')
      expect(tree[0].slug).toBe('programming')
      expect(tree[0].children).toBeDefined()
    })

    it('handles database errors gracefully', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll.mockRejectedValue(new Error('DB error'))

      const tree = await store.getKnowledgeTree()

      expect(tree).toEqual([])
    })
  })

  // ==========================================================================
  // Strand Operations
  // ==========================================================================

  describe('getStrand', () => {
    it('returns null when database unavailable', async () => {
      mockGetDatabase.mockReturnValue(null)

      const strand = await store.getStrand('test/path')

      expect(strand).toBeNull()
    })

    it('returns null when strand not found', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll.mockResolvedValueOnce([])

      const strand = await store.getStrand('nonexistent/path')

      expect(strand).toBeNull()
    })

    it('returns strand content from database', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll.mockResolvedValueOnce([{
        id: 's1',
        path: 'test/strand',
        title: 'Test Strand',
        content: '# Test\n\nContent here',
        summary: 'A test strand',
        weave_slug: 'test',
        loom_slug: null,
        tags: '["test"]',
        status: 'published',
        difficulty: 'intermediate',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }])

      const strand = await store.getStrand('test/strand')

      expect(strand).not.toBeNull()
      expect(strand?.title).toBe('Test Strand')
      expect(strand?.content).toContain('# Test')
    })
  })

  describe('getStrands', () => {
    it('returns empty array for empty paths', async () => {
      const strands = await store.getStrands([])
      expect(strands).toEqual([])
    })
  })

  // ==========================================================================
  // Search Operations
  // ==========================================================================

  describe('searchStrands', () => {
    it('returns empty array when database unavailable', async () => {
      mockGetDatabase.mockReturnValue(null)

      const results = await store.searchStrands('test')

      expect(results).toEqual([])
    })

    it('searches by query string', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll.mockResolvedValueOnce([{
        id: 's1',
        path: 'test/result',
        title: 'Test Result',
        summary: 'A test result',
        tags: '["search"]',
      }])

      const results = await store.searchStrands('test')

      expect(results).toHaveLength(1)
      expect(results[0].path).toBe('test/result')
      expect(mockDbAll).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        expect.arrayContaining(['%test%'])
      )
    })

    it('respects limit and offset options', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll.mockResolvedValueOnce([])

      await store.searchStrands('query', { limit: 10, offset: 5 })

      expect(mockDbAll).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([10, 5])
      )
    })

    it('filters by weave when specified', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll.mockResolvedValueOnce([])

      await store.searchStrands('query', { weave: 'programming' })

      expect(mockDbAll).toHaveBeenCalledWith(
        expect.stringContaining('weave_id'),
        expect.arrayContaining(['programming'])
      )
    })

    it('filters by tags when specified', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll.mockResolvedValueOnce([])

      await store.searchStrands('query', { tags: ['javascript', 'react'] })

      const callArgs = mockDbAll.mock.calls[0][1]
      expect(callArgs).toContain('%"javascript"%')
      expect(callArgs).toContain('%"react"%')
    })

    it('assigns combined score to results', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll.mockResolvedValueOnce([
        { id: 's1', path: 'a', title: 'A', summary: null, tags: null },
        { id: 's2', path: 'b', title: 'B', summary: null, tags: null },
      ])

      const results = await store.searchStrands('test')

      expect(results[0].combinedScore).toBe(1)
      expect(results[1].combinedScore).toBe(0.99)
    })

    it('handles database errors gracefully', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll.mockRejectedValueOnce(new Error('Search failed'))

      const results = await store.searchStrands('test')

      expect(results).toEqual([])
    })
  })

  // ==========================================================================
  // Weave and Loom Operations
  // ==========================================================================

  describe('getWeave', () => {
    it('returns null when database unavailable', async () => {
      mockGetDatabase.mockReturnValue(null)

      const weave = await store.getWeave('test')

      expect(weave).toBeNull()
    })

    it('returns weave node from database', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll.mockResolvedValueOnce([{
        id: 'w1',
        slug: 'programming',
        name: 'Programming',
        description: 'Programming topics',
        path: 'programming',
        strand_count: 10,
      }])

      const weave = await store.getWeave('programming')

      expect(weave).not.toBeNull()
      expect(weave?.name).toBe('Programming')
      expect(weave?.type).toBe('weave')
    })
  })

  describe('getLoom', () => {
    it('returns null when database unavailable', async () => {
      mockGetDatabase.mockReturnValue(null)

      const loom = await store.getLoom('test/loom')

      expect(loom).toBeNull()
    })

    it('returns loom node from database', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll.mockResolvedValueOnce([{
        id: 'l1',
        slug: 'javascript',
        name: 'JavaScript',
        description: 'JS topics',
        path: 'programming/javascript',
        strand_count: 5,
      }])

      const loom = await store.getLoom('programming/javascript')

      expect(loom).not.toBeNull()
      expect(loom?.name).toBe('JavaScript')
      expect(loom?.type).toBe('loom')
    })
  })

  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  describe('deleteStrand', () => {
    it('deletes strand from database', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbRun.mockResolvedValue({ changes: 1 })

      await store.deleteStrand('test/strand')

      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        ['test/strand']
      )
    })
  })

  // ==========================================================================
  // Tag Operations
  // ==========================================================================

  describe('getAllTags', () => {
    it('returns empty array when database unavailable', async () => {
      mockGetDatabase.mockReturnValue(null)

      const tags = await store.getAllTags()

      expect(tags).toEqual([])
    })

    it('returns unique tags from all strands', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll.mockResolvedValueOnce([
        { tags: '["javascript", "react"]' },
        { tags: '["javascript", "vue"]' },
        { tags: null },
      ])

      const tags = await store.getAllTags()

      expect(tags).toContain('javascript')
      expect(tags).toContain('react')
      expect(tags).toContain('vue')
      // Should be unique
      expect(tags.filter(t => t === 'javascript')).toHaveLength(1)
    })
  })

  describe('getAllSubjects', () => {
    it('returns empty array when database unavailable', async () => {
      mockGetDatabase.mockReturnValue(null)

      const subjects = await store.getAllSubjects()

      expect(subjects).toEqual([])
    })

    it('returns subjects from metadata', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll.mockResolvedValueOnce([
        { metadata: JSON.stringify({ taxonomy: { subjects: ['Mathematics', 'Physics'] } }) },
        { metadata: JSON.stringify({ taxonomy: { subjects: ['Chemistry'] } }) },
      ])

      const subjects = await store.getAllSubjects()

      expect(subjects).toContain('Mathematics')
      expect(subjects).toContain('Physics')
      expect(subjects).toContain('Chemistry')
    })
  })

  describe('getAllTopics', () => {
    it('returns empty array when database unavailable', async () => {
      mockGetDatabase.mockReturnValue(null)

      const topics = await store.getAllTopics()

      expect(topics).toEqual([])
    })

    it('returns topics from metadata', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll.mockResolvedValueOnce([
        { metadata: JSON.stringify({ taxonomy: { topics: ['Algebra', 'Calculus'] } }) },
        { metadata: JSON.stringify({ taxonomy: { topics: ['Trigonometry'] } }) },
      ])

      const topics = await store.getAllTopics()

      expect(topics).toContain('Algebra')
      expect(topics).toContain('Calculus')
      expect(topics).toContain('Trigonometry')
    })
  })

  // ==========================================================================
  // Block Tag Operations
  // ==========================================================================

  describe('getAllBlockTags', () => {
    it('returns empty array when database unavailable', async () => {
      mockGetDatabase.mockReturnValue(null)

      const tags = await store.getAllBlockTags()

      expect(tags).toEqual([])
    })

    it('returns unique block tags from JSON', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll.mockResolvedValueOnce([
        { tags: '["definition", "example"]' },
        { tags: '["theorem", "definition"]' },
      ])

      const tags = await store.getAllBlockTags()

      expect(tags).toContain('definition')
      expect(tags).toContain('example')
      expect(tags).toContain('theorem')
      // Should be unique
      expect(tags.filter(t => t === 'definition')).toHaveLength(1)
    })
  })

  describe('getBlockTagCounts', () => {
    it('returns empty map when database unavailable', async () => {
      mockGetDatabase.mockReturnValue(null)

      const counts = await store.getBlockTagCounts()

      expect(counts.size).toBe(0)
    })

    it('returns tag counts from JSON', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll.mockResolvedValueOnce([
        { tags: '["definition", "example"]' },
        { tags: '["definition", "theorem"]' },
        { tags: '["definition"]' },
      ])

      const counts = await store.getBlockTagCounts()

      expect(counts.get('definition')).toBe(3)
      expect(counts.get('example')).toBe(1)
      expect(counts.get('theorem')).toBe(1)
    })
  })

  // ==========================================================================
  // Sync Status
  // ==========================================================================

  describe('getSyncStatus', () => {
    it('returns defaults when database unavailable', async () => {
      mockGetDatabase.mockReturnValue(null)

      const status = await store.getSyncStatus()

      expect(status.lastSync).toBeNull()
      expect(status.pendingChanges).toBe(0)
      expect(status.remoteVersion).toBeNull()
    })

    it('returns status from database', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll.mockResolvedValueOnce([{
        last_full_sync: '2024-01-01T00:00:00Z',
        pending_changes: 5,
        remote_tree_sha: 'abc123',
      }])

      const status = await store.getSyncStatus()

      expect(status.lastSync).toBeInstanceOf(Date)
      expect(status.pendingChanges).toBe(5)
      expect(status.remoteVersion).toBe('abc123')
    })

    it('returns defaults when no sync status exists', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll.mockResolvedValueOnce([])

      const status = await store.getSyncStatus()

      expect(status.lastSync).toBeNull()
      expect(status.pendingChanges).toBe(0)
    })
  })

  // ==========================================================================
  // Embedding Operations
  // ==========================================================================

  describe('getAllEmbeddings', () => {
    it('returns empty array when database unavailable', async () => {
      mockGetDatabase.mockReturnValue(null)

      const embeddings = await store.getAllEmbeddings()

      expect(embeddings).toEqual([])
    })
  })

  describe('clearEmbeddings', () => {
    it('deletes all embeddings', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbRun.mockResolvedValue({ changes: 10 })

      await store.clearEmbeddings()

      expect(mockDbRun).toHaveBeenCalledWith('DELETE FROM embeddings')
    })
  })

  // ==========================================================================
  // Bulk Operations
  // ==========================================================================

  describe('clearAllContent', () => {
    it('clears all content tables', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbRun.mockResolvedValue({ changes: 1 })

      await store.clearAllContent()

      // Should delete from all content tables
      expect(mockDbRun).toHaveBeenCalledWith(expect.stringContaining('DELETE'))
    })
  })

  // ==========================================================================
  // Tree Building Logic
  // ==========================================================================

  describe('knowledge tree building', () => {
    it('builds correct hierarchy with nested looms', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())

      // Weave
      mockDbAll
        .mockResolvedValueOnce([{
          id: 'w1',
          slug: 'programming',
          name: 'Programming',
          description: null,
          path: 'programming',
          strand_count: 3,
        }])
        // Looms (parent and child)
        .mockResolvedValueOnce([
          {
            id: 'l1',
            weave_id: 'w1',
            parent_loom_id: null,
            slug: 'javascript',
            name: 'JavaScript',
            description: null,
            path: 'programming/javascript',
            depth: 1,
            strand_count: 2,
          },
          {
            id: 'l2',
            weave_id: 'w1',
            parent_loom_id: 'l1',
            slug: 'react',
            name: 'React',
            description: null,
            path: 'programming/javascript/react',
            depth: 2,
            strand_count: 1,
          },
        ])
        // Strands
        .mockResolvedValueOnce([
          {
            id: 's1',
            slug: 'intro',
            title: 'JS Intro',
            path: 'programming/javascript/intro',
            weave_id: 'w1',
            loom_id: 'l1',
            difficulty: null,
            status: 'published',
            tags: null,
          },
          {
            id: 's2',
            slug: 'hooks',
            title: 'React Hooks',
            path: 'programming/javascript/react/hooks',
            weave_id: 'w1',
            loom_id: 'l2',
            difficulty: null,
            status: 'published',
            tags: null,
          },
          {
            id: 's3',
            slug: 'basics',
            title: 'JS Basics',
            path: 'programming/basics',
            weave_id: 'w1',
            loom_id: null,
            difficulty: null,
            status: 'published',
            tags: null,
          },
        ])

      const tree = await store.getKnowledgeTree()

      // Check weave
      expect(tree).toHaveLength(1)
      expect(tree[0].name).toBe('Programming')
      expect(tree[0].children).toBeDefined()

      // Check that weave has both loom and direct strand
      const weaveChildren = tree[0].children!
      expect(weaveChildren.length).toBeGreaterThanOrEqual(2)

      // Find javascript loom
      const jsLoom = weaveChildren.find(c => c.slug === 'javascript')
      expect(jsLoom).toBeDefined()
      expect(jsLoom?.type).toBe('loom')

      // Find direct strand
      const directStrand = weaveChildren.find(c => c.slug === 'basics')
      expect(directStrand).toBeDefined()
      expect(directStrand?.type).toBe('strand')
    })

    it('handles empty database', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll
        .mockResolvedValueOnce([]) // no weaves
        .mockResolvedValueOnce([]) // no looms
        .mockResolvedValueOnce([]) // no strands

      const tree = await store.getKnowledgeTree()

      expect(tree).toEqual([])
    })
  })

  // ==========================================================================
  // Search Score Calculation
  // ==========================================================================

  describe('search scoring', () => {
    it('assigns decreasing scores by position', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll.mockResolvedValueOnce([
        { id: '1', path: 'a', title: 'First', summary: null, tags: null },
        { id: '2', path: 'b', title: 'Second', summary: null, tags: null },
        { id: '3', path: 'c', title: 'Third', summary: null, tags: null },
      ])

      const results = await store.searchStrands('test')

      expect(results[0].combinedScore).toBeGreaterThan(results[1].combinedScore)
      expect(results[1].combinedScore).toBeGreaterThan(results[2].combinedScore)
    })

    it('parses tags from JSON', async () => {
      mockGetDatabase.mockReturnValue(createMockDb())
      mockDbAll.mockResolvedValueOnce([
        { id: '1', path: 'a', title: 'Tagged', summary: null, tags: '["tag1", "tag2"]' },
      ])

      const results = await store.searchStrands('tagged')

      expect(results[0].tags).toEqual(['tag1', 'tag2'])
    })
  })
})
