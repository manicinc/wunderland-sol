/**
 * Query Builder Sidebar Panel
 * @module codex/ui/QueryBuilderSidebarPanel
 *
 * @description
 * Sidebar panel wrapper for the visual query builder.
 * Allows building complex queries with visual condition blocks.
 *
 * @features
 * - Visual query building with drag-and-drop conditions
 * - Saved queries management
 * - Quick filter presets
 * - Query preview and validation
 * - Execute and apply filters to knowledge tree
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  Sparkles,
  Clock,
  Star,
  Trash2,
  Play,
  ChevronDown,
  ChevronRight,
  Tag,
  Calendar,
  FileText,
  Hash,
  Bookmark,
  Plus,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { QueryBuilder, type QueryBuilderProps } from './QueryBuilder'
import { getSavedQueries, saveQuery, deleteSavedQuery, type SavedQuery } from '@/lib/query'
import type { RootQueryNode } from '@/lib/query'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface QueryBuilderSidebarPanelProps {
  /** Theme for styling */
  theme?: 'light' | 'dark'
  /** Callback when executing a query */
  onExecute?: (query: RootQueryNode, queryString: string) => void
  /** Callback when applying query as filter */
  onApplyFilter?: (query: RootQueryNode) => void
  /** Currently active query (for display) */
  activeQuery?: string
  /** Clear current filter */
  onClearFilter?: () => void
  /** Additional class names */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   QUICK FILTERS - Preset queries for common use cases
═══════════════════════════════════════════════════════════════════════════ */

