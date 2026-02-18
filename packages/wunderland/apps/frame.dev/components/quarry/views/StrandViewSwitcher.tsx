/**
 * Strand View Switcher
 *
 * Segmented control for switching between Table, Board, Gallery, and Timeline views.
 * @module components/quarry/views/StrandViewSwitcher
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Table2,
  LayoutGrid,
  GalleryHorizontalEnd,
  CalendarRange,
  List,
  Columns3,
  Image,
  Clock
} from 'lucide-react'
import type { StrandViewMode } from './types'

interface StrandViewSwitcherProps {
  /** Current view mode */
  view: StrandViewMode
  /** View change handler */
  onViewChange: (view: StrandViewMode) => void
  /** Current theme */
  theme?: string
  /** Compact mode (icons only) */
  compact?: boolean
  /** Disabled state */
  disabled?: boolean
}

const VIEW_CONFIG: Array<{
  id: StrandViewMode
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}> = [
  { id: 'table', label: 'Table', icon: Table2, description: 'Sortable spreadsheet view' },
  { id: 'board', label: 'Board', icon: Columns3, description: 'Kanban-style columns' },
  { id: 'gallery', label: 'Gallery', icon: Image, description: 'Visual card grid' },
  { id: 'timeline', label: 'Timeline', icon: Clock, description: 'Chronological view' },
]

export function StrandViewSwitcher({
  view,
  onViewChange,
  theme = 'light',
  compact = false,
  disabled = false,
}: StrandViewSwitcherProps) {
  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')

  const baseClasses = `
    relative flex items-center rounded-lg p-1
    ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
    ${isTerminal ? 'font-mono border border-green-500/30' : ''}
  `

  const buttonClasses = (isActive: boolean) => `
    relative flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md
    text-sm font-medium transition-colors
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${isActive
      ? isDark
        ? 'text-white'
        : 'text-zinc-900'
      : isDark
        ? 'text-zinc-400 hover:text-zinc-200'
        : 'text-zinc-600 hover:text-zinc-900'
    }
    ${isTerminal && isActive ? 'text-green-400' : ''}
  `

  return (
    <div className={baseClasses}>
      {VIEW_CONFIG.map((config) => {
        const isActive = view === config.id
        const Icon = config.icon

        return (
          <button
            key={config.id}
            onClick={() => !disabled && onViewChange(config.id)}
            className={buttonClasses(isActive)}
            title={config.description}
            disabled={disabled}
          >
            {isActive && (
              <motion.div
                layoutId="viewSwitcherIndicator"
                className={`
                  absolute inset-0 rounded-md
                  ${isDark ? 'bg-zinc-700' : 'bg-white'}
                  ${isTerminal ? 'bg-green-500/20 border border-green-500/50' : ''}
                  shadow-sm
                `}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Icon className="w-4 h-4" />
              {!compact && <span>{config.label}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Compact version for tight spaces
 */
export function StrandViewSwitcherCompact(props: Omit<StrandViewSwitcherProps, 'compact'>) {
  return <StrandViewSwitcher {...props} compact />
}

export default StrandViewSwitcher
