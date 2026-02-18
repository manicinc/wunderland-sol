/**
 * React hook for Quarry Codex database operations
 * 
 * Provides easy access to:
 * - Reading progress tracking
 * - Bookmarks
 * - Search history
 * - Drafts
 * 
 * @module codex/hooks/useCodexDatabase
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  saveReadingProgress,
  getReadingProgress,
  getRecentlyRead,
  addBookmark,
  removeBookmark,
  isBookmarked,
  getAllBookmarks,
  recordSearch,
  recordSearchClick,
  getRecentSearches,
  getPopularSearches,
  saveDraft,
  getDraft,
  getAllDrafts,
  deleteDraft,
  getDatabaseStats,
  type ReadingProgressRecord,
  type BookmarkRecord,
  type SearchHistoryRecord,
  type DraftRecord,
  type DatabaseStats,
} from '@/lib/codexDatabase'

// ============================================================================
// READING PROGRESS HOOK
// ============================================================================

export interface UseReadingProgressOptions {
  path: string
  enabled?: boolean
  /** How often to save progress (ms) */
  saveInterval?: number
}

export function useReadingProgress({
  path,
  enabled = true,
  saveInterval = 5000,
}: UseReadingProgressOptions) {
  const [progress, setProgress] = useState<ReadingProgressRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const startTimeRef = useRef<number>(Date.now())
  const lastSaveRef = useRef<number>(0)

  // Load initial progress
  useEffect(() => {
    if (!enabled || !path) return

    getReadingProgress(path).then((p) => {
      setProgress(p)
      setLoading(false)
    })

    // Reset start time when path changes
    startTimeRef.current = Date.now()
  }, [path, enabled])

  // Save progress function
  const save = useCallback(
    async (scrollPosition: number, readPercentage: number, completed: boolean = false) => {
      if (!enabled || !path) return

      const now = Date.now()
      // Throttle saves
      if (now - lastSaveRef.current < saveInterval) return
      lastSaveRef.current = now

      const sessionTime = Math.round((now - startTimeRef.current) / 1000)

      const newProgress: ReadingProgressRecord = {
        path,
        scrollPosition,
        readPercentage: Math.min(100, Math.max(0, readPercentage)),
        lastReadAt: new Date().toISOString(),
        totalReadTime: sessionTime,
        completed,
      }

      await saveReadingProgress(newProgress)
      setProgress(newProgress)
    },
    [path, enabled, saveInterval]
  )

  // Mark as completed
  const markCompleted = useCallback(async () => {
    if (!enabled || !path) return
    await save(progress?.scrollPosition || 0, 100, true)
  }, [enabled, path, progress, save])

  return {
    progress,
    loading,
    save,
    markCompleted,
  }
}

// ============================================================================
// BOOKMARKS HOOK
// ============================================================================

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Load bookmarks
  useEffect(() => {
    getAllBookmarks().then((b) => {
      setBookmarks(b)
      setLoading(false)
    })
  }, [])

  const add = useCallback(
    async (bookmark: Omit<BookmarkRecord, 'id' | 'createdAt'>) => {
      const id = await addBookmark(bookmark)
      if (id) {
        const updated = await getAllBookmarks()
        setBookmarks(updated)
        return id
      }
      return null
    },
    []
  )

  const remove = useCallback(async (path: string) => {
    const success = await removeBookmark(path)
    if (success) {
      setBookmarks((prev) => prev.filter((b) => b.path !== path))
    }
    return success
  }, [])

  const toggle = useCallback(
    async (bookmark: Omit<BookmarkRecord, 'id' | 'createdAt'>) => {
      const bookmarked = await isBookmarked(bookmark.path)
      if (bookmarked) {
        return remove(bookmark.path)
      } else {
        return add(bookmark)
      }
    },
    [add, remove]
  )

  const checkBookmarked = useCallback(async (path: string) => {
    return isBookmarked(path)
  }, [])

  return {
    bookmarks,
    loading,
    add,
    remove,
    toggle,
    isBookmarked: checkBookmarked,
  }
}

// ============================================================================
// SINGLE BOOKMARK HOOK (for a specific path)
// ============================================================================

export function useBookmark(path: string) {
  const [bookmarked, setBookmarked] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!path) return
    isBookmarked(path).then((b) => {
      setBookmarked(b)
      setLoading(false)
    })
  }, [path])

  const toggle = useCallback(
    async (title: string, excerpt?: string, tags?: string[]) => {
      if (bookmarked) {
        const success = await removeBookmark(path)
        if (success) setBookmarked(false)
        return !success
      } else {
        const id = await addBookmark({ path, title, excerpt, tags })
        if (id) setBookmarked(true)
        return !!id
      }
    },
    [path, bookmarked]
  )

  return {
    bookmarked,
    loading,
    toggle,
  }
}

// ============================================================================
// SEARCH HISTORY HOOK
// ============================================================================

export function useSearchHistory() {
  const [recentSearches, setRecentSearches] = useState<SearchHistoryRecord[]>([])
  const [popularSearches, setPopularSearches] = useState<Array<{ query: string; count: number }>>([])
  const [loading, setLoading] = useState(true)
  const lastSearchIdRef = useRef<string | null>(null)

  // Load search history
  useEffect(() => {
    Promise.all([getRecentSearches(10), getPopularSearches(5)]).then(([recent, popular]) => {
      setRecentSearches(recent)
      setPopularSearches(popular)
      setLoading(false)
    })
  }, [])

  const record = useCallback(async (query: string, resultCount: number) => {
    const id = await recordSearch(query, resultCount)
    lastSearchIdRef.current = id

    // Refresh recent searches
    const recent = await getRecentSearches(10)
    setRecentSearches(recent)

    return id
  }, [])

  const recordClick = useCallback(async (clickedPath: string) => {
    if (lastSearchIdRef.current) {
      await recordSearchClick(lastSearchIdRef.current, clickedPath)
    }
  }, [])

  return {
    recentSearches,
    popularSearches,
    loading,
    record,
    recordClick,
  }
}

// ============================================================================
// DRAFTS HOOK
// ============================================================================

export function useDrafts() {
  const [drafts, setDrafts] = useState<DraftRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Load drafts
  useEffect(() => {
    getAllDrafts().then((d) => {
      setDrafts(d)
      setLoading(false)
    })
  }, [])

  const save = useCallback(
    async (draft: Omit<DraftRecord, 'createdAt' | 'updatedAt'>) => {
      const success = await saveDraft(draft)
      if (success) {
        const updated = await getAllDrafts()
        setDrafts(updated)
      }
      return success
    },
    []
  )

  const load = useCallback(async (id: string) => {
    return getDraft(id)
  }, [])

  const remove = useCallback(async (id: string) => {
    const success = await deleteDraft(id)
    if (success) {
      setDrafts((prev) => prev.filter((d) => d.id !== id))
    }
    return success
  }, [])

  return {
    drafts,
    loading,
    save,
    load,
    remove,
  }
}

// ============================================================================
// DATABASE STATS HOOK
// ============================================================================

export function useDatabaseStats() {
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const s = await getDatabaseStats()
    setStats(s)
    setLoading(false)
    return s
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    stats,
    loading,
    refresh,
  }
}

// ============================================================================
// RECENTLY READ HOOK
// ============================================================================

export function useRecentlyRead(limit: number = 10) {
  const [items, setItems] = useState<ReadingProgressRecord[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const recent = await getRecentlyRead(limit)
    setItems(recent)
    setLoading(false)
  }, [limit])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    items,
    loading,
    refresh,
  }
}




