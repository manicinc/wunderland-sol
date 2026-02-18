/**
 * Content Sources Context
 * @module components/quarry/contexts/ContentSourcesContext
 *
 * Provides a unified view of all content sources for Ask interface and Learning Studio:
 * - Open Tabs: Documents currently open in the tab bar (like browser tabs)
 * - Sidebar Selection: Strands selected via multi-select in the sidebar
 * - All Strands: Complete knowledge base
 * - Custom Selection: Ad-hoc filtered selection
 *
 * This context combines OpenTabsContext and SelectedStrandsContext into a single
 * interface for features that need to select content sources.
 */

'use client'

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { useOpenTabsSafe } from './OpenTabsContext'
import { useSelectedStrandsSafe, type SelectedStrand } from './SelectedStrandsContext'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Source type for content selection
 */
export type ContentSourceType = 'open-tabs' | 'sidebar-selection' | 'all-strands' | 'custom'

/**
 * Unified strand representation from any source
 */
export interface UnifiedStrand {
  id: string
  path: string
  title: string
  content?: string
  wordCount?: number
  tags?: string[]
  subjects?: string[]
  topics?: string[]
  /** Source of this strand */
  source: ContentSourceType
  /** Whether content is loaded */
  isContentLoaded: boolean
}

/**
 * Source group with metadata
 */
export interface ContentSourceGroup {
  type: ContentSourceType
  label: string
  description: string
  strands: UnifiedStrand[]
  count: number
  isAvailable: boolean
  /** Icon name for display */
  icon: 'file-text' | 'layers' | 'database' | 'filter'
}

/**
 * Active selection state
 */
export interface ContentSelectionState {
  /** Currently active source type */
  activeSource: ContentSourceType
  /** Selected strand IDs from the active source */
  selectedIds: Set<string>
  /** Selected strands with full data */
  selectedStrands: UnifiedStrand[]
  /** Total word count of selection */
  totalWords: number
  /** Cache key for this selection (order-independent) */
  cacheKey: string
}

/**
 * Context state
 */
export interface ContentSourcesState {
  /** All available source groups */
  sources: ContentSourceGroup[]
  /** Current selection state */
  selection: ContentSelectionState
  /** Whether any source has content available */
  hasContent: boolean
  /** Total strands across all sources */
  totalAvailableStrands: number
}

/**
 * Context actions
 */
export interface ContentSourcesActions {
  /** Switch to a different source */
  setActiveSource: (source: ContentSourceType) => void
  /** Select specific strands from the active source */
  selectStrands: (strandIds: string[]) => void
  /** Toggle a strand's selection */
  toggleStrand: (strandId: string) => void
  /** Select all from active source */
  selectAll: () => void
  /** Clear selection */
  clearSelection: () => void
  /** Add strands to custom selection */
  addToCustom: (strands: UnifiedStrand[]) => void
  /** Remove strand from custom selection */
  removeFromCustom: (strandId: string) => void
  /** Clear custom selection */
  clearCustom: () => void
  /** Get strands for a specific source */
  getSourceStrands: (source: ContentSourceType) => UnifiedStrand[]
  /** Refresh content from all sources */
  refreshSources: () => void
}

export type ContentSourcesContextValue = ContentSourcesState & ContentSourcesActions

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Generate cache key from selection (order-independent)
 */
function generateCacheKey(strandIds: string[], sourceType: ContentSourceType): string {
  if (strandIds.length === 0) return ''
  const sorted = [...strandIds].sort()
  const hash = sorted.join('|')
  // Simple hash for display
  let hashNum = 0
  for (let i = 0; i < hash.length; i++) {
    hashNum = ((hashNum << 5) - hashNum + hash.charCodeAt(i)) | 0
  }
  const prefix = strandIds.length > 1 ? 'multi' : 'single'
  return `${sourceType}_${prefix}_${(hashNum >>> 0).toString(16).slice(0, 8)}`
}

/**
 * Calculate total word count
 */
