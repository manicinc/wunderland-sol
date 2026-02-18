/**
 * Hook for advanced search filtering with debouncing
 * @module codex/hooks/useSearchFilter
 *
 * @remarks
 * Extended to support advanced filtering:
 * - Date-based filtering (by frontmatter date field)
 * - Tag multi-select filtering
 * - Subject filtering
 * - Path exclusion
 * - Selected strands only filtering (via SelectedStrandsContext)
 */

import { useState, useMemo, useCallback } from 'react'
import type {
  SearchOptions,
  GitHubFile,
  FileFilterScope,
  NavigationRootScope,
  AdvancedFilterOptions,
  DateFilter,
  StrandMetadata,
} from '../types'
import { DEFAULT_SEARCH_OPTIONS } from '../constants'
import { filterFiles, debounce, shouldShowFile, shouldIgnorePath } from '../utils'
import { useSelectedStrandsSafe } from '../contexts/SelectedStrandsContext'

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

/**
 * Extended filter options for selected strands
 */
export interface SelectedStrandsFilterOptions {
  /** Only show results from selected strands */
  selectedStrandsOnly: boolean
  /** Selected strand paths for filtering */
  selectedStrandPaths: Set<string>
}

interface UseSearchFilterResult {
  /** Current search options */
  options: SearchOptions
  /** Update search query */
  setQuery: (query: string) => void
  /** Toggle search in names */
  toggleSearchNames: () => void
  /** Toggle search in content */
  toggleSearchContent: () => void
  /** Toggle case sensitivity */
  toggleCaseSensitive: () => void
  /** Set file filter scope */
  setFilterScope: (scope: FileFilterScope) => void
  /** Toggle hide empty folders */
  toggleHideEmptyFolders: () => void
  /** Set navigation root scope */
  setRootScope: (scope: NavigationRootScope) => void
  /** Set difficulty filter */
  setDifficulty: (difficulty: SearchOptions['difficulty']) => void
  /** Filtered files based on current options */
  filteredFiles: GitHubFile[]
  /** Whether search is active */
  isSearchActive: boolean
  /** Reset all filters */
  resetFilters: () => void
  // === Advanced filter options ===
  /** Current advanced filter options */
  advancedFilters: AdvancedFilterOptions
  /** Set date filter */
  setDateFilter: (filter: DateFilter) => void
  /** Toggle a tag selection */
  toggleTag: (tag: string) => void
  /** Set all selected tags */
  setSelectedTags: (tags: string[]) => void
  /** Set tag match mode */
  setTagMatchMode: (mode: 'any' | 'all') => void
  /** Toggle a subject selection */
  toggleSubject: (subject: string) => void
  /** Set all selected subjects */
  setSelectedSubjects: (subjects: string[]) => void
  /** Toggle a topic selection */
  toggleTopic: (topic: string) => void
  /** Set all selected topics */
  setSelectedTopics: (topics: string[]) => void
  /** Add a path to exclusion list */
  excludePath: (path: string) => void
  /** Remove a path from exclusion list */
  includePath: (path: string) => void
  /** Reset advanced filters */
  resetAdvancedFilters: () => void
  /** Count of active advanced filters */
  activeAdvancedFilterCount: number
  /** Whether any advanced filters are active */
  hasAdvancedFilters: boolean
  // === Selected strands filter ===
  /** Whether "selected strands only" mode is active */
  selectedStrandsOnly: boolean
  /** Toggle "selected strands only" mode */
  toggleSelectedStrandsOnly: () => void
  /** Number of selected strands available for filtering */
  selectedStrandsCount: number
  /** Whether selected strands filter is available */
  hasSelectedStrands: boolean
}

/**
 * Advanced search filtering with debouncing and multiple options
 * 
 * @param files - Array of files to filter
 * @param fileContents - Map of file paths to content (for full-text search)
 * @param debounceMs - Debounce delay in milliseconds (default: 300)
 * 
 * @remarks
 * - Debounces query input to avoid excessive filtering
 * - Supports name-only, content-only, or combined search
 * - Case-sensitive and case-insensitive modes
 * - Filters out non-markdown files and ignored paths
 * 
 * @example
 * ```tsx
 * function SearchableList({ files }: { files: GitHubFile[] }) {
 *   const {
 *     options,
 *     setQuery,
 *     toggleSearchContent,
 *     filteredFiles,
 *     isSearchActive
 *   } = useSearchFilter(files, contentMap)
 *   
 *   return (
 *     <div>
 *       <input
 *         value={options.query}
 *         onChange={(e) => setQuery(e.target.value)}
 *       />
 *       <label>
 *         <input
 *           type="checkbox"
 *           checked={options.searchContent}
 *           onChange={toggleSearchContent}
 *         />
 *         Full-text search
 *       </label>
 *       <FileList files={filteredFiles} />
 *     </div>
 *   )
 * }
 * ```
 */
