/**
 * Research Popover - Inline floating research modal
 * @module codex/ui/ResearchPopover
 *
 * Floating popover for quick web research & citations:
 * - Quick search input with instant results
 * - Research sessions management
 * - Citation insertion
 * - Keyboard shortcut: Cmd+Shift+R
 */

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  Search,
  Globe,
  ExternalLink,
  Sparkles,
  BookOpen,
  GraduationCap,
  History,
  Trash2,
  Loader2,
  AlertCircle,
  Clock,
  X,
  Quote,
  Link2,
  ArrowUpRight,
  Copy,
  Check,
  ChevronDown,
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
import { formatCitation, getCitationStyles, type CitationStyle, type CitationSource } from '@/lib/research/citationFormatter'
import { cn } from '@/lib/utils'

interface ResearchPopoverProps {
  /** Whether popover is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Current theme */
  theme?: string
  /** Initial search query */
  initialQuery?: string
  /** Callback to insert citation at cursor */
  onInsertCitation?: (citation: { title: string; url: string; snippet?: string }) => void
  /** Navigate to full research page */
  onOpenFullPage?: () => void
}

export default function ResearchPopover({
  isOpen,
  onClose,
  theme = 'light',
  initialQuery = '',
  onInsertCitation,
  onOpenFullPage,
}: ResearchPopoverProps) {
  const isDark = theme.includes('dark')
  const [query, setQuery] = useState(initialQuery)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<WebSearchResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'search' | 'sessions'>('search')
  const [citationDropdownId, setCitationDropdownId] = useState<string | null>(null)
  const [copiedStyle, setCopiedStyle] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Citation styles
  const citationStyles = getCitationStyles()

  // Research sessions hook
  const {
    sessions,
    activeSession,
    create: createSession,
    remove: deleteSession,
    activate: activateSession,
  } = useResearchSessions()

  // Get configured providers
  const [configuredProviders, setConfiguredProviders] = useState<SearchProvider[]>([])
  useEffect(() => {
    getConfiguredSearchProviders().then(setConfiguredProviders)
  }, [])

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  // Quick search
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResults([])

    try {
      const response = await webSearch(query.trim(), { maxResults: 8 })
      setResults(response.results || [])

      // Check for error in response (e.g., CORS failures for academic search)
      if (response.error) {
        setError(response.error)
      }

      // Create session if none active
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

  // Insert citation
  const handleInsertCitation = useCallback(
    (result: WebSearchResult) => {
      if (onInsertCitation) {
        onInsertCitation({
          title: result.title,
          url: result.url,
          snippet: result.snippet,
        })
        onClose()
      }
    },
    [onInsertCitation, onClose]
  )

  // Copy citation in specified format
  const handleCopyCitation = useCallback(
    async (result: WebSearchResult, style: CitationStyle) => {
      const source: CitationSource = {
        title: result.title,
        url: result.url,
        publishedDate: result.publishedDate,
        accessedDate: new Date(),
        type: 'webpage',
      }

      const formatted = formatCitation(source, style)
      await navigator.clipboard.writeText(formatted)

      // Show feedback
      setCopiedStyle(`${result.id || result.url}-${style}`)
      setTimeout(() => setCopiedStyle(null), 2000)

      // Close dropdown
      setCitationDropdownId(null)
    },
    []
  )

  // Close citation dropdown when clicking outside
  useEffect(() => {
    const handleClick = () => setCitationDropdownId(null)
    if (citationDropdownId) {
      // Delay to allow button click to register
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClick)
      }, 0)
      return () => {
        clearTimeout(timer)
        document.removeEventListener('click', handleClick)
      }
    }
  }, [citationDropdownId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity',
          isDark ? 'bg-black/60' : 'bg-black/40'
        )}
        onClick={onClose}
      />

      {/* Popover */}
      <div
        ref={popoverRef}
        className={cn(
          'relative w-full max-w-2xl mx-4 rounded-xl shadow-2xl border overflow-hidden',
          'animate-in fade-in slide-in-from-top-4 duration-200',
          isDark
            ? 'bg-zinc-900 border-zinc-700'
            : 'bg-white border-zinc-200'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'px-4 py-3 border-b flex items-center justify-between',
            isDark ? 'border-zinc-800' : 'border-zinc-100'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2 rounded-lg',
                isDark ? 'bg-teal-900/50' : 'bg-teal-100'
              )}
            >
              <Globe
                className={cn('w-5 h-5', isDark ? 'text-teal-400' : 'text-teal-600')}
              />
            </div>
            <div>
              <h2
                className={cn(
                  'text-base font-semibold',
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                )}
              >
                Web Research
              </h2>
              <p
                className={cn(
                  'text-xs',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}
              >
                Search, cite, and save research
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenFullPage && (
              <button
                onClick={() => {
                  onOpenFullPage()
                  onClose()
                }}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors',
                  isDark
                    ? 'text-teal-400 hover:bg-zinc-800'
                    : 'text-teal-600 hover:bg-zinc-100'
                )}
              >
                Open Full Page
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark
                  ? 'hover:bg-zinc-800 text-zinc-400'
                  : 'hover:bg-zinc-100 text-zinc-500'
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className={cn('px-4 py-3', isDark ? 'bg-zinc-900' : 'bg-zinc-50/50')}>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search the web for research..."
              className={cn(
                'w-full pl-10 pr-4 py-3 text-sm rounded-lg border transition-colors',
                isDark
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-teal-600'
                  : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-teal-500',
                'focus:outline-none focus:ring-2',
                isDark ? 'focus:ring-teal-600/30' : 'focus:ring-teal-500/30'
              )}
            />
            <Search
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}
            />
            {loading && (
              <Loader2
                className={cn(
                  'absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin',
                  isDark ? 'text-teal-400' : 'text-teal-600'
                )}
              />
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSearch}
              disabled={!query.trim() || loading}
              className={cn(
                'flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2',
                isDark
                  ? 'bg-teal-600 text-white hover:bg-teal-500 disabled:bg-zinc-800 disabled:text-zinc-600'
                  : 'bg-teal-500 text-white hover:bg-teal-600 disabled:bg-zinc-200 disabled:text-zinc-400'
              )}
            >
              <Search className="w-4 h-4" />
              Search
            </button>
            <button
              onClick={() => {
                // Don't append if already has site:arxiv.org
                if (!query.includes('site:arxiv.org')) {
                  setQuery('site:arxiv.org ' + query)
                }
                handleSearch()
              }}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2',
                isDark
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              )}
            >
              <GraduationCap className="w-4 h-4" />
              Papers
            </button>
            <button
              onClick={() => {
                // Don't append if already has define:
                if (!query.includes('define:')) {
                  setQuery('define: ' + query)
                }
                handleSearch()
              }}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2',
                isDark
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              )}
            >
              <BookOpen className="w-4 h-4" />
              Define
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={cn('border-b', isDark ? 'border-zinc-800' : 'border-zinc-100')}>
          <div className="flex">
            <button
              onClick={() => setActiveTab('search')}
              className={cn(
                'flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative',
                activeTab === 'search'
                  ? isDark
                    ? 'text-teal-400'
                    : 'text-teal-600'
                  : isDark
                  ? 'text-zinc-500 hover:text-zinc-300'
                  : 'text-zinc-400 hover:text-zinc-600'
              )}
            >
              Results
              {activeTab === 'search' && (
                <div
                  className={cn(
                    'absolute bottom-0 left-0 right-0 h-0.5',
                    isDark ? 'bg-teal-400' : 'bg-teal-500'
                  )}
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={cn(
                'flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative',
                activeTab === 'sessions'
                  ? isDark
                    ? 'text-teal-400'
                    : 'text-teal-600'
                  : isDark
                  ? 'text-zinc-500 hover:text-zinc-300'
                  : 'text-zinc-400 hover:text-zinc-600'
              )}
            >
              Sessions ({sessions.length})
              {activeTab === 'sessions' && (
                <div
                  className={cn(
                    'absolute bottom-0 left-0 right-0 h-0.5',
                    isDark ? 'bg-teal-400' : 'bg-teal-500'
                  )}
                />
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[50vh] overflow-y-auto p-4">
          {/* Error */}
          {error && (
            <div
              className={cn(
                'p-3 rounded-lg text-sm mb-4 border',
                isDark
                  ? 'bg-amber-900/20 border-amber-800/50 text-amber-200'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              )}
            >
              <div className="flex items-start gap-2">
                <AlertCircle className={cn(
                  "w-5 h-5 shrink-0 mt-0.5",
                  isDark ? "text-amber-400" : "text-amber-600"
                )} />
                <div className="space-y-1.5">
                  <p className="leading-relaxed">{error}</p>
                  {error.includes('CORS') && (
                    <p className={cn(
                      "text-xs",
                      isDark ? "text-amber-400/70" : "text-amber-700/70"
                    )}>
                      💡 Tip: Remove "site:arxiv.org" from your search to use general web search instead.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <>
              {/* Results */}
              {results.length > 0 ? (
                <div className="space-y-3">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={cn(
                        'p-3 rounded-lg border transition-colors group',
                        isDark
                          ? 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                          : 'bg-white border-zinc-200 hover:border-zinc-300',
                        isAcademicUrl(result.url) &&
                          (isDark
                            ? 'border-l-2 border-l-violet-500'
                            : 'border-l-2 border-l-violet-400')
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              'text-sm font-medium hover:underline flex items-center gap-1.5',
                              isDark ? 'text-zinc-200' : 'text-zinc-800'
                            )}
                          >
                            {result.title}
                            <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                          </a>
                          <p
                            className={cn(
                              'text-xs mt-1 line-clamp-2',
                              isDark ? 'text-zinc-500' : 'text-zinc-500'
                            )}
                          >
                            {result.snippet}
                          </p>
                          <p
                            className={cn(
                              'text-[10px] mt-1.5 truncate',
                              isDark ? 'text-zinc-600' : 'text-zinc-400'
                            )}
                          >
                            {result.url}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onInsertCitation && (
                            <button
                              onClick={() => handleInsertCitation(result)}
                              className={cn(
                                'p-1.5 rounded-lg transition-colors',
                                isDark
                                  ? 'hover:bg-zinc-700 text-zinc-400 hover:text-teal-400'
                                  : 'hover:bg-zinc-100 text-zinc-400 hover:text-teal-600'
                              )}
                              title="Insert citation"
                            >
                              <Quote className="w-4 h-4" />
                            </button>
                          )}

                          {/* Citation copy dropdown */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const resultId = result.id || `result-${index}`
                                setCitationDropdownId(
                                  citationDropdownId === resultId ? null : resultId
                                )
                              }}
                              className={cn(
                                'p-1.5 rounded-lg transition-colors flex items-center gap-0.5',
                                isDark
                                  ? 'hover:bg-zinc-700 text-zinc-400 hover:text-violet-400'
                                  : 'hover:bg-zinc-100 text-zinc-400 hover:text-violet-600',
                                citationDropdownId === (result.id || `result-${index}`) &&
                                  (isDark ? 'bg-zinc-700 text-violet-400' : 'bg-zinc-100 text-violet-600')
                              )}
                              title="Copy citation"
                            >
                              <Copy className="w-4 h-4" />
                              <ChevronDown className="w-3 h-3" />
                            </button>

                            {/* Dropdown menu */}
                            {citationDropdownId === (result.id || `result-${index}`) && (
                              <div
                                className={cn(
                                  'absolute right-0 top-full mt-1 w-48 py-1 rounded-lg border shadow-xl z-50',
                                  isDark
                                    ? 'bg-zinc-800 border-zinc-700'
                                    : 'bg-white border-zinc-200'
                                )}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div
                                  className={cn(
                                    'px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider',
                                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                                  )}
                                >
                                  Copy as
                                </div>
                                {citationStyles.map((style) => {
                                  const resultKey = `${result.id || result.url}-${style.id}`
                                  const isCopied = copiedStyle === resultKey
                                  return (
                                    <button
                                      key={style.id}
                                      onClick={() => handleCopyCitation(result, style.id)}
                                      className={cn(
                                        'w-full px-3 py-1.5 text-left text-xs flex items-center justify-between transition-colors',
                                        isDark
                                          ? 'hover:bg-zinc-700 text-zinc-300'
                                          : 'hover:bg-zinc-100 text-zinc-700',
                                        isCopied &&
                                          (isDark ? 'text-emerald-400' : 'text-emerald-600')
                                      )}
                                    >
                                      <span className="flex flex-col">
                                        <span className="font-medium">{style.label}</span>
                                        <span
                                          className={cn(
                                            'text-[10px]',
                                            isDark ? 'text-zinc-500' : 'text-zinc-400'
                                          )}
                                        >
                                          {style.description}
                                        </span>
                                      </span>
                                      {isCopied && <Check className="w-3.5 h-3.5" />}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(result.url)
                            }}
                            className={cn(
                              'p-1.5 rounded-lg transition-colors',
                              isDark
                                ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                                : 'hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600'
                            )}
                            title="Copy link"
                          >
                            <Link2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !loading && !error ? (
                <div
                  className={cn(
                    'text-center py-12',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}
                >
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Search to find research results</p>
                  <p className="text-xs mt-1">
                    Press Enter or click Search to start
                  </p>
                </div>
              ) : null}
            </>
          )}

          {activeTab === 'sessions' && (
            <>
              {sessions.length > 0 ? (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        activateSession(session.id)
                        setActiveTab('search')
                      }}
                      className={cn(
                        'w-full p-3 rounded-lg border text-left transition-colors group',
                        isDark
                          ? 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                          : 'bg-white border-zinc-200 hover:border-zinc-300',
                        session.id === activeSession?.id &&
                          (isDark ? 'border-teal-600' : 'border-teal-400')
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className={cn(
                              'text-sm font-medium',
                              isDark ? 'text-zinc-200' : 'text-zinc-800'
                            )}
                          >
                            {session.topic}
                          </p>
                          <p
                            className={cn(
                              'text-xs mt-1 flex items-center gap-2',
                              isDark ? 'text-zinc-500' : 'text-zinc-400'
                            )}
                          >
                            <Clock className="w-3 h-3" />
                            {new Date(session.updatedAt).toLocaleDateString()}
                            {session.savedResults.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                {session.savedResults.length} saved
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
                            'p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                            isDark
                              ? 'hover:bg-zinc-700 text-zinc-500 hover:text-red-400'
                              : 'hover:bg-zinc-100 text-zinc-400 hover:text-red-500'
                          )}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div
                  className={cn(
                    'text-center py-12',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}
                >
                  <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No research sessions yet</p>
                  <p className="text-xs mt-1">
                    Sessions are created automatically when you search
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className={cn(
            'px-4 py-3 border-t flex items-center justify-between',
            isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-100 bg-zinc-50/50'
          )}
        >
          <div
            className={cn(
              'text-xs flex items-center gap-2',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )}
          >
            {configuredProviders.length > 0 ? (
              <>
                <span className="flex items-center gap-1">
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      isDark ? 'bg-emerald-400' : 'bg-emerald-500'
                    )}
                  />
                  {configuredProviders.length} provider{configuredProviders.length > 1 ? 's' : ''} active
                </span>
              </>
            ) : (
              <span>Using DuckDuckGo (free)</span>
            )}
          </div>
          <div className={cn('text-xs', isDark ? 'text-zinc-600' : 'text-zinc-300')}>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px]">
              ⌘⇧R
            </kbd>{' '}
            to open
          </div>
        </div>
      </div>
    </div>
  )
}
