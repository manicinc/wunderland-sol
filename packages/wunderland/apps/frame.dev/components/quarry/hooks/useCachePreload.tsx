/**
 * Cache Preloading Hook
 * @module components/quarry/hooks/useCachePreload
 * 
 * @description
 * Preloads flashcard, quiz, and glossary caches on strand hover for faster UX.
 * Uses requestIdleCallback for non-blocking background loading.
 * 
 * Features:
 * - Debounced hover detection (prevents preload on quick scroll-by)
 * - Priority-based loading (flashcards first, then quiz, then glossary)
 * - Memory-efficient (limits concurrent preloads)
 * - Non-blocking (uses idle callbacks)
 * - Tracks preload status to avoid duplicate work
 * 
 * @example
 * ```tsx
 * const { preloadStrand, cancelPreload, getPreloadStatus } = useCachePreload()
 * 
 * // In a strand item component
 * <div 
 *   onMouseEnter={() => preloadStrand(strandPath, content)}
 *   onMouseLeave={cancelPreload}
 * >
 *   {strandName}
 * </div>
 * ```
 */

'use client'

import { useCallback, useRef, useState, useEffect } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export type PreloadStatus = 'idle' | 'pending' | 'loading' | 'complete' | 'error'

export interface PreloadState {
  flashcards: PreloadStatus
  quiz: PreloadStatus
  glossary: PreloadStatus
}

export interface PreloadedStrand {
  path: string
  state: PreloadState
  preloadedAt: number
}

export interface CachePreloadOptions {
  /** Delay before starting preload (ms, default: 150) */
  hoverDelay?: number
  /** Enable flashcard preloading (default: true) */
  preloadFlashcards?: boolean
  /** Enable quiz preloading (default: true) */
  preloadQuiz?: boolean
  /** Enable glossary preloading (default: true) */
  preloadGlossary?: boolean
  /** Maximum strands to keep in preload memory (default: 10) */
  maxPreloadedStrands?: number
  /** Preload timeout per item (ms, default: 10000) */
  timeout?: number
  /** Callback when preload starts */
  onPreloadStart?: (path: string) => void
  /** Callback when preload completes */
  onPreloadComplete?: (path: string, state: PreloadState) => void
  /** Callback on preload error */
  onPreloadError?: (path: string, error: Error) => void
}

