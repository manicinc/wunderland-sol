/**
 * Hook for managing bookmarks and reading history
 * @module codex/hooks/useBookmarks
 * 
 * @remarks
 * - Stores bookmarks in localStorage (client-side only)
 * - Keyboard shortcut 'b' to toggle bookmark
 * - Reading history tracked automatically
 * - No server sync, purely local
 * 
 * @example
 * ```tsx
 * const { bookmarks, isBookmarked, toggleBookmark, history } = useBookmarks()
 * 
 * <button onClick={() => toggleBookmark(file.path, file.name)}>
 *   {isBookmarked(file.path) ? 'Remove' : 'Add'} Bookmark
 * </button>
 * ```
 */

import { useState, useEffect, useCallback } from 'react'
import type { Bookmark, HistoryEntry } from '../lib/localStorage'
import {
  getBookmarks,
  addBookmark,
  removeBookmark,
  isBookmarked as checkBookmarked,
  getHistory,
  addToHistory,
  removeFromHistory,
  clearBookmarks,
  clearHistory,
} from '../lib/localStorage'

interface UseBookmarksResult {
  /** All bookmarks, most recent first */
  bookmarks: Bookmark[]
  /** Reading history, most recent first */
  history: HistoryEntry[]
  /** Check if a path is bookmarked */
  isBookmarked: (path: string) => boolean
  /** Toggle bookmark for a path */
  toggleBookmark: (path: string, title: string, notes?: string) => void
  /** Add a bookmark */
  addBookmark: (path: string, title: string, notes?: string) => void
  /** Remove a bookmark */
  removeBookmark: (path: string) => void
  /** Record a file view */
  recordView: (path: string, title: string) => void
  /** Remove from history */
  removeFromHistory: (path: string) => void
  /** Clear all bookmarks */
  clearAllBookmarks: () => void
  /** Clear all history */
  clearAllHistory: () => void
}

/**
 * Manage bookmarks and reading history
 * 
 * @remarks
 * Automatically loads from localStorage on mount and provides
 * methods to add/remove bookmarks and track reading history.
 * All data is stored client-side only.
 * 
 * @example
 * ```tsx
 * function CodexViewer() {
 *   const { isBookmarked, toggleBookmark, history } = useBookmarks()
 *   
 *   return (
 *     <>
 *       <button onClick={() => toggleBookmark(currentPath, currentTitle)}>
 *         {isBookmarked(currentPath) ? '★' : '☆'}
 *       </button>
 *       <HistoryList items={history} />
 *     </>
 *   )
 * }
 * ```
 */
export function useBookmarks(): UseBookmarksResult {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    setBookmarks(getBookmarks())
    setHistory(getHistory())
  }, [])

  const refresh = useCallback(() => {
    setBookmarks(getBookmarks())
    setHistory(getHistory())
  }, [])

  const isBookmarked = useCallback((path: string) => {
    return checkBookmarked(path)
  }, [])

  const toggleBookmark = useCallback((path: string, title: string, notes?: string) => {
    if (checkBookmarked(path)) {
      removeBookmark(path)
    } else {
      addBookmark(path, title, notes)
    }
    refresh()
  }, [refresh])

  const handleAddBookmark = useCallback((path: string, title: string, notes?: string) => {
    addBookmark(path, title, notes)
    refresh()
  }, [refresh])

  const handleRemoveBookmark = useCallback((path: string) => {
    removeBookmark(path)
    refresh()
  }, [refresh])

  const recordView = useCallback((path: string, title: string) => {
    addToHistory(path, title)
    refresh()
  }, [refresh])

  const handleRemoveFromHistory = useCallback((path: string) => {
    removeFromHistory(path)
    refresh()
  }, [refresh])

  const clearAllBookmarks = useCallback(() => {
    clearBookmarks()
    refresh()
  }, [refresh])

  const clearAllHistory = useCallback(() => {
    clearHistory()
    refresh()
  }, [refresh])

  return {
    bookmarks,
    history,
    isBookmarked,
    toggleBookmark,
    addBookmark: handleAddBookmark,
    removeBookmark: handleRemoveBookmark,
    recordView,
    removeFromHistory: handleRemoveFromHistory,
    clearAllBookmarks,
    clearAllHistory,
  }
}

