/**
 * Format Card Component
 * @module components/quarry/ui/FormatCard
 *
 * Reusable card component for displaying import/export formats.
 */

'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export interface FormatCardProps {
  /** Format name */
  name: string
  /** Format description */
  description: string
  /** Format icon */
  icon: LucideIcon
  /** Whether the format is selected */
  selected?: boolean
  /** Whether the format is disabled */
  disabled?: boolean
  /** Click handler */
  onClick?: () => void
  /** Badge text (e.g., "Beta", "Premium") */
  badge?: string
  /** Color variant */
  color?: 'blue' | 'amber' | 'green' | 'purple' | 'pink' | 'cyan'
}

// ============================================================================
// COLOR CLASSES
// ============================================================================

const colorClasses = {
  blue: {
    selected: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    hover: 'hover:border-blue-300 dark:hover:border-blue-700',
    icon: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  },
  amber: {
    selected: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20',
    hover: 'hover:border-amber-300 dark:hover:border-amber-700',
    icon: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  },
  green: {
    selected: 'border-green-500 bg-green-50 dark:bg-green-900/20',
    hover: 'hover:border-green-300 dark:hover:border-green-700',
    icon: 'text-green-600 dark:text-green-400',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  },
  purple: {
    selected: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
    hover: 'hover:border-purple-300 dark:hover:border-purple-700',
    icon: 'text-purple-600 dark:text-purple-400',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  },
  pink: {
    selected: 'border-pink-500 bg-pink-50 dark:bg-pink-900/20',
    hover: 'hover:border-pink-300 dark:hover:border-pink-700',
    icon: 'text-pink-600 dark:text-pink-400',
    badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
  },
  cyan: {
    selected: 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20',
    hover: 'hover:border-cyan-300 dark:hover:border-cyan-700',
    icon: 'text-cyan-600 dark:text-cyan-400',
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
  },
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FormatCard({
  name,
  description,
  icon: Icon,
  selected = false,
  disabled = false,
  onClick,
  badge,
  color = 'blue',
}: FormatCardProps) {
  const colors = colorClasses[color]

  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`
        relative w-full p-4 rounded-lg border-2 transition-all text-left
        ${
          selected
            ? colors.selected
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : `cursor-pointer ${colors.hover}`}
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      `}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      aria-pressed={selected}
      aria-disabled={disabled}
    >
      {/* Selection indicator */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
        >
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}

      {/* Badge */}
      {badge && (
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium ${colors.badge}`}>
          {badge}
        </div>
      )}

      {/* Content */}
      <div className={`flex items-start gap-3 ${badge ? 'mt-4' : ''}`}>
        <div className={`flex-shrink-0 ${colors.icon}`}>
          <Icon className="w-8 h-8" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white text-base mb-1">{name}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        </div>
      </div>
    </motion.button>
  )
}

// ============================================================================
// FORMAT CARD GRID
// ============================================================================

export interface FormatCardGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3
}

export function FormatCardGrid({ children, columns = 2 }: FormatCardGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  }

  return <div className={`grid ${gridCols[columns]} gap-4`}>{children}</div>
}
