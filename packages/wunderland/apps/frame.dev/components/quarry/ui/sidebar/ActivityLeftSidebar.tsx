'use client'

/**
 * Activity Left Sidebar
 * @module components/quarry/ui/sidebar/ActivityLeftSidebar
 *
 * Left sidebar for the Activity Log page with:
 * - Activity type filters
 * - Date range selector
 * - Quick stats
 * - Export options
 */

import React from 'react'
import Link from 'next/link'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import {
  Activity,
  Filter,
  Calendar,
  FileText,
  Edit,
  Trash2,
  Eye,
  Download,
  ChevronRight,
  Clock,
  BarChart3,
  History,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CollapsibleSidebarSection } from './sections/CollapsibleSidebarSection'
import { TimerSection } from './sections/TimerSection'

export interface ActivityLeftSidebarProps {
  isDark: boolean
  /** Activity type filters */
  filters?: {
    created: boolean
    edited: boolean
    viewed: boolean
    deleted: boolean
  }
  /** Callback when filters change */
  onFiltersChange?: (filters: { created: boolean; edited: boolean; viewed: boolean; deleted: boolean }) => void
  /** Date range */
  dateRange?: 'today' | 'week' | 'month' | 'all'
  /** Callback when date range changes */
  onDateRangeChange?: (range: 'today' | 'week' | 'month' | 'all') => void
  /** Activity stats */
  stats?: {
    total: number
    today: number
    thisWeek: number
  }
  /** Export callback */
  onExport?: () => void
  className?: string
}

export default function ActivityLeftSidebar({
  isDark,
  filters = { created: true, edited: true, viewed: true, deleted: true },
  onFiltersChange,
  dateRange = 'week',
  onDateRangeChange,
  stats = { total: 0, today: 0, thisWeek: 0 },
  onExport,
  className,
}: ActivityLeftSidebarProps) {
  const resolvePath = useQuarryPath()
  const activityTypes = [
    { id: 'created', label: 'Created', icon: FileText, color: 'text-emerald-500' },
    { id: 'edited', label: 'Edited', icon: Edit, color: 'text-blue-500' },
    { id: 'viewed', label: 'Viewed', icon: Eye, color: 'text-violet-500' },
    { id: 'deleted', label: 'Deleted', icon: Trash2, color: 'text-red-500' },
  ] as const

  const dateRanges = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Time' },
  ] as const

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Quick Stats */}
      <div className={cn(
        'p-3 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <div className="grid grid-cols-2 gap-2">
          <div className={cn(
            'p-2 rounded-lg',
            isDark ? 'bg-zinc-800' : 'bg-zinc-100'
          )}>
            <span className={cn('text-lg font-bold block', isDark ? 'text-white' : 'text-zinc-900')}>
              {stats.today}
            </span>
            <span className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              Today
            </span>
          </div>
          <div className={cn(
            'p-2 rounded-lg',
            isDark ? 'bg-zinc-800' : 'bg-zinc-100'
          )}>
            <span className={cn('text-lg font-bold block', isDark ? 'text-white' : 'text-zinc-900')}>
              {stats.thisWeek}
            </span>
            <span className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              This Week
            </span>
          </div>
        </div>
      </div>

      {/* Date Range */}
      <CollapsibleSidebarSection
        title="Time Period"
        icon={Calendar}
        defaultExpanded={true}
        isDark={isDark}
      >
        <div className="p-2 space-y-1">
          {dateRanges.map((range) => {
            const isActive = dateRange === range.id
            return (
              <button
                key={range.id}
                onClick={() => onDateRangeChange?.(range.id)}
                className={cn(
                  'w-full flex items-center gap-2 p-2 rounded-lg text-xs transition-colors',
                  isActive
                    ? isDark
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-cyan-100 text-cyan-700'
                    : isDark
                      ? 'text-zinc-400 hover:bg-zinc-800'
                      : 'text-zinc-600 hover:bg-zinc-100'
                )}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{range.label}</span>
              </button>
            )
          })}
        </div>
      </CollapsibleSidebarSection>

      {/* Activity Type Filters */}
      <CollapsibleSidebarSection
        title="Activity Types"
        icon={Filter}
        defaultExpanded={true}
        isDark={isDark}
      >
        <div className="p-2 space-y-1">
          {activityTypes.map((type) => {
            const Icon = type.icon
            const isEnabled = filters[type.id as keyof typeof filters]
            return (
              <button
                key={type.id}
                onClick={() => onFiltersChange?.({
                  ...filters,
                  [type.id]: !isEnabled,
                })}
                className={cn(
                  'w-full flex items-center gap-2 p-2 rounded-lg text-xs transition-colors',
                  isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                )}
              >
                <div className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center',
                  isEnabled
                    ? 'bg-cyan-500 border-cyan-500'
                    : isDark ? 'border-zinc-600' : 'border-zinc-300'
                )}>
                  {isEnabled && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <Icon className={cn('w-4 h-4', type.color)} />
                <span className={cn(
                  'flex-1 text-left',
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                )}>
                  {type.label}
                </span>
              </button>
            )
          })}
        </div>
      </CollapsibleSidebarSection>

      {/* Export */}
      {onExport && (
        <div className={cn(
          'p-3 border-t',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}>
          <button
            onClick={onExport}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs transition-colors',
              isDark
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            )}
          >
            <Download className="w-4 h-4" />
            Export Activity
          </button>
        </div>
      )}

      {/* Focus Timer */}
      <TimerSection
        isDark={isDark}
        defaultExpanded={false}
        defaultMinutes={15}
        maxMinutes={60}
        title="Focus Timer"
      />

      {/* Related */}
      <CollapsibleSidebarSection
        title="Related"
        icon={History}
        defaultExpanded={false}
        isDark={isDark}
      >
        <div className="p-2 space-y-1">
          <Link
            href={resolvePath('/quarry/analytics')}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg text-xs transition-colors',
              isDark
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-800'
            )}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="flex-1">Analytics</span>
            <ChevronRight className="w-3 h-3 opacity-50" />
          </Link>
          <Link
            href={resolvePath('/quarry/evolution')}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg text-xs transition-colors',
              isDark
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-800'
            )}
          >
            <History className="w-4 h-4" />
            <span className="flex-1">Evolution</span>
            <ChevronRight className="w-3 h-3 opacity-50" />
          </Link>
        </div>
      </CollapsibleSidebarSection>

      {/* Spacer */}
      <div className="flex-1" />
    </div>
  )
}

