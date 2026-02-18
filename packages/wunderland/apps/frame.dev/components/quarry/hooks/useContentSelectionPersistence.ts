/**
 * Content Selection Persistence Hook
 * @module quarry/hooks/useContentSelectionPersistence
 *
 * Persists and restores user's content selection for Learning Studio.
 * Remembers last used selection for quick re-use.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GenerationType } from '@/lib/generation/contentSelectionCache'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface StoredSelection {
  /** Array of selected strand IDs */
  strandIds: string[]
  /** Generation type this selection was used for */
  generationType: GenerationType
  /** When this selection was last used */
  timestamp: string
  /** Optional display names for strands (for showing in UI) */
  strandTitles?: Record<string, string>
}

export interface SelectionHistory {
  /** Most recent selections (max 5) */
  recent: StoredSelection[]
  /** Favorite/pinned selections */
  favorites: StoredSelection[]
}

export interface UseContentSelectionPersistenceReturn {
  /** Last used selection */
  lastSelection: StoredSelection | null
  /** Whether there is a stored selection */
  hasLastSelection: boolean
  /** Recent selection history */
  recentSelections: StoredSelection[]
  /** Save a selection to history */
  saveSelection: (selection: Omit<StoredSelection, 'timestamp'>) => void
  /** Clear the last selection */
  clearSelection: () => void
  /** Clear all history */
  clearHistory: () => void
  /** Get last selection for a specific generation type */
  getLastForType: (type: GenerationType) => StoredSelection | null
  /** Check if a selection matches the last used */
  matchesLastSelection: (strandIds: string[]) => boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'quarry-content-selection'
const HISTORY_KEY = 'quarry-selection-history'
const MAX_RECENT = 5
const MAX_AGE_DAYS = 30

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function isExpired(timestamp: string): boolean {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays > MAX_AGE_DAYS
}

function selectionsMatch(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((id, i) => id === sortedB[i])
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════════ */

export function useContentSelectionPersistence(): UseContentSelectionPersistenceReturn {
  const [lastSelection, setLastSelection] = useState<StoredSelection | null>(null)
  const [recentSelections, setRecentSelections] = useState<StoredSelection[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      // Load last selection
      const storedLast = localStorage.getItem(STORAGE_KEY)
      if (storedLast) {
        const parsed = JSON.parse(storedLast) as StoredSelection
        if (!isExpired(parsed.timestamp)) {
          setLastSelection(parsed)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      }

      // Load history
      const storedHistory = localStorage.getItem(HISTORY_KEY)
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory) as StoredSelection[]
        // Filter expired entries
        const valid = parsed.filter(s => !isExpired(s.timestamp))
        setRecentSelections(valid)
        if (valid.length !== parsed.length) {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(valid))
        }
      }
    } catch (e) {
      console.warn('[ContentSelectionPersistence] Failed to load from storage:', e)
    }
  }, [])

  // Save selection to history
  const saveSelection = useCallback((selection: Omit<StoredSelection, 'timestamp'>) => {
    const withTimestamp: StoredSelection = {
      ...selection,
      timestamp: new Date().toISOString(),
    }

    // Update last selection
    setLastSelection(withTimestamp)

    // Update history (dedup by strand IDs)
    setRecentSelections(prev => {
      const filtered = prev.filter(s => !selectionsMatch(s.strandIds, selection.strandIds))
      const updated = [withTimestamp, ...filtered].slice(0, MAX_RECENT)

      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(withTimestamp))
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
      } catch (e) {
        console.warn('[ContentSelectionPersistence] Failed to save to storage:', e)
      }

      return updated
    })
  }, [])

  // Clear last selection
  const clearSelection = useCallback(() => {
    setLastSelection(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      // Ignore
    }
  }, [])

  // Clear all history
  const clearHistory = useCallback(() => {
    setLastSelection(null)
    setRecentSelections([])
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(HISTORY_KEY)
    } catch (e) {
      // Ignore
    }
  }, [])

  // Get last selection for a specific generation type
  const getLastForType = useCallback((type: GenerationType): StoredSelection | null => {
    // First check if last selection matches type
    if (lastSelection?.generationType === type) {
      return lastSelection
    }

    // Otherwise, find most recent for this type in history
    return recentSelections.find(s => s.generationType === type) || null
  }, [lastSelection, recentSelections])

  // Check if a selection matches the last used
  const matchesLastSelection = useCallback((strandIds: string[]): boolean => {
    if (!lastSelection) return false
    return selectionsMatch(lastSelection.strandIds, strandIds)
  }, [lastSelection])

  return {
    lastSelection,
    hasLastSelection: lastSelection !== null && lastSelection.strandIds.length > 0,
    recentSelections,
    saveSelection,
    clearSelection,
    clearHistory,
    getLastForType,
    matchesLastSelection,
  }
}

export default useContentSelectionPersistence
