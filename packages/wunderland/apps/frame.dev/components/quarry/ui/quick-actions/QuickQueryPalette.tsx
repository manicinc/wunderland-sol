/**
 * Quick Query Palette
 * @module codex/ui/QuickQueryPalette
 *
 * @description
 * Command palette style interface for quick searching and navigation.
 * Supports fuzzy search, saved queries, and keyboard navigation.
 *
 * @features
 * - Fuzzy text search
 * - Saved query quick access
 * - Recent searches
 * - Tag/supertag autocomplete
 * - Keyboard navigation (up/down/enter)
 * - Query syntax hints
 * - Live result preview
 */

'use client'

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Tag,
  Hash,
  FileText,
  Clock,
  Star,
  Sparkles,
  ArrowRight,
  Command,
  CornerDownLeft,
  ChevronUp,
  ChevronDown,
  X,
  Bookmark,
  History,
  Zap,
  Layers,
  Code,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  parseQuery,
  executeQuery,
  quickSearch,
  getSavedQueries,
  getRecentQueries,
  getPinnedQueries,
  type QueryResult,
  type SearchResult,
  type SavedQuery,
} from '@/lib/query'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { useVirtualizer } from '@tanstack/react-virtual'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface QuickQueryPaletteProps {
  /** Whether the palette is open */
  isOpen: boolean
  /** Callback when closing */
  onClose: () => void
  /** Callback when selecting a result */
  onSelect?: (result: SearchResult) => void
  /** Callback when navigating to a strand */
  onNavigate?: (path: string, blockId?: string) => void
  /** Theme for styling */
  theme?: 'light' | 'dark'
  /** Placeholder text */
  placeholder?: string
  /** Additional class names */
  className?: string
}

type ResultSection = 'pinned' | 'recent' | 'suggestions' | 'results'

interface SectionItem {
  section: ResultSection
  type: 'saved' | 'strand' | 'block' | 'tag' | 'supertag' | 'hint'
  id: string
  title: string
  subtitle?: string
  icon: typeof Search
  data?: any
}

/** Flattened item for virtualization - can be a header or an item */
type FlattenedItem =
  | { kind: 'header'; section: ResultSection; title: string; icon: typeof Search }
  | { kind: 'item'; item: SectionItem; globalIndex: number }

const SECTION_CONFIG: Record<ResultSection, { title: string; icon: typeof Search }> = {
  pinned: { title: 'Pinned', icon: Star },
  recent: { title: 'Recent', icon: History },
  suggestions: { title: 'Suggestions', icon: Zap },
  results: { title: 'Results', icon: Search },
}

const ITEM_HEIGHT = 44
const HEADER_HEIGHT = 28

/* ═══════════════════════════════════════════════════════════════════════════
   SYNTAX HINTS
═══════════════════════════════════════════════════════════════════════════ */

const SYNTAX_HINTS: Array<{
  pattern: string
  description: string
  example: string
}> = [
  { pattern: '#tag', description: 'Filter by tag', example: '#typescript' },
  { pattern: '-#tag', description: 'Exclude tag', example: '-#draft' },
  { pattern: 'field:value', description: 'Field query', example: 'weave:technology' },
  { pattern: '"exact"', description: 'Exact phrase', example: '"react hooks"' },
  { pattern: 'type:block', description: 'Content type', example: 'type:code' },
  { pattern: 'AND/OR', description: 'Boolean operators', example: 'react AND hooks' },
  { pattern: '@sort:field', description: 'Sort results', example: '@sort:updated desc' },
]

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

interface ResultItemProps {
  item: SectionItem
  isSelected: boolean
  onClick: () => void
  theme: 'light' | 'dark'
}

function ResultItem({ item, isSelected, onClick, theme }: ResultItemProps) {
  const isDark = theme === 'dark'
  const Icon = item.icon

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
        isSelected
          ? (isDark ? 'bg-blue-600/20' : 'bg-blue-50')
          : (isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50')
      )}
    >
      <div className={cn(
        'shrink-0 p-1.5 rounded',
        isSelected
          ? 'bg-blue-500/20 text-blue-400'
          : (isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400')
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn(
          'text-sm font-medium truncate',
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        )}>
          {item.title}
        </div>
        {item.subtitle && (
          <div className="text-xs text-zinc-500 truncate">
            {item.subtitle}
          </div>
        )}
      </div>
      {isSelected && (
        <div className={cn(
          'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
          isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-500'
        )}>
          <CornerDownLeft className="w-3 h-3" />
          Open
        </div>
      )}
    </button>
  )
}

