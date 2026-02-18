/**
 * Query Block Component
 * @module codex/ui/QueryBlock
 *
 * @description
 * Renders inline query results in markdown content.
 * Executes queries and displays results in various formats.
 *
 * Syntax in markdown:
 * ```query
 * #task status:pending @sort:due_date
 * ```
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  AlertCircle,
  Table,
  List,
  LayoutGrid,
} from 'lucide-react'
import { executeQuery } from '@/lib/query/queryEngine'
import type { QueryResult, SearchResult, StrandSearchResult, BlockSearchResult } from '@/lib/query/types'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/** Get path from SearchResult (handles both strand and block results) */
function getResultPath(result: SearchResult): string {
  if (result.type === 'strand') {
    return (result as StrandSearchResult).path
  }
  return (result as BlockSearchResult).strandPath
}

/** Get title from SearchResult (handles both strand and block results) */
function getResultTitle(result: SearchResult): string {
  if (result.type === 'strand') {
    return (result as StrandSearchResult).title
  }
  return (result as BlockSearchResult).strandTitle
}

/** Get first highlight from SearchResult */
function getResultHighlight(result: SearchResult): string | undefined {
  if (!result.highlights) return undefined

  if (result.type === 'strand') {
    const strandResult = result as StrandSearchResult
    return strandResult.highlights?.title?.[0]
      || strandResult.highlights?.content?.[0]
      || strandResult.highlights?.summary?.[0]
  }

  const blockResult = result as BlockSearchResult
  return blockResult.highlights?.content?.[0]
}

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export type QueryBlockDisplayMode = 'list' | 'compact' | 'table' | 'count'

