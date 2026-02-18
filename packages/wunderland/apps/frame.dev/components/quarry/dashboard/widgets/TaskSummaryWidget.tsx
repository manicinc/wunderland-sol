/**
 * Task Summary Widget
 *
 * Shows task overview: overdue, due today, upcoming.
 * @module components/quarry/dashboard/widgets/TaskSummaryWidget
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  Clock,
  CalendarDays,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import { useTasks } from '@/lib/planner/hooks/useTasks'
import type { WidgetProps } from '../types'

export function TaskSummaryWidget({
  theme,
  size,
  onNavigate,
  compact = false,
}: WidgetProps) {
  const isDark = theme.includes('dark')
  const { tasks, stats } = useTasks({ includeCompleted: false })

  const items = [
    {
      label: 'Overdue',
      count: stats.overdue,
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: isDark ? 'bg-red-500/10' : 'bg-red-50',
    },
    {
      label: 'Due Today',
      count: stats.dueToday,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
    },
    {
      label: 'Upcoming',
      count: stats.pending - stats.overdue - stats.dueToday,
      icon: CalendarDays,
      color: isDark ? 'text-zinc-400' : 'text-zinc-500',
      bgColor: isDark ? 'bg-zinc-700' : 'bg-zinc-100',
    },
  ]

  if (compact) {
    return (
      <div className="flex items-center justify-between">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {item.label}
            </p>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const Icon = item.icon
        return (
          <motion.div
            key={item.label}
            className={`
              flex items-center justify-between p-3 rounded-lg
              ${item.bgColor}
            `}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center gap-3">
              <Icon className={`w-5 h-5 ${item.color}`} />
              <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                {item.label}
              </span>
            </div>
            <span className={`text-lg font-bold ${item.color}`}>
              {item.count}
            </span>
          </motion.div>
        )
      })}

      {/* Quick link to planner */}
      <button
        onClick={() => onNavigate('/quarry/plan')}
        className={`
          w-full flex items-center justify-center gap-2 py-2 rounded-lg
          text-sm font-medium transition-colors
          ${isDark
            ? 'text-rose-400 hover:bg-rose-500/10'
            : 'text-rose-600 hover:bg-rose-50'
          }
        `}
      >
        Open Planner
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

export default TaskSummaryWidget
