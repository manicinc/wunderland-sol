/**
 * ChronologicalPanel
 * 
 * Left panel of the journey view showing a vertical timeline
 * with entries grouped by time periods (years, quarters, months).
 * 
 * @module components/quarry/ui/evolution/journey/ChronologicalPanel
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Calendar, FileText, Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { JourneyPeriodWithEntries, JourneyEntryWithMeta, PeriodGranularity } from '@/lib/analytics/journeyTypes'
import { BRANCH_COLORS } from '@/lib/analytics/journeyTypes'
import { format, parseISO } from 'date-fns'

// ============================================================================
// TYPES
// ============================================================================

export interface ChronologicalPanelProps {
  periods: JourneyPeriodWithEntries[]
  selectedEntryId: string | null
  onSelectEntry: (id: string) => void
  onAddEntry: (date?: string) => void
  granularity: PeriodGranularity
  onChangeGranularity: (granularity: PeriodGranularity) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  isDark: boolean
  className?: string
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface PeriodSectionProps {
  period: JourneyPeriodWithEntries
  selectedEntryId: string | null
  onSelectEntry: (id: string) => void
  onAddEntry: (date: string) => void
  isDark: boolean
  level?: number
}

function PeriodSection({
  period,
  selectedEntryId,
  onSelectEntry,
  onAddEntry,
  isDark,
  level = 0,
}: PeriodSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className={cn('relative', level > 0 && 'ml-4')}>
      {/* Period Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center gap-2 py-2 px-3 rounded-lg text-left transition-colors',
          isDark
            ? 'hover:bg-zinc-800/50'
            : 'hover:bg-zinc-100'
        )}
      >
        {/* Timeline dot */}
        <div className={cn(
          'w-3 h-3 rounded-full border-2 flex-shrink-0',
          isDark ? 'border-zinc-500 bg-zinc-800' : 'border-zinc-400 bg-white'
        )} />
        
        {/* Expand/Collapse icon */}
        {isExpanded ? (
          <ChevronDown className={cn('w-4 h-4 flex-shrink-0', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
        ) : (
          <ChevronRight className={cn('w-4 h-4 flex-shrink-0', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
        )}
        
        {/* Period label */}
        <span className={cn(
          'font-semibold text-sm flex-1',
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        )}>
          {period.label}
        </span>
        
        {/* Entry count */}
        <span className={cn(
          'text-xs px-2 py-0.5 rounded-full',
          isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-500'
        )}>
          {period.entryCount} {period.entryCount === 1 ? 'entry' : 'entries'}
        </span>
      </button>

      {/* Entries */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="relative pl-6 border-l-2 border-dashed ml-1.5 mt-1 space-y-1">
              {period.entries.map((entry) => (
                <EntryItem
                  key={entry.id}
                  entry={entry}
                  isSelected={entry.id === selectedEntryId}
                  onSelect={() => onSelectEntry(entry.id)}
                  isDark={isDark}
                />
              ))}
              
              {/* Add entry button */}
              <button
                onClick={() => onAddEntry(period.startDate)}
                className={cn(
                  'w-full flex items-center gap-2 py-2 px-3 rounded-lg text-left transition-colors',
                  isDark
                    ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                    : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
                )}
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add entry</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface EntryItemProps {
  entry: JourneyEntryWithMeta
  isSelected: boolean
  onSelect: () => void
  isDark: boolean
}

function EntryItem({ entry, isSelected, onSelect, isDark }: EntryItemProps) {
  const branchColor = BRANCH_COLORS[entry.branchColor]

  return (
    <button
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      role="option"
      aria-selected={isSelected}
      aria-label={`${entry.title}, ${format(parseISO(entry.date), 'MMMM d, yyyy')}, in ${entry.branchName}`}
      className={cn(
        'w-full flex flex-col gap-1 p-3 md:p-3 rounded-lg text-left transition-all',
        'touch-manipulation min-h-[60px]', // Touch optimization
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        isDark ? 'focus-visible:ring-teal-500' : 'focus-visible:ring-teal-400',
        isSelected
          ? isDark
            ? 'bg-zinc-700/80 ring-1 ring-zinc-600'
            : 'bg-white ring-1 ring-zinc-300 shadow-sm'
          : isDark
            ? 'hover:bg-zinc-800/50 active:bg-zinc-800'
            : 'hover:bg-zinc-50 active:bg-zinc-100'
      )}
    >
      {/* Title and date */}
      <div className="flex items-start justify-between gap-2">
        <h4 className={cn(
          'font-medium text-sm leading-tight',
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        )}>
          {entry.title}
        </h4>
        <time
          dateTime={entry.date}
          className={cn(
            'text-xs flex-shrink-0',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}
        >
          {format(parseISO(entry.date), 'MMM d, yyyy')}
        </time>
      </div>
      
      {/* Snippet */}
      {entry.snippet && (
        <p className={cn(
          'text-xs line-clamp-2',
          isDark ? 'text-zinc-400' : 'text-zinc-500'
        )}>
          {entry.snippet}
        </p>
      )}
      
      {/* Branch indicator */}
      <div className="flex items-center gap-2 mt-1">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: branchColor.hex }}
          aria-hidden="true"
        />
        <span className={cn(
          'text-xs',
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        )}>
          {entry.branchName}
          {entry.sectionName && ` / ${entry.sectionName}`}
        </span>
      </div>
    </button>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ChronologicalPanel({
  periods,
  selectedEntryId,
  onSelectEntry,
  onAddEntry,
  granularity,
  onChangeGranularity,
  searchQuery,
  onSearchChange,
  isDark,
  className,
}: ChronologicalPanelProps) {
  const granularityOptions: { value: PeriodGranularity; label: string }[] = [
    { value: 'year', label: 'Year' },
    { value: 'quarter', label: 'Quarter' },
    { value: 'month', label: 'Month' },
    { value: 'week', label: 'Week' },
  ]

  return (
    <div className={cn(
      'flex flex-col h-full',
      isDark ? 'bg-zinc-900' : 'bg-zinc-50',
      className
    )}>
      {/* Header */}
      <div className={cn(
        'p-4 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <h2 className={cn(
          'text-lg font-bold mb-3',
          isDark ? 'text-zinc-100' : 'text-zinc-900'
        )}>
          Timeline
        </h2>
        
        {/* Search */}
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 md:py-2 rounded-lg mb-3',
          isDark ? 'bg-zinc-800' : 'bg-white border border-zinc-200'
        )}>
          <Search className={cn('w-4 h-4 flex-shrink-0', isDark ? 'text-zinc-500' : 'text-zinc-400')} aria-hidden="true" />
          <label htmlFor="journey-search" className="sr-only">Search entries</label>
          <input
            id="journey-search"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search entries..."
            aria-label="Search journey entries"
            className={cn(
              'flex-1 bg-transparent text-sm outline-none min-h-[36px]',
              isDark
                ? 'text-zinc-100 placeholder:text-zinc-500'
                : 'text-zinc-900 placeholder:text-zinc-400'
            )}
          />
        </div>
        
        {/* Granularity selector */}
        <div 
          className="flex items-center gap-1"
          role="radiogroup"
          aria-label="Timeline granularity"
        >
          {granularityOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onChangeGranularity(option.value)}
              role="radio"
              aria-checked={granularity === option.value}
              className={cn(
                'px-3 py-2 text-xs rounded transition-colors touch-manipulation min-h-[36px]',
                granularity === option.value
                  ? isDark
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'bg-zinc-200 text-zinc-900'
                  : isDark
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-700'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {periods.length === 0 ? (
          <div className={cn(
            'flex flex-col items-center justify-center py-12 text-center',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            <Calendar className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">No entries yet</p>
            <button
              onClick={() => onAddEntry()}
              className={cn(
                'mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                isDark
                  ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                  : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200'
              )}
            >
              <Plus className="w-4 h-4" />
              Create first entry
            </button>
          </div>
        ) : (
          periods.map((period) => (
            <PeriodSection
              key={period.id}
              period={period}
              selectedEntryId={selectedEntryId}
              onSelectEntry={onSelectEntry}
              onAddEntry={onAddEntry}
              isDark={isDark}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default ChronologicalPanel

