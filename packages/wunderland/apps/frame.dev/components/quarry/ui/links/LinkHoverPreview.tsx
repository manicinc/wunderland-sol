/**
 * Link Hover Preview Component
 * @module codex/ui/links/LinkHoverPreview
 *
 * Shows a preview popup when hovering over [[...]] wikilinks.
 * Displays target strand content snippet, tags, and metadata.
 */

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Clock,
  Tag,
  ExternalLink,
  Link2,
  Hash,
  Eye,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface StrandPreviewData {
  /** Strand path */
  path: string
  /** Display title */
  title: string
  /** Content snippet (first ~200 chars) */
  snippet: string
  /** Tags */
  tags?: string[]
  /** Last modified date */
  lastModified?: string
  /** Word count */
  wordCount?: number
  /** Whether this strand exists */
  exists: boolean
}

export interface LinkHoverPreviewProps {
  /** Target strand path */
  targetPath: string
  /** Whether preview is visible */
  isVisible: boolean
  /** Position for the preview */
  position: { top: number; left: number }
  /** Fetch strand data function */
  fetchStrandData: (path: string) => Promise<StrandPreviewData | null>
  /** Called when user clicks to navigate */
  onNavigate?: (path: string) => void
  /** Delay before showing (respects settings) */
  delay?: number
  /** Theme */
  theme?: string
  /** Z-index for positioning */
  zIndex?: number
  /** Maximum width */
  maxWidth?: number
  /** Called when mouse enters preview (to keep it open) */
  onMouseEnter?: () => void
  /** Called when mouse leaves preview */
  onMouseLeave?: () => void
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function formatDate(dateString?: string): string {
  if (!dateString) return ''
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

function truncateSnippet(text: string, maxLength = 200): string {
  if (text.length <= maxLength) return text
  const truncated = text.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > maxLength * 0.7 ? truncated.slice(0, lastSpace) : truncated) + '...'
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function LinkHoverPreview({
  targetPath,
  isVisible,
  position,
  fetchStrandData,
  onNavigate,
  delay = 300,
  theme = 'light',
  zIndex = 9998,
  maxWidth = 320,
  onMouseEnter,
  onMouseLeave,
}: LinkHoverPreviewProps) {
  const isDark = theme?.includes('dark')
  const [data, setData] = useState<StrandPreviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [shouldShow, setShouldShow] = useState(false)
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null)
  const fetchedPathRef = useRef<string>('')

  // Handle delay before showing
  useEffect(() => {
    if (isVisible) {
      delayTimerRef.current = setTimeout(() => {
        setShouldShow(true)
      }, delay)
    } else {
      setShouldShow(false)
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current)
        delayTimerRef.current = null
      }
    }

    return () => {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current)
      }
    }
  }, [isVisible, delay])

  // Fetch strand data when showing
  useEffect(() => {
    if (!shouldShow || !targetPath) return
    
    // Don't refetch if same path
    if (fetchedPathRef.current === targetPath && data) return

    let cancelled = false
    setLoading(true)

    fetchStrandData(targetPath)
      .then((result) => {
        if (!cancelled) {
          setData(result)
          fetchedPathRef.current = targetPath
        }
      })
      .catch((error) => {
        console.error('[LinkHoverPreview] Fetch error:', error)
        if (!cancelled) {
          setData(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [shouldShow, targetPath, fetchStrandData, data])

  // Handle navigation click
  const handleNavigate = useCallback(() => {
    if (onNavigate && data?.exists) {
      onNavigate(targetPath)
    }
  }, [onNavigate, targetPath, data?.exists])

  if (!shouldShow) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          zIndex,
          maxWidth,
        }}
        className={cn(
          'rounded-lg border shadow-xl overflow-hidden',
          isDark
            ? 'bg-zinc-900 border-zinc-700'
            : 'bg-white border-zinc-200'
        )}
        role="tooltip"
        aria-label={`Preview of ${targetPath}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Loading state */}
        {loading && (
          <div className="flex items-center gap-2 px-4 py-6">
            <Loader2 className={cn(
              'w-4 h-4 animate-spin',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )} />
            <span className={cn(
              'text-sm',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}>
              Loading preview...
            </span>
          </div>
        )}

        {/* Content */}
        {!loading && data && (
          <>
            {/* Header */}
            <div className={cn(
              'flex items-center gap-2 px-3 py-2 border-b',
              isDark ? 'border-zinc-800 bg-zinc-900/80' : 'border-zinc-100 bg-zinc-50'
            )}>
              <FileText className={cn('w-3.5 h-3.5', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
              <span className={cn(
                'flex-1 text-sm font-medium truncate',
                isDark ? 'text-white' : 'text-zinc-900'
              )}>
                {data.title}
              </span>
              {onNavigate && data.exists && (
                <button
                  onClick={handleNavigate}
                  className={cn(
                    'p-1 rounded transition-colors',
                    isDark
                      ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
                      : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900'
                  )}
                  aria-label={`Open ${data.title}`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Snippet */}
            <div className="px-3 py-3">
              {data.exists ? (
                <p className={cn(
                  'text-xs leading-relaxed',
                  isDark ? 'text-zinc-300' : 'text-zinc-600'
                )}>
                  {truncateSnippet(data.snippet)}
                </p>
              ) : (
                <div className={cn(
                  'flex items-center gap-2 py-2',
                  isDark ? 'text-amber-400' : 'text-amber-600'
                )}>
                  <Link2 className="w-4 h-4" />
                  <span className="text-xs font-medium">
                    Strand not found - will be created when saved
                  </span>
                </div>
              )}
            </div>

            {/* Tags */}
            {data.tags && data.tags.length > 0 && (
              <div className={cn(
                'flex flex-wrap gap-1 px-3 pb-2',
              )}>
                {data.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5',
                      isDark
                        ? 'bg-zinc-800 text-zinc-400'
                        : 'bg-zinc-100 text-zinc-500'
                    )}
                  >
                    <Hash className="w-2.5 h-2.5" />
                    {tag}
                  </span>
                ))}
                {data.tags.length > 5 && (
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}>
                    +{data.tags.length - 5} more
                  </span>
                )}
              </div>
            )}

            {/* Footer metadata */}
            {(data.lastModified || data.wordCount) && (
              <div className={cn(
                'flex items-center gap-3 px-3 py-1.5 border-t text-[10px]',
                isDark
                  ? 'border-zinc-800 bg-zinc-900/80 text-zinc-500'
                  : 'border-zinc-100 bg-zinc-50 text-zinc-400'
              )}>
                {data.lastModified && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(data.lastModified)}
                  </span>
                )}
                {data.wordCount && (
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {data.wordCount.toLocaleString()} words
                  </span>
                )}
              </div>
            )}
          </>
        )}

        {/* Not found state */}
        {!loading && !data && (
          <div className={cn(
            'px-4 py-6 text-center',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            <Link2 className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Unable to load preview</p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export { LinkHoverPreview }

