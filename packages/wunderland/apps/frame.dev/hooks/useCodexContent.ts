/**
 * Codex Content Hook
 *
 * React hook for accessing Quarry Codex content from SQLite or GitHub.
 * Provides unified interface that works in both online and offline modes.
 *
 * @module hooks/useQuarryContent
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getContentStore, initContentStore } from '@/lib/content/sqliteStore'
import type {
  ContentManager,
  ContentSource,
  KnowledgeTreeNode,
  StrandContent,
  SearchResult,
  SearchOptions,
  SemanticSearchOptions,
  SyncProgress,
  SyncResult,
} from '@/lib/content/types'
import { getFeatureFlags } from '@/lib/config/featureFlags'

// ============================================================================
// TYPES
// ============================================================================

export interface UseQuarryContentResult {
  // State
  isLoading: boolean
  isInitialized: boolean
  error: Error | null
  source: ContentSource | null

  // Content retrieval
  getKnowledgeTree: () => Promise<KnowledgeTreeNode[]>
  getStrand: (path: string) => Promise<StrandContent | null>
  getStrands: (paths: string[]) => Promise<StrandContent[]>
  getWeaveStrands: (weaveSlug: string) => Promise<StrandContent[]>

  // Search
  search: (query: string, options?: SearchOptions) => Promise<SearchResult[]>
  semanticSearch: (query: string, options?: SemanticSearchOptions) => Promise<SearchResult[]>

  // Sync
  canSync: boolean
  isSyncing: boolean
  syncProgress: SyncProgress | null
  sync: () => Promise<SyncResult>
  checkForUpdates: () => Promise<{ available: boolean; changes: number }>

  // Cache management
  clearCache: () => Promise<void>
  refreshTree: () => Promise<void>
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useQuarryContent(): UseQuarryContentResult {
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [source, setSource] = useState<ContentSource | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [treeCache, setTreeCache] = useState<KnowledgeTreeNode[] | null>(null)

  // Get content manager
  const contentManager = useMemo(() => {
    try {
      return getContentStore()
    } catch {
      return null
    }
  }, [])

  // Initialize on mount
  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        setIsLoading(true)
        setError(null)

        const store = await initContentStore()

        if (mounted) {
          setSource(store.getSource())
          setIsInitialized(true)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize content store'))
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [])

  // ========================================================================
  // Content Retrieval
  // ========================================================================

  const getKnowledgeTree = useCallback(async (): Promise<KnowledgeTreeNode[]> => {
    if (!contentManager) return []

    // Use cache if available
    if (treeCache) return treeCache

    try {
      const tree = await contentManager.getKnowledgeTree()
      setTreeCache(tree)
      return tree
    } catch (err) {
      console.error('[useQuarryContent] Failed to get knowledge tree:', err)
      return []
    }
  }, [contentManager, treeCache])

  const getStrand = useCallback(async (path: string): Promise<StrandContent | null> => {
    if (!contentManager) return null

    try {
      return await contentManager.getStrand(path)
    } catch (err) {
      console.error('[useQuarryContent] Failed to get strand:', err)
      return null
    }
  }, [contentManager])

  const getStrands = useCallback(async (paths: string[]): Promise<StrandContent[]> => {
    if (!contentManager) return []

    try {
      return await contentManager.getStrands(paths)
    } catch (err) {
      console.error('[useQuarryContent] Failed to get strands:', err)
      return []
    }
  }, [contentManager])

  const getWeaveStrands = useCallback(async (weaveSlug: string): Promise<StrandContent[]> => {
    if (!contentManager) return []

    try {
      return await contentManager.getWeaveStrands(weaveSlug)
    } catch (err) {
      console.error('[useQuarryContent] Failed to get weave strands:', err)
      return []
    }
  }, [contentManager])

  // ========================================================================
  // Search
  // ========================================================================

  const search = useCallback(async (
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> => {
    if (!contentManager) return []

    try {
      return await contentManager.searchStrands(query, options)
    } catch (err) {
      console.error('[useQuarryContent] Search failed:', err)
      return []
    }
  }, [contentManager])

  const semanticSearch = useCallback(async (
    query: string,
    options?: SemanticSearchOptions
  ): Promise<SearchResult[]> => {
    if (!contentManager) return []

    try {
      return await contentManager.semanticSearch(query, options)
    } catch (err) {
      console.error('[useQuarryContent] Semantic search failed:', err)
      return []
    }
  }, [contentManager])

  // ========================================================================
  // Sync
  // ========================================================================

  const canSync = useMemo(() => {
    return contentManager?.canSync() ?? false
  }, [contentManager])

  const sync = useCallback(async (): Promise<SyncResult> => {
    if (!contentManager) {
      return {
        success: false,
        strandsAdded: 0,
        strandsUpdated: 0,
        strandsRemoved: 0,
        duration: 0,
        errors: ['Content manager not initialized'],
      }
    }

    try {
      setIsSyncing(true)
      setSyncProgress({ phase: 'preparing', current: 0, total: 0 })

      const result = await contentManager.sync({
        onProgress: (progress) => setSyncProgress(progress),
      })

      // Clear cache after sync
      setTreeCache(null)
      setSource(contentManager.getSource())

      return result
    } catch (err) {
      return {
        success: false,
        strandsAdded: 0,
        strandsUpdated: 0,
        strandsRemoved: 0,
        duration: 0,
        errors: [err instanceof Error ? err.message : 'Sync failed'],
      }
    } finally {
      setIsSyncing(false)
      setSyncProgress(null)
    }
  }, [contentManager])

  const checkForUpdates = useCallback(async (): Promise<{ available: boolean; changes: number }> => {
    if (!contentManager) {
      return { available: false, changes: 0 }
    }

    try {
      return await contentManager.checkForUpdates()
    } catch {
      return { available: false, changes: 0 }
    }
  }, [contentManager])

  // ========================================================================
  // Cache Management
  // ========================================================================

  const clearCache = useCallback(async (): Promise<void> => {
    setTreeCache(null)
  }, [])

  const refreshTree = useCallback(async (): Promise<void> => {
    setTreeCache(null)
    await getKnowledgeTree()
  }, [getKnowledgeTree])

  return {
    isLoading,
    isInitialized,
    error,
    source,
    getKnowledgeTree,
    getStrand,
    getStrands,
    getWeaveStrands,
    search,
    semanticSearch,
    canSync,
    isSyncing,
    syncProgress,
    sync,
    checkForUpdates,
    clearCache,
    refreshTree,
  }
}

// ============================================================================
// INDIVIDUAL STRAND HOOK
// ============================================================================

/**
 * Hook for loading a single strand by path
 */
