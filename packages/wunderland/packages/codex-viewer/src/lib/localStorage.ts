/**
 * Type-safe localStorage utilities for Frame Codex (package build)
 * Mirrors apps/frame.dev/lib/localStorage.ts so embedded viewers behave the same.
 */

/**
 * Bookmark entry for a Codex file
 */
export interface Bookmark {
  path: string
  title: string
  addedAt: string
  notes?: string
}

/**
 * Reading history entry
 */
export interface HistoryEntry {
  path: string
  title: string
  viewedAt: string
  viewCount: number
}

/**
 * User preferences for Codex viewer
 */
export interface UserPreferences {
  /** Theme: light, dark, sepia-light, sepia-dark */
  theme: 'light' | 'dark' | 'sepia-light' | 'sepia-dark'
  /** Font size scale (0.8 - 1.5) */
  fontSize: number
  /** Tree density: compact, normal, comfortable */
  treeDensity: 'compact' | 'normal' | 'comfortable'
  /** Default sidebar mode */
  defaultSidebarMode: 'tree' | 'toc'
  /** Whether sidebar is open by default on mobile */
  sidebarOpenMobile: boolean
  /** Whether to track reading history locally */
  historyTrackingEnabled: boolean
}

const KEYS = {
  BOOKMARKS: 'frame-codex-bookmarks',
  HISTORY: 'frame-codex-history',
  PREFERENCES: 'frame-codex-preferences',
} as const

function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const test = '__frame_pkg_test__'
    window.localStorage.setItem(test, test)
    window.localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

function getItem<T>(key: string, defaultValue: T): T {
  if (!isLocalStorageAvailable()) return defaultValue
  try {
    const item = window.localStorage.getItem(key)
    return item ? (JSON.parse(item) as T) : defaultValue
  } catch {
    return defaultValue
  }
}

function setItem<T>(key: string, value: T): void {
  if (!isLocalStorageAvailable()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn('[Codex Viewer] localStorage unavailable:', error)
  }
}

function removeItem(key: string): void {
  if (!isLocalStorageAvailable()) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

// ----- Bookmarks -----

export function getBookmarks(): Bookmark[] {
  return getItem<Bookmark[]>(KEYS.BOOKMARKS, [])
}

export function addBookmark(path: string, title: string, notes?: string): void {
  const bookmarks = getBookmarks()
  const existing = bookmarks.findIndex((b) => b.path === path)
  if (existing >= 0) {
    bookmarks[existing] = {
      ...bookmarks[existing],
      title,
      notes,
      addedAt: new Date().toISOString(),
    }
  } else {
    bookmarks.unshift({
      path,
      title,
      addedAt: new Date().toISOString(),
      notes,
    })
  }
  setItem(KEYS.BOOKMARKS, bookmarks)
}

export function removeBookmark(path: string): void {
  const bookmarks = getBookmarks().filter((b) => b.path !== path)
  setItem(KEYS.BOOKMARKS, bookmarks)
}

export function isBookmarked(path: string): boolean {
  return getBookmarks().some((b) => b.path === path)
}

export function clearBookmarks(): void {
  removeItem(KEYS.BOOKMARKS)
}

// ----- History -----

export function getHistory(limit = 50): HistoryEntry[] {
  const history = getItem<HistoryEntry[]>(KEYS.HISTORY, [])
  return history.slice(0, limit)
}

export function addToHistory(path: string, title: string): void {
  const history = getHistory(100)
  const existing = history.findIndex((h) => h.path === path)

  if (existing >= 0) {
    const entry = history.splice(existing, 1)[0]
    entry.viewedAt = new Date().toISOString()
    entry.viewCount++
    history.unshift(entry)
  } else {
    history.unshift({
      path,
      title,
      viewedAt: new Date().toISOString(),
      viewCount: 1,
    })
  }

  setItem(KEYS.HISTORY, history.slice(0, 100))
}

export function removeFromHistory(path: string): void {
  const history = getHistory(100).filter((h) => h.path !== path)
  setItem(KEYS.HISTORY, history)
}

export function clearHistory(): void {
  removeItem(KEYS.HISTORY)
}

// ----- Preferences -----

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  fontSize: 1,
  treeDensity: 'normal',
  defaultSidebarMode: 'tree',
  sidebarOpenMobile: false,
  historyTrackingEnabled: true,
}

export function getPreferences(): UserPreferences {
  return getItem<UserPreferences>(KEYS.PREFERENCES, DEFAULT_PREFERENCES)
}

export function updatePreferences(updates: Partial<UserPreferences>): void {
  const current = getPreferences()
  setItem(KEYS.PREFERENCES, { ...current, ...updates })
}

export function resetPreferences(): void {
  setItem(KEYS.PREFERENCES, DEFAULT_PREFERENCES)
}

export function clearAllCodexData(): void {
  clearBookmarks()
  clearHistory()
  resetPreferences()
}

