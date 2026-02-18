/**
 * Global Glossary Hook
 *
 * Provides access to the global glossary stored in SQLite with:
 * - Multi-strand aggregation
 * - Filtering by tags, subjects, categories, sources
 * - Statistics and analytics
 * - Async persistence operations
 *
 * @module hooks/useGlobalGlossary
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  type LocalGlossaryTerm,
  listGlossaryTerms,
  saveGlossaryTerm,
  saveGlossaryTermsBatch,
  deleteGlossaryTerm,
  deleteGlossaryTermsByStrand,
  getGlossaryCategories,
  getGlossaryStats,
  clearGlossaryTerms,
} from '@/lib/storage/localCodex'

// ==================== Types ====================

export interface GlobalGlossaryFilters {
  search?: string
  categories?: string[]
  tags?: string[]
  sourceStrandIds?: string[]
  minConfidence?: number
}

export interface GlobalGlossaryStats {
  totalTerms: number
  byCategory: Record<string, number>
  bySource: Record<string, { count: number; title: string }>
}

export interface UseGlobalGlossaryOptions {
  /** Auto-load terms on mount */
  autoLoad?: boolean
  /** Default limit for queries */
  defaultLimit?: number
  /** Filters to apply */
  filters?: GlobalGlossaryFilters
}

export interface UseGlobalGlossaryReturn {
  /** All loaded terms */
  terms: LocalGlossaryTerm[]
  /** Loading state */
  loading: boolean
  /** Error message if any */
  error: string | null
  /** Statistics about the glossary */
  stats: GlobalGlossaryStats | null
  /** Available categories */
  categories: string[]
  /** Current filters */
  filters: GlobalGlossaryFilters
  /** Whether there are more terms to load */
  hasMore: boolean

