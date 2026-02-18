/**
 * ReflectionTimeBrowser - Hierarchical Year/Month/Week Browser
 * @module components/quarry/ui/ReflectionTimeBrowser
 *
 * A collapsible tree browser for navigating reflections by:
 * - Year (2025, 2024, etc.)
 * - Month (December, November, etc.)
 * - Week (Week 52: Dec 23-29, etc.)
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight,
  ChevronDown,
  Calendar,
  FileText,
  Search,
} from 'lucide-react'
import {
  getReflectionYears,
  getReflectionMonths,
  getReflectionWeeks,
  searchReflections,
  formatDateKey,
  parseDateKey,
} from '@/lib/reflect/reflectionStore'
import type { YearSummary, MonthSummary, WeekSummary } from '@/lib/reflect/types'
import type { Reflection } from '@/lib/reflect/types'
import { MoodIndicator } from '../mood/MoodSelector'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

export interface ReflectionTimeBrowserProps {
  /** Currently selected date */
  currentDate: string
  /** Called when a date is selected */
  onDateChange: (date: string) => void
  /** Whether dark mode is enabled */
  isDark?: boolean
  /** Whether to show search */
  showSearch?: boolean
  /** Class name */
  className?: string
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/** Badge showing count */
function CountBadge({ count, isDark }: { count: number; isDark?: boolean }) {
  return (
    <span
      className={cn(
        'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
        isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
      )}
    >
      {count}
    </span>
  )
}

