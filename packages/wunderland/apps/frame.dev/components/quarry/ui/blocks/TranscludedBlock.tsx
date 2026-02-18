/**
 * Transcluded Block Component
 * @module codex/ui/TranscludedBlock
 *
 * @description
 * Renders transcluded (embedded) block content with visual distinction,
 * linking back to the source, and optional inline editing.
 *
 * @features
 * - Visual distinction from regular content (subtle border/background)
 * - Hover preview card
 * - Click to navigate to source
 * - Backlink count badge
 * - Loading and error states
 * - Nested transclusion support (with depth limit)
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Link2,
  ExternalLink,
  Copy,
  RefreshCw,
  AlertTriangle,
  Quote,
  FileText,
  Hash,
  ArrowUpRight,
  Eye,
  ChevronRight,
} from 'lucide-react'
import {
  resolveBlockContent,
  getBacklinkStats,
  type ResolvedBlockContent,
  type BacklinkStats,
  type ReferenceType,
} from '@/lib/transclusion'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface TranscludedBlockProps {
  /** Target strand path */
  strandPath: string
  /** Target block ID */
  blockId: string
  /** Reference type (determines styling) */
  referenceType: ReferenceType
  /** Optional display alias */
  alias?: string
  /** Current transclusion depth */
  depth?: number
  /** Maximum allowed depth */
  maxDepth?: number
  /** Theme for styling */
  theme?: 'light' | 'dark'
  /** Callback when clicking to navigate */
  onNavigate?: (strandPath: string, blockId: string) => void
  /** Whether the block is editable */
  editable?: boolean
  /** Callback when content is edited (for mirror type) */
  onEdit?: (content: string) => void
  /** Show backlink count */
  showBacklinks?: boolean
  /** Additional class names */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════════════════ */