  // Actions
  /** Load/refresh terms with optional filters */
  loadTerms: (filters?: GlobalGlossaryFilters, append?: boolean) => Promise<void>
  /** Load more terms (pagination) */
  loadMore: () => Promise<void>
  /** Set filters and reload */
  setFilters: (filters: GlobalGlossaryFilters) => void
  /** Add a new term */
  addTerm: (term: Omit<LocalGlossaryTerm, 'id' | 'createdAt' | 'updatedAt'>) => Promise<LocalGlossaryTerm>
  /** Add multiple terms in batch */
  addTermsBatch: (terms: Array<Omit<LocalGlossaryTerm, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<LocalGlossaryTerm[]>
  /** Update a term */
  updateTerm: (id: string, updates: Partial<LocalGlossaryTerm>) => Promise<LocalGlossaryTerm | null>
  /** Delete a term */
  removeTerm: (id: string) => Promise<boolean>
  /** Delete all terms for a strand */
  removeTermsByStrand: (strandId: string) => Promise<number>
  /** Clear all terms */
  clearAll: () => Promise<void>
  /** Refresh stats */
  refreshStats: () => Promise<void>
  /** Search within loaded terms (client-side) */
  searchTerms: (query: string) => LocalGlossaryTerm[]
  /** Get terms by category (client-side) */
  getByCategory: (category: string) => LocalGlossaryTerm[]
  /** Get terms by source strand (client-side) */
  getBySource: (strandId: string) => LocalGlossaryTerm[]
}

// ==================== Constants ====================

const DEFAULT_LIMIT = 100
const LOAD_MORE_BATCH = 50

// ==================== Hook ====================

export function useGlobalGlossary(options: UseGlobalGlossaryOptions = {}): UseGlobalGlossaryReturn {
  const {
    autoLoad = true,
    defaultLimit = DEFAULT_LIMIT,
    filters: initialFilters = {},
  } = options

  // State
  const [terms, setTerms] = useState<LocalGlossaryTerm[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<GlobalGlossaryStats | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [filters, setFiltersState] = useState<GlobalGlossaryFilters>(initialFilters)
  const [hasMore, setHasMore] = useState(true)

  // Refs for pagination
  const offsetRef = useRef(0)
  const mountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  /**
   * Load terms with filters
   */
  const loadTerms = useCallback(async (newFilters?: GlobalGlossaryFilters, append = false) => {
    if (!mountedRef.current) return

    const activeFilters = newFilters ?? filters
    setLoading(true)
    setError(null)

    if (!append) {
      offsetRef.current = 0
    }

    try {
      const loadedTerms = await listGlossaryTerms({
        limit: defaultLimit,
        offset: offsetRef.current,
        search: activeFilters.search,
        category: activeFilters.categories?.[0], // SQL supports single category
        sourceStrandId: activeFilters.sourceStrandIds?.[0], // SQL supports single source
        tags: activeFilters.tags,
        orderBy: 'term',
        order: 'asc',
      })

      if (!mountedRef.current) return

      // Apply additional client-side filters if needed
      let filteredTerms = loadedTerms

      // Filter by multiple categories (if more than one specified)
      if (activeFilters.categories && activeFilters.categories.length > 1) {
        filteredTerms = filteredTerms.filter(t =>
          activeFilters.categories!.includes(t.category)
        )
      }

      // Filter by multiple sources (if more than one specified)
      if (activeFilters.sourceStrandIds && activeFilters.sourceStrandIds.length > 1) {
        filteredTerms = filteredTerms.filter(t =>
          t.sourceStrandId && activeFilters.sourceStrandIds!.includes(t.sourceStrandId)
        )
      }

      // Filter by minimum confidence
      if (activeFilters.minConfidence !== undefined) {
        filteredTerms = filteredTerms.filter(t =>
          (t.confidence ?? 1) >= activeFilters.minConfidence!
        )
      }

      if (append) {
        setTerms(prev => [...prev, ...filteredTerms])
      } else {
        setTerms(filteredTerms)
      }

      setHasMore(loadedTerms.length === defaultLimit)
      offsetRef.current += loadedTerms.length

    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to load glossary terms')
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [filters, defaultLimit])

  /**
   * Load more terms (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    await loadTerms(filters, true)
  }, [hasMore, loading, loadTerms, filters])

  /**
   * Set filters and reload
   */
  const setFilters = useCallback((newFilters: GlobalGlossaryFilters) => {
    setFiltersState(newFilters)
    offsetRef.current = 0
    loadTerms(newFilters, false)
  }, [loadTerms])

  /**
   * Refresh stats
   */
  const refreshStats = useCallback(async () => {
    try {
      const [statsData, categoriesData] = await Promise.all([
        getGlossaryStats(),
        getGlossaryCategories(),
      ])

      if (!mountedRef.current) return

      setStats(statsData)
      setCategories(categoriesData)
    } catch (err) {
      console.error('Failed to refresh glossary stats:', err)
    }
  }, [])

  /**
   * Add a new term
   */
  const addTerm = useCallback(async (
    term: Omit<LocalGlossaryTerm, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LocalGlossaryTerm> => {
    const saved = await saveGlossaryTerm(term)

    if (mountedRef.current) {
      // Optimistically add to local state
      setTerms(prev => [saved, ...prev].sort((a, b) =>
        a.term.localeCompare(b.term)
      ))
      await refreshStats()
    }

    return saved
  }, [refreshStats])

  /**
   * Add multiple terms in batch
   */
  const addTermsBatch = useCallback(async (
    newTerms: Array<Omit<LocalGlossaryTerm, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<LocalGlossaryTerm[]> => {
    const saved = await saveGlossaryTermsBatch(newTerms)

    if (mountedRef.current) {
      // Optimistically add to local state
      setTerms(prev => [...saved, ...prev].sort((a, b) =>
        a.term.localeCompare(b.term)
      ))
      await refreshStats()
    }

    return saved
  }, [refreshStats])

  /**
   * Update a term
   */
  const updateTerm = useCallback(async (
    id: string,
    updates: Partial<LocalGlossaryTerm>
  ): Promise<LocalGlossaryTerm | null> => {
    const existing = terms.find(t => t.id === id)
    if (!existing) return null

    const updated: Omit<LocalGlossaryTerm, 'id' | 'createdAt' | 'updatedAt'> & { id: string } = {
      id,
      term: updates.term ?? existing.term,
      definition: updates.definition ?? existing.definition,
      category: updates.category ?? existing.category,
      sourceStrandId: updates.sourceStrandId ?? existing.sourceStrandId,
      sourceStrandPath: updates.sourceStrandPath ?? existing.sourceStrandPath,
      sourceStrandTitle: updates.sourceStrandTitle ?? existing.sourceStrandTitle,
      confidence: updates.confidence ?? existing.confidence,
      tags: updates.tags ?? existing.tags,
    }

    const saved = await saveGlossaryTerm(updated)

    if (mountedRef.current) {
      setTerms(prev => prev.map(t => t.id === id ? saved : t))
    }

    return saved
  }, [terms])

  /**
   * Delete a term
   */
  const removeTerm = useCallback(async (id: string): Promise<boolean> => {
    const success = await deleteGlossaryTerm(id)

    if (success && mountedRef.current) {
      setTerms(prev => prev.filter(t => t.id !== id))
      await refreshStats()
    }

    return success
  }, [refreshStats])

  /**
   * Delete all terms for a strand
   */
  const removeTermsByStrand = useCallback(async (strandId: string): Promise<number> => {
    const count = await deleteGlossaryTermsByStrand(strandId)

    if (count > 0 && mountedRef.current) {
      setTerms(prev => prev.filter(t => t.sourceStrandId !== strandId))
      await refreshStats()
    }

    return count
  }, [refreshStats])

  /**
   * Clear all terms
   */
  const clearAll = useCallback(async () => {
    await clearGlossaryTerms()

    if (mountedRef.current) {
      setTerms([])
      await refreshStats()
    }
  }, [refreshStats])

  /**
   * Search within loaded terms (client-side)
   */
  const searchTerms = useCallback((query: string): LocalGlossaryTerm[] => {
    const lowerQuery = query.toLowerCase()
    return terms.filter(t =>
      t.term.toLowerCase().includes(lowerQuery) ||
      t.definition.toLowerCase().includes(lowerQuery) ||
      t.category.toLowerCase().includes(lowerQuery)
    )
  }, [terms])

  /**
   * Get terms by category (client-side)
   */
  const getByCategory = useCallback((category: string): LocalGlossaryTerm[] => {
    return terms.filter(t => t.category === category)
  }, [terms])

  /**
   * Get terms by source strand (client-side)
   */
  const getBySource = useCallback((strandId: string): LocalGlossaryTerm[] => {
    return terms.filter(t => t.sourceStrandId === strandId)
  }, [terms])

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadTerms()
      refreshStats()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    terms,
    loading,
    error,
    stats,
    categories,
    filters,
    hasMore,
    loadTerms,
    loadMore,
    setFilters,
    addTerm,
    addTermsBatch,
    updateTerm,
    removeTerm,
    removeTermsByStrand,
    clearAll,
    refreshStats,
    searchTerms,
    getByCategory,
    getBySource,
  }
}

export default useGlobalGlossary









