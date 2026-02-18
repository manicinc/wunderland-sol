/**
 * Tests for SelectedStrandsContext
 * @module __tests__/unit/ask/selectedStrandsContext.test
 *
 * Tests the shared strand selection context for RAG integration:
 * - Provider initialization
 * - Adding/removing strands
 * - Clearing all selections
 * - Word count calculations
 * - Active context toggling
 *
 * @vitest-environment happy-dom
 */

import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import {
  SelectedStrandsProvider,
  useSelectedStrands,
  useSelectedStrandsSafe,
  type SelectedStrand,
} from '@/components/quarry/contexts/SelectedStrandsContext'

// Test data factory
function createMockStrand(overrides: Partial<SelectedStrand> = {}): SelectedStrand {
  return {
    id: `strand_${Math.random().toString(36).slice(2, 9)}`,
    path: '/test/path.md',
    title: 'Test Strand',
    content: 'Test content for the strand.',
    wordCount: 5,
    tags: ['test'],
    subjects: ['testing'],
    topics: ['unit-tests'],
    ...overrides,
  }
}

// Wrapper component for tests
function createWrapper(initialStrands: SelectedStrand[] = []) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SelectedStrandsProvider initialStrands={initialStrands}>
        {children}
      </SelectedStrandsProvider>
    )
  }
}

