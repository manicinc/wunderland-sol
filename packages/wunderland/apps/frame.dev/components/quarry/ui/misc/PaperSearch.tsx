/**
 * Paper Search - Academic paper discovery
 * @module codex/ui/PaperSearch
 *
 * Search interface for finding papers across CrossRef and arXiv.
 * Supports filtering by source, year, and sorting options.
 */

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  Loader2,
  Filter,
  ArrowUpDown,
  Calendar,
  ChevronDown,
  BookOpen,
  Sparkles,
  Database,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import type { Citation } from '@/lib/citations/types'
import { searchPapers } from '@/lib/citations'
import CitationCard from '../citations/CitationCard'

interface PaperSearchProps {
  /** Whether the panel is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Callback when adding citation to document */
  onAddCitation?: (citation: Citation, format: 'inline' | 'card' | 'reference') => void
  /** Callback when adding to bibliography */
  onAddToBibliography?: (citation: Citation) => void
  /** Current theme */
  theme?: string
  /** Default search query */
  defaultQuery?: string
}

type SearchSource = 'all' | 'crossref' | 'arxiv' | 'cache'
type SortOption = 'relevance' | 'year' | 'citations'

const SOURCE_OPTIONS: { value: SearchSource; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All Sources', icon: <Database className="w-4 h-4" /> },
  { value: 'crossref', label: 'CrossRef', icon: <BookOpen className="w-4 h-4" /> },
  { value: 'arxiv', label: 'arXiv', icon: <Sparkles className="w-4 h-4" /> },
  { value: 'cache', label: 'Cached Only', icon: <Database className="w-4 h-4" /> },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'year', label: 'Year (Newest)' },
  { value: 'citations', label: 'Citations' },
]

