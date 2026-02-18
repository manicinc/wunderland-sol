/**
 * Unified Outline State Hook
 * @module hooks/useOutlineState
 *
 * Central state management for outline/reader components:
 * - Active heading tracking with scroll sync
 * - Focus mode state
 * - Visible blocks tracking
 * - Sub-tab state (outline/minimap/backlinks)
 * - Scroll position and progress
 *
 * Provides a single source of truth for outline-related state
 * that syncs across TOC, minimap, reader panel, and focus mode.
 */

'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface Heading {
  id: string
  slug: string
  text: string
  level: number
  /** Position as fraction of document (0-1) */
  position?: number
}

export interface Block {
  id: string
  content: string
  type: 'paragraph' | 'heading' | 'code' | 'list' | 'quote' | 'other'
  level?: number
}

export type OutlineSubTab = 'outline' | 'minimap' | 'backlinks'

export interface OutlineState {
  /** Current active heading slug */
  activeHeadingSlug: string | null
  /** Current active block ID */
  activeBlockId: string | null
  /** Set of currently visible block IDs */
  visibleBlockIds: Set<string>
  /** Current outline sub-tab */
  subTab: OutlineSubTab
  /** Focus mode active */
  focusModeActive: boolean
  /** Scroll progress (0-1) */
  scrollProgress: number
  /** Viewport fraction of total document */
  viewportFraction: number
}

export interface OutlineActions {
  /** Set active heading */
  setActiveHeading: (slug: string | null) => void
  /** Set active block */
  setActiveBlock: (blockId: string | null) => void
  /** Update visible blocks */
  setVisibleBlocks: (blockIds: Set<string>) => void
  /** Add visible block */
  addVisibleBlock: (blockId: string) => void
  /** Remove visible block */
  removeVisibleBlock: (blockId: string) => void
  /** Change sub-tab */
  setSubTab: (tab: OutlineSubTab) => void
  /** Toggle focus mode */
  toggleFocusMode: () => void
  /** Set focus mode */
  setFocusMode: (active: boolean) => void
  /** Update scroll progress */
  setScrollProgress: (progress: number) => void
  /** Update viewport fraction */
  setViewportFraction: (fraction: number) => void
  /** Navigate to heading (will scroll and update state) */
  navigateToHeading: (slug: string) => void
  /** Navigate to block */
  navigateToBlock: (blockId: string) => void
  /** Navigate to next heading */
  navigateToNextHeading: () => void
  /** Navigate to previous heading */
  navigateToPreviousHeading: () => void
  /** Reset all state */
  reset: () => void
}

export interface UseOutlineStateOptions {
  /** Content container ref for scroll tracking */
  contentRef?: React.RefObject<HTMLElement>
  /** List of headings in the document */
  headings?: Heading[]
  /** List of blocks in the document */
  blocks?: Block[]
  /** Initial sub-tab */
  initialSubTab?: OutlineSubTab
  /** Callback when navigating to heading */
  onNavigateToHeading?: (slug: string) => void
  /** Callback when navigating to block */
  onNavigateToBlock?: (blockId: string) => void
  /** Callback when focus mode changes */
  onFocusModeChange?: (active: boolean) => void
}

export interface UseOutlineStateResult {
  state: OutlineState
  actions: OutlineActions
}

/* ═══════════════════════════════════════════════════════════════════════════
   INITIAL STATE
═══════════════════════════════════════════════════════════════════════════ */

const createInitialState = (initialSubTab: OutlineSubTab = 'outline'): OutlineState => ({
  activeHeadingSlug: null,
  activeBlockId: null,
  visibleBlockIds: new Set(),
  subTab: initialSubTab,
  focusModeActive: false,
  scrollProgress: 0,
  viewportFraction: 0.2,
})

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════════ */

