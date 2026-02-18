'use client'

/**
 * AccomplishmentsPanel Component
 *
 * Sidebar panel showing completed tasks, habits, and subtasks.
 * Features:
 * - Daily/Weekly/Monthly view toggle
 * - Grouped by project or flat list
 * - Streak display
 * - Sync to reflection button
 * - Export to markdown
 *
 * @module components/quarry/ui/AccomplishmentsPanel
 */

import { useState, useMemo, useCallback } from 'react'
import {
  CheckCircle2,
  Circle,
  Repeat,
  ChevronRight,
  ChevronDown,
  Flame,
  Calendar,
  CalendarRange,
  CalendarDays,
  Copy,
  RefreshCw,
  Loader2,
  ListChecks,
  Sparkles,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAccomplishments } from '@/lib/hooks/useAccomplishments'
import { useTaskCompletionStreak, useQuickStats } from '@/lib/hooks/useAccomplishmentStats'
import type { AccomplishmentItem, TimePeriod } from '@/lib/accomplishment'

// ============================================================================
// TYPES
// ============================================================================

interface AccomplishmentsPanelProps {
  date?: string
  period?: TimePeriod
  showStats?: boolean
  showStreak?: boolean
  compact?: boolean
  groupByProject?: boolean
  onSyncToReflection?: (markdown: string) => void
  isDark?: boolean
  className?: string
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Single accomplishment item display
 */
function AccomplishmentItemRow({
  item,
  compact = false,
  isDark = false,
}: {
  item: AccomplishmentItem
  compact?: boolean
  isDark?: boolean
}) {
  const getIcon = () => {
    switch (item.type) {
      case 'task':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case 'subtask':
        return <Circle className="w-3.5 h-3.5 text-emerald-400" />
      case 'habit':
        return <Repeat className="w-4 h-4 text-purple-500" />
    }
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2 py-2 px-2 rounded-md transition-colors touch-manipulation',
        'min-h-[44px]', // Mobile touch target
        isDark ? 'hover:bg-zinc-800/50 active:bg-zinc-800' : 'hover:bg-zinc-100 active:bg-zinc-200',
        compact && 'py-1.5 min-h-[36px]'
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm truncate',
            isDark ? 'text-zinc-200' : 'text-zinc-800',
            item.type === 'subtask' && 'text-zinc-500'
          )}
        >
          {item.title}
        </p>
        {item.type === 'subtask' && item.parentTaskTitle && !compact && (
          <p className="text-xs text-zinc-500 truncate">
            from {item.parentTaskTitle}
          </p>
        )}
        {item.type === 'habit' && item.habitStreak && item.habitStreak > 1 && (
          <span className="inline-flex items-center gap-0.5 text-xs text-amber-500">
            <Flame className="w-3 h-3" />
            {item.habitStreak}
          </span>
        )}
      </div>
      {item.completedTime && !compact && (
        <span className={cn('text-xs flex-shrink-0', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          {item.completedTime}
        </span>
      )}
    </div>
  )
}

/**
 * Project group with expandable items
 */
function ProjectGroup({
  project,
  items,
  isDark,
  compact,
  defaultExpanded = true,
}: {
  project: string
  items: AccomplishmentItem[]
  isDark: boolean
  compact: boolean
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex items-center gap-1 w-full px-2 py-2 text-sm font-medium rounded transition-colors touch-manipulation',
          'min-h-[44px]', // Mobile touch target
          isDark ? 'text-zinc-300 hover:bg-zinc-800 active:bg-zinc-700' : 'text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200'
        )}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span className="truncate">{project}</span>
        <span className={cn('ml-auto text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          {items.length}
        </span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden pl-4"
          >
            {items.map((item) => (
              <AccomplishmentItemRow
                key={item.id}
                item={item}
                compact={compact}
                isDark={isDark}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Quick stats bar
 */
function QuickStatsBar({ isDark }: { isDark: boolean }) {
  const { stats, loading } = useQuickStats()

  if (loading || !stats) {
    return (
      <div className={cn('flex items-center justify-center py-3', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-4 gap-1 px-2 py-2', isDark ? 'bg-zinc-800/50' : 'bg-zinc-50', 'rounded-lg')}>
      <div className="text-center">
        <div className={cn('text-lg font-bold', isDark ? 'text-zinc-100' : 'text-zinc-900')}>
          {stats.today}
        </div>
        <div className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-500')}>Today</div>
      </div>
      <div className="text-center">
        <div className={cn('text-lg font-bold', isDark ? 'text-zinc-100' : 'text-zinc-900')}>
          {stats.week}
        </div>
        <div className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-500')}>Week</div>
      </div>
      <div className="text-center">
        <div className={cn('text-lg font-bold', isDark ? 'text-zinc-100' : 'text-zinc-900')}>
          {stats.month}
        </div>
        <div className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-500')}>Month</div>
      </div>
      <div className="text-center">
        <div className={cn('text-lg font-bold text-amber-500 flex items-center justify-center gap-0.5')}>
          <Flame className="w-4 h-4" />
          {stats.streak}
        </div>
        <div className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-500')}>Streak</div>
      </div>
    </div>
  )
}

/**
 * Period toggle buttons
 */
function PeriodToggle({
  period,
  onChange,
  isDark,
}: {
  period: TimePeriod
  onChange: (p: TimePeriod) => void
  isDark: boolean
}) {
  const options: { value: TimePeriod; label: string; icon: typeof Calendar }[] = [
    { value: 'day', label: 'Day', icon: Calendar },
    { value: 'week', label: 'Week', icon: CalendarRange },
    { value: 'month', label: 'Month', icon: CalendarDays },
  ]

  return (
    <div className={cn('flex gap-1 p-1 rounded-lg', isDark ? 'bg-zinc-800' : 'bg-zinc-100')}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex items-center justify-center gap-1 px-3 py-2 text-xs rounded transition-colors touch-manipulation',
            'min-h-[36px] min-w-[60px]', // Mobile touch targets
            period === opt.value
              ? isDark
                ? 'bg-zinc-700 text-zinc-100'
                : 'bg-white text-zinc-900 shadow-sm'
              : isDark
              ? 'text-zinc-400 hover:text-zinc-200 active:bg-zinc-700'
              : 'text-zinc-600 hover:text-zinc-900 active:bg-zinc-200'
          )}
        >
          <opt.icon className="w-3.5 h-3.5" />
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AccomplishmentsPanel({
  date,
  period: initialPeriod = 'day',
  showStats = true,
  showStreak = true,
  compact = false,
  groupByProject = true,
  onSyncToReflection,
  isDark = false,
  className = '',
}: AccomplishmentsPanelProps) {
  const [period, setPeriod] = useState<TimePeriod>(initialPeriod)
  const [copying, setCopying] = useState(false)

  const { items, stats, loading, refresh, generateMarkdown } = useAccomplishments({
    date,
    period,
    autoRefresh: true,
  })

  const { streak } = useTaskCompletionStreak()

  // Group items by project
  const groupedItems = useMemo(() => {
    if (!groupByProject) return null

    const groups = new Map<string, AccomplishmentItem[]>()
    const ungrouped: AccomplishmentItem[] = []

    for (const item of items) {
      if (item.project) {
        const group = groups.get(item.project) || []
        group.push(item)
        groups.set(item.project, group)
      } else {
        ungrouped.push(item)
      }
    }

    return { groups, ungrouped }
  }, [items, groupByProject])

  // Copy markdown to clipboard
  const handleCopyMarkdown = useCallback(async () => {
    setCopying(true)
    try {
      const md = await generateMarkdown({ groupByProject })
      await navigator.clipboard.writeText(md)
      // Show brief success feedback
      setTimeout(() => setCopying(false), 1500)
    } catch {
      setCopying(false)
    }
  }, [generateMarkdown, groupByProject])

  // Sync to reflection
  const handleSyncToReflection = useCallback(async () => {
    if (!onSyncToReflection) return
    const md = await generateMarkdown({ groupByProject })
    onSyncToReflection(md)
  }, [generateMarkdown, groupByProject, onSyncToReflection])

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <ListChecks className={cn('w-5 h-5', isDark ? 'text-emerald-400' : 'text-emerald-600')} />
          <h3 className={cn('text-sm font-semibold', isDark ? 'text-zinc-100' : 'text-zinc-900')}>
            Accomplishments
          </h3>
          {stats.total > 0 && (
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
              )}
            >
              {stats.total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={refresh}
            disabled={loading}
            className={cn(
              'p-2 rounded-lg transition-colors touch-manipulation',
              'min-w-[36px] min-h-[36px]', // Mobile touch targets
              isDark ? 'hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 active:bg-zinc-200 text-zinc-500'
            )}
            title="Refresh"
            aria-label="Refresh accomplishments"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button
            onClick={handleCopyMarkdown}
            disabled={items.length === 0}
            className={cn(
              'p-2 rounded-lg transition-colors touch-manipulation',
              'min-w-[36px] min-h-[36px]', // Mobile touch targets
              isDark ? 'hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 active:bg-zinc-200 text-zinc-500',
              items.length === 0 && 'opacity-50 cursor-not-allowed'
            )}
            title="Copy as markdown"
            aria-label="Copy accomplishments as markdown"
          >
            {copying ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
          {onSyncToReflection && (
            <button
              onClick={handleSyncToReflection}
              disabled={items.length === 0}
              className={cn(
                'p-2 rounded-lg transition-colors touch-manipulation',
                'min-w-[36px] min-h-[36px]', // Mobile touch targets
                isDark ? 'hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 active:bg-zinc-200 text-zinc-500',
                items.length === 0 && 'opacity-50 cursor-not-allowed'
              )}
              title="Sync to reflection"
              aria-label="Sync accomplishments to reflection"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Period toggle */}
      <div className="px-3 py-2">
        <PeriodToggle period={period} onChange={setPeriod} isDark={isDark} />
      </div>

      {/* Quick stats */}
      {showStats && (
        <div className="px-3 pb-2">
          <QuickStatsBar isDark={isDark} />
        </div>
      )}

      {/* Streak banner */}
      {showStreak && streak && streak.current > 0 && (
        <div
          className={cn(
            'mx-3 mb-2 px-3 py-2 rounded-lg flex items-center gap-2',
            isDark ? 'bg-amber-500/10' : 'bg-amber-100'
          )}
        >
          <Flame className="w-5 h-5 text-amber-500" />
          <div className="flex-1">
            <p className={cn('text-sm font-medium', isDark ? 'text-amber-300' : 'text-amber-700')}>
              {streak.current} day streak!
            </p>
            {streak.longest > streak.current && (
              <p className={cn('text-xs', isDark ? 'text-amber-400/70' : 'text-amber-600/70')}>Best: {streak.longest} days</p>
            )}
          </div>
          {streak.daysUntilBreak === 0 && (
            <span className={cn('text-xs px-2 py-0.5 rounded-full', isDark ? 'bg-amber-500/30 text-amber-400' : 'bg-amber-200 text-amber-700')}>
              Complete today!
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className={cn('w-6 h-6 animate-spin', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className={cn('w-8 h-8 mx-auto mb-2', isDark ? 'text-zinc-700' : 'text-zinc-300')} />
            <p className={cn('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              No accomplishments yet
            </p>
            <p className={cn('text-xs', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
              Complete tasks to see them here
            </p>
          </div>
        ) : groupByProject && groupedItems ? (
          <div className="py-1">
            {/* Grouped items */}
            {Array.from(groupedItems.groups.entries()).map(([project, projectItems]) => (
              <ProjectGroup
                key={project}
                project={project}
                items={projectItems}
                isDark={isDark}
                compact={compact}
              />
            ))}
            {/* Ungrouped items */}
            {groupedItems.ungrouped.length > 0 && (
              <div className="mt-2">
                {groupedItems.groups.size > 0 && (
                  <div className={cn('px-2 py-1 text-xs font-medium', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                    Other
                  </div>
                )}
                {groupedItems.ungrouped.map((item) => (
                  <AccomplishmentItemRow key={item.id} item={item} compact={compact} isDark={isDark} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="py-1">
            {items.map((item) => (
              <AccomplishmentItemRow key={item.id} item={item} compact={compact} isDark={isDark} />
            ))}
          </div>
        )}
      </div>

      {/* Summary stats at bottom */}
      {items.length > 0 && (
        <div
          className={cn(
            'px-3 py-2 text-xs border-t flex items-center gap-3',
            isDark ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-400'
          )}
        >
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            {stats.tasks} tasks
          </span>
          {stats.subtasks > 0 && (
            <span className="flex items-center gap-1">
              <Circle className="w-3 h-3 text-emerald-400" />
              {stats.subtasks} subtasks
            </span>
          )}
          {stats.habits > 0 && (
            <span className="flex items-center gap-1">
              <Repeat className="w-3 h-3 text-purple-500" />
              {stats.habits} habits
            </span>
          )}
        </div>
      )}
    </div>
  )
}