/** Chevron toggle icon */
function ToggleIcon({ isOpen, isDark }: { isOpen: boolean; isDark?: boolean }) {
  return isOpen ? (
    <ChevronDown className={cn('w-3.5 h-3.5', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
  ) : (
    <ChevronRight className={cn('w-3.5 h-3.5', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
  )
}

/** Week item with expandable reflections */
function WeekItem({
  week,
  currentDate,
  onDateChange,
  isDark,
}: {
  week: WeekSummary
  currentDate: string
  onDateChange: (date: string) => void
  isDark?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)

  // Format date range nicely
  const startDate = parseDateKey(week.startDate)
  const endDate = parseDateKey(week.endDate)
  const dateRange = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors',
          isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100'
        )}
      >
        <ToggleIcon isOpen={isOpen} isDark={isDark} />
        <Calendar className={cn('w-3 h-3', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
        <span className={cn('flex-1 text-left', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
          Week {week.weekNumber}
        </span>
        <span className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          {dateRange}
        </span>
        {week.dominantMood && <MoodIndicator mood={week.dominantMood} size={12} showTooltip={false} />}
        <CountBadge count={week.count} isDark={isDark} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="ml-6 mt-1 space-y-0.5">
              {week.reflections.map((reflection) => {
                const date = parseDateKey(reflection.date)
                const isSelected = reflection.date === currentDate

                return (
                  <button
                    key={reflection.date}
                    onClick={() => onDateChange(reflection.date)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] transition-colors',
                      isSelected
                        ? isDark
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-purple-100 text-purple-700'
                        : isDark
                          ? 'hover:bg-zinc-800/50 text-zinc-400'
                          : 'hover:bg-zinc-100 text-zinc-600'
                    )}
                  >
                    <FileText className="w-3 h-3" />
                    <span className="flex-1 text-left">
                      {date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                    </span>
                    {reflection.metadata?.mood && (
                      <MoodIndicator mood={reflection.metadata.mood} size={10} showTooltip={false} />
                    )}
                    {reflection.wordCount && reflection.wordCount > 0 && (
                      <span className={cn('text-[9px]', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
                        {reflection.wordCount}w
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Month item with expandable weeks */
function MonthItem({
  month,
  currentDate,
  onDateChange,
  isDark,
}: {
  month: MonthSummary
  currentDate: string
  onDateChange: (date: string) => void
  isDark?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [weeks, setWeeks] = useState<WeekSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Load weeks when expanded
  useEffect(() => {
    if (isOpen && weeks.length === 0) {
      setIsLoading(true)
      getReflectionWeeks(month.year, month.month)
        .then(setWeeks)
        .finally(() => setIsLoading(false))
    }
  }, [isOpen, weeks.length, month.year, month.month])

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors',
          isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100'
        )}
      >
        <ToggleIcon isOpen={isOpen} isDark={isDark} />
        <span className={cn('flex-1 text-left font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
          {month.monthName}
        </span>
        {month.dominantMood && <MoodIndicator mood={month.dominantMood} size={14} showTooltip={false} />}
        <CountBadge count={month.count} isDark={isDark} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="ml-4 mt-1 space-y-0.5">
              {isLoading ? (
                <div className={cn('py-2 text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                  Loading...
                </div>
              ) : weeks.length > 0 ? (
                weeks.map((week) => (
                  <WeekItem
                    key={week.weekNumber}
                    week={week}
                    currentDate={currentDate}
                    onDateChange={onDateChange}
                    isDark={isDark}
                  />
                ))
              ) : (
                <div className={cn('py-2 text-xs italic', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
                  No reflections
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Year item with expandable months */
function YearItem({
  year,
  currentDate,
  onDateChange,
  isDark,
  defaultOpen = false,
}: {
  year: YearSummary
  currentDate: string
  onDateChange: (date: string) => void
  isDark?: boolean
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [months, setMonths] = useState<MonthSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Load months when expanded
  useEffect(() => {
    if (isOpen && months.length === 0) {
      setIsLoading(true)
      getReflectionMonths(year.year)
        .then(setMonths)
        .finally(() => setIsLoading(false))
    }
  }, [isOpen, months.length, year.year])

  return (
    <div className={cn('rounded-lg', isDark ? 'bg-zinc-900/30' : 'bg-zinc-50/50')}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
          isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100'
        )}
      >
        <ToggleIcon isOpen={isOpen} isDark={isDark} />
        <span className={cn('flex-1 text-left font-bold', isDark ? 'text-zinc-100' : 'text-zinc-900')}>
          {year.year}
        </span>
        {year.dominantMood && <MoodIndicator mood={year.dominantMood} size={16} showTooltip={false} />}
        <CountBadge count={year.count} isDark={isDark} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 space-y-0.5">
              {isLoading ? (
                <div className={cn('py-2 px-3 text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                  Loading...
                </div>
              ) : months.length > 0 ? (
                months.map((month) => (
                  <MonthItem
                    key={month.month}
                    month={month}
                    currentDate={currentDate}
                    onDateChange={onDateChange}
                    isDark={isDark}
                  />
                ))
              ) : (
                <div className={cn('py-2 px-3 text-xs italic', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
                  No reflections
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Search results display */
function SearchResults({
  results,
  query,
  currentDate,
  onDateChange,
  onClear,
  isDark,
}: {
  results: Reflection[]
  query: string
  currentDate: string
  onDateChange: (date: string) => void
  onClear: () => void
  isDark?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
          {results.length} result{results.length !== 1 ? 's' : ''} for &quot;{query}&quot;
        </span>
        <button
          onClick={onClear}
          className={cn('text-xs', isDark ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700')}
        >
          Clear
        </button>
      </div>
      <div className="space-y-1">
        {results.map((reflection) => {
          const date = parseDateKey(reflection.date)
          const isSelected = reflection.date === currentDate

          return (
            <button
              key={reflection.date}
              onClick={() => onDateChange(reflection.date)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors',
                isSelected
                  ? isDark
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'bg-purple-100 text-purple-700'
                  : isDark
                    ? 'hover:bg-zinc-800/50 text-zinc-300'
                    : 'hover:bg-zinc-100 text-zinc-700'
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {reflection.metadata?.mood && (
                <MoodIndicator mood={reflection.metadata.mood} size={12} showTooltip={false} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ReflectionTimeBrowser({
  currentDate,
  onDateChange,
  isDark,
  showSearch = true,
  className,
}: ReflectionTimeBrowserProps) {
  const [years, setYears] = useState<YearSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Reflection[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  // Get current year from currentDate
  const currentYear = parseInt(currentDate.split('-')[0], 10)

  // Load years on mount
  useEffect(() => {
    setIsLoading(true)
    getReflectionYears()
      .then(setYears)
      .finally(() => setIsLoading(false))
  }, [])

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null)
      return
    }

    setIsSearching(true)
    try {
      const results = await searchReflections(query)
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className={cn('px-3 py-2 border-b', isDark ? 'border-zinc-800' : 'border-zinc-200')}>
        <h3 className={cn('text-[10px] font-medium uppercase tracking-wide', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          Reflections
        </h3>
      </div>

      {/* Search */}
      {showSearch && (
        <div className={cn('px-3 py-2 border-b', isDark ? 'border-zinc-800' : 'border-zinc-200')}>
          <div className="relative">
            <Search
              className={cn(
                'absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}
            />
            <input
              type="text"
              placeholder="Search reflections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border transition-colors',
                isDark
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:border-purple-500'
                  : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-purple-500',
                'outline-none'
              )}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto px-2 py-2">
        {isLoading ? (
          <div className={cn('py-4 text-center text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            Loading reflections...
          </div>
        ) : searchResults !== null ? (
          isSearching ? (
            <div className={cn('py-4 text-center text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              Searching...
            </div>
          ) : (
            <SearchResults
              results={searchResults}
              query={searchQuery}
              currentDate={currentDate}
              onDateChange={onDateChange}
              onClear={() => {
                setSearchQuery('')
                setSearchResults(null)
              }}
              isDark={isDark}
            />
          )
        ) : years.length > 0 ? (
          <div className="space-y-2">
            {years.map((year) => (
              <YearItem
                key={year.year}
                year={year}
                currentDate={currentDate}
                onDateChange={onDateChange}
                isDark={isDark}
                defaultOpen={year.year === currentYear}
              />
            ))}
          </div>
        ) : (
          <div className={cn('py-4 text-center text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            No reflections yet. Start your first one today!
          </div>
        )}
      </div>
    </div>
  )
}