const typeStyles: Record<ReferenceType, {
  wrapper: string
  icon: typeof Link2
  label: string
}> = {
  link: {
    wrapper: 'border-l-2 border-blue-400/50 bg-blue-500/5 hover:bg-blue-500/10',
    icon: Link2,
    label: 'Link',
  },
  embed: {
    wrapper: 'border-l-2 border-violet-400/50 bg-violet-500/5 hover:bg-violet-500/10',
    icon: FileText,
    label: 'Embed',
  },
  citation: {
    wrapper: 'border-l-2 border-amber-400/50 bg-amber-500/5 hover:bg-amber-500/10 italic',
    icon: Quote,
    label: 'Citation',
  },
  mirror: {
    wrapper: 'border-l-2 border-emerald-400/50 bg-emerald-500/5 hover:bg-emerald-500/10',
    icon: RefreshCw,
    label: 'Mirror',
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function TranscludedBlock({
  strandPath,
  blockId,
  referenceType,
  alias,
  depth = 0,
  maxDepth = 3,
  theme = 'dark',
  onNavigate,
  editable = false,
  onEdit,
  showBacklinks = true,
  className,
}: TranscludedBlockProps) {
  const [content, setContent] = useState<ResolvedBlockContent | null>(null)
  const [stats, setStats] = useState<BacklinkStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [copied, setCopied] = useState(false)

  const isDark = theme === 'dark'
  const style = typeStyles[referenceType]
  const Icon = style.icon

  // Check for depth limit
  const exceedsDepth = depth >= maxDepth

  // Load content
  useEffect(() => {
    if (exceedsDepth) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const [resolvedContent, backlinkStats] = await Promise.all([
          resolveBlockContent(strandPath, blockId),
          showBacklinks ? getBacklinkStats(blockId) : null,
        ])

        if (cancelled) return

        if (!resolvedContent) {
          setError('Block not found')
        } else {
          setContent(resolvedContent)
          setStats(backlinkStats)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load block')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [strandPath, blockId, showBacklinks, exceedsDepth])

  // Handle navigation
  const handleNavigate = useCallback(() => {
    onNavigate?.(strandPath, blockId)
  }, [onNavigate, strandPath, blockId])

  // Handle copy reference
  const handleCopy = useCallback(async () => {
    const reference = `[[${strandPath}#${blockId}]]`
    try {
      await navigator.clipboard.writeText(reference)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('Failed to copy to clipboard')
    }
  }, [strandPath, blockId])

  // Render loading state
  if (loading) {
    return (
      <div className={cn(
        'rounded-lg p-3 animate-pulse',
        isDark ? 'bg-zinc-800/50' : 'bg-zinc-100/50',
        className
      )}>
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-4 h-4 rounded',
            isDark ? 'bg-zinc-700' : 'bg-zinc-300'
          )} />
          <div className={cn(
            'h-4 rounded flex-1',
            isDark ? 'bg-zinc-700' : 'bg-zinc-300'
          )} />
        </div>
      </div>
    )
  }

  // Render depth exceeded
  if (exceedsDepth) {
    return (
      <div className={cn(
        'rounded-lg p-2 flex items-center gap-2 text-xs',
        isDark ? 'bg-zinc-800/50 text-zinc-500' : 'bg-zinc-100/50 text-zinc-400',
        className
      )}>
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Max transclusion depth reached</span>
        <button
          onClick={handleNavigate}
          className={cn(
            'ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-xs',
            'transition-colors',
            isDark
              ? 'hover:bg-zinc-700 text-blue-400'
              : 'hover:bg-zinc-200 text-blue-600'
          )}
        >
          View source
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
    )
  }

  // Render error state
  if (error || !content) {
    return (
      <div className={cn(
        'rounded-lg p-3 flex items-center gap-2',
        isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600',
        className
      )}>
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="text-sm">{error || 'Block not found'}</span>
        <code className="text-xs opacity-60 ml-auto">
          {strandPath}#{blockId}
        </code>
      </div>
    )
  }

  // Render content based on block type
  const renderContent = () => {
    // Handle alias
    if (alias && referenceType === 'link') {
      return (
        <span className={cn(
          'text-blue-400 hover:text-blue-300 cursor-pointer underline underline-offset-2',
        )}>
          {alias}
        </span>
      )
    }

    // Heading blocks
    if (content.blockType === 'heading' && content.headingLevel) {
      const HeadingTag = `h${content.headingLevel}` as keyof JSX.IntrinsicElements
      const sizes: Record<number, string> = {
        1: 'text-2xl font-bold',
        2: 'text-xl font-semibold',
        3: 'text-lg font-semibold',
        4: 'text-base font-medium',
        5: 'text-sm font-medium',
        6: 'text-xs font-medium',
      }
      return (
        <HeadingTag className={cn(sizes[content.headingLevel] || 'text-base', 'flex items-center gap-2')}>
          <Hash className="w-4 h-4 opacity-40" />
          {content.content}
        </HeadingTag>
      )
    }

    // Code blocks
    if (content.blockType === 'code') {
      return (
        <pre className={cn(
          'text-sm font-mono rounded p-3 overflow-x-auto',
          isDark ? 'bg-zinc-900/50' : 'bg-zinc-100'
        )}>
          <code>{content.content}</code>
        </pre>
      )
    }

    // Default: paragraph
    return (
      <p className="text-sm leading-relaxed">
        {content.summary || content.content}
      </p>
    )
  }

  return (
    <motion.div
      className={cn(
        'group rounded-lg transition-colors relative',
        style.wrapper,
        className
      )}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center gap-2 px-3 pt-2 pb-1',
        'text-xs',
        isDark ? 'text-zinc-500' : 'text-zinc-400'
      )}>
        <Icon className="w-3.5 h-3.5" />
        <span>{style.label}</span>
        <span className="opacity-60">from</span>
        <button
          onClick={handleNavigate}
          className={cn(
            'flex items-center gap-1 hover:underline',
            isDark ? 'text-zinc-400 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-600'
          )}
        >
          <span className="truncate max-w-[200px]">{content.strandTitle}</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>

        {/* Tags */}
        {content.tags.length > 0 && (
          <div className="flex items-center gap-1 ml-auto">
            {content.tags.slice(0, 2).map(tag => (
              <span
                key={tag}
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px]',
                  isDark ? 'bg-zinc-700/50 text-zinc-400' : 'bg-zinc-200 text-zinc-500'
                )}
              >
                {tag}
              </span>
            ))}
            {content.tags.length > 2 && (
              <span className="text-[10px] opacity-60">+{content.tags.length - 2}</span>
            )}
          </div>
        )}

        {/* Backlinks badge */}
        {stats && stats.total > 0 && (
          <div className={cn(
            'flex items-center gap-1 text-[10px]',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            <Link2 className="w-3 h-3" />
            <span>{stats.total}</span>
          </div>
        )}

        {/* Actions (visible on hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className={cn(
              'p-1 rounded hover:bg-white/10',
              copied && 'text-emerald-400'
            )}
            title="Copy reference"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={handleNavigate}
            className="p-1 rounded hover:bg-white/10"
            title="Open source"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={cn(
        'px-3 pb-3',
        isDark ? 'text-zinc-300' : 'text-zinc-700'
      )}>
        {renderContent()}
      </div>

      {/* Preview card (on hover) */}
      <AnimatePresence>
        {showPreview && referenceType === 'link' && content.content && (
          <motion.div
            className={cn(
              'absolute left-full ml-2 top-0 z-50',
              'w-72 rounded-lg shadow-xl border',
              isDark
                ? 'bg-zinc-900 border-zinc-700'
                : 'bg-white border-zinc-200'
            )}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
          >
            <div className={cn(
              'px-3 py-2 border-b',
              isDark ? 'border-zinc-700' : 'border-zinc-200'
            )}>
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-xs font-medium truncate">{content.strandTitle}</span>
              </div>
            </div>
            <div className={cn(
              'p-3 text-sm max-h-40 overflow-y-auto',
              isDark ? 'text-zinc-300' : 'text-zinc-700'
            )}>
              {content.content.slice(0, 300)}
              {content.content.length > 300 && '...'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   INLINE LINK COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export interface InlineBlockLinkProps {
  strandPath: string
  blockId: string
  alias?: string
  onNavigate?: (strandPath: string, blockId: string) => void
  theme?: 'light' | 'dark'
  className?: string
}

/**
 * Inline block link (for link-type references in text)
 */
export function InlineBlockLink({
  strandPath,
  blockId,
  alias,
  onNavigate,
  theme = 'dark',
  className,
}: InlineBlockLinkProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [content, setContent] = useState<ResolvedBlockContent | null>(null)
  const isDark = theme === 'dark'

  // Load content on hover
  useEffect(() => {
    if (!showPreview || content) return

    resolveBlockContent(strandPath, blockId).then(setContent)
  }, [showPreview, strandPath, blockId, content])

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 cursor-pointer relative',
        'text-blue-400 hover:text-blue-300',
        'underline underline-offset-2 decoration-blue-400/50',
        className
      )}
      onClick={() => onNavigate?.(strandPath, blockId)}
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
    >
      {alias || blockId}
      <ChevronRight className="w-3 h-3" />

      {/* Hover preview */}
      <AnimatePresence>
        {showPreview && content && (
          <motion.div
            className={cn(
              'absolute left-0 top-full mt-1 z-50',
              'w-64 rounded-lg shadow-xl border p-3',
              isDark
                ? 'bg-zinc-900 border-zinc-700'
                : 'bg-white border-zinc-200'
            )}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <div className="text-xs text-zinc-500 mb-1">{content.strandTitle}</div>
            <div className={cn(
              'text-sm',
              isDark ? 'text-zinc-300' : 'text-zinc-700'
            )}>
              {content.summary || content.content.slice(0, 150)}
              {content.content.length > 150 && '...'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}

export default TranscludedBlock
