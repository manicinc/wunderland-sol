'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, FileText, Folder, Sparkles, TrendingUp, Clock, ArrowUpDown, FileStack, Filter, Tag } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSearchEngine } from '@/lib/search/engine'
import type { CodexSearchResult } from '@/lib/search/types'
import { useSelectedStrandsSafe } from '@/components/quarry/contexts/SelectedStrandsContext'

interface SearchResult {
  path: string
  name: string
  type: 'file' | 'dir'
  content?: string
  score?: number
  highlights?: string[]
  metadata?: Record<string, any>
}

interface CodexSearchProps {
  onSelect?: (result: SearchResult) => void
  compact?: boolean
}

export default function CodexSearch({ onSelect, compact = false }: CodexSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [indexReady, setIndexReady] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedStrandsOnly, setSelectedStrandsOnly] = useState(false)
  const router = useRouter()
  const engineRef = useRef(getSearchEngine())
  
  // Get selected strands from context
  const selectedStrandsContext = useSelectedStrandsSafe()
  const selectedStrands = selectedStrandsContext?.strands ?? []
  const hasSelectedStrands = selectedStrands.length > 0
  const selectedStrandPaths = useMemo(
    () => new Set(selectedStrands.map(s => s.path)),
    [selectedStrands]
  )
  
  // Get unique tags from selected strands
  const selectedStrandsTags = useMemo(() => {
    const tags = new Set<string>()
    selectedStrands.forEach(s => s.tags?.forEach(t => tags.add(t)))
    return Array.from(tags).slice(0, 5)
  }, [selectedStrands])

  // Load recent searches from localStorage
  useEffect(() => {
    const recent = localStorage.getItem('codex-recent-searches')
    if (recent) {
      setRecentSearches(JSON.parse(recent).slice(0, 5))
    }
  }, [])

  // Initialize search engine
  useEffect(() => {
    const init = async () => {
      try {
        // Warm up the engine by doing a test search
        await engineRef.current.search('test', { limit: 1 })
        setIndexReady(true)
      } catch (error) {
        console.warn('Search engine initialization failed:', error)
        setIndexReady(false)
      }
    }
    init()
  }, [])

  // Smart suggestions based on input
  useEffect(() => {
    if (query.length > 2) {
      // Generate contextual suggestions
      const contextSuggestions = [
        query + ' architecture',
        query + ' implementation',
        query + ' examples',
        query + ' best practices',
        'how to ' + query,
        'what is ' + query,
      ].filter(s => s.length < 40)
      
      setSuggestions(contextSuggestions.slice(0, 4))
    } else {
      setSuggestions([])
    }
  }, [query])

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!indexReady || searchQuery.length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }

    setLoading(true)

    try {
      // Search using the proper CodexSearchEngine
      const searchResults = await engineRef.current.search(searchQuery, {
        limit: 20,
        semantic: engineRef.current.canUseSemantic()
      })

      // Transform results to match expected interface
      let transformedResults: SearchResult[] = searchResults.map((result: CodexSearchResult) => ({
        path: result.path,
        name: result.title || result.path.split('/').pop() || result.path,
        type: 'file' as const,
        score: 1 - (result.combinedScore || result.bm25Score || 0),
        metadata: {
          title: result.title,
          summary: result.summary,
          weave: result.weave,
          loom: result.loom,
        },
      }))

      // Filter by selected strands if enabled
      if (selectedStrandsOnly && hasSelectedStrands) {
        transformedResults = transformedResults.filter(r => selectedStrandPaths.has(r.path))
      }

      setResults(transformedResults)
      setShowDropdown(true)
      setActiveIndex(transformedResults.length > 0 ? 0 : -1)

      // Save to recent searches
      if (searchQuery.length > 3) {
        const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5)
        setRecentSearches(updated)
        localStorage.setItem('codex-recent-searches', JSON.stringify(updated))
      }
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [indexReady, recentSearches, selectedStrandsOnly, hasSelectedStrands, selectedStrandPaths])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [query, performSearch])

  const handleSelect = (result: SearchResult) => {
    // If a consumer wants to override navigation, let them
    if (onSelect) {
      onSelect(result)
    } else {
      // Navigate to the file within Quarry Codex.
      // Split the path so the Codex viewer can load the correct directory + file.
      const lastSlash = result.path.lastIndexOf('/')
      const dir = lastSlash === -1 ? '' : result.path.slice(0, lastSlash)
      const filePath = result.path

      const params = new URLSearchParams()
      if (dir) params.set('path', dir)
      params.set('file', filePath)

      router.push(`/codex?${params.toString()}`)
    }
    setShowDropdown(false)
    setActiveIndex(-1)
  }

  // Autocomplete options are the same as search results for simplicity
  const autocompleteOptions = results.slice(0, 6)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || autocompleteOptions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) =>
        prev < autocompleteOptions.length - 1 ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : autocompleteOptions.length - 1
      )
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < autocompleteOptions.length) {
        e.preventDefault()
        handleSelect(autocompleteOptions[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      setActiveIndex(-1)
    }
  }

  if (compact) {
    return (
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search codex..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => {
              // Small delay to allow click
              setTimeout(() => setShowDropdown(false), 120)
            }}
            onKeyDown={handleKeyDown}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>
        
        <AnimatePresence>
          {showDropdown && (results.length > 0 || suggestions.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full mt-2 w-full bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50 max-h-96 overflow-y-auto"
            >
              {/* Search results */}
              {results.length > 0 && (
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 px-2 py-1">Results</div>
                  {results.map((result, idx) => (
                    <button
                      key={result.path}
                      onClick={() => handleSelect(result)}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-start gap-2 transition-colors ${
                        idx === activeIndex
                          ? 'bg-purple-50 dark:bg-purple-900/30'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {result.type === 'dir' ? (
                        <Folder className="w-4 h-4 text-amber-600 mt-0.5" />
                      ) : (
                        <FileText className="w-4 h-4 text-blue-600 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {result.metadata?.title || result.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{result.path}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="p-2 border-t border-gray-200 dark:border-gray-800">
                  <div className="text-xs font-medium text-gray-500 px-2 py-1">Try searching for</div>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setQuery(suggestion)}
                      className="w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-sm text-gray-600 dark:text-gray-400"
                    >
                      <Sparkles className="w-3 h-3 inline mr-2 text-purple-500" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Search input */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search the codex of humanity..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => {
            setTimeout(() => setShowDropdown(false), 120)
          }}
          onKeyDown={handleKeyDown}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-2xl text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Inline autocomplete dropdown */}
        <AnimatePresence>
          {showDropdown && autocompleteOptions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden max-h-80 overflow-y-auto"
            >
              <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500 border-b border-gray-100 dark:border-gray-800">
                <span className="flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3" />
                  Use ↑ ↓ and Enter to select
                </span>
                <span>{autocompleteOptions.length} matches</span>
              </div>
              {autocompleteOptions.map((item, idx) => (
                <button
                  key={item.path}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelect(item)
                  }}
                  className={`w-full text-left px-4 py-2 flex items-start gap-3 text-sm transition-colors ${
                    idx === activeIndex
                      ? 'bg-purple-50 dark:bg-purple-900/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {item.type === 'dir' ? (
                    <Folder className="w-4 h-4 text-amber-600 mt-1" />
                  ) : (
                    <FileText className="w-4 h-4 text-blue-600 mt-1" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {item.metadata?.title || item.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {item.path}
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${showFilters || selectedStrandsOnly
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            }
          `}
        >
          <Filter className="w-4 h-4" />
          Filters
          {selectedStrandsOnly && hasSelectedStrands && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-purple-500 text-white">1</span>
          )}
        </button>
        
        {/* Selected strands quick toggle */}
        {hasSelectedStrands && (
          <button
            onClick={() => setSelectedStrandsOnly(!selectedStrandsOnly)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${selectedStrandsOnly
                ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }
            `}
          >
            <FileStack className="w-4 h-4" />
            {selectedStrands.length} selected
          </button>
        )}
      </div>
      
      {/* Expanded filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4">
              {/* Selected strands filter */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileStack className="w-4 h-4 text-cyan-600" />
                  <span className="text-sm font-medium">Search in selected strands only</span>
                  {!hasSelectedStrands && (
                    <span className="text-xs text-gray-400">(no strands selected)</span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedStrandsOnly(!selectedStrandsOnly)}
                  disabled={!hasSelectedStrands}
                  className={`
                    relative w-10 h-5 rounded-full transition-colors
                    ${selectedStrandsOnly && hasSelectedStrands
                      ? 'bg-cyan-500'
                      : 'bg-gray-300 dark:bg-gray-700'
                    }
                    ${!hasSelectedStrands ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <motion.div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
                    animate={{ left: selectedStrandsOnly && hasSelectedStrands ? '1.25rem' : '0.125rem' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
              
              {/* Selected strands tags */}
              {hasSelectedStrands && selectedStrandsTags.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Tag className="w-3 h-3" />
                    Tags from selection
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStrandsTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setQuery(query ? `${query} ${tag}` : tag)}
                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent searches */}
      {!query && recentSearches.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent searches
          </h3>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search) => (
              <button
                key={search}
                onClick={() => setQuery(search)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-sm transition-colors"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search results */}
      <AnimatePresence mode="wait">
        {results.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-3"
          >
            <div className="text-sm text-gray-500 mb-4">
              Found {results.length} results
            </div>
            
            {results.map((result, index) => (
              <motion.div
                key={result.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleSelect(result)}
                className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 hover:border-purple-500 dark:hover:border-purple-500 cursor-pointer transition-all hover:shadow-lg"
              >
                <div className="flex items-start gap-3">
                  {result.type === 'dir' ? (
                    <Folder className="w-5 h-5 text-amber-600 mt-1" />
                  ) : (
                    <FileText className="w-5 h-5 text-blue-600 mt-1" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {result.metadata?.title || result.name}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">{result.path}</p>
                    
                    {result.metadata?.summary && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {result.metadata.summary}
                      </p>
                    )}
                    
                    {(result.metadata?.weave || result.metadata?.loom) && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {result.metadata.weave && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                            🌐 {result.metadata.weave}
                          </span>
                        )}
                        {result.metadata.loom && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                            🧵 {result.metadata.loom}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {result.score !== undefined && (
                    <div className="text-xs text-gray-400">
                      {Math.round((1 - result.score) * 100)}% match
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : query.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-gray-500">No results found for "{query}"</p>
            
            {suggestions.length > 0 && (
              <div className="mt-6">
                <p className="text-sm text-gray-400 mb-3">Try searching for:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setQuery(suggestion)}
                      className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-800/30 text-purple-700 dark:text-purple-300 rounded-full text-sm transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="inline-flex items-center gap-2 text-gray-400 mb-4">
              <TrendingUp className="w-5 h-5" />
              <span>Popular topics</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {['OpenStrand', 'Quarry Codex', 'AgentOS', 'Superintelligence', 'Architecture'].map(topic => (
                <button
                  key={topic}
                  onClick={() => setQuery(topic.toLowerCase())}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm transition-colors"
                >
                  {topic}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
