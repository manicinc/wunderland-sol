/**
 * Batch Selection Hook
 * @module codex/hooks/useBatchSelection
 * 
 * Manages batch selection state for Learning Studio items:
 * - Flashcards
 * - Quiz questions
 * - Glossary terms
 * 
 * Features:
 * - Toggle individual items
 * - Select/deselect all
 * - Range selection (shift+click)
 * - Keyboard navigation
 */

import { useState, useCallback, useMemo } from 'react'

export type SelectableItemType = 'flashcard' | 'quiz' | 'glossary'

export interface UseBatchSelectionOptions {
  /** Type of items being selected */
  type: SelectableItemType
  /** Maximum items that can be selected */
  maxSelection?: number
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void
}

export interface UseBatchSelectionReturn {
  /** Currently selected item IDs */
  selectedIds: Set<string>
  /** Number of selected items */
  selectedCount: number
  /** Whether selection mode is active */
  isSelecting: boolean
  /** Toggle item selection */
  toggle: (id: string) => void
  /** Select a single item (replaces selection) */
  select: (id: string) => void
  /** Select multiple items */
  selectMultiple: (ids: string[]) => void
  /** Deselect an item */
  deselect: (id: string) => void
  /** Select all items from list */
  selectAll: (ids: string[]) => void
  /** Clear all selections */
  clearSelection: () => void
  /** Check if item is selected */
  isSelected: (id: string) => boolean
  /** Toggle selection mode */
  toggleSelectionMode: () => void
  /** Range select (for shift+click) */
  selectRange: (fromId: string, toId: string, allIds: string[]) => void
  /** Handle click with modifier keys */
  handleItemClick: (id: string, event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }, allIds: string[]) => void
  /** Last selected ID (anchor for range selection) */
  lastSelectedId: string | null
  /** Item type */
  type: SelectableItemType
}

export function useBatchSelection(
  options: UseBatchSelectionOptions
): UseBatchSelectionReturn {
  const { type, maxSelection, onSelectionChange } = options
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSelecting, setIsSelecting] = useState(false)
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
  
  const selectedCount = selectedIds.size
  
  // Toggle selection of a single item
  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (maxSelection && next.size >= maxSelection) {
          return prev // Don't exceed max
        }
        next.add(id)
      }
      onSelectionChange?.(next)
      return next
    })
    setLastSelectedId(id)
    setIsSelecting(true)
  }, [maxSelection, onSelectionChange])
  
  // Select a single item (replaces selection)
  const select = useCallback((id: string) => {
    const next = new Set([id])
    setSelectedIds(next)
    setLastSelectedId(id)
    setIsSelecting(true)
    onSelectionChange?.(next)
  }, [onSelectionChange])
  
  // Select multiple items (adds to selection)
  const selectMultiple = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      for (const id of ids) {
        if (maxSelection && next.size >= maxSelection) break
        next.add(id)
      }
      onSelectionChange?.(next)
      return next
    })
    if (ids.length > 0) {
      setLastSelectedId(ids[ids.length - 1])
      setIsSelecting(true)
    }
  }, [maxSelection, onSelectionChange])
  
  // Deselect an item
  const deselect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      onSelectionChange?.(next)
      return next
    })
  }, [onSelectionChange])
  
  // Select all items
  const selectAll = useCallback((ids: string[]) => {
    const toSelect = maxSelection ? ids.slice(0, maxSelection) : ids
    const next = new Set(toSelect)
    setSelectedIds(next)
    setIsSelecting(true)
    onSelectionChange?.(next)
  }, [maxSelection, onSelectionChange])
  
  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setIsSelecting(false)
    setLastSelectedId(null)
    onSelectionChange?.(new Set())
  }, [onSelectionChange])
  
  // Check if item is selected
  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id)
  }, [selectedIds])
  
  // Toggle selection mode
  const toggleSelectionMode = useCallback(() => {
    if (isSelecting) {
      clearSelection()
    } else {
      setIsSelecting(true)
    }
  }, [isSelecting, clearSelection])
  
  // Range selection
  const selectRange = useCallback((fromId: string, toId: string, allIds: string[]) => {
    const fromIndex = allIds.indexOf(fromId)
    const toIndex = allIds.indexOf(toId)
    
    if (fromIndex === -1 || toIndex === -1) return
    
    const start = Math.min(fromIndex, toIndex)
    const end = Math.max(fromIndex, toIndex)
    const rangeIds = allIds.slice(start, end + 1)
    
    setSelectedIds(prev => {
      const next = new Set(prev)
      for (const id of rangeIds) {
        if (maxSelection && next.size >= maxSelection) break
        next.add(id)
      }
      onSelectionChange?.(next)
      return next
    })
    setIsSelecting(true)
  }, [maxSelection, onSelectionChange])
  
  // Handle click with modifier keys
  const handleItemClick = useCallback((
    id: string,
    event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
    allIds: string[]
  ) => {
    const isMultiSelect = event.ctrlKey || event.metaKey
    const isRangeSelect = event.shiftKey
    
    if (isRangeSelect && lastSelectedId) {
      selectRange(lastSelectedId, id, allIds)
    } else if (isMultiSelect) {
      toggle(id)
    } else {
      // If already selected and clicking again, toggle off
      if (selectedIds.has(id) && selectedIds.size === 1) {
        clearSelection()
      } else {
        select(id)
      }
    }
  }, [lastSelectedId, selectRange, toggle, select, selectedIds, clearSelection])
  
  return {
    selectedIds,
    selectedCount,
    isSelecting,
    toggle,
    select,
    selectMultiple,
    deselect,
    selectAll,
    clearSelection,
    isSelected,
    toggleSelectionMode,
    selectRange,
    handleItemClick,
    lastSelectedId,
    type,
  }
}

export default useBatchSelection

