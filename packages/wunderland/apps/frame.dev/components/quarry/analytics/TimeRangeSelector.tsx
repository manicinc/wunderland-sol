/**
 * Time Range Selector Component
 * @module components/quarry/analytics/TimeRangeSelector
 *
 * Toggle buttons for selecting analytics time range.
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { type TimeRange, TIME_RANGE_CONFIG } from '@/lib/analytics/types'

// ============================================================================
// TYPES
// ============================================================================

interface TimeRangeSelectorProps {
  value: TimeRange
  onChange: (range: TimeRange) => void
  isDark?: boolean
  className?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TimeRangeSelector({
  value,
  onChange,
  isDark = false,
  className = '',
}: TimeRangeSelectorProps) {
  const options: TimeRange[] = ['week', 'month', 'quarter', 'year', 'all']

  return (
    <div
      className={`
        inline-flex rounded-lg p-1
        ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
        ${className}
      `}
    >
      {options.map((option) => {
        const isSelected = value === option
        const config = TIME_RANGE_CONFIG[option]

        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`
              relative px-3 py-1.5 text-sm font-medium rounded-md
              transition-colors duration-150
              ${
                isSelected
                  ? isDark
                    ? 'text-white'
                    : 'text-zinc-900'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-700'
              }
            `}
          >
            {isSelected && (
              <motion.div
                layoutId="time-range-bg"
                className={`
                  absolute inset-0 rounded-md
                  ${isDark ? 'bg-zinc-700' : 'bg-white shadow-sm'}
                `}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{config.label.replace('This ', '')}</span>
          </button>
        )
      })}
    </div>
  )
}

export default TimeRangeSelector
