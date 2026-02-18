/**
 * Hook for fetching and building the GitHub repository tree
 * @module codex/hooks/useGithubTree
 * 
 * @remarks
 * - Uses GitHub GraphQL API (if GH_PAT available) for efficiency
 * - Falls back to REST API if GraphQL fails
 * - Caches result in memory for the session
 * - Rate limits: 5k/hr with PAT, 60/hr without
 */

import { useState, useEffect } from 'react'
import type { GitTreeItem, KnowledgeTreeNode } from '../types'
import { buildKnowledgeTree } from '../utils'
import { REPO_CONFIG } from '../constants'
import { fetchGithubTree, fetchGithubTreeREST } from '../lib/githubGraphql'

let graphQlWarningLogged = false
let restWarningLogged = false

interface UseGithubTreeResult {
  /** Hierarchical knowledge tree */
  tree: KnowledgeTreeNode[]
  /** Loading state */
  loading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Total number of strands across all weaves */
  totalStrands: number
  /** Total number of top-level weaves */
  totalWeaves: number
  /** Branch that successfully resolved */
  resolvedBranch: string
  /** Refetch the tree */
  refetch: () => Promise<void>
}

/**
 * Fetch and build the knowledge tree from GitHub
 * 
 * @remarks
 * - Fetches the entire Git tree recursively (single API call)
 * - Builds hierarchical structure with strand counts
 * - Caches result in memory for the session
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { tree, loading, error, totalStrands } = useGithubTree()
 *   
 *   if (loading) return <Spinner />
 *   if (error) return <Error message={error} />
 *   
 *   return <TreeView nodes={tree} total={totalStrands} />
 * }
 * ```
 */
export function useGithubTree(): UseGithubTreeResult {
  const [tree, setTree] = useState<KnowledgeTreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalStrands, setTotalStrands] = useState(0)
  const [totalWeaves, setTotalWeaves] = useState(0)
  const [resolvedBranch, setResolvedBranch] = useState(REPO_CONFIG.BRANCH)

  const hasClientPat = (): boolean => {
    if (typeof window === 'undefined') return false
    try {
      const raw = window.localStorage?.getItem('frame-codex-preferences')
      if (!raw) return false
      const prefs = JSON.parse(raw)
      return typeof prefs?.githubPAT === 'string' && prefs.githubPAT.trim().length > 0
    } catch {
      return false
    }
  }

  const fetchTree = async () => {
    setLoading(true)
    setError(null)

    try {
      let rawEntries: Array<{ name: string; type: string; path: string; size?: number }> = []

      const branchCandidates = Array.from(new Set(['master', 'main', REPO_CONFIG.BRANCH].filter(Boolean)))
      const patAvailable = hasClientPat()

      let fetchSucceeded = false
      let lastError: unknown = null
      for (const branch of branchCandidates) {
        if (patAvailable) {
          try {
            rawEntries = await fetchGithubTree(REPO_CONFIG.OWNER, REPO_CONFIG.NAME, branch)
            REPO_CONFIG.BRANCH = branch
            setResolvedBranch(branch)
            fetchSucceeded = true
            break
          } catch (graphqlError) {
            if (!graphQlWarningLogged) {
              console.warn('Codex GitHub GraphQL unavailable, switching to REST.', graphqlError)
              graphQlWarningLogged = true
            }
          }
        }

        try {
          rawEntries = await fetchGithubTreeREST(REPO_CONFIG.OWNER, REPO_CONFIG.NAME, branch)
          REPO_CONFIG.BRANCH = branch
          setResolvedBranch(branch)
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

      if (!fetchSucceeded) throw (lastError ?? new Error('Unable to fetch Git tree from GitHub.'))

      // Convert to GitTreeItem format
      const items: GitTreeItem[] = rawEntries.map((entry) => ({
        path: entry.path,
        mode: entry.type === 'blob' ? '100644' : '040000',
        type: entry.type as 'blob' | 'tree',
        sha: '',
        size: entry.size,
        url: '',
      }))

      const builtTree = buildKnowledgeTree(items)

      // Calculate totals
      const strands = builtTree.reduce((sum, node) => sum + node.strandCount, 0)
      const weaves = builtTree.length

      setTree(builtTree)
      setTotalStrands(strands)
      setTotalWeaves(weaves)
    } catch (err) {
      console.error('Failed to fetch GitHub tree:', err)
      setError(err instanceof Error ? err.message : 'Failed to load knowledge tree')
      setTree([])
      setTotalStrands(0)
      setTotalWeaves(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTree()
  }, [])

  return {
    tree,
    loading,
    error,
    totalStrands,
    totalWeaves,
    resolvedBranch,
    refetch: fetchTree,
  }
}

