/**
 * Filter Panel Component
 * @module codex/ui/transform/FilterPanel
 *
 * Panel for filtering strands during transformation.
 * Supports tag filtering, date ranges, and text search.
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tag,
  Calendar,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Filter,
  Check,
} from 'lucide-react'
import type { TransformFilters, TagMatchMode } from '@/lib/transform/types'
import type { SelectedStrand } from '@/components/quarry/contexts/SelectedStrandsContext'

interface FilterPanelProps {
  /** Current filter configuration */
  filters: TransformFilters
  /** Called when filters change */
  onChange: (filters: TransformFilters) => void
  /** Available strands to extract tags from */
  availableStrands: SelectedStrand[]
  /** Number of strands matching current filters */
  matchingCount?: number
  /** Total number of strands */
  totalCount?: number
  /** Optional class name */
  className?: string
}

/**
 * Filter Panel - Configure strand filters for transformation
 */
export default function FilterPanel({
  filters,
  onChange,
  availableStrands,
  matchingCount,
  totalCount,
  className = '',
}: FilterPanelProps) {
  const [expandedSection, setExpandedSection] = useState<'tags' | 'date' | null>('tags')

  // Extract all unique tags from available strands
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>()
    availableStrands.forEach((strand) => {
      strand.tags?.forEach((tag) => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [availableStrands])

  const updateFilters = (updates: Partial<TransformFilters>) => {
    onChange({ ...filters, ...updates })
  }

  const toggleTag = (tag: string) => {
    const currentTags = filters.tags || []
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag]
    updateFilters({ tags: newTags.length > 0 ? newTags : undefined })
  }

  const clearAllFilters = () => {
    onChange({})
  }

  const hasActiveFilters =
    (filters.tags && filters.tags.length > 0) ||
    filters.dateRange?.start ||
    filters.dateRange?.end ||
    filters.searchQuery

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with clear button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-neutral-400" />
          <h3 className="text-sm font-medium text-neutral-400">Filters</h3>
          {matchingCount !== undefined && totalCount !== undefined && (
            <span className="text-xs text-neutral-500">
              ({matchingCount} of {totalCount} strands)
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Search Query */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          value={filters.searchQuery || ''}
          onChange={(e) =>
            updateFilters({
              searchQuery: e.target.value || undefined,
            })
          }
          placeholder="Search strands..."
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {filters.searchQuery && (
          <button
            onClick={() => updateFilters({ searchQuery: undefined })}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-neutral-700 transition-colors"
          >
            <X className="w-3 h-3 text-neutral-500" />
          </button>
        )}
      </div>

      {/* Tag Filter Section */}
      <FilterSection
        title="Tags"
        icon={Tag}
        isExpanded={expandedSection === 'tags'}
        onToggle={() => setExpandedSection(expandedSection === 'tags' ? null : 'tags')}
        badge={filters.tags?.length}
      >
        {(availableTags?.length || 0) > 0 ? (
          <>
            {/* Match Mode Toggle */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-neutral-500">Match:</span>
              <div className="flex rounded-lg bg-neutral-800 p-0.5">
                <button
                  onClick={() => updateFilters({ tagMatchMode: 'any' })}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    filters.tagMatchMode !== 'all'
                      ? 'bg-primary-600 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Any
                </button>
                <button
                  onClick={() => updateFilters({ tagMatchMode: 'all' })}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    filters.tagMatchMode === 'all'
                      ? 'bg-primary-600 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  All
                </button>
              </div>
            </div>

            {/* Tag Grid */}
            <div className="flex flex-wrap gap-1.5">
              {(availableTags || []).map((tag) => {
                const isSelected = filters.tags?.includes(tag)
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`
                      flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg
                      transition-all duration-150
                      ${
                        isSelected
                          ? 'bg-primary-600 text-white'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
                      }
                    `}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{tag}</span>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <p className="text-xs text-neutral-500 italic">
            No tags found in selected strands
          </p>
        )}
      </FilterSection>

      {/* Date Range Section */}
      <FilterSection
        title="Date Range"
        icon={Calendar}
        isExpanded={expandedSection === 'date'}
        onToggle={() => setExpandedSection(expandedSection === 'date' ? null : 'date')}
        badge={filters.dateRange?.start || filters.dateRange?.end ? 1 : undefined}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-neutral-500 mb-1.5">From</label>
            <input
              type="date"
              value={filters.dateRange?.start || ''}
              onChange={(e) =>
                updateFilters({
                  dateRange: {
                    ...filters.dateRange,
                    start: e.target.value || undefined,
                  },
                })
              }
              className="w-full px-3 py-2 text-sm rounded-lg bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1.5">To</label>
            <input
              type="date"
              value={filters.dateRange?.end || ''}
              onChange={(e) =>
                updateFilters({
                  dateRange: {
                    ...filters.dateRange,
                    end: e.target.value || undefined,
                  },
                })
              }
              className="w-full px-3 py-2 text-sm rounded-lg bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Quick Date Presets */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => updateFilters({ dateRange: preset.getRange() })}
              className="px-2.5 py-1 text-xs rounded-lg bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="pt-3 border-t border-neutral-700/50">
          <div className="flex flex-wrap gap-2">
            {filters.tags?.map((tag) => (
              <ActiveFilterChip
                key={`tag-${tag}`}
                label={tag}
                type="tag"
                onRemove={() => toggleTag(tag)}
              />
            ))}
            {filters.dateRange?.start && (
              <ActiveFilterChip
                label={`From ${filters.dateRange.start}`}
                type="date"
                onRemove={() =>
                  updateFilters({
                    dateRange: { ...filters.dateRange, start: undefined },
                  })
                }
              />
            )}
            {filters.dateRange?.end && (
              <ActiveFilterChip
                label={`To ${filters.dateRange.end}`}
                type="date"
                onRemove={() =>
                  updateFilters({
                    dateRange: { ...filters.dateRange, end: undefined },
                  })
                }
              />
            )}
            {filters.searchQuery && (
              <ActiveFilterChip
                label={`"${filters.searchQuery}"`}
                type="search"
                onRemove={() => updateFilters({ searchQuery: undefined })}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface FilterSectionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  isExpanded: boolean
  onToggle: () => void
  badge?: number
  children: React.ReactNode
}

function FilterSection({
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  badge,
  children,
}: FilterSectionProps) {
  return (
    <div className="rounded-xl border border-neutral-700 bg-neutral-800/50 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-neutral-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-neutral-400" />
          <span className="text-sm font-medium text-neutral-200">{title}</span>
          {badge !== undefined && badge > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-primary-600 text-white">
              {badge}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-neutral-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-neutral-500" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface ActiveFilterChipProps {
  label: string
  type: 'tag' | 'date' | 'search'
  onRemove: () => void
}

function ActiveFilterChip({ label, type, onRemove }: ActiveFilterChipProps) {
  const iconMap = {
    tag: Tag,
    date: Calendar,
    search: Search,
  }
  const Icon = iconMap[type]

  return (
    <span className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-primary-600/20 text-primary-400 border border-primary-600/30">
      <Icon className="w-3 h-3" />
      <span className="max-w-[100px] truncate">{label}</span>
      <button
        onClick={onRemove}
        className="p-0.5 rounded hover:bg-primary-600/30 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}

// ============================================================================
// DATE PRESETS
// ============================================================================

interface DatePreset {
  label: string
  getRange: () => { start?: string; end?: string }
}

const DATE_PRESETS: DatePreset[] = [
  {
    label: 'Today',
    getRange: () => {
      const today = new Date().toISOString().split('T')[0]
      return { start: today, end: today }
    },
  },
  {
    label: 'This Week',
    getRange: () => {
      const now = new Date()
      const start = new Date(now)
      start.setDate(now.getDate() - now.getDay())
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      }
    },
  },
  {
    label: 'This Month',
    getRange: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      }
    },
  },
  {
    label: 'Last 7 Days',
    getRange: () => {
      const now = new Date()
      const start = new Date(now)
      start.setDate(now.getDate() - 6)
      return {
        start: start.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      }
    },
  },
  {
    label: 'Last 30 Days',
    getRange: () => {
      const now = new Date()
      const start = new Date(now)
      start.setDate(now.getDate() - 29)
      return {
        start: start.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      }
    },
  },
]
