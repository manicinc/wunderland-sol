/**
 * Virtual Grid Hook
 * @module lib/hooks/useVirtualGrid
 *
 * Provides virtualization for grid-based layouts using @tanstack/react-virtual.
 * Only renders visible items plus overscan, drastically reducing DOM nodes.
 */

import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual'
import { useRef, useState, useEffect, useCallback } from 'react'

interface UseVirtualGridOptions<T> {
  /** Array of items to virtualize */
  items: T[]
  /** Number of columns in the grid */
  columns: number
  /** Height of each row in pixels */
  rowHeight: number
  /** Number of extra rows to render above/below viewport (default: 2) */
  overscan?: number
  /** Gap between items in pixels (default: 12) */
  gap?: number
}

interface VirtualGridResult<T> {
  /** Ref to attach to the scroll container */
  parentRef: React.RefObject<HTMLDivElement>
  /** Virtual rows to render */
  virtualRows: VirtualItem[]
  /** Total height of the virtualized content */
  totalHeight: number
  /** Get items for a specific virtual row */
  getRowItems: (virtualRowIndex: number) => T[]
}

/**
 * Hook for virtualizing grid layouts.
 *
 * @example
 * ```tsx
 * const { parentRef, virtualRows, totalHeight, getRowItems } = useVirtualGrid({
 *   items: cards,
 *   columns: 4,
 *   rowHeight: 220,
 * })
 *
 * return (
 *   <div ref={parentRef} style={{ height: 500, overflow: 'auto' }}>
 *     <div style={{ height: totalHeight, position: 'relative' }}>
 *       {virtualRows.map((virtualRow) => (
 *         <div key={virtualRow.key} style={{ position: 'absolute', top: virtualRow.start }}>
 *           {getRowItems(virtualRow.index).map(item => <Card key={item.id} />)}
 *         </div>
 *       ))}
 *     </div>
 *   </div>
 * )
 * ```
 */
export function useVirtualGrid<T>({
  items,
  columns,
  rowHeight,
  overscan = 2,
}: UseVirtualGridOptions<T>): VirtualGridResult<T> {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowCount = Math.ceil(items.length / columns)

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  })

  const virtualRows = virtualizer.getVirtualItems()

  const getRowItems = useCallback(
    (virtualRowIndex: number): T[] => {
      const startIndex = virtualRowIndex * columns
      return items.slice(startIndex, startIndex + columns)
    },
    [items, columns]
  )

  return {
    parentRef,
    virtualRows,
    totalHeight: virtualizer.getTotalSize(),
    getRowItems,
  }
}

/**
 * Hook for responsive column count based on breakpoints.
 *
 * @example
 * ```tsx
 * const columns = useBreakpointColumns({ sm: 2, md: 3, lg: 4 })
 * ```
 */
export function useBreakpointColumns(
  breakpoints: { sm?: number; md?: number; lg?: number; xl?: number } = {}
): number {
  const { sm = 2, md = 3, lg = 4, xl = 4 } = breakpoints
  const [columns, setColumns] = useState(sm)

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth
      if (width >= 1280) setColumns(xl)       // xl
      else if (width >= 1024) setColumns(lg)  // lg
      else if (width >= 768) setColumns(md)   // md
      else setColumns(sm)                      // sm
    }

    updateColumns()
    window.addEventListener('resize', updateColumns)
    return () => window.removeEventListener('resize', updateColumns)
  }, [sm, md, lg, xl])

  return columns
}

/**
 * Hook for virtualizing simple lists (not grids).
 */
export function useVirtualList<T>({
  items,
  estimateSize,
  overscan = 3,
}: {
  items: T[]
  estimateSize: number | ((index: number) => number)
  overscan?: number
}) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: typeof estimateSize === 'number'
      ? () => estimateSize
      : estimateSize,
    overscan,
  })

  const virtualItems = virtualizer.getVirtualItems()

  const getItem = useCallback(
    (virtualIndex: number): T => items[virtualIndex],
    [items]
  )

  return {
    parentRef,
    virtualItems,
    totalHeight: virtualizer.getTotalSize(),
    getItem,
  }
}
