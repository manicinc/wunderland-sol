/**
 * Hook for managing advanced filter state (calendar, tags, exclusions)
 * @module codex/hooks/useAdvancedFilters
 *
 * @remarks
 * - Manages date filtering (single date or range)
 * - Manages tag multi-select filtering
 * - Manages subject filtering
 * - Manages path exclusions (hide/unhide items)
 * - Persists filter preferences to localStorage
 *
 * @example
 * ```tsx
 * const {
 *   advancedFilters,
 *   setDateFilter,
 *   toggleTag,
 *   excludePath,
 *   activeFilterCount
 * } = useAdvancedFilters()
 * ```
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import type { AdvancedFilterOptions, DateFilter } from '../types'

const STORAGE_KEY = 'codex-advanced-filters'

/**
 * Default advanced filter options
 */
export const DEFAULT_ADVANCED_FILTERS: AdvancedFilterOptions = {
  dateFilter: { mode: 'none' },
  selectedTags: [],
  tagMatchMode: 'any',
  selectedSubjects: [],
  selectedTopics: [],
  excludedPaths: [],
}

interface UseAdvancedFiltersResult {
  /** Current advanced filter options */
  advancedFilters: AdvancedFilterOptions
  /** Set date filter (single date, range, or none) */
  setDateFilter: (filter: DateFilter) => void
  /** Clear date filter */
  clearDateFilter: () => void
  /** Toggle a tag in the selection */
  toggleTag: (tag: string) => void
  /** Set all selected tags at once */
  setSelectedTags: (tags: string[]) => void
  /** Clear all selected tags */
  clearTags: () => void
  /** Set tag match mode (any or all) */
  setTagMatchMode: (mode: 'any' | 'all') => void
  /** Toggle a subject in the selection */
  toggleSubject: (subject: string) => void
  /** Set all selected subjects at once */
  setSelectedSubjects: (subjects: string[]) => void
  /** Clear all selected subjects */
  clearSubjects: () => void
  /** Toggle a topic in the selection */
  toggleTopic: (topic: string) => void
  /** Set all selected topics at once */
  setSelectedTopics: (topics: string[]) => void
  /** Clear all selected topics */
  clearTopics: () => void
  /** Add a path to exclusion list */
  excludePath: (path: string) => void
  /** Remove a path from exclusion list */
  includePath: (path: string) => void
  /** Toggle path exclusion */
  togglePathExclusion: (path: string) => void
  /** Check if a path is excluded */
  isExcluded: (path: string) => boolean
  /** Clear all excluded paths */
  clearExcludedPaths: () => void
  /** Reset all filters to defaults */
  resetAllFilters: () => void
  /** Count of active filters (for badge display) */
  activeFilterCount: number
  /** Whether any filters are active */
  hasActiveFilters: boolean
}

/**
 * Load filters from localStorage
 */
function loadFiltersFromStorage(): AdvancedFilterOptions {
  if (typeof window === 'undefined') return DEFAULT_ADVANCED_FILTERS
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...DEFAULT_ADVANCED_FILTERS, ...parsed }
    }
  } catch (e) {
    console.warn('Failed to load advanced filters from localStorage:', e)
  }
  return DEFAULT_ADVANCED_FILTERS
}

/**
 * Save filters to localStorage
 */
function saveFiltersToStorage(filters: AdvancedFilterOptions): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
  } catch (e) {
    console.warn('Failed to save advanced filters to localStorage:', e)
  }
}

/**
 * Manage advanced filter state for calendar, tags, subjects, and exclusions
 *
 * @remarks
 * Provides a centralized state management for all advanced filtering features.
 * Automatically persists to localStorage for session continuity.
 *
 * @example
 * ```tsx
 * function FilterPanel() {
 *   const {
 *     advancedFilters,
 *     setDateFilter,
 *     toggleTag,
 *     activeFilterCount,
 *     hasActiveFilters
 *   } = useAdvancedFilters()
 *
 *   return (
 *     <div>
 *       {hasActiveFilters && <Badge count={activeFilterCount} />}
 *       <CalendarWidget
 *         value={advancedFilters.dateFilter}
 *         onChange={setDateFilter}
 *       />
 *       <TagList
 *         selected={advancedFilters.selectedTags}
 *         onToggle={toggleTag}
 *       />
 *     </div>
 *   )
 * }
 * ```
 */
