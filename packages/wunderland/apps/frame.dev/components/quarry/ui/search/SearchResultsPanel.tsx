/**
 * Search results overlay for Quarry Codex
 * Displays BM25 rankings with optional semantic boost controls.
 * @module codex/ui/SearchResultsPanel
 */

'use client'

import { memo, useRef } from 'react'
import { Sparkles, Loader2, AlertTriangle, Brain } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { CodexSearchResult } from '@/lib/search/types'

const RESULT_HEIGHT = 120 // Approximate height of each result item

interface SearchResultsPanelProps {
  query: string
  results: CodexSearchResult[]
  loading: boolean
  error?: string | null
  semanticEnabled: boolean
  semanticSupported: boolean
  onToggleSemantic: (value: boolean) => void
  onSelectResult: (path: string) => void
  onClear: () => void
}

const formatScore = (value: number) => value.toFixed(2)

function SearchResultsPanelComponent({
  query,
  results,
  loading,
  error,
  semanticEnabled,
  semanticSupported,
  onToggleSemantic,
  onSelectResult,
  onClear,
}: SearchResultsPanelProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => RESULT_HEIGHT,
    overscan: 3,
  })

  if (!query) return null

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
            Search results
          </p>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
            “{query}”
            {loading ? (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 ml-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Ranking
              </span>
            ) : (
              <span className="text-xs text-gray-500 ml-2">{results.length} matches</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleSemantic(!semanticEnabled)}
            disabled={!semanticSupported && !semanticEnabled}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              semanticEnabled
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={
              semanticSupported
                ? 'Re-rank using on-device MiniLM embeddings'
                : 'Semantic boost unavailable (missing embeddings)'
            }
          >
            <Brain className="w-3.5 h-3.5" />
            Semantic
          </button>
          <button
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-cyan-600 dark:text-gray-400 dark:hover:text-cyan-300 font-semibold"
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {!loading && results.length === 0 && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">No strands match that query.</p>
      )}

      <div
        ref={parentRef}
        className="max-h-72 overflow-y-auto pr-1"
      >
        {results.length > 0 && (
          <div
            style={{
              height: virtualizer.getTotalSize(),
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const result = results[virtualItem.index]
              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: 'absolute',
                    top: virtualItem.start,
                    left: 0,
                    right: 0,
                    paddingBottom: 8, // gap between items
                  }}
                >
                  <button
                    onClick={() => onSelectResult(result.path)}
                    className="w-full text-left border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 hover:border-cyan-500 hover:shadow-sm transition-all bg-white dark:bg-gray-900"
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                        {result.title}
                      </h4>
                      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {result.weave && <span>{result.weave}</span>}
                        {result.loom && <span>• {result.loom}</span>}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                      {result.summary || 'No summary available'}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <Sparkles className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                        BM25 {formatScore(result.bm25Score)}
                      </div>
                      {typeof result.semanticScore === 'number' && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200">
                          Semantic {formatScore(result.semanticScore)}
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const SearchResultsPanel = memo(SearchResultsPanelComponent)
SearchResultsPanel.displayName = 'SearchResultsPanel'

export default SearchResultsPanel


