/**
 * Reading Position Persistence Hook
 * @module hooks/useReadingPosition
 *
 * Saves and restores scroll position per document using localStorage.
 * Features:
 * - Debounced save to avoid excessive writes
 * - Smooth restore on document load
 * - Progress percentage tracking
 * - Time-based expiry for old positions
 */

'use client'

import { useEffect, useCallback, useRef, useState } from 'react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface ReadingPosition {
  /** Scroll position as fraction (0-1) */
  scrollFraction: number
  /** Last heading slug visible */
  lastHeadingSlug?: string
  /** Timestamp of last update */
  timestamp: number
  /** Reading progress percentage */
  progress: number
}

export interface UseReadingPositionOptions {
  /** Document identifier (path or unique ID) */
  documentId: string
  /** Content container ref */
  contentRef?: React.RefObject<HTMLElement>
  /** Whether to auto-restore position on mount */
  autoRestore?: boolean
  /** Debounce delay for saving (ms) */
  saveDelay?: number
  /** Position expiry time (ms) - default 7 days */
  expiryTime?: number
  /** Storage key prefix */
  storagePrefix?: string
  /** Callback when position is restored */
  onRestore?: (position: ReadingPosition) => void
}

export interface UseReadingPositionResult {
  /** Current reading progress (0-100) */
  progress: number
  /** Current scroll fraction (0-1) */
  scrollFraction: number
  /** Last saved position */
  savedPosition: ReadingPosition | null
  /** Manually save current position */
  savePosition: () => void
  /** Restore saved position */
  restorePosition: () => void
  /** Clear saved position */
  clearPosition: () => void
  /** Whether position has been restored */
  hasRestored: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

const STORAGE_PREFIX = 'frame-reading-pos:'
const DEFAULT_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days
const DEFAULT_SAVE_DELAY = 500 // 500ms debounce

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

function getStorageKey(prefix: string, documentId: string): string {
  // Create a stable key from the document ID
  const safeId = documentId.replace(/[^a-zA-Z0-9-_]/g, '_')
  return `${prefix}${safeId}`
}

function loadPosition(key: string, expiryTime: number): ReadingPosition | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return null
    
    const position: ReadingPosition = JSON.parse(stored)
    
    // Check expiry
    if (Date.now() - position.timestamp > expiryTime) {
      localStorage.removeItem(key)
      return null
    }
    
    return position
  } catch {
    return null
  }
}

function savePositionToStorage(key: string, position: ReadingPosition): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(key, JSON.stringify(position))
  } catch (e) {
    // Storage might be full, try to clear old positions
    console.warn('Failed to save reading position:', e)
    cleanupOldPositions()
  }
}

function cleanupOldPositions(): void {
  if (typeof window === 'undefined') return
  
  const keysToRemove: string[] = []
  const now = Date.now()
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_PREFIX)) {
      try {
        const stored = localStorage.getItem(key)
        if (stored) {
          const pos: ReadingPosition = JSON.parse(stored)
          // Remove if older than 30 days
          if (now - pos.timestamp > 30 * 24 * 60 * 60 * 1000) {
            keysToRemove.push(key)
          }
        }
      } catch {
        keysToRemove.push(key)
      }
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key))
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════════ */

export function useReadingPosition({
  documentId,
  contentRef,
  autoRestore = true,
  saveDelay = DEFAULT_SAVE_DELAY,
  expiryTime = DEFAULT_EXPIRY,
  storagePrefix = STORAGE_PREFIX,
  onRestore,
}: UseReadingPositionOptions): UseReadingPositionResult {
  const [progress, setProgress] = useState(0)
  const [scrollFraction, setScrollFraction] = useState(0)
  const [savedPosition, setSavedPosition] = useState<ReadingPosition | null>(null)
  const [hasRestored, setHasRestored] = useState(false)
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const storageKey = getStorageKey(storagePrefix, documentId)
  
  // Load saved position on mount
  useEffect(() => {
    const position = loadPosition(storageKey, expiryTime)
    setSavedPosition(position)
  }, [storageKey, expiryTime])
  
  // Calculate current scroll position
  const calculatePosition = useCallback((): ReadingPosition | null => {
    if (!contentRef?.current) return null
    
    const container = contentRef.current
    const { scrollTop, scrollHeight, clientHeight } = container
    const maxScroll = scrollHeight - clientHeight
    
    if (maxScroll <= 0) {
      return {
        scrollFraction: 0,
        progress: 100,
        timestamp: Date.now(),
      }
    }
    
    const fraction = scrollTop / maxScroll
    const prog = Math.min(100, Math.round(fraction * 100))
    
    // Find last visible heading
    let lastHeadingSlug: string | undefined
    const headings = container.querySelectorAll('[id]')
    headings.forEach(heading => {
      const rect = heading.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      if (rect.top <= containerRect.top + containerRect.height / 3) {
        lastHeadingSlug = heading.id
      }
    })
    
    return {
      scrollFraction: fraction,
      lastHeadingSlug,
      progress: prog,
      timestamp: Date.now(),
    }
  }, [contentRef])
  
  // Save position (debounced)
  const savePosition = useCallback(() => {
    const position = calculatePosition()
    if (!position) return
    
    savePositionToStorage(storageKey, position)
    setSavedPosition(position)
  }, [calculatePosition, storageKey])
  
  // Debounced save on scroll
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(savePosition, saveDelay)
  }, [savePosition, saveDelay])
  
  // Restore position
  const restorePosition = useCallback(() => {
    if (!contentRef?.current || !savedPosition) return
    
    const container = contentRef.current
    const { scrollHeight, clientHeight } = container
    const maxScroll = scrollHeight - clientHeight
    
    if (maxScroll <= 0) return
    
    const targetScroll = savedPosition.scrollFraction * maxScroll
    
    // Smooth scroll to saved position
    container.scrollTo({
      top: targetScroll,
      behavior: 'smooth',
    })
    
    setHasRestored(true)
    onRestore?.(savedPosition)
  }, [contentRef, savedPosition, onRestore])
  
  // Clear position
  const clearPosition = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey)
    }
    setSavedPosition(null)
  }, [storageKey])
  
  // Track scroll and update progress
  useEffect(() => {
    if (!contentRef?.current) return
    
    const container = contentRef.current
    
    const handleScroll = () => {
      const position = calculatePosition()
      if (position) {
        setProgress(position.progress)
        setScrollFraction(position.scrollFraction)
        debouncedSave()
      }
    }
    
    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial calculation
    
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [contentRef, calculatePosition, debouncedSave])
  
  // Auto-restore on mount (with delay for content to load)
  useEffect(() => {
    if (!autoRestore || !savedPosition || hasRestored) return
    
    // Wait for content to be ready
    const timeout = setTimeout(() => {
      if (contentRef?.current && savedPosition.scrollFraction > 0.01) {
        restorePosition()
      }
    }, 300)
    
    return () => clearTimeout(timeout)
  }, [autoRestore, savedPosition, hasRestored, contentRef, restorePosition])
  
  return {
    progress,
    scrollFraction,
    savedPosition,
    savePosition,
    restorePosition,
    clearPosition,
    hasRestored,
  }
}

export default useReadingPosition

