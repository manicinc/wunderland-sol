/**
 * Advanced search bar with filter options for Quarry Codex
 * @module codex/ui/SearchBar
 * 
 * @remarks
 * Comprehensive search with advanced filters:
 * - Difficulty level (beginner, intermediate, advanced)
 * - Tags filter with autocomplete
 * - Subject filter
 * - Content type filter
 * - Regex mode with presets
 * - Full-text search
 */

'use client'

import {
  Search, SlidersHorizontal, X, Regex, Sparkles, Hash, FileCode, Tag, Braces,
  ChevronDown, GraduationCap, Folder, Layers, Plus, CheckCircle, RotateCcw, Filter
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useCallback, useMemo } from 'react'
import type { SearchOptions, SupertagFieldFilter } from '../../types'
import type { SupertagSchema } from '@/lib/supertags/types'

// Difficulty levels
const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Beginner', color: 'emerald' },
  { value: 'intermediate', label: 'Intermediate', color: 'amber' },
  { value: 'advanced', label: 'Advanced', color: 'red' },
] as const

// Content types
const CONTENT_TYPES = [
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'guide', label: 'Guide' },
  { value: 'reference', label: 'Reference' },
  { value: 'concept', label: 'Concept' },
  { value: 'example', label: 'Example' },
  { value: 'api', label: 'API Docs' },
] as const

// Regex presets for common search patterns
const REGEX_PRESETS = [
  {
    name: 'Code Blocks',
    icon: FileCode,
    pattern: '```[\\w]*[\\s\\S]*?```',
    description: 'Find code blocks in markdown',
    category: 'content',
  },
  {
    name: 'URLs',
    icon: Hash,
    pattern: 'https?://[\\w\\d\\-._~:/?#\\[\\]@!$&\'()*+,;=%]+',
    description: 'Find web links and URLs',
    category: 'content',
  },
  {
    name: 'Headers',
    icon: Hash,
    pattern: '^#{1,6}\\s+.+$',
    description: 'Find markdown headings (# to ######)',
    category: 'content',
  },
  {
    name: 'Tags',
    icon: Tag,
    pattern: '@[\\w-]+|#[\\w-]+',
    description: 'Find @mentions and #hashtags',
    category: 'content',
  },
  {
    name: 'YAML Front Matter',
    icon: Braces,
    pattern: '^---[\\s\\S]*?---',
    description: 'Find YAML frontmatter blocks',
    category: 'content',
  },
  {
    name: 'TODOs',
    icon: Sparkles,
    pattern: '(TODO|FIXME|NOTE|HACK|XXX):?\\s*.*',
    description: 'Find TODO comments and notes',
    category: 'content',
  },
  {
    name: 'Dates',
    icon: Hash,
    pattern: '\\d{4}[-/]\\d{2}[-/]\\d{2}|\\d{2}[-/]\\d{2}[-/]\\d{4}',
    description: 'Find dates (YYYY-MM-DD or DD-MM-YYYY)',
    category: 'content',
  },
  {
    name: 'Emails',
    icon: Hash,
    pattern: '[\\w._%+-]+@[\\w.-]+\\.[a-zA-Z]{2,}',
    description: 'Find email addresses',
    category: 'content',
  },
]

interface SearchBarProps {
  /** Current search options */
  options: SearchOptions
  /** Update search query */
  onQueryChange: (query: string) => void
  /** Toggle search in names */
  onToggleSearchNames: () => void
  /** Toggle search in content */
  onToggleSearchContent: () => void
  /** Toggle case sensitivity */
  onToggleCaseSensitive: () => void
  /** Toggle regex mode */
  onToggleRegex?: () => void
  /** Reset all filters */
  onReset: () => void
  /** Optional ID for the input (for hotkey focus) */
  inputId?: string
  /** Optional placeholder text */
  placeholder?: string
  /** Compact mode for tighter layouts */
  compact?: boolean
  
