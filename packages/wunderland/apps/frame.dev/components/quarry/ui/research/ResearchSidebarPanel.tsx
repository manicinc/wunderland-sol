/**
 * Research Sidebar Panel - Quick access to web research & citations
 * @module codex/ui/ResearchSidebarPanel
 *
 * Embedded sidebar panel for research tools with:
 * - Quick search input
 * - Recent research sessions
 * - Provider status
 * - Citation quick-add
 */

'use client'

import React, { useState, useCallback, useRef } from 'react'
import {
  Search,
  Globe,
  ExternalLink,
  Sparkles,
  BookOpen,
  GraduationCap,
  History,
  Plus,
  Trash2,
  ArrowRight,
  Loader2,
  AlertCircle,
  Clock,
  Settings2,
} from 'lucide-react'
import {
  webSearch,
  type WebSearchResult,
  type SearchProvider,
  SEARCH_PROVIDERS,
  getConfiguredSearchProviders,
  useResearchSessions,
} from '@/lib/research'
import { isAcademicUrl } from '@/lib/research/academicDetector'
import { cn } from '@/lib/utils'

interface ResearchSidebarPanelProps {
  /** Current theme */
  theme?: string
  /** Callback to open full research panel */
  onOpenFullPanel?: (query?: string) => void
  /** Navigate to a strand */
  onNavigateToStrand?: (path: string) => void
}