export function useStrand(path: string | null): {
  strand: StrandContent | null
  isLoading: boolean
  error: Error | null
  reload: () => Promise<void>
} {
  const [strand, setStrand] = useState<StrandContent | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    if (!path) {
      setStrand(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const store = getContentStore()
      await store.initialize()
      const result = await store.getStrand(path)
      setStrand(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load strand'))
    } finally {
      setIsLoading(false)
    }
  }, [path])

  useEffect(() => {
    load()
  }, [load])

  return { strand, isLoading, error, reload: load }
}

// ============================================================================
// KNOWLEDGE TREE HOOK
// ============================================================================

/**
 * Hook for loading the knowledge tree
 */
export function useKnowledgeTree(): {
  tree: KnowledgeTreeNode[]
  isLoading: boolean
  error: Error | null
  reload: () => Promise<void>
} {
  const [tree, setTree] = useState<KnowledgeTreeNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const store = getContentStore()
      await store.initialize()
      const result = await store.getKnowledgeTree()
      setTree(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load knowledge tree'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { tree, isLoading, error, reload: load }
}

// ============================================================================
// SEARCH HOOK
// ============================================================================

/**
 * Hook for searching strands with debouncing
 */
/**
 * Alias for useQuarryContent for backward compatibility
 */
export const useCodexContent = useQuarryContent

export function useStrandSearch(
  query: string,
  options?: SearchOptions & { debounceMs?: number }
): {
  results: SearchResult[]
  isSearching: boolean
  error: Error | null
} {
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const debounceMs = options?.debounceMs ?? 300

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsSearching(true)
        setError(null)

        const store = getContentStore()
        await store.initialize()
        const searchResults = await store.searchStrands(query, options)
        setResults(searchResults)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Search failed'))
      } finally {
        setIsSearching(false)
      }
    }, debounceMs)

    return () => clearTimeout(timeoutId)
  }, [query, debounceMs, options])

  return { results, isSearching, error }
}
