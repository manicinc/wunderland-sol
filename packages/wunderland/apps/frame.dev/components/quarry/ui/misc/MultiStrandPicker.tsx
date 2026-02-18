/**
 * Multi-Strand Picker Modal
 * @module codex/ui/MultiStrandPicker
 *
 * A modal for selecting multiple strands for Learning Studio features:
 * - Browse and search all available strands
 * - Filter by tags, subjects, topics, and skills
 * - View selection stats and manage selections
 * - Integrates with spiral learning paths
 *
 * @remarks
 * Uses portal rendering for proper z-index layering.
 * Designed for quiz, flashcard, and glossary generation.
 */

'use client'

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Search, Tag, BookOpen, Filter, CheckSquare, Square,
  Layers, GraduationCap, ChevronDown, ChevronRight,
  Sparkles, Hash, Folder, FileText
} from 'lucide-react'
import type { StrandSummary, StrandFilters, SelectionStats } from '../../hooks/useMultiStrandContent'

// ==================== Types ====================

interface MultiStrandPickerProps {
  isOpen: boolean
  onClose: () => void
  /** All available strands */
  strands: StrandSummary[]
  /** Currently selected strand IDs */
  selectedIds: Set<string>
  /** Toggle strand selection */
  onToggle: (strand: StrandSummary) => void
  /** Select multiple strands */
  onSelectMultiple: (strands: StrandSummary[]) => void
  /** Clear all selections */
  onClear: () => void
  /** Selection stats */
  stats: SelectionStats
  /** Filter options */
  filterOptions: {
    tags: string[]
    subjects: string[]
    topics: string[]
    skills: string[]
  }
  /** Confirm and proceed */
  onConfirm: () => void
  /** Theme */
  theme?: string
  /** Title text */
  title?: string
  /** Description text */
  description?: string
}

type FilterTab = 'all' | 'tags' | 'subjects' | 'topics' | 'skills'

// ==================== Component ====================

