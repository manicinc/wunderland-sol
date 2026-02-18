/**
 * Hook for fetching and building the GitHub repository tree
 * @module codex/hooks/useGithubTree
 *
 * Features:
 * - IndexedDB caching for instant loads after first fetch
 * - Configurable TTL (default 5 minutes)
 * - Background revalidation
 * - Fallback to REST API if GraphQL unavailable
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { GitTreeItem, KnowledgeTreeNode } from '../types'
import { buildKnowledgeTree } from '../utils'
import { REPO_CONFIG } from '../constants'
import { fetchGithubTree, fetchGithubTreeREST, hasGithubAuthToken } from '@/lib/githubGraphql'

let graphQlWarningLogged = false
let restWarningLogged = false

// ============================================================================
// INDEXEDDB CACHE
// ============================================================================

const CACHE_DB_NAME = 'quarry-github-cache'
const CACHE_STORE_NAME = 'tree-cache'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CachedTreeData {
  key: string
  rawEntries: Array<{ name: string; type: string; path: string; size?: number }>
  branch: string
  timestamp: number
  graphqlAvailable: boolean
}

/** Open the cache database */
function openCacheDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }
    const request = indexedDB.open(CACHE_DB_NAME, 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'key' })
      }
    }
  })
}

/** Get cached tree data */
async function getCachedTree(owner: string, repo: string): Promise<CachedTreeData | null> {
  try {
    const db = await openCacheDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE_NAME, 'readonly')
      const store = tx.objectStore(CACHE_STORE_NAME)
      const key = `${owner}/${repo}`
      const request = store.get(key)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const data = request.result as CachedTreeData | undefined
        if (data && Date.now() - data.timestamp < CACHE_TTL_MS) {
          console.log('[useGithubTree] Cache hit, using cached tree data')
          resolve(data)
        } else if (data) {
          console.log('[useGithubTree] Cache stale, will revalidate')
          resolve(data) // Return stale data for instant load, will revalidate
        } else {
          resolve(null)
        }
        db.close()
      }
    })
  } catch (err) {
    console.warn('[useGithubTree] Cache read failed:', err)
    return null
  }
}

/** Set cached tree data */
async function setCachedTree(
  owner: string,
  repo: string,
  rawEntries: CachedTreeData['rawEntries'],
  branch: string,
  graphqlAvailable: boolean
): Promise<void> {
  try {
    const db = await openCacheDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE_NAME, 'readwrite')
      const store = tx.objectStore(CACHE_STORE_NAME)
      const data: CachedTreeData = {
        key: `${owner}/${repo}`,
        rawEntries,
        branch,
        timestamp: Date.now(),
        graphqlAvailable,
      }
      const request = store.put(data)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        console.log('[useGithubTree] Tree cached successfully')
        resolve()
        db.close()
      }
    })
  } catch (err) {
    console.warn('[useGithubTree] Cache write failed:', err)
  }
}

interface UseGithubTreeResult {
  tree: KnowledgeTreeNode[]
  loading: boolean
  error: string | null
  totalStrands: number
  totalWeaves: number
  totalLooms: number
  graphqlAvailable: boolean
  resolvedBranch: string
  refetch: () => Promise<void>
}

/**
 * Hook to fetch the knowledge tree from GitHub
 * @param options.skip - Skip fetching (for pages that don't need tree data)
 */