export function useAdvancedFilters(): UseAdvancedFiltersResult {
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterOptions>(DEFAULT_ADVANCED_FILTERS)

  // Load from localStorage on mount
  useEffect(() => {
    setAdvancedFilters(loadFiltersFromStorage())
  }, [])

  // Save to localStorage whenever filters change
  useEffect(() => {
    // Skip saving if still at defaults (prevents overwriting on initial load)
    const isDefault = JSON.stringify(advancedFilters) === JSON.stringify(DEFAULT_ADVANCED_FILTERS)
    if (!isDefault) {
      saveFiltersToStorage(advancedFilters)
    }
  }, [advancedFilters])

  // Date filter methods
  const setDateFilter = useCallback((filter: DateFilter) => {
    setAdvancedFilters(prev => ({ ...prev, dateFilter: filter }))
  }, [])

  const clearDateFilter = useCallback(() => {
    setAdvancedFilters(prev => ({ ...prev, dateFilter: { mode: 'none' } }))
  }, [])

  // Tag filter methods
  const toggleTag = useCallback((tag: string) => {
    setAdvancedFilters(prev => {
      const isSelected = prev.selectedTags.includes(tag)
      return {
        ...prev,
        selectedTags: isSelected
          ? prev.selectedTags.filter(t => t !== tag)
          : [...prev.selectedTags, tag]
      }
    })
  }, [])

  const setSelectedTags = useCallback((tags: string[]) => {
    setAdvancedFilters(prev => ({ ...prev, selectedTags: tags }))
  }, [])

  const clearTags = useCallback(() => {
    setAdvancedFilters(prev => ({ ...prev, selectedTags: [] }))
  }, [])

  const setTagMatchMode = useCallback((mode: 'any' | 'all') => {
    setAdvancedFilters(prev => ({ ...prev, tagMatchMode: mode }))
  }, [])

  // Subject filter methods
  const toggleSubject = useCallback((subject: string) => {
    setAdvancedFilters(prev => {
      const isSelected = prev.selectedSubjects.includes(subject)
      return {
        ...prev,
        selectedSubjects: isSelected
          ? prev.selectedSubjects.filter(s => s !== subject)
          : [...prev.selectedSubjects, subject]
      }
    })
  }, [])

  const setSelectedSubjects = useCallback((subjects: string[]) => {
    setAdvancedFilters(prev => ({ ...prev, selectedSubjects: subjects }))
  }, [])

  const clearSubjects = useCallback(() => {
    setAdvancedFilters(prev => ({ ...prev, selectedSubjects: [] }))
  }, [])

  // Topic filter methods
  const toggleTopic = useCallback((topic: string) => {
    setAdvancedFilters(prev => {
      const isSelected = prev.selectedTopics.includes(topic)
      return {
        ...prev,
        selectedTopics: isSelected
          ? prev.selectedTopics.filter(t => t !== topic)
          : [...prev.selectedTopics, topic]
      }
    })
  }, [])

  const setSelectedTopics = useCallback((topics: string[]) => {
    setAdvancedFilters(prev => ({ ...prev, selectedTopics: topics }))
  }, [])

  const clearTopics = useCallback(() => {
    setAdvancedFilters(prev => ({ ...prev, selectedTopics: [] }))
  }, [])

  // Path exclusion methods
  const excludePath = useCallback((path: string) => {
    setAdvancedFilters(prev => {
      if (prev.excludedPaths.includes(path)) return prev
      return { ...prev, excludedPaths: [...prev.excludedPaths, path] }
    })
  }, [])

  const includePath = useCallback((path: string) => {
    setAdvancedFilters(prev => ({
      ...prev,
      excludedPaths: prev.excludedPaths.filter(p => p !== path)
    }))
  }, [])

  const togglePathExclusion = useCallback((path: string) => {
    setAdvancedFilters(prev => {
      const isExcluded = prev.excludedPaths.includes(path)
      return {
        ...prev,
        excludedPaths: isExcluded
          ? prev.excludedPaths.filter(p => p !== path)
          : [...prev.excludedPaths, path]
      }
    })
  }, [])

  const isExcluded = useCallback((path: string) => {
    return advancedFilters.excludedPaths.includes(path)
  }, [advancedFilters.excludedPaths])

  const clearExcludedPaths = useCallback(() => {
    setAdvancedFilters(prev => ({ ...prev, excludedPaths: [] }))
  }, [])

  // Reset all filters
  const resetAllFilters = useCallback(() => {
    setAdvancedFilters(DEFAULT_ADVANCED_FILTERS)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  // Computed values
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (advancedFilters.dateFilter.mode !== 'none') count++
    if (advancedFilters.selectedTags.length > 0) count++
    if (advancedFilters.selectedSubjects.length > 0) count++
    if (advancedFilters.selectedTopics.length > 0) count++
    if (advancedFilters.excludedPaths.length > 0) count++
    return count
  }, [advancedFilters])

  const hasActiveFilters = useMemo(() => activeFilterCount > 0, [activeFilterCount])

  return {
    advancedFilters,
    setDateFilter,
    clearDateFilter,
    toggleTag,
    setSelectedTags,
    clearTags,
    setTagMatchMode,
    toggleSubject,
    setSelectedSubjects,
    clearSubjects,
    toggleTopic,
    setSelectedTopics,
    clearTopics,
    excludePath,
    includePath,
    togglePathExclusion,
    isExcluded,
    clearExcludedPaths,
    resetAllFilters,
    activeFilterCount,
    hasActiveFilters,
  }
}

export default useAdvancedFilters
