/**
 * Hook for fetching the knowledge tree from local SQLite storage
 * @module codex/hooks/useLocalTree
 *
 * Used when running in Electron with a local vault or when
 * using IndexedDB storage in the browser.
 */

import { useState, useEffect, useCallback } from 'react'
import type { KnowledgeTreeNode as QuarryTreeNode, NodeLevel } from '../types'
import type { KnowledgeTreeNode as ContentTreeNode } from '@/lib/content/types'
import { SQLiteContentStore } from '@/lib/content/sqliteStore'
import { isElectronWithVault, getElectronVaultStatus } from '@/lib/vault/electronVault'

// Singleton content store instance with promise-based initialization
// This prevents race conditions where multiple callers try to initialize simultaneously
let contentStorePromise: Promise<SQLiteContentStore> | null = null
let contentStoreInstance: SQLiteContentStore | null = null

async function getContentStore(): Promise<SQLiteContentStore> {
  // Return existing instance if already initialized
  if (contentStoreInstance?.isInitialized()) {
    return contentStoreInstance
  }

  if (!contentStorePromise) {
    contentStorePromise = (async () => {
      console.log('[useLocalTree] Creating new SQLiteContentStore...')
      const store = new SQLiteContentStore()
      await store.initialize()
      contentStoreInstance = store
      console.log('[useLocalTree] SQLiteContentStore fully initialized')
      return store
    })()
  }
  return contentStorePromise
}

/**
 * Convert content types to quarry types
 * SQLite now returns: type: 'file' | 'dir', level: 'weave' | 'loom' | 'strand'
 * Quarry expects: type: 'file' | 'dir', level: NodeLevel
 */
function convertToQuarryTree(nodes: ContentTreeNode[]): QuarryTreeNode[] {
  return nodes.map(node => {
    // SQLite nodes have type: 'file' or 'dir', level: semantic meaning
    // Use node.level if available (SQLite), fall back to type (legacy)
    const isFile = node.type === 'file' || node.type === 'strand'
    const level: NodeLevel = (node as any).level  // SQLite nodes have level property
      || (node.type === 'fabric' ? 'fabric'
        : node.type === 'weave' ? 'weave'
        : node.type === 'loom' ? 'loom'
        : 'strand')

    const quarryNode: QuarryTreeNode = {
      name: node.name,
      path: node.path,
      type: isFile ? 'file' : 'dir',
      children: node.children ? convertToQuarryTree(node.children) : undefined,
      strandCount: node.strandCount || 0,
      level,
      description: node.description,
    }

    return quarryNode
  })
}

/**
 * Count nodes in the tree
 */
function countNodes(nodes: QuarryTreeNode[]): { strands: number; weaves: number; looms: number } {
  let strands = 0
  let weaves = 0
  let looms = 0

  function traverse(node: QuarryTreeNode) {
    if (node.level === 'strand' || node.type === 'file') strands++
    else if (node.level === 'weave') weaves++
    else if (node.level === 'loom') looms++
    // Fabric is the root level - we don't count it
    
    if (node.children) {
      node.children.forEach(traverse)
    }
  }

  nodes.forEach(traverse)
  return { strands, weaves, looms }
}

export interface UseLocalTreeResult {
  tree: QuarryTreeNode[]
  loading: boolean
  error: string | null
  totalStrands: number
  totalWeaves: number
  totalLooms: number
  isLocalMode: boolean
  vaultPath: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch the knowledge tree from local SQLite storage
 * @param options.skip - Skip fetching (for pages that don't need tree data)
 */
export function useLocalTree(options?: { skip?: boolean }): UseLocalTreeResult {
  const skip = options?.skip ?? false
  const [tree, setTree] = useState<QuarryTreeNode[]>([])
  const [loading, setLoading] = useState(!skip)
  const [error, setError] = useState<string | null>(null)
  const [totalStrands, setTotalStrands] = useState(0)
  const [totalWeaves, setTotalWeaves] = useState(0)
  const [totalLooms, setTotalLooms] = useState(0)
  const [vaultPath, setVaultPath] = useState<string | null>(null)

  const fetchTree = useCallback(async () => {
    setLoading(true)
    setError(null)
    console.log('[useLocalTree] fetchTree called, checking Electron vault...')

    try {
      // Check Electron vault status
      const isElectron = isElectronWithVault()
      console.log('[useLocalTree] isElectronWithVault:', isElectron)
      if (isElectron) {
        const status = await getElectronVaultStatus()
        console.log('[useLocalTree] Electron vault status:', status)
        if (status?.vaultPath) {
          setVaultPath(status.vaultPath)
        }
      }

      // Get content store and fetch tree
      console.log('[useLocalTree] Getting content store...')
      const store = await getContentStore()
      console.log('[useLocalTree] Content store initialized, fetching tree...')

      // Debug: List all strands to verify database content
      try {
        const allStrands = await store.debugListStrands()
        console.log('[useLocalTree] All strands in database:', allStrands.length)
      } catch (e) {
        console.warn('[useLocalTree] debugListStrands failed:', e)
      }

      let contentTree = await store.getKnowledgeTree()
      console.log('[useLocalTree] Raw content tree:', contentTree)

      // If tree is empty in Electron mode, retry multiple times
      // This handles race conditions where sync is still completing
      if (contentTree.length === 0 && isElectron) {
        for (let retry = 0; retry < 3; retry++) {
          console.log(`[useLocalTree] Tree empty, retry ${retry + 1}/3...`)
          await new Promise(resolve => setTimeout(resolve, 1500))
          contentTree = await store.getKnowledgeTree()
          console.log(`[useLocalTree] Retry ${retry + 1} result:`, contentTree.length, 'items')
          if (contentTree.length > 0) break
        }
      }

      // Convert to quarry format
      const quarryTree = convertToQuarryTree(contentTree)

      // Debug logging for tree structure
      console.log('[useLocalTree] Converted tree structure:', quarryTree.map(node => ({
        name: node.name,
        path: node.path,
        level: node.level,
        type: node.type,
        childrenCount: node.children?.length || 0,
        strandCount: node.strandCount,
        hasChildren: !!node.children && node.children.length > 0,
      })))

      // Count nodes
      const counts = countNodes(quarryTree)

      setTree(quarryTree)
      setTotalStrands(counts.strands)
      setTotalWeaves(counts.weaves)
      setTotalLooms(counts.looms)
      
      console.log('[useLocalTree] Loaded local tree:', {
        strands: counts.strands,
        weaves: counts.weaves,
        looms: counts.looms,
      })
    } catch (err) {
      console.error('[useLocalTree] Failed to fetch local tree:', err)
      setError(err instanceof Error ? err.message : 'Failed to load local knowledge tree')
      setTree([])
      setTotalStrands(0)
      setTotalWeaves(0)
      setTotalLooms(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!skip) {
      fetchTree()
    }
  }, [fetchTree, skip])

  return {
    tree,
    loading,
    error,
    totalStrands,
    totalWeaves,
    totalLooms,
    isLocalMode: true,
    vaultPath,
    refetch: fetchTree,
  }
}

export default useLocalTree
