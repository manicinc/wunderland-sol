/**
 * Hook for advanced search filtering with debouncing
 * @module codex/hooks/useSearchFilter
 */

import { useState, useMemo, useCallback } from 'react'
import type { SearchOptions, GitHubFile } from '../types'
import { DEFAULT_SEARCH_OPTIONS } from '../constants'
import { filterFiles, debounce, isMarkdownFile, shouldIgnorePath } from '../utils'

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
  /** Set difficulty filter */
  setDifficulty: (difficulty: SearchOptions['difficulty']) => void
  /** Filtered files based on current options */
  filteredFiles: GitHubFile[]
  /** Whether search is active */
  isSearchActive: boolean
  /** Reset all filters */
  resetFilters: () => void
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
  debounceMs: number = 300
): UseSearchFilterResult {
  const [options, setOptions] = useState<SearchOptions>(DEFAULT_SEARCH_OPTIONS)
  const [debouncedQuery, setDebouncedQuery] = useState('')

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

  const setDifficulty = useCallback((difficulty: SearchOptions['difficulty']) => {
    setOptions((prev) => ({ ...prev, difficulty }))
  }, [])

  const resetFilters = useCallback(() => {
    setOptions(DEFAULT_SEARCH_OPTIONS)
    setDebouncedQuery('')
  }, [])

  // Filter files based on search options
  const filteredFiles = useMemo(() => {
    // Pre-filter: only markdown files, not ignored
    let result = files.filter((file) => {
      if (shouldIgnorePath(file.path) || shouldIgnorePath(file.name)) return false
      if (file.type === 'dir') return true
      return isMarkdownFile(file.name)
    })

    // Apply search query
    if (debouncedQuery) {
      result = filterFiles(
        result,
        { ...options, query: debouncedQuery },
        fileContents
      )
    }

    return result
  }, [files, debouncedQuery, options, fileContents])

  const isSearchActive = Boolean(debouncedQuery)

  return {
    options,
    setQuery,
    toggleSearchNames,
    toggleSearchContent,
    toggleCaseSensitive,
    setDifficulty,
    filteredFiles,
    isSearchActive,
    resetFilters,
  }
}