export function useSearchFilter(
  files: GitHubFile[],
  fileContents: Map<string, string> = new Map(),
  metadataMap: Map<string, StrandMetadata> = new Map(),
  debounceMs: number = 300
): UseSearchFilterResult {
  const [options, setOptions] = useState<SearchOptions>(DEFAULT_SEARCH_OPTIONS)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterOptions>(DEFAULT_ADVANCED_FILTERS)
  const [selectedStrandsOnly, setSelectedStrandsOnly] = useState(false)
  
  // Get selected strands from context
  const selectedStrandsContext = useSelectedStrandsSafe()
  const selectedStrands = selectedStrandsContext?.strands ?? []
  const selectedStrandPaths = useMemo(
    () => new Set(selectedStrands.map(s => s.path)),
    [selectedStrands]
  )
  const hasSelectedStrands = selectedStrands.length > 0

  // Debounced query setter
  const debouncedSetQuery = useMemo(
    () => debounce((query: string) => setDebouncedQuery(query), debounceMs),
    [debounceMs]
  )

  const setQuery = useCallback(
    (query: string) => {
      setOptions((prev) => ({ ...prev, query }))
      debouncedSetQuery(query)
    },
    [debouncedSetQuery]
  )

  const toggleSearchNames = useCallback(() => {
    setOptions((prev) => ({ ...prev, searchNames: !prev.searchNames }))
  }, [])

  const toggleSearchContent = useCallback(() => {
    setOptions((prev) => ({ ...prev, searchContent: !prev.searchContent }))
  }, [])

  const toggleCaseSensitive = useCallback(() => {
    setOptions((prev) => ({ ...prev, caseSensitive: !prev.caseSensitive }))
  }, [])

  const setFilterScope = useCallback((scope: FileFilterScope) => {
    setOptions((prev) => ({ ...prev, filterScope: scope }))
  }, [])

  const toggleHideEmptyFolders = useCallback(() => {
    setOptions((prev) => ({ ...prev, hideEmptyFolders: !prev.hideEmptyFolders }))
  }, [])

  const setRootScope = useCallback((scope: NavigationRootScope) => {
    setOptions((prev) => ({ ...prev, rootScope: scope }))
  }, [])

  const setDifficulty = useCallback((difficulty: SearchOptions['difficulty']) => {
    setOptions((prev) => ({ ...prev, difficulty }))
  }, [])

  const resetFilters = useCallback(() => {
    setOptions(DEFAULT_SEARCH_OPTIONS)
    setDebouncedQuery('')
  }, [])

  // === Advanced filter functions ===

  const setDateFilter = useCallback((filter: DateFilter) => {
    setAdvancedFilters(prev => ({ ...prev, dateFilter: filter }))
  }, [])

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

  const setTagMatchMode = useCallback((mode: 'any' | 'all') => {
    setAdvancedFilters(prev => ({ ...prev, tagMatchMode: mode }))
  }, [])

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

  const resetAdvancedFilters = useCallback(() => {
    setAdvancedFilters(DEFAULT_ADVANCED_FILTERS)
  }, [])

  // Toggle selected strands only mode
  const toggleSelectedStrandsOnly = useCallback(() => {
    setSelectedStrandsOnly(prev => !prev)
  }, [])

  // Helper: Check if a file matches the date filter
  const matchesDateFilter = useCallback((path: string): boolean => {
    const { dateFilter } = advancedFilters
    if (dateFilter.mode === 'none') return true

    const metadata = metadataMap.get(path)
    if (!metadata?.date) return false

    // Parse the date from metadata
    let dateStr: string | null = null
    if (typeof metadata.date === 'string') {
      dateStr = metadata.date.split('T')[0]
    } else if (metadata.date instanceof Date) {
      dateStr = metadata.date.toISOString().split('T')[0]
    }
    if (!dateStr) return false

    if (dateFilter.mode === 'single' && dateFilter.startDate) {
      return dateStr === dateFilter.startDate
    }
    if (dateFilter.mode === 'range' && dateFilter.startDate && dateFilter.endDate) {
      return dateStr >= dateFilter.startDate && dateStr <= dateFilter.endDate
    }
    return false
  }, [advancedFilters, metadataMap])

  // Helper: Check if a file matches the tag filter
  const matchesTagFilter = useCallback((path: string): boolean => {
    const { selectedTags, tagMatchMode } = advancedFilters
    if (selectedTags.length === 0) return true

    const metadata = metadataMap.get(path)
    if (!metadata) return false

    const fileTags = Array.isArray(metadata.tags)
      ? metadata.tags
      : typeof metadata.tags === 'string'
      ? [metadata.tags]
      : []

    if (tagMatchMode === 'any') {
      return selectedTags.some(tag => fileTags.includes(tag))
    } else {
      return selectedTags.every(tag => fileTags.includes(tag))
    }
  }, [advancedFilters, metadataMap])

  // Helper: Check if a file matches the subject filter
  const matchesSubjectFilter = useCallback((path: string): boolean => {
    const { selectedSubjects } = advancedFilters
    if (selectedSubjects.length === 0) return true

    const metadata = metadataMap.get(path)
    if (!metadata?.taxonomy?.subjects) return false

    return selectedSubjects.some(subject =>
      metadata.taxonomy?.subjects?.includes(subject)
    )
  }, [advancedFilters, metadataMap])

  // Filter files based on search options
  const filteredFiles = useMemo(() => {
    // Pre-filter: apply root scope first
    let result = files.filter((file) => {
      if (shouldIgnorePath(file.path) || shouldIgnorePath(file.name)) return false

      // Root scope filter
      if (options.rootScope === 'fabric') {
        // Only show files/folders under weaves/
        if (!file.path.startsWith('weaves/') && file.path !== 'weaves') {
          return false
        }
      }

      // Then apply file type filtering
      return shouldShowFile(file, options.filterScope, options.hideEmptyFolders, files)
    })

    // Apply search query
    if (debouncedQuery) {
      result = filterFiles(
        result,
        { ...options, query: debouncedQuery },
        fileContents
      )
    }

    // === Apply advanced filters ===

    // Exclusion filter
    if (advancedFilters.excludedPaths.length > 0) {
      result = result.filter(file => !advancedFilters.excludedPaths.includes(file.path))
    }

    // Date filter (only for files, not directories)
    if (advancedFilters.dateFilter.mode !== 'none') {
      result = result.filter(file => {
        if (file.type === 'dir') return true // Keep directories, filter strands
        return matchesDateFilter(file.path)
      })
    }

    // Tag filter
    if (advancedFilters.selectedTags.length > 0) {
      result = result.filter(file => {
        if (file.type === 'dir') return true
        return matchesTagFilter(file.path)
      })
    }

    // Subject filter
    if (advancedFilters.selectedSubjects.length > 0) {
      result = result.filter(file => {
        if (file.type === 'dir') return true
        return matchesSubjectFilter(file.path)
      })
    }

    // Selected strands only filter
    if (selectedStrandsOnly && hasSelectedStrands) {
      result = result.filter(file => {
        if (file.type === 'dir') {
          // Keep directories that contain any selected strands
          return result.some(f => 
            f.type === 'file' && 
            f.path.startsWith(file.path + '/') && 
            selectedStrandPaths.has(f.path)
          )
        }
        return selectedStrandPaths.has(file.path)
      })
    }

    return result
  }, [
    files,
    debouncedQuery,
    options,
    fileContents,
    advancedFilters,
    matchesDateFilter,
    matchesTagFilter,
    matchesSubjectFilter,
    selectedStrandsOnly,
    hasSelectedStrands,
    selectedStrandPaths,
  ])

  const isSearchActive = Boolean(debouncedQuery)

  // Compute active advanced filter count
  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0
    if (advancedFilters.dateFilter.mode !== 'none') count++
    if (advancedFilters.selectedTags.length > 0) count++
    if (advancedFilters.selectedSubjects.length > 0) count++
    if (advancedFilters.selectedTopics.length > 0) count++
    if (advancedFilters.excludedPaths.length > 0) count++
    return count
  }, [advancedFilters])

  const hasAdvancedFilters = activeAdvancedFilterCount > 0

  return {
    options,
    setQuery,
    toggleSearchNames,
    toggleSearchContent,
    toggleCaseSensitive,
    setFilterScope,
    toggleHideEmptyFolders,
    setRootScope,
    setDifficulty,
    filteredFiles,
    isSearchActive,
    resetFilters,
    // Advanced filters
    advancedFilters,
    setDateFilter,
    toggleTag,
    setSelectedTags,
    setTagMatchMode,
    toggleSubject,
    setSelectedSubjects,
    toggleTopic,
    setSelectedTopics,
    excludePath,
    includePath,
    resetAdvancedFilters,
    activeAdvancedFilterCount,
    hasAdvancedFilters,
    // Selected strands filter
    selectedStrandsOnly,
    toggleSelectedStrandsOnly,
    selectedStrandsCount: selectedStrands.length,
    hasSelectedStrands,
  }
}