export function useGithubTree(options?: { skip?: boolean }): UseGithubTreeResult {
  const skip = options?.skip ?? false
  const [tree, setTree] = useState<KnowledgeTreeNode[]>([])
  const [loading, setLoading] = useState(!skip)
  const [error, setError] = useState<string | null>(null)
  const [totalStrands, setTotalStrands] = useState(0)
  const [totalWeaves, setTotalWeaves] = useState(0)
  const [totalLooms, setTotalLooms] = useState(0)
  const [graphqlAvailable, setGraphqlAvailable] = useState(true)
  const [resolvedBranch, setResolvedBranch] = useState(REPO_CONFIG.BRANCH)
  const isRevalidating = useRef(false)

  /** Process raw entries into tree structure and update state */
  const processEntries = useCallback((
    rawEntries: Array<{ name: string; type: string; path: string; size?: number }>,
    branch: string,
    isGraphqlAvailable: boolean
  ) => {
    const items: GitTreeItem[] = rawEntries.map((entry) => ({
      path: entry.path,
      mode: entry.type === 'blob' ? '100644' : '040000',
      type: entry.type as 'blob' | 'tree',
      sha: '',
      size: entry.size,
      url: '',
    }))

    // Count looms from raw items BEFORE tree pruning removes empty directories
    const loomPaths = new Set<string>()
    items.forEach(item => {
      if (item.type !== 'blob') return
      const segments = item.path.split('/')
      if (segments[0] !== 'weaves' || segments.length < 4) return
      for (let i = 3; i < segments.length; i++) {
        const dirName = segments[i - 1]
        if (dirName === 'looms' || dirName === 'strands') continue
        const loomPath = segments.slice(0, i).join('/')
        loomPaths.add(loomPath)
      }
    })

    const builtTree = buildKnowledgeTree(items)
    const weavesFolder = builtTree.find(node => node.name === 'weaves' && node.type === 'dir')
    const strands = weavesFolder?.strandCount ?? 0
    const weaveNodes = weavesFolder?.children?.filter(child => child.type === 'dir' && child.level === 'weave') || []

    // Debug logging for tree structure
    console.log('[useGithubTree] Built tree structure:', {
      totalRootNodes: builtTree.length,
      weavesFolder: weavesFolder ? {
        name: weavesFolder.name,
        strandCount: weavesFolder.strandCount,
        childCount: weavesFolder.children?.length || 0,
        children: weavesFolder.children?.map(c => ({
          name: c.name,
          level: c.level,
          strandCount: c.strandCount,
          childCount: c.children?.length || 0,
          children: c.children?.map(gc => ({
            name: gc.name,
            level: gc.level,
            type: gc.type,
            strandCount: gc.strandCount,
          }))
        }))
      } : null,
      weaveCount: weaveNodes.length,
      strandCount: strands,
    })

    setTree(builtTree)
    setTotalStrands(strands)
    setTotalWeaves(weaveNodes.length)
    setTotalLooms(loomPaths.size)
    setResolvedBranch(branch)
    setGraphqlAvailable(isGraphqlAvailable)
    if (REPO_CONFIG.BRANCH !== branch) {
      REPO_CONFIG.BRANCH = branch
    }
  }, [])

  /** Fetch tree from GitHub (network call) */
  const fetchFromNetwork = useCallback(async (): Promise<{
    rawEntries: Array<{ name: string; type: string; path: string; size?: number }>
    branch: string
    graphqlAvailable: boolean
  }> => {
    const graphqlFailed = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('codex-graphql-failed') === 'true'
    const patAvailable = hasGithubAuthToken()
    const branchCandidates = Array.from(new Set(['master', 'main', REPO_CONFIG.BRANCH].filter(Boolean)))

    let rawEntries: Array<{ name: string; type: string; path: string; size?: number }> = []
    let fetchSucceeded = false
    let lastError: unknown = null
    let isGraphqlAvailable = true
    let resolvedBranch = REPO_CONFIG.BRANCH

    for (const branch of branchCandidates) {
      // Try GraphQL first if available
      if (!graphqlFailed && patAvailable) {
        try {
          rawEntries = await fetchGithubTree(REPO_CONFIG.OWNER, REPO_CONFIG.NAME, branch)
          resolvedBranch = branch
          isGraphqlAvailable = true
          fetchSucceeded = true
          break
        } catch (graphqlError) {
          if (!graphQlWarningLogged) {
            console.warn('Codex GitHub GraphQL unavailable, switching to REST.', graphqlError)
            graphQlWarningLogged = true
          }
          isGraphqlAvailable = false
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('codex-graphql-failed', 'true')
          }
        }
      } else {
        isGraphqlAvailable = false
      }

      // REST Fallback
      try {
        rawEntries = await fetchGithubTreeREST(REPO_CONFIG.OWNER, REPO_CONFIG.NAME, branch)
        resolvedBranch = branch
        fetchSucceeded = true
        break
      } catch (restError) {
        lastError = restError
        if (!restWarningLogged) {
          console.warn('Codex GitHub REST fallback failed, trying next branch.', restError)
          restWarningLogged = true
        }
      }
    }

    if (!fetchSucceeded) {
      throw lastError ?? new Error('Unable to fetch repository tree from GitHub.')
    }

    return { rawEntries, branch: resolvedBranch, graphqlAvailable: isGraphqlAvailable }
  }, [])

  const fetchTree = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError(null)

    try {
      // Step 1: Try to load from cache first (instant)
      if (!forceRefresh) {
        const cached = await getCachedTree(REPO_CONFIG.OWNER, REPO_CONFIG.NAME)
        if (cached) {
          // Instantly show cached data
          processEntries(cached.rawEntries, cached.branch, cached.graphqlAvailable)
          setLoading(false)

          // Check if cache is stale and needs background revalidation
          const isStale = Date.now() - cached.timestamp >= CACHE_TTL_MS
          if (isStale && !isRevalidating.current) {
            isRevalidating.current = true
            console.log('[useGithubTree] Background revalidation started')

            // Revalidate in background (don't await)
            fetchFromNetwork()
              .then(({ rawEntries, branch, graphqlAvailable }) => {
                processEntries(rawEntries, branch, graphqlAvailable)
                setCachedTree(REPO_CONFIG.OWNER, REPO_CONFIG.NAME, rawEntries, branch, graphqlAvailable)
                console.log('[useGithubTree] Background revalidation complete')
              })
              .catch(err => console.warn('[useGithubTree] Background revalidation failed:', err))
              .finally(() => { isRevalidating.current = false })
          }
          return
        }
      }

      // Step 2: No cache or force refresh - fetch from network
      console.log('[useGithubTree] Fetching from network...')
      const { rawEntries, branch, graphqlAvailable } = await fetchFromNetwork()

      // Update state
      processEntries(rawEntries, branch, graphqlAvailable)

      // Save to cache
      await setCachedTree(REPO_CONFIG.OWNER, REPO_CONFIG.NAME, rawEntries, branch, graphqlAvailable)

    } catch (err) {
      console.error('Failed to fetch GitHub tree:', err)
      setError(err instanceof Error ? err.message : 'Failed to load knowledge tree')
      setTree([])
      setTotalStrands(0)
      setTotalWeaves(0)
      setTotalLooms(0)
    } finally {
      setLoading(false)
    }
  }, [processEntries, fetchFromNetwork])

  useEffect(() => {
    if (!skip) {
      fetchTree()
    }
  }, [fetchTree, skip])

  // Force refresh bypasses cache
  const refetch = useCallback(() => fetchTree(true), [fetchTree])

  return {
    tree,
    loading,
    error,
    totalStrands,
    totalWeaves,
    totalLooms,
    graphqlAvailable,
    resolvedBranch,
    refetch,
  }
}
