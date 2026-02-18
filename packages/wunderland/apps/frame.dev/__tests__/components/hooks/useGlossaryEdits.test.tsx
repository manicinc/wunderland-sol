/**
 * Component Tests for useGlossaryEdits Hook
 * @module __tests__/components/hooks/useGlossaryEdits.test
 *
 * Tests for the glossary edits hook including:
 * - Loading and initialization
 * - CRUD operations (create, update, delete, restore)
 * - Merge functionality
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { GlossaryTerm } from '@/components/quarry/hooks/useGlossary'

// Use vi.hoisted to ensure these are available when mocks are created
const { mockDbAll, mockDbRun, mockPushUndo, mockGetDatabase } = vi.hoisted(() => ({
  mockDbAll: vi.fn(),
  mockDbRun: vi.fn(),
  mockPushUndo: vi.fn(),
  mockGetDatabase: vi.fn(),
}))

// Mock modules with hoisted functions
vi.mock('@/lib/codexDatabase', () => ({
  getDatabase: mockGetDatabase,
}))

vi.mock('@/components/quarry/hooks/useUndoRedo', () => ({
  useUndoRedo: () => ({
    pushUndoableAction: mockPushUndo,
    isReady: true,
  }),
}))

// Import after mocks are defined
import { useGlossaryEdits, generateTermHash } from '@/components/quarry/hooks/useGlossaryEdits'

// Mock data
const mockEdits = [
  {
    id: 'ge_123',
    content_hash: 'hash_react',
    strand_slug: 'test-strand',
    original_term: 'React',
    edited_term: 'React.js',
    edited_definition: 'A JavaScript library',
    is_deleted: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'ge_456',
    content_hash: 'hash_vue',
    strand_slug: 'test-strand',
    original_term: 'Vue',
    edited_term: null,
    edited_definition: null,
    is_deleted: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

describe('useGlossaryEdits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock implementations
    mockDbAll.mockResolvedValue([])
    mockDbRun.mockResolvedValue({ changes: 1 })
    mockPushUndo.mockResolvedValue(undefined)
    // Set up getDatabase to return our mock db
    mockGetDatabase.mockResolvedValue({
      all: mockDbAll,
      run: mockDbRun,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('starts with loading state', async () => {
      const { result } = renderHook(() => useGlossaryEdits())

      // Initially loading
      expect(result.current.loading).toBe(true)
      expect(result.current.edits.size).toBe(0)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('loads edits on mount when autoLoad is true', async () => {
      mockDbAll.mockResolvedValueOnce(mockEdits)

      const { result } = renderHook(() =>
        useGlossaryEdits({ strandSlug: 'test-strand', autoLoad: true })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockDbAll).toHaveBeenCalled()
      expect(result.current.edits.size).toBe(2)
    })

    it('initializes with empty edits map', async () => {
      const { result } = renderHook(() => useGlossaryEdits())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.edits).toBeInstanceOf(Map)
      expect(result.current.error).toBeNull()
    })
  })

  describe('updateTerm', () => {
    it('creates new edit when none exists', async () => {
      const { result } = renderHook(() =>
        useGlossaryEdits({ strandSlug: 'test-strand' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.updateTerm('new_hash', {
          originalTerm: 'NewTerm',
          editedTerm: 'Edited Term',
        })
      })

      expect(mockDbRun).toHaveBeenCalled()
      expect(result.current.edits.has('new_hash')).toBe(true)

      const edit = result.current.edits.get('new_hash')
      expect(edit?.editedTerm).toBe('Edited Term')
      expect(edit?.isDeleted).toBe(false)
    })

    it('updates existing edit', async () => {
      mockDbAll.mockResolvedValueOnce(mockEdits)

      const { result } = renderHook(() =>
        useGlossaryEdits({ strandSlug: 'test-strand' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.updateTerm('hash_react', {
          editedTerm: 'React Updated',
        })
      })

      const edit = result.current.edits.get('hash_react')
      expect(edit?.editedTerm).toBe('React Updated')
    })

    it('calls pushUndoableAction when undoReady', async () => {
      const { result } = renderHook(() => useGlossaryEdits())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.updateTerm('hash_123', {
          originalTerm: 'Test',
          editedTerm: 'Test Updated',
        })
      })

      expect(mockPushUndo).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'learning',
          actionName: 'update',
          targetType: 'glossary_term',
        })
      )
    })
  })

  describe('deleteTerm', () => {
    it('soft deletes existing edit', async () => {
      mockDbAll.mockResolvedValueOnce(mockEdits)

      const { result } = renderHook(() =>
        useGlossaryEdits({ strandSlug: 'test-strand' })
      )

      await waitFor(() => {
        expect(result.current.edits.size).toBe(2)
      })

      await act(async () => {
        await result.current.deleteTerm('hash_react')
      })

      const edit = result.current.edits.get('hash_react')
      expect(edit?.isDeleted).toBe(true)
    })

    it('does nothing when edit does not exist', async () => {
      const { result } = renderHook(() => useGlossaryEdits())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.deleteTerm('nonexistent_hash')
      })

      expect(result.current.edits.has('nonexistent_hash')).toBe(false)
    })
  })

  describe('deleteTermWithCreate', () => {
    it('creates edit and marks as deleted when none exists', async () => {
      const { result } = renderHook(() =>
        useGlossaryEdits({ strandSlug: 'test-strand' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.deleteTermWithCreate('new_hash', 'NewTerm', 'test-strand')
      })

      expect(result.current.edits.has('new_hash')).toBe(true)
      const edit = result.current.edits.get('new_hash')
      expect(edit?.isDeleted).toBe(true)
      expect(edit?.originalTerm).toBe('NewTerm')
    })

    it('updates existing edit to deleted', async () => {
      mockDbAll.mockResolvedValueOnce(mockEdits)

      const { result } = renderHook(() =>
        useGlossaryEdits({ strandSlug: 'test-strand' })
      )

      await waitFor(() => {
        expect(result.current.edits.size).toBe(2)
      })

      await act(async () => {
        await result.current.deleteTermWithCreate('hash_react', 'React', 'test-strand')
      })

      const edit = result.current.edits.get('hash_react')
      expect(edit?.isDeleted).toBe(true)
    })
  })

  describe('restoreTerm', () => {
    it('restores deleted edit', async () => {
      mockDbAll.mockResolvedValueOnce(mockEdits)

      const { result } = renderHook(() =>
        useGlossaryEdits({ strandSlug: 'test-strand' })
      )

      await waitFor(() => {
        expect(result.current.edits.size).toBe(2)
      })

      expect(result.current.edits.get('hash_vue')?.isDeleted).toBe(true)

      await act(async () => {
        await result.current.restoreTerm('hash_vue')
      })

      const edit = result.current.edits.get('hash_vue')
      expect(edit?.isDeleted).toBe(false)
    })

    it('does nothing when edit does not exist', async () => {
      const { result } = renderHook(() => useGlossaryEdits())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.restoreTerm('nonexistent_hash')
      })

      expect(result.current.edits.has('nonexistent_hash')).toBe(false)
    })
  })

  describe('hasEdit', () => {
    it('returns true for existing edit', async () => {
      mockDbAll.mockResolvedValueOnce(mockEdits)

      const { result } = renderHook(() =>
        useGlossaryEdits({ strandSlug: 'test-strand' })
      )

      await waitFor(() => {
        expect(result.current.edits.size).toBe(2)
      })

      expect(result.current.hasEdit('hash_react')).toBe(true)
      expect(result.current.hasEdit('hash_vue')).toBe(true)
    })

    it('returns false for non-existing edit', async () => {
      const { result } = renderHook(() => useGlossaryEdits())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.hasEdit('nonexistent')).toBe(false)
    })
  })

  describe('isDeleted', () => {
    it('returns true for deleted edit', async () => {
      mockDbAll.mockResolvedValueOnce(mockEdits)

      const { result } = renderHook(() =>
        useGlossaryEdits({ strandSlug: 'test-strand' })
      )

      await waitFor(() => {
        expect(result.current.edits.size).toBe(2)
      })

      expect(result.current.isDeleted('hash_vue')).toBe(true)
    })

    it('returns false for non-deleted edit', async () => {
      mockDbAll.mockResolvedValueOnce(mockEdits)

      const { result } = renderHook(() =>
        useGlossaryEdits({ strandSlug: 'test-strand' })
      )

      await waitFor(() => {
        expect(result.current.edits.size).toBe(2)
      })

      expect(result.current.isDeleted('hash_react')).toBe(false)
    })

    it('returns false for non-existing edit', async () => {
      const { result } = renderHook(() => useGlossaryEdits())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isDeleted('nonexistent')).toBe(false)
    })
  })

  describe('mergeWithGenerated', () => {
    it('applies edits to generated terms', async () => {
      const termHash = generateTermHash('React')
      mockDbAll.mockResolvedValueOnce([
        {
          id: 'ge_123',
          content_hash: termHash,
          strand_slug: null,
          original_term: 'React',
          edited_term: 'React.js Framework',
          edited_definition: 'A UI library',
          is_deleted: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ])

      const { result } = renderHook(() => useGlossaryEdits())

      await waitFor(() => {
        expect(result.current.edits.size).toBe(1)
      })

      const generatedTerms: GlossaryTerm[] = [
        { id: 'g1', term: 'React', definition: 'Original definition', category: 'keyword', confidence: 0.9 },
        { id: 'g2', term: 'Vue', definition: 'Vue framework', category: 'keyword', confidence: 0.9 },
      ]

      const merged = result.current.mergeWithGenerated(generatedTerms)

      expect(merged).toHaveLength(2)
      expect(merged[0].term).toBe('React.js Framework')
      expect(merged[0].definition).toBe('A UI library')
      expect(merged[1].term).toBe('Vue')
    })

    it('filters out deleted terms', async () => {
      const termHash = generateTermHash('React')
      mockDbAll.mockResolvedValueOnce([
        {
          id: 'ge_123',
          content_hash: termHash,
          strand_slug: null,
          original_term: 'React',
          edited_term: null,
          edited_definition: null,
          is_deleted: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ])

      const { result } = renderHook(() => useGlossaryEdits())

      await waitFor(() => {
        expect(result.current.edits.size).toBe(1)
      })

      const generatedTerms: GlossaryTerm[] = [
        { id: 'g1', term: 'React', definition: 'React definition', category: 'keyword', confidence: 0.9 },
        { id: 'g2', term: 'Vue', definition: 'Vue framework', category: 'keyword', confidence: 0.9 },
      ]

      const merged = result.current.mergeWithGenerated(generatedTerms)

      expect(merged).toHaveLength(1)
      expect(merged[0].term).toBe('Vue')
    })

    it('returns unmodified terms when no edits match', async () => {
      const { result } = renderHook(() => useGlossaryEdits())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const generatedTerms: GlossaryTerm[] = [
        { id: 'g1', term: 'React', definition: 'React definition', category: 'keyword', confidence: 0.9 },
      ]

      const merged = result.current.mergeWithGenerated(generatedTerms)

      expect(merged).toHaveLength(1)
      expect(merged[0]).toEqual(generatedTerms[0])
    })
  })

  describe('reload', () => {
    it('reloads edits from database', async () => {
      const { result } = renderHook(() =>
        useGlossaryEdits({ strandSlug: 'test-strand' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      mockDbAll.mockResolvedValueOnce([
        {
          id: 'ge_new',
          content_hash: 'hash_new',
          strand_slug: 'test-strand',
          original_term: 'NewTerm',
          edited_term: null,
          edited_definition: null,
          is_deleted: 0,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ])

      await act(async () => {
        await result.current.reload()
      })

      expect(result.current.edits.size).toBe(1)
      expect(result.current.edits.has('hash_new')).toBe(true)
    })
  })

  describe('clearAll', () => {
    it('clears all edits', async () => {
      mockDbAll.mockResolvedValueOnce(mockEdits)

      const { result } = renderHook(() =>
        useGlossaryEdits({ strandSlug: 'test-strand' })
      )

      await waitFor(() => {
        expect(result.current.edits.size).toBe(2)
      })

      await act(async () => {
        await result.current.clearAll()
      })

      expect(result.current.edits.size).toBe(0)
      expect(mockDbRun).toHaveBeenCalled()
    })
  })

  describe('generateTermHash', () => {
    it('generates consistent hash for same term', () => {
      const hash1 = generateTermHash('React')
      const hash2 = generateTermHash('React')
      expect(hash1).toBe(hash2)
    })

    it('generates different hashes for different terms', () => {
      const hash1 = generateTermHash('React')
      const hash2 = generateTermHash('Vue')
      expect(hash1).not.toBe(hash2)
    })

    it('generates hash with term_ prefix', () => {
      const hash = generateTermHash('Test')
      expect(hash.startsWith('term_')).toBe(true)
    })
  })

  describe('error handling', () => {
    it('handles database errors gracefully', async () => {
      mockGetDatabase.mockResolvedValue(null)

      const { result } = renderHook(() => useGlossaryEdits())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.edits.size).toBe(0)
    })
  })
})
