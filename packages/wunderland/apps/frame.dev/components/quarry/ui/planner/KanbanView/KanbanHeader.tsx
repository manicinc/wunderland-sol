/**
 * KanbanHeader
 *
 * Header component for Kanban board with stats and filters
 *
 * @module components/quarry/ui/planner/KanbanView/KanbanHeader
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Filter,
  Layers,
  ChevronDown,
  AlertTriangle,
  Circle,
  PlayCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { KanbanViewIcon } from '@/lib/planner/icons/PlannerIcons'
import type { KanbanStats, KanbanFilters, GroupBy } from './useKanbanBoard'

// ============================================================================
// TYPES
// ============================================================================

interface KanbanHeaderProps {
  stats: KanbanStats
  filters: KanbanFilters
  onFilterChange: (filters: KanbanFilters) => void
  groupBy: GroupBy
  onGroupByChange: (groupBy: GroupBy) => void
  onAddTask?: () => void
  theme?: 'light' | 'dark'
}

// ============================================================================
// COMPONENT
// ============================================================================

export function KanbanHeader({
  stats,
  filters,
  onFilterChange,
  groupBy,
  onGroupByChange,
  onAddTask,
  theme = 'dark',
}: KanbanHeaderProps) {
  const isDark = theme === 'dark'
  const [showFilterMenu, setShowFilterMenu] = useState(false)

  return (
    <header
      className={cn(
        'flex items-center justify-between px-4 py-3 border-b shrink-0',
        isDark ? 'border-zinc-800 bg-zinc-900/80' : 'border-zinc-200 bg-white/80',
        'backdrop-blur-sm'
      )}
    >
      {/* Left: Title + stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <KanbanViewIcon size={20} className="text-emerald-500" />
          <h2 className={cn('text-lg font-semibold', isDark ? 'text-zinc-100' : 'text-zinc-900')}>
            Kanban Board
          </h2>
        </div>

        {/* Mini stat pills */}
        <div className="hidden md:flex items-center gap-2">
          <StatPill
            icon={<Circle size={10} />}
            value={stats.byStatus.pending}
            label="pending"
            color="amber"
            isDark={isDark}
          />
          <StatPill
            icon={<PlayCircle size={10} />}
            value={stats.byStatus.in_progress}
            label="active"
            color="blue"
            isDark={isDark}
          />
          <StatPill
            icon={<CheckCircle2 size={10} />}
            value={stats.byStatus.completed}
            label="done"
            color="emerald"
            isDark={isDark}
          />
          {stats.overdue > 0 && (
            <StatPill
              icon={<AlertTriangle size={10} />}
              value={stats.overdue}
              label="overdue"
              color="red"
              isDark={isDark}
            />
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Toggle completed visibility */}
        <button
          onClick={() => onFilterChange({ ...filters, showCompleted: !filters.showCompleted })}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm',
            'transition-colors',
            filters.showCompleted
              ? isDark
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-emerald-100 text-emerald-600'
              : isDark
                ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          )}
          title={filters.showCompleted ? 'Hide completed' : 'Show completed'}
        >
          {filters.showCompleted ? <Eye size={14} /> : <EyeOff size={14} />}
          <span className="hidden sm:inline">
            {filters.showCompleted ? 'Completed' : 'Hidden'}
          </span>
        </button>

        {/* Group by dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm',
              'transition-colors',
              isDark
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <Layers size={14} />
            <span className="hidden sm:inline capitalize">{groupBy}</span>
            <ChevronDown size={12} className={cn('transition-transform', showFilterMenu && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {showFilterMenu && (
              <motion.div
                className={cn(
                  'absolute right-0 top-full mt-1 w-40 py-1 rounded-lg shadow-lg z-50',
                  isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-gray-200'
                )}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {(['status', 'priority', 'project'] as GroupBy[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      onGroupByChange(option)
                      setShowFilterMenu(false)
                    }}
                    className={cn(
                      'w-full px-3 py-2 text-sm text-left capitalize',
                      'transition-colors',
                      groupBy === option
                        ? isDark
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-emerald-50 text-emerald-600'
                        : isDark
                          ? 'text-zinc-300 hover:bg-zinc-700'
                          : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    {option}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Add task button */}
        {onAddTask && (
          <motion.button
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
              'bg-gradient-to-r from-emerald-500 to-emerald-600',
              'text-white text-sm font-medium',
              'shadow-lg shadow-emerald-500/20',
              'hover:shadow-emerald-500/30 transition-shadow'
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onAddTask}
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Task</span>
          </motion.button>
        )}
      </div>
    </header>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatPillProps {
  icon: React.ReactNode
  value: number
  label: string
  color: 'amber' | 'blue' | 'emerald' | 'red'
  isDark: boolean
}

function StatPill({ icon, value, label, color, isDark }: StatPillProps) {
  const colorClasses = {
    amber: isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600',
    blue: isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600',
    emerald: isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600',
    red: isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600',
  }

  return (
    <motion.span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        colorClasses[color]
      )}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      key={value}
    >
      {icon}
      <span className="tabular-nums">{value}</span>
      <span className="opacity-70">{label}</span>
    </motion.span>
  )
}
