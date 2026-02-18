/**
 * Research Panel - Web search for knowledge discovery
 * @module codex/ui/ResearchPanel
 *
 * Slide-out panel for web research with multiple search providers.
 * Supports DuckDuckGo (free), Brave, and Serper (BYOK).
 */

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  Loader2,
  Globe,
  Clock,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Settings2,
  RefreshCw,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  Zap,
  Info,
  BookOpen,
  GraduationCap,
  FolderOpen,
  Plus,
  Trash2,
  ChevronDown,
  History,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import {
  webSearch,
  type WebSearchResult,
  type WebSearchResponse,
  type SearchProvider,
  type SearchOptions,
  type ResearchSession,
  SEARCH_PROVIDERS,
  getConfiguredSearchProviders,
  useResearchSessions,
} from '@/lib/research'
import { isAcademicResult, getCitationInput, extractCitationId } from '@/lib/research/academicDetector'
import {
  getRecommendations,
  s2PaperToSearchResult,
  resolveToPaperId,
  type S2Paper,
} from '@/lib/research/semanticScholar'
import type { Citation } from '@/lib/citations/types'

// Dynamic import CitationInput to avoid SSR issues
const CitationInput = dynamic(() => import('../citations/CitationInput'), { ssr: false })

interface ResearchPanelProps {
  /** Whether the panel is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Current theme */
  theme?: string
  /** Default search query */
  defaultQuery?: string
  /** Callback when user wants to save a result */
  onSaveResult?: (result: WebSearchResult) => void
  /** Callback when user wants to insert result into editor */
  onInsertResult?: (result: WebSearchResult, format: 'link' | 'citation' | 'markdown') => void
  /** Callback when user adds a citation from research */
  onAddCitation?: (citation: Citation, format: 'inline' | 'card' | 'reference') => void
}

type TimeRange = 'all' | 'day' | 'week' | 'month' | 'year'

const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: 'all', label: 'Any time' },
  { value: 'day', label: 'Past 24 hours' },
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month' },
  { value: 'year', label: 'Past year' },
]