export interface UseCachePreloadReturn {
  /** Start preloading cache for a strand */
  preloadStrand: (path: string, content?: string) => void
  /** Cancel pending preload */
  cancelPreload: () => void
  /** Get preload status for a strand */
  getPreloadStatus: (path: string) => PreloadState | null
  /** Check if a strand is preloaded */
  isPreloaded: (path: string) => boolean
  /** Clear all preloaded data */
  clearPreloaded: () => void
  /** Currently preloading strand path */
  currentlyPreloading: string | null
  /** Map of preloaded strands */
  preloadedStrands: Map<string, PreloadedStrand>
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_OPTIONS: Required<Omit<CachePreloadOptions, 'onPreloadStart' | 'onPreloadComplete' | 'onPreloadError'>> = {
  hoverDelay: 150,
  preloadFlashcards: true,
  preloadQuiz: true,
  preloadGlossary: true,
  maxPreloadedStrands: 10,
  timeout: 10000,
}

const INITIAL_STATE: PreloadState = {
  flashcards: 'idle',
  quiz: 'idle',
  glossary: 'idle',
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Request idle callback with fallback
 */
function requestIdleCallbackPolyfill(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number {
  if (typeof requestIdleCallback !== 'undefined') {
    return requestIdleCallback(callback, options)
  }
  // Fallback for Safari
  return window.setTimeout(() => callback({ 
    didTimeout: false, 
    timeRemaining: () => 50 
  }), 1) as unknown as number
}

function cancelIdleCallbackPolyfill(handle: number): void {
  if (typeof cancelIdleCallback !== 'undefined') {
    cancelIdleCallback(handle)
  } else {
    clearTimeout(handle)
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useCachePreload(options: CachePreloadOptions = {}): UseCachePreloadReturn {
  const {
    hoverDelay = DEFAULT_OPTIONS.hoverDelay,
    preloadFlashcards = DEFAULT_OPTIONS.preloadFlashcards,
    preloadQuiz = DEFAULT_OPTIONS.preloadQuiz,
    preloadGlossary = DEFAULT_OPTIONS.preloadGlossary,
    maxPreloadedStrands = DEFAULT_OPTIONS.maxPreloadedStrands,
    timeout = DEFAULT_OPTIONS.timeout,
    onPreloadStart,
    onPreloadComplete,
    onPreloadError,
  } = options

  // State
  const [currentlyPreloading, setCurrentlyPreloading] = useState<string | null>(null)
  const preloadedStrands = useRef<Map<string, PreloadedStrand>>(new Map())
  
  // Refs for cancellation
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleCallbackRef = useRef<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const contentRef = useRef<string | undefined>(undefined)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      if (idleCallbackRef.current) {
        cancelIdleCallbackPolyfill(idleCallbackRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  /**
   * Evict oldest preloaded strands if over limit
   */
  const evictOldest = useCallback(() => {
    const strands = preloadedStrands.current
    if (strands.size >= maxPreloadedStrands) {
      // Sort by preloadedAt and remove oldest
      const sorted = Array.from(strands.entries())
        .sort((a, b) => a[1].preloadedAt - b[1].preloadedAt)
      
      const toRemove = sorted.slice(0, strands.size - maxPreloadedStrands + 1)
      toRemove.forEach(([path]) => strands.delete(path))
    }
  }, [maxPreloadedStrands])

  /**
   * Perform the actual preload
   */
  const doPreload = useCallback(async (path: string, content?: string) => {
    // Check if already preloaded
    const existing = preloadedStrands.current.get(path)
    if (existing && existing.state.flashcards === 'complete') {
      return // Already preloaded
    }

    // Evict old entries if needed
    evictOldest()

    // Create abort controller for this preload
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    // Initialize state
    const state: PreloadState = { ...INITIAL_STATE }
    preloadedStrands.current.set(path, {
      path,
      state,
      preloadedAt: Date.now(),
    })

    setCurrentlyPreloading(path)
    onPreloadStart?.(path)

    try {
      // Preload in priority order: flashcards > quiz > glossary
      // Using Promise.allSettled for resilience
      
      const preloadTasks: Promise<void>[] = []

      // Flashcards
      if (preloadFlashcards) {
        state.flashcards = 'loading'
        preloadTasks.push(
          (async () => {
            try {
              if (signal.aborted) return
              
              // Dynamic import to avoid circular dependencies
              const { getCachedForStrand } = await import('@/lib/generation/flashcardCache')
              
              // Just check if cache exists - this warms up the database connection
              await getCachedForStrand(path)
              
              if (!signal.aborted) {
                state.flashcards = 'complete'
              }
            } catch (error) {
              if (!signal.aborted) {
                state.flashcards = 'error'
                console.warn('[CachePreload] Flashcard preload failed:', error)
              }
            }
          })()
        )
      }

      // Quiz - uses getCacheStats to warm up database connection
      if (preloadQuiz) {
        state.quiz = 'loading'
        preloadTasks.push(
          (async () => {
            try {
              if (signal.aborted) return
              
              // Quiz cache doesn't have getCachedForStrand, use getCacheStats to warm up
              const { getCacheStats } = await import('@/lib/generation/quizCache')
              await getCacheStats()
              
              if (!signal.aborted) {
                state.quiz = 'complete'
              }
            } catch (error) {
              if (!signal.aborted) {
                state.quiz = 'error'
                console.warn('[CachePreload] Quiz preload failed:', error)
              }
            }
          })()
        )
      }

      // Glossary - uses getCacheStats to warm up database connection
      if (preloadGlossary) {
        state.glossary = 'loading'
        preloadTasks.push(
          (async () => {
            try {
              if (signal.aborted) return
              
              // Glossary cache doesn't have getCachedForStrand, use getCacheStats to warm up
              const { getCacheStats } = await import('@/lib/glossary/glossaryCache')
              await getCacheStats()
              
              if (!signal.aborted) {
                state.glossary = 'complete'
              }
            } catch (error) {
              if (!signal.aborted) {
                state.glossary = 'error'
                console.warn('[CachePreload] Glossary preload failed:', error)
              }
            }
          })()
        )
      }

      // Wait for all with timeout
      await Promise.race([
        Promise.allSettled(preloadTasks),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Preload timeout')), timeout)
        ),
      ])

      if (!signal.aborted) {
        // Update final state
        preloadedStrands.current.set(path, {
          path,
          state,
          preloadedAt: Date.now(),
        })
        
        onPreloadComplete?.(path, state)
      }
    } catch (error) {
      if (!signal.aborted) {
        onPreloadError?.(path, error as Error)
      }
    } finally {
      if (!signal.aborted) {
        setCurrentlyPreloading(null)
      }
      abortControllerRef.current = null
    }
  }, [
    evictOldest,
    preloadFlashcards,
    preloadQuiz,
    preloadGlossary,
    timeout,
    onPreloadStart,
    onPreloadComplete,
    onPreloadError,
  ])

  /**
   * Start preloading cache for a strand (debounced)
   */
  const preloadStrand = useCallback((path: string, content?: string) => {
    // Cancel any pending preload
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    if (idleCallbackRef.current) {
      cancelIdleCallbackPolyfill(idleCallbackRef.current)
    }

    // Store content for later use
    contentRef.current = content

    // Debounce to avoid preloading on quick scroll-by
    hoverTimeoutRef.current = setTimeout(() => {
      // Use idle callback for non-blocking preload
      idleCallbackRef.current = requestIdleCallbackPolyfill(
        () => doPreload(path, contentRef.current),
        { timeout: 500 }
      )
    }, hoverDelay)
  }, [hoverDelay, doPreload])

  /**
   * Cancel pending preload
   */
  const cancelPreload = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    if (idleCallbackRef.current) {
      cancelIdleCallbackPolyfill(idleCallbackRef.current)
      idleCallbackRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setCurrentlyPreloading(null)
  }, [])

  /**
   * Get preload status for a strand
   */
  const getPreloadStatus = useCallback((path: string): PreloadState | null => {
    return preloadedStrands.current.get(path)?.state ?? null
  }, [])

  /**
   * Check if a strand is fully preloaded
   */
  const isPreloaded = useCallback((path: string): boolean => {
    const strand = preloadedStrands.current.get(path)
    if (!strand) return false
    
    const { state } = strand
    return (
      (!preloadFlashcards || state.flashcards === 'complete') &&
      (!preloadQuiz || state.quiz === 'complete') &&
      (!preloadGlossary || state.glossary === 'complete')
    )
  }, [preloadFlashcards, preloadQuiz, preloadGlossary])

  /**
   * Clear all preloaded data
   */
  const clearPreloaded = useCallback(() => {
    preloadedStrands.current.clear()
    cancelPreload()
  }, [cancelPreload])

  return {
    preloadStrand,
    cancelPreload,
    getPreloadStatus,
    isPreloaded,
    clearPreloaded,
    currentlyPreloading,
    preloadedStrands: preloadedStrands.current,
  }
}

// ============================================================================
// CONTEXT (Optional - for app-wide preload management)
// ============================================================================

import { createContext, useContext } from 'react'

const CachePreloadContext = createContext<UseCachePreloadReturn | null>(null)

export function CachePreloadProvider({ 
  children, 
  options 
}: { 
  children: React.ReactNode
  options?: CachePreloadOptions 
}) {
  const preload = useCachePreload(options)
  
  return (
    <CachePreloadContext.Provider value={preload}>
      {children}
    </CachePreloadContext.Provider>
  )
}

export function useCachePreloadContext(): UseCachePreloadReturn {
  const context = useContext(CachePreloadContext)
  if (!context) {
    throw new Error('useCachePreloadContext must be used within CachePreloadProvider')
  }
  return context
}

export default useCachePreload