const QUICK_FILTERS = [
  {
    id: 'recent',
    label: 'Recently Updated',
    icon: Clock,
    description: 'Modified in the last 7 days',
    query: 'updated:>7d sort:updated',
  },
  {
    id: 'starred',
    label: 'Bookmarked',
    icon: Star,
    description: 'Your saved favorites',
    query: '#bookmarked',
  },
  {
    id: 'untagged',
    label: 'Needs Tagging',
    icon: Tag,
    description: 'Items without any tags',
    query: 'tags:0',
  },
  {
    id: 'long-form',
    label: 'Long-Form Content',
    icon: FileText,
    description: 'Documents over 1000 words',
    query: 'word_count:>1000',
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   SAVED QUERIES SECTION
═══════════════════════════════════════════════════════════════════════════ */

interface SavedQueriesSectionProps {
  queries: SavedQuery[]
  onLoad: (query: SavedQuery) => void
  onDelete: (id: string) => void
  theme: 'light' | 'dark'
}

function SavedQueriesSection({
  queries,
  onLoad,
  onDelete,
  theme,
}: SavedQueriesSectionProps) {
  const isDark = theme === 'dark'
  const [expanded, setExpanded] = useState(true)

  if (queries.length === 0) return null

  return (
    <div className={cn(
      'border-b',
      isDark ? 'border-zinc-800' : 'border-zinc-200'
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-left',
          isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
        )}
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
        )}
        <Bookmark className="w-3.5 h-3.5 text-amber-500" />
        <span className={cn(
          'text-xs font-medium flex-1',
          isDark ? 'text-zinc-300' : 'text-zinc-700'
        )}>
          Saved Queries
        </span>
        <span className="text-[10px] text-zinc-500">{queries.length}</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 space-y-1 max-h-48 overflow-y-auto">
              {queries.map(query => (
                <div
                  key={query.id}
                  className={cn(
                    'group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors',
                    isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                  )}
                  onClick={() => onLoad(query)}
                >
                  <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      'text-xs font-medium truncate',
                      isDark ? 'text-zinc-200' : 'text-zinc-800'
                    )}>
                      {query.name}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate font-mono">
                      {query.queryJson}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(query.id)
                    }}
                    className={cn(
                      'p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity',
                      isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'
                    )}
                    title="Delete query"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function QueryBuilderSidebarPanel({
  theme = 'dark',
  onExecute,
  onApplyFilter,
  activeQuery,
  onClearFilter,
  className,
}: QueryBuilderSidebarPanelProps) {
  const isDark = theme === 'dark'

  // State
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])
  const [currentQuery, setCurrentQuery] = useState<RootQueryNode | null>(null)
  const [currentQueryString, setCurrentQueryString] = useState('')
  const [showBuilder, setShowBuilder] = useState(true) // Show builder by default
  const [quickFiltersExpanded, setQuickFiltersExpanded] = useState(false) // Collapse quick filters to show builder

  // Load saved queries
  useEffect(() => {
    loadSavedQueries()
  }, [])

  const loadSavedQueries = async () => {
    try {
      const queries = await getSavedQueries()
      setSavedQueries(queries)
    } catch (err) {
      console.error('Failed to load saved queries:', err)
    }
  }

  // Handle query change from builder
  const handleQueryChange = useCallback((query: RootQueryNode, queryString: string) => {
    setCurrentQuery(query)
    setCurrentQueryString(queryString)
  }, [])

  // Execute query
  const handleExecute = useCallback((query: RootQueryNode) => {
    onExecute?.(query, currentQueryString)
    onApplyFilter?.(query)
  }, [currentQueryString, onExecute, onApplyFilter])

  // Save query
  const handleSave = useCallback(async (query: RootQueryNode, name: string) => {
    try {
      await saveQuery(name, query)
      await loadSavedQueries()
    } catch (err) {
      console.error('Failed to save query:', err)
    }
  }, [])

  // Load saved query
  const handleLoadSavedQuery = useCallback((query: SavedQuery) => {
    setCurrentQueryString(query.queryJson)
    setShowBuilder(true)
  }, [])

  // Delete saved query
  const handleDeleteSavedQuery = useCallback(async (id: string) => {
    try {
      await deleteSavedQuery(id)
      await loadSavedQueries()
    } catch (err) {
      console.error('Failed to delete query:', err)
    }
  }, [])

  // Apply quick filter
  const handleQuickFilter = useCallback((filter: typeof QUICK_FILTERS[0]) => {
    setCurrentQueryString(filter.query)
    // Parse and execute would happen here
    onExecute?.({ type: 'root', children: [] }, filter.query)
  }, [onExecute])

  return (
    <div className={cn(
      'flex flex-col h-full min-h-0 overflow-hidden',
      isDark ? 'bg-zinc-900' : 'bg-white',
      className
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center gap-2 px-3 py-2.5 border-b shrink-0',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <Filter className="w-4 h-4 text-blue-500" />
        <h2 className={cn(
          'text-xs font-semibold flex-1',
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        )}>
          Query Builder
        </h2>
        <button
          onClick={() => setShowBuilder(!showBuilder)}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors',
            showBuilder
              ? 'bg-blue-500 text-white'
              : isDark
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          )}
        >
          <Plus className="w-3 h-3" />
          {showBuilder ? 'Hide' : 'Build'}
        </button>
      </div>

      {/* Active Filter Indicator */}
      {activeQuery && (
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 border-b shrink-0',
          isDark ? 'border-zinc-800 bg-blue-500/10' : 'border-zinc-200 bg-blue-50'
        )}>
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span className="flex-1 text-[10px] font-mono text-blue-600 dark:text-blue-400 truncate">
            {activeQuery}
          </span>
          <button
            onClick={onClearFilter}
            className="p-1 rounded hover:bg-blue-500/20"
            title="Clear filter"
          >
            <X className="w-3 h-3 text-blue-500" />
          </button>
        </div>
      )}

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Builder Panel (collapsible) */}
        <AnimatePresence>
          {showBuilder && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={cn(
                'border-b',
                isDark ? 'border-zinc-800' : 'border-zinc-200'
              )}
            >
              <div className="max-h-[50vh] overflow-y-auto">
                <QueryBuilder
                  theme={theme}
                  onQueryChange={handleQueryChange}
                  onExecute={handleExecute}
                  onSave={handleSave}
                  showPreview={true}
                  showExecute={true}
                  compact={true}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Filters */}
        <div className={cn(
          'border-b',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}>
          <button
            onClick={() => setQuickFiltersExpanded(!quickFiltersExpanded)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2.5 text-left',
              isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
            )}
          >
            {quickFiltersExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
            )}
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className={cn(
              'text-xs font-medium flex-1',
              isDark ? 'text-zinc-300' : 'text-zinc-700'
            )}>
              Quick Filters
            </span>
          </button>

          <AnimatePresence>
            {quickFiltersExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-2 pb-2 grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                  {QUICK_FILTERS.map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => handleQuickFilter(filter)}
                      className={cn(
                        'flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-lg text-left transition-colors',
                        isDark
                          ? 'hover:bg-zinc-800 border border-zinc-800'
                          : 'hover:bg-zinc-100 border border-zinc-200'
                      )}
                      title={filter.description}
                    >
                      <div className="flex items-center gap-1.5">
                        <filter.icon className={cn(
                          'w-3.5 h-3.5',
                          filter.id === 'recent' ? 'text-blue-500' :
                            filter.id === 'starred' ? 'text-amber-500' :
                              filter.id === 'untagged' ? 'text-orange-500' :
                                'text-purple-500'
                        )} />
                        <span className={cn(
                          'text-[10px] font-medium',
                          isDark ? 'text-zinc-200' : 'text-zinc-800'
                        )}>
                          {filter.label}
                        </span>
                      </div>
                      <span className="text-[9px] text-zinc-500 line-clamp-1">
                        {filter.description}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Saved Queries */}
        <SavedQueriesSection
          queries={savedQueries}
          onLoad={handleLoadSavedQuery}
          onDelete={handleDeleteSavedQuery}
          theme={theme}
        />

        {/* Empty State */}
        {!showBuilder && savedQueries.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 py-8">
            <Filter className={cn(
              'w-10 h-10 mb-3',
              isDark ? 'text-zinc-700' : 'text-zinc-300'
            )} />
            <p className={cn(
              'text-xs text-center mb-1',
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            )}>
              Build complex queries visually
            </p>
            <p className="text-[10px] text-zinc-500 text-center mb-4">
              Filter by tags, dates, content type, and more
            </p>
            <button
              onClick={() => setShowBuilder(true)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                'bg-blue-500 hover:bg-blue-600 text-white'
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              Create Query
            </button>
          </div>
        )}
      </div>

      {/* Keyboard shortcut hint */}
      <div className={cn(
        'px-3 py-2.5 border-t shrink-0',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <p className="text-[10px] text-zinc-500 text-center">
          Press <kbd className={cn(
            'px-1.5 py-0.5 rounded text-[9px] font-mono',
            isDark ? 'bg-zinc-800' : 'bg-zinc-200'
          )}>Cmd+Shift+F</kbd> to open query palette
        </p>
      </div>
    </div>
  )
}

export default QueryBuilderSidebarPanel