export default function ResearchPanel({
  isOpen,
  onClose,
  theme = 'light',
  defaultQuery = '',
  onSaveResult,
  onInsertResult,
  onAddCitation,
}: ResearchPanelProps) {
  const [query, setQuery] = useState(defaultQuery)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<WebSearchResponse | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [showSettings, setShowSettings] = useState(false)
  const [configuredProviders, setConfiguredProviders] = useState<SearchProvider[]>(['duckduckgo'])
  const [preferredProvider, setPreferredProvider] = useState<SearchProvider | null>(null)
  const [savedResults, setSavedResults] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Citation modal state
  const [showCitationModal, setShowCitationModal] = useState(false)
  const [citationInput, setCitationInput] = useState('')

  // Semantic Scholar recommendations state
  const [recommendations, setRecommendations] = useState<WebSearchResult[]>([])
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(false)

  // Session management
  const {
    sessions,
    activeSession,
    create: createSession,
    activate: activateSession,
    deactivate: deactivateSession,
    addQuery: addQueryToSession,
    saveResult: saveResultToSession,
    unsaveResult: unsaveResultFromSession,
    remove: removeSession,
  } = useResearchSessions()
  const [showSessionList, setShowSessionList] = useState(false)
  const [newSessionTopic, setNewSessionTopic] = useState('')

  // Related searches expanded state
  const [relatedSearchesExpanded, setRelatedSearchesExpanded] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const isDark = theme.includes('dark')

  // Load configured providers
  useEffect(() => {
    if (isOpen) {
      getConfiguredSearchProviders().then(setConfiguredProviders)
    }
  }, [isOpen])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      if (defaultQuery) {
        setQuery(defaultQuery)
      }
    }
  }, [isOpen, defaultQuery])

  /**
   * Perform search
   */
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)

    try {
      const options: SearchOptions = {
        maxResults: 15,
        timeRange: timeRange === 'all' ? undefined : timeRange,
        preferredProvider: preferredProvider || undefined,
      }

      const result = await webSearch(query.trim(), options)
      setResponse(result)

      // Check if search returned an error (all providers failed)
      if (result.error) {
        // Parse the error to provide helpful suggestions
        const errorMessage = result.error
        if (errorMessage.includes('CORS') || errorMessage.includes('Failed to fetch') || errorMessage.includes('not available')) {
          setError('Search services are blocked by browser security (CORS). This is a known limitation on static sites. Try using a proxy service or configure an API key in Settings → Research.')
        } else if (errorMessage.includes('rate') || errorMessage.includes('429') || errorMessage.includes('Too Many')) {
          setError('Search rate limit reached. Please wait a moment and try again, or configure your own API key in Settings → Research.')
        } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
          setError('Search timed out. The search services may be slow or unavailable. Please try again.')
        } else {
          setError(errorMessage)
        }
      } else {
        setError(null)
      }

      // Add query to active session
      if (activeSession) {
        addQueryToSession(query.trim())
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Search failed'
      // Provide helpful error messages for common issues
      if (errorMsg.includes('CORS') || errorMsg.includes('Failed to fetch')) {
        setError('Search services are blocked by browser security (CORS). Configure an API key in Settings → Research for reliable search.')
      } else if (errorMsg.includes('rate') || errorMsg.includes('429')) {
        setError('Rate limited. Please wait and try again, or use your own API key.')
      } else {
        setError(errorMsg)
      }
      setResponse(null)
    } finally {
      setLoading(false)
    }
  }, [query, timeRange, preferredProvider, activeSession, addQueryToSession])

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
    setResponse(null)
    setError(null)
    inputRef.current?.focus()
  }, [])

  /**
   * Copy URL to clipboard
   */
  const handleCopy = useCallback((result: WebSearchResult) => {
    navigator.clipboard.writeText(result.url)
    setCopiedId(result.id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  /**
   * Toggle save result
   */
  const handleToggleSave = useCallback((result: WebSearchResult) => {
    setSavedResults(prev => {
      const next = new Set(prev)
      if (next.has(result.id)) {
        next.delete(result.id)
        // Remove from active session
        if (activeSession) {
          unsaveResultFromSession(result.id)
        }
      } else {
        next.add(result.id)
        onSaveResult?.(result)
        // Save to active session
        if (activeSession) {
          saveResultToSession(result)
        }
      }
      return next
    })
  }, [onSaveResult, activeSession, saveResultToSession, unsaveResultFromSession])

  /**
   * Open citation modal for an academic result
   */
  const handleCiteResult = useCallback((result: WebSearchResult) => {
    const input = getCitationInput(result)
    setCitationInput(input)
    setShowCitationModal(true)
  }, [])

  /**
   * Handle citation insert from modal
   */
  const handleCitationInsert = useCallback((citation: Citation, format: 'inline' | 'card' | 'reference') => {
    onAddCitation?.(citation, format)
    setShowCitationModal(false)
    setCitationInput('')
  }, [onAddCitation])

  /**
   * Fetch Semantic Scholar recommendations based on saved academic results
   */
  const fetchRecommendations = useCallback(async () => {
    // Get academic results from current results and active session
    const academicResults = [
      ...(response?.results.filter(r => isAcademicResult(r) && savedResults.has(r.id)) || []),
      ...(activeSession?.savedResults.filter(r => isAcademicResult(r)) || []),
    ]

    if (academicResults.length === 0) {
      setRecommendations([])
      return
    }

    setRecommendationsLoading(true)
    setShowRecommendations(true)

    try {
      // Resolve paper IDs from URLs
      const paperIdPromises = academicResults.slice(0, 5).map(async (result) => {
        const citationId = extractCitationId(result.url)
        if (citationId) {
          return resolveToPaperId(citationId)
        }
        return null
      })

      const paperIds = (await Promise.all(paperIdPromises)).filter((id): id is string => id !== null)

      if (paperIds.length === 0) {
        setRecommendations([])
        return
      }

      // Fetch recommendations
      const papers = await getRecommendations(paperIds, { limit: 8 })
      const results = papers.map((paper, i) => s2PaperToSearchResult(paper, i))
      setRecommendations(results)
    } catch (err) {
      console.error('Failed to fetch recommendations:', err)
      setRecommendations([])
    } finally {
      setRecommendationsLoading(false)
    }
  }, [response, savedResults, activeSession])

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
          <Globe className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
          <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Web Research
          </h2>
          {/* Provider Status Indicators */}
          <div className="flex items-center gap-1">
            {configuredProviders.map((provider) => (
              <span
                key={provider}
                className={`
                  text-[10px] px-1.5 py-0.5 rounded-full font-medium
                  ${provider === 'duckduckgo'
                    ? isDark ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-600'
                    : provider === 'brave'
                      ? isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'
                      : provider === 'serper'
                        ? isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'
                        : isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
                  }
                `}
                title={`${SEARCH_PROVIDERS[provider]?.name || provider} ${provider === 'duckduckgo' ? '(free)' : '(configured)'}`}
              >
                {SEARCH_PROVIDERS[provider]?.name?.slice(0, 3).toUpperCase() || provider.slice(0, 3).toUpperCase()}
              </span>
            ))}
          </div>
          {response && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
            }`}>
              via {SEARCH_PROVIDERS[response.source]?.name || response.source}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`
              p-1.5 rounded-lg transition-colors
              ${showSettings
                ? isDark
                  ? 'bg-cyan-900/30 text-cyan-400'
                  : 'bg-cyan-50 text-cyan-600'
                : isDark
                  ? 'hover:bg-gray-800 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-500'
              }
            `}
          >
            <Settings2 className="w-4 h-4" />
          </button>
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
      </div>

      {/* Session Bar */}
      <div
        className={`
          flex items-center justify-between px-4 py-2 border-b
          ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FolderOpen className={`w-4 h-4 shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          {activeSession ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {activeSession.topic}
              </span>
              <span className={`text-xs shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {activeSession.queries.length} queries • {activeSession.savedResults.length} saved
              </span>
            </div>
          ) : (
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No active session
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activeSession && (
            <button
              onClick={deactivateSession}
              className={`
                p-1.5 rounded-lg transition-colors text-xs
                ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}
              `}
              title="Close session"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setShowSessionList(!showSessionList)}
              className={`
                p-1.5 rounded-lg transition-colors flex items-center gap-1
                ${showSessionList
                  ? isDark
                    ? 'bg-violet-900/30 text-violet-400'
                    : 'bg-violet-50 text-violet-600'
                  : isDark
                    ? 'hover:bg-gray-700 text-gray-400'
                    : 'hover:bg-gray-200 text-gray-500'
                }
              `}
              title="Sessions"
            >
              <History className="w-4 h-4" />
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Sessions Dropdown */}
            <AnimatePresence>
              {showSessionList && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`
                    absolute right-0 top-full mt-1 z-50 w-64 rounded-xl border shadow-lg
                    ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                  `}
                >
                  {/* Create new session */}
                  <div className={`p-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={newSessionTopic}
                        onChange={(e) => setNewSessionTopic(e.target.value)}
                        placeholder="New session topic..."
                        className={`
                          flex-1 px-2 py-1.5 text-xs rounded border
                          ${isDark
                            ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-500'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                          }
                        `}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newSessionTopic.trim()) {
                            createSession(newSessionTopic.trim())
                            setNewSessionTopic('')
                            setShowSessionList(false)
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newSessionTopic.trim()) {
                            createSession(newSessionTopic.trim())
                            setNewSessionTopic('')
                            setShowSessionList(false)
                          }
                        }}
                        disabled={!newSessionTopic.trim()}
                        className={`
                          p-1.5 rounded transition-colors
                          ${isDark
                            ? 'bg-violet-600 text-white hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500'
                            : 'bg-violet-500 text-white hover:bg-violet-600 disabled:bg-gray-200 disabled:text-gray-400'
                          }
                        `}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Session list */}
                  <div className="max-h-48 overflow-y-auto">
                    {sessions.length === 0 ? (
                      <div className={`p-3 text-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        No saved sessions
                      </div>
                    ) : (
                      sessions.map((session) => (
                        <div
                          key={session.id}
                          className={`
                            flex items-center justify-between px-3 py-2 cursor-pointer group
                            ${session.id === activeSession?.id
                              ? isDark
                                ? 'bg-violet-900/20'
                                : 'bg-violet-50'
                              : isDark
                                ? 'hover:bg-gray-700/50'
                                : 'hover:bg-gray-50'
                            }
                          `}
                          onClick={() => {
                            activateSession(session.id)
                            setShowSessionList(false)
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {session.topic}
                            </p>
                            <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              {session.queries.length} queries • {new Date(session.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeSession(session.id)
                            }}
                            className={`
                              p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity
                              ${isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'}
                            `}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`overflow-hidden border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <div className="p-4 space-y-3">
              <h3 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Search Providers
              </h3>
              <div className="space-y-2">
                {Object.values(SEARCH_PROVIDERS).map(provider => {
                  const isConfigured = configuredProviders.includes(provider.id)
                  const isPreferred = preferredProvider === provider.id

                  return (
                    <div
                      key={provider.id}
                      className={`
                        p-3 rounded-lg border
                        ${isDark
                          ? isConfigured ? 'bg-gray-800 border-gray-600' : 'bg-gray-800/50 border-gray-700'
                          : isConfigured ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isConfigured ? (
                            <Zap className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              isDark ? 'border-gray-600' : 'border-gray-300'
                            }`} />
                          )}
                          <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                            {provider.name}
                          </span>
                          {!provider.requiresKey && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              FREE
                            </span>
                          )}
                        </div>
                        {isConfigured && (
                          <button
                            onClick={() => setPreferredProvider(isPreferred ? null : provider.id)}
                            className={`
                              text-xs px-2 py-1 rounded transition-colors
                              ${isPreferred
                                ? isDark
                                  ? 'bg-cyan-900/50 text-cyan-300'
                                  : 'bg-cyan-100 text-cyan-700'
                                : isDark
                                  ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }
                            `}
                          >
                            {isPreferred ? 'Preferred' : 'Set as default'}
                          </button>
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {provider.description}
                      </p>
                      {provider.freeTier && (
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {provider.freeTier}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className={`text-xs flex items-center gap-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <Info className="w-3 h-3" />
                Configure API keys in Settings to unlock premium providers
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            placeholder="Search the web..."
            className={`
              w-full pl-10 pr-10 py-2.5 rounded-xl border
              transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/30
              ${
                isDark
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-cyan-500'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-cyan-500'
              }
            `}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 sm:p-1.5 rounded-lg sm:rounded touch-manipulation ${
                isDark ? 'text-gray-500 hover:text-gray-300 active:bg-gray-700' : 'text-gray-400 hover:text-gray-600 active:bg-gray-200'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Time Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className={`
                w-full px-3 py-2 rounded-lg border text-sm appearance-none cursor-pointer
                ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 text-gray-200'
                    : 'bg-white border-gray-200 text-gray-700'
                }
              `}
            >
              {TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Clock
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
                isDark ? 'text-gray-500' : 'text-gray-400'
              }`}
            />
          </div>
        </div>

        {/* Search Button */}
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className={`
            w-full py-2.5 rounded-xl font-medium transition-all
            flex items-center justify-center gap-2
            ${
              loading
                ? 'bg-cyan-600/50 text-white cursor-wait'
                : 'bg-cyan-600 text-white hover:bg-cyan-700 active:scale-[0.98]'
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
              <Globe className="w-4 h-4" />
              Search Web
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
            mb-4 p-4 rounded-xl border
            ${isDark ? 'bg-amber-900/20 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}
          `}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm mb-1">Search Unavailable</p>
                <p className={`text-sm ${isDark ? 'text-amber-300/80' : 'text-amber-600'}`}>{error}</p>

                {/* Suggestions based on error type */}
                <div className={`mt-3 pt-3 border-t ${isDark ? 'border-amber-500/20' : 'border-amber-200'}`}>
                  <p className={`text-xs font-medium mb-2 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                    How to fix:
                  </p>
                  <ul className={`text-xs space-y-1 ${isDark ? 'text-amber-300/70' : 'text-amber-600'}`}>
                    {error.includes('CORS') || error.includes('browser security') ? (
                      <>
                        <li className="flex items-start gap-1.5">
                          <span className="opacity-60">•</span>
                          <span>Configure a Brave or Serper API key in Settings for reliable search</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="opacity-60">•</span>
                          <span>Free public search instances are blocked by browser security on static sites</span>
                        </li>
                      </>
                    ) : error.includes('rate') || error.includes('Rate') ? (
                      <>
                        <li className="flex items-start gap-1.5">
                          <span className="opacity-60">•</span>
                          <span>Wait 30-60 seconds before searching again</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="opacity-60">•</span>
                          <span>Use your own API key for unlimited searches</span>
                        </li>
                      </>
                    ) : (
                      <li className="flex items-start gap-1.5">
                        <span className="opacity-60">•</span>
                        <span>Try again in a moment, or configure an API key for reliable access</span>
                      </li>
                    )}
                  </ul>

                  <button
                    onClick={() => {
                      // Navigate to settings - research tab
                      window.location.href = '/quarry?settings=true&tab=research'
                    }}
                    className={`
                      mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                      transition-colors
                      ${isDark
                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400'
                        : 'bg-amber-100 hover:bg-amber-200 text-amber-700'}
                    `}
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    Configure API Keys
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Knowledge Panel */}
        {response?.knowledgePanel && (
          <div
            className={`
            mb-4 p-4 rounded-xl border
            ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-100'}
          `}
          >
            <div className="flex gap-3">
              {response.knowledgePanel.image && (
                <img
                  src={response.knowledgePanel.image}
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {response.knowledgePanel.title}
                </h3>
                <p className={`text-sm mt-1 line-clamp-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {response.knowledgePanel.description}
                </p>
                {response.knowledgePanel.facts && response.knowledgePanel.facts.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    {response.knowledgePanel.facts.slice(0, 4).map((fact, i) => (
                      <div key={i} className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <span className="font-medium">{fact.label}:</span> {fact.value}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        {response && response.results.length > 0 && (
          <div
            className={`mb-3 flex items-center justify-between text-xs ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {response.results.length} results in {response.latency}ms
              {response.fromCache && ' (cached)'}
            </span>
            <button
              onClick={handleSearch}
              className="flex items-center gap-1 hover:text-cyan-500 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
        )}

        {/* Results List */}
        <div className="space-y-3">
          {response?.results.map((result) => (
            <SearchResultCard
              key={result.id}
              result={result}
              isDark={isDark}
              isSaved={savedResults.has(result.id)}
              isCopied={copiedId === result.id}
              isAcademic={isAcademicResult(result)}
              onCopy={() => handleCopy(result)}
              onSave={() => handleToggleSave(result)}
              onCite={() => handleCiteResult(result)}
              onInsert={onInsertResult ? (format) => onInsertResult(result, format) : undefined}
            />
          ))}
        </div>

        {/* Related Searches - Collapsible */}
        {response?.relatedSearches && response.relatedSearches.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setRelatedSearchesExpanded(!relatedSearchesExpanded)}
              className={`
                w-full flex items-center justify-between py-2 px-3 rounded-lg transition-colors
                ${isDark
                  ? 'hover:bg-gray-800/50 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-500'
                }
              `}
            >
              <span className="text-xs font-medium flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Related searches ({response.relatedSearches.length})
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${relatedSearchesExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            <AnimatePresence>
              {relatedSearchesExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2 pt-2 px-1">
                    {response.relatedSearches.map((related, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setQuery(related.query)
                          handleSearch()
                        }}
                        className={`
                          px-3 py-1.5 rounded-full text-xs transition-colors
                          ${isDark
                            ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }
                        `}
                      >
                        {related.query}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Semantic Scholar Recommendations */}
        {(response?.results.some(r => isAcademicResult(r)) || activeSession?.savedResults.some(r => isAcademicResult(r))) && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className={`text-xs font-medium flex items-center gap-1.5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                <GraduationCap className="w-3.5 h-3.5" />
                Paper Recommendations
              </h4>
              <button
                onClick={fetchRecommendations}
                disabled={recommendationsLoading}
                className={`
                  text-xs px-2 py-1 rounded-lg flex items-center gap-1 transition-colors
                  ${recommendationsLoading
                    ? isDark
                      ? 'bg-gray-700 text-gray-500'
                      : 'bg-gray-100 text-gray-400'
                    : isDark
                      ? 'bg-violet-900/30 text-violet-400 hover:bg-violet-900/50'
                      : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                  }
                `}
              >
                {recommendationsLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    Find Similar Papers
                  </>
                )}
              </button>
            </div>

            {/* Recommendations hint */}
            {!showRecommendations && !recommendationsLoading && (
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Save academic papers above to get personalized recommendations from Semantic Scholar
              </p>
            )}

            {/* Recommendations list */}
            <AnimatePresence>
              {showRecommendations && recommendations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 mt-2"
                >
                  {recommendations.map((result) => (
                    <div
                      key={result.id}
                      className={`
                        p-2.5 rounded-lg border transition-colors
                        ${isDark
                          ? 'bg-violet-900/10 border-violet-800/50 hover:border-violet-700'
                          : 'bg-violet-50/50 border-violet-200 hover:border-violet-300'
                        }
                      `}
                    >
                      <div className="flex items-start gap-2">
                        <GraduationCap className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
                        <div className="flex-1 min-w-0">
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`
                              text-xs font-medium line-clamp-2 hover:underline
                              ${isDark ? 'text-violet-300' : 'text-violet-700'}
                            `}
                          >
                            {result.title}
                          </a>
                          <p className={`text-[11px] mt-0.5 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {result.snippet}
                          </p>
                          <div className="flex items-center gap-1 sm:gap-2 mt-1.5">
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`
                                p-2 sm:p-1 rounded-lg sm:rounded transition-colors touch-manipulation
                                ${isDark ? 'hover:bg-violet-900/50 active:bg-violet-800/50 text-gray-400' : 'hover:bg-violet-100 active:bg-violet-200 text-gray-500'}
                              `}
                              title="Open in Semantic Scholar"
                            >
                              <ExternalLink className="w-4 h-4 sm:w-3 sm:h-3" />
                            </a>
                            <button
                              onClick={() => handleCiteResult(result)}
                              className={`
                                p-2 sm:p-1 rounded-lg sm:rounded transition-colors touch-manipulation
                                ${isDark ? 'hover:bg-violet-900/50 active:bg-violet-800/50 text-violet-400' : 'hover:bg-violet-100 active:bg-violet-200 text-violet-600'}
                              `}
                              title="Add as citation"
                            >
                              <BookOpen className="w-4 h-4 sm:w-3 sm:h-3" />
                            </button>
                            <button
                              onClick={() => handleToggleSave(result)}
                              className={`
                                p-2 sm:p-1 rounded-lg sm:rounded transition-colors touch-manipulation
                                ${savedResults.has(result.id)
                                  ? isDark
                                    ? 'bg-amber-900/30 text-amber-400'
                                    : 'bg-amber-50 text-amber-600'
                                  : isDark
                                    ? 'hover:bg-violet-900/50 active:bg-violet-800/50 text-gray-400'
                                    : 'hover:bg-violet-100 active:bg-violet-200 text-gray-500'
                                }
                              `}
                              title={savedResults.has(result.id) ? 'Saved' : 'Save'}
                            >
                              {savedResults.has(result.id) ? (
                                <BookmarkCheck className="w-4 h-4 sm:w-3 sm:h-3" />
                              ) : (
                                <Bookmark className="w-4 h-4 sm:w-3 sm:h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* No recommendations */}
            {showRecommendations && !recommendationsLoading && recommendations.length === 0 && (
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                No recommendations found. Try saving more academic papers.
              </p>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && (!response || response.results.length === 0) && query && !error && (
          <div
            className={`
            text-center py-12 px-4
            ${isDark ? 'text-gray-500' : 'text-gray-400'}
          `}
          >
            <div className={`
              inline-flex p-4 rounded-xl mb-4
              ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100/50'}
            `}>
              <Search className="w-8 h-8 opacity-50" />
            </div>
            <p className={`font-medium mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>No results found</p>
            <p className="text-sm mb-3">Try different keywords or broader terms</p>
            <div className={`text-xs ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
              💡 Tip: Use quotation marks for exact phrases
            </div>
          </div>
        )}

        {/* Initial State */}
        {!loading && !response && !query && !error && (
          <div
            className={`
            text-center py-12
            ${isDark ? 'text-gray-500' : 'text-gray-400'}
          `}
          >
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Search the web</p>
            <p className="text-sm mt-1">
              Find information, articles, and resources
            </p>
          </div>
        )}
      </div>

      {/* Citation Input Modal */}
      <CitationInput
        isOpen={showCitationModal}
        onClose={() => {
          setShowCitationModal(false)
          setCitationInput('')
        }}
        onInsert={handleCitationInsert}
        theme={theme}
        initialValue={citationInput}
      />
    </motion.div>
  )
}

// ============================================================================
// SEARCH RESULT CARD
// ============================================================================

interface SearchResultCardProps {
  result: WebSearchResult
  isDark: boolean
  isSaved: boolean
  isCopied: boolean
  isAcademic: boolean
  onCopy: () => void
  onSave: () => void
  onCite?: () => void
  onInsert?: (format: 'link' | 'citation' | 'markdown') => void
}

function SearchResultCard({
  result,
  isDark,
  isSaved,
  isCopied,
  isAcademic,
  onCopy,
  onSave,
  onCite,
  onInsert,
}: SearchResultCardProps) {
  return (
    <div
      className={`
        p-3 rounded-xl border transition-colors
        ${isAcademic
          ? isDark
            ? 'bg-violet-900/20 border-violet-700 hover:border-violet-600'
            : 'bg-violet-50 border-violet-200 hover:border-violet-300'
          : isDark
            ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
            : 'bg-white border-gray-200 hover:border-gray-300'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        {isAcademic ? (
          <GraduationCap className={`w-4 h-4 mt-0.5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
        ) : result.favicon ? (
          <img src={result.favicon} alt="" className="w-4 h-4 mt-0.5 rounded" />
        ) : (
          <Globe className={`w-4 h-4 mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`
                text-sm font-medium line-clamp-1 hover:underline
                ${isDark ? 'text-cyan-400' : 'text-cyan-700'}
              `}
            >
              {result.title}
            </a>
            {isAcademic && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                isDark ? 'bg-violet-900/50 text-violet-300' : 'bg-violet-100 text-violet-700'
              }`}>
                Paper
              </span>
            )}
          </div>
          <p className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {result.domain}
            {result.publishedDate && ` • ${result.publishedDate}`}
          </p>
        </div>
      </div>

      {/* Snippet */}
      <p className={`text-sm mt-2 line-clamp-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
        {result.snippet}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-1 mt-2">
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`
            p-1.5 rounded-lg transition-colors
            ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}
          `}
          title="Open in new tab"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={onCopy}
          className={`
            p-1.5 rounded-lg transition-colors
            ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}
          `}
          title="Copy URL"
        >
          {isCopied ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={onSave}
          className={`
            p-1.5 rounded-lg transition-colors
            ${isSaved
              ? isDark
                ? 'bg-amber-900/30 text-amber-400'
                : 'bg-amber-50 text-amber-600'
              : isDark
                ? 'hover:bg-gray-700 text-gray-400'
                : 'hover:bg-gray-100 text-gray-500'
            }
          `}
          title={isSaved ? 'Saved' : 'Save for later'}
        >
          {isSaved ? (
            <BookmarkCheck className="w-3.5 h-3.5" />
          ) : (
            <Bookmark className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Cite button for academic results */}
        {isAcademic && onCite && (
          <button
            onClick={onCite}
            className={`
              p-1.5 rounded-lg transition-colors
              ${isDark
                ? 'bg-violet-900/30 text-violet-400 hover:bg-violet-900/50'
                : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
              }
            `}
            title="Add as citation"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>
        )}

        {onInsert && (
          <div className="ml-auto flex items-center gap-1">
            {isAcademic && onCite && (
              <button
                onClick={onCite}
                className={`
                  px-2 py-1 rounded text-xs font-medium transition-colors
                  ${isDark
                    ? 'bg-violet-900/30 text-violet-400 hover:bg-violet-900/50'
                    : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                  }
                `}
              >
                Cite
              </button>
            )}
            <button
              onClick={() => onInsert('link')}
              className={`
                px-2 py-1 rounded text-xs font-medium transition-colors
                ${isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              Insert Link
            </button>
            <button
              onClick={() => onInsert('markdown')}
              className={`
                px-2 py-1 rounded text-xs font-medium transition-colors
                ${isDark
                  ? 'bg-cyan-900/30 text-cyan-400 hover:bg-cyan-900/50'
                  : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'
                }
              `}
            >
              + Notes
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
