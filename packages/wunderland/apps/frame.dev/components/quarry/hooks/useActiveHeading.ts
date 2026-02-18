/**
 * Hook for tracking active heading based on scroll position
 * @module codex/hooks/useActiveHeading
 * 
 * @remarks
 * Uses scroll position tracking to determine which heading is currently "active".
 * All callbacks are stable (no dependencies) to prevent infinite re-render loops.
 */

import { useState, useCallback, useRef, useEffect } from 'react'

interface UseActiveHeadingOptions {
  /** Heading selectors to observe (default: 'h1, h2, h3, h4, h5, h6') */
  headingSelector?: string
  /** Callback when active heading changes */
  onActiveChange?: (slug: string | null) => void
  /** Content key - change this to re-calculate positions when content changes */
  contentKey?: string
  /** Offset from top to consider a heading "active" (default: 100px) */
  scrollOffset?: number
  /** Enable debug logging (default: false) */
  debug?: boolean
}

interface HeadingPosition {
  slug: string
  top: number
}

interface UseActiveHeadingResult {
  activeSlug: string | null
  setContentRef: (node: HTMLElement | null) => void
  setActiveSlug: (slug: string | null) => void
  allSlugs: string[]
  scrollProgress: number
  recalculatePositions: () => void
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function useActiveHeading(
  options: UseActiveHeadingOptions = {}
): UseActiveHeadingResult {
  const {
    headingSelector = 'h1, h2, h3, h4, h5, h6',
    onActiveChange,
    contentKey,
    scrollOffset = 100,
    debug = false,
  } = options

  const [activeSlug, setActiveSlugState] = useState<string | null>(null)
  const [allSlugs, setAllSlugs] = useState<string[]>([])
  const [scrollProgress, setScrollProgress] = useState(0)
  
  // Store ALL mutable values in refs
  const containerRef = useRef<HTMLElement | null>(null)
  const positionsRef = useRef<HeadingPosition[]>([])
  const lastActiveRef = useRef<string | null>(null)
  const rafRef = useRef<number | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const mutationObserverRef = useRef<MutationObserver | null>(null)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  
  // Store options in refs so callbacks don't need dependencies
  const optionsRef = useRef({ headingSelector, onActiveChange, scrollOffset, debug })
  optionsRef.current = { headingSelector, onActiveChange, scrollOffset, debug }

  // Calculate positions - reads from refs, no deps needed
  const calculatePositions = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    
    const { headingSelector: selector, debug: isDebug } = optionsRef.current
    const headings = container.querySelectorAll(selector)
    
    if (isDebug) console.debug('[useActiveHeading] found', headings.length, 'headings')
    
    const positions: HeadingPosition[] = []
    const slugs: string[] = []
    const slugCounts = new Map<string, number>()
    
    headings.forEach((heading) => {
      const el = heading as HTMLElement
      let slug = el.id
      
      if (!slug) {
        const text = el.textContent || ''
        slug = generateSlug(text)
        const count = slugCounts.get(slug) || 0
        if (count > 0) slug = `${slug}-${count}`
        slugCounts.set(generateSlug(text), count + 1)
        el.id = slug
      }
      
      if (slug) {
        const rect = el.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        positions.push({
          slug,
          top: rect.top - containerRect.top + container.scrollTop,
        })
        slugs.push(slug)
      }
    })
    
    positionsRef.current = positions
    setAllSlugs(slugs)
    
    if (positions.length > 0 && !lastActiveRef.current) {
      const first = positions[0].slug
      lastActiveRef.current = first
      setActiveSlugState(first)
      optionsRef.current.onActiveChange?.(first)
    }
  }, [])

  // Update active heading - reads from refs, no deps needed
  const updateActiveHeading = useCallback(() => {
    const container = containerRef.current
    const positions = positionsRef.current
    if (!container || positions.length === 0) return
    
    const { scrollOffset: offset, debug: isDebug } = optionsRef.current
    const scrollTop = container.scrollTop
    const scrollHeight = container.scrollHeight - container.clientHeight
    
    setScrollProgress(scrollHeight > 0 ? Math.min(1, scrollTop / scrollHeight) : 0)
    
    let active: HeadingPosition | null = null
    for (let i = positions.length - 1; i >= 0; i--) {
      if (positions[i].top <= scrollTop + offset) {
        active = positions[i]
        break
      }
    }
    
    if (!active && positions.length > 0) active = positions[0]
    
    if (active && active.slug !== lastActiveRef.current) {
      if (isDebug) console.debug('[useActiveHeading] active:', active.slug)
      lastActiveRef.current = active.slug
      setActiveSlugState(active.slug)
      optionsRef.current.onActiveChange?.(active.slug)
    }
  }, [])

  // Handle scroll - no deps
  const handleScroll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(updateActiveHeading)
  }, [updateActiveHeading])

  // Cleanup helper
  const cleanup = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.removeEventListener('scroll', handleScroll)
    }
    resizeObserverRef.current?.disconnect()
    mutationObserverRef.current?.disconnect()
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }, [handleScroll])

  // STABLE ref callback - uses refs for everything
  const setContentRef = useCallback((node: HTMLElement | null) => {
    // Same node - do nothing
    if (node === containerRef.current) return
    
    cleanup()
    containerRef.current = node
    lastActiveRef.current = null
    
    if (!node) return
    
    // Calculate positions with retries for async content
    const calc = () => {
      calculatePositions()
      updateActiveHeading()
    }
    
    calc()
    timeoutsRef.current.push(setTimeout(calc, 50))
    timeoutsRef.current.push(setTimeout(calc, 200))
    timeoutsRef.current.push(setTimeout(calc, 500))
    
    // Scroll listener
    node.addEventListener('scroll', handleScroll, { passive: true })
    
    // Resize observer
    resizeObserverRef.current = new ResizeObserver(calculatePositions)
    resizeObserverRef.current.observe(node)
    
    // Mutation observer for dynamic content
    mutationObserverRef.current = new MutationObserver((mutations) => {
      const hasChanges = mutations.some(m => 
        m.type === 'childList' && (
          Array.from(m.addedNodes).some(n => 
            n instanceof HTMLElement && (/^H[1-6]$/i.test(n.tagName) || n.querySelector('h1,h2,h3,h4,h5,h6'))
          ) ||
          Array.from(m.removedNodes).some(n => 
            n instanceof HTMLElement && /^H[1-6]$/i.test(n.tagName)
          )
        )
      )
      if (hasChanges) setTimeout(calculatePositions, 100)
    })
    mutationObserverRef.current.observe(node, { childList: true, subtree: true })
  }, [cleanup, calculatePositions, updateActiveHeading, handleScroll])

  // Recalculate on contentKey change
  useEffect(() => {
    if (contentKey && containerRef.current) {
      lastActiveRef.current = null
      const t = setTimeout(() => {
        calculatePositions()
        updateActiveHeading()
      }, 100)
      return () => clearTimeout(t)
    }
  }, [contentKey, calculatePositions, updateActiveHeading])

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup])

  const setActiveSlug = useCallback((slug: string | null) => {
    lastActiveRef.current = slug
    setActiveSlugState(slug)
    optionsRef.current.onActiveChange?.(slug)
  }, [])

  const recalculatePositions = useCallback(() => {
    calculatePositions()
    updateActiveHeading()
  }, [calculatePositions, updateActiveHeading])

  return {
    activeSlug,
    setContentRef,
    setActiveSlug,
    allSlugs,
    scrollProgress,
    recalculatePositions,
  }
}

export default useActiveHeading