export interface QueryBlockProps {
  /** Query string to execute */
  query: string
  /** Display mode */
  mode?: QueryBlockDisplayMode
  /** Maximum results to show */
  limit?: number
  /** Theme */
  theme?: 'light' | 'dark'
  /** Navigate to result handler */
  onNavigate?: (path: string) => void
  /** Collapsed by default */
  defaultCollapsed?: boolean
  /** Auto-refresh interval in ms (0 to disable) */
  autoRefresh?: number
  /** Additional class names */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function QueryBlock({
  query,
  mode = 'list',
  limit = 10,
  theme = 'dark',
  onNavigate,
  defaultCollapsed = false,
  autoRefresh = 0,
  className,
}: QueryBlockProps) {
  const [result, setResult] = useState<QueryResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const isDark = theme === 'dark'

  // Execute query
  const runQuery = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const queryResult = await executeQuery(query, { defaultLimit: limit })
      setResult(queryResult)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('[QueryBlock] Query failed:', err)
      setError(err instanceof Error ? err.message : 'Query failed')
    } finally {
      setLoading(false)
    }
  }, [query, limit])

  // Initial load
  useEffect(() => {
    runQuery()
  }, [runQuery])

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh > 0) {
      const interval = setInterval(runQuery, autoRefresh)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, runQuery])

  // Render count mode (just shows count)
  if (mode === 'count') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
          isDark
            ? 'bg-cyan-500/20 text-cyan-400'
            : 'bg-cyan-100 text-cyan-600',
          className
        )}
      >
        <Search className="w-3 h-3" />
        {loading ? '...' : error ? '?' : result?.total ?? 0}
      </span>
    )
  }

  return (
    <div
      className={cn(
        'my-4 rounded-lg border overflow-hidden',
        isDark
          ? 'bg-zinc-900/50 border-zinc-800'
          : 'bg-zinc-50 border-zinc-200',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 cursor-pointer',
          'transition-colors',
          isDark
            ? 'hover:bg-zinc-800/50'
            : 'hover:bg-zinc-100/50'
        )}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: collapsed ? 0 : 90 }}
            transition={{ duration: 0.15 }}
          >
            <ChevronRight className={cn(
              'w-4 h-4',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )} />
          </motion.div>
          <Search className={cn(
            'w-4 h-4',
            isDark ? 'text-cyan-400' : 'text-cyan-500'
          )} />
          <code className={cn(
            'text-xs font-mono',
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          )}>
            {query.length > 40 ? query.substring(0, 40) + '...' : query}
          </code>
        </div>

        <div className="flex items-center gap-2">
          {/* Result count */}
          {!loading && !error && result && (
            <span className={cn(
              'text-xs',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )}>
              {result.total} result{result.total !== 1 ? 's' : ''}
            </span>
          )}

          {/* Refresh button */}
          <button
            className={cn(
              'p-1 rounded transition-colors',
              isDark
                ? 'hover:bg-zinc-700 text-zinc-500'
                : 'hover:bg-zinc-200 text-zinc-400'
            )}
            onClick={(e) => {
              e.stopPropagation()
              runQuery()
            }}
            disabled={loading}
            title="Refresh query"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className={cn(
              'border-t',
              isDark ? 'border-zinc-800' : 'border-zinc-200'
            )}>
              {/* Error state */}
              {error && (
                <div className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm',
                  'text-red-400'
                )}>
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              {/* Loading state */}
              {loading && !error && (
                <div className={cn(
                  'flex items-center justify-center py-8',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
              )}

              {/* Results */}
              {!loading && !error && result && (
                <div className="max-h-80 overflow-y-auto">
                  {result.results.length === 0 ? (
                    <div className={cn(
                      'px-4 py-6 text-center text-sm',
                      isDark ? 'text-zinc-500' : 'text-zinc-400'
                    )}>
                      No results found
                    </div>
                  ) : mode === 'compact' ? (
                    <CompactResults
                      results={result.results}
                      theme={theme}
                      onNavigate={onNavigate}
                    />
                  ) : mode === 'table' ? (
                    <TableResults
                      results={result.results}
                      theme={theme}
                      onNavigate={onNavigate}
                    />
                  ) : (
                    <ListResults
                      results={result.results}
                      theme={theme}
                      onNavigate={onNavigate}
                    />
                  )}
                </div>
              )}

              {/* Footer */}
              {!loading && !error && result && lastUpdated && (
                <div className={cn(
                  'flex items-center justify-between px-3 py-1.5 border-t text-[10px]',
                  isDark
                    ? 'border-zinc-800 text-zinc-600'
                    : 'border-zinc-200 text-zinc-400'
                )}>
                  <span>
                    Updated {lastUpdated.toLocaleTimeString()}
                  </span>
                  <span>
                    {result.executionTime}ms
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   RESULT RENDERERS
═══════════════════════════════════════════════════════════════════════════ */

interface ResultsProps {
  results: SearchResult[]
  theme: 'light' | 'dark'
  onNavigate?: (path: string) => void
}

function ListResults({ results, theme, onNavigate }: ResultsProps) {
  const isDark = theme === 'dark'

  return (
    <div className="divide-y divide-zinc-800">
      {results.map((result, idx) => {
        const path = getResultPath(result)
        const title = getResultTitle(result)
        const highlight = getResultHighlight(result)

        return (
          <button
            key={result.id || idx}
            className={cn(
              'w-full text-left px-4 py-3 transition-colors',
              isDark
                ? 'hover:bg-zinc-800/50'
                : 'hover:bg-zinc-100'
            )}
            onClick={() => onNavigate?.(path)}
          >
            <div className="flex items-start gap-3">
              <FileText className={cn(
                'w-4 h-4 mt-0.5 flex-shrink-0',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )} />
              <div className="flex-1 min-w-0">
                <div className={cn(
                  'font-medium text-sm',
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                )}>
                  {title}
                </div>
                {highlight && (
                  <div
                    className={cn(
                      'text-xs mt-1 line-clamp-2',
                      isDark ? 'text-zinc-400' : 'text-zinc-600'
                    )}
                    dangerouslySetInnerHTML={{ __html: highlight }}
                  />
                )}
                <div className={cn(
                  'text-[10px] mt-1',
                  isDark ? 'text-zinc-600' : 'text-zinc-400'
                )}>
                  {path}
                </div>
              </div>
              <ExternalLink className={cn(
                'w-3.5 h-3.5 flex-shrink-0 opacity-50',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )} />
            </div>
          </button>
        )
      })}
    </div>
  )
}

function CompactResults({ results, theme, onNavigate }: ResultsProps) {
  const isDark = theme === 'dark'

  return (
    <div className="px-3 py-2">
      <div className="flex flex-wrap gap-1.5">
        {results.map((result, idx) => {
          const path = getResultPath(result)
          const title = getResultTitle(result)

          return (
            <button
              key={result.id || idx}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded text-xs',
                'transition-colors',
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
              )}
              onClick={() => onNavigate?.(path)}
              title={path}
            >
              <FileText className="w-3 h-3" />
              <span className="truncate max-w-[150px]">{title}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TableResults({ results, theme, onNavigate }: ResultsProps) {
  const isDark = theme === 'dark'

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className={cn(
          'border-b',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}>
          <th className={cn(
            'text-left px-3 py-2 text-xs font-medium',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            Title
          </th>
          <th className={cn(
            'text-left px-3 py-2 text-xs font-medium',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            Path
          </th>
        </tr>
      </thead>
      <tbody>
        {results.map((result, idx) => {
          const path = getResultPath(result)
          const title = getResultTitle(result)

          return (
            <tr
              key={result.id || idx}
              className={cn(
                'border-b cursor-pointer transition-colors',
                isDark
                  ? 'border-zinc-800/50 hover:bg-zinc-800/30'
                  : 'border-zinc-100 hover:bg-zinc-50'
              )}
              onClick={() => onNavigate?.(path)}
            >
              <td className={cn(
                'px-3 py-2',
                isDark ? 'text-zinc-200' : 'text-zinc-800'
              )}>
                {title}
              </td>
              <td className={cn(
                'px-3 py-2 text-xs font-mono',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}>
                {path}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default QueryBlock
