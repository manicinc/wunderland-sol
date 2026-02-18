/**
 * useTableSort Hook
 *
 * Manages table sorting state and logic for strand table view.
 * @module components/quarry/views/hooks/useTableSort
 */

'use client'

import { useState, useMemo, useCallback } from 'react'
import type { StrandWithPath, SortDirection, TableColumn } from '../types'

interface UseTableSortOptions {
  /** Initial sort field */
  initialSortBy?: string
  /** Initial sort direction */
  initialDirection?: SortDirection
  /** Callback when sort changes */
  onSortChange?: (sortBy: string, direction: SortDirection) => void
}

interface UseTableSortReturn {
  /** Current sort field */
  sortBy: string
  /** Current sort direction */
  sortDirection: SortDirection
  /** Toggle sort for a column */
  toggleSort: (columnId: string) => void
  /** Set sort explicitly */
  setSort: (sortBy: string, direction: SortDirection) => void
  /** Sort strands array */
  sortStrands: (strands: StrandWithPath[]) => StrandWithPath[]
}

/**
 * Extract sortable value from strand based on field
 */
function getSortValue(strand: StrandWithPath, field: string): string | number | null {
  switch (field) {
    case 'title':
      return strand.title?.toLowerCase() || strand.path.toLowerCase()
    case 'path':
      return strand.path.toLowerCase()
    case 'weave':
      return strand.weave?.toLowerCase() || ''
    case 'loom':
      return strand.loom?.toLowerCase() || ''
    case 'lastModified':
      return strand.lastModified ? new Date(strand.lastModified).getTime() : 0
    case 'difficulty':
      const diff = strand.metadata.difficulty
      if (typeof diff === 'string') {
        return diff === 'beginner' ? 0 : diff === 'intermediate' ? 1 : 2
      }
      return 1 // default to intermediate
    case 'status':
    case 'publishing':
      const status = strand.metadata.publishing?.status
      return status === 'published' ? 0 : status === 'draft' ? 1 : 2
    case 'wordCount':
      return strand.wordCount || 0
    default:
      // Try to get from metadata
      const value = strand.metadata[field as keyof typeof strand.metadata]
      if (typeof value === 'string') return value.toLowerCase()
      if (typeof value === 'number') return value
      if (Array.isArray(value)) return value.join(',').toLowerCase()
      return ''
  }
}

/**
 * Hook for managing table sort state
 */
export function useTableSort({
  initialSortBy = 'title',
  initialDirection = 'asc',
  onSortChange,
}: UseTableSortOptions = {}): UseTableSortReturn {
  const [sortBy, setSortBy] = useState(initialSortBy)
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection)

  const toggleSort = useCallback((columnId: string) => {
    if (columnId === sortBy) {
      // Toggle direction
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc'
      setSortDirection(newDirection)
      onSortChange?.(columnId, newDirection)
    } else {
      // New column, default to ascending
      setSortBy(columnId)
      setSortDirection('asc')
      onSortChange?.(columnId, 'asc')
    }
  }, [sortBy, sortDirection, onSortChange])

  const setSort = useCallback((newSortBy: string, direction: SortDirection) => {
    setSortBy(newSortBy)
    setSortDirection(direction)
    onSortChange?.(newSortBy, direction)
  }, [onSortChange])

  const sortStrands = useCallback((strands: StrandWithPath[]): StrandWithPath[] => {
    return [...strands].sort((a, b) => {
      const aValue = getSortValue(a, sortBy)
      const bValue = getSortValue(b, sortBy)

      // Handle nulls
      if (aValue === null && bValue === null) return 0
      if (aValue === null) return sortDirection === 'asc' ? 1 : -1
      if (bValue === null) return sortDirection === 'asc' ? -1 : 1

      // Compare
      let comparison = 0
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [sortBy, sortDirection])

  return {
    sortBy,
    sortDirection,
    toggleSort,
    setSort,
    sortStrands,
  }
}

export default useTableSort