  // Advanced filter props
  /** Set difficulty filter */
  onSetDifficulty?: (difficulty: 'beginner' | 'intermediate' | 'advanced' | undefined) => void
  /** Set tags filter */
  onSetTags?: (tags: string[]) => void
  /** Set subjects filter */
  onSetSubjects?: (subjects: string[]) => void
  /** Available tags for autocomplete */
  availableTags?: string[]
  /** Available subjects for autocomplete */
  availableSubjects?: string[]
  /** Show advanced filters section */
  showAdvancedFilters?: boolean
  
  // RAG mode props
  /** Current RAG mode */
  ragMode?: 'local' | 'rerank' | 'synthesize'
  /** Change RAG mode */
  onRAGModeChange?: (mode: 'local' | 'rerank' | 'synthesize') => void
  /** Whether RAG is available (has API keys) */
  ragAvailable?: boolean
  /** Whether RAG is loading */
  ragLoading?: boolean

  // Supertag field filter props
  /** Available supertag schemas for field filtering */
  availableSupertags?: SupertagSchema[]
  /** Set supertag field filters */
  onSetSupertagFilters?: (filters: SupertagFieldFilter[]) => void
}

/**
 * Advanced search bar with expandable filter options
 * 
 * @remarks
 * - Debounced input handled by parent hook
 * - Expandable filter panel with checkboxes
 * - Clear button when query is active
 * - Mobile-optimized with 44px touch targets
 * - Keyboard accessible (Enter to search, Esc to clear)
 * 
 * @example
 * ```tsx
 * <SearchBar
 *   options={searchOptions}
 *   onQueryChange={setQuery}
 *   onToggleSearchNames={toggleSearchNames}
 *   onToggleSearchContent={toggleSearchContent}
 *   onToggleCaseSensitive={toggleCaseSensitive}
 *   onReset={resetFilters}
 *   inputId="codex-search-input"
 *   placeholder="Search knowledge..."
 * />
 * ```
 */
