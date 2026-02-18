/**
 * useStrandContent - Hook for fetching strand content and listing available strands
 * @module quarry/hooks/useStrandContent
 *
 * @remarks
 * Provides utilities for learning popovers to:
 * - Fetch content for a specific strand by path
 * - List all available strands for selection
 * - Cache strand content to avoid refetching
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useCodexContent } from '@/hooks/useCodexContent'
import type { StrandContent, KnowledgeTreeNode } from '@/lib/content/types'

export interface StrandInfo {
  slug: string
  title: string
  content?: string
  path?: string
  wordCount?: number
}

export interface UseStrandContentOptions {
  /** Auto-load strand list on mount */
  autoLoadList?: boolean
  /** Maximum strands to fetch in list */
  maxStrands?: number
}

export interface UseStrandContentReturn {
  /** List of available strands */
  strands: StrandInfo[]
  /** Whether strands are loading */
  loadingStrands: boolean
  /** Error loading strands */
  strandsError: string | null
  /** Load/refresh the strand list */
  loadStrands: () => Promise<void>
  /** Fetch content for a specific strand */
  fetchStrandContent: (slug: string) => Promise<StrandInfo | null>
  /** Whether a specific strand is loading */
  loadingContent: boolean
  /** Currently loaded strand content */
  currentContent: StrandInfo | null
  /** Error loading content */
  contentError: string | null
}

// Cache for strand content to avoid refetching
const strandContentCache = new Map<string, StrandInfo>()

/**
 * Hook for fetching strand content and listing available strands
 */
export function useStrandContent(
  options: UseStrandContentOptions = {}
): UseStrandContentReturn {
  const { autoLoadList = true, maxStrands = 100 } = options

  const { getKnowledgeTree, getStrands } = useCodexContent()

  const [strands, setStrands] = useState<StrandInfo[]>([])
  const [loadingStrands, setLoadingStrands] = useState(false)
  const [strandsError, setStrandsError] = useState<string | null>(null)

  const [currentContent, setCurrentContent] = useState<StrandInfo | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)
  const [contentError, setContentError] = useState<string | null>(null)

  /**
   * Recursively extract all strand nodes from the knowledge tree
   */
  const extractStrandsFromTree = useCallback((nodes: KnowledgeTreeNode[]): KnowledgeTreeNode[] => {
    const strands: KnowledgeTreeNode[] = []
    for (const node of nodes) {
      if (node.type === 'strand' && node.path.endsWith('.md') && !node.path.includes('/drafts/')) {
        strands.push(node)
      }
      if (node.children) {
        strands.push(...extractStrandsFromTree(node.children))
      }
    }
    return strands
  }, [])

  /**
   * Load list of all available strands
   */
  const loadStrands = useCallback(async () => {
    setLoadingStrands(true)
    setStrandsError(null)

    try {
      // Get the knowledge tree
      const tree = await getKnowledgeTree()
      
      // Extract all strand nodes from the tree
      const strandNodes = extractStrandsFromTree(tree).slice(0, maxStrands)

      // Convert to StrandInfo format
      const strandInfos: StrandInfo[] = strandNodes.map(node => ({
        slug: node.path,
        title: node.name?.replace(/\.md$/, '') || node.path.split('/').pop()?.replace(/\.md$/, '') || node.path,
        path: node.path,
      }))

      // Sort alphabetically by title
      strandInfos.sort((a, b) => a.title.localeCompare(b.title))

      setStrands(strandInfos)
    } catch (error) {
      console.error('[useStrandContent] Error loading strands:', error)
      setStrandsError(error instanceof Error ? error.message : 'Failed to load strands')
    } finally {
      setLoadingStrands(false)
    }
  }, [getKnowledgeTree, extractStrandsFromTree, maxStrands])

  /**
   * Fetch content for a specific strand
   */
  const fetchStrandContent = useCallback(async (slug: string): Promise<StrandInfo | null> => {
    // Check cache first
    const cached = strandContentCache.get(slug)
    if (cached && cached.content) {
      setCurrentContent(cached)
      return cached
    }

    setLoadingContent(true)
    setContentError(null)

    try {
      const results = await getStrands([slug])
      
      if (results.length === 0) {
        setContentError('Strand not found')
        return null
      }

      const strand = results[0]
      const info: StrandInfo = {
        slug: strand.path,
        title: strand.title || strand.path.split('/').pop()?.replace(/\.md$/, '') || slug,
        content: strand.content,
        path: strand.path,
        wordCount: strand.content?.split(/\s+/).length || 0,
      }

      // Cache for future use
      strandContentCache.set(slug, info)
      setCurrentContent(info)

      return info
    } catch (error) {
      console.error('[useStrandContent] Error fetching strand content:', error)
      setContentError(error instanceof Error ? error.message : 'Failed to load content')
      return null
    } finally {
      setLoadingContent(false)
    }
  }, [getStrands])

  // Auto-load strand list on mount
  useEffect(() => {
    if (autoLoadList) {
      loadStrands()
    }
  }, [autoLoadList, loadStrands])

  return {
    strands,
    loadingStrands,
    strandsError,
    loadStrands,
    fetchStrandContent,
    loadingContent,
    currentContent,
    contentError,
  }
}

/**
 * Helper to format relative time for cache age
 */
export function formatCacheAge(createdAt: string | Date): string {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffMins = Math.floor(diffMs / (60 * 1000))
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000))
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

/**
 * Clear the strand content cache
 */
export function clearStrandContentCache(): void {
  strandContentCache.clear()
}

