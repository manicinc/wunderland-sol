/**
 * Timeline View Component
 *
 * Chronological view of strands grouped by time period.
 * @module components/quarry/views/timeline/TimelineView
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  Search,
  X,
  Loader2,
  Calendar,
  Filter,
} from 'lucide-react'
import { TimelineGroup } from './TimelineGroup'
import { useTimelineGroups } from '../hooks/useTimelineGroups'
import type { TimelineViewProps, StrandWithPath, TimelinePeriod } from '../types'

interface TimelineViewExtendedProps extends Omit<TimelineViewProps, 'groups'> {
  /** Pre-computed groups (optional, uses hook if not provided) */
  groups?: TimelineViewProps['groups']
  /** Search query */
  searchQuery?: string
  /** Search change handler */
  onSearchChange?: (query: string) => void
}

export default function TimelineView({
  strands,
  groups: externalGroups,
  onGroupToggle,
  onNavigate,
  onEdit,
  onDelete,
  theme = 'light',
  isLoading = false,
  searchQuery = '',
  onSearchChange,
}: TimelineViewExtendedProps) {
  const isDark = theme.includes('dark')
  const [localSearch, setLocalSearch] = useState(searchQuery)

  // Filter strands by search
  const filteredStrands = useMemo(() => {
    if (!localSearch.trim()) return strands

    const query = localSearch.toLowerCase()
    return strands.filter((strand) => {
      return (
        strand.title?.toLowerCase().includes(query) ||
        strand.path.toLowerCase().includes(query) ||
        strand.summary?.toLowerCase().includes(query) ||
        strand.metadata.tags?.toString().toLowerCase().includes(query)
      )
    })
  }, [strands, localSearch])

  // Use internal grouping if no external groups provided
  const {
    groups: internalGroups,
    toggleGroup: internalToggle,
  } = useTimelineGroups(filteredStrands, {
    onCollapsedChange: (collapsed) => {
      // Could sync with external state if needed
    },
  })

  const groups = externalGroups || internalGroups
  const toggleGroup = (period: TimelinePeriod) => {
    onGroupToggle?.(period)
    internalToggle(period)
  }

  const totalStrands = groups.reduce((sum, g) => sum + g.strands.length, 0)

  const containerClasses = `
    flex flex-col h-full overflow-hidden rounded-lg border
    ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}
  `

  const toolbarClasses = `
    flex items-center justify-between gap-3 p-3 border-b
    ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
  `

  return (
    <div className={containerClasses}>
      {/* Toolbar */}
      <div className={toolbarClasses}>
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg
              ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
            `}
          >
            <Search className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value)
                onSearchChange?.(e.target.value)
              }}
              placeholder="Search strands..."
              className={`
                flex-1 bg-transparent text-sm outline-none
                ${isDark ? 'text-zinc-100 placeholder-zinc-500' : 'text-zinc-800 placeholder-zinc-400'}
              `}
            />
            {localSearch && (
              <button
                onClick={() => {
                  setLocalSearch('')
                  onSearchChange?.('')
                }}
                className={`p-0.5 rounded ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <Clock className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
          <span className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {groups.length} periods, {totalStrands} strands
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
          </div>
        ) : groups.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full gap-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <Calendar className="w-12 h-12 opacity-30" />
            <p className="text-sm">
              {localSearch ? 'No strands match your search' : 'No strands found'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group, index) => (
              <TimelineGroup
                key={group.period}
                group={group}
                onToggle={() => toggleGroup(group.period)}
                onNavigate={onNavigate}
                onEdit={onEdit}
                theme={theme}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
