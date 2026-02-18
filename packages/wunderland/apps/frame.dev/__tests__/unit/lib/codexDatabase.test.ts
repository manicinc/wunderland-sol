/**
 * Codex Database Tests
 * @module __tests__/unit/lib/codexDatabase.test
 *
 * Tests for centralized SQL database for Codex client-side data.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type {
  EmbeddingRecord,
  SearchHistoryRecord,
  ReadingProgressRecord,
  DraftRecord,
  BookmarkRecord,
  FabricRecord,
  WeaveRecord,
  LoomRecord,
  StrandRecord,
  SyncStatusRecord,
  DatabaseStats,
} from '@/lib/codexDatabase'

// Mock the sql-storage-adapter
vi.mock('@framers/sql-storage-adapter', () => ({
  createDatabase: vi.fn(),
}))

// Mock the audit database
vi.mock('@/lib/audit/auditDatabase', () => ({
  initAuditSchema: vi.fn(),
}))

describe('Codex Database', () => {
  // ============================================================================
  // Type Validation
  // ============================================================================

  describe('EmbeddingRecord type', () => {
    it('can create valid embedding record', () => {
      const record: EmbeddingRecord = {
        id: 'emb-123',
        path: 'weaves/wiki/strands/test.md',
        title: 'Test Document',
        content: 'Sample content for embedding',
        contentType: 'strand',
        embedding: [0.1, 0.2, 0.3, 0.4],
        createdAt: '2025-01-01T00:00:00Z',
      }
      expect(record.id).toBe('emb-123')
      expect(record.contentType).toBe('strand')
      expect(record.embedding).toHaveLength(4)
    })

    it('can include all optional fields', () => {
      const record: EmbeddingRecord = {
        id: 'emb-123',
        path: 'weaves/wiki/strands/test.md',
        title: 'Test Document',
        content: 'Sample content',
        contentType: 'section',
        embedding: [0.1, 0.2],
        weave: 'wiki',
        loom: 'intro',
        tags: ['javascript', 'tutorial'],
        lastModified: '2025-01-15T00:00:00Z',
        createdAt: '2025-01-01T00:00:00Z',
      }
      expect(record.weave).toBe('wiki')
      expect(record.loom).toBe('intro')
      expect(record.tags).toContain('javascript')
    })

    it('supports all content types', () => {
      const contentTypes: EmbeddingRecord['contentType'][] = [
        'strand',
        'section',
        'paragraph',
        'code',
      ]
      contentTypes.forEach((contentType) => {
        const record: EmbeddingRecord = {
          id: 'emb-123',
          path: 'path',
          title: 'title',
          content: 'content',
          contentType,
          embedding: [],
          createdAt: '',
        }
        expect(record.contentType).toBe(contentType)
      })
    })
  })

  describe('SearchHistoryRecord type', () => {
    it('can create valid search history record', () => {
      const record: SearchHistoryRecord = {
        id: 'search-123',
        query: 'react hooks',
        resultCount: 15,
        timestamp: '2025-01-01T12:00:00Z',
      }
      expect(record.id).toBe('search-123')
      expect(record.query).toBe('react hooks')
      expect(record.resultCount).toBe(15)
    })

    it('can include clickedPath', () => {
      const record: SearchHistoryRecord = {
        id: 'search-123',
        query: 'react hooks',
        resultCount: 15,
        clickedPath: 'weaves/wiki/strands/react-hooks.md',
        timestamp: '2025-01-01T12:00:00Z',
      }
      expect(record.clickedPath).toBe('weaves/wiki/strands/react-hooks.md')
    })
  })

  describe('ReadingProgressRecord type', () => {
    it('can create valid reading progress record', () => {
      const record: ReadingProgressRecord = {
        path: 'weaves/wiki/strands/test.md',
        scrollPosition: 500,
        readPercentage: 75.5,
        lastReadAt: '2025-01-01T12:00:00Z',
        totalReadTime: 300,
        completed: false,
      }
      expect(record.scrollPosition).toBe(500)
      expect(record.readPercentage).toBe(75.5)
      expect(record.completed).toBe(false)
    })

    it('can mark as completed', () => {
      const record: ReadingProgressRecord = {
        path: 'weaves/wiki/strands/test.md',
        scrollPosition: 1000,
        readPercentage: 100,
        lastReadAt: '2025-01-01T12:00:00Z',
        totalReadTime: 600,
        completed: true,
      }
      expect(record.completed).toBe(true)
      expect(record.readPercentage).toBe(100)
    })
  })

  describe('DraftRecord type', () => {
    it('can create valid draft record', () => {
      const record: DraftRecord = {
        id: 'draft-123',
        type: 'strand',
        path: 'weaves/wiki/strands/new-doc.md',
        title: 'New Document',
        content: '# New Document\n\nContent here',
        metadata: '{}',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T12:00:00Z',
        autoSaved: true,
      }
      expect(record.id).toBe('draft-123')
      expect(record.type).toBe('strand')
      expect(record.autoSaved).toBe(true)
    })

    it('supports all draft types', () => {
      const types: DraftRecord['type'][] = ['strand', 'weave', 'loom']
      types.forEach((type) => {
        const record: DraftRecord = {
          id: 'draft-123',
          type,
          path: 'path',
          title: 'title',
          content: 'content',
          metadata: '{}',
          createdAt: '',
          updatedAt: '',
          autoSaved: false,
        }
        expect(record.type).toBe(type)
      })
    })
  })

  describe('BookmarkRecord type', () => {
    it('can create minimal bookmark', () => {
      const record: BookmarkRecord = {
        id: 'bm-123',
        path: 'weaves/wiki/strands/test.md',
        title: 'Bookmarked Document',
        createdAt: '2025-01-01T00:00:00Z',
      }
      expect(record.id).toBe('bm-123')
      expect(record.excerpt).toBeUndefined()
      expect(record.tags).toBeUndefined()
    })

    it('can include optional fields', () => {
      const record: BookmarkRecord = {
        id: 'bm-123',
        path: 'weaves/wiki/strands/test.md',
        title: 'Bookmarked Document',
        excerpt: 'This is the beginning of the document...',
        tags: ['important', 'reference'],
        createdAt: '2025-01-01T00:00:00Z',
      }
      expect(record.excerpt).toBe('This is the beginning of the document...')
      expect(record.tags).toContain('important')
    })
  })

  describe('FabricRecord type', () => {
    it('can create minimal fabric record', () => {
      const record: FabricRecord = {
        id: 'fabric-123',
        name: 'My Knowledge Base',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      }
      expect(record.id).toBe('fabric-123')
      expect(record.name).toBe('My Knowledge Base')
    })

    it('can include GitHub sync info', () => {
      const record: FabricRecord = {
        id: 'fabric-123',
        name: 'Synced Knowledge Base',
        description: 'A knowledge base synced with GitHub',
        githubOwner: 'myorg',
        githubRepo: 'knowledge-base',
        githubBranch: 'main',
        lastSyncAt: '2025-01-15T00:00:00Z',
        syncHash: 'abc123def456',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-15T00:00:00Z',
      }
      expect(record.githubOwner).toBe('myorg')
      expect(record.githubRepo).toBe('knowledge-base')
      expect(record.lastSyncAt).toBeDefined()
    })
  })

  describe('WeaveRecord type', () => {
    it('can create valid weave record', () => {
      const record: WeaveRecord = {
        id: 'weave-123',
        fabricId: 'fabric-456',
        slug: 'wiki',
        name: 'Wiki',
        path: 'weaves/wiki',
        strandCount: 50,
        loomCount: 5,
        sortOrder: 0,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      }
      expect(record.slug).toBe('wiki')
      expect(record.strandCount).toBe(50)
    })

    it('can include description', () => {
      const record: WeaveRecord = {
        id: 'weave-123',
        fabricId: 'fabric-456',
        slug: 'wiki',
        name: 'Wiki',
        description: 'The main wiki weave',
        path: 'weaves/wiki',
        strandCount: 50,
        loomCount: 5,
        sortOrder: 0,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      }
      expect(record.description).toBe('The main wiki weave')
    })
  })

  describe('LoomRecord type', () => {
    it('can create valid loom record', () => {
      const record: LoomRecord = {
        id: 'loom-123',
        weaveId: 'weave-456',
        slug: 'getting-started',
        name: 'Getting Started',
        path: 'weaves/wiki/looms/getting-started',
        depth: 1,
        strandCount: 10,
        sortOrder: 0,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      }
      expect(record.slug).toBe('getting-started')
      expect(record.depth).toBe(1)
    })

    it('can have parent loom (nested)', () => {
      const record: LoomRecord = {
        id: 'loom-123',
        weaveId: 'weave-456',
        parentLoomId: 'loom-parent',
        slug: 'nested-section',
        name: 'Nested Section',
        description: 'A nested loom',
        path: 'weaves/wiki/looms/parent/nested-section',
        depth: 2,
        strandCount: 5,
        sortOrder: 1,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      }
      expect(record.parentLoomId).toBe('loom-parent')
      expect(record.depth).toBe(2)
    })
  })

  describe('StrandRecord type', () => {
    it('can create minimal strand record', () => {
      const record: StrandRecord = {
        id: 'strand-123',
        weaveId: 'weave-456',
        slug: 'introduction',
        title: 'Introduction',
        path: 'weaves/wiki/strands/introduction.md',
        content: '# Introduction\n\nContent here',
        wordCount: 150,
        status: 'published',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      }
      expect(record.slug).toBe('introduction')
      expect(record.status).toBe('published')
    })

    it('can include all metadata fields', () => {
      const record: StrandRecord = {
        id: 'strand-123',
        weaveId: 'weave-456',
        loomId: 'loom-789',
        slug: 'advanced-guide',
        title: 'Advanced Guide',
        path: 'weaves/wiki/strands/advanced-guide.md',
        content: '# Advanced Guide',
        contentHash: 'sha256-abc123',
        wordCount: 2500,
        frontmatter: { author: 'John', date: '2025-01-01' },
        version: '2.0.0',
        difficulty: 'advanced',
        status: 'published',
        subjects: ['programming'],
        topics: ['algorithms', 'data-structures'],
        tags: ['advanced', 'guide'],
        prerequisites: ['basics.md'],
        references: ['external-doc.md'],
        summary: 'An advanced guide to the topic',
        githubSha: 'def456',
        githubUrl: 'https://github.com/org/repo/blob/main/guide.md',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-15T00:00:00Z',
        lastIndexedAt: '2025-01-15T01:00:00Z',
      }
      expect(record.difficulty).toBe('advanced')
      expect(record.frontmatter?.author).toBe('John')
      expect(record.topics).toContain('algorithms')
    })

    it('supports all status values', () => {
      const statuses: StrandRecord['status'][] = ['draft', 'published', 'archived']
      statuses.forEach((status) => {
        const record: StrandRecord = {
          id: 'strand-123',
          weaveId: 'weave-456',
          slug: 'test',
          title: 'Test',
          path: 'path',
          content: 'content',
          wordCount: 0,
          status,
          createdAt: '',
          updatedAt: '',
        }
        expect(record.status).toBe(status)
      })
    })
  })

  describe('SyncStatusRecord type', () => {
    it('can create minimal sync status', () => {
      const record: SyncStatusRecord = {
        id: 'main',
        localVersion: 1,
        pendingChanges: 0,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      }
      expect(record.localVersion).toBe(1)
      expect(record.pendingChanges).toBe(0)
    })

    it('can include sync metadata', () => {
      const record: SyncStatusRecord = {
        id: 'main',
        lastFullSync: '2025-01-15T00:00:00Z',
        lastIncrementalSync: '2025-01-15T12:00:00Z',
        remoteTreeSha: 'abc123',
        localVersion: 5,
        pendingChanges: 3,
        syncErrors: ['Failed to sync file X', 'Conflict in file Y'],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-15T12:00:00Z',
      }
      expect(record.lastFullSync).toBeDefined()
      expect(record.syncErrors).toHaveLength(2)
    })
  })

  describe('DatabaseStats type', () => {
    it('can create valid database stats', () => {
      const stats: DatabaseStats = {
        embeddings: 100,
        searchHistory: 50,
        readingProgress: 25,
        drafts: 5,
        bookmarks: 10,
        totalSizeKB: 512,
      }
      expect(stats.embeddings).toBe(100)
      expect(stats.totalSizeKB).toBe(512)
    })

    it('can represent empty database', () => {
      const stats: DatabaseStats = {
        embeddings: 0,
        searchHistory: 0,
        readingProgress: 0,
        drafts: 0,
        bookmarks: 0,
        totalSizeKB: 0,
      }
      expect(stats.embeddings).toBe(0)
      expect(stats.totalSizeKB).toBe(0)
    })
  })

  // ============================================================================
  // SSR Safety (no database)
  // ============================================================================

  describe('SSR safety (no database)', () => {
    let originalWindow: typeof globalThis.window

    beforeEach(() => {
      vi.resetModules()
      originalWindow = globalThis.window
      // @ts-ignore - SSR mode
      globalThis.window = undefined
    })

    afterEach(() => {
      globalThis.window = originalWindow
    })

    it('getDatabase returns null when no window', async () => {
      const { getDatabase } = await import('@/lib/codexDatabase')
      const result = await getDatabase()
      expect(result).toBeNull()
    })

    it('getAllEmbeddings returns empty array when no database', async () => {
      const { getAllEmbeddings } = await import('@/lib/codexDatabase')
      const result = await getAllEmbeddings()
      expect(result).toEqual([])
    })

    it('getEmbeddingCount returns 0 when no database', async () => {
      const { getEmbeddingCount } = await import('@/lib/codexDatabase')
      const result = await getEmbeddingCount()
      expect(result).toBe(0)
    })

    it('storeEmbedding returns false when no database', async () => {
      const { storeEmbedding } = await import('@/lib/codexDatabase')
      const result = await storeEmbedding({
        id: 'test',
        path: 'path',
        title: 'title',
        content: 'content',
        contentType: 'strand',
        embedding: [],
        createdAt: '',
      })
      expect(result).toBe(false)
    })

    it('clearEmbeddings returns false when no database', async () => {
      const { clearEmbeddings } = await import('@/lib/codexDatabase')
      const result = await clearEmbeddings()
      expect(result).toBe(false)
    })

    it('recordSearch returns null when no database', async () => {
      const { recordSearch } = await import('@/lib/codexDatabase')
      const result = await recordSearch('test query', 10)
      expect(result).toBeNull()
    })

    it('getRecentSearches returns empty array when no database', async () => {
      const { getRecentSearches } = await import('@/lib/codexDatabase')
      const result = await getRecentSearches()
      expect(result).toEqual([])
    })

    it('getPopularSearches returns empty array when no database', async () => {
      const { getPopularSearches } = await import('@/lib/codexDatabase')
      const result = await getPopularSearches()
      expect(result).toEqual([])
    })

    it('saveReadingProgress returns false when no database', async () => {
      const { saveReadingProgress } = await import('@/lib/codexDatabase')
      const result = await saveReadingProgress({
        path: 'path',
        scrollPosition: 0,
        readPercentage: 0,
        lastReadAt: '',
        totalReadTime: 0,
        completed: false,
      })
      expect(result).toBe(false)
    })

    it('getReadingProgress returns null when no database', async () => {
      const { getReadingProgress } = await import('@/lib/codexDatabase')
      const result = await getReadingProgress('path')
      expect(result).toBeNull()
    })

    it('getRecentlyRead returns empty array when no database', async () => {
      const { getRecentlyRead } = await import('@/lib/codexDatabase')
      const result = await getRecentlyRead()
      expect(result).toEqual([])
    })

    it('saveDraft returns false when no database', async () => {
      const { saveDraft } = await import('@/lib/codexDatabase')
      const result = await saveDraft({
        id: 'draft-123',
        type: 'strand',
        path: 'path',
        title: 'title',
        content: 'content',
        metadata: '{}',
        autoSaved: false,
      })
      expect(result).toBe(false)
    })

    it('getDraft returns null when no database', async () => {
      const { getDraft } = await import('@/lib/codexDatabase')
      const result = await getDraft('draft-123')
      expect(result).toBeNull()
    })

    it('getAllDrafts returns empty array when no database', async () => {
      const { getAllDrafts } = await import('@/lib/codexDatabase')
      const result = await getAllDrafts()
      expect(result).toEqual([])
    })

    it('deleteDraft returns false when no database', async () => {
      const { deleteDraft } = await import('@/lib/codexDatabase')
      const result = await deleteDraft('draft-123')
      expect(result).toBe(false)
    })

    it('addBookmark returns null when no database', async () => {
      const { addBookmark } = await import('@/lib/codexDatabase')
      const result = await addBookmark({
        path: 'path',
        title: 'title',
      })
      expect(result).toBeNull()
    })

    it('removeBookmark returns false when no database', async () => {
      const { removeBookmark } = await import('@/lib/codexDatabase')
      const result = await removeBookmark('path')
      expect(result).toBe(false)
    })

    it('isBookmarked returns false when no database', async () => {
      const { isBookmarked } = await import('@/lib/codexDatabase')
      const result = await isBookmarked('path')
      expect(result).toBe(false)
    })

    it('getAllBookmarks returns empty array when no database', async () => {
      const { getAllBookmarks } = await import('@/lib/codexDatabase')
      const result = await getAllBookmarks()
      expect(result).toEqual([])
    })

    it('getDatabaseStats returns zeros when no database', async () => {
      const { getDatabaseStats } = await import('@/lib/codexDatabase')
      const stats = await getDatabaseStats()
      expect(stats.embeddings).toBe(0)
      expect(stats.searchHistory).toBe(0)
      expect(stats.readingProgress).toBe(0)
      expect(stats.drafts).toBe(0)
      expect(stats.bookmarks).toBe(0)
      expect(stats.totalSizeKB).toBe(0)
    })

    it('clearAllData returns false when no database', async () => {
      const { clearAllData } = await import('@/lib/codexDatabase')
      const result = await clearAllData()
      expect(result).toBe(false)
    })

    it('getSetting returns null when no database', async () => {
      const { getSetting } = await import('@/lib/codexDatabase')
      const result = await getSetting('key')
      expect(result).toBeNull()
    })

    it('setSetting returns false when no database', async () => {
      const { setSetting } = await import('@/lib/codexDatabase')
      const result = await setSetting('key', 'value')
      expect(result).toBe(false)
    })

    it('isFirstLaunchCompleted returns false when no database', async () => {
      const { isFirstLaunchCompleted } = await import('@/lib/codexDatabase')
      const result = await isFirstLaunchCompleted()
      expect(result).toBe(false)
    })

    it('getVaultPath returns null when no database', async () => {
      const { getVaultPath } = await import('@/lib/codexDatabase')
      const result = await getVaultPath()
      expect(result).toBeNull()
    })

    it('getVaultName returns null when no database', async () => {
      const { getVaultName } = await import('@/lib/codexDatabase')
      const result = await getVaultName()
      expect(result).toBeNull()
    })
  })

  // ============================================================================
  // Browser with mock adapter
  // ============================================================================

  describe('browser with mock adapter', () => {
    let mockAdapter: {
      exec: ReturnType<typeof vi.fn>
      run: ReturnType<typeof vi.fn>
      all: ReturnType<typeof vi.fn>
      get: ReturnType<typeof vi.fn>
    }

    beforeEach(async () => {
      vi.resetModules()
      vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } })

      mockAdapter = {
        exec: vi.fn().mockResolvedValue(undefined),
        run: vi.fn().mockResolvedValue(undefined),
        all: vi.fn().mockResolvedValue([]),
        get: vi.fn().mockResolvedValue(null),
      }

      const sqlModule = await import('@framers/sql-storage-adapter')
      vi.mocked(sqlModule.createDatabase).mockResolvedValue(mockAdapter as any)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('getDatabase initializes schema on first access', async () => {
      const { getDatabase } = await import('@/lib/codexDatabase')
      await getDatabase()

      expect(mockAdapter.exec).toHaveBeenCalled()
      const calls = mockAdapter.exec.mock.calls
      const createTableCalls = calls.filter((call: any[]) =>
        call[0]?.includes('CREATE TABLE IF NOT EXISTS')
      )
      expect(createTableCalls.length).toBeGreaterThan(0)
    })

    it('storeEmbedding calls database.run with INSERT', async () => {
      const { storeEmbedding } = await import('@/lib/codexDatabase')
      mockAdapter.run.mockResolvedValue(undefined)

      await storeEmbedding({
        id: 'emb-123',
        path: 'path',
        title: 'title',
        content: 'content',
        contentType: 'strand',
        embedding: [0.1, 0.2],
        createdAt: '2025-01-01',
      })

      expect(mockAdapter.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO embeddings'),
        expect.any(Array)
      )
    })

    it('getAllEmbeddings queries database', async () => {
      const { getAllEmbeddings } = await import('@/lib/codexDatabase')
      mockAdapter.all.mockResolvedValue([
        {
          id: 'emb-1',
          path: 'path',
          title: 'title',
          content: 'content',
          content_type: 'strand',
          embedding: '[]',
          weave: null,
          loom: null,
          tags: null,
          last_modified: null,
          created_at: '2025-01-01',
        },
      ])

      const result = await getAllEmbeddings()

      expect(mockAdapter.all).toHaveBeenCalledWith('SELECT * FROM embeddings')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('emb-1')
    })

    it('recordSearch inserts and cleans up old searches', async () => {
      const { recordSearch } = await import('@/lib/codexDatabase')
      mockAdapter.run.mockResolvedValue(undefined)

      await recordSearch('test query', 5)

      expect(mockAdapter.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO search_history'),
        expect.any(Array)
      )
      // The DELETE query doesn't take parameters
      expect(mockAdapter.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM search_history')
      )
    })

    it('saveReadingProgress uses UPSERT pattern', async () => {
      const { saveReadingProgress } = await import('@/lib/codexDatabase')
      mockAdapter.run.mockResolvedValue(undefined)

      await saveReadingProgress({
        path: 'path',
        scrollPosition: 100,
        readPercentage: 50,
        lastReadAt: '2025-01-01',
        totalReadTime: 60,
        completed: false,
      })

      expect(mockAdapter.run).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT(path) DO UPDATE'),
        expect.any(Array)
      )
    })

    it('getReadingProgress returns formatted record', async () => {
      const { getReadingProgress } = await import('@/lib/codexDatabase')
      mockAdapter.all.mockResolvedValue([
        {
          path: 'path',
          scroll_position: 100,
          read_percentage: 50,
          last_read_at: '2025-01-01',
          total_read_time: 60,
          completed: 1,
        },
      ])

      const result = await getReadingProgress('path')

      expect(result).not.toBeNull()
      expect(result?.scrollPosition).toBe(100)
      expect(result?.completed).toBe(true)
    })

    it('getDatabaseStats aggregates counts from all tables', async () => {
      const { getDatabaseStats } = await import('@/lib/codexDatabase')

      // Mock counts for each table
      let callIndex = 0
      mockAdapter.all.mockImplementation(() => {
        callIndex++
        switch (callIndex) {
          case 1:
            return Promise.resolve([{ count: 10 }]) // embeddings
          case 2:
            return Promise.resolve([{ count: 20 }]) // search_history
          case 3:
            return Promise.resolve([{ count: 5 }]) // reading_progress
          case 4:
            return Promise.resolve([{ count: 3 }]) // drafts
          case 5:
            return Promise.resolve([{ count: 8 }]) // bookmarks
          default:
            return Promise.resolve([]) // getAllEmbeddings for size calc
        }
      })

      const stats = await getDatabaseStats()

      expect(stats.embeddings).toBe(10)
      expect(stats.searchHistory).toBe(20)
      expect(stats.readingProgress).toBe(5)
      expect(stats.drafts).toBe(3)
      expect(stats.bookmarks).toBe(8)
    })

    it('clearAllData deletes from all tables', async () => {
      const { clearAllData } = await import('@/lib/codexDatabase')
      mockAdapter.run.mockResolvedValue(undefined)

      await clearAllData()

      expect(mockAdapter.run).toHaveBeenCalledWith('DELETE FROM embeddings')
      expect(mockAdapter.run).toHaveBeenCalledWith('DELETE FROM search_history')
      expect(mockAdapter.run).toHaveBeenCalledWith('DELETE FROM reading_progress')
      expect(mockAdapter.run).toHaveBeenCalledWith('DELETE FROM drafts')
      expect(mockAdapter.run).toHaveBeenCalledWith('DELETE FROM bookmarks')
    })

    it('setSetting uses UPSERT', async () => {
      const { setSetting } = await import('@/lib/codexDatabase')
      mockAdapter.run.mockResolvedValue(undefined)

      await setSetting('myKey', 'myValue')

      expect(mockAdapter.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO settings'),
        expect.arrayContaining(['myKey', 'myValue'])
      )
    })

    it('isFirstLaunchCompleted checks setting value', async () => {
      const { isFirstLaunchCompleted } = await import('@/lib/codexDatabase')
      mockAdapter.all.mockResolvedValue([{ value: 'true' }])

      const result = await isFirstLaunchCompleted()

      expect(result).toBe(true)
    })
  })

  // ============================================================================
  // Error handling
  // ============================================================================

  describe('error handling', () => {
    let mockAdapter: {
      exec: ReturnType<typeof vi.fn>
      run: ReturnType<typeof vi.fn>
      all: ReturnType<typeof vi.fn>
      get: ReturnType<typeof vi.fn>
    }

    beforeEach(async () => {
      vi.resetModules()
      vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } })

      mockAdapter = {
        exec: vi.fn().mockResolvedValue(undefined),
        run: vi.fn(),
        all: vi.fn(),
        get: vi.fn(),
      }

      const sqlModule = await import('@framers/sql-storage-adapter')
      vi.mocked(sqlModule.createDatabase).mockResolvedValue(mockAdapter as any)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('storeEmbedding returns false on error', async () => {
      const { storeEmbedding } = await import('@/lib/codexDatabase')
      mockAdapter.run.mockRejectedValue(new Error('SQL error'))

      const result = await storeEmbedding({
        id: 'emb-123',
        path: 'path',
        title: 'title',
        content: 'content',
        contentType: 'strand',
        embedding: [],
        createdAt: '',
      })

      expect(result).toBe(false)
    })

    it('getAllEmbeddings returns empty array on error', async () => {
      const { getAllEmbeddings } = await import('@/lib/codexDatabase')
      mockAdapter.all.mockRejectedValue(new Error('SQL error'))

      const result = await getAllEmbeddings()

      expect(result).toEqual([])
    })

    it('recordSearch returns null on error', async () => {
      const { recordSearch } = await import('@/lib/codexDatabase')
      mockAdapter.run.mockRejectedValue(new Error('SQL error'))

      const result = await recordSearch('query', 5)

      expect(result).toBeNull()
    })

    it('getRecentSearches returns empty array on error', async () => {
      const { getRecentSearches } = await import('@/lib/codexDatabase')
      mockAdapter.all.mockRejectedValue(new Error('SQL error'))

      const result = await getRecentSearches()

      expect(result).toEqual([])
    })

    it('saveReadingProgress returns false on error', async () => {
      const { saveReadingProgress } = await import('@/lib/codexDatabase')
      mockAdapter.run.mockRejectedValue(new Error('SQL error'))

      const result = await saveReadingProgress({
        path: 'path',
        scrollPosition: 0,
        readPercentage: 0,
        lastReadAt: '',
        totalReadTime: 0,
        completed: false,
      })

      expect(result).toBe(false)
    })

    it('getReadingProgress returns null on error', async () => {
      const { getReadingProgress } = await import('@/lib/codexDatabase')
      mockAdapter.all.mockRejectedValue(new Error('SQL error'))

      const result = await getReadingProgress('path')

      expect(result).toBeNull()
    })

    it('saveDraft returns false on error', async () => {
      const { saveDraft } = await import('@/lib/codexDatabase')
      mockAdapter.run.mockRejectedValue(new Error('SQL error'))

      const result = await saveDraft({
        id: 'draft-123',
        type: 'strand',
        path: 'path',
        title: 'title',
        content: 'content',
        metadata: '{}',
        autoSaved: false,
      })

      expect(result).toBe(false)
    })

    it('addBookmark returns null on error', async () => {
      const { addBookmark } = await import('@/lib/codexDatabase')
      mockAdapter.run.mockRejectedValue(new Error('SQL error'))

      const result = await addBookmark({
        path: 'path',
        title: 'title',
      })

      expect(result).toBeNull()
    })

    it('clearAllData returns false on error', async () => {
      const { clearAllData } = await import('@/lib/codexDatabase')
      mockAdapter.run.mockRejectedValue(new Error('SQL error'))

      const result = await clearAllData()

      expect(result).toBe(false)
    })
  })

  // ============================================================================
  // Export functionality
  // ============================================================================

  describe('exportDatabase', () => {
    beforeEach(async () => {
      vi.resetModules()
      // @ts-ignore - SSR mode for simpler test
      vi.stubGlobal('window', undefined)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('returns structured export object', async () => {
      const { exportDatabase } = await import('@/lib/codexDatabase')

      const result = await exportDatabase()

      expect(result.version).toBe(1)
      expect(result.exportedAt).toBeDefined()
      expect(result.embeddings).toEqual([])
      expect(result.searchHistory).toEqual([])
      expect(result.readingProgress).toEqual([])
      expect(result.drafts).toEqual([])
      expect(result.bookmarks).toEqual([])
    })
  })
})
