/**
 * Open Tabs Context
 * @module components/quarry/contexts/OpenTabsContext
 * 
 * Provides state management for the multi-strand tab system.
 * Manages open tabs, tab ordering, persistence, and tab lifecycle.
 * 
 * Separate from SelectedStrandsContext which handles batch selection
 * for operations like flashcard generation and RAG context.
 */

'use client'

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import type { StrandMetadata } from '@/lib/content/types'

// Simple console-based notifications for the context layer
// UI components can show actual toasts via useToast hook
const notify = {
  error: (message: string, options?: { description?: string }) => {
    console.warn(`[OpenTabs] ${message}`, options?.description || '')
  },
  info: (message: string) => {
    console.log(`[OpenTabs] ${message}`)
  },
}
import type {
  OpenTab,
  OpenTabsState,
  OpenTabsActions,
  OpenTabsContextValue,
  OpenTabOptions,
  ClosedTabInfo,
  PersistedTabsData,
} from '../ui/tabs/types'
import {
  MAX_TABS,
  MAX_RECENTLY_CLOSED,
  TABS_STORAGE_KEY,
  TABS_STORAGE_VERSION,
  SAVE_DEBOUNCE_MS,
} from '../ui/tabs/types'

/* ═══════════════════════════════════════════════════════════════════════════
   INITIAL STATE
═══════════════════════════════════════════════════════════════════════════ */

