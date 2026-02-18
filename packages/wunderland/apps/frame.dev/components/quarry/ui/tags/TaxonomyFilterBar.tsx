/**
 * TaxonomyFilterBar - Unified tabbed dropdown for subjects/topics/tags/date
 * @module codex/ui/TaxonomyFilterBar
 *
 * @description
 * Single dropdown with tabbed navigation combining:
 * - Subjects with autocomplete
 * - Topics with autocomplete
 * - Tags with autocomplete (document-level)
 * - Block Tags with autocomplete (block-level - Phase 9)
 * - Date calendar picker
 */

'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder,
  BookOpen,
  Tag,
  Tags,
  Calendar,
  X,
  ChevronDown,
  Check,
  Plus,
  Filter,
  Search,
  Layers,
  Sparkles,
} from 'lucide-react'
import { createPortal } from 'react-dom'
import CalendarFilterWidget from '../widgets/CalendarFilterWidget'
import type { DateFilter, DateIndex } from '../../types'

interface TaxonomyFilterBarProps {
  // Subjects
  availableSubjects?: string[]
  selectedSubjects?: string[]
  onSubjectsChange?: (subjects: string[]) => void

  // Topics
  availableTopics?: string[]
  selectedTopics?: string[]
  onTopicsChange?: (topics: string[]) => void

  // Tags (document-level)
  availableTags?: string[]
  selectedTags?: string[]
  onTagsChange?: (tags: string[]) => void

  // Block Tags (Phase 9 - block-level tags)
  availableBlockTags?: string[]
  selectedBlockTags?: string[]
  onBlockTagsChange?: (tags: string[]) => void
  blockTagCounts?: Map<string, number>
  showBlockTags?: boolean

  // Calendar - supports date ranges
  showCalendar?: boolean
  dateFilter?: DateFilter
  onDateFilterChange?: (filter: DateFilter) => void
  dateIndex?: DateIndex

  // Legacy single-date support (deprecated, use dateFilter instead)
  selectedDate?: Date | null
  onDateChange?: (date: Date | null) => void

  // Theme
  theme?: string
  compact?: boolean

  // Tags index for counts (optional)
  tagsIndex?: {
    subjects?: Array<{ name: string; count: number }>
    topics?: Array<{ name: string; count: number }>
    tags?: Array<{ name: string; count: number }>
    blockTags?: Array<{ name: string; count: number }>
  }
}

type TabType = 'subjects' | 'topics' | 'tags' | 'blockTags' | 'date'

