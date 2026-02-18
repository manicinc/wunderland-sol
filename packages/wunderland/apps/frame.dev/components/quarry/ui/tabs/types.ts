/**
 * Tab System Types
 * @module components/quarry/ui/tabs/types
 * 
 * Type definitions for the multi-strand tab system.
 * Provides VS Code-like tab management for viewing multiple strands simultaneously.
 */

import type { StrandMetadata } from '@/lib/content/types'

/**
 * Represents a single open tab in the tab bar
 */
export interface OpenTab {
  /** Unique tab ID (typically the strand path) */
  id: string
  /** Strand file path */
  path: string
  /** Display title for the tab */
  title: string
  /** Cached content (lazy-loaded when tab becomes active) */
  content?: string
  /** Parsed frontmatter metadata */
  metadata?: StrandMetadata
  /** Whether the tab has unsaved changes */
  isDirty: boolean
  /** Whether the tab is pinned (prevents accidental close) */
  isPinned: boolean
  /** Whether this is a temporary preview tab */
  isPreview: boolean
  /** Scroll position to restore when switching back */
  scrollPosition?: number
  /** Cursor position for editor mode */
  cursorPosition?: number
  /** Timestamp when the tab was opened (for LRU eviction) */
  openedAt: number
  /** Timestamp of last activity (for LRU eviction) */
  lastActiveAt: number
}

/**
 * Complete state for the tab system
 */
export interface OpenTabsState {
  /** All open tabs (max 10) */
  tabs: OpenTab[]
  /** ID of the currently visible/active tab */
  activeTabId: string | null
  /** Custom tab order (for drag-drop reordering) */
  tabOrder: string[]
  /** Recently closed tabs for Ctrl+Shift+T reopening */
  recentlyClosed: ClosedTabInfo[]
  /** Whether the tab bar is visible */
  tabsVisible: boolean
}

/**
 * Minimal info stored for recently closed tabs
 */
export interface ClosedTabInfo {
  /** Path of the closed tab */
  path: string
  /** Title of the closed tab */
  title: string
  /** When it was closed */
  closedAt: number
  /** Scroll position at close time */
  scrollPosition?: number
}

/**
 * Actions available on the tab context
 */
export interface OpenTabsActions {
  /** Open a new tab or switch to existing */
  openTab: (path: string, title?: string, options?: OpenTabOptions) => void
  /** Close a specific tab */
  closeTab: (tabId: string) => void
  /** Close all tabs except the specified one */
  closeOtherTabs: (tabId: string) => void
  /** Close all tabs to the right of the specified one */
  closeTabsToRight: (tabId: string) => void
  /** Close all tabs */
  closeAllTabs: () => void
  /** Set the active tab */
  setActiveTab: (tabId: string) => void
  /** Navigate to next tab */
  nextTab: () => void
  /** Navigate to previous tab */
  prevTab: () => void
  /** Jump to tab by index (1-9) */
  jumpToTab: (index: number) => void
  /** Toggle pin state of a tab */
  togglePin: (tabId: string) => void
  /** Mark a tab as dirty (has unsaved changes) */
  setDirty: (tabId: string, isDirty: boolean) => void
  /** Update tab content */
  updateTabContent: (tabId: string, content: string, metadata?: StrandMetadata) => void
  /** Update scroll position for a tab */
  updateScrollPosition: (tabId: string, position: number) => void
  /** Update cursor position for a tab */
  updateCursorPosition: (tabId: string, position: number) => void
  /** Reorder tabs (drag-drop) */
  reorderTabs: (fromIndex: number, toIndex: number) => void
  /** Reopen the last closed tab */
  reopenLastClosed: () => void
  /** Check if a path is open as a tab */
  isTabOpen: (path: string) => boolean
  /** Get tab by path */
  getTabByPath: (path: string) => OpenTab | undefined
  /** Toggle tab bar visibility */
  toggleTabsVisible: () => void
  /** Set tab bar visibility */
  setTabsVisible: (visible: boolean) => void
}

/**
 * Options when opening a new tab
 */
export interface OpenTabOptions {
  /** Content to pre-populate */
  content?: string
  /** Metadata to pre-populate */
  metadata?: StrandMetadata
  /** Open as preview (will be replaced by next open unless pinned/edited) */
  asPreview?: boolean
  /** Immediately pin the tab */
  pinned?: boolean
  /** Scroll position to restore */
  scrollPosition?: number
}

/**
 * Combined context value type
 */
export type OpenTabsContextValue = OpenTabsState & OpenTabsActions

/**
 * Data persisted to localStorage
 */
export interface PersistedTabsData {
  /** Version for future migrations */
  version: number
  /** Tab info without content */
  tabs: Array<{
    id: string
    path: string
    title: string
    isPinned: boolean
    scrollPosition?: number
    cursorPosition?: number
  }>
  /** Active tab ID */
  activeTabId: string | null
  /** Tab order */
  tabOrder: string[]
  /** Recently closed tabs */
  recentlyClosed: ClosedTabInfo[]
}

/**
 * Tab context menu item
 */
export interface TabContextMenuItem {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  shortcut?: string
  action: () => void
  disabled?: boolean
  danger?: boolean
  dividerAfter?: boolean
}

/**
 * Maximum number of open tabs
 */
export const MAX_TABS = 10

/**
 * Maximum number of recently closed tabs to remember
 */
export const MAX_RECENTLY_CLOSED = 10

/**
 * localStorage key for tab persistence
 */
export const TABS_STORAGE_KEY = 'quarry-open-tabs'

/**
 * Current persistence version
 */
export const TABS_STORAGE_VERSION = 1

/**
 * Debounce delay for saving tabs to localStorage (ms)
 */
export const SAVE_DEBOUNCE_MS = 500