function SectionHeader({ title, icon: Icon, theme }: {
  title: string
  icon: typeof Search
  theme: 'light' | 'dark'
}) {
  const isDark = theme === 'dark'

  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-1.5',
      isDark ? 'text-zinc-500 bg-zinc-900/50' : 'text-zinc-400 bg-zinc-50'
    )}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs font-medium uppercase tracking-wide">{title}</span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function QuickQueryPalette({
  isOpen,
  onClose,
  onSelect,
  onNavigate,
  theme = 'dark',
  placeholder = 'Search strands, blocks, tags...',
  className,
}: QuickQueryPaletteProps) {
  const isDark = theme === 'dark'
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // State
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [pinnedQueries, setPinnedQueries] = useState<SavedQuery[]>([])
  const [recentQueries, setRecentQueries] = useState<SavedQuery[]>([])
  const [searchResults, setSearchResults] = useState<QueryResult | null>(null)
  const [suggestions, setSuggestions] = useState<{
    strands: Array<{ path: string; title: string }>
    tags: string[]
    supertags: string[]
  }>({ strands: [], tags: [], supertags: [] })
  const [loading, setLoading] = useState(false)
  const [showHints, setShowHints] = useState(false)

  const debouncedQuery = useDebounce(query, 200)

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      loadInitialData()
    } else {
      setQuery('')
      setSelectedIndex(0)
      setSearchResults(null)
      setSuggestions({ strands: [], tags: [], supertags: [] })
    }
  }, [isOpen])

  // Load initial data (pinned & recent)
  const loadInitialData = async () => {
    try {
      const [pinned, recent] = await Promise.all([
        getPinnedQueries(),
        getRecentQueries(5),
      ])
      setPinnedQueries(pinned)
      setRecentQueries(recent)
    } catch (error) {
      console.error('Failed to load query data:', error)
    }
  }

  // Search on query change
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults(null)
      setSuggestions({ strands: [], tags: [], supertags: [] })
      return
    }

    const search = async () => {
      setLoading(true)
      try {
        // Quick suggestions
        const quickResults = await quickSearch(debouncedQuery, {
          types: ['strand', 'tag', 'supertag'],
          limit: 5,
        })
        setSuggestions({
          strands: quickResults.strands,
          tags: quickResults.tags,
          supertags: quickResults.supertags,
        })

        // Full query if it looks like a query
        if (debouncedQuery.includes('#') || debouncedQuery.includes(':') || debouncedQuery.includes('"')) {
          const results = await executeQuery(debouncedQuery, { enableFacets: false })
          setSearchResults(results)
        } else {
          // Simple text search
          const results = await executeQuery(debouncedQuery, { enableFacets: false, defaultLimit: 10 })
          setSearchResults(results)
        }
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setLoading(false)
      }
    }

    search()
  }, [debouncedQuery])

  // Build items list
  const items = useMemo((): SectionItem[] => {
    const result: SectionItem[] = []

    // If no query, show pinned and recent
    if (!query.trim()) {
      // Pinned queries
      for (const q of pinnedQueries) {
        result.push({
          section: 'pinned',
          type: 'saved',
          id: `pinned-${q.id}`,
          title: q.name,
          subtitle: q.description || 'Pinned query',
          icon: Star,
          data: q,
        })
      }

      // Recent queries
      for (const q of recentQueries) {
        if (!pinnedQueries.find(p => p.id === q.id)) {
          result.push({
            section: 'recent',
            type: 'saved',
            id: `recent-${q.id}`,
            title: q.name,
            subtitle: q.description || 'Recent query',
            icon: History,
            data: q,
          })
        }
      }

      return result
    }

    // Suggestions section
    for (const strand of suggestions.strands) {
      result.push({
        section: 'suggestions',
        type: 'strand',
        id: `strand-${strand.path}`,
        title: strand.title || strand.path,
        subtitle: strand.path,
        icon: FileText,
        data: strand,
      })
    }

    for (const tag of suggestions.tags) {
      result.push({
        section: 'suggestions',
        type: 'tag',
        id: `tag-${tag}`,
        title: `#${tag}`,
        subtitle: 'Tag',
        icon: Tag,
        data: { tagName: tag },
      })
    }

    for (const supertag of suggestions.supertags) {
      result.push({
        section: 'suggestions',
        type: 'supertag',
        id: `supertag-${supertag}`,
        title: `#${supertag}`,
        subtitle: 'Supertag',
        icon: Sparkles,
        data: { tagName: supertag },
      })
    }

    // Search results
    if (searchResults) {
      for (const res of searchResults.results) {
        if (res.type === 'strand') {
          result.push({
            section: 'results',
            type: 'strand',
            id: `result-${res.id}`,
            title: res.title || res.path,
            subtitle: res.weave ? `${res.weave} / ${res.path}` : res.path,
            icon: FileText,
            data: res,
          })
        } else {
          result.push({
            section: 'results',
            type: 'block',
            id: `result-${res.id}`,
            title: res.content.slice(0, 60) + (res.content.length > 60 ? '...' : ''),
            subtitle: `${res.blockType} in ${res.strandTitle}`,
            icon: res.blockType === 'code' ? Code : Layers,
            data: res,
          })
        }
      }
    }

    return result
  }, [query, pinnedQueries, recentQueries, suggestions, searchResults])

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= items.length) {
      setSelectedIndex(Math.max(0, items.length - 1))
    }
  }, [items.length, selectedIndex])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, items.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (items[selectedIndex]) {
          handleSelect(items[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
      case 'Tab':
        e.preventDefault()
        setShowHints(!showHints)
        break
    }
  }, [items, selectedIndex, showHints, onClose])

  // Handle selection
  const handleSelect = useCallback((item: SectionItem) => {
    switch (item.type) {
      case 'saved':
        // Execute saved query
        const savedQuery = item.data as SavedQuery
        setQuery(savedQuery.queryJson ? '' : savedQuery.name)
        break
      case 'strand':
        onNavigate?.(item.data.path)
        onClose()
        break
      case 'block':
        const block = item.data as SearchResult
        if (block.type === 'block') {
          onNavigate?.(block.strandPath, block.blockId)
        }
        onClose()
        break
      case 'tag':
      case 'supertag':
        // Insert into query
        const tagName = item.data.tagName
        setQuery(prev => {
          const newQuery = prev.trim() + (prev.trim() ? ' ' : '') + `#${tagName}`
          return newQuery
        })
        inputRef.current?.focus()
        break
    }

    if (item.type === 'strand' || item.type === 'block') {
      onSelect?.(item.data)
    }
  }, [onNavigate, onClose, onSelect])

  // Get sections to render
  const sections = useMemo(() => {
    const sectionMap = new Map<ResultSection, SectionItem[]>()

    for (const item of items) {
      if (!sectionMap.has(item.section)) {
        sectionMap.set(item.section, [])
      }
      sectionMap.get(item.section)!.push(item)
    }

    return sectionMap
  }, [items])

  // Flatten for virtualization: headers + items in order
  const flattenedItems = useMemo((): FlattenedItem[] => {
    const result: FlattenedItem[] = []
    const sectionOrder: ResultSection[] = ['pinned', 'recent', 'suggestions', 'results']

    for (const section of sectionOrder) {
      const sectionItems = sections.get(section)
      if (sectionItems && sectionItems.length > 0) {
        // Add header
        const config = SECTION_CONFIG[section]
        result.push({
          kind: 'header',
          section,
          title: section === 'results' && searchResults
            ? `Results (${searchResults.total})`
            : config.title,
          icon: config.icon,
        })
        // Add items
        for (const item of sectionItems) {
          const globalIndex = items.indexOf(item)
          result.push({ kind: 'item', item, globalIndex })
        }
      }
    }

    return result
  }, [sections, items, searchResults])

  // Virtualizer setup
  const virtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => resultsRef.current,
    estimateSize: (index) => flattenedItems[index]?.kind === 'header' ? HEADER_HEIGHT : ITEM_HEIGHT,
    overscan: 5,
  })

  // Scroll selected item into view (virtualized)
  useEffect(() => {
    // Find the flattened index for the selected item
    const flatIndex = flattenedItems.findIndex(
      f => f.kind === 'item' && f.globalIndex === selectedIndex
    )
    if (flatIndex >= 0) {
      virtualizer.scrollToIndex(flatIndex, { align: 'auto' })
    }
  }, [selectedIndex, flattenedItems, virtualizer])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className={cn(
          'absolute inset-0',
          isDark ? 'bg-black/60' : 'bg-black/40'
        )} />

        {/* Palette */}
        <motion.div
          initial={{ scale: 0.95, y: -10 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: -10 }}
          onClick={e => e.stopPropagation()}
          className={cn(
            'relative w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden',
            isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200',
            className
          )}
        >
          {/* Search Input */}
          <div className={cn(
            'flex items-center gap-3 px-4 py-3 border-b',
            isDark ? 'border-zinc-800' : 'border-zinc-200'
          )}>
            <Search className={cn(
              'w-5 h-5 shrink-0',
              loading ? 'animate-pulse text-blue-500' : 'text-zinc-500'
            )} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={cn(
                'flex-1 bg-transparent text-base outline-none',
                isDark
                  ? 'text-zinc-200 placeholder:text-zinc-500'
                  : 'text-zinc-800 placeholder:text-zinc-400'
              )}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className={cn(
                  'p-1 rounded',
                  isDark ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'
                )}
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowHints(!showHints)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs',
                showHints
                  ? 'bg-blue-500/20 text-blue-400'
                  : (isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400')
              )}
            >
              <Command className="w-3 h-3" />
              Tab
            </button>
          </div>

          {/* Syntax Hints */}
          <AnimatePresence>
            {showHints && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={cn(
                  'overflow-hidden border-b',
                  isDark ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-200 bg-zinc-50'
                )}
              >
                <div className="p-3 grid grid-cols-2 gap-2">
                  {SYNTAX_HINTS.map(hint => (
                    <button
                      key={hint.pattern}
                      onClick={() => {
                        setQuery(hint.example)
                        setShowHints(false)
                        inputRef.current?.focus()
                      }}
                      className={cn(
                        'flex items-start gap-2 p-2 rounded-lg text-left',
                        isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                      )}
                    >
                      <code className={cn(
                        'px-1.5 py-0.5 rounded text-xs font-mono shrink-0',
                        isDark ? 'bg-zinc-800 text-emerald-400' : 'bg-zinc-200 text-emerald-600'
                      )}>
                        {hint.pattern}
                      </code>
                      <div className="min-w-0">
                        <div className="text-xs text-zinc-500">{hint.description}</div>
                        <div className={cn(
                          'text-xs truncate',
                          isDark ? 'text-zinc-400' : 'text-zinc-600'
                        )}>
                          {hint.example}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Virtualized Results */}
          <div
            ref={resultsRef}
            className="max-h-[50vh] overflow-y-auto"
          >
            {items.length === 0 && !loading && (
              <div className="py-12 text-center">
                <Search className={cn(
                  'w-8 h-8 mx-auto mb-2',
                  isDark ? 'text-zinc-700' : 'text-zinc-300'
                )} />
                <p className={cn(
                  'text-sm',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}>
                  {query ? 'No results found' : 'Start typing to search'}
                </p>
                <p className="text-xs text-zinc-600 mt-1">
                  Press Tab for query syntax hints
                </p>
              </div>
            )}

            {/* Virtualized list */}
            {flattenedItems.length > 0 && (
              <div
                style={{
                  height: virtualizer.getTotalSize(),
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const flatItem = flattenedItems[virtualItem.index]

                  return (
                    <div
                      key={virtualItem.key}
                      style={{
                        position: 'absolute',
                        top: virtualItem.start,
                        left: 0,
                        right: 0,
                        height: virtualItem.size,
                      }}
                    >
                      {flatItem.kind === 'header' ? (
                        <SectionHeader
                          title={flatItem.title}
                          icon={flatItem.icon}
                          theme={theme}
                        />
                      ) : (
                        <ResultItem
                          item={flatItem.item}
                          isSelected={selectedIndex === flatItem.globalIndex}
                          onClick={() => handleSelect(flatItem.item)}
                          theme={theme}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={cn(
            'flex items-center justify-between px-4 py-2 border-t',
            isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'
          )}>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <ChevronUp className="w-3 h-3" />
                <ChevronDown className="w-3 h-3" />
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft className="w-3 h-3" />
                Open
              </span>
              <span className="flex items-center gap-1">
                esc
                Close
              </span>
            </div>
            {searchResults && (
              <div className="text-xs text-zinc-500">
                {searchResults.executionTime.toFixed(0)}ms
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default QuickQueryPalette
