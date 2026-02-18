/**
 * GalleryViewToggle - View Mode Toggle Component
 * @module components/quarry/ui/browse/GalleryViewToggle
 *
 * Toggle between gallery card view and tree hierarchy view.
 * Persists preference to localStorage.
 */

'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LayoutGrid, FolderTree } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export type ViewMode = 'gallery' | 'tree'

export interface GalleryViewToggleProps {
  /** Current view mode */
  value: ViewMode
  /** Change handler */
  onChange: (mode: ViewMode) => void
  /** Whether dark mode is enabled */
  isDark?: boolean
  /** Custom class name */
  className?: string
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = 'quarry-browse-view-mode'

export function getStoredViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'gallery'
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'tree' || stored === 'gallery') {
      return stored
    }
  } catch (err) {
    console.error('[GalleryViewToggle] Failed to read preference:', err)
  }
  
  return 'gallery' // Default to gallery view
}

export function setStoredViewMode(mode: ViewMode): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch (err) {
    console.error('[GalleryViewToggle] Failed to save preference:', err)
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewModeState] = useState<ViewMode>('gallery')

  // Load from storage on mount
  useEffect(() => {
    setViewModeState(getStoredViewMode())
  }, [])

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode)
    setStoredViewMode(mode)
  }, [])

  return [viewMode, setViewMode]
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function GalleryViewToggle({
  value,
  onChange,
  isDark = false,
  className = '',
}: GalleryViewToggleProps) {
  return (
    <div
      className={`
        inline-flex items-center gap-1 p-1 rounded-xl
        ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
        ${className}
      `}
    >
      <button
        onClick={() => onChange('gallery')}
        className={`
          relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
          transition-colors duration-200
          ${value === 'gallery'
            ? isDark
              ? 'text-white'
              : 'text-zinc-900'
            : isDark
              ? 'text-zinc-500 hover:text-zinc-300'
              : 'text-zinc-500 hover:text-zinc-700'
          }
        `}
      >
        {value === 'gallery' && (
          <motion.div
            layoutId="viewModeIndicator"
            className={`
              absolute inset-0 rounded-lg
              ${isDark ? 'bg-zinc-700' : 'bg-white shadow-sm'}
            `}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
          />
        )}
        <LayoutGrid className="w-4 h-4 relative z-10" />
        <span className="relative z-10 hidden sm:inline">Gallery</span>
      </button>

      <button
        onClick={() => onChange('tree')}
        className={`
          relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
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
            layoutId="viewModeIndicator"
            className={`
              absolute inset-0 rounded-lg
              ${isDark ? 'bg-zinc-700' : 'bg-white shadow-sm'}
            `}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
          />
        )}
        <FolderTree className="w-4 h-4 relative z-10" />
        <span className="relative z-10 hidden sm:inline">Tree</span>
      </button>
    </div>
  )
}

// Named export
export { GalleryViewToggle }