export default function MultiStrandPicker({
  isOpen,
  onClose,
  strands,
  selectedIds,
  onToggle,
  onSelectMultiple,
  onClear,
  stats,
  filterOptions,
  onConfirm,
  theme = 'light',
  title = 'Select Strands',
  description = 'Choose strands to include in generation',
}: MultiStrandPickerProps) {
  const isDark = theme.includes('dark')
  const modalRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Track expanded weaves (collapsed by default)
  const [expandedWeaves, setExpandedWeaves] = useState<Set<string>>(new Set())

  // Mount check for portal
  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // Close on escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  // Apply filters
  const filters: StrandFilters = useMemo(() => ({
    search: searchQuery || undefined,
    tags: selectedTags.length ? selectedTags : undefined,
    subjects: selectedSubjects.length ? selectedSubjects : undefined,
    topics: selectedTopics.length ? selectedTopics : undefined,
    skills: selectedSkills.length ? selectedSkills : undefined,
    difficulty: difficulty as StrandFilters['difficulty'] || undefined,
    matchMode: 'any',
  }), [searchQuery, selectedTags, selectedSubjects, selectedTopics, selectedSkills, difficulty])

  // Filtered strands
  const filteredStrands = useMemo(() => {
    return strands.filter(strand => {
      // Search
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const matches =
          strand.title.toLowerCase().includes(q) ||
          strand.path.toLowerCase().includes(q) ||
          strand.summary?.toLowerCase().includes(q) ||
          strand.tags.some(t => t.includes(q))
        if (!matches) return false
      }

      // Difficulty
      if (filters.difficulty && strand.difficulty !== filters.difficulty) {
        return false
      }

      // Tags
      if (filters.tags?.length) {
        if (!filters.tags.some(t => strand.tags.includes(t.toLowerCase()))) {
          return false
        }
      }

      // Subjects
      if (filters.subjects?.length) {
        if (!filters.subjects.some(s => strand.subjects.some(ss => ss.toLowerCase() === s.toLowerCase()))) {
          return false
        }
      }

      // Topics
      if (filters.topics?.length) {
        if (!filters.topics.some(t => strand.topics.some(st => st.toLowerCase() === t.toLowerCase()))) {
          return false
        }
      }

      // Skills
      if (filters.skills?.length) {
        if (!filters.skills.some(s => strand.skills.some(sk => sk.toLowerCase() === s.toLowerCase()))) {
          return false
        }
      }

      return true
    })
  }, [strands, filters])

  // Group by weave (top-level fabric folder) for display
  const groupedStrands = useMemo(() => {
    const groups = new Map<string, StrandSummary[]>()

    for (const strand of filteredStrands) {
      const parts = strand.path.split('/')
      // Use only the first part (weave/fabric) as the group
      const weave = parts.length > 0 ? parts[0] : 'Root'

      if (!groups.has(weave)) {
        groups.set(weave, [])
      }
      groups.get(weave)!.push(strand)
    }

    // Sort weaves and strands within
    const sorted = Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weave, items]) => ({
        weave,
        strands: items.sort((a, b) => a.title.localeCompare(b.title)),
      }))

    return sorted
  }, [filteredStrands])

  // Toggle weave expansion
  const toggleWeaveExpand = useCallback((weave: string) => {
    setExpandedWeaves(prev => {
      const next = new Set(prev)
      if (next.has(weave)) {
        next.delete(weave)
      } else {
        next.add(weave)
      }
      return next
    })
  }, [])

  // Toggle all strands in a weave
  const toggleWeaveSelection = useCallback((weaveStrands: StrandSummary[]) => {
    const allSelected = weaveStrands.every(s => selectedIds.has(s.id))
    if (allSelected) {
      // Deselect all in weave - need to call onToggle for each
      weaveStrands.forEach(s => {
        if (selectedIds.has(s.id)) onToggle(s)
      })
    } else {
      // Select all in weave that aren't already selected
      const toSelect = weaveStrands.filter(s => !selectedIds.has(s.id))
      onSelectMultiple(toSelect)
    }
  }, [selectedIds, onToggle, onSelectMultiple])

  // Select all filtered
  const selectAllFiltered = useCallback(() => {
    onSelectMultiple(filteredStrands)
  }, [filteredStrands, onSelectMultiple])

  // Toggle filter tag
  const toggleFilterTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }, [])

  const toggleFilterSubject = useCallback((subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    )
  }, [])

  const toggleFilterTopic = useCallback((topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    )
  }, [])

  const toggleFilterSkill = useCallback((skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    )
  }, [])

  const clearAllFilters = useCallback(() => {
    setSearchQuery('')
    setSelectedTags([])
    setSelectedSubjects([])
    setSelectedTopics([])
    setSelectedSkills([])
    setDifficulty(null)
  }, [])

  const activeFiltersCount = 
    selectedTags.length + 
    selectedSubjects.length + 
    selectedTopics.length + 
    selectedSkills.length +
    (difficulty ? 1 : 0)

  // Styles
  const modalBg = isDark ? 'bg-zinc-900' : 'bg-white'
  const borderColor = isDark ? 'border-zinc-800' : 'border-zinc-200'
  const textPrimary = isDark ? 'text-zinc-100' : 'text-zinc-900'
  const textSecondary = isDark ? 'text-zinc-400' : 'text-zinc-500'
  const inputBg = isDark ? 'bg-zinc-800' : 'bg-zinc-50'
  const hoverBg = isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
  const selectedBg = isDark ? 'bg-cyan-900/30' : 'bg-cyan-50'
  const accentColor = isDark ? 'text-cyan-400' : 'text-cyan-600'

  if (!isMounted || !isOpen) return null

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`
              relative w-full max-w-4xl max-h-[85vh] rounded-xl shadow-2xl
              ${modalBg} ${textPrimary} border ${borderColor}
              flex flex-col overflow-hidden
              ${isDark ? 'shadow-cyan-900/10' : 'shadow-cyan-400/20'}
            `}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${borderColor}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-cyan-900/30' : 'bg-cyan-50'}`}>
                  <Layers className={`w-5 h-5 ${accentColor}`} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{title}</h2>
                  <p className={`text-sm ${textSecondary}`}>{description}</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${hoverBg}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Filters Bar */}
            <div className={`px-6 py-3 border-b ${borderColor} space-y-3`}>
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search strands..."
                    className={`
                      w-full pl-10 pr-4 py-2 rounded-lg border ${borderColor} ${inputBg}
                      focus:outline-none focus:ring-2 focus:ring-cyan-500
                      placeholder:${textSecondary}
                    `}
                  />
                </div>

                {/* Filter toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors
                    ${showFilters
                      ? `${selectedBg} border-cyan-500 ${accentColor}`
                      : `${borderColor} ${hoverBg}`
                    }
                  `}
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className={`
                      px-1.5 py-0.5 text-xs rounded-full
                      ${isDark ? 'bg-cyan-600 text-white' : 'bg-cyan-600 text-white'}
                    `}>
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                {/* Quick actions */}
                <button
                  onClick={selectAllFiltered}
                  className={`px-4 py-2 rounded-lg border ${borderColor} ${hoverBg} text-sm`}
                >
                  Select All ({filteredStrands.length})
                </button>

                <button
                  onClick={onClear}
                  disabled={selectedIds.size === 0}
                  className={`
                    px-4 py-2 rounded-lg border text-sm transition-colors
                    ${selectedIds.size > 0
                      ? `${borderColor} ${hoverBg}`
                      : 'border-zinc-300 text-zinc-400 cursor-not-allowed'
                    }
                  `}
                >
                  Clear
                </button>
              </div>

              {/* Expandable Filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className={`pt-3 border-t ${borderColor} space-y-4`}>
                      {/* Filter tabs */}
                      <div className="flex gap-2 flex-wrap">
                        {(['all', 'tags', 'subjects', 'topics', 'skills'] as FilterTab[]).map(tab => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`
                              px-3 py-1.5 rounded-md text-sm transition-colors capitalize
                              ${activeTab === tab
                                ? `${selectedBg} ${accentColor} font-medium`
                                : `${hoverBg} ${textSecondary}`
                              }
                            `}
                          >
                            {tab === 'all' ? 'All Filters' : tab}
                            {tab === 'tags' && selectedTags.length > 0 && ` (${selectedTags.length})`}
                            {tab === 'subjects' && selectedSubjects.length > 0 && ` (${selectedSubjects.length})`}
                            {tab === 'topics' && selectedTopics.length > 0 && ` (${selectedTopics.length})`}
                            {tab === 'skills' && selectedSkills.length > 0 && ` (${selectedSkills.length})`}
                          </button>
                        ))}

                        {activeFiltersCount > 0 && (
                          <button
                            onClick={clearAllFilters}
                            className={`px-3 py-1.5 rounded-md text-sm ${textSecondary} ${hoverBg}`}
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>

                      {/* Filter pills */}
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {(activeTab === 'all' || activeTab === 'tags') && filterOptions.tags.slice(0, activeTab === 'all' ? 10 : undefined).map(tag => (
                          <button
                            key={`tag-${tag}`}
                            onClick={() => toggleFilterTag(tag)}
                            className={`
                              flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors
                              ${selectedTags.includes(tag)
                                ? `${selectedBg} ${accentColor} border border-cyan-500`
                                : `${inputBg} ${textSecondary} border ${borderColor} hover:border-cyan-400`
                              }
                            `}
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                          </button>
                        ))}

                        {(activeTab === 'all' || activeTab === 'subjects') && filterOptions.subjects.slice(0, activeTab === 'all' ? 10 : undefined).map(subject => (
                          <button
                            key={`subject-${subject}`}
                            onClick={() => toggleFilterSubject(subject)}
                            className={`
                              flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors
                              ${selectedSubjects.includes(subject)
                                ? `${selectedBg} ${accentColor} border border-cyan-500`
                                : `${inputBg} ${textSecondary} border ${borderColor} hover:border-cyan-400`
                              }
                            `}
                          >
                            <BookOpen className="w-3 h-3" />
                            {subject}
                          </button>
                        ))}

                        {(activeTab === 'all' || activeTab === 'topics') && filterOptions.topics.slice(0, activeTab === 'all' ? 10 : undefined).map(topic => (
                          <button
                            key={`topic-${topic}`}
                            onClick={() => toggleFilterTopic(topic)}
                            className={`
                              flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors
                              ${selectedTopics.includes(topic)
                                ? `${selectedBg} ${accentColor} border border-cyan-500`
                                : `${inputBg} ${textSecondary} border ${borderColor} hover:border-cyan-400`
                              }
                            `}
                          >
                            <Hash className="w-3 h-3" />
                            {topic}
                          </button>
                        ))}

                        {(activeTab === 'all' || activeTab === 'skills') && filterOptions.skills.slice(0, activeTab === 'all' ? 10 : undefined).map(skill => (
                          <button
                            key={`skill-${skill}`}
                            onClick={() => toggleFilterSkill(skill)}
                            className={`
                              flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors
                              ${selectedSkills.includes(skill)
                                ? `${selectedBg} ${accentColor} border border-cyan-500`
                                : `${inputBg} ${textSecondary} border ${borderColor} hover:border-cyan-400`
                              }
                            `}
                          >
                            <Sparkles className="w-3 h-3" />
                            {skill}
                          </button>
                        ))}

                        {/* Difficulty */}
                        {(activeTab === 'all') && (
                          <>
                            {['beginner', 'intermediate', 'advanced'].map(d => (
                              <button
                                key={`diff-${d}`}
                                onClick={() => setDifficulty(difficulty === d ? null : d)}
                                className={`
                                  flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors capitalize
                                  ${difficulty === d
                                    ? `${selectedBg} ${accentColor} border border-cyan-500`
                                    : `${inputBg} ${textSecondary} border ${borderColor} hover:border-cyan-400`
                                  }
                                `}
                              >
                                <GraduationCap className="w-3 h-3" />
                                {d}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Strand List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {groupedStrands.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Search className={`w-12 h-12 ${textSecondary} mb-4`} />
                  <p className={textSecondary}>No strands match your filters</p>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className={`mt-2 text-sm ${accentColor} hover:underline`}
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                groupedStrands.map(({ weave, strands: weaveStrands }) => {
                  const isExpanded = expandedWeaves.has(weave)
                  const selectedCount = weaveStrands.filter(s => selectedIds.has(s.id)).length
                  const allSelected = selectedCount === weaveStrands.length
                  const someSelected = selectedCount > 0 && !allSelected

                  return (
                    <div key={weave} className={`rounded-lg border ${borderColor} overflow-hidden`}>
                      {/* Weave header - clickable to select all */}
                      <div className={`flex items-center gap-2 p-3 ${hoverBg} transition-colors`}>
                        {/* Expand/collapse button */}
                        <button
                          onClick={() => toggleWeaveExpand(weave)}
                          className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors`}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>

                        {/* Weave checkbox */}
                        <button
                          onClick={() => toggleWeaveSelection(weaveStrands)}
                          className={`${allSelected ? accentColor : someSelected ? 'text-cyan-400' : textSecondary}`}
                        >
                          {allSelected ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : someSelected ? (
                            <CheckSquare className="w-5 h-5 opacity-50" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>

                        {/* Weave info */}
                        <Folder className={`w-4 h-4 ${accentColor}`} />
                        <span className="font-medium flex-1">{weave.replace(/-/g, ' ')}</span>
                        <span className={`text-sm ${textSecondary}`}>
                          {selectedCount > 0 && <span className={accentColor}>{selectedCount}/</span>}
                          {weaveStrands.length} strands
                        </span>
                      </div>

                      {/* Expanded strands */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className={`border-t ${borderColor} space-y-1 p-2`}>
                              {weaveStrands.map(strand => {
                                const isSelected = selectedIds.has(strand.id)
                                return (
                                  <button
                                    key={strand.id}
                                    onClick={() => onToggle(strand)}
                                    className={`
                                      w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors
                                      ${isSelected ? selectedBg : hoverBg}
                                      ${isSelected ? `border border-cyan-500/50` : 'border border-transparent'}
                                    `}
                                  >
                                    {/* Checkbox */}
                                    <div className={`mt-0.5 ${isSelected ? accentColor : textSecondary}`}>
                                      {isSelected ? (
                                        <CheckSquare className="w-5 h-5" />
                                      ) : (
                                        <Square className="w-5 h-5" />
                                      )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <FileText className={`w-4 h-4 ${textSecondary}`} />
                                        <span className="font-medium truncate">{strand.title}</span>
                                        {strand.difficulty && (
                                          <span className={`
                                            text-xs px-1.5 py-0.5 rounded
                                            ${strand.difficulty === 'beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}
                                            ${strand.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                                            ${strand.difficulty === 'advanced' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ''}
                                          `}>
                                            {strand.difficulty}
                                          </span>
                                        )}
                                      </div>

                                      {strand.summary && (
                                        <p className={`text-sm ${textSecondary} mt-1 line-clamp-2`}>
                                          {strand.summary}
                                        </p>
                                      )}

                                      {/* Tags */}
                                      {strand.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {strand.tags.slice(0, 5).map(tag => (
                                            <span
                                              key={tag}
                                              className={`text-xs px-1.5 py-0.5 rounded ${inputBg} ${textSecondary}`}
                                            >
                                              {tag}
                                            </span>
                                          ))}
                                          {strand.tags.length > 5 && (
                                            <span className={`text-xs ${textSecondary}`}>
                                              +{strand.tags.length - 5} more
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer with Stats */}
            <div className={`px-6 py-4 border-t ${borderColor}`}>
              <div className="flex items-center justify-between">
                {/* Selection stats */}
                <div className={`flex items-center gap-6 text-sm ${textSecondary}`}>
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" />
                    <span><strong className={textPrimary}>{stats.strandCount}</strong> strands selected</span>
                  </div>
                  {stats.uniqueTags.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      <span><strong className={textPrimary}>{stats.uniqueTags.length}</strong> unique tags</span>
                    </div>
                  )}
                  {stats.totalWords > 0 && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>~<strong className={textPrimary}>{stats.totalWords.toLocaleString()}</strong> words</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className={`px-4 py-2 rounded-lg border ${borderColor} ${hoverBg} font-medium`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onConfirm}
                    disabled={selectedIds.size === 0}
                    className={`
                      flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors
                      ${selectedIds.size > 0
                        ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                        : 'bg-zinc-200 text-zinc-500 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600'
                      }
                    `}
                  >
                    <Sparkles className="w-4 h-4" />
                    Continue with {selectedIds.size} strand{selectedIds.size !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}