const initialState: OpenTabsState = {
  tabs: [],
  activeTabId: null,
  tabOrder: [],
  recentlyClosed: [],
  tabsVisible: true,
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONTEXT
═══════════════════════════════════════════════════════════════════════════ */

const OpenTabsContext = createContext<OpenTabsContextValue | null>(null)

/* ═══════════════════════════════════════════════════════════════════════════
   PERSISTENCE HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function loadPersistedTabs(): Partial<OpenTabsState> {
  if (typeof window === 'undefined') return {}

  try {
    const stored = localStorage.getItem(TABS_STORAGE_KEY)
    if (!stored) return {}

    const data: PersistedTabsData = JSON.parse(stored)

    // Version check for future migrations
    if (data.version !== TABS_STORAGE_VERSION) {
      console.log('[OpenTabsContext] Storage version mismatch, clearing')
      localStorage.removeItem(TABS_STORAGE_KEY)
      return {}
    }

    // Reconstruct tabs without content (will be lazy-loaded)
    const tabs: OpenTab[] = data.tabs.map(t => ({
      id: t.id,
      path: t.path,
      title: t.title,
      content: undefined,
      metadata: undefined,
      isDirty: false,
      isPinned: t.isPinned,
      isPreview: false,
      scrollPosition: t.scrollPosition,
      cursorPosition: t.cursorPosition,
      openedAt: Date.now(),
      lastActiveAt: Date.now(),
    }))

    return {
      tabs,
      activeTabId: data.activeTabId,
      tabOrder: data.tabOrder,
      recentlyClosed: data.recentlyClosed || [],
    }
  } catch (e) {
    console.error('[OpenTabsContext] Failed to load persisted tabs:', e)
    return {}
  }
}

function persistTabs(state: OpenTabsState): void {
  if (typeof window === 'undefined') return

  try {
    const data: PersistedTabsData = {
      version: TABS_STORAGE_VERSION,
      tabs: state.tabs.map(t => ({
        id: t.id,
        path: t.path,
        title: t.title,
        isPinned: t.isPinned,
        scrollPosition: t.scrollPosition,
        cursorPosition: t.cursorPosition,
      })),
      activeTabId: state.activeTabId,
      tabOrder: state.tabOrder,
      recentlyClosed: state.recentlyClosed.slice(0, MAX_RECENTLY_CLOSED),
    }

    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('[OpenTabsContext] Failed to persist tabs:', e)
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER
═══════════════════════════════════════════════════════════════════════════ */

export interface OpenTabsProviderProps {
  children: ReactNode
  /** Content fetcher for lazy loading */
  fetchContent?: (path: string) => Promise<{ content: string; metadata?: StrandMetadata }>
}

export function OpenTabsProvider({
  children,
  fetchContent,
}: OpenTabsProviderProps) {
  // State
  const [state, setState] = useState<OpenTabsState>(() => ({
    ...initialState,
    ...loadPersistedTabs(),
  }))

  // Debounced save ref
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Persist state on changes (debounced)
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      persistTabs(state)
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [state])

  // Generate tab ID from path
  const generateTabId = useCallback((path: string): string => {
    return path
  }, [])

  // Extract title from path
  const extractTitle = useCallback((path: string): string => {
    const filename = path.split('/').pop() || path
    return filename.replace(/\.mdx?$/, '').replace(/-/g, ' ')
  }, [])

  // Find eviction candidate (oldest unpinned, non-dirty tab)
  const findEvictionCandidate = useCallback((tabs: OpenTab[]): OpenTab | null => {
    const candidates = tabs
      .filter(t => !t.isPinned && !t.isDirty)
      .sort((a, b) => a.lastActiveAt - b.lastActiveAt)

    return candidates[0] || null
  }, [])

  /* ═══════════════════════════════════════════════════════════════════════
     ACTIONS
  ═══════════════════════════════════════════════════════════════════════ */

  const openTab = useCallback((
    path: string,
    title?: string,
    options: OpenTabOptions = {}
  ) => {
    setState(prev => {
      const tabId = generateTabId(path)
      const existingTab = prev.tabs.find(t => t.id === tabId)

      // If already open, just switch to it
      if (existingTab) {
        // Convert from preview to permanent if opening as non-preview
        const shouldConvert = existingTab.isPreview && !options.asPreview
        const updatedTabs = prev.tabs.map(t =>
          t.id === tabId
            ? { ...t, lastActiveAt: Date.now(), isPreview: shouldConvert ? false : t.isPreview }
            : t
        )
        return {
          ...prev,
          tabs: updatedTabs,
          activeTabId: tabId,
        }
      }

      // Build the new tab object
      const newTab: OpenTab = {
        id: tabId,
        path,
        title: title || extractTitle(path),
        content: options.content,
        metadata: options.metadata,
        isDirty: false,
        isPinned: options.pinned || false,
        isPreview: options.asPreview || false,
        scrollPosition: options.scrollPosition,
        cursorPosition: undefined,
        openedAt: Date.now(),
        lastActiveAt: Date.now(),
      }

      // If opening as preview, check for existing preview tab to replace
      if (options.asPreview) {
        const existingPreviewIndex = prev.tabs.findIndex(t => t.isPreview)
        if (existingPreviewIndex !== -1) {
          // Replace the existing preview tab with the new one
          const existingPreviewId = prev.tabs[existingPreviewIndex].id
          const updatedTabs = prev.tabs.map((t, i) =>
            i === existingPreviewIndex ? newTab : t
          )
          // Update tabOrder: replace old preview id with new one
          const updatedOrder = prev.tabOrder.map(id =>
            id === existingPreviewId ? tabId : id
          )
          return {
            ...prev,
            tabs: updatedTabs,
            activeTabId: tabId,
            tabOrder: updatedOrder,
          }
        }
      }

      // Check if we're at the limit
      if (prev.tabs.length >= MAX_TABS) {
        const evictionCandidate = findEvictionCandidate(prev.tabs)

        if (!evictionCandidate) {
          // All tabs are pinned or dirty, can't open new tab
          notify.error('Close a tab to open more', {
            description: 'All tabs are pinned or have unsaved changes',
          })
          return prev
        }

        // Evict the candidate
        const filteredTabs = prev.tabs.filter(t => t.id !== evictionCandidate.id)
        const filteredOrder = prev.tabOrder.filter(id => id !== evictionCandidate.id)

        // Add to recently closed
        const closedInfo: ClosedTabInfo = {
          path: evictionCandidate.path,
          title: evictionCandidate.title,
          closedAt: Date.now(),
          scrollPosition: evictionCandidate.scrollPosition,
        }

        return {
          ...prev,
          tabs: [...filteredTabs, newTab],
          activeTabId: tabId,
          tabOrder: [...filteredOrder, tabId],
          recentlyClosed: [closedInfo, ...prev.recentlyClosed].slice(0, MAX_RECENTLY_CLOSED),
        }
      }

      // Create new tab (newTab was already built above)
      return {
        ...prev,
        tabs: [...prev.tabs, newTab],
        activeTabId: tabId,
        tabOrder: [...prev.tabOrder, tabId],
      }
    })

    // Fetch content if fetcher provided and content not already available
    if (fetchContent && !options.content) {
      fetchContent(path).then(({ content, metadata }) => {
        setState(prev => {
          const tabId = generateTabId(path)
          const tab = prev.tabs.find(t => t.id === tabId)
          if (!tab) return prev

          return {
            ...prev,
            tabs: prev.tabs.map(t =>
              t.id === tabId ? { ...t, content, metadata } : t
            ),
          }
        })
      }).catch(err => {
        console.error('[OpenTabsContext] Failed to fetch content:', err)
      })
    }
  }, [generateTabId, extractTitle, findEvictionCandidate, fetchContent])

  const closeTab = useCallback((tabId: string) => {
    setState(prev => {
      const tab = prev.tabs.find(t => t.id === tabId)
      if (!tab) return prev

      // If dirty, confirm before closing
      if (tab.isDirty) {
        // For now, we'll just close - in production you'd show a confirm dialog
        // TODO: Add unsaved changes warning modal
      }

      const filteredTabs = prev.tabs.filter(t => t.id !== tabId)
      const filteredOrder = prev.tabOrder.filter(id => id !== tabId)

      // Add to recently closed
      const closedInfo: ClosedTabInfo = {
        path: tab.path,
        title: tab.title,
        closedAt: Date.now(),
        scrollPosition: tab.scrollPosition,
      }

      // If closing active tab, switch to next/prev
      let newActiveId = prev.activeTabId
      if (prev.activeTabId === tabId) {
        const currentIndex = prev.tabOrder.indexOf(tabId)
        if (filteredOrder.length > 0) {
          // Try to go to the tab to the right, otherwise left
          const nextIndex = Math.min(currentIndex, filteredOrder.length - 1)
          newActiveId = filteredOrder[nextIndex]
        } else {
          newActiveId = null
        }
      }

      return {
        ...prev,
        tabs: filteredTabs,
        activeTabId: newActiveId,
        tabOrder: filteredOrder,
        recentlyClosed: [closedInfo, ...prev.recentlyClosed].slice(0, MAX_RECENTLY_CLOSED),
      }
    })
  }, [])

  const closeOtherTabs = useCallback((tabId: string) => {
    setState(prev => {
      const tabToKeep = prev.tabs.find(t => t.id === tabId)
      if (!tabToKeep) return prev

      // Keep pinned tabs and the specified tab
      const tabsToKeep = prev.tabs.filter(t => t.id === tabId || t.isPinned)
      const idsToKeep = new Set(tabsToKeep.map(t => t.id))

      // Add closed tabs to recently closed
      const closedTabs = prev.tabs.filter(t => !idsToKeep.has(t.id))
      const newRecentlyClosed = [
        ...closedTabs.map(t => ({
          path: t.path,
          title: t.title,
          closedAt: Date.now(),
          scrollPosition: t.scrollPosition,
        })),
        ...prev.recentlyClosed,
      ].slice(0, MAX_RECENTLY_CLOSED)

      return {
        ...prev,
        tabs: tabsToKeep,
        activeTabId: tabId,
        tabOrder: prev.tabOrder.filter(id => idsToKeep.has(id)),
        recentlyClosed: newRecentlyClosed,
      }
    })
  }, [])

  const closeTabsToRight = useCallback((tabId: string) => {
    setState(prev => {
      const tabIndex = prev.tabOrder.indexOf(tabId)
      if (tabIndex === -1) return prev

      const idsToRight = prev.tabOrder.slice(tabIndex + 1)
      const tabsToClose = prev.tabs.filter(t =>
        idsToRight.includes(t.id) && !t.isPinned
      )
      const idsToClose = new Set(tabsToClose.map(t => t.id))

      // Add closed tabs to recently closed
      const newRecentlyClosed = [
        ...tabsToClose.map(t => ({
          path: t.path,
          title: t.title,
          closedAt: Date.now(),
          scrollPosition: t.scrollPosition,
        })),
        ...prev.recentlyClosed,
      ].slice(0, MAX_RECENTLY_CLOSED)

      return {
        ...prev,
        tabs: prev.tabs.filter(t => !idsToClose.has(t.id)),
        tabOrder: prev.tabOrder.filter(id => !idsToClose.has(id)),
        recentlyClosed: newRecentlyClosed,
      }
    })
  }, [])

  const closeAllTabs = useCallback(() => {
    setState(prev => {
      // Keep only pinned tabs
      const pinnedTabs = prev.tabs.filter(t => t.isPinned)
      const pinnedIds = new Set(pinnedTabs.map(t => t.id))

      // Add closed tabs to recently closed
      const closedTabs = prev.tabs.filter(t => !t.isPinned)
      const newRecentlyClosed = [
        ...closedTabs.map(t => ({
          path: t.path,
          title: t.title,
          closedAt: Date.now(),
          scrollPosition: t.scrollPosition,
        })),
        ...prev.recentlyClosed,
      ].slice(0, MAX_RECENTLY_CLOSED)

      // If active tab was closed, switch to first pinned or null
      let newActiveId = prev.activeTabId
      if (prev.activeTabId && !pinnedIds.has(prev.activeTabId)) {
        newActiveId = pinnedTabs.length > 0 ? pinnedTabs[0].id : null
      }

      return {
        ...prev,
        tabs: pinnedTabs,
        activeTabId: newActiveId,
        tabOrder: prev.tabOrder.filter(id => pinnedIds.has(id)),
        recentlyClosed: newRecentlyClosed,
      }
    })
  }, [])

  const setActiveTab = useCallback((tabId: string) => {
    setState(prev => {
      const tab = prev.tabs.find(t => t.id === tabId)
      if (!tab) return prev

      return {
        ...prev,
        activeTabId: tabId,
        tabs: prev.tabs.map(t =>
          t.id === tabId ? { ...t, lastActiveAt: Date.now() } : t
        ),
      }
    })
  }, [])

  const nextTab = useCallback(() => {
    setState(prev => {
      if (prev.tabOrder.length <= 1) return prev

      const currentIndex = prev.activeTabId
        ? prev.tabOrder.indexOf(prev.activeTabId)
        : -1
      const nextIndex = (currentIndex + 1) % prev.tabOrder.length
      const nextTabId = prev.tabOrder[nextIndex]

      return {
        ...prev,
        activeTabId: nextTabId,
        tabs: prev.tabs.map(t =>
          t.id === nextTabId ? { ...t, lastActiveAt: Date.now() } : t
        ),
      }
    })
  }, [])

  const prevTab = useCallback(() => {
    setState(prev => {
      if (prev.tabOrder.length <= 1) return prev

      const currentIndex = prev.activeTabId
        ? prev.tabOrder.indexOf(prev.activeTabId)
        : 0
      const prevIndex = (currentIndex - 1 + prev.tabOrder.length) % prev.tabOrder.length
      const prevTabId = prev.tabOrder[prevIndex]

      return {
        ...prev,
        activeTabId: prevTabId,
        tabs: prev.tabs.map(t =>
          t.id === prevTabId ? { ...t, lastActiveAt: Date.now() } : t
        ),
      }
    })
  }, [])

  const jumpToTab = useCallback((index: number) => {
    setState(prev => {
      // 1-indexed, so tab 1 is index 0
      const tabIndex = index - 1
      if (tabIndex < 0 || tabIndex >= prev.tabOrder.length) return prev

      const tabId = prev.tabOrder[tabIndex]

      return {
        ...prev,
        activeTabId: tabId,
        tabs: prev.tabs.map(t =>
          t.id === tabId ? { ...t, lastActiveAt: Date.now() } : t
        ),
      }
    })
  }, [])

  const togglePin = useCallback((tabId: string) => {
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(t =>
        t.id === tabId ? { ...t, isPinned: !t.isPinned } : t
      ),
    }))
  }, [])

  const setDirty = useCallback((tabId: string, isDirty: boolean) => {
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(t =>
        t.id === tabId ? { ...t, isDirty } : t
      ),
    }))
  }, [])

  const updateTabContent = useCallback((
    tabId: string,
    content: string,
    metadata?: StrandMetadata
  ) => {
    setState(prev => {
      const tab = prev.tabs.find(t => t.id === tabId)
      // Skip update if content is already the same - prevents infinite render loops
      if (tab && tab.content === content) {
        // Also check if metadata is different (shallow comparison of keys)
        const metaChanged = metadata && (
          !tab.metadata ||
          Object.keys(metadata).some(k =>
            (metadata as Record<string, unknown>)[k] !== (tab.metadata as Record<string, unknown> | undefined)?.[k]
          )
        )
        if (!metaChanged) {
          return prev // Return same object reference, no re-render
        }
      }
      return {
        ...prev,
        tabs: prev.tabs.map(t =>
          t.id === tabId ? { ...t, content, metadata: metadata ?? t.metadata } : t
        ),
      }
    })
  }, [])

  const updateScrollPosition = useCallback((tabId: string, position: number) => {
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(t =>
        t.id === tabId ? { ...t, scrollPosition: position } : t
      ),
    }))
  }, [])

  const updateCursorPosition = useCallback((tabId: string, position: number) => {
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(t =>
        t.id === tabId ? { ...t, cursorPosition: position } : t
      ),
    }))
  }, [])

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setState(prev => {
      const newOrder = [...prev.tabOrder]
      const [movedId] = newOrder.splice(fromIndex, 1)
      newOrder.splice(toIndex, 0, movedId)

      return {
        ...prev,
        tabOrder: newOrder,
      }
    })
  }, [])

  const reopenLastClosed = useCallback(() => {
    setState(prev => {
      if (prev.recentlyClosed.length === 0) {
        notify.info('No recently closed tabs')
        return prev
      }

      const [lastClosed, ...restClosed] = prev.recentlyClosed

      // Check if already open
      const existingTab = prev.tabs.find(t => t.path === lastClosed.path)
      if (existingTab) {
        return {
          ...prev,
          activeTabId: existingTab.id,
          recentlyClosed: restClosed,
        }
      }

      // Check if at limit
      if (prev.tabs.length >= MAX_TABS) {
        const evictionCandidate = findEvictionCandidate(prev.tabs)
        if (!evictionCandidate) {
          notify.error('Close a tab to reopen')
          return prev
        }

        // Evict and reopen
        const filteredTabs = prev.tabs.filter(t => t.id !== evictionCandidate.id)
        const filteredOrder = prev.tabOrder.filter(id => id !== evictionCandidate.id)

        const newTab: OpenTab = {
          id: lastClosed.path,
          path: lastClosed.path,
          title: lastClosed.title,
          content: undefined,
          metadata: undefined,
          isDirty: false,
          isPinned: false,
          isPreview: false,
          scrollPosition: lastClosed.scrollPosition,
          cursorPosition: undefined,
          openedAt: Date.now(),
          lastActiveAt: Date.now(),
        }

        return {
          ...prev,
          tabs: [...filteredTabs, newTab],
          activeTabId: newTab.id,
          tabOrder: [...filteredOrder, newTab.id],
          recentlyClosed: restClosed,
        }
      }

      // Create new tab
      const newTab: OpenTab = {
        id: lastClosed.path,
        path: lastClosed.path,
        title: lastClosed.title,
        content: undefined,
        metadata: undefined,
        isDirty: false,
        isPinned: false,
        isPreview: false,
        scrollPosition: lastClosed.scrollPosition,
        cursorPosition: undefined,
        openedAt: Date.now(),
        lastActiveAt: Date.now(),
      }

      return {
        ...prev,
        tabs: [...prev.tabs, newTab],
        activeTabId: newTab.id,
        tabOrder: [...prev.tabOrder, newTab.id],
        recentlyClosed: restClosed,
      }
    })

    // Fetch content for reopened tab
    if (fetchContent) {
      setState(prev => {
        const activeTab = prev.tabs.find(t => t.id === prev.activeTabId)
        if (activeTab && !activeTab.content) {
          fetchContent(activeTab.path).then(({ content, metadata }) => {
            setState(s => ({
              ...s,
              tabs: s.tabs.map(t =>
                t.id === activeTab.id ? { ...t, content, metadata } : t
              ),
            }))
          }).catch(console.error)
        }
        return prev
      })
    }
  }, [findEvictionCandidate, fetchContent])

  const isTabOpen = useCallback((path: string): boolean => {
    return state.tabs.some(t => t.path === path)
  }, [state.tabs])

  const getTabByPath = useCallback((path: string): OpenTab | undefined => {
    return state.tabs.find(t => t.path === path)
  }, [state.tabs])

  const toggleTabsVisible = useCallback(() => {
    setState(prev => ({ ...prev, tabsVisible: !prev.tabsVisible }))
  }, [])

  const setTabsVisible = useCallback((visible: boolean) => {
    setState(prev => ({ ...prev, tabsVisible: visible }))
  }, [])

  /* ═══════════════════════════════════════════════════════════════════════
     CONTEXT VALUE
  ═══════════════════════════════════════════════════════════════════════ */

  const value = useMemo<OpenTabsContextValue>(() => ({
    ...state,
    openTab,
    closeTab,
    closeOtherTabs,
    closeTabsToRight,
    closeAllTabs,
    setActiveTab,
    nextTab,
    prevTab,
    jumpToTab,
    togglePin,
    setDirty,
    updateTabContent,
    updateScrollPosition,
    updateCursorPosition,
    reorderTabs,
    reopenLastClosed,
    isTabOpen,
    getTabByPath,
    toggleTabsVisible,
    setTabsVisible,
  }), [
    state,
    openTab,
    closeTab,
    closeOtherTabs,
    closeTabsToRight,
    closeAllTabs,
    setActiveTab,
    nextTab,
    prevTab,
    jumpToTab,
    togglePin,
    setDirty,
    updateTabContent,
    updateScrollPosition,
    updateCursorPosition,
    reorderTabs,
    reopenLastClosed,
    isTabOpen,
    getTabByPath,
    toggleTabsVisible,
    setTabsVisible,
  ])

  return (
    <OpenTabsContext.Provider value={value}>
      {children}
    </OpenTabsContext.Provider>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOKS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook to access open tabs context
 * 
 * @throws Error if used outside OpenTabsProvider
 */
export function useOpenTabs(): OpenTabsContextValue {
  const context = useContext(OpenTabsContext)

  if (!context) {
    throw new Error('useOpenTabs must be used within an OpenTabsProvider')
  }

  return context
}

/**
 * Safe hook that returns null if not in provider
 */
export function useOpenTabsSafe(): OpenTabsContextValue | null {
  return useContext(OpenTabsContext)
}

/**
 * Hook to get the active tab
 */
export function useActiveTab(): OpenTab | null {
  const context = useContext(OpenTabsContext)
  if (!context) return null

  return context.tabs.find(t => t.id === context.activeTabId) || null
}

export default OpenTabsContext