export default function TaxonomyFilterBar({
  availableSubjects = [],
  selectedSubjects = [],
  onSubjectsChange,
  availableTopics = [],
  selectedTopics = [],
  onTopicsChange,
  availableTags = [],
  selectedTags = [],
  onTagsChange,
  // Block tags (Phase 9)
  availableBlockTags = [],
  selectedBlockTags = [],
  onBlockTagsChange,
  blockTagCounts,
  showBlockTags = false,
  showCalendar = false,
  dateFilter,
  onDateFilterChange,
  dateIndex,
  // Legacy props - convert to dateFilter internally
  selectedDate,
  onDateChange,
  theme = 'light',
  compact = true,
  tagsIndex
}: TaxonomyFilterBarProps) {
  // Convert legacy single-date to DateFilter if needed
  const effectiveDateFilter: DateFilter = dateFilter ?? (
    selectedDate
      ? { mode: 'single', startDate: selectedDate.toISOString().split('T')[0] }
      : { mode: 'none' }
  )

  const handleDateFilterChange = (filter: DateFilter) => {
    if (onDateFilterChange) {
      onDateFilterChange(filter)
    } else if (onDateChange) {
      // Legacy support: convert DateFilter back to single Date
      if (filter.mode === 'none') {
        onDateChange(null)
      } else if (filter.startDate) {
        onDateChange(new Date(filter.startDate + 'T00:00:00'))
      }
    }
  }
  const isDark = theme?.includes('dark')
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('tags')
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

  // Calculate total active filters (including block tags)
  const totalFilters = selectedSubjects.length + selectedTopics.length + selectedTags.length + selectedBlockTags.length + (effectiveDateFilter.mode !== 'none' ? 1 : 0)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Check if click is inside the portal dropdown
        const dropdown = document.getElementById('taxonomy-filter-dropdown')
        if (dropdown && dropdown.contains(e.target as Node)) return
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: Math.max(rect.width, 320)
      })
    }
  }, [isOpen])

  // Focus input when opening or switching tabs
  useEffect(() => {
    if (isOpen && activeTab !== 'date') {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen, activeTab])

  // Reset query when switching tabs
  useEffect(() => {
    setQuery('')
  }, [activeTab])

  // Deduplicate taxonomy across levels: Subjects > Topics > Tags
  // A term should only appear at its highest level (if "react" is a Subject, it shouldn't appear in Topics or Tags)
  const deduplicatedTaxonomy = useMemo(() => {
    // Normalize for comparison (lowercase, trim)
    const normalize = (s: string) => s.toLowerCase().trim()

    // Build sets for efficient lookup
    const subjectSet = new Set(availableSubjects.map(normalize))
    const topicSet = new Set(availableTopics.map(normalize))

    // Topics: exclude items that exist in Subjects
    const deduplicatedTopics = availableTopics.filter(topic => !subjectSet.has(normalize(topic)))

    // Tags: exclude items that exist in Subjects OR Topics
    const deduplicatedTags = (availableTags || []).filter(tag => {
      const normalizedTag = normalize(tag)
      return !subjectSet.has(normalizedTag) && !topicSet.has(normalizedTag)
    })

    return {
      subjects: availableSubjects, // Subjects unchanged (highest level)
      topics: deduplicatedTopics,
      tags: deduplicatedTags,
    }
  }, [availableSubjects, availableTopics, availableTags])

  // Tab configuration - ordered from most specific to broadest:
  // Tags (most granular) → Topics (secondary) → Subjects (highest level)
  const tabs: { key: TabType; label: string; icon: React.ComponentType<{ className?: string }>; color: string; available: string[]; selected: string[]; onChange?: (items: string[]) => void; isBlockLevel?: boolean }[] = [
    { key: 'tags', label: 'Tags', icon: Tag, color: 'cyan', available: deduplicatedTaxonomy.tags, selected: selectedTags, onChange: onTagsChange },
    { key: 'topics', label: 'Topics', icon: BookOpen, color: 'amber', available: deduplicatedTaxonomy.topics, selected: selectedTopics, onChange: onTopicsChange },
    { key: 'subjects', label: 'Subjects', icon: Folder, color: 'purple', available: deduplicatedTaxonomy.subjects, selected: selectedSubjects, onChange: onSubjectsChange },
  ]

  // Add block tags tab if enabled (Phase 9)
  if (showBlockTags && availableBlockTags.length > 0) {
    tabs.push({
      key: 'blockTags',
      label: 'Block Tags',
      icon: Layers,
      color: 'rose',
      available: availableBlockTags,
      selected: selectedBlockTags,
      onChange: onBlockTagsChange,
      isBlockLevel: true,
    })
  }

  if (showCalendar) {
    tabs.push({ key: 'date', label: 'Date', icon: Calendar, color: 'emerald', available: [], selected: effectiveDateFilter.mode !== 'none' ? ['1'] : [], onChange: undefined })
  }

  // Get current tab config
  const currentTab = tabs.find(t => t.key === activeTab) || tabs[0]

  // Filter items based on query for current tab
  const filteredItems = useMemo(() => {
    if (activeTab === 'date') return []
    const items = currentTab.available
    const selected = currentTab.selected
    if (!query) return items.filter(i => !selected.includes(i)).slice(0, 12)
    const lower = query.toLowerCase()
    return items
      .filter(i => i.toLowerCase().includes(lower) && !selected.includes(i))
      .slice(0, 12)
  }, [activeTab, currentTab.available, currentTab.selected, query])

  const handleAdd = (item: string) => {
    currentTab.onChange?.([...currentTab.selected, item])
    setQuery('')
  }

  const handleRemove = (item: string, tab: typeof tabs[0]) => {
    tab.onChange?.(tab.selected.filter(i => i !== item))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim() && filteredItems.length > 0) {
      handleAdd(filteredItems[0])
    }
    if (e.key === 'Escape') {
      setIsOpen(false)
      setQuery('')
    }
  }

  const handleClearAll = () => {
    onSubjectsChange?.([])
    onTopicsChange?.([])
    onTagsChange?.([])
    onBlockTagsChange?.([])
    handleDateFilterChange({ mode: 'none' })
  }

  // Color utilities
  const getColorClasses = (color: string, isActive: boolean = false) => {
    const colors: Record<string, { bg: string; text: string; border: string; pill: string; activeBg: string }> = {
      purple: {
        bg: isDark ? 'bg-purple-900/20' : 'bg-purple-50',
        text: isDark ? 'text-purple-400' : 'text-purple-700',
        border: isDark ? 'border-purple-700/50' : 'border-purple-200',
        pill: isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700',
        activeBg: isDark ? 'bg-purple-900/40' : 'bg-purple-100',
      },
      amber: {
        bg: isDark ? 'bg-amber-900/20' : 'bg-amber-50',
        text: isDark ? 'text-amber-400' : 'text-amber-700',
        border: isDark ? 'border-amber-700/50' : 'border-amber-200',
        pill: isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700',
        activeBg: isDark ? 'bg-amber-900/40' : 'bg-amber-100',
      },
      cyan: {
        bg: isDark ? 'bg-cyan-900/20' : 'bg-cyan-50',
        text: isDark ? 'text-cyan-400' : 'text-cyan-700',
        border: isDark ? 'border-cyan-700/50' : 'border-cyan-200',
        pill: isDark ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-100 text-cyan-700',
        activeBg: isDark ? 'bg-cyan-900/40' : 'bg-cyan-100',
      },
      emerald: {
        bg: isDark ? 'bg-emerald-900/20' : 'bg-emerald-50',
        text: isDark ? 'text-emerald-400' : 'text-emerald-700',
        border: isDark ? 'border-emerald-700/50' : 'border-emerald-200',
        pill: isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700',
        activeBg: isDark ? 'bg-emerald-900/40' : 'bg-emerald-100',
      },
      // Block tags color (Phase 9)
      rose: {
        bg: isDark ? 'bg-rose-900/20' : 'bg-rose-50',
        text: isDark ? 'text-rose-400' : 'text-rose-700',
        border: isDark ? 'border-rose-700/50' : 'border-rose-200',
        pill: isDark ? 'bg-rose-900/50 text-rose-300' : 'bg-rose-100 text-rose-700',
        activeBg: isDark ? 'bg-rose-900/40' : 'bg-rose-100',
      },
    }
    return colors[color] || colors.cyan
  }

  // Dropdown content (will be portaled)
  const dropdownContent = isOpen && (
    <motion.div
      id="taxonomy-filter-dropdown"
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`
        fixed rounded-xl shadow-2xl overflow-hidden
        ${isDark ? 'bg-zinc-900 border border-zinc-700' : 'bg-white border border-zinc-200'}
      `}
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 99999,
        maxHeight: 'calc(100vh - 200px)',
      }}
    >
      {/* Tab Navigation */}
      <div className={`flex border-b ${isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-100 bg-zinc-50/50'}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const colors = getColorClasses(tab.color, activeTab === tab.key)
          const count = tab.key === 'date' ? (selectedDate ? 1 : 0) : tab.selected.length
          const isBlockLevel = 'isBlockLevel' in tab && tab.isBlockLevel

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium
                transition-all duration-150 relative
                ${activeTab === tab.key
                  ? colors.text + ' ' + colors.activeBg
                  : isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
                }
              `}
              title={isBlockLevel ? 'Block-level tags (content within documents)' : undefined}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              {/* Block-level indicator */}
              {isBlockLevel && (
                <span className={`
                  hidden sm:inline-flex items-center px-1 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider
                  ${isDark ? 'bg-rose-900/40 text-rose-400' : 'bg-rose-100 text-rose-600'}
                `}>
                  <Sparkles className="w-2 h-2 mr-0.5" />
                  New
                </span>
              )}
              {count > 0 && (
                <span className={`
                  min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center
                  ${colors.pill}
                `}>
                  {count}
                </span>
              )}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full ${colors.text.replace('text-', 'bg-')}`}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="p-3">
        <AnimatePresence mode="wait">
          {activeTab === 'date' ? (
            /* Date Tab Content - Now with CalendarFilterWidget for date ranges */
            <motion.div
              key="date"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-2"
            >
              <CalendarFilterWidget
                value={effectiveDateFilter}
                onChange={handleDateFilterChange}
                dateIndex={dateIndex}
              />
            </motion.div>
          ) : (
            /* Items Tab Content (Subjects/Topics/Tags) */
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-2"
            >
              {/* Search Input */}
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Search ${currentTab.label.toLowerCase()}...`}
                  className={`
                    w-full pl-9 pr-3 py-2 rounded-lg text-sm
                    ${isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
                    }
                    border focus:outline-none focus:ring-2 focus:ring-${currentTab.color}-500/30
                  `}
                />
              </div>

              {/* Selected Items */}
              {currentTab.selected.length > 0 && (
                <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
                  <div className="flex flex-wrap gap-1.5">
                    {currentTab.selected.map(item => {
                      const colors = getColorClasses(currentTab.color)
                      return (
                        <span
                          key={item}
                          className={`
                            inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                            ${colors.pill}
                          `}
                        >
                          {item}
                          <button
                            onClick={() => handleRemove(item, currentTab)}
                            className="hover:opacity-70"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Available Items */}
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {filteredItems.length === 0 ? (
                  <div className={`py-6 text-center text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {query ? `No ${currentTab.label.toLowerCase()} matching "${query}"` : `No ${currentTab.label.toLowerCase()} available`}
                  </div>
                ) : (
                  filteredItems.map(item => {
                    const Icon = currentTab.icon
                    const colors = getColorClasses(currentTab.color)
                    return (
                      <button
                        key={item}
                        onClick={() => handleAdd(item)}
                        className={`
                          w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm rounded-lg
                          ${isDark ? 'hover:bg-zinc-800 text-zinc-200' : 'hover:bg-zinc-50 text-zinc-700'}
                          transition-colors group
                        `}
                      >
                        <Icon className={`w-3.5 h-3.5 ${colors.text} opacity-60 group-hover:opacity-100`} />
                        <span className="flex-1 truncate">{item}</span>
                        <Plus className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-60 ${colors.text}`} />
                      </button>
                    )
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {totalFilters > 0 && (
        <div className={`px-3 py-2 border-t ${isDark ? 'border-zinc-700 bg-zinc-800/30' : 'border-zinc-100 bg-zinc-50/50'}`}>
          <button
            onClick={handleClearAll}
            className={`
              w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium
              ${isDark
                ? 'text-rose-400 hover:bg-rose-900/30'
                : 'text-rose-600 hover:bg-rose-50'
              }
              transition-colors
            `}
          >
            <X className="w-3.5 h-3.5" />
            Clear all filters ({totalFilters})
          </button>
        </div>
      )}
    </motion.div>
  )

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1 px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-lg w-full
          transition-all duration-200
          ${isDark
            ? 'bg-zinc-800/60 border border-zinc-700/60 hover:bg-zinc-800'
            : 'bg-white/80 border border-zinc-200/60 hover:bg-white'
          }
          ${isOpen ? 'ring-2 ring-cyan-500/30' : ''}
        `}
      >
        <Filter className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 flex-shrink-0 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />

        {/* Preview of selected filters */}
        <div className="flex-1 flex items-center gap-1.5 min-w-0 overflow-hidden">
          {totalFilters > 0 ? (
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {/* Show first few selected items (including block tags) */}
              {[
                ...selectedSubjects.slice(0, 1),
                ...selectedTopics.slice(0, 1),
                ...selectedTags.slice(0, 1),
                ...selectedBlockTags.slice(0, 1),
              ].map((item, i) => {
                const isSubject = selectedSubjects.includes(item)
                const isTopic = selectedTopics.includes(item)
                const isBlockTag = selectedBlockTags.includes(item)
                const color = isSubject ? 'purple' : isTopic ? 'amber' : isBlockTag ? 'rose' : 'cyan'
                const colors = getColorClasses(color)
                return (
                  <span
                    key={`${item}-${i}`}
                    className={`
                      inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium
                      whitespace-nowrap ${colors.pill}
                    `}
                  >
                    {/* Show layers icon for block tags */}
                    {isBlockTag && <Layers className="w-2 h-2" />}
                    {item.length > 10 ? item.slice(0, 10) + '…' : item}
                  </span>
                )
              })}
              {effectiveDateFilter.mode !== 'none' && (
                <span className={`
                  inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium
                  whitespace-nowrap ${isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}
                `}>
                  <Calendar className="w-2.5 h-2.5" />
                  {effectiveDateFilter.mode === 'single' && effectiveDateFilter.startDate
                    ? new Date(effectiveDateFilter.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : effectiveDateFilter.mode === 'range' && effectiveDateFilter.startDate && effectiveDateFilter.endDate
                      ? `${new Date(effectiveDateFilter.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(effectiveDateFilter.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      : 'Date'}
                </span>
              )}
              {totalFilters > 3 && (
                <span className={`text-[9px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  +{totalFilters - 3}
                </span>
              )}
            </div>
          ) : (
            <span className={`text-[8px] sm:text-[10px] truncate ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              <span className="sm:hidden">Filter</span>
              <span className="hidden sm:inline">Filter by subjects, topics, tags...</span>
            </span>
          )}
        </div>

        <ChevronDown className={`
          w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 flex-shrink-0 transition-transform
          ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
          ${isOpen ? 'rotate-180' : ''}
        `} />

        {/* Filter count badge */}
        {totalFilters > 0 && (
          <span className={`
            min-w-[18px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center
            ${isDark ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}
          `}>
            {totalFilters}
          </span>
        )}
      </button>

      {/* Portal the dropdown to document body for proper z-index */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {dropdownContent}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
