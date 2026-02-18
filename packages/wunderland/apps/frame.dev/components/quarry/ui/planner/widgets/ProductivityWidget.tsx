/**
 * ProductivityWidget
 *
 * Dashboard widget showing productivity stats and trends.
 *
 * @module components/quarry/ui/planner/widgets/ProductivityWidget
 */

'use client'

import { useMemo, memo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, CheckCircle2, Clock, Flame, Target, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/planner/types'
import { formatDuration } from '@/lib/planner/types'

export interface ProductivityWidgetProps {
  tasks: Task[]
  onViewAnalytics?: () => void
  theme?: 'light' | 'dark'
  className?: string
}

function ProductivityWidgetComponent({
  tasks,
  onViewAnalytics,
  theme = 'dark',
  className,
}: ProductivityWidgetProps) {
  const stats = useMemo(() => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const thisWeekCompleted = tasks.filter((t) => {
      if (t.status !== 'completed' || !t.completedAt) return false
      const completedDate = new Date(t.completedAt)
      return completedDate >= startOfWeek
    })

    const todayCompleted = tasks.filter((t) => {
      if (t.status !== 'completed' || !t.completedAt) return false
      const completedDate = new Date(t.completedAt)
      const todayStr = today.toISOString().split('T')[0]
      return completedDate.toISOString().split('T')[0] === todayStr
    })

    const totalTimeTracked = tasks.reduce((sum, t) => sum + (t.actualDuration || 0), 0)
    const avgAccuracy = calculateTimeAccuracy(tasks)

    // Calculate streak (consecutive days with completions)
    const streak = calculateStreak(tasks)

    return {
      todayCount: todayCompleted.length,
      weekCount: thisWeekCompleted.length,
      totalTimeTracked,
      avgAccuracy,
      streak,
    }
  }, [tasks])

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        theme === 'dark'
          ? 'bg-zinc-900/50 border-zinc-800'
          : 'bg-white border-gray-200',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp
            className={cn(
              'w-5 h-5',
              theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'
            )}
          />
          <h3
            className={cn(
              'font-semibold',
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            )}
          >
            Productivity
          </h3>
        </div>
        {onViewAnalytics && (
          <button
            onClick={onViewAnalytics}
            className={cn(
              'flex items-center gap-1 text-xs transition-colors',
              theme === 'dark'
                ? 'text-zinc-500 hover:text-zinc-300'
                : 'text-gray-400 hover:text-gray-600'
            )}
          >
            Analytics
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Today's completions */}
        <StatCard
          icon={CheckCircle2}
          label="Today"
          value={stats.todayCount.toString()}
          subtext="completed"
          color="emerald"
          theme={theme}
        />

        {/* Week's completions */}
        <StatCard
          icon={Target}
          label="This week"
          value={stats.weekCount.toString()}
          subtext="completed"
          color="blue"
          theme={theme}
        />

        {/* Time tracked */}
        <StatCard
          icon={Clock}
          label="Time tracked"
          value={stats.totalTimeTracked > 0 ? formatDuration(stats.totalTimeTracked) : '0m'}
          subtext="total"
          color="violet"
          theme={theme}
        />

        {/* Streak */}
        <StatCard
          icon={Flame}
          label="Streak"
          value={stats.streak.toString()}
          subtext={stats.streak === 1 ? 'day' : 'days'}
          color={stats.streak >= 7 ? 'orange' : 'amber'}
          theme={theme}
        />
      </div>

      {/* Accuracy meter (if time tracking is used) */}
      {stats.avgAccuracy !== null && (
        <div className="mt-4 pt-3 border-t border-zinc-800">
          <div className="flex items-center justify-between mb-1.5">
            <span
              className={cn(
                'text-xs',
                theme === 'dark' ? 'text-zinc-400' : 'text-gray-500'
              )}
            >
              Time estimation accuracy
            </span>
            <span
              className={cn(
                'text-xs font-medium',
                stats.avgAccuracy >= 80
                  ? 'text-emerald-400'
                  : stats.avgAccuracy >= 60
                    ? 'text-amber-400'
                    : 'text-red-400'
              )}
            >
              {stats.avgAccuracy}%
            </span>
          </div>
          <div
            className={cn(
              'h-1.5 rounded-full overflow-hidden',
              theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-100'
            )}
          >
            <motion.div
              className={cn(
                'h-full rounded-full',
                stats.avgAccuracy >= 80
                  ? 'bg-emerald-500'
                  : stats.avgAccuracy >= 60
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${stats.avgAccuracy}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
  theme,
}: {
  icon: React.ElementType
  label: string
  value: string
  subtext: string
  color: 'emerald' | 'blue' | 'violet' | 'amber' | 'orange'
  theme: 'light' | 'dark'
}) {
  const colorClasses = {
    emerald: {
      icon: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    blue: {
      icon: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    violet: {
      icon: 'text-violet-400',
      bg: 'bg-violet-500/10',
    },
    amber: {
      icon: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    orange: {
      icon: 'text-orange-400',
      bg: 'bg-orange-500/10',
    },
  }

  return (
    <div
      className={cn(
        'rounded-lg p-3',
        theme === 'dark' ? 'bg-zinc-800/50' : 'bg-gray-50'
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={cn('p-1 rounded', colorClasses[color].bg)}>
          <Icon className={cn('w-3 h-3', colorClasses[color].icon)} />
        </div>
        <span
          className={cn(
            'text-[10px] uppercase tracking-wider',
            theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'
          )}
        >
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            'text-xl font-bold tabular-nums',
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}
        >
          {value}
        </span>
        <span
          className={cn(
            'text-xs',
            theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'
          )}
        >
          {subtext}
        </span>
      </div>
    </div>
  )
}

/**
 * Calculate time estimation accuracy
 */
function calculateTimeAccuracy(tasks: Task[]): number | null {
  const tasksWithBoth = tasks.filter(
    (t) => t.duration && t.actualDuration && t.status === 'completed'
  )

  if (tasksWithBoth.length === 0) return null

  const accuracies = tasksWithBoth.map((t) => {
    const estimated = t.duration!
    const actual = t.actualDuration!
    const diff = Math.abs(estimated - actual)
    const accuracy = Math.max(0, 100 - (diff / estimated) * 100)
    return accuracy
  })

  return Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
}

/**
 * Calculate streak of consecutive days with completions
 */
function calculateStreak(tasks: Task[]): number {
  const completedDates = new Set(
    tasks
      .filter((t) => t.status === 'completed' && t.completedAt)
      .map((t) => new Date(t.completedAt!).toISOString().split('T')[0])
  )

  if (completedDates.size === 0) return 0

  let streak = 0
  const today = new Date()

  for (let i = 0; i < 365; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    if (completedDates.has(dateStr)) {
      streak++
    } else if (i > 0) {
      // Allow today to not have completions yet
      break
    }
  }

  return streak
}

export const ProductivityWidget = memo(ProductivityWidgetComponent)
export default ProductivityWidget