export default function PaperSearch({
  isOpen,
  onClose,
  onAddCitation,
  onAddToBibliography,
  theme = 'light',
  defaultQuery = '',
}: PaperSearchProps) {
  const [query, setQuery] = useState(defaultQuery)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<Citation[]>([])
  const [totalResults, setTotalResults] = useState(0)

  // Filters
  const [source, setSource] = useState<SearchSource>('all')
  const [sortBy, setSortBy] = useState<SortOption>('relevance')
  const [yearFrom, setYearFrom] = useState<string>('')
  const [yearTo, setYearTo] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const isDark = theme.includes('dark')

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  /**
   * Perform search
   */
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)

    try {
      // Build sources array
      const sources: ('crossref' | 'arxiv' | 'cache')[] =
        source === 'all'
          ? ['cache', 'crossref', 'arxiv']
          : [source as 'crossref' | 'arxiv' | 'cache']

      const searchResults = await searchPapers(query.trim(), {
        maxResults: 20,
        sources,
      })

      let papers = searchResults.results

      // Apply year filter
      if (yearFrom || yearTo) {
        const fromYear = yearFrom ? parseInt(yearFrom, 10) : 0
        const toYear = yearTo ? parseInt(yearTo, 10) : 9999
        papers = papers.filter((p) => p.year >= fromYear && p.year <= toYear)
      }

      // Apply sort
      if (sortBy === 'year') {
        papers.sort((a, b) => b.year - a.year)
      } else if (sortBy === 'citations') {
        papers.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
      }

      setResults(papers)
      setTotalResults(searchResults.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [query, source, sortBy, yearFrom, yearTo])

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      handleSearch()
    },
    [handleSearch]
  )

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  /**
   * Clear search
   */
  const handleClear = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
    inputRef.current?.focus()
  }, [])

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={`
        fixed right-0 top-16 bottom-0 z-40 w-full max-w-md
        flex flex-col shadow-2xl border-l
        ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}
      `}
    >
      {/* Header */}
      <div
        className={`
        flex items-center justify-between px-4 py-3 border-b
        ${isDark ? 'border-gray-700' : 'border-gray-200'}
      `}
      >
        <div className="flex items-center gap-2">
          <Search className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
          <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Paper Search
          </h2>
        </div>
        <button
          onClick={onClose}
          className={`
            p-1.5 rounded-lg transition-colors
            ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}
          `}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search papers by title, author, or topic..."
            className={`
              w-full pl-10 pr-10 py-2.5 rounded-xl border
              transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/30
              ${
                isDark
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500'
              }
            `}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded ${
                isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Row */}
        <div className="flex items-center gap-2">
          {/* Source Selector */}
          <div className="relative flex-1">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as SearchSource)}
              className={`
                w-full px-3 py-2 rounded-lg border text-sm appearance-none cursor-pointer
                ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 text-gray-200'
                    : 'bg-white border-gray-200 text-gray-700'
                }
              `}
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
                isDark ? 'text-gray-500' : 'text-gray-400'
              }`}
            />
          </div>

          {/* Sort Selector */}
          <div className="relative flex-1">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className={`
                w-full px-3 py-2 rounded-lg border text-sm appearance-none cursor-pointer
                ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 text-gray-200'
                    : 'bg-white border-gray-200 text-gray-700'
                }
              `}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ArrowUpDown
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
                isDark ? 'text-gray-500' : 'text-gray-400'
              }`}
            />
          </div>

          {/* Toggle Filters */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`
              p-2 rounded-lg border transition-colors
              ${
                showFilters
                  ? isDark
                    ? 'bg-purple-900/30 border-purple-700 text-purple-400'
                    : 'bg-purple-50 border-purple-200 text-purple-600'
                  : isDark
                    ? 'border-gray-700 text-gray-400 hover:bg-gray-800'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }
            `}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div
                className={`
                flex items-center gap-2 pt-2
                ${isDark ? 'text-gray-400' : 'text-gray-500'}
              `}
              >
                <Calendar className="w-4 h-4" />
                <span className="text-xs">Year:</span>
                <input
                  type="number"
                  value={yearFrom}
                  onChange={(e) => setYearFrom(e.target.value)}
                  placeholder="From"
                  min="1900"
                  max="2030"
                  className={`
                    w-20 px-2 py-1 rounded border text-sm
                    ${
                      isDark
                        ? 'bg-gray-800 border-gray-700 text-gray-200'
                        : 'bg-white border-gray-200 text-gray-700'
                    }
                  `}
                />
                <span className="text-xs">-</span>
                <input
                  type="number"
                  value={yearTo}
                  onChange={(e) => setYearTo(e.target.value)}
                  placeholder="To"
                  min="1900"
                  max="2030"
                  className={`
                    w-20 px-2 py-1 rounded border text-sm
                    ${
                      isDark
                        ? 'bg-gray-800 border-gray-700 text-gray-200'
                        : 'bg-white border-gray-200 text-gray-700'
                    }
                  `}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Button */}
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className={`
            w-full py-2.5 rounded-xl font-medium transition-all
            flex items-center justify-center gap-2
            ${
              loading
                ? 'bg-purple-600/50 text-white cursor-wait'
                : 'bg-purple-600 text-white hover:bg-purple-700 active:scale-[0.98]'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Search Papers
            </>
          )}
        </button>
      </form>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Error */}
        {error && (
          <div
            className={`
            mb-4 p-3 rounded-xl flex items-start gap-2
            ${isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}
          `}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Search failed</p>
              <p className="opacity-80">{error}</p>
            </div>
          </div>
        )}

        {/* Results Count */}
        {results.length > 0 && (
          <div
            className={`mb-3 flex items-center justify-between text-xs ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            <span>
              Showing {results.length} of {totalResults.toLocaleString()} results
            </span>
            <button
              onClick={handleSearch}
              className={`flex items-center gap-1 hover:text-purple-500 transition-colors`}
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
        )}

        {/* Results List */}
        <div className="space-y-3">
          {results.map((citation) => (
            <CitationCard
              key={citation.id}
              citation={citation}
              theme={theme}
              showCopyButtons={true}
              compact={false}
              onAddToBibliography={
                onAddToBibliography ? () => onAddToBibliography(citation) : undefined
              }
              onClick={
                onAddCitation ? () => onAddCitation(citation, 'reference') : undefined
              }
            />
          ))}
        </div>

        {/* Empty State */}
        {!loading && results.length === 0 && query && !error && (
          <div
            className={`
            text-center py-12
            ${isDark ? 'text-gray-500' : 'text-gray-400'}
          `}
          >
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No papers found</p>
            <p className="text-sm mt-1">Try different keywords or filters</p>
          </div>
        )}

        {/* Initial State */}
        {!loading && results.length === 0 && !query && !error && (
          <div
            className={`
            text-center py-12
            ${isDark ? 'text-gray-500' : 'text-gray-400'}
          `}
          >
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Search for academic papers</p>
            <p className="text-sm mt-1">
              Query CrossRef, arXiv, and your cached papers
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