export default function ResearchSidebarPanel({
  theme = 'light',
  onOpenFullPanel,
  onNavigateToStrand,
}: ResearchSidebarPanelProps) {
  const isDark = theme.includes('dark')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<WebSearchResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Research sessions hook
  const {
    sessions,
    activeSession,
    create: createSession,
    remove: deleteSession,
    activate: activateSession,
  } = useResearchSessions()

  // Get configured providers - async function, resolve on mount
  const [configuredProviders, setConfiguredProviders] = useState<SearchProvider[]>([])
  React.useEffect(() => {
    getConfiguredSearchProviders().then(setConfiguredProviders)
  }, [])

  // Quick search
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResults([])

    try {
      const response = await webSearch(query.trim(), { maxResults: 5 })
      setResults(response.results || [])

      // Create or update session
      if (!activeSession) {
        createSession(`Search: ${query.trim().slice(0, 30)}...`)
      }
    } catch (err) {
      console.error('[Research] Search error:', err)
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [query, activeSession, createSession])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch()
      }
    },
    [handleSearch]
  )

  // Quick actions that open full panel with pre-filled query
  const quickActions = [
    { label: 'Research', icon: Search, prefix: '' },
    { label: 'Define', icon: BookOpen, prefix: 'define: ' },
    { label: 'Papers', icon: GraduationCap, prefix: 'site:arxiv.org ' },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className={cn(
          'px-3 py-3 border-b shrink-0',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className={cn(
              'p-1.5 rounded-lg',
              isDark ? 'bg-teal-900/50' : 'bg-teal-100'
            )}
          >
            <Globe
              className={cn('w-4 h-4', isDark ? 'text-teal-400' : 'text-teal-600')}
            />
          </div>
          <div>
            <h3
              className={cn(
                'text-sm font-semibold',
                isDark ? 'text-zinc-100' : 'text-zinc-900'
              )}
            >
              Web Research
            </h3>
            <p
              className={cn(
                'text-[10px]',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}
            >
              Search & Citations
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search the web..."
            className={cn(
              'w-full pl-8 pr-3 py-2 text-sm rounded-lg border transition-colors',
              isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-teal-600'
                : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-teal-500',
              'focus:outline-none focus:ring-1',
              isDark ? 'focus:ring-teal-600/50' : 'focus:ring-teal-500/50'
            )}
          />
          <Search
            className={cn(
              'absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )}
          />
          {loading && (
            <Loader2
              className={cn(
                'absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin',
                isDark ? 'text-teal-400' : 'text-teal-600'
              )}
            />
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-1.5 mt-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                if (onOpenFullPanel) {
                  onOpenFullPanel(action.prefix + query)
                }
              }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-md transition-colors',
                isDark
                  ? 'bg-zinc-800 text-zinc-400 hover:text-teal-400 hover:bg-zinc-700'
                  : 'bg-zinc-100 text-zinc-500 hover:text-teal-600 hover:bg-zinc-200'
              )}
            >
              <action.icon className="w-3 h-3" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Error */}
        {error && (
          <div
            className={cn(
              'p-2 rounded-lg text-xs flex items-start gap-2',
              isDark
                ? 'bg-red-900/30 text-red-400'
                : 'bg-red-50 text-red-600'
            )}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <h4
              className={cn(
                'text-[10px] font-semibold uppercase tracking-wide',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}
            >
              Results
            </h4>
            {results.map((result, index) => (
              <a
                key={index}
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'block p-2 rounded-lg border transition-colors',
                  isDark
                    ? 'bg-zinc-800/50 border-zinc-700 hover:border-teal-700'
                    : 'bg-white border-zinc-200 hover:border-teal-300',
                  isAcademicUrl(result.url) &&
                    (isDark ? 'border-l-2 border-l-violet-500' : 'border-l-2 border-l-violet-400')
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-xs font-medium line-clamp-1',
                        isDark ? 'text-zinc-200' : 'text-zinc-800'
                      )}
                    >
                      {result.title}
                    </p>
                    <p
                      className={cn(
                        'text-[10px] line-clamp-2 mt-0.5',
                        isDark ? 'text-zinc-500' : 'text-zinc-500'
                      )}
                    >
                      {result.snippet}
                    </p>
                  </div>
                  <ExternalLink
                    className={cn(
                      'w-3 h-3 shrink-0',
                      isDark ? 'text-zinc-600' : 'text-zinc-400'
                    )}
                  />
                </div>
              </a>
            ))}

            {/* View more in full panel */}
            <button
              onClick={() => onOpenFullPanel?.(query)}
              className={cn(
                'w-full py-2 text-xs font-medium flex items-center justify-center gap-1 rounded-lg transition-colors',
                isDark
                  ? 'text-teal-400 hover:bg-zinc-800'
                  : 'text-teal-600 hover:bg-zinc-100'
              )}
            >
              View more results
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Research Sessions */}
        {sessions.length > 0 && (
          <div className="space-y-2">
            <h4
              className={cn(
                'text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}
            >
              <History className="w-3 h-3" />
              Recent Sessions
            </h4>
            {sessions.slice(0, 5).map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  activateSession(session.id)
                  onOpenFullPanel?.()
                }}
                className={cn(
                  'w-full p-2 rounded-lg border text-left transition-colors group',
                  isDark
                    ? 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                    : 'bg-white border-zinc-200 hover:border-zinc-300',
                  session.id === activeSession?.id &&
                    (isDark ? 'border-teal-600' : 'border-teal-400')
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'text-xs font-medium line-clamp-1',
                        isDark ? 'text-zinc-200' : 'text-zinc-800'
                      )}
                    >
                      {session.topic}
                    </p>
                    <p
                      className={cn(
                        'text-[10px] mt-0.5 flex items-center gap-1',
                        isDark ? 'text-zinc-500' : 'text-zinc-400'
                      )}
                    >
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(session.updatedAt).toLocaleDateString()}
                      {session.savedResults.length > 0 && (
                        <span>
                          {' '}
                          - {session.savedResults.length} saved
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteSession(session.id)
                    }}
                    className={cn(
                      'p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                      isDark
                        ? 'hover:bg-zinc-700 text-zinc-500 hover:text-red-400'
                        : 'hover:bg-zinc-100 text-zinc-400 hover:text-red-500'
                    )}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Provider Status */}
        <div className="space-y-2">
          <h4
            className={cn(
              'text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )}
          >
            <Settings2 className="w-3 h-3" />
            Search Providers
          </h4>
          <div
            className={cn(
              'p-2 rounded-lg text-[10px]',
              isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
            )}
          >
            {configuredProviders.length > 0 ? (
              <div className="space-y-1">
                {configuredProviders.map((provider) => {
                  const info = SEARCH_PROVIDERS[provider]
                  return (
                    <div
                      key={provider}
                      className="flex items-center justify-between"
                    >
                      <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>
                        {info?.name || provider}
                      </span>
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[9px]',
                          isDark
                            ? 'bg-emerald-900/50 text-emerald-400'
                            : 'bg-emerald-100 text-emerald-600'
                        )}
                      >
                        Active
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>
                Using free DuckDuckGo search. Configure premium providers in
                settings for better results.
              </p>
            )}
          </div>
        </div>

        {/* Tips */}
        <div
          className={cn(
            'p-2 rounded-lg text-[10px] leading-relaxed',
            isDark ? 'bg-zinc-800/30 text-zinc-500' : 'bg-zinc-50 text-zinc-400'
          )}
        >
          <p className="flex items-center gap-1 font-medium mb-1">
            <Sparkles className="w-3 h-3" />
            Pro Tips
          </p>
          <ul className="space-y-0.5 list-disc list-inside">
            <li>Use Cmd+Shift+R in editor for quick research</li>
            <li>Academic papers from arXiv, DOI, PubMed auto-detected</li>
            <li>Save results to build research sessions</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
