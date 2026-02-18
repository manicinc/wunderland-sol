'use client'

/**
 * LinkPreviewPanel Component
 *
 * Sidebar panel for previewing external links in reader-friendly format.
 * Uses the /api/scrape endpoint to fetch and convert web content to markdown.
 *
 * Features:
 * - Reader-mode styled content display
 * - Loading skeleton while fetching
 * - Metadata header (title, author, site, favicon)
 * - Scrollable markdown content
 * - Open in new tab button
 * - Error state with retry option
 *
 * @module components/quarry/ui/LinkPreviewPanel
 */

import React, { useState, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ExternalLink,
  X,
  RefreshCw,
  AlertCircle,
  Globe,
  User,
  Loader2,
  FileText,
  Clock,
  Copy,
  Check,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface LinkPreviewPanelProps {
  /** URL to preview */
  previewUrl: string | null
  /** Callback to clear the preview */
  onClearPreview: () => void
  /** Theme for styling */
  theme?: string
  /** Additional CSS classes */
  className?: string
}

interface PreviewContent {
  content: string
  title: string
  metadata?: {
    author?: string
    siteName?: string
    pageCount?: number
    favicon?: string
    description?: string
    publishedDate?: string
  }
}

interface PreviewState {
  loading: boolean
  error: string | null
  data: PreviewContent | null
}

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace('www.', '')
  } catch {
    return url
  }
}

function getFaviconUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`
  } catch {
    return ''
  }
}

/**
 * Calculate reading time based on word count
 * Average reading speed: ~200-250 words per minute
 */
function calculateReadingTime(content: string): { minutes: number; words: number } {
  if (!content) return { minutes: 0, words: 0 }
  const words = content.trim().split(/\s+/).filter(w => w.length > 0).length
  const minutes = Math.max(1, Math.round(words / 220))
  return { minutes, words }
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function LinkPreviewPanel({
  previewUrl,
  onClearPreview,
  theme = 'light',
  className = '',
}: LinkPreviewPanelProps) {
  const isDark = theme.includes('dark')
  const [state, setState] = useState<PreviewState>({
    loading: false,
    error: null,
    data: null,
  })
  const [copied, setCopied] = useState(false)

  // Calculate reading time from content
  const readingTime = state.data?.content
    ? calculateReadingTime(state.data.content)
    : null

  // Copy content to clipboard
  const handleCopy = useCallback(async () => {
    if (!state.data?.content) return

    try {
      await navigator.clipboard.writeText(state.data.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [state.data?.content])

  // Fetch content when URL changes
  const fetchContent = useCallback(async (url: string) => {
    setState({ loading: true, error: null, data: null })

    try {
      const response = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch content')
      }

      setState({
        loading: false,
        error: null,
        data: {
          content: data.content,
          title: data.title,
          metadata: data.metadata,
        },
      })
    } catch (err) {
      setState({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load content',
        data: null,
      })
    }
  }, [])

  useEffect(() => {
    if (previewUrl) {
      fetchContent(previewUrl)
    } else {
      setState({ loading: false, error: null, data: null })
    }
  }, [previewUrl, fetchContent])

  // No URL provided
  if (!previewUrl) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full p-6 text-center', className)}>
        <Globe className={cn('w-12 h-12 mb-4', isDark ? 'text-zinc-600' : 'text-zinc-300')} />
        <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
          Click the preview icon on a search result to view it here
        </p>
      </div>
    )
  }

  const domain = extractDomain(previewUrl)
  const faviconUrl = state.data?.metadata?.favicon || getFaviconUrl(previewUrl)

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className={cn(
        'flex-shrink-0 px-3 py-2 border-b',
        isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'
      )}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {faviconUrl && (
              <img
                src={faviconUrl}
                alt=""
                className="w-4 h-4 flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
            <div className="min-w-0">
              <p className={cn(
                'text-xs font-medium truncate',
                isDark ? 'text-zinc-300' : 'text-zinc-600'
              )}>
                {state.data?.title || domain}
              </p>
              <p className={cn(
                'text-xs truncate',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}>
                {domain}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {state.data && (
              <button
                onClick={handleCopy}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  copied
                    ? isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                    : isDark
                      ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                      : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
                )}
                title={copied ? 'Copied!' : 'Copy content'}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'p-1.5 rounded-md transition-colors',
                isDark
                  ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                  : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
              )}
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClearPreview}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                isDark
                  ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                  : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
              )}
              title="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metadata */}
        {(state.data?.metadata || readingTime) && (
          <div className={cn(
            'flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            {readingTime && (
              <span className={cn(
                'flex items-center gap-1',
                isDark ? 'text-cyan-400' : 'text-cyan-600'
              )}>
                <BookOpen className="w-3 h-3" />
                {readingTime.minutes} min read
              </span>
            )}
            {state.data?.metadata?.author && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {state.data.metadata.author}
              </span>
            )}
            {state.data?.metadata?.siteName && (
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {state.data.metadata.siteName}
              </span>
            )}
            {state.data?.metadata?.pageCount && (
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {state.data.metadata.pageCount} pages
              </span>
            )}
            {state.data?.metadata?.publishedDate && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {state.data.metadata.publishedDate}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* Loading State */}
        {state.loading && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-center py-8">
              <Loader2 className={cn('w-6 h-6 animate-spin', isDark ? 'text-emerald-400' : 'text-emerald-600')} />
            </div>
            {/* Skeleton */}
            <div className="space-y-3">
              <div className={cn('h-6 rounded', isDark ? 'bg-zinc-700' : 'bg-zinc-200')} style={{ width: '70%' }} />
              <div className={cn('h-4 rounded', isDark ? 'bg-zinc-700' : 'bg-zinc-200')} />
              <div className={cn('h-4 rounded', isDark ? 'bg-zinc-700' : 'bg-zinc-200')} />
              <div className={cn('h-4 rounded', isDark ? 'bg-zinc-700' : 'bg-zinc-200')} style={{ width: '85%' }} />
            </div>
          </div>
        )}

        {/* Error State */}
        {state.error && (
          <div className="p-4">
            <div className={cn(
              'flex flex-col items-center justify-center py-8 px-4 rounded-lg',
              isDark ? 'bg-red-900/20' : 'bg-red-50'
            )}>
              <AlertCircle className={cn('w-8 h-8 mb-3', isDark ? 'text-red-400' : 'text-red-500')} />
              <p className={cn('text-sm text-center mb-4', isDark ? 'text-red-300' : 'text-red-600')}>
                {state.error}
              </p>
              <button
                onClick={() => fetchContent(previewUrl)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  isDark
                    ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                    : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
                )}
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {state.data && (
          <div className={cn(
            'p-4 prose prose-sm max-w-none',
            isDark
              ? 'prose-invert prose-headings:text-zinc-200 prose-p:text-zinc-300 prose-a:text-emerald-400'
              : 'prose-headings:text-zinc-800 prose-p:text-zinc-600 prose-a:text-emerald-600'
          )}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {state.data.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
