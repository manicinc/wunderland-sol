/**
 * ContentViewToggle - Toggle between Tree and Bucket Views
 * @module components/quarry/ui/browse/ContentViewToggle
 *
 * Toggle component for switching between tree hierarchy view
 * and bucket card view when inside a weave or loom.
 * Persists preference to localStorage.
 */

'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FolderTree, LayoutGrid } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export type ContentViewMode = 'tree' | 'buckets'

export interface ContentViewToggleProps {
  /** Current view mode */
  value: ContentViewMode
  /** Change handler */
  onChange: (mode: ContentViewMode) => void
  /** Whether inside a weave/loom (enables toggle) */
  insideContainer?: boolean
  /** Container type for labeling */
  containerType?: 'weave' | 'loom'
  /** Whether dark mode is enabled */
  isDark?: boolean
  /** Compact mode (icons only) */
  compact?: boolean
  /** Custom class name */
  className?: string
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = 'quarry-content-view-mode'

export function getStoredContentViewMode(): ContentViewMode {
  if (typeof window === 'undefined') return 'tree'

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'tree' || stored === 'buckets') {
      return stored
    }
  } catch (err) {
    console.error('[ContentViewToggle] Failed to read preference:', err)
  }

  return 'tree' // Default to tree view
}

export function setStoredContentViewMode(mode: ContentViewMode): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch (err) {
    console.error('[ContentViewToggle] Failed to save preference:', err)
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useContentViewMode(): [ContentViewMode, (mode: ContentViewMode) => void] {
  const [viewMode, setViewModeState] = useState<ContentViewMode>('tree')

  // Load from storage on mount
  useEffect(() => {
    setViewModeState(getStoredContentViewMode())
  }, [])

  const setViewMode = useCallback((mode: ContentViewMode) => {
    setViewModeState(mode)
    setStoredContentViewMode(mode)
  }, [])

  return [viewMode, setViewMode]
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ContentViewToggle({
  value,
  onChange,
  insideContainer = false,
  containerType = 'weave',
  isDark = false,
  compact = false,
  className = '',
}: ContentViewToggleProps) {
  // Only show toggle when inside a weave or loom
  if (!insideContainer) {
    return null
  }

  const bucketLabel = containerType === 'weave' ? 'Looms' : 'Strands'

  return (
    <div
      className={`
        inline-flex items-center gap-0.5 p-0.5 rounded-lg
        ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
        ${className}
      `}
    >
      <button
        onClick={() => onChange('tree')}
        title="Tree View"
        className={`
          relative flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium
          transition-colors duration-200
          ${value === 'tree'
            ? isDark
              ? 'text-white'
              : 'text-zinc-900'
            : isDark
              ? 'text-zinc-500 hover:text-zinc-300'
              : 'text-zinc-500 hover:text-zinc-700'
          }
        `}
      >
        {value === 'tree' && (
          <motion.div
            layoutId="contentViewIndicator"
            className={`
              absolute inset-0 rounded-md
              ${isDark ? 'bg-zinc-700' : 'bg-white shadow-sm'}
            `}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
          />
        )}
        <FolderTree className="w-3.5 h-3.5 relative z-10" />
        {!compact && <span className="relative z-10">Tree</span>}
      </button>

      <button
        onClick={() => onChange('buckets')}
        title={`${bucketLabel} View`}
        className={`
          relative flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium
          transition-colors duration-200
          ${value === 'buckets'
            ? isDark
              ? 'text-white'
              : 'text-zinc-900'
            : isDark
              ? 'text-zinc-500 hover:text-zinc-300'
              : 'text-zinc-500 hover:text-zinc-700'
          }
        `}
      >
        {value === 'buckets' && (
          <motion.div
            layoutId="contentViewIndicator"
            className={`
              absolute inset-0 rounded-md
              ${isDark ? 'bg-zinc-700' : 'bg-white shadow-sm'}
            `}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
          />
        )}
        <LayoutGrid className="w-3.5 h-3.5 relative z-10" />
        {!compact && <span className="relative z-10">{bucketLabel}</span>}
      </button>
    </div>
  )
}

// Named export
export { ContentViewToggle }
