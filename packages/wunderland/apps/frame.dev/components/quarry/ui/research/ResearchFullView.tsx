'use client'

/**
 * ResearchFullView - Full web research interface
 * @module codex/ui/ResearchFullView
 *
 * @description
 * Rendered when QuarryViewer has initialView='research'.
 * Contains web search, academic detection, citations, and sessions.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Globe,
  History,
  Plus,
  Trash2,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Clock,
  Sparkles,
  FolderOpen,
  GraduationCap,
  Loader2,
  AlertCircle,
  Quote,
  Link2,
  Filter,
  Bookmark,
  BookmarkCheck,
  FileText,
  Newspaper,
  Expand,
  Home,
  Check,
  Eye,
  X,
  Copy,
  Lightbulb,
  Activity,
  type LucideIcon,
} from 'lucide-react'
import { ClockSection } from '@/components/quarry/ui/sidebar/sections/ClockSection'
import { AmbienceSection } from '@/components/quarry/ui/sidebar/sections/AmbienceSection'
import { CollapsibleSidebarSection } from '@/components/quarry/ui/sidebar/sections/CollapsibleSidebarSection'
import {
  webSearch,
  useResearchSessions,
  type WebSearchResult,
  type ResearchSession,
  SEARCH_PROVIDERS,
  getConfiguredSearchProviders,
} from '@/lib/research'
import { isAcademicUrl, detectAcademicSource, extractCitationId } from '@/lib/research/academicDetector'
import {
  formatCitation,
  getCitationStyles,
  type CitationStyle,
  type CitationSource,
} from '@/lib/research/citationFormatter'
import {
  getPaperByArXiv,
  getPaperByDOI,
  isS2Available,
  type S2Paper,
} from '@/lib/research/semanticScholar'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ResearchFullViewProps {
  theme?: string
  onOpenPreferences?: () => void
  onNavigateToStrand?: (path: string) => void
  /** Callback to preview a link in the sidebar */
  onPreviewLink?: (url: string) => void
  /** Currently previewed URL (for highlighting active button) */
  previewUrl?: string | null
}

type ResultFilter = 'all' | 'academic' | 'news' | 'saved'

interface EnrichedMetadata {
  authors: string[]
  year: number | null
  citationCount: number
  abstract: string | null
  venue: string | null
  loading: boolean
  error: boolean
}

interface ExpandedContent {
  content: string
  title: string
  metadata?: {
    author?: string
    siteName?: string
    pageCount?: number
  }
  loading: boolean
  error: string | null
}

const DARK_THEMES = ['dark', 'sepia-dark', 'terminal-dark', 'oceanic-dark']

// Research tips for the right sidebar
const RESEARCH_TIPS: { icon: LucideIcon; tip: string }[] = [
  { icon: Quote, tip: 'Use quotes for exact phrase matching: "machine learning"' },
  { icon: GraduationCap, tip: 'Filter by Academic to find scholarly sources' },
  { icon: Bookmark, tip: 'Save results to build your research library' },
  { icon: Copy, tip: 'Click citation button to copy formatted references' },
  { icon: History, tip: 'Your search history is saved across sessions' },
  { icon: FileText, tip: 'Expand results to read full content inline' },
]

