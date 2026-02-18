/**
 * useStrandViews Hook
 *
 * Main orchestrator hook for strand database views.
 * Manages view state, preferences, and strand data transformation.
 * @module components/quarry/views/hooks/useStrandViews
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  StrandViewMode,
  StrandWithPath,
  StrandViewPreferences,
  BoardGroupBy,
  SortDirection,
  TimelineGroup,
  BoardColumn,
} from '../types'
import { DEFAULT_VIEW_PREFERENCES, DEFAULT_TABLE_COLUMNS } from '../types'
import { useTableSort } from './useTableSort'
import { useBoardGroups } from './useBoardGroups'
import { useTimelineGroups } from './useTimelineGroups'

// Storage key for preferences
const STORAGE_KEY = 'codex-strand-view-preferences'

interface UseStrandViewsOptions {
  /** Initial view mode */
  initialView?: StrandViewMode
  /** Initial strands data */
  strands?: StrandWithPath[]
  /** Callback when preferences change */
  onPreferencesChange?: (prefs: StrandViewPreferences) => void
}

interface UseStrandViewsReturn {
  // View mode
  view: StrandViewMode
  setView: (view: StrandViewMode) => void

  // Preferences
  preferences: StrandViewPreferences
  updatePreferences: (updates: Partial<StrandViewPreferences>) => void

  // Table view
  sortBy: string
  sortDirection: SortDirection
  toggleSort: (columnId: string) => void
  sortedStrands: StrandWithPath[]
  visibleColumns: string[]
  setVisibleColumns: (columns: string[]) => void

  // Board view
  boardGroupBy: BoardGroupBy
  setBoardGroupBy: (groupBy: BoardGroupBy) => void
  boardColumns: BoardColumn[]
  toggleBoardColumn: (columnId: string) => void

  // Gallery view
  galleryLayout: 'grid' | 'masonry'
  setGalleryLayout: (layout: 'grid' | 'masonry') => void
  galleryColumns: number
  setGalleryColumns: (columns: number) => void

  // Timeline view
  timelineGroups: TimelineGroup[]
  toggleTimelineGroup: (period: string) => void

  // Loading
  isLoading: boolean
}

/**
 * Load preferences from localStorage
 */
function loadPreferences(): StrandViewPreferences {
  if (typeof window === 'undefined') return DEFAULT_VIEW_PREFERENCES

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_VIEW_PREFERENCES, ...JSON.parse(stored) }
    }
  } catch (e) {
    console.error('[useStrandViews] Failed to load preferences:', e)
  }

  return DEFAULT_VIEW_PREFERENCES
}

/**
 * Save preferences to localStorage
 */
function savePreferences(prefs: StrandViewPreferences): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch (e) {
    console.error('[useStrandViews] Failed to save preferences:', e)
  }
}

/**
 * Main hook for strand database views
 */
export function useStrandViews(
  strandsInput: StrandWithPath[],
  options: UseStrandViewsOptions = {}
): UseStrandViewsReturn {
  const { initialView, onPreferencesChange } = options

  // Load initial preferences
  const [preferences, setPreferences] = useState<StrandViewPreferences>(() => {
    const loaded = loadPreferences()
    return {
      ...loaded,
      defaultView: initialView || loaded.defaultView,
    }
  })

  const [view, setViewState] = useState<StrandViewMode>(preferences.defaultView)
  const [isLoading, setIsLoading] = useState(false)

  // Table sort
  const {
    sortBy,
    sortDirection,
    toggleSort,
    sortStrands,
  } = useTableSort({
    initialSortBy: preferences.table.sortBy,
    initialDirection: preferences.table.sortDirection,
    onSortChange: (newSortBy, direction) => {
      updatePreferences({
        table: { ...preferences.table, sortBy: newSortBy, sortDirection: direction },
      })
    },
  })

  // Board groups
  const {
    columns: boardColumns,
    toggleColumn: toggleBoardColumn,
  } = useBoardGroups(strandsInput, {
    groupBy: preferences.board.groupBy,
    initialCollapsed: preferences.board.collapsedColumns,
    onCollapsedChange: (collapsed) => {
      updatePreferences({
        board: { ...preferences.board, collapsedColumns: collapsed },
      })
    },
  })

  // Timeline groups
  const {
    groups: timelineGroups,
    toggleGroup: toggleTimelineGroup,
  } = useTimelineGroups(strandsInput, {
    initialCollapsed: preferences.timeline.collapsedGroups,
    onCollapsedChange: (collapsed) => {
      updatePreferences({
        timeline: { ...preferences.timeline, collapsedGroups: collapsed },
      })
    },
  })

  // Sorted strands for table view
  const sortedStrands = useMemo(() => {
    return sortStrands(strandsInput)
  }, [strandsInput, sortStrands])

  // Update preferences helper
  const updatePreferences = useCallback((updates: Partial<StrandViewPreferences>) => {
    setPreferences((prev) => {
      const newPrefs = { ...prev, ...updates }
      savePreferences(newPrefs)
      onPreferencesChange?.(newPrefs)
      return newPrefs
    })
  }, [onPreferencesChange])

  // View change handler
  const setView = useCallback((newView: StrandViewMode) => {
    setViewState(newView)
    updatePreferences({ defaultView: newView })
  }, [updatePreferences])

  // Column visibility
  const setVisibleColumns = useCallback((columns: string[]) => {
    updatePreferences({
      table: { ...preferences.table, columns },
    })
  }, [preferences.table, updatePreferences])

  // Board group by
  const setBoardGroupBy = useCallback((groupBy: BoardGroupBy) => {
    updatePreferences({
      board: { ...preferences.board, groupBy, collapsedColumns: [] },
    })
  }, [preferences.board, updatePreferences])

  // Gallery layout
  const setGalleryLayout = useCallback((layout: 'grid' | 'masonry') => {
    updatePreferences({
      gallery: { ...preferences.gallery, layout },
    })
  }, [preferences.gallery, updatePreferences])

  const setGalleryColumns = useCallback((columns: number) => {
    updatePreferences({
      gallery: { ...preferences.gallery, columns },
    })
  }, [preferences.gallery, updatePreferences])

  return {
    // View mode
    view,
    setView,

    // Preferences
    preferences,
    updatePreferences,

    // Table view
    sortBy,
    sortDirection,
    toggleSort,
    sortedStrands,
    visibleColumns: preferences.table.columns,
    setVisibleColumns,

    // Board view
    boardGroupBy: preferences.board.groupBy,
    setBoardGroupBy,
    boardColumns,
    toggleBoardColumn,

    // Gallery view
    galleryLayout: preferences.gallery.layout,
    setGalleryLayout,
    galleryColumns: preferences.gallery.columns,
    setGalleryColumns,

    // Timeline view
    timelineGroups,
    toggleTimelineGroup: (period) => toggleTimelineGroup(period as any),

    // Loading
    isLoading,
  }
}

export default useStrandViews
