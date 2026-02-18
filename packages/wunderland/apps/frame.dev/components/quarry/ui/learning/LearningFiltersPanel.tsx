'use client'

/**
 * Learning Filters Panel - Collapsible filter section for Learning Studio
 * @module codex/ui/LearningFiltersPanel
 *
 * Provides expandable filtering UI for:
 * - Flashcards
 * - Quizzes
 * - Ask interfaces
 * - Brain Oracle
 *
 * Wraps TaxonomyFilterBar with expand/collapse functionality.
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Filter,
  ChevronDown,
  Layers,
  X,
  Tag,
  BookOpen,
  Folder,
} from 'lucide-react'
import TaxonomyFilterBar from '../tags/TaxonomyFilterBar'
import type { DateFilter } from '../../types'

export interface LearningFilters {
  tags: string[]
  subjects: string[]
  topics: string[]
  dateFilter?: DateFilter
}

interface LearningFiltersPanelProps {
  // Filter state
  selectedTags: string[]
  selectedSubjects: string[]
  selectedTopics: string[]
  dateFilter?: DateFilter

  // Available options
  availableTags: string[]
  availableSubjects: string[]
  availableTopics: string[]

  // Callbacks
  onTagsChange: (tags: string[]) => void
  onSubjectsChange: (subjects: string[]) => void
  onTopicsChange: (topics: string[]) => void
  onDateFilterChange?: (filter: DateFilter) => void
  onClearAll?: () => void

  // UI
  theme?: string
  defaultExpanded?: boolean
  showCalendar?: boolean
  compact?: boolean

  // Selection integration
  selectionCount?: number
  onViewSelection?: () => void
}

export default function LearningFiltersPanel({
  selectedTags = [],
  selectedSubjects = [],
  selectedTopics = [],
  dateFilter,
  availableTags = [],
  availableSubjects = [],
  availableTopics = [],
  onTagsChange,
  onSubjectsChange,
  onTopicsChange,
  onDateFilterChange,
  onClearAll,
  theme = 'light',
  defaultExpanded = false,
  showCalendar = false,
  compact = false,
  selectionCount = 0,
  onViewSelection,
}: LearningFiltersPanelProps) {
  const isDark = theme?.includes('dark')
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Calculate total active filters
  const totalFilters = selectedTags.length + selectedSubjects.length + selectedTopics.length +
    (dateFilter?.mode !== 'none' && dateFilter?.mode !== undefined ? 1 : 0)

  const handleClearAll = () => {
    onTagsChange([])
    onSubjectsChange([])
    onTopicsChange([])
    onDateFilterChange?.({ mode: 'none' })
    onClearAll?.()
  }

  return (
    <div className={`
      rounded-xl overflow-hidden transition-all
      ${isDark
        ? 'bg-zinc-800/50 border border-zinc-700/50'
        : 'bg-zinc-50 border border-zinc-200/50'
      }
    `}>
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full flex items-center gap-3 px-4 py-3 transition-colors
          ${isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-100'}
        `}
      >
        <div className={`
          p-1.5 rounded-lg
          ${totalFilters > 0 || selectionCount > 0
            ? isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
            : isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-500'
          }
        `}>
          <Filter className="w-4 h-4" />
        </div>

        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
              Filters & Selection
            </span>

            {/* Active filter badges */}
            <div className="flex items-center gap-1.5">
              {totalFilters > 0 && (
                <span className={`
                  px-1.5 py-0.5 rounded text-[10px] font-bold
                  ${isDark ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}
                `}>
                  {totalFilters} filter{totalFilters !== 1 ? 's' : ''}
                </span>
              )}
              {selectionCount > 0 && (
                <span className={`
                  px-1.5 py-0.5 rounded text-[10px] font-bold
                  ${isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'}
                `}>
                  {selectionCount} strand{selectionCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Preview of active filters when collapsed */}
          {!isExpanded && (totalFilters > 0 || selectionCount > 0) && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {selectedSubjects.slice(0, 2).map(s => (
                <span key={s} className={`
                  inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium
                  ${isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'}
                `}>
                  <Folder className="w-2.5 h-2.5" />
                  {s}
                </span>
              ))}
              {selectedTopics.slice(0, 2).map(t => (
                <span key={t} className={`
                  inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium
                  ${isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700'}
                `}>
                  <BookOpen className="w-2.5 h-2.5" />
                  {t}
                </span>
              ))}
              {selectedTags.slice(0, 2).map(t => (
                <span key={t} className={`
                  inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium
                  ${isDark ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}
                `}>
                  <Tag className="w-2.5 h-2.5" />
                  {t}
                </span>
              ))}
              {(selectedSubjects.length + selectedTopics.length + selectedTags.length) > 6 && (
                <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  +{selectedSubjects.length + selectedTopics.length + selectedTags.length - 6} more
                </span>
              )}
            </div>
          )}
        </div>

        <ChevronDown className={`
          w-4 h-4 transition-transform
          ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
          ${isExpanded ? 'rotate-180' : ''}
        `} />
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={`px-4 pb-4 pt-2 border-t ${isDark ? 'border-zinc-700/50' : 'border-zinc-200/50'}`}>
              {/* Selection Indicator */}
              {selectionCount > 0 && (
                <div className={`
                  flex items-center justify-between p-3 rounded-lg mb-3
                  ${isDark ? 'bg-purple-900/20 border border-purple-700/30' : 'bg-purple-50 border border-purple-200'}
                `}>
                  <div className="flex items-center gap-2">
                    <Layers className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    <span className={`text-sm font-medium ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                      {selectionCount} strand{selectionCount !== 1 ? 's' : ''} selected in sidebar
                    </span>
                  </div>
                  {onViewSelection && (
                    <button
                      onClick={onViewSelection}
                      className={`
                        text-xs font-medium px-2 py-1 rounded transition-colors
                        ${isDark
                          ? 'text-purple-400 hover:bg-purple-800/30'
                          : 'text-purple-600 hover:bg-purple-100'
                        }
                      `}
                    >
                      View
                    </button>
                  )}
                </div>
              )}

              {/* Taxonomy Filter Bar */}
              <TaxonomyFilterBar
                availableSubjects={availableSubjects}
                selectedSubjects={selectedSubjects}
                onSubjectsChange={onSubjectsChange}
                availableTopics={availableTopics}
                selectedTopics={selectedTopics}
                onTopicsChange={onTopicsChange}
                availableTags={availableTags}
                selectedTags={selectedTags}
                onTagsChange={onTagsChange}
                showCalendar={showCalendar}
                dateFilter={dateFilter}
                onDateFilterChange={onDateFilterChange}
                theme={theme}
                compact={compact}
              />

              {/* Clear All Button */}
              {totalFilters > 0 && (
                <button
                  onClick={handleClearAll}
                  className={`
                    mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg
                    text-xs font-medium transition-colors
                    ${isDark
                      ? 'text-rose-400 hover:bg-rose-900/20'
                      : 'text-rose-600 hover:bg-rose-50'
                    }
                  `}
                >
                  <X className="w-3.5 h-3.5" />
                  Clear all filters ({totalFilters})
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