export default function ResearchFullView({ theme = 'light', onOpenPreferences, onNavigateToStrand, onPreviewLink, previewUrl }: ResearchFullViewProps) {
  const isDark = DARK_THEMES.includes(theme)
  const searchParams = useSearchParams()

  // Search state
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<WebSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter state
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Citation state
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('apa')
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [citationDropdownId, setCitationDropdownId] = useState<string | null>(null)
  const citationStyles = getCitationStyles()

  // Sessions state
  const [newTopic, setNewTopic] = useState('')
  const [showNewSession, setShowNewSession] = useState(false)

  // Providers
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([])

  // Academic enrichment state
  const [enrichedData, setEnrichedData] = useState<Record<string, EnrichedMetadata>>({})
  const [s2Available, setS2Available] = useState(true)

  // Expanded content state
  const [expandedContent, setExpandedContent] = useState<Record<string, ExpandedContent>>({})

  const {
    sessions,
    activeSession,
    loading: sessionsLoading,
    create: createSession,
    activate: activateSession,
    remove: removeSession,
    saveResult,
    unsaveResult,
  } = useResearchSessions()

  // Load configured providers
  useEffect(() => {
    getConfiguredSearchProviders().then(providers => {
      setConfiguredProviders(providers)
    })
  }, [])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Escape key to close open panels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showNewSession) {
          setShowNewSession(false)
          setNewTopic('')
        } else if (showFilters) {
          setShowFilters(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showFilters, showNewSession])

  // Close citation dropdown when clicking outside
  useEffect(() => {
    const handleClick = () => setCitationDropdownId(null)
    if (citationDropdownId) {
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClick)
      }, 0)
      return () => {
        clearTimeout(timer)
        document.removeEventListener('click', handleClick)
      }
    }
  }, [citationDropdownId])

  // Auto-enrich academic results
  useEffect(() => {
    const enrichAcademicResults = async () => {
      const academicResults = results.filter(r => isAcademicUrl(r.url))

      for (const result of academicResults) {
        if (enrichedData[result.url]) continue

        const citationId = extractCitationId(result.url)
        if (!citationId || (citationId.type !== 'arxiv' && citationId.type !== 'doi')) continue

        setEnrichedData(prev => ({
          ...prev,
          [result.url]: {
            authors: [],
            year: null,
            citationCount: 0,
            abstract: null,
            venue: null,
            loading: true,
            error: false,
          }
        }))

        try {
          let paper: S2Paper | null = null

          if (citationId.type === 'arxiv') {
            paper = await getPaperByArXiv(citationId.id)
          } else if (citationId.type === 'doi') {
            paper = await getPaperByDOI(citationId.id)
          }

          if (paper) {
            setEnrichedData(prev => ({
              ...prev,
              [result.url]: {
                authors: paper!.authors?.map(a => a.name) || [],
                year: paper!.year,
                citationCount: paper!.citationCount || 0,
                abstract: paper!.abstract,
                venue: paper!.venue,
                loading: false,
                error: false,
              }
            }))
          } else {
            // Check if S2 became unavailable (CORS blocked)
            if (!isS2Available()) {
              setS2Available(false)
            }
            setEnrichedData(prev => ({
              ...prev,
              [result.url]: { ...prev[result.url], loading: false, error: true }
            }))
          }
        } catch {
          // Check if S2 became unavailable (CORS blocked)
          if (!isS2Available()) {
            setS2Available(false)
          }
          setEnrichedData(prev => ({
            ...prev,
            [result.url]: { ...prev[result.url], loading: false, error: true }
          }))
        }

        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    if (results.length > 0) {
      enrichAcademicResults()
    }
  }, [results]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = useCallback(async (overrideQuery?: string) => {
    const searchQuery = overrideQuery ?? query
    if (!searchQuery.trim()) return

    setLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const response = await webSearch(searchQuery.trim(), { maxResults: 15 })
      setResults(response.results || [])

      // Show error from response if present (partial failure)
      if (response.error && response.results.length === 0) {
        setError(response.error)
      }

      if (!activeSession && response.results.length > 0) {
        await createSession(`Search: ${searchQuery.trim().slice(0, 40)}`)
      }
    } catch (err) {
      console.error('[ResearchFullView] Search failed:', err)
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [query, activeSession, createSession])

  useEffect(() => {
    const urlQuery = searchParams.get('q')
    if (urlQuery && urlQuery.trim() && !hasSearched) {
      setQuery(urlQuery.trim())
      handleSearch(urlQuery.trim())
    }
  }, [searchParams, hasSearched, handleSearch])

  const searchWithPrefix = useCallback((prefix: string) => {
    const prefixRegex = new RegExp(`${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'gi')
    let newQuery: string

    if (prefixRegex.test(query)) {
      newQuery = query.replace(prefixRegex, '').trim()
    } else {
      newQuery = `${prefix} ${query}`.trim()
    }

    setQuery(newQuery)
    handleSearch(newQuery)
  }, [query, handleSearch])

  const handleCreateSession = useCallback(async () => {
    if (!newTopic.trim()) return
    await createSession(newTopic.trim())
    setNewTopic('')
    setShowNewSession(false)
  }, [newTopic, createSession])

  const isResultSaved = useCallback((url: string) => {
    return activeSession?.savedResults.some(r => r.url === url) ?? false
  }, [activeSession])

  const toggleSaveResult = useCallback(async (result: WebSearchResult) => {
    // Get the session - either existing or create new one
    let session = activeSession
    if (!session) {
      session = await createSession(`Research: ${query.slice(0, 30)}`)
      if (!session) return // Failed to create session
    }

    // Check if saved using the session we have (not stale activeSession)
    const isSaved = session.savedResults.some(r => r.url === result.url)

    if (isSaved) {
      await unsaveResult(result.url, session)
    } else {
      await saveResult(result, session)
    }
  }, [activeSession, saveResult, unsaveResult, createSession, query])

  const handleCopyCitation = useCallback(async (result: WebSearchResult, style: CitationStyle) => {
    const source: CitationSource = {
      title: result.title,
      url: result.url,
      type: isAcademicUrl(result.url) ? 'paper' : 'webpage',
      accessedDate: new Date(),
    }
    const citation = formatCitation(source, style)
    await navigator.clipboard.writeText(citation)
    setCopiedUrl(result.url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }, [])

  const handleExpandContent = useCallback(async (url: string) => {
    if (expandedContent[url]?.content || expandedContent[url]?.loading) return

    setExpandedContent(prev => ({
      ...prev,
      [url]: { content: '', title: '', loading: true, error: null }
    }))

    try {
      const response = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch content')
      }

      setExpandedContent(prev => ({
        ...prev,
        [url]: {
          content: data.content,
          title: data.title,
          metadata: data.metadata,
          loading: false,
          error: null,
        }
      }))
    } catch (err) {
      setExpandedContent(prev => ({
        ...prev,
        [url]: { ...prev[url], loading: false, error: err instanceof Error ? err.message : 'Failed to expand content' }
      }))
    }
  }, [expandedContent])

  const toggleExpanded = useCallback((url: string) => {
    if (expandedContent[url]?.content) {
      setExpandedContent(prev => {
        const { [url]: _, ...rest } = prev
        return rest
      })
    } else {
      handleExpandContent(url)
    }
  }, [expandedContent, handleExpandContent])

  const filteredResults = results.filter(result => {
    switch (resultFilter) {
      case 'academic': return isAcademicUrl(result.url)
      case 'news': return result.url.includes('news') || result.title.toLowerCase().includes('news')
      case 'saved': return isResultSaved(result.url)
      default: return true
    }
  })

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className={`flex-1 flex overflow-hidden ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search Header */}
        <div className={cn(
          'p-4 md:p-6 border-b shrink-0',
          isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'
        )}>
          <div className="max-w-3xl mx-auto">
            {/* Title */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'p-2.5 rounded-xl',
                  isDark ? 'bg-teal-900/50' : 'bg-teal-100'
                )}>
                  <Globe className={cn('w-6 h-6', isDark ? 'text-teal-400' : 'text-teal-600')} />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Web Research</h1>
                  <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                    Search the web, save results, generate citations
                  </p>
                </div>
              </div>
              <Link
                href="/quarry"
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
                )}
                title="Back to Codex"
              >
                <Home className="w-5 h-5" />
              </Link>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for anything... (e.g., machine learning papers, React tutorials)"
                className={cn(
                  'w-full pl-12 pr-32 py-4 text-base rounded-xl border transition-all',
                  isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-teal-600'
                    : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-teal-500',
                  'focus:outline-none focus:ring-2',
                  isDark ? 'focus:ring-teal-600/30' : 'focus:ring-teal-500/30'
                )}
              />
              <Search className={cn(
                'absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )} />

              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  onClick={() => handleSearch()}
                  disabled={!query.trim() || loading}
                  className={cn(
                    'px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2',
                    query.trim() && !loading
                      ? 'bg-teal-500 text-white hover:bg-teal-600'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed'
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    'Search'
                  )}
                </button>
              </div>
            </div>

            {/* Quick Search Buttons */}
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => searchWithPrefix('site:arxiv.org')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors',
                  query.includes('site:arxiv.org')
                    ? isDark ? 'bg-violet-900/50 text-violet-300' : 'bg-violet-100 text-violet-700'
                    : isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                )}
              >
                <GraduationCap className="w-4 h-4" />
                arXiv Papers
              </button>
              <button
                onClick={() => searchWithPrefix('site:github.com')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors',
                  query.includes('site:github.com')
                    ? isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                    : isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                )}
              >
                <FileText className="w-4 h-4" />
                GitHub
              </button>
              <button
                onClick={() => searchWithPrefix('news')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors',
                  query.toLowerCase().startsWith('news ')
                    ? isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700'
                    : isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                )}
              >
                <Newspaper className="w-4 h-4" />
                News
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ml-auto',
                  showFilters
                    ? isDark ? 'bg-teal-900/50 text-teal-400' : 'bg-teal-100 text-teal-600'
                    : isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
                )}
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
            </div>

            {/* Filter Bar */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className={cn(
                    'mt-3 p-3 rounded-lg border flex flex-wrap gap-4',
                    isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
                  )}>
                    <div>
                      <label className={cn('text-xs font-medium mb-1.5 block', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                        Filter Results
                      </label>
                      <div className="flex gap-1">
                        {(['all', 'academic', 'news', 'saved'] as ResultFilter[]).map(filter => (
                          <button
                            key={filter}
                            onClick={() => setResultFilter(filter)}
                            className={cn(
                              'px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors',
                              resultFilter === filter
                                ? 'bg-teal-500 text-white'
                                : isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
                            )}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className={cn('text-xs font-medium mb-1.5 block', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                        Citation Style
                      </label>
                      <select
                        value={citationStyle}
                        onChange={(e) => setCitationStyle(e.target.value as CitationStyle)}
                        className={cn(
                          'px-2.5 py-1 rounded text-xs font-medium',
                          isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
                        )}
                      >
                        {getCitationStyles().map(style => (
                          <option key={style.id} value={style.id}>{style.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={cn('text-xs font-medium mb-1.5 block', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                        Providers
                      </label>
                      <div className="flex items-center gap-2 text-xs">
                        {configuredProviders.map(p => (
                          <span
                            key={p}
                            className={cn(
                              'px-2 py-0.5 rounded-full',
                              isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                            )}
                          >
                            {SEARCH_PROVIDERS[p as keyof typeof SEARCH_PROVIDERS]?.name || p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-3xl mx-auto">
            {error && (
              <div className={cn(
                'p-4 rounded-xl mb-4 flex items-start gap-3',
                isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-700'
              )}>
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Search Issue</p>
                  <p className="text-sm mt-1 opacity-80">{error}</p>
                  <p className="text-xs mt-2 opacity-60">
                    Tip: Add a Brave or Serper API key in Settings for more reliable search results.
                  </p>
                </div>
              </div>
            )}

            {!s2Available && (
              <div className={cn(
                'p-3 rounded-xl mb-4 flex items-start gap-3 text-sm',
                isDark ? 'bg-violet-900/20 border border-violet-800/30 text-violet-300' : 'bg-violet-50 border border-violet-200 text-violet-700'
              )}>
                <GraduationCap className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Academic enrichment unavailable</p>
                  <p className="text-xs mt-1 opacity-80">
                    Citation counts and paper metadata require full app deployment. Download and run locally or deploy to a server for this feature.
                  </p>
                </div>
              </div>
            )}

            {loading && (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className={cn(
                    'p-4 rounded-xl border animate-pulse',
                    isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
                  )}>
                    <div className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded" />
                    <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded mt-2" />
                  </div>
                ))}
              </div>
            )}

            {!loading && !hasSearched && (
              <div className="text-center py-16">
                <div className={cn(
                  'w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center',
                  isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                )}>
                  <Search className={cn('w-10 h-10', isDark ? 'text-zinc-600' : 'text-zinc-400')} />
                </div>
                <h2 className={cn('text-xl font-semibold mb-2', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
                  Start Your Research
                </h2>
                <p className={cn('text-sm max-w-md mx-auto', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                  Search the web for articles, papers, and resources.
                </p>

                <div className={cn(
                  'mt-8 p-4 rounded-xl border text-left max-w-lg mx-auto',
                  isDark ? 'bg-violet-950/20 border-violet-900/30' : 'bg-violet-50 border-violet-200'
                )}>
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-violet-700 dark:text-violet-300">Research Tips</h3>
                      <ul className={cn('mt-2 space-y-1 text-sm', isDark ? 'text-violet-300/80' : 'text-violet-700/80')}>
                        <li>• Use <code className="px-1 py-0.5 rounded bg-violet-200/50 dark:bg-violet-800/50 text-xs">site:arxiv.org</code> for academic papers</li>
                        <li>• Academic sources are auto-detected and highlighted</li>
                        <li>• Click the bookmark icon to save results</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!loading && hasSearched && results.length === 0 && !error && (
              <div className="text-center py-12">
                <FolderOpen className={cn('w-12 h-12 mx-auto mb-3', isDark ? 'text-zinc-600' : 'text-zinc-400')} />
                <p className={cn('text-sm font-medium mb-2', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                  No results found for "{query}"
                </p>
                <p className={cn('text-xs max-w-md mx-auto', isDark ? 'text-zinc-500' : 'text-zinc-500')}>
                  Search uses free providers (SearXNG) by default. For better results, consider adding a Brave or Serper API key in Settings.
                </p>
              </div>
            )}

            {!loading && filteredResults.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                    {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {filteredResults.map((result, index) => {
                  const isAcademic = isAcademicUrl(result.url)
                  const academicSource = isAcademic ? detectAcademicSource(result.url) : null
                  const isSaved = isResultSaved(result.url)
                  const enriched = enrichedData[result.url]
                  const expanded = expandedContent[result.url]

                  return (
                    <motion.div
                      key={result.url}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'p-4 rounded-xl border group transition-all',
                        isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200',
                        isAcademic && (isDark ? 'border-l-2 border-l-violet-500' : 'border-l-2 border-l-violet-400'),
                        isSaved && (isDark ? 'ring-1 ring-teal-600/50' : 'ring-1 ring-teal-500/50')
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn('font-medium hover:underline flex items-center gap-2', isDark ? 'text-zinc-100' : 'text-zinc-900')}
                          >
                            {result.title}
                            <ExternalLink className="w-3.5 h-3.5 opacity-50 shrink-0" />
                          </a>
                          <p className={cn('text-xs mt-1 truncate', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                            {result.url}
                          </p>
                          <p className={cn('text-sm mt-2 line-clamp-2', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                            {result.snippet}
                          </p>

                          <div className="flex items-center flex-wrap gap-2 mt-2">
                            {isAcademic && (
                              <span className={cn(
                                'text-[10px] px-2 py-0.5 rounded-full font-medium',
                                isDark ? 'bg-violet-900/50 text-violet-300' : 'bg-violet-100 text-violet-700'
                              )}>
                                {academicSource || 'Academic'}
                              </span>
                            )}
                            {enriched && !enriched.loading && enriched.citationCount > 0 && (
                              <span className={cn(
                                'text-[10px] px-2 py-0.5 rounded-full font-medium',
                                isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700'
                              )}>
                                {enriched.citationCount.toLocaleString()} citations
                              </span>
                            )}
                            {isSaved && (
                              <span className={cn(
                                'text-[10px] px-2 py-0.5 rounded-full font-medium',
                                isDark ? 'bg-teal-900/50 text-teal-300' : 'bg-teal-100 text-teal-700'
                              )}>
                                Saved
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => toggleSaveResult(result)}
                            className={cn(
                              'p-2 rounded-lg transition-colors',
                              isSaved
                                ? isDark ? 'bg-teal-900/50 text-teal-400' : 'bg-teal-100 text-teal-600'
                                : isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                            )}
                            title={isSaved ? 'Remove from session' : 'Save to session'}
                          >
                            {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                          </button>
                          {/* Citation copy dropdown */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const resultId = result.id || result.url
                                setCitationDropdownId(
                                  citationDropdownId === resultId ? null : resultId
                                )
                              }}
                              className={cn(
                                'p-2 rounded-lg transition-colors flex items-center gap-0.5',
                                copiedUrl === result.url
                                  ? isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                                  : citationDropdownId === (result.id || result.url)
                                    ? isDark ? 'bg-violet-900/50 text-violet-400' : 'bg-violet-100 text-violet-600'
                                    : isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                              )}
                              title="Copy citation"
                            >
                              {copiedUrl === result.url ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  <ChevronDown className="w-3 h-3" />
                                </>
                              )}
                            </button>

                            {/* Dropdown menu */}
                            {citationDropdownId === (result.id || result.url) && (
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
                                {citationStyles.map((style) => (
                                  <button
                                    key={style.id}
                                    onClick={() => {
                                      handleCopyCitation(result, style.id)
                                      setCitationDropdownId(null)
                                    }}
                                    className={cn(
                                      'w-full px-3 py-1.5 text-left text-xs flex items-center justify-between transition-colors',
                                      isDark
                                        ? 'hover:bg-zinc-700 text-zinc-300'
                                        : 'hover:bg-zinc-100 text-zinc-700'
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
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => navigator.clipboard.writeText(result.url)}
                            className={cn('p-2 rounded-lg transition-colors', isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500')}
                            title="Copy URL"
                          >
                            <Link2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleExpanded(result.url)}
                            className={cn(
                              'p-2 rounded-lg transition-colors',
                              expanded?.content
                                ? isDark ? 'bg-cyan-900/50 text-cyan-400' : 'bg-cyan-100 text-cyan-600'
                                : isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                            )}
                            title={expanded?.content ? 'Collapse content' : 'Expand inline'}
                            disabled={expanded?.loading}
                          >
                            {expanded?.loading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : expanded?.content ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <Expand className="w-4 h-4" />
                            )}
                          </button>
                          {onPreviewLink && (
                            <button
                              onClick={() => onPreviewLink(result.url)}
                              className={cn(
                                'p-2 rounded-lg transition-colors',
                                previewUrl === result.url
                                  ? isDark ? 'bg-cyan-900/50 text-cyan-400' : 'bg-cyan-100 text-cyan-600'
                                  : isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                              )}
                              title={previewUrl === result.url ? 'Currently previewing' : 'Preview in sidebar'}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sessions Sidebar */}
      <div className={cn(
        'w-72 border-l shrink-0 flex flex-col',
        isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-zinc-50/50',
        'hidden lg:flex'
      )}>
        <div className={cn('p-4 border-b shrink-0', isDark ? 'border-zinc-800' : 'border-zinc-200')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-zinc-400" />
              <h2 className="font-semibold text-sm">Sessions</h2>
              <span className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                ({sessions.length})
              </span>
            </div>
            <button
              onClick={() => setShowNewSession(true)}
              className={cn('p-1.5 rounded-lg transition-colors', isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500')}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence>
            {showNewSession && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="Topic name..."
                    className={cn(
                      'flex-1 px-3 py-1.5 text-sm rounded-lg border',
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900',
                      'focus:outline-none focus:ring-1 focus:ring-teal-500'
                    )}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
                    autoFocus
                  />
                  <button
                    onClick={handleCreateSession}
                    disabled={!newTopic.trim()}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm',
                      newTopic.trim() ? 'bg-teal-500 text-white hover:bg-teal-600' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed'
                    )}
                  >
                    Add
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {sessionsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className={cn('p-3 rounded-lg animate-pulse', isDark ? 'bg-zinc-800/50' : 'bg-zinc-100')}>
                  <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded" />
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className={cn('w-8 h-8 mx-auto mb-2', isDark ? 'text-zinc-600' : 'text-zinc-400')} />
              <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>No sessions yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => activateSession(session.id)}
                  className={cn(
                    'w-full p-3 rounded-lg text-left transition-all group',
                    activeSession?.id === session.id
                      ? isDark ? 'bg-teal-900/30 border border-teal-700' : 'bg-teal-50 border border-teal-200'
                      : isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cn('text-sm font-medium truncate', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
                        {session.topic}
                      </p>
                      <p className={cn('text-xs mt-1 flex items-center gap-2', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                        <Clock className="w-3 h-3" />
                        {formatDate(session.updatedAt)}
                      </p>
                      <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                        {session.savedResults.length} saved
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeSession(session.id) }}
                      className={cn(
                        'p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                        isDark ? 'hover:bg-red-900/50 text-zinc-500' : 'hover:bg-red-100 text-zinc-400'
                      )}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {activeSession && activeSession.savedResults.length > 0 && (
          <div className={cn('border-t p-3 max-h-64 overflow-y-auto', isDark ? 'border-zinc-800' : 'border-zinc-200')}>
            <h3 className={cn('text-xs font-semibold uppercase tracking-wide mb-2', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              Saved ({activeSession.savedResults.length})
            </h3>
            <div className="space-y-2">
              {activeSession.savedResults.slice(0, 5).map((result, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded text-xs transition-colors group',
                    isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'
                  )}
                >
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'flex-1 truncate',
                      isDark ? 'text-zinc-300' : 'text-zinc-600'
                    )}
                  >
                    {result.title}
                  </a>
                  <button
                    onClick={() => unsaveResult(result.url)}
                    className={cn(
                      'p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                      isDark ? 'hover:bg-zinc-600 text-zinc-400' : 'hover:bg-zinc-300 text-zinc-500'
                    )}
                    title="Remove from saved"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Desktop only */}
      <div className={cn(
        'hidden lg:flex flex-col w-[280px] border-l overflow-y-auto shrink-0',
        isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'
      )}>
        {/* Clock Section */}
        <ClockSection
          theme={theme}
          isDark={isDark}
          defaultExpanded={false}
        />

        {/* Ambience Section */}
        <AmbienceSection
          isDark={isDark}
          defaultExpanded={true}
          compact
        />

        {/* Research Tips */}
        <CollapsibleSidebarSection
          title="Research Tips"
          icon={Lightbulb}
          isDark={isDark}
          defaultExpanded={true}
        >
          <div className="p-3 space-y-2">
            {RESEARCH_TIPS.map((item, idx) => {
              const TipIcon = item.icon
              return (
                <div
                  key={idx}
                  className={cn(
                    'flex items-start gap-2 p-2 rounded-lg text-xs',
                    isDark ? 'bg-zinc-800/50' : 'bg-white'
                  )}
                >
                  <TipIcon className={cn(
                    'w-3.5 h-3.5 mt-0.5 shrink-0',
                    isDark ? 'text-teal-400' : 'text-teal-600'
                  )} />
                  <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
                    {item.tip}
                  </span>
                </div>
              )
            })}
          </div>
        </CollapsibleSidebarSection>

        {/* Session Stats */}
        <CollapsibleSidebarSection
          title="Session"
          icon={Activity}
          isDark={isDark}
          defaultExpanded={true}
        >
          <div className="p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className={cn(
                'p-2 rounded-lg text-center',
                isDark ? 'bg-zinc-800' : 'bg-white'
              )}>
                <div className={cn('text-lg font-bold', isDark ? 'text-teal-400' : 'text-teal-600')}>
                  {results.length}
                </div>
                <div className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                  Results
                </div>
              </div>
              <div className={cn(
                'p-2 rounded-lg text-center',
                isDark ? 'bg-zinc-800' : 'bg-white'
              )}>
                <div className={cn('text-lg font-bold', isDark ? 'text-amber-400' : 'text-amber-600')}>
                  {activeSession?.savedResults.length || 0}
                </div>
                <div className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                  Saved
                </div>
              </div>
              <div className={cn(
                'p-2 rounded-lg text-center',
                isDark ? 'bg-zinc-800' : 'bg-white'
              )}>
                <div className={cn('text-lg font-bold', isDark ? 'text-purple-400' : 'text-purple-600')}>
                  {results.filter(r => isAcademicUrl(r.url)).length}
                </div>
                <div className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                  Academic
                </div>
              </div>
              <div className={cn(
                'p-2 rounded-lg text-center',
                isDark ? 'bg-zinc-800' : 'bg-white'
              )}>
                <div className={cn('text-lg font-bold', isDark ? 'text-blue-400' : 'text-blue-600')}>
                  {sessions.length}
                </div>
                <div className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                  Sessions
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSidebarSection>

        {/* Citation Style */}
        <CollapsibleSidebarSection
          title="Citation Style"
          icon={Quote}
          isDark={isDark}
          defaultExpanded={false}
        >
          <div className="p-3">
            <select
              value={citationStyle}
              onChange={(e) => setCitationStyle(e.target.value as CitationStyle)}
              className={cn(
                'w-full px-3 py-2 rounded-lg text-sm border transition-colors',
                isDark
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                  : 'bg-white border-zinc-300 text-zinc-800'
              )}
            >
              {getCitationStyles().map((style) => (
                <option key={style.id} value={style.id}>
                  {style.label}
                </option>
              ))}
            </select>
            <p className={cn('text-[10px] mt-2', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              Selected style will be used when copying citations
            </p>
          </div>
        </CollapsibleSidebarSection>
      </div>
    </div>
  )
}
