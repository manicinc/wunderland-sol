/**
 * Advanced Filters Panel Component
 * @module codex/ui/AdvancedFiltersPanel
 *
 * @remarks
 * A collapsible panel containing all advanced filter options:
 * - Calendar date filter
 * - Tag multi-select
 * - Subject filter
 * - Excluded paths manager
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  Tag,
  Bookmark,
  EyeOff,
  X,
  RotateCcw,
} from 'lucide-react'
import type { AdvancedFilterOptions, DateFilter, DateIndex, TagsIndex } from '../../types'
import CalendarFilterWidget from '../widgets/CalendarFilterWidget'
import TagMultiSelect from '../tags/TagMultiSelect'
import ExcludeListManager from '../misc/ExcludeListManager'

interface AdvancedFiltersPanelProps {
  /** Current filter options */
  filters: AdvancedFilterOptions
  /** Update date filter */
  onDateFilterChange: (filter: DateFilter) => void
  /** Toggle tag selection */
  onToggleTag: (tag: string) => void
  /** Set all tags */
  onSetTags: (tags: string[]) => void
  /** Set tag match mode */
  onSetTagMatchMode: (mode: 'any' | 'all') => void
  /** Toggle subject selection */
  onToggleSubject: (subject: string) => void
  /** Set all subjects */
  onSetSubjects: (subjects: string[]) => void
  /** Include a path (remove from exclusion) */
  onIncludePath: (path: string) => void
  /** Reset all filters */
  onResetAll: () => void
  /** Whether panel is open */
  isOpen: boolean
  /** Toggle panel open/closed */
  onToggle: () => void
  /** Available tags index */
  tagsIndex?: TagsIndex
  /** Date index for calendar */
  dateIndex?: DateIndex
  /** Optional class name */
  className?: string
}

/**
 * Advanced Filters Panel - Collapsible container for all filter options
 *
 * @example
 * ```tsx
 * <AdvancedFiltersPanel
 *   filters={advancedFilters}
 *   onDateFilterChange={setDateFilter}
 *   onToggleTag={toggleTag}
 *   onResetAll={resetAllFilters}
 *   isOpen={isPanelOpen}
 *   onToggle={togglePanel}
 *   tagsIndex={tagsIndex}
 * />
 * ```
 */
export default function AdvancedFiltersPanel({
  filters,
  onDateFilterChange,
  onToggleTag,
  onSetTags,
  onSetTagMatchMode,
  onToggleSubject,
  onSetSubjects,
  onIncludePath,
  onResetAll,
  isOpen,
  onToggle,
  tagsIndex,
  dateIndex,
  className = '',
}: AdvancedFiltersPanelProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Count active filters for section badges
  const hasDateFilter = filters.dateFilter.mode !== 'none'
  const hasTagFilter = filters.selectedTags.length > 0
  const hasSubjectFilter = filters.selectedSubjects.length > 0
  const hasExclusions = filters.excludedPaths.length > 0
  const totalActive = [hasDateFilter, hasTagFilter, hasSubjectFilter, hasExclusions].filter(Boolean).length

  return (
    <div className={`border-b border-zinc-200 dark:border-zinc-700 ${className}`}>
      {/* Toggle header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
            Advanced Filters
          </span>
          {totalActive > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
              {totalActive}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {/* Date Filter Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-zinc-500" />
                    <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
                      Date
                    </span>
                    {hasDateFilter && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                    )}
                  </div>
                  {hasDateFilter && (
                    <button
                      onClick={() => onDateFilterChange({ mode: 'none' })}
                      className="text-[9px] text-zinc-500 hover:text-red-500 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <CalendarFilterWidget
                  value={filters.dateFilter}
                  onChange={onDateFilterChange}
                  dateIndex={dateIndex}
                  isOpen={calendarOpen}
                  onToggle={() => setCalendarOpen(!calendarOpen)}
                  compact
                />
              </div>

              {/* Tags Filter Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-zinc-500" />
                    <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
                      Tags
                    </span>
                    {hasTagFilter && (
                      <span className="px-1 text-[9px] text-cyan-600 dark:text-cyan-400">
                        {filters.selectedTags.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {hasTagFilter && (
                      <>
                        <button
                          onClick={() => onSetTagMatchMode(filters.tagMatchMode === 'any' ? 'all' : 'any')}
                          className={`px-1 py-0.5 text-[8px] rounded border transition-colors ${
                            filters.tagMatchMode === 'all'
                              ? 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300'
                              : 'border-zinc-300 dark:border-zinc-600 text-zinc-500'
                          }`}
                          title={filters.tagMatchMode === 'any' ? 'Match ANY tag (OR)' : 'Match ALL tags (AND)'}
                        >
                          {filters.tagMatchMode === 'any' ? 'OR' : 'AND'}
                        </button>
                        <button
                          onClick={() => onSetTags([])}
                          className="text-[9px] text-zinc-500 hover:text-red-500 transition-colors"
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <TagMultiSelect
                  selectedTags={filters.selectedTags}
                  availableTags={tagsIndex?.tags || []}
                  onToggleTag={onToggleTag}
                  compact
                />
              </div>

              {/* Subjects Filter Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Bookmark className="w-3 h-3 text-zinc-500" />
                    <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
                      Subjects
                    </span>
                    {hasSubjectFilter && (
                      <span className="px-1 text-[9px] text-cyan-600 dark:text-cyan-400">
                        {filters.selectedSubjects.length}
                      </span>
                    )}
                  </div>
                  {hasSubjectFilter && (
                    <button
                      onClick={() => onSetSubjects([])}
                      className="text-[9px] text-zinc-500 hover:text-red-500 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <TagMultiSelect
                  selectedTags={filters.selectedSubjects}
                  availableTags={tagsIndex?.subjects || []}
                  onToggleTag={onToggleSubject}
                  compact
                  placeholder="Select subjects..."
                />
              </div>

              {/* Excluded Items Section */}
              {hasExclusions && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <EyeOff className="w-3 h-3 text-zinc-500" />
                      <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
                        Hidden
                      </span>
                      <span className="px-1 text-[9px] text-amber-600 dark:text-amber-400">
                        {filters.excludedPaths.length}
                      </span>
                    </div>
                  </div>
                  <ExcludeListManager
                    excludedPaths={filters.excludedPaths}
                    onInclude={onIncludePath}
                    compact
                  />
                </div>
              )}

              {/* Reset All Button */}
              {totalActive > 0 && (
                <button
                  onClick={onResetAll}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded
                    border border-zinc-200 dark:border-zinc-700
                    text-[10px] text-zinc-600 dark:text-zinc-400
                    hover:bg-zinc-100 dark:hover:bg-zinc-800
                    transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset All Filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