export function useOutlineState({
  contentRef,
  headings = [],
  blocks = [],
  initialSubTab = 'outline',
  onNavigateToHeading,
  onNavigateToBlock,
  onFocusModeChange,
}: UseOutlineStateOptions = {}): UseOutlineStateResult {
  // State
  const [activeHeadingSlug, setActiveHeadingSlug] = useState<string | null>(null)
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [visibleBlockIds, setVisibleBlockIds] = useState<Set<string>>(new Set())
  const [subTab, setSubTab] = useState<OutlineSubTab>(initialSubTab)
  const [focusModeActive, setFocusModeActive] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [viewportFraction, setViewportFraction] = useState(0.2)
  
  // Refs for derived values
  const headingsRef = useRef(headings)
  headingsRef.current = headings
  
  const blocksRef = useRef(blocks)
  blocksRef.current = blocks
  
  // Update active heading based on visible blocks
  useEffect(() => {
    if (visibleBlockIds.size === 0) return
    
    // Find the first visible heading
    const visibleIds = Array.from(visibleBlockIds)
    for (const heading of headingsRef.current) {
      if (visibleIds.includes(heading.id) || visibleIds.includes(`block-${heading.id}`)) {
        if (heading.slug !== activeHeadingSlug) {
          setActiveHeadingSlug(heading.slug)
        }
        break
      }
    }
  }, [visibleBlockIds, activeHeadingSlug])
  
  // Update active block based on visible blocks
  useEffect(() => {
    if (visibleBlockIds.size === 0) return
    
    // Use the first visible block as active
    const firstVisible = Array.from(visibleBlockIds)[0]
    if (firstVisible && firstVisible !== activeBlockId) {
      setActiveBlockId(firstVisible)
    }
  }, [visibleBlockIds, activeBlockId])
  
  // Track scroll progress
  useEffect(() => {
    if (!contentRef?.current) return
    
    const container = contentRef.current
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const maxScroll = scrollHeight - clientHeight
      const progress = maxScroll > 0 ? scrollTop / maxScroll : 0
      const viewport = scrollHeight > 0 ? clientHeight / scrollHeight : 1
      
      setScrollProgress(Math.min(1, Math.max(0, progress)))
      setViewportFraction(Math.min(1, viewport))
    }
    
    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial calculation
    
    return () => container.removeEventListener('scroll', handleScroll)
  }, [contentRef])
  
  // Actions
  const addVisibleBlock = useCallback((blockId: string) => {
    setVisibleBlockIds(prev => {
      const next = new Set(prev)
      next.add(blockId)
      return next
    })
  }, [])
  
  const removeVisibleBlock = useCallback((blockId: string) => {
    setVisibleBlockIds(prev => {
      const next = new Set(prev)
      next.delete(blockId)
      return next
    })
  }, [])
  
  const toggleFocusMode = useCallback(() => {
    setFocusModeActive(prev => {
      const next = !prev
      onFocusModeChange?.(next)
      return next
    })
  }, [onFocusModeChange])
  
  const setFocusMode = useCallback((active: boolean) => {
    setFocusModeActive(active)
    onFocusModeChange?.(active)
  }, [onFocusModeChange])
  
  const navigateToHeading = useCallback((slug: string) => {
    setActiveHeadingSlug(slug)
    onNavigateToHeading?.(slug)
    
    // Also scroll to heading element if content ref available
    if (contentRef?.current) {
      const element = contentRef.current.querySelector(`[id="${slug}"]`) ||
                      contentRef.current.querySelector(`[data-heading-slug="${slug}"]`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [contentRef, onNavigateToHeading])
  
  const navigateToBlock = useCallback((blockId: string) => {
    setActiveBlockId(blockId)
    onNavigateToBlock?.(blockId)
    
    // Scroll to block
    if (contentRef?.current) {
      const element = contentRef.current.querySelector(`[data-block-id="${blockId}"]`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [contentRef, onNavigateToBlock])
  
  const navigateToNextHeading = useCallback(() => {
    const currentIndex = headingsRef.current.findIndex(h => h.slug === activeHeadingSlug)
    if (currentIndex < headingsRef.current.length - 1) {
      const nextHeading = headingsRef.current[currentIndex + 1]
      navigateToHeading(nextHeading.slug)
    }
  }, [activeHeadingSlug, navigateToHeading])
  
  const navigateToPreviousHeading = useCallback(() => {
    const currentIndex = headingsRef.current.findIndex(h => h.slug === activeHeadingSlug)
    if (currentIndex > 0) {
      const prevHeading = headingsRef.current[currentIndex - 1]
      navigateToHeading(prevHeading.slug)
    } else if (currentIndex === -1 && headingsRef.current.length > 0) {
      navigateToHeading(headingsRef.current[0].slug)
    }
  }, [activeHeadingSlug, navigateToHeading])
  
  const reset = useCallback(() => {
    const initial = createInitialState(initialSubTab)
    setActiveHeadingSlug(initial.activeHeadingSlug)
    setActiveBlockId(initial.activeBlockId)
    setVisibleBlockIds(initial.visibleBlockIds)
    setSubTab(initial.subTab)
    setFocusModeActive(initial.focusModeActive)
    setScrollProgress(initial.scrollProgress)
    setViewportFraction(initial.viewportFraction)
  }, [initialSubTab])
  
  // Memoized state object
  const state = useMemo<OutlineState>(() => ({
    activeHeadingSlug,
    activeBlockId,
    visibleBlockIds,
    subTab,
    focusModeActive,
    scrollProgress,
    viewportFraction,
  }), [
    activeHeadingSlug,
    activeBlockId,
    visibleBlockIds,
    subTab,
    focusModeActive,
    scrollProgress,
    viewportFraction,
  ])
  
  // Memoized actions object
  const actions = useMemo<OutlineActions>(() => ({
    setActiveHeading: setActiveHeadingSlug,
    setActiveBlock: setActiveBlockId,
    setVisibleBlocks: setVisibleBlockIds,
    addVisibleBlock,
    removeVisibleBlock,
    setSubTab,
    toggleFocusMode,
    setFocusMode,
    setScrollProgress,
    setViewportFraction,
    navigateToHeading,
    navigateToBlock,
    navigateToNextHeading,
    navigateToPreviousHeading,
    reset,
  }), [
    addVisibleBlock,
    removeVisibleBlock,
    toggleFocusMode,
    setFocusMode,
    navigateToHeading,
    navigateToBlock,
    navigateToNextHeading,
    navigateToPreviousHeading,
    reset,
  ])
  
  return { state, actions }
}

export default useOutlineState

