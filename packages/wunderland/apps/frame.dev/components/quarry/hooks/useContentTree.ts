/**
 * Unified Content Tree Hook
 * @module codex/hooks/useContentTree
 *
 * Automatically selects between local SQLite storage and GitHub
 * based on the runtime environment:
 * - Electron with vault → Local SQLite
 * - Browser with IndexedDB → Local SQLite  
 * - Web without local storage → GitHub
 */

import { useState, useEffect, useMemo } from 'react'
import type { KnowledgeTreeNode } from '../types'
import { useLocalTree } from './useLocalTree'
import { useGithubTree } from './useGithubTree'
import { isElectronWithVault, getElectronVaultStatus } from '@/lib/vault/electronVault'
import { isElectron } from '@/lib/electron'

export type ContentSourceType = 'local' | 'github' | 'indexeddb'

export interface UseContentTreeResult {
  tree: KnowledgeTreeNode[]
  loading: boolean
  error: string | null
  totalStrands: number
  totalWeaves: number
  totalLooms: number
  sourceType: ContentSourceType
  sourcePath: string | null
  isLocalMode: boolean
  refetch: () => Promise<void>
}

/**
 * Get the configured default content mode from environment
 * 
 * NEXT_PUBLIC_CODEX_DEFAULT_MODE can be:
 * - 'github': Always use GitHub API (for static deployments like quarry.space)
 * - 'sqlite' or 'local': Use local SQLite storage
 * - 'hybrid': GitHub with local cache
 * - 'indexeddb': Browser IndexedDB (default for non-static builds)
 */
function getConfiguredDefaultMode(): ContentSourceType | null {
  const envMode = process.env.NEXT_PUBLIC_CODEX_DEFAULT_MODE
  
  if (envMode === 'github') return 'github'
  if (envMode === 'sqlite' || envMode === 'local') return 'local'
  if (envMode === 'hybrid') return 'github' // Hybrid uses GitHub as primary
  if (envMode === 'indexeddb') return 'indexeddb'
  
  return null // No explicit configuration
}

/**
 * Detect which content source to use based on environment
 * 
 * Priority:
 * 1. NEXT_PUBLIC_CODEX_DEFAULT_MODE environment variable
 * 2. Electron with vault → Local SQLite
 * 3. Electron without vault → IndexedDB
 * 4. Static export (STATIC_EXPORT=true) → GitHub
 * 5. URL param or session storage override
 * 6. Default: GitHub for static sites, IndexedDB for dynamic
 */
async function detectContentSource(): Promise<{
  sourceType: ContentSourceType
  sourcePath: string | null
}> {
  // Check for explicit environment configuration first
  const configuredMode = getConfiguredDefaultMode()
  if (configuredMode) {
    console.log('[useContentTree] Using configured mode:', configuredMode)
    return {
      sourceType: configuredMode,
      sourcePath: null,
    }
  }

  // Check if running in Electron with vault
  if (isElectron()) {
    if (isElectronWithVault()) {
      try {
        const status = await getElectronVaultStatus()
        if (status?.electronVaultInitialized && status.vaultPath) {
          console.log('[useContentTree] Detected Electron vault:', status.vaultPath)
          return {
            sourceType: 'local',
            sourcePath: status.vaultPath,
          }
        }
      } catch (err) {
        console.warn('[useContentTree] Failed to get Electron vault status:', err)
      }
    }
    // Electron without vault still uses local IndexedDB
    console.log('[useContentTree] Electron without vault, using IndexedDB')
    return {
      sourceType: 'indexeddb',
      sourcePath: null,
    }
  }

  // Browser environment - check for URL/session overrides
  const forceGithub = typeof window !== 'undefined' && 
    (window.location.search.includes('source=github') ||
     sessionStorage.getItem('quarry-content-source') === 'github')

  if (forceGithub) {
    console.log('[useContentTree] Forced GitHub mode via URL/session')
    return {
      sourceType: 'github',
      sourcePath: null,
    }
  }

  const forceLocal = typeof window !== 'undefined' && 
    (window.location.search.includes('source=local') ||
     sessionStorage.getItem('quarry-content-source') === 'local')

  if (forceLocal) {
    console.log('[useContentTree] Forced local mode via URL/session')
    return {
      sourceType: 'indexeddb',
      sourcePath: null,
    }
  }

  // Check if this is a static export build (GitHub Pages, Vercel static, etc.)
  // In static builds, there's no API routes, so we must use GitHub API directly
  const isStaticBuild = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true' ||
    process.env.STATIC_EXPORT === 'true'

  if (isStaticBuild) {
    console.log('[useContentTree] Static build detected, using GitHub API')
    return {
      sourceType: 'github',
      sourcePath: null,
    }
  }

  // Default: use GitHub for web deployments (most common case)
  // Users can switch to local via settings or URL params
  console.log('[useContentTree] Browser mode, defaulting to GitHub')
  return {
    sourceType: 'github',
    sourcePath: null,
  }
}

