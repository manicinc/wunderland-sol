/**
 * Filter Badge Component
 * @module codex/ui/FilterBadge
 *
 * @remarks
 * A subtle badge that shows the count of active advanced filters.
 * Displayed near the filter toggle buttons in the sidebar header.
 */

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter, EyeOff } from 'lucide-react'

interface FilterBadgeProps {
  /** Number of active filters */
  count: number
  /** Whether any items are hidden by filters */
  hasHiddenItems?: boolean
  /** Click handler to open advanced filters panel */
  onClick?: () => void
  /** Optional class name */
  className?: string
}

/**
 * Filter Badge - Shows active filter count
 *
 * @example
 * ```tsx
 * <FilterBadge
 *   count={activeFilterCount}
 *   hasHiddenItems={positionTracking.hasHiddenItems}
 *   onClick={toggleAdvancedFiltersPanel}
 * />
 * ```
 */
export default function FilterBadge({
  count,
  hasHiddenItems = false,
  onClick,
  className = '',
}: FilterBadgeProps) {
  if (count === 0 && !hasHiddenItems) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.15 }}
        onClick={onClick}
        className={`
          relative inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg
          min-w-[44px] min-h-[44px] touch-manipulation
          bg-amber-100 dark:bg-amber-900/30
          border border-amber-300 dark:border-amber-700
          text-amber-700 dark:text-amber-300
          hover:bg-amber-200 dark:hover:bg-amber-900/50
          focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2
          active:scale-95 transition-all duration-150
          ${className}
        `}
        title={`${count} active filter${count !== 1 ? 's' : ''}${hasHiddenItems ? ', some items hidden' : ''}`}
        aria-label={`${count} active filters. Click to manage filters.`}
      >
        <Filter className="w-4 h-4" />
        <span className="text-xs font-bold">{count}</span>

        {/* Hidden items indicator */}
        {hasHiddenItems && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ml-0.5"
            title="Some items are hidden by filters"
          >
            <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </motion.span>
        )}

        {/* Subtle pulse animation when filters active */}
        <motion.span
          className="absolute inset-0 rounded bg-amber-400/20 dark:bg-amber-500/10"
          animate={{
            opacity: [0, 0.5, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.button>
    </AnimatePresence>
  )
}