function calculateWordCount(strands: UnifiedStrand[]): number {
  return strands.reduce((sum, s) => sum + (s.wordCount || 0), 0)
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONTEXT
═══════════════════════════════════════════════════════════════════════════ */

const ContentSourcesContext = createContext<ContentSourcesContextValue | null>(null)

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER
═══════════════════════════════════════════════════════════════════════════ */

export interface ContentSourcesProviderProps {
  children: ReactNode
  /** All strands available in the knowledge base (from parent) */
  allStrands?: UnifiedStrand[]
  /** Default source to use */
  defaultSource?: ContentSourceType
}

export function ContentSourcesProvider({
  children,
  allStrands = [],
  defaultSource = 'open-tabs',
}: ContentSourcesProviderProps) {
  // Get data from child contexts
  const openTabs = useOpenTabsSafe()
  const sidebarSelection = useSelectedStrandsSafe()

  // Local state
  const [activeSource, setActiveSource] = useState<ContentSourceType>(defaultSource)
  const [customStrands, setCustomStrands] = useState<UnifiedStrand[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Convert open tabs to unified strands
  const openTabStrands = useMemo<UnifiedStrand[]>(() => {
    if (!openTabs?.tabs) return []
    return openTabs.tabs.map((tab) => ({
      id: tab.id,
      path: tab.path,
      title: tab.title,
      content: tab.content,
      wordCount: tab.content ? tab.content.split(/\s+/).length : undefined,
      tags: tab.metadata?.tags,
      subjects: tab.metadata?.subjects,
      topics: tab.metadata?.topics,
      source: 'open-tabs' as const,
      isContentLoaded: !!tab.content,
    }))
  }, [openTabs?.tabs, refreshTrigger])

  // Convert sidebar selections to unified strands
  const sidebarStrands = useMemo<UnifiedStrand[]>(() => {
    if (!sidebarSelection?.strands) return []
    return sidebarSelection.strands.map((strand) => ({
      id: strand.id,
      path: strand.path,
      title: strand.title,
      content: strand.content,
      wordCount: strand.wordCount,
      tags: strand.tags,
      subjects: strand.subjects,
      topics: strand.topics,
      source: 'sidebar-selection' as const,
      isContentLoaded: !!strand.content,
    }))
  }, [sidebarSelection?.strands, refreshTrigger])

  // All strands with unified type
  const allUnifiedStrands = useMemo<UnifiedStrand[]>(() => {
    return allStrands.map((s) => ({
      ...s,
      source: 'all-strands' as const,
      isContentLoaded: !!s.content,
    }))
  }, [allStrands])

  // Build source groups
  const sources = useMemo<ContentSourceGroup[]>(() => [
    {
      type: 'open-tabs',
      label: 'Open Tabs',
      description: 'Documents currently open in tabs',
      strands: openTabStrands,
      count: openTabStrands.length,
      isAvailable: openTabStrands.length > 0,
      icon: 'file-text',
    },
    {
      type: 'sidebar-selection',
      label: 'Sidebar Selection',
      description: 'Strands selected in the sidebar',
      strands: sidebarStrands,
      count: sidebarStrands.length,
      isAvailable: sidebarStrands.length > 0,
      icon: 'layers',
    },
    {
      type: 'all-strands',
      label: 'All Strands',
      description: 'Complete knowledge base',
      strands: allUnifiedStrands,
      count: allUnifiedStrands.length,
      isAvailable: allUnifiedStrands.length > 0,
      icon: 'database',
    },
    {
      type: 'custom',
      label: 'Custom Selection',
      description: 'Custom filtered selection',
      strands: customStrands,
      count: customStrands.length,
      isAvailable: true, // Always available for adding to
      icon: 'filter',
    },
  ], [openTabStrands, sidebarStrands, allUnifiedStrands, customStrands])

  // Get strands for active source
  const getSourceStrands = useCallback((source: ContentSourceType): UnifiedStrand[] => {
    const group = sources.find((s) => s.type === source)
    return group?.strands || []
  }, [sources])

  // Currently selected strands based on active source and selection
  const selectedStrands = useMemo<UnifiedStrand[]>(() => {
    const sourceStrands = getSourceStrands(activeSource)
    if (selectedIds.size === 0) {
      // If nothing explicitly selected, use all from source
      return sourceStrands
    }
    return sourceStrands.filter((s) => selectedIds.has(s.id))
  }, [activeSource, selectedIds, getSourceStrands])

  // Build selection state
  const selection = useMemo<ContentSelectionState>(() => {
    const ids = new Set(selectedStrands.map((s) => s.id))
    return {
      activeSource,
      selectedIds: ids,
      selectedStrands,
      totalWords: calculateWordCount(selectedStrands),
      cacheKey: generateCacheKey([...ids], activeSource),
    }
  }, [activeSource, selectedStrands])

  // Actions
  const handleSetActiveSource = useCallback((source: ContentSourceType) => {
    setActiveSource(source)
    setSelectedIds(new Set()) // Clear selection when switching sources
  }, [])

  const selectStrands = useCallback((strandIds: string[]) => {
    setSelectedIds(new Set(strandIds))
  }, [])

  const toggleStrand = useCallback((strandId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(strandId)) {
        next.delete(strandId)
      } else {
        next.add(strandId)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    const sourceStrands = getSourceStrands(activeSource)
    setSelectedIds(new Set(sourceStrands.map((s) => s.id)))
  }, [activeSource, getSourceStrands])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const addToCustom = useCallback((strands: UnifiedStrand[]) => {
    setCustomStrands((prev) => {
      const existingIds = new Set(prev.map((s) => s.id))
      const toAdd = strands
        .filter((s) => !existingIds.has(s.id))
        .map((s) => ({ ...s, source: 'custom' as const }))
      return [...prev, ...toAdd]
    })
  }, [])

  const removeFromCustom = useCallback((strandId: string) => {
    setCustomStrands((prev) => prev.filter((s) => s.id !== strandId))
  }, [])

  const clearCustom = useCallback(() => {
    setCustomStrands([])
    if (activeSource === 'custom') {
      setSelectedIds(new Set())
    }
  }, [activeSource])

  const refreshSources = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  // Build context value
  const contextValue = useMemo<ContentSourcesContextValue>(() => ({
    sources,
    selection,
    hasContent: sources.some((s) => s.count > 0),
    totalAvailableStrands: sources.reduce((sum, s) => sum + s.count, 0),
    setActiveSource: handleSetActiveSource,
    selectStrands,
    toggleStrand,
    selectAll,
    clearSelection,
    addToCustom,
    removeFromCustom,
    clearCustom,
    getSourceStrands,
    refreshSources,
  }), [
    sources,
    selection,
    handleSetActiveSource,
    selectStrands,
    toggleStrand,
    selectAll,
    clearSelection,
    addToCustom,
    removeFromCustom,
    clearCustom,
    getSourceStrands,
    refreshSources,
  ])

  return (
    <ContentSourcesContext.Provider value={contextValue}>
      {children}
    </ContentSourcesContext.Provider>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOKS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Use content sources context (throws if not in provider)
 */
export function useContentSources(): ContentSourcesContextValue {
  const context = useContext(ContentSourcesContext)
  if (!context) {
    throw new Error('useContentSources must be used within ContentSourcesProvider')
  }
  return context
}

/**
 * Safe version that returns null instead of throwing
 */
export function useContentSourcesSafe(): ContentSourcesContextValue | null {
  return useContext(ContentSourcesContext)
}

/**
 * Get just the current selection (convenience hook)
 */
export function useContentSelection(): ContentSelectionState | null {
  const context = useContext(ContentSourcesContext)
  return context?.selection || null
}

/**
 * Get source groups (convenience hook)
 */
export function useContentSourceGroups(): ContentSourceGroup[] {
  const context = useContext(ContentSourcesContext)
  return context?.sources || []
}