/**
 * Unified hook for fetching knowledge tree from the appropriate source
 *
 * @param options.skip - Skip all tree loading (for pages that don't need it)
 * @param options.forceSource - Force a specific content source
 */
export function useContentTree(options?: {
  forceSource?: ContentSourceType
  skip?: boolean
}): UseContentTreeResult {
  // Early return for skip mode - no hooks called, no side effects
  const skip = options?.skip ?? false

  const [sourceType, setSourceType] = useState<ContentSourceType>('local')
  const [sourcePath, setSourcePath] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(skip) // Already initialized if skipping

  // Get results from both hooks (only one will be used)
  // Pass skip to prevent unnecessary fetching
  const localResult = useLocalTree({ skip })
  const githubResult = useGithubTree({ skip })

  // Detect source on mount
  useEffect(() => {
    async function init() {
      if (options?.forceSource) {
        setSourceType(options.forceSource)
        setInitialized(true)
        return
      }

      const detected = await detectContentSource()
      setSourceType(detected.sourceType)
      setSourcePath(detected.sourcePath)
      setInitialized(true)
    }
    init()
  }, [options?.forceSource])

  // Select the appropriate result based on source type
  const isLocalMode = sourceType === 'local' || sourceType === 'indexeddb'

  const result: UseContentTreeResult = useMemo(() => {
    if (!initialized) {
      return {
        tree: [],
        loading: true,
        error: null,
        totalStrands: 0,
        totalWeaves: 0,
        totalLooms: 0,
        sourceType,
        sourcePath,
        isLocalMode,
        refetch: async () => {},
      }
    }

    if (isLocalMode) {
      return {
        tree: localResult.tree,
        loading: localResult.loading,
        error: localResult.error,
        totalStrands: localResult.totalStrands,
        totalWeaves: localResult.totalWeaves,
        totalLooms: localResult.totalLooms,
        sourceType,
        sourcePath: sourcePath || localResult.vaultPath,
        isLocalMode: true,
        refetch: localResult.refetch,
      }
    } else {
      return {
        tree: githubResult.tree,
        loading: githubResult.loading,
        error: githubResult.error,
        totalStrands: githubResult.totalStrands,
        totalWeaves: githubResult.totalWeaves,
        totalLooms: githubResult.totalLooms,
        sourceType: 'github',
        sourcePath: null,
        isLocalMode: false,
        refetch: githubResult.refetch,
      }
    }
  }, [
    initialized,
    isLocalMode,
    sourceType,
    sourcePath,
    localResult.tree,
    localResult.loading,
    localResult.error,
    localResult.totalStrands,
    localResult.totalWeaves,
    localResult.totalLooms,
    localResult.vaultPath,
    localResult.refetch,
    githubResult.tree,
    githubResult.loading,
    githubResult.error,
    githubResult.totalStrands,
    githubResult.totalWeaves,
    githubResult.totalLooms,
    githubResult.refetch,
  ])

  return result
}

export default useContentTree

