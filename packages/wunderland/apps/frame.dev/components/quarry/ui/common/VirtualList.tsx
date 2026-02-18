/**
 * Virtual List Component
 * Lightweight virtualization using Intersection Observer
 * Only renders items that are in or near the viewport
 *
 * @module codex/ui/VirtualList
 */

'use client'

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'

export interface VirtualListProps<T> {
  /** Items to render */
  items: T[]
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode
  /** Estimated height of each item in pixels */
  estimatedItemHeight?: number
  /** Number of items to render above/below viewport */
  overscan?: number
  /** Unique key extractor */
  getKey: (item: T, index: number) => string | number
  /** Container className */
  className?: string
  /** Gap between items in pixels */
  gap?: number
  /** Max height of container (enables scrolling) */
  maxHeight?: number | string
}

interface ItemState {
  isVisible: boolean
  height: number
}

/**
 * Lightweight virtual list using Intersection Observer
 * Renders placeholder divs for off-screen items to maintain scroll position
 */
export function VirtualList<T>({
  items,
  renderItem,
  estimatedItemHeight = 80,
  overscan = 3,
  getKey,
  className = '',
  gap = 8,
  maxHeight,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [itemStates, setItemStates] = useState<Map<string | number, ItemState>>(new Map())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const itemRefs = useRef<Map<string | number, HTMLDivElement>>(new Map())

  // Track which items are in viewport
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    setItemStates(prev => {
      const next = new Map(prev)
      for (const entry of entries) {
        const key = entry.target.getAttribute('data-key')
        if (key) {
          const current = next.get(key) || { isVisible: false, height: estimatedItemHeight }
          next.set(key, {
            ...current,
            isVisible: entry.isIntersecting,
            // Update height when visible
            height: entry.isIntersecting
              ? entry.boundingClientRect.height || current.height
              : current.height,
          })
        }
      }
      return next
    })
  }, [estimatedItemHeight])

  // Setup intersection observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: containerRef.current,
      rootMargin: `${overscan * estimatedItemHeight}px 0px`,
      threshold: 0,
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [handleIntersection, overscan, estimatedItemHeight])

  // Observe/unobserve items
  const observeItem = useCallback((key: string | number, element: HTMLDivElement | null) => {
    const observer = observerRef.current
    if (!observer) return

    const prevElement = itemRefs.current.get(key)
    if (prevElement && prevElement !== element) {
      observer.unobserve(prevElement)
    }

    if (element) {
      itemRefs.current.set(key, element)
      observer.observe(element)
    } else {
      itemRefs.current.delete(key)
    }
  }, [])

  // Determine which items should be rendered
  const renderInfo = useMemo(() => {
    return items.map((item, index) => {
      const key = getKey(item, index)
      const state = itemStates.get(key)
      const isVisible = state?.isVisible ?? false
      const height = state?.height ?? estimatedItemHeight

      // Always render if visible or if we haven't determined visibility yet
      const shouldRender = isVisible || !itemStates.has(key)

      return { item, index, key, shouldRender, height }
    })
  }, [items, itemStates, getKey, estimatedItemHeight])

  // If less than 20 items, don't virtualize
  if (items.length < 20) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          maxHeight,
          overflowY: maxHeight ? 'auto' : undefined,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap }}>
          {items.map((item, index) => (
            <div key={getKey(item, index)}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        maxHeight,
        overflowY: maxHeight ? 'auto' : undefined,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap }}>
        {renderInfo.map(({ item, index, key, shouldRender, height }) => (
          <div
            key={key}
            data-key={key}
            ref={(el) => observeItem(key, el)}
            style={{
              minHeight: shouldRender ? undefined : height,
            }}
          >
            {shouldRender ? renderItem(item, index) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

export default VirtualList
