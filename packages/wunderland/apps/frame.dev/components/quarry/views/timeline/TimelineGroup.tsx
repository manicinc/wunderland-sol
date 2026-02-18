/**
 * Timeline Group Component
 *
 * Collapsible group of strands by time period.
 * @module components/quarry/views/timeline/TimelineGroup
 */

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
  CalendarDays,
  History,
} from 'lucide-react'
import { TimelineItem } from './TimelineItem'
import type { TimelineGroup as TimelineGroupType, StrandWithPath, TimelinePeriod } from '../types'

interface TimelineGroupProps {
  /** Group data */
  group: TimelineGroupType
  /** Toggle collapsed state */
  onToggle: () => void
  /** Navigate to strand */
  onNavigate: (path: string) => void
  /** Edit strand */
  onEdit?: (strand: StrandWithPath) => void
  /** Current theme */
  theme?: string
  /** Group index for animation */
  index?: number
}

const PERIOD_ICONS: Record<TimelinePeriod, React.ComponentType<{ className?: string }>> = {
  today: Clock,
  yesterday: Calendar,
  'this-week': CalendarDays,
  'this-month': CalendarDays,
  older: History,
}

export function TimelineGroup({
  group,
  onToggle,
  onNavigate,
  onEdit,
  theme = 'light',
  index = 0,
}: TimelineGroupProps) {
  const isDark = theme.includes('dark')

  const Icon = PERIOD_ICONS[group.period] || Calendar

  const headerClasses = `
    flex items-center justify-between px-3 py-2 cursor-pointer rounded-lg
    ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}
    transition-colors
  `

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
    >
      {/* Header */}
      <div className={headerClasses} onClick={onToggle}>
        <div className="flex items-center gap-2">
          {group.isCollapsed ? (
            <ChevronRight className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
          ) : (
            <ChevronDown className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
          )}

          <Icon className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />

          <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            {group.label}
          </h3>

          <span
            className={`
              px-1.5 py-0.5 text-xs rounded-full
              ${isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-600'}
            `}
          >
            {group.strands.length}
          </span>
        </div>
      </div>

      {/* Items */}
      <AnimatePresence>
        {!group.isCollapsed && (
          <motion.div
            className="ml-3 border-l-2 border-zinc-200 dark:border-zinc-700"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {group.strands.map((strand, idx) => (
              <TimelineItem
                key={strand.path}
                strand={strand}
                onNavigate={onNavigate}
                onEdit={onEdit}
                theme={theme}
                index={idx}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default TimelineGroup
