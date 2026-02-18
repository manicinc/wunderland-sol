/**
 * useBoardGroups Hook
 *
 * Groups strands into columns for board/kanban view.
 * @module components/quarry/views/hooks/useBoardGroups
 */

'use client'

import { useMemo, useCallback, useState } from 'react'
import type { StrandWithPath, BoardColumn, BoardGroupBy, BOARD_GROUP_CONFIG } from '../types'

interface UseBoardGroupsOptions {
  /** Group by field */
  groupBy: BoardGroupBy
  /** Initially collapsed columns */
  initialCollapsed?: string[]
  /** Callback when columns change */
  onCollapsedChange?: (collapsed: string[]) => void
}

interface UseBoardGroupsReturn {
  /** Grouped columns */
  columns: BoardColumn[]
  /** Collapsed column IDs */
  collapsedColumns: string[]
  /** Toggle column collapsed state */
  toggleColumn: (columnId: string) => void
  /** Check if column is collapsed */
  isCollapsed: (columnId: string) => boolean
  /** Get all unique values for groupBy field */
  allValues: string[]
}

/**
 * Extract group value from strand based on groupBy field
 */
function getGroupValue(strand: StrandWithPath, groupBy: BoardGroupBy): string {
  switch (groupBy) {
    case 'status':
      return strand.metadata.publishing?.status || 'draft'
    case 'difficulty':
      const diff = strand.metadata.difficulty
      if (typeof diff === 'string') return diff
      if (typeof diff === 'object' && diff?.overall) return String(diff.overall)
      return 'intermediate'
    case 'subject':
      const subjects = strand.metadata.taxonomy?.subjects
      return subjects?.[0] || 'Uncategorized'
    case 'topic':
      const topics = strand.metadata.taxonomy?.topics
      return topics?.[0] || 'Uncategorized'
    case 'weave':
      return strand.weave || 'Unknown'
    default:
      return 'Other'
  }
}

/**
 * Get color for a column value
 */
function getColumnColor(groupBy: BoardGroupBy, value: string): string {
  switch (groupBy) {
    case 'status':
      return value === 'published' ? '#22c55e' : value === 'draft' ? '#f59e0b' : '#6b7280'
    case 'difficulty':
      return value === 'beginner' ? '#22c55e' : value === 'intermediate' ? '#f59e0b' : '#ef4444'
    default:
      // Generate consistent color from string
      let hash = 0
      for (let i = 0; i < value.length; i++) {
        hash = value.charCodeAt(i) + ((hash << 5) - hash)
      }
      const hue = hash % 360
      return `hsl(${hue}, 60%, 50%)`
  }
}

/**
 * Get predefined column order for known groupBy values
 */
function getColumnOrder(groupBy: BoardGroupBy): string[] | null {
  switch (groupBy) {
    case 'status':
      return ['draft', 'published', 'archived']
    case 'difficulty':
      return ['beginner', 'intermediate', 'advanced']
    default:
      return null
  }
}

/**
 * Hook for grouping strands into board columns
 */
export function useBoardGroups(
  strands: StrandWithPath[],
  options: UseBoardGroupsOptions
): UseBoardGroupsReturn {
  const { groupBy, initialCollapsed = [], onCollapsedChange } = options

  const [collapsedColumns, setCollapsedColumns] = useState<string[]>(initialCollapsed)

  // Get all unique values for the groupBy field
  const allValues = useMemo((): string[] => {
    const valuesSet = new Set<string>()
    strands.forEach((strand) => {
      valuesSet.add(getGroupValue(strand, groupBy))
    })

    // Apply predefined order if available
    const predefinedOrder = getColumnOrder(groupBy)
    if (predefinedOrder) {
      const orderedValues: string[] = []
      predefinedOrder.forEach((v) => {
        if (valuesSet.has(v)) {
          orderedValues.push(v)
          valuesSet.delete(v)
        }
      })
      // Add any remaining values
      return [...orderedValues, ...Array.from(valuesSet).sort()]
    }

    return Array.from(valuesSet).sort()
  }, [strands, groupBy])

  // Group strands into columns
  const columns = useMemo((): BoardColumn[] => {
    const columnMap = new Map<string, StrandWithPath[]>()

    // Initialize columns for all values
    allValues.forEach((value) => {
      columnMap.set(value, [])
    })

    // Group strands
    strands.forEach((strand) => {
      const value = getGroupValue(strand, groupBy)
      const column = columnMap.get(value) || []
      column.push(strand)
      columnMap.set(value, column)
    })

    // Convert to array
    return allValues.map((value) => ({
      id: value,
      label: value.charAt(0).toUpperCase() + value.slice(1),
      color: getColumnColor(groupBy, value),
      strands: columnMap.get(value) || [],
      isCollapsed: collapsedColumns.includes(value),
    }))
  }, [strands, groupBy, allValues, collapsedColumns])

  const toggleColumn = useCallback((columnId: string) => {
    setCollapsedColumns((prev) => {
      const newCollapsed = prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
      onCollapsedChange?.(newCollapsed)
      return newCollapsed
    })
  }, [onCollapsedChange])

  const isCollapsed = useCallback((columnId: string) => {
    return collapsedColumns.includes(columnId)
  }, [collapsedColumns])

  return {
    columns,
    collapsedColumns,
    toggleColumn,
    isCollapsed,
    allValues,
  }
}

export default useBoardGroups
