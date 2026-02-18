'use client'

/**
 * View Switcher Component
 *
 * Segmented control to toggle between day/week/month/agenda views
 * @module components/quarry/ui/planner/ViewSwitcher
 */

import { cn } from '@/lib/utils'
import { PlannerView } from '@/lib/planner/types'
import {
  DayViewIcon,
  WeekViewIcon,
  MonthViewIcon,
  AgendaViewIcon,
  TimelineViewIcon,
  KanbanViewIcon,
  HabitsViewIcon,
} from '@/lib/planner/icons/PlannerIcons'
import Tooltip from '../common/Tooltip'

interface ViewSwitcherProps {
  view: PlannerView
  onViewChange: (view: PlannerView) => void
  className?: string
}

const views: { id: PlannerView; label: string; icon: typeof DayViewIcon }[] = [
  { id: 'day', label: 'Day', icon: DayViewIcon },
  { id: 'week', label: 'Week', icon: WeekViewIcon },
  { id: 'month', label: 'Month', icon: MonthViewIcon },
  { id: 'agenda', label: 'Agenda', icon: AgendaViewIcon },
  { id: 'timeline', label: 'Timeline', icon: TimelineViewIcon },
  { id: 'kanban', label: 'Kanban', icon: KanbanViewIcon },
  { id: 'habits', label: 'Habits', icon: HabitsViewIcon },
]

export function ViewSwitcher({ view, onViewChange, className }: ViewSwitcherProps) {
  return (
    <div
      className={cn(
        'inline-flex flex-wrap items-center gap-0.5 rounded-lg p-1',
        'bg-stone-100 dark:bg-stone-800/50',
        'border border-stone-200 dark:border-stone-700/50',
        className
      )}
      role="tablist"
      aria-label="Calendar view"
    >
      {views.map(({ id, label, icon: Icon }) => {
        const isActive = view === id

        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`${id}-view-panel`}
            onClick={() => onViewChange(id)}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-1.5 rounded-md',
              'text-sm font-medium transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1',
              isActive
                ? [
                    'bg-white dark:bg-stone-900',
                    'text-stone-900 dark:text-stone-100',
                    'shadow-sm',
                  ]
                : [
                    'text-stone-500 dark:text-stone-400',
                    'hover:text-stone-700 dark:hover:text-stone-300',
                    'hover:bg-stone-50 dark:hover:bg-stone-700/30',
                  ]
            )}
          >
            <Icon
              size={16}
              className={cn(
                'transition-colors',
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-current'
              )}
            />
            <span className="hidden sm:inline">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Compact View Switcher for mobile
 */
export function ViewSwitcherCompact({
  view,
  onViewChange,
  className,
}: ViewSwitcherProps) {
  return (
    <div
      className={cn(
        'inline-flex flex-wrap items-center justify-center gap-0.5 rounded-lg p-0.5',
        'bg-stone-100 dark:bg-stone-800/50',
        'border border-stone-200 dark:border-stone-700/50',
        className
      )}
      role="tablist"
      aria-label="Calendar view"
    >
      {views.map(({ id, label, icon: Icon }) => {
        const isActive = view === id

        return (
          <Tooltip key={id} content={`${label} view`} placement="bottom">
            <button
              role="tab"
              aria-selected={isActive}
              aria-label={label}
              onClick={() => onViewChange(id)}
              className={cn(
                'relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-md',
                'transition-all duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                isActive
                  ? [
                      'bg-white dark:bg-stone-900',
                      'shadow-sm',
                    ]
                  : [
                      'hover:bg-stone-50 dark:hover:bg-stone-700/30',
                      'active:bg-stone-100 dark:active:bg-stone-600/30',
                    ]
              )}
            >
              <Icon
                size={16}
                className={cn(
                  'transition-colors',
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-stone-500 dark:text-stone-400'
                )}
              />
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}

export default ViewSwitcher