describe('SelectedStrandsContext', () => {
  describe('Provider initialization', () => {
    it('should initialize with empty strands by default', () => {
      const { result } = renderHook(() => useSelectedStrands(), {
        wrapper: createWrapper(),
      })

      expect(result.current.strands).toEqual([])
      expect(result.current.selectedIds.size).toBe(0)
      expect(result.current.totalWords).toBe(0)
      expect(result.current.isActiveContext).toBe(true)
    })

    it('should initialize with provided initial strands', () => {
      const initialStrands = [
        createMockStrand({ id: 'strand-1', title: 'First', wordCount: 100 }),
        createMockStrand({ id: 'strand-2', title: 'Second', wordCount: 200 }),
      ]

      const { result } = renderHook(() => useSelectedStrands(), {
        wrapper: createWrapper(initialStrands),
      })

      expect(result.current.strands).toHaveLength(2)
      expect(result.current.selectedIds.has('strand-1')).toBe(true)
      expect(result.current.selectedIds.has('strand-2')).toBe(true)
      expect(result.current.totalWords).toBe(300)
    })
  })

  describe('useSelectedStrandsSafe', () => {
    it('should return null when used outside provider', () => {
      const { result } = renderHook(() => useSelectedStrandsSafe())
      expect(result.current).toBeNull()
    })

    it('should return context when used inside provider', () => {
      const { result } = renderHook(() => useSelectedStrandsSafe(), {
        wrapper: createWrapper(),
      })
      expect(result.current).not.toBeNull()
      expect(result.current?.strands).toEqual([])
    })
  })

  describe('addStrand', () => {
    it('should add a strand to the selection', () => {
      const { result } = renderHook(() => useSelectedStrands(), {
        wrapper: createWrapper(),
      })

      const strand = createMockStrand({ id: 'new-strand', wordCount: 50 })

      act(() => {
        result.current.addStrand(strand)
      })

      expect(result.current.strands).toHaveLength(1)
      expect(result.current.strands[0].id).toBe('new-strand')
      expect(result.current.selectedIds.has('new-strand')).toBe(true)
      expect(result.current.totalWords).toBe(50)
    })

    it('should not add duplicate strands', () => {
      const strand = createMockStrand({ id: 'duplicate-strand' })
      const { result } = renderHook(() => useSelectedStrands(), {
        wrapper: createWrapper([strand]),
      })

      expect(result.current.strands).toHaveLength(1)

      act(() => {
        result.current.addStrand(strand)
      })

      expect(result.current.strands).toHaveLength(1)
    })
  })

  describe('removeStrand', () => {
    it('should remove a strand from the selection', () => {
      const strand1 = createMockStrand({ id: 'strand-1', wordCount: 100 })
      const strand2 = createMockStrand({ id: 'strand-2', wordCount: 200 })

      const { result } = renderHook(() => useSelectedStrands(), {
        wrapper: createWrapper([strand1, strand2]),
      })

      expect(result.current.strands).toHaveLength(2)
      expect(result.current.totalWords).toBe(300)

      act(() => {
        result.current.removeStrand('strand-1')
      })

      expect(result.current.strands).toHaveLength(1)
      expect(result.current.strands[0].id).toBe('strand-2')
      expect(result.current.selectedIds.has('strand-1')).toBe(false)
      expect(result.current.totalWords).toBe(200)
    })

    it('should handle removing non-existent strand gracefully', () => {
      const strand = createMockStrand({ id: 'existing' })
      const { result } = renderHook(() => useSelectedStrands(), {
        wrapper: createWrapper([strand]),
      })

      act(() => {
        result.current.removeStrand('non-existent')
      })

      expect(result.current.strands).toHaveLength(1)
    })
  })

  describe('toggleStrand', () => {
    it('should add strand if not selected', () => {
      const { result } = renderHook(() => useSelectedStrands(), {
        wrapper: createWrapper(),
      })

      const strand = createMockStrand({ id: 'toggle-strand' })

      act(() => {
        result.current.toggleStrand(strand)
      })

      expect(result.current.strands).toHaveLength(1)
      expect(result.current.selectedIds.has('toggle-strand')).toBe(true)
    })

    it('should remove strand if already selected', () => {
      const strand = createMockStrand({ id: 'toggle-strand' })
      const { result } = renderHook(() => useSelectedStrands(), {
        wrapper: createWrapper([strand]),
      })

      act(() => {
        result.current.toggleStrand(strand)
      })

      expect(result.current.strands).toHaveLength(0)
      expect(result.current.selectedIds.has('toggle-strand')).toBe(false)
    })
  })

  describe('addMultiple', () => {
    it('should add multiple strands at once', () => {
      const { result } = renderHook(() => useSelectedStrands(), {
        wrapper: createWrapper(),
      })

      const strands = [
        createMockStrand({ id: 'multi-1', wordCount: 100 }),
        createMockStrand({ id: 'multi-2', wordCount: 200 }),
        createMockStrand({ id: 'multi-3', wordCount: 300 }),
      ]

      act(() => {
        result.current.addMultiple(strands)
      })

      expect(result.current.strands).toHaveLength(3)
      expect(result.current.totalWords).toBe(600)
    })

    it('should skip duplicates when adding multiple', () => {
      const existing = createMockStrand({ id: 'existing', wordCount: 50 })
      const { result } = renderHook(() => useSelectedStrands(), {
        wrapper: createWrapper([existing]),
      })

      const newStrands = [
        existing, // duplicate
        createMockStrand({ id: 'new-1', wordCount: 100 }),
      ]

      act(() => {
        result.current.addMultiple(newStrands)
      })

      expect(result.current.strands).toHaveLength(2)
      expect(result.current.totalWords).toBe(150)
    })
  })

  describe('clearAll', () => {
    it('should remove all strands', () => {
      const strands = [
        createMockStrand({ id: 'clear-1' }),
        createMockStrand({ id: 'clear-2' }),
        createMockStrand({ id: 'clear-3' }),
      ]

      const { result } = renderHook(() => useSelectedStrands(), {
        wrapper: createWrapper(strands),
      })

      expect(result.current.strands).toHaveLength(3)

      act(() => {
        result.current.clearAll()
      })

      expect(result.current.strands).toHaveLength(0)
      expect(result.current.selectedIds.size).toBe(0)
      expect(result.current.totalWords).toBe(0)
    })
  })

  describe('setStrands', () => {
    it('should replace all strands with new set', () => {
      const initial = [createMockStrand({ id: 'initial', wordCount: 100 })]
      const { result } = renderHook(() => useSelectedStrands(), {
        wrapper: createWrapper(initial),
      })

      const newStrands = [
        createMockStrand({ id: 'new-1', wordCount: 200 }),
        createMockStrand({ id: 'new-2', wordCount: 300 }),
      ]

      act(() => {
        result.current.setStrands(newStrands)
      })

      expect(result.current.strands).toHaveLength(2)
      expect(result.current.selectedIds.has('initial')).toBe(false)
      expect(result.current.selectedIds.has('new-1')).toBe(true)
      expect(result.current.selectedIds.has('new-2')).toBe(true)
      expect(result.current.totalWords).toBe(500)
    })
  })

  describe('setActiveContext', () => {
    it('should toggle active context state', () => {
      const { result } = renderHook(() => useSelectedStrands(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isActiveContext).toBe(true)

      act(() => {
        result.current.setActiveContext(false)
      })

      expect(result.current.isActiveContext).toBe(false)

      act(() => {
        result.current.setActiveContext(true)
      })

      expect(result.current.isActiveContext).toBe(true)
    })
  })

  describe('computed values', () => {
    it('should correctly calculate totalWords from strands with wordCount', () => {
      const strands = [
        createMockStrand({ id: 's1', wordCount: 100 }),
        createMockStrand({ id: 's2', wordCount: undefined }), // No word count
        createMockStrand({ id: 's3', wordCount: 300 }),
      ]

      const { result } = renderHook(() => useSelectedStrands(), {
        wrapper: createWrapper(strands),
      })

      expect(result.current.totalWords).toBe(400)
    })

    it('should update selectedIds when strands change', () => {
      const { result } = renderHook(() => useSelectedStrands(), {
        wrapper: createWrapper(),
      })

      expect(result.current.selectedIds.size).toBe(0)

      act(() => {
        result.current.addStrand(createMockStrand({ id: 'test-id' }))
      })

      expect(result.current.selectedIds.size).toBe(1)
      expect(result.current.selectedIds.has('test-id')).toBe(true)
    })
  })
})
