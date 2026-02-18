/**
 * View Mode Toggle Component
 * @module components/quarry/ui/ViewModeToggle
 *
 * Toggle between continuous scroll and paginated document view modes.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileText, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'

// ============================================================================
// TYPES
// ============================================================================

export type ViewMode = 'scroll' | 'paginated'

export interface ViewModeToggleProps {
  /** Current view mode */
  mode?: ViewMode
  /** Callback when mode changes */
  onChange?: (mode: ViewMode) => void
  /** Custom className */
  className?: string
  /** Show labels */
  showLabels?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

// ============================================================================
// LOCAL STORAGE KEY
// ============================================================================

const VIEW_MODE_STORAGE_KEY = 'codex-view-mode'

// ============================================================================
// COMPONENT
// ============================================================================

export function ViewModeToggle({
  mode: controlledMode,
  onChange,
  className = '',
  showLabels = true,
  size = 'md',
}: ViewModeToggleProps) {
  // Internal state (used when not controlled)
  const [internalMode, setInternalMode] = useState<ViewMode>('scroll')

  // Use controlled mode if provided, otherwise use internal
  const mode = controlledMode ?? internalMode
  const isControlled = controlledMode !== undefined

  // Load from localStorage on mount
  useEffect(() => {
    if (!isControlled) {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY) as ViewMode | null
      if (saved === 'scroll' || saved === 'paginated') {
        setInternalMode(saved)
      }
    }
  }, [isControlled])

  // Handle mode change
  const handleToggle = useCallback(() => {
    const newMode: ViewMode = mode === 'scroll' ? 'paginated' : 'scroll'

    if (!isControlled) {
      setInternalMode(newMode)
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, newMode)
    }

    onChange?.(newMode)
  }, [mode, isControlled, onChange])

  // Size classes
  const sizeClasses = {
    sm: 'h-8 px-2 text-xs gap-1',
    md: 'h-10 px-3 text-sm gap-2',
    lg: 'h-12 px-4 text-base gap-3',
  }

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  }

  return (
    <motion.button
      onClick={handleToggle}
      className={`
        inline-flex items-center justify-center
        rounded-lg border transition-all
        ${sizeClasses[size]}
        ${
          mode === 'paginated'
            ? 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${className}
      `}
      whileTap={{ scale: 0.95 }}
      title={mode === 'scroll' ? 'Switch to paginated view' : 'Switch to continuous scroll'}
      aria-label={mode === 'scroll' ? 'Switch to paginated view' : 'Switch to continuous scroll'}
      aria-pressed={mode === 'paginated'}
    >
      {mode === 'scroll' ? (
        <>
          <BookOpen size={iconSizes[size]} />
          {showLabels && <span>Paginated</span>}
        </>
      ) : (
        <>
          <FileText size={iconSizes[size]} />
          {showLabels && <span>Continuous</span>}
        </>
      )}
    </motion.button>
  )
}

// ============================================================================
// HOOK FOR VIEW MODE
// ============================================================================

/**
 * Hook to manage view mode state with localStorage persistence
 */
export function useViewMode(initialMode: ViewMode = 'scroll'): [ViewMode, (mode: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(initialMode)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY) as ViewMode | null
    if (saved === 'scroll' || saved === 'paginated') {
      setMode(saved)
    }
  }, [])

  // Save to localStorage when changed
  const updateMode = useCallback((newMode: ViewMode) => {
    setMode(newMode)
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, newMode)
  }, [])

  return [mode, updateMode]
}

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Get current view mode from localStorage
 */
export function getViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'scroll'
  const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY) as ViewMode | null
  return saved === 'paginated' ? 'paginated' : 'scroll'
}

/**
 * Set view mode in localStorage
 */
export function setViewMode(mode: ViewMode): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
}
