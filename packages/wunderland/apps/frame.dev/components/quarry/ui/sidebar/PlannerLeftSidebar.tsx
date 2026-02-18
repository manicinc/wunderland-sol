'use client'

/**
 * Planner Left Sidebar
 * @module components/quarry/ui/sidebar/PlannerLeftSidebar
 *
 * Left sidebar for the Task Planner page with:
 * - Task statistics
 * - Quick actions
 * - Calendar summary
 * - Focus timer
 */

import React from 'react'
import Link from 'next/link'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import {
  CalendarCheck2,
  ListTodo,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Plus,
  ChevronRight,
  Target,
  Flame,
  Calendar,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CollapsibleSidebarSection } from './sections/CollapsibleSidebarSection'
import { TimerSection } from './sections/TimerSection'

export interface PlannerLeftSidebarProps {
  isDark: boolean
  /** Task statistics */
  stats?: {
    total: number
    completed: number
    inProgress: number
    overdue: number
  }
  /** Today's focus items count */
  todayCount?: number
  /** Current streak days */
  streakDays?: number
  /** Callback to create new task */
  onCreateTask?: () => void
  className?: string
}

export default function PlannerLeftSidebar({
  isDark,
  stats = { total: 0, completed: 0, inProgress: 0, overdue: 0 },
  todayCount = 0,
  streakDays = 0,
  onCreateTask,
  className,
}: PlannerLeftSidebarProps) {
  const resolvePath = useQuarryPath()
  const completionRate = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Quick Create */}
      <div className={cn(
        'p-3 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <button
          onClick={onCreateTask}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors',
            'bg-gradient-to-r from-violet-500 to-purple-500 text-white',
            'hover:from-violet-600 hover:to-purple-600'
          )}
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Today's Focus */}
      <div className={cn(
        'p-3 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <div className="flex items-center justify-between mb-2">
          <span className={cn('text-xs font-medium', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
            Today's Focus
          </span>
          <span className={cn(
            'text-lg font-bold',
            isDark ? 'text-white' : 'text-zinc-900'
          )}>
            {todayCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Flame className={cn(
            'w-4 h-4',
            streakDays > 0 ? 'text-orange-500' : isDark ? 'text-zinc-600' : 'text-zinc-400'
          )} />
          <span className={cn(
            'text-xs',
            streakDays > 0
              ? isDark ? 'text-orange-400' : 'text-orange-600'
              : isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            {streakDays} day streak
          </span>
        </div>
      </div>

      {/* Task Stats */}
      <CollapsibleSidebarSection
        title="Tasks"
        icon={ListTodo}
        defaultExpanded={true}
        isDark={isDark}
      >
        <div className="p-3 space-y-2">
          <StatRow
            icon={Circle}
            label="Total"
            value={stats.total}
            color="text-zinc-500"
            isDark={isDark}
          />
          <StatRow
            icon={CheckCircle2}
            label="Completed"
            value={stats.completed}
            color="text-emerald-500"
            isDark={isDark}
          />
          <StatRow
            icon={Clock}
            label="In Progress"
            value={stats.inProgress}
            color="text-blue-500"
            isDark={isDark}
          />
          {stats.overdue > 0 && (
            <StatRow
              icon={AlertCircle}
              label="Overdue"
              value={stats.overdue}
              color="text-red-500"
              isDark={isDark}
            />
          )}

          {/* Progress Bar */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1">
              <span className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                Completion
              </span>
              <span className={cn('text-[10px] font-bold', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                {completionRate}%
              </span>
            </div>
            <div className={cn(
              'h-1.5 rounded-full overflow-hidden',
              isDark ? 'bg-zinc-800' : 'bg-zinc-200'
            )}>
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </CollapsibleSidebarSection>

      {/* Focus Timer */}
      <TimerSection
        isDark={isDark}
        defaultExpanded={false}
        defaultMinutes={25}
        maxMinutes={60}
        title="Focus Timer"
        showPomodoroMode={true}
      />

      {/* Related */}
      <CollapsibleSidebarSection
        title="Related"
        icon={Target}
        defaultExpanded={false}
        isDark={isDark}
      >
        <div className="p-2 space-y-1">
          <Link
            href={resolvePath('/quarry/focus')}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg text-xs transition-colors',
              isDark
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-800'
            )}
          >
            <Target className="w-4 h-4" />
            <span className="flex-1">Focus Mode</span>
            <ChevronRight className="w-3 h-3 opacity-50" />
          </Link>
          <Link
            href={resolvePath('/quarry/dashboard')}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg text-xs transition-colors',
              isDark
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-800'
            )}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="flex-1">Dashboard</span>
            <ChevronRight className="w-3 h-3 opacity-50" />
          </Link>
          <Link
            href={resolvePath('/quarry/reflect')}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg text-xs transition-colors',
              isDark
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-800'
            )}
          >
            <Calendar className="w-4 h-4" />
            <span className="flex-1">Reflect</span>
            <ChevronRight className="w-3 h-3 opacity-50" />
          </Link>
        </div>
      </CollapsibleSidebarSection>

      {/* Spacer */}
      <div className="flex-1" />
    </div>
  )
}

function StatRow({
  icon: Icon,
  label,
  value,
  color,
  isDark,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
  isDark: boolean
}) {
  return (
    <div className={cn(
      'flex items-center justify-between p-2 rounded-lg',
      isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
    )}>
      <div className="flex items-center gap-2">
        <Icon className={cn('w-4 h-4', color)} />
        <span className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
          {label}
        </span>
      </div>
      <span className={cn('text-sm font-bold', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
        {value}
      </span>
    </div>
  )
}

