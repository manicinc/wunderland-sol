/**
 * Tests for Move Processor
 * @module __tests__/unit/nlp/moveProcessor.test
 *
 * Tests for the NLP move processor including:
 * - Processing move operations
 * - Updating path references in content
 * - Updating block paths
 * - Queuing for background processing
 * - Detecting path references
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Use vi.hoisted to ensure mocks are available
const { mockDbAll, mockDbRun, mockGetDatabase } = vi.hoisted(() => ({
  mockDbAll: vi.fn(),
  mockDbRun: vi.fn(),
  mockGetDatabase: vi.fn(),
}))

// Mock the database module
vi.mock('@/lib/codexDatabase', () => ({
  getDatabase: mockGetDatabase,
}))

// Mock the content store
vi.mock('@/lib/content/sqliteStore', () => ({
  getContentStore: () => ({
    initialize: vi.fn(),
  }),
}))

// Import after mocks are defined
import {
  processMoveOperations,
  queueMoveProcessing,
  detectPathReferences,
  type MoveProcessorOptions,
  type MoveProcessorResult,
} from '@/lib/nlp/moveProcessor'
import type { MoveOperation } from '@/components/quarry/tree/types'

// Helper to create mock move operations
function createMoveOperation(overrides: Partial<MoveOperation> = {}): MoveOperation {
  return {
    type: 'move',
    sourcePath: 'weaves/test/old-file.md',
    destPath: 'weaves/test/new-file.md',
    name: 'file.md',
    nodeType: 'file',
    timestamp: Date.now(),
    ...overrides,
  }
}

describe('processMoveOperations', () => {
  const mockDb = {
    all: mockDbAll,
    run: mockDbRun,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDatabase.mockResolvedValue(mockDb)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns early with success when no operations', async () => {
    const result = await processMoveOperations({ operations: [] })

    expect(result.success).toBe(true)
    expect(result.strandsProcessed).toBe(0)
    expect(result.blocksUpdated).toBe(0)
    expect(result.errors).toHaveLength(0)
    expect(result.duration).toBeGreaterThanOrEqual(0)
    expect(mockDbAll).not.toHaveBeenCalled()
  })

  it('returns error when database not available', async () => {
    mockGetDatabase.mockResolvedValue(null)

    const result = await processMoveOperations({
      operations: [createMoveOperation()],
    })

    expect(result.success).toBe(false)
    expect(result.errors).toContain('Database not available')
  })

  it('collects affected strand IDs for file moves', async () => {
    mockDbAll.mockImplementation((query: string, params: unknown[]) => {
      if (query.includes('SELECT id FROM strands WHERE path =')) {
        return [{ id: 'strand-1' }]
      }
      if (query.includes('SELECT id, path, content FROM strands')) {
        return [{ id: 'strand-1', path: 'weaves/test/new-file.md', content: 'test content' }]
      }
      return []
    })
    mockDbRun.mockResolvedValue({ changes: 0 })

    const result = await processMoveOperations({
      operations: [createMoveOperation()],
    })

    expect(result.success).toBe(true)
    expect(result.strandsProcessed).toBe(1)
  })

  it('collects affected strand IDs for directory moves', async () => {
    const dirOp = createMoveOperation({
      sourcePath: 'weaves/test/old-dir',
      destPath: 'weaves/test/new-dir',
      nodeType: 'dir',
    })

    mockDbAll.mockImplementation((query: string) => {
      if (query.includes('path LIKE')) {
        return [{ id: 'strand-1' }, { id: 'strand-2' }]
      }
      if (query.includes('SELECT id, path, content FROM strands')) {
        return [{ id: 'strand-1', path: 'weaves/test/new-dir/file.md', content: 'content' }]
      }
      return []
    })
    mockDbRun.mockResolvedValue({ changes: 0 })

    const result = await processMoveOperations({
      operations: [dirOp],
    })

    expect(result.success).toBe(true)
    expect(result.strandsProcessed).toBe(2)
  })

  it('updates path references in content', async () => {
    const oldPath = 'weaves/old/path.md'
    const newPath = 'weaves/new/path.md'
    const contentWithRef = `Some content with link to [[${oldPath}]] here`

    mockDbAll.mockImplementation((query: string) => {
      if (query.includes('SELECT id FROM strands WHERE path =')) {
        return [{ id: 'strand-1' }]
      }
      if (query.includes('SELECT id, path, content FROM strands')) {
        return [{ id: 'strand-1', path: newPath, content: contentWithRef }]
      }
      return []
    })
    mockDbRun.mockResolvedValue({ changes: 1 })

    await processMoveOperations({
      operations: [createMoveOperation({ sourcePath: oldPath, destPath: newPath })],
    })

    // Check that content was updated with new path
    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE strands SET content'),
      expect.arrayContaining([
        expect.stringContaining(newPath),
        expect.any(String), // timestamp
        'strand-1',
      ])
    )
  })

  it('updates block paths', async () => {
    mockDbAll.mockImplementation((query: string) => {
      if (query.includes('SELECT id FROM strands WHERE path =')) {
        return [{ id: 'strand-1' }]
      }
      if (query.includes('SELECT id, path, content FROM strands')) {
        return [{ id: 'strand-1', path: 'weaves/test/new-file.md', content: 'content' }]
      }
      return []
    })
    mockDbRun.mockResolvedValue({ changes: 3 })

    const result = await processMoveOperations({
      operations: [createMoveOperation()],
    })

    expect(mockDbRun).toHaveBeenCalledWith(
      'UPDATE strand_blocks SET strand_path = ? WHERE strand_path = ?',
      ['weaves/test/new-file.md', 'weaves/test/old-file.md']
    )
    expect(result.blocksUpdated).toBe(3)
  })

  it('marks strands for re-embedding when requested', async () => {
    mockDbAll.mockImplementation((query: string) => {
      if (query.includes('SELECT id FROM strands WHERE path =')) {
        return [{ id: 'strand-1' }, { id: 'strand-2' }]
      }
      if (query.includes('SELECT id, path, content FROM strands')) {
        return [{ id: 'strand-1', path: 'path.md', content: 'content' }]
      }
      return []
    })
    mockDbRun.mockResolvedValue({ changes: 0 })

    await processMoveOperations({
      operations: [createMoveOperation()],
      updateEmbeddings: true,
    })

    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE strands SET last_indexed_at = NULL'),
      expect.any(Array)
    )
  })

  it('calls progress callback', async () => {
    const onProgress = vi.fn()

    mockDbAll.mockImplementation((query: string) => {
      if (query.includes('SELECT id FROM strands WHERE path =')) {
        return [{ id: 'strand-1' }]
      }
      if (query.includes('SELECT id, path, content FROM strands')) {
        return [{ id: 'strand-1', path: 'path.md', content: 'content' }]
      }
      return []
    })
    mockDbRun.mockResolvedValue({ changes: 0 })

    await processMoveOperations({
      operations: [createMoveOperation()],
      onProgress,
    })

    expect(onProgress).toHaveBeenCalledWith('Collecting affected strands', 0, 1)
    expect(onProgress).toHaveBeenCalledWith('Updating path references', expect.any(Number), expect.any(Number))
    expect(onProgress).toHaveBeenCalledWith('Updating block records', expect.any(Number), expect.any(Number))
  })

  it('handles errors gracefully', async () => {
    mockDbAll.mockImplementation((query: string) => {
      if (query.includes('SELECT id FROM strands WHERE path =')) {
        return [{ id: 'strand-1' }]
      }
      if (query.includes('SELECT id, path, content FROM strands')) {
        throw new Error('Database read error')
      }
      return []
    })

    const result = await processMoveOperations({
      operations: [createMoveOperation()],
    })

    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0]).toContain('strand-1')
  })
})

describe('queueMoveProcessing', () => {
  const mockDb = {
    all: mockDbAll,
    run: mockDbRun,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDatabase.mockResolvedValue(mockDb)
  })

  it('returns false when no operations', async () => {
    const result = await queueMoveProcessing([])

    expect(result.queued).toBe(false)
    expect(result.jobId).toBeUndefined()
  })

  it('returns false when database not available', async () => {
    mockGetDatabase.mockResolvedValue(null)

    const result = await queueMoveProcessing([createMoveOperation()])

    expect(result.queued).toBe(false)
  })

  it('queues job to pending_jobs table', async () => {
    mockDbRun.mockResolvedValue({ changes: 1 })
    mockDbAll.mockResolvedValue([])

    const ops = [createMoveOperation()]
    const result = await queueMoveProcessing(ops)

    expect(result.queued).toBe(true)
    expect(result.jobId).toMatch(/^move-\d+-[a-z0-9]+$/)
    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO pending_jobs'),
      expect.arrayContaining([
        expect.stringMatching(/^move-/),
        expect.any(String), // payload JSON
        expect.any(String), // timestamp
      ])
    )
  })

  it('falls back to immediate processing on queue failure', async () => {
    mockDbRun.mockRejectedValueOnce(new Error('Table not found'))
    mockDbRun.mockResolvedValue({ changes: 0 })
    mockDbAll.mockResolvedValue([])

    const result = await queueMoveProcessing([createMoveOperation()])

    expect(result.queued).toBe(false)
  })
})

describe('detectPathReferences', () => {
  it('returns empty array when no references found', () => {
    const content = 'Some content without any path references'
    const operations = [createMoveOperation()]

    const result = detectPathReferences(content, operations)

    expect(result).toHaveLength(0)
  })

  it('detects single path reference', () => {
    const oldPath = 'weaves/test/old-file.md'
    const newPath = 'weaves/test/new-file.md'
    const content = `Check out this link: [[${oldPath}]]`
    const operations = [createMoveOperation({ sourcePath: oldPath, destPath: newPath })]

    const result = detectPathReferences(content, operations)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      oldPath,
      newPath,
      count: 1,
    })
  })

  it('detects multiple references to same path', () => {
    const oldPath = 'weaves/test/file.md'
    const content = `Link 1: [[${oldPath}]] and Link 2: [[${oldPath}]] and Link 3: ${oldPath}`
    const operations = [createMoveOperation({ sourcePath: oldPath })]

    const result = detectPathReferences(content, operations)

    expect(result).toHaveLength(1)
    expect(result[0].count).toBe(3)
  })

  it('detects references across multiple operations', () => {
    const content = `
      Link to file1: [[weaves/old/file1.md]]
      Link to file2: [[weaves/old/file2.md]]
      No link to file3
    `
    const operations = [
      createMoveOperation({ sourcePath: 'weaves/old/file1.md', destPath: 'weaves/new/file1.md' }),
      createMoveOperation({ sourcePath: 'weaves/old/file2.md', destPath: 'weaves/new/file2.md' }),
      createMoveOperation({ sourcePath: 'weaves/old/file3.md', destPath: 'weaves/new/file3.md' }),
    ]

    const result = detectPathReferences(content, operations)

    expect(result).toHaveLength(2)
    expect(result.find(r => r.oldPath === 'weaves/old/file1.md')).toBeDefined()
    expect(result.find(r => r.oldPath === 'weaves/old/file2.md')).toBeDefined()
    expect(result.find(r => r.oldPath === 'weaves/old/file3.md')).toBeUndefined()
  })

  it('handles special regex characters in paths', () => {
    const oldPath = 'weaves/test/file[1].md'
    const content = `Link: [[${oldPath}]]`
    const operations = [createMoveOperation({ sourcePath: oldPath })]

    const result = detectPathReferences(content, operations)

    expect(result).toHaveLength(1)
    expect(result[0].count).toBe(1)
  })

  it('handles paths with dots', () => {
    const oldPath = 'weaves/my.folder/my.file.md'
    const content = `Reference: ${oldPath}`
    const operations = [createMoveOperation({ sourcePath: oldPath })]

    const result = detectPathReferences(content, operations)

    expect(result).toHaveLength(1)
  })
})