export default function SearchBar({
  options,
  onQueryChange,
  onToggleSearchNames,
  onToggleSearchContent,
  onToggleCaseSensitive,
  onToggleRegex,
  onReset,
  inputId = 'codex-search-input',
  placeholder = 'Search...',
  compact = true, // Default to compact mode
  onSetDifficulty,
  onSetTags,
  onSetSubjects,
  availableTags = [],
  availableSubjects = [],
  showAdvancedFilters = true,
  ragMode = 'local',
  onRAGModeChange,
  ragAvailable = false,
  ragLoading = false,
  availableSupertags = [],
  onSetSupertagFilters,
}: SearchBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [regexPresetsOpen, setRegexPresetsOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [subjectInput, setSubjectInput] = useState('')
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false)
  // Supertag filter builder state
  const [selectedSupertag, setSelectedSupertag] = useState<string>('')
  const [selectedField, setSelectedField] = useState<string>('')
  const [selectedOperator, setSelectedOperator] = useState<SupertagFieldFilter['operator']>('=')
  const [filterValue, setFilterValue] = useState<string>('')
  
  // Filter available tags based on input
  const filteredTags = useMemo(() => {
    const tags = availableTags || []
    if (!tagInput) return tags.slice(0, 10)
    const lower = tagInput.toLowerCase()
    return tags.filter(t => t.toLowerCase().includes(lower)).slice(0, 10)
  }, [availableTags, tagInput])
  
  // Filter available subjects
  const filteredSubjects = useMemo(() => {
    if (!subjectInput) return availableSubjects.slice(0, 10)
    const lower = subjectInput.toLowerCase()
    return availableSubjects.filter(s => s.toLowerCase().includes(lower)).slice(0, 10)
  }, [availableSubjects, subjectInput])

  // Get selected supertag schema
  const selectedSupertagSchema = useMemo(() => {
    return availableSupertags.find(s => s.tagName === selectedSupertag)
  }, [availableSupertags, selectedSupertag])

  // Get fields for the selected supertag
  const selectedSupertagFields = useMemo(() => {
    if (!selectedSupertagSchema) return []
    return selectedSupertagSchema.fields || []
  }, [selectedSupertagSchema])

  // Get the selected field definition
  const selectedFieldDef = useMemo(() => {
    return selectedSupertagFields.find(f => f.name === selectedField)
  }, [selectedSupertagFields, selectedField])

  // Operators based on field type
  const availableOperators = useMemo(() => {
    if (!selectedFieldDef) return ['=', '!=', 'contains'] as const
    const type = selectedFieldDef.type
    if (type === 'number' || type === 'rating' || type === 'progress') {
      return ['=', '!=', '>', '<', '>=', '<='] as const
    }
    if (type === 'checkbox') {
      return ['='] as const
    }
    if (type === 'select' || type === 'multiselect') {
      return ['=', '!='] as const
    }
    return ['=', '!=', 'contains'] as const
  }, [selectedFieldDef])
  
  // Add tag
  const handleAddTag = useCallback((tag: string) => {
    if (onSetTags && !options.tags?.includes(tag)) {
      onSetTags([...(options.tags || []), tag])
    }
    setTagInput('')
  }, [onSetTags, options.tags])
  
  // Remove tag
  const handleRemoveTag = useCallback((tag: string) => {
    if (onSetTags) {
      onSetTags((options.tags || []).filter(t => t !== tag))
    }
  }, [onSetTags, options.tags])
  
  // Add subject  
  const handleAddSubject = useCallback((subject: string) => {
    if (onSetSubjects && !options.subjects?.includes(subject)) {
      onSetSubjects([...(options.subjects || []), subject])
    }
    setSubjectInput('')
  }, [onSetSubjects, options.subjects])
  
  // Remove subject
  const handleRemoveSubject = useCallback((subject: string) => {
    if (onSetSubjects) {
      onSetSubjects((options.subjects || []).filter(s => s !== subject))
    }
  }, [onSetSubjects, options.subjects])

  // Add supertag filter
  const handleAddSupertagFilter = useCallback(() => {
    if (!onSetSupertagFilters || !selectedSupertag || !selectedField) return

    // Parse the value based on field type
    let parsedValue: unknown = filterValue
    if (selectedFieldDef) {
      const type = selectedFieldDef.type
      if (type === 'number' || type === 'rating' || type === 'progress') {
        parsedValue = parseFloat(filterValue) || 0
      } else if (type === 'checkbox') {
        parsedValue = filterValue === 'true' || filterValue === '1'
      }
    }

    const newFilter: SupertagFieldFilter = {
      tagName: selectedSupertag,
      fieldName: selectedField,
      operator: selectedOperator,
      value: parsedValue,
    }

    onSetSupertagFilters([...(options.supertagFilters || []), newFilter])

    // Reset builder state
    setSelectedSupertag('')
    setSelectedField('')
    setSelectedOperator('=')
    setFilterValue('')
  }, [onSetSupertagFilters, selectedSupertag, selectedField, selectedOperator, filterValue, selectedFieldDef, options.supertagFilters])

  // Remove supertag filter
  const handleRemoveSupertagFilter = useCallback((index: number) => {
    if (!onSetSupertagFilters) return
    const newFilters = [...(options.supertagFilters || [])]
    newFilters.splice(index, 1)
    onSetSupertagFilters(newFilters)
  }, [onSetSupertagFilters, options.supertagFilters])

  // Format filter value for display
  const formatFilterValue = useCallback((filter: SupertagFieldFilter) => {
    if (typeof filter.value === 'boolean') {
      return filter.value ? 'Yes' : 'No'
    }
    return String(filter.value)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onReset()
      e.currentTarget.blur()
    }
  }
  
  // Apply regex preset to search
  const applyRegexPreset = useCallback((pattern: string) => {
    onQueryChange(pattern)
    // Auto-enable regex mode if available
    if (onToggleRegex && !options.useRegex) {
      onToggleRegex()
    }
    setRegexPresetsOpen(false)
  }, [onQueryChange, onToggleRegex, options.useRegex])

  // Count only non-default filter settings
  // Defaults: searchNames=true, searchContent=true, caseSensitive=false, useRegex=false
  const activeFiltersCount = [
    !options.searchNames, // Only count if names search is OFF (non-default)
    !options.searchContent, // Only count if content search is OFF (non-default)
    options.caseSensitive, // Only count if case-sensitive is ON (non-default)
    options.useRegex, // Only count if regex is ON (non-default)
    options.difficulty, // Only count if difficulty filter is set
    options.tags && options.tags.length > 0, // Only count if tags are selected
    options.subjects && options.subjects.length > 0, // Only count if subjects are selected
    options.supertagFilters && options.supertagFilters.length > 0, // Only count if supertag filters are set
  ].filter(Boolean).length

  const isExpanded = isFocused || options.query.length > 0

  return (
    <div className="space-y-1.5">
      {/* Search Input */}
      <motion.div 
        className="relative"
        animate={{ 
          scale: compact && isExpanded ? 1.02 : 1,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <Search className={`absolute left-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none transition-colors ${
          isExpanded ? 'text-cyan-500' : 'text-gray-400'
        } ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
        
        <input
          id={inputId}
          type="text"
          value={options.query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`
            w-full bg-white dark:bg-zinc-800/80 border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-cyan-500/50 dark:focus:ring-cyan-400/50 dark:text-white 
            transition-all duration-200
            /* iOS requires 16px font to prevent auto-zoom on focus */
            ${compact 
              ? 'pl-8 pr-16 py-1.5 text-[16px] sm:text-xs border-zinc-200 dark:border-zinc-700' 
              : 'pl-10 pr-24 py-2.5 text-[16px] sm:text-sm border-gray-300 dark:border-gray-700'
            }
            ${isExpanded ? 'border-cyan-300 dark:border-cyan-700 shadow-sm' : ''}
          `}
          aria-label="Search Quarry Codex"
          inputMode="search"
        />

        {/* Action Buttons - flush right in compact mode */}
        <div className={`absolute top-1/2 transform -translate-y-1/2 flex items-center ${compact ? 'right-0 gap-0.5' : 'right-2 gap-1'}`}>
          {/* Clear Query Button */}
          <AnimatePresence>
            {options.query && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => onQueryChange('')}
                className={`hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex items-center justify-center ${
                  compact ? 'p-1 min-h-[28px] min-w-[28px]' : 'p-1.5 min-h-[44px] min-w-[44px] touch-manipulation'
                }`}
                aria-label="Clear search query"
                title="Clear search query"
              >
                <X className={compact ? 'w-3 h-3 text-gray-500' : 'w-4 h-4 text-gray-500'} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Reset All Button - shows only when query has content */}
          <AnimatePresence>
            {options.query && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={onReset}
                className={`hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex items-center justify-center ${
                  compact ? 'p-1 min-h-[28px] min-w-[28px]' : 'p-1.5 min-h-[44px] min-w-[44px] touch-manipulation'
                }`}
                aria-label="Reset all filters"
                title="Reset all (Esc)"
              >
                <RotateCcw className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-gray-500 dark:text-gray-400`} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Regex Presets Toggle */}
          <button
            onClick={() => {
              setRegexPresetsOpen(!regexPresetsOpen)
              if (!regexPresetsOpen) setFiltersOpen(false)
            }}
            className={`relative rounded transition-colors flex items-center justify-center ${
              compact ? 'p-1 min-h-[28px] min-w-[28px]' : 'p-1.5 min-h-[44px] min-w-[44px] touch-manipulation'
            } ${
              regexPresetsOpen || options.useRegex
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500'
            }`}
            aria-label="Regex presets"
            aria-expanded={regexPresetsOpen}
            title="Regex presets & advanced patterns"
          >
            <Regex className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
          </button>

          {/* Filters Toggle */}
          <button
            onClick={() => {
              setFiltersOpen(!filtersOpen)
              if (!filtersOpen) setRegexPresetsOpen(false)
            }}
            className={`relative rounded transition-colors flex items-center justify-center ${
              compact ? 'p-1 min-h-[28px] min-w-[28px]' : 'p-1.5 min-h-[44px] min-w-[44px] touch-manipulation'
            } ${
              filtersOpen || activeFiltersCount > 0
                ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500'
            }`}
            aria-label="Toggle search filters"
            aria-expanded={filtersOpen}
            title="Search filters"
          >
            <SlidersHorizontal className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
          </button>
        </div>
      </motion.div>

      {/* RAG Mode Toggle */}
      {onRAGModeChange && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-gray-100 dark:bg-zinc-800">
            {[
              { id: 'local' as const, label: 'Local' },
              { id: 'rerank' as const, label: 'AI Rank', ai: true },
              { id: 'synthesize' as const, label: 'AI Answer', ai: true },
            ].map((m) => {
              const isActive = ragMode === m.id
              const disabled = m.ai && !ragAvailable
              
              return (
                <button
                  key={m.id}
                  onClick={() => !disabled && onRAGModeChange(m.id)}
                  disabled={disabled}
                  title={disabled ? 'Configure API keys in Settings' : undefined}
                  className={`
                    flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all
                    ${isActive 
                      ? 'bg-cyan-500 text-white shadow-sm' 
                      : disabled
                        ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }
                  `}
                >
                  {m.ai && <Sparkles className="w-2.5 h-2.5" />}
                  {m.label}
                  {ragLoading && isActive && m.ai && (
                    <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse" />
                  )}
                </button>
              )
            })}
          </div>
          
          {ragMode !== 'local' && ragLoading && (
            <span className="text-[10px] text-cyan-500 animate-pulse">Processing...</span>
          )}
        </div>
      )}

      {/* Regex Presets Panel - Minimal sleek design */}
      <AnimatePresence>
        {regexPresetsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="bg-purple-50/80 dark:bg-purple-950/30 backdrop-blur-sm rounded-lg border border-purple-200/60 dark:border-purple-800/60 p-2">
              {/* Header row with toggle and clear */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Regex Patterns
                </span>
                <div className="flex items-center gap-1">
                  {/* Clear regex pattern button */}
                  {options.query && options.useRegex && (
                    <button
                      onClick={() => {
                        onQueryChange('')
                        if (onToggleRegex && options.useRegex) onToggleRegex()
                        setRegexPresetsOpen(false)
                      }}
                      className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/40 transition-all flex items-center gap-0.5"
                      title="Clear regex pattern"
                    >
                      <X className="w-2.5 h-2.5" />
                      Clear
                    </button>
                  )}
                  {onToggleRegex && (
                    <button
                      onClick={onToggleRegex}
                      className={`
                        px-2 py-0.5 rounded text-[9px] font-semibold transition-all
                        ${options.useRegex
                          ? 'bg-purple-500 text-white shadow-sm'
                          : 'bg-purple-200/60 dark:bg-purple-800/40 text-purple-600 dark:text-purple-300 hover:bg-purple-300/60'
                        }
                      `}
                    >
                      {options.useRegex ? 'ON' : 'OFF'}
                    </button>
                  )}
                </div>
              </div>

              {/* Compact preset grid */}
              <div className="grid grid-cols-4 gap-1">
                {REGEX_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyRegexPreset(preset.pattern)}
                    className="
                      flex flex-col items-center gap-0.5 p-1.5 rounded-md
                      text-purple-700 dark:text-purple-300
                      hover:bg-purple-100 dark:hover:bg-purple-900/40
                      transition-all group
                    "
                    title={`${preset.description}\n${preset.pattern}`}
                  >
                    <preset.icon className="w-3.5 h-3.5 text-purple-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[8px] font-medium truncate w-full text-center">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
              
              {/* Tip */}
              <p className="mt-1.5 pt-1.5 border-t border-purple-200/60 dark:border-purple-800/40 text-[8px] text-purple-500 dark:text-purple-400">
                💡 <code className="font-mono">.*</code> wildcard · <code className="font-mono">^</code> start · <code className="font-mono">$</code> end
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Options Panel - Minimal, Sleek Design */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 space-y-2">
              {/* Inline toggle row - compact pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Names toggle */}
                <button
                  onClick={onToggleSearchNames}
                  className={`
                    px-2 py-1 rounded text-[10px] font-medium transition-all
                    ${options.searchNames
                      ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-500/40'
                      : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }
                  `}
                >
                  Names
                </button>
                
                {/* Content toggle */}
                <button
                  onClick={onToggleSearchContent}
                  className={`
                    px-2 py-1 rounded text-[10px] font-medium transition-all
                    ${options.searchContent
                      ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-500/40'
                      : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }
                  `}
                >
                  Content
                </button>
                
                {/* Separator */}
                <span className="w-px h-3 bg-zinc-300 dark:bg-zinc-700" />
                
                {/* Case toggle */}
                <button
                  onClick={onToggleCaseSensitive}
                  className={`
                    px-2 py-1 rounded text-[10px] font-medium transition-all
                    ${options.caseSensitive
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/40'
                      : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }
                  `}
                  title="Case-sensitive"
                >
                  Aa
                </button>
                
                {/* Regex toggle */}
                {onToggleRegex && (
                  <button
                    onClick={onToggleRegex}
                    className={`
                      px-2 py-1 rounded text-[10px] font-mono font-medium transition-all
                      ${options.useRegex
                        ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 ring-1 ring-purple-500/40'
                        : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }
                    `}
                    title="Regex mode"
                  >
                    .*
                  </button>
                )}
                
                {/* Reset if active */}
                {activeFiltersCount > 0 && (
                  <>
                    <span className="w-px h-3 bg-zinc-300 dark:bg-zinc-700" />
                    <button
                      onClick={onReset}
                      className="px-2 py-1 rounded text-[10px] font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    >
                      Reset
                    </button>
                  </>
                )}
              </div>
              
              {/* Regex presets row - only when regex is on */}
              {options.useRegex && (
                <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider py-1 mr-1">Presets:</span>
                  {[
                    { name: 'Code', pattern: '```[\\w]*[\\s\\S]*?```', icon: '{ }' },
                    { name: 'URLs', pattern: 'https?://[\\S]+', icon: '🔗' },
                    { name: 'TODOs', pattern: '(TODO|FIXME|NOTE):', icon: '✓' },
                    { name: 'Emails', pattern: '[\\w.]+@[\\w.]+', icon: '@' },
                    { name: 'Dates', pattern: '\\d{4}[-/]\\d{2}[-/]\\d{2}', icon: '📅' },
                    { name: 'Headers', pattern: '^#{1,6}\\s+.+$', icon: '#' },
                  ].map(p => (
                    <button
                      key={p.name}
                      onClick={() => applyRegexPreset(p.pattern)}
                      className="px-1.5 py-0.5 rounded text-[9px] font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all"
                      title={p.pattern}
                    >
                      <span className="mr-0.5">{p.icon}</span>
                      {p.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Advanced Filters Toggle */}
              {showAdvancedFilters && (onSetDifficulty || onSetTags || onSetSubjects) && (
                <>
                  <div className="border-t border-gray-300 dark:border-gray-700" />
                  
                  <button
                    onClick={() => setAdvancedOpen(!advancedOpen)}
                    className={`
                      w-full flex items-center justify-between py-2 px-1 rounded
                      text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800
                      transition-colors ${compact ? 'text-xs' : 'text-sm'}
                    `}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Layers className="w-4 h-4" />
                      Advanced Filters
                      {((options.difficulty) || (options.tags && options.tags.length > 0) || (options.subjects && options.subjects.length > 0) || (options.supertagFilters && options.supertagFilters.length > 0)) && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 rounded-full">
                          Active
                        </span>
                      )}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {advancedOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-4 pt-2">
                          {/* Difficulty Filter */}
                          {onSetDifficulty && (
                            <div className="space-y-2">
                              <label className={`flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300 ${compact ? 'text-xs' : 'text-sm'}`}>
                                <GraduationCap className="w-4 h-4" />
                                Difficulty Level
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {DIFFICULTY_LEVELS.map(level => (
                                  <button
                                    key={level.value}
                                    onClick={() => onSetDifficulty(options.difficulty === level.value ? undefined : level.value)}
                                    className={`
                                      px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                      ${options.difficulty === level.value
                                        ? level.color === 'emerald' 
                                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500'
                                          : level.color === 'amber'
                                          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500'
                                          : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 ring-1 ring-red-500'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                      }
                                    `}
                                  >
                                    {level.label}
                                    {options.difficulty === level.value && (
                                      <CheckCircle className="w-3 h-3 inline ml-1" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Tags Filter */}
                          {onSetTags && (
                            <div className="space-y-2">
                              <label className={`flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300 ${compact ? 'text-xs' : 'text-sm'}`}>
                                <Tag className="w-4 h-4" />
                                Filter by Tags
                              </label>
                              
                              {/* Selected tags */}
                              {options.tags && options.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {options.tags.map(tag => (
                                    <span
                                      key={tag}
                                      className="flex items-center gap-1 px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 rounded-full text-xs"
                                    >
                                      #{tag}
                                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-cyan-900 dark:hover:text-cyan-100">
                                        <X className="w-3 h-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                              
                              {/* Tag input */}
                              <div className="relative">
                                <input
                                  type="text"
                                  value={tagInput}
                                  onChange={(e) => setTagInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && tagInput.trim()) {
                                      handleAddTag(tagInput.trim().toLowerCase())
                                    }
                                  }}
                                  placeholder="Type to search tags..."
                                  className={`
                                    w-full px-3 py-2.5 sm:py-2 rounded-lg border text-[16px] sm:text-sm
                                    bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600
                                    focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500
                                  `}
                                />
                                {tagInput && filteredTags.length > 0 && (
                                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-40 overflow-y-auto">
                                    {filteredTags.map(tag => (
                                      <button
                                        key={tag}
                                        onClick={() => handleAddTag(tag)}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                      >
                                        <Tag className="w-3 h-3 text-cyan-500" />
                                        {tag}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Subjects Filter */}
                          {onSetSubjects && (
                            <div className="space-y-2">
                              <label className={`flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300 ${compact ? 'text-xs' : 'text-sm'}`}>
                                <Folder className="w-4 h-4" />
                                Filter by Subject
                              </label>
                              
                              {/* Selected subjects */}
                              {options.subjects && options.subjects.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {options.subjects.map(subject => (
                                    <span
                                      key={subject}
                                      className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full text-xs"
                                    >
                                      {subject}
                                      <button onClick={() => handleRemoveSubject(subject)} className="hover:text-purple-900 dark:hover:text-purple-100">
                                        <X className="w-3 h-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                              
                              {/* Subject input */}
                              <div className="relative">
                                <input
                                  type="text"
                                  value={subjectInput}
                                  onChange={(e) => setSubjectInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && subjectInput.trim()) {
                                      handleAddSubject(subjectInput.trim())
                                    }
                                  }}
                                  placeholder="Type to search subjects..."
                                  className={`
                                    w-full px-3 py-2.5 sm:py-2 rounded-lg border text-[16px] sm:text-sm
                                    bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600
                                    focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500
                                  `}
                                />
                                {subjectInput && filteredSubjects.length > 0 && (
                                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-40 overflow-y-auto">
                                    {filteredSubjects.map(subject => (
                                      <button
                                        key={subject}
                                        onClick={() => handleAddSubject(subject)}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                      >
                                        <Folder className="w-3 h-3 text-purple-500" />
                                        {subject}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Supertag Field Filters */}
                          {onSetSupertagFilters && availableSupertags.length > 0 && (
                            <div className="space-y-2">
                              <label className={`flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300 ${compact ? 'text-xs' : 'text-sm'}`}>
                                <Filter className="w-4 h-4" />
                                Filter by Supertag Fields
                              </label>

                              {/* Active supertag filters */}
                              {options.supertagFilters && options.supertagFilters.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {options.supertagFilters.map((filter, index) => (
                                    <span
                                      key={`${filter.tagName}-${filter.fieldName}-${index}`}
                                      className="flex items-center gap-1 px-2 py-0.5 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-full text-xs"
                                    >
                                      #{filter.tagName}.{filter.fieldName} {filter.operator} {formatFilterValue(filter)}
                                      <button onClick={() => handleRemoveSupertagFilter(index)} className="hover:text-teal-900 dark:hover:text-teal-100">
                                        <X className="w-3 h-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Filter builder */}
                              <div className="space-y-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                {/* Supertag selector */}
                                <div className="grid grid-cols-2 gap-2">
                                  <select
                                    value={selectedSupertag}
                                    onChange={(e) => {
                                      setSelectedSupertag(e.target.value)
                                      setSelectedField('')
                                      setFilterValue('')
                                    }}
                                    className="px-2 py-1.5 rounded border text-xs bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                  >
                                    <option value="">Select supertag...</option>
                                    {availableSupertags.map(st => (
                                      <option key={st.id} value={st.tagName}>
                                        #{st.tagName}
                                      </option>
                                    ))}
                                  </select>

                                  {/* Field selector */}
                                  <select
                                    value={selectedField}
                                    onChange={(e) => {
                                      setSelectedField(e.target.value)
                                      setFilterValue('')
                                    }}
                                    disabled={!selectedSupertag || selectedSupertagFields.length === 0}
                                    className="px-2 py-1.5 rounded border text-xs bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:opacity-50"
                                  >
                                    <option value="">Select field...</option>
                                    {selectedSupertagFields.map(field => (
                                      <option key={field.name} value={field.name}>
                                        {field.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Operator and value */}
                                {selectedField && (
                                  <div className="flex gap-2">
                                    <select
                                      value={selectedOperator}
                                      onChange={(e) => setSelectedOperator(e.target.value as SupertagFieldFilter['operator'])}
                                      className="px-2 py-1.5 rounded border text-xs bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30 w-16"
                                    >
                                      {availableOperators.map(op => (
                                        <option key={op} value={op}>{op}</option>
                                      ))}
                                    </select>

                                    {/* Value input - different based on field type */}
                                    {selectedFieldDef?.type === 'checkbox' ? (
                                      <select
                                        value={filterValue}
                                        onChange={(e) => setFilterValue(e.target.value)}
                                        className="flex-1 px-2 py-1.5 rounded border text-xs bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                      >
                                        <option value="">Select...</option>
                                        <option value="true">Yes</option>
                                        <option value="false">No</option>
                                      </select>
                                    ) : selectedFieldDef?.type === 'select' && selectedFieldDef.options ? (
                                      <select
                                        value={filterValue}
                                        onChange={(e) => setFilterValue(e.target.value)}
                                        className="flex-1 px-2 py-1.5 rounded border text-xs bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                      >
                                        <option value="">Select...</option>
                                        {selectedFieldDef.options.map(opt => (
                                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        type={selectedFieldDef?.type === 'number' || selectedFieldDef?.type === 'rating' || selectedFieldDef?.type === 'progress' ? 'number' : 'text'}
                                        value={filterValue}
                                        onChange={(e) => setFilterValue(e.target.value)}
                                        placeholder="Value..."
                                        className="flex-1 px-2 py-1.5 rounded border text-xs bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                      />
                                    )}

                                    <button
                                      onClick={handleAddSupertagFilter}
                                      disabled={!filterValue}
                                      className="px-3 py-1.5 rounded text-xs font-medium bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Add
                                    </button>
                                  </div>
                                )}

                                {!selectedSupertag && (
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                    Select a supertag to filter by its fields (e.g., #task status = done)
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* Info Note */}
              <div className="pt-2 border-t border-gray-300 dark:border-gray-700">
                <p className={`text-gray-600 dark:text-gray-400 flex items-start gap-2 ${compact ? 'text-[9px]' : 'text-xs'}`}>
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">💡</span>
                  <span>
                    Press <kbd className={`bg-white dark:bg-gray-800 rounded font-mono border border-gray-300 dark:border-gray-700 ${compact ? 'px-1 py-0.5 text-[8px]' : 'px-1.5 py-0.5 text-[10px]'}`}>/</kbd> to focus search, 
                    <kbd className={`bg-white dark:bg-gray-800 rounded font-mono border border-gray-300 dark:border-gray-700 ml-1 ${compact ? 'px-1 py-0.5 text-[8px]' : 'px-1.5 py-0.5 text-[10px]'}`}>Esc</kbd> to clear
                  </span>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

