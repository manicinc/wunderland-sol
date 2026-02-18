/**
 * Block Tags Display Component
 * @module codex/ui/BlockTagsDisplay
 *
 * @description
 * Subtle inline display for block-level tags. Shows very minimal UI by default
 * with detailed information revealed on hover. Designed to be non-intrusive
 * while providing access to full block metadata.
 *
 * @features
 * - Minimal inline tag pills (very subtle)
 * - Hover expansion for full metadata
 * - Accept/reject suggested tags
 * - Worthiness score visualization
 * - Timestamp and source info
 * - Configurable display modes
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tag,
  Tags,
  Check,
  X,
  Clock,
  ExternalLink,
  Sparkles,
  Brain,
  ChevronDown,
  ChevronUp,
  Info,
  Gauge,
  TrendingUp,
  Layers,
  Zap,
} from 'lucide-react'
import type { StrandBlock, SuggestedTag } from '@/lib/blockDatabase'
import type { WorthinessSignals } from '@/components/quarry/types'
import { cn } from '@/lib/utils'
import { TagBadge } from '../tags/TagBadge'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface BlockTagsDisplayProps {
  /** Block data with tags and metadata */
  block: StrandBlock
  /** Display mode: 'inline' for document view, 'compact' for minimal, 'expanded' for full */
  mode?: 'inline' | 'compact' | 'expanded'
  /** Theme for styling */
  theme?: 'light' | 'dark'
  /** Callback when a tag is clicked (for filtering) */
  onTagClick?: (tag: string) => void
  /** Callback to accept a suggested tag */
  onAcceptTag?: (blockId: string, tag: string) => void
  /** Callback to reject a suggested tag */
  onRejectTag?: (blockId: string, tag: string) => void
  /** Show worthiness score indicator */
  showWorthiness?: boolean
  /** Show timestamps */
  showTimestamps?: boolean
  /** Show source info */
  showSource?: boolean
  /** Maximum number of tags to show before collapsing */
  maxVisibleTags?: number
  /** Custom class name */
  className?: string
  /** Disable hover expansion (for touch devices) */
  disableHover?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Format timestamp for display
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'today'
  } else if (diffDays === 1) {
    return 'yesterday'
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)}w ago`
  } else {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
}

/**
 * Get color class for confidence level
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-emerald-500'
  if (confidence >= 0.6) return 'text-amber-500'
  return 'text-zinc-400'
}

/**
 * Get background color for tag source
 */
function getSourceBadgeClasses(source: SuggestedTag['source']): string {
  switch (source) {
    case 'inline':
      return 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
    case 'llm':
      return 'bg-violet-500/20 text-violet-600 dark:text-violet-400'
    case 'nlp':
      return 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
    case 'existing':
      return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
    default:
      return 'bg-zinc-500/20 text-zinc-600 dark:text-zinc-400'
  }
}

/**
 * Get worthiness level description
 */
function getWorthinessLevel(score: number): { label: string; color: string } {
  if (score >= 0.8) return { label: 'Very Worthy', color: 'text-emerald-500' }
  if (score >= 0.6) return { label: 'Worthy', color: 'text-cyan-500' }
  if (score >= 0.4) return { label: 'Moderate', color: 'text-amber-500' }
  return { label: 'Low', color: 'text-zinc-400' }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Single tag pill - very subtle styling
 */
function TagPill({
  tag,
  onClick,
  variant = 'accepted',
  className,
}: {
  tag: string
  onClick?: () => void
  variant?: 'accepted' | 'suggested' | 'pending'
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-all',
        variant === 'accepted' && 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20',
        variant === 'suggested' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-dashed border-amber-400/40 hover:border-amber-400/60',
        variant === 'pending' && 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 animate-pulse',
        className
      )}
    >
      <Tag className="w-2.5 h-2.5 opacity-60" />
      <span>{tag}</span>
    </button>
  )
}

/**
 * Suggested tag with accept/reject actions
 * Uses two-step confirmation for reject (to prevent accidental deletions)
 */
function SuggestedTagItem({
  tag,
  onAccept,
  onReject,
  showDetails,
}: {
  tag: SuggestedTag
  onAccept: () => void
  onReject: () => void
  showDetails?: boolean
}) {
  const [pendingReject, setPendingReject] = useState(false)

  // Handle two-step reject
  const handleReject = useCallback(() => {
    if (pendingReject) {
      // Second click - execute rejection
      onReject()
      setPendingReject(false)
    } else {
      // First click - show confirmation
      setPendingReject(true)
      // Auto-clear after 3 seconds
      setTimeout(() => setPendingReject(false), 3000)
    }
  }, [pendingReject, onReject])

  return (
    <div className={cn(
      'group flex items-start gap-2 p-1.5 rounded-lg transition-colors',
      pendingReject
        ? 'bg-rose-500/10 ring-1 ring-rose-500/30'
        : 'hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50'
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <TagPill tag={tag.tag} variant={pendingReject ? 'pending' : 'suggested'} />
          <span className={cn('text-[9px] font-mono', getConfidenceColor(tag.confidence))}>
            {Math.round(tag.confidence * 100)}%
          </span>
          <span className={cn('text-[8px] px-1 py-0.5 rounded-full', getSourceBadgeClasses(tag.source))}>
            {tag.source}
          </span>
        </div>

        {showDetails && tag.reasoning && (
          <p className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            {tag.reasoning}
          </p>
        )}
      </div>

      {/* Accept/Reject buttons */}
      <div className={cn(
        'flex items-center gap-0.5 transition-opacity',
        pendingReject ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      )}>
        {!pendingReject && (
          <button
            onClick={onAccept}
            className="p-1 rounded-full text-emerald-500 hover:bg-emerald-500/20 transition-colors"
            title="Accept this tag"
          >
            <Check className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={handleReject}
          className={cn(
            'flex items-center gap-1 p-1 rounded-full transition-colors',
            pendingReject
              ? 'bg-rose-500 text-white px-2'
              : 'text-rose-500 hover:bg-rose-500/20'
          )}
          title={pendingReject ? 'Click again to confirm' : 'Reject this tag'}
        >
          <X className="w-3 h-3" />
          {pendingReject && <span className="text-[9px] font-medium">Confirm?</span>}
        </button>
      </div>
    </div>
  )
}

/**
 * Worthiness signals visualization
 */
function WorthinessIndicator({
  score,
  signals,
  expanded,
}: {
  score: number
  signals?: WorthinessSignals
  expanded?: boolean
}) {
  const { label, color } = getWorthinessLevel(score)

  return (
    <div className="space-y-1">
      {/* Score bar */}
      <div className="flex items-center gap-2">
        <Gauge className={cn('w-3 h-3', color)} />
        <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <motion.div
            className={cn(
              'h-full rounded-full',
              score >= 0.6 ? 'bg-gradient-to-r from-cyan-500 to-emerald-500' : 'bg-zinc-400'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${score * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <span className={cn('text-[9px] font-mono', color)}>
          {Math.round(score * 100)}%
        </span>
      </div>

      {/* Detailed signals */}
      {expanded && signals && (
        <div className="grid grid-cols-3 gap-1 pt-1">
          <div className="flex items-center gap-1 text-[8px] text-zinc-500">
            <TrendingUp className="w-2.5 h-2.5" />
            <span>Topic: {Math.round(signals.topicShift * 100)}%</span>
          </div>
          <div className="flex items-center gap-1 text-[8px] text-zinc-500">
            <Layers className="w-2.5 h-2.5" />
            <span>Entity: {Math.round(signals.entityDensity * 100)}%</span>
          </div>
          <div className="flex items-center gap-1 text-[8px] text-zinc-500">
            <Zap className="w-2.5 h-2.5" />
            <span>Novel: {Math.round(signals.semanticNovelty * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function BlockTagsDisplay({
  block,
  mode = 'inline',
  theme = 'light',
  onTagClick,
  onAcceptTag,
  onRejectTag,
  showWorthiness = false,
  showTimestamps = true,
  showSource = true,
  maxVisibleTags = 3,
  className,
  disableHover = false,
}: BlockTagsDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(mode === 'expanded')
  const [isHovering, setIsHovering] = useState(false)

  const hasTags = (block.tags?.length ?? 0) > 0
  const hasSuggested = (block.suggestedTags?.length ?? 0) > 0
  const hasAnyTags = hasTags || hasSuggested

  // Compute visible tags (collapsed vs expanded)
  const visibleTags = useMemo(() => {
    const tags = block.tags ?? []
    if (isExpanded || mode === 'expanded') {
      return tags
    }
    return tags.slice(0, maxVisibleTags)
  }, [block.tags, isExpanded, mode, maxVisibleTags])

  const remainingCount = (block.tags?.length ?? 0) - visibleTags.length

  // Handle accept/reject
  const handleAccept = useCallback((tag: string) => {
    onAcceptTag?.(block.blockId, tag)
  }, [block.blockId, onAcceptTag])

  const handleReject = useCallback((tag: string) => {
    onRejectTag?.(block.blockId, tag)
  }, [block.blockId, onRejectTag])

  // Don't render if no tags and not showing worthiness
  if (!hasAnyTags && !showWorthiness) {
    return null
  }

  // Compact mode - just a small indicator
  if (mode === 'compact') {
    return (
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'inline-flex items-center gap-1 px-1 py-0.5 rounded text-[9px]',
          'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300',
          'hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-colors',
          className
        )}
        title={`${block.tags?.length ?? 0} tags, ${block.suggestedTags?.length ?? 0} suggestions`}
      >
        <Tags className="w-3 h-3" />
        {hasTags && <span>{block.tags?.length ?? 0}</span>}
        {hasSuggested && (
          <span className="text-amber-500">+{block.suggestedTags?.length ?? 0}</span>
        )}
      </button>
    )
  }

  // Inline mode - subtle pills with hover expansion
  return (
    <div
      className={cn(
        'relative inline-flex items-center gap-1 flex-wrap',
        className
      )}
      onMouseEnter={() => !disableHover && setIsHovering(true)}
      onMouseLeave={() => !disableHover && setIsHovering(false)}
    >
      {/* Accepted tags - unified TagBadge with supertag support */}
      {visibleTags.map((tag) => (
        <TagBadge
          key={tag}
          tag={tag}
          blockId={block.blockId}
          size="sm"
          theme={theme}
          onClick={() => onTagClick?.(tag)}
        />
      ))}

      {/* Remaining count indicator */}
      {remainingCount > 0 && !isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="text-[9px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 px-1"
        >
          +{remainingCount}
        </button>
      )}

      {/* Suggested tags indicator */}
      {hasSuggested && !isExpanded && (
        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[9px] bg-amber-500/10 text-amber-500">
          <Sparkles className="w-2.5 h-2.5" />
          {block.suggestedTags?.length ?? 0}
        </span>
      )}

      {/* Worthiness indicator (subtle) */}
      {showWorthiness && block.worthinessScore >= 0.6 && !isExpanded && (
        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[9px] bg-emerald-500/10 text-emerald-500">
          <Gauge className="w-2.5 h-2.5" />
        </span>
      )}

      {/* Expand/collapse toggle */}
      {(hasAnyTags || showWorthiness) && mode === 'inline' && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setIsExpanded(!isExpanded)
            }
          }}
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse block tags' : 'Expand block tags'}
          className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded"
        >
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      )}

      {/* Hover/expanded popover */}
      <AnimatePresence>
        {(isExpanded || (isHovering && !disableHover)) && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 top-full left-0 mt-1 w-72 p-3 rounded-xl shadow-lg border',
              'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700',
              theme === 'dark' ? 'dark' : ''
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-1.5">
                <Tags className="w-3.5 h-3.5 text-cyan-500" />
                <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-200">
                  Block Tags
                </span>
              </div>
              <span className="text-[9px] text-zinc-400 font-mono">
                L{block.startLine}-{block.endLine}
              </span>
            </div>

            {/* Accepted tags */}
            {hasTags && (
              <div className="mb-3">
                <div className="flex items-center gap-1 mb-1">
                  <Check className="w-2.5 h-2.5 text-emerald-500" />
                  <span className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Accepted ({block.tags?.length ?? 0})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(block.tags ?? []).map((tag) => (
                    <TagBadge
                      key={tag}
                      tag={tag}
                      blockId={block.blockId}
                      size="sm"
                      theme={theme}
                      onClick={() => onTagClick?.(tag)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Suggested tags */}
            {hasSuggested && (
              <div className="mb-3">
                <div className="flex items-center gap-1 mb-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                  <span className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Suggestions ({block.suggestedTags?.length ?? 0})
                  </span>
                </div>
                <div className="space-y-1">
                  {(block.suggestedTags ?? []).map((suggestedTag) => (
                    <SuggestedTagItem
                      key={suggestedTag.tag}
                      tag={suggestedTag}
                      onAccept={() => handleAccept(suggestedTag.tag)}
                      onReject={() => handleReject(suggestedTag.tag)}
                      showDetails={isExpanded}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Worthiness score */}
            {showWorthiness && (
              <div className="mb-3">
                <div className="flex items-center gap-1 mb-1">
                  <Gauge className="w-2.5 h-2.5 text-cyan-500" />
                  <span className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Worthiness
                  </span>
                </div>
                <WorthinessIndicator
                  score={block.worthinessScore}
                  signals={block.worthinessSignals}
                  expanded={isExpanded}
                />
              </div>
            )}

            {/* Metadata footer */}
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 space-y-1">
              {/* Block type */}
              <div className="flex items-center gap-1.5 text-[9px] text-zinc-400">
                <Info className="w-2.5 h-2.5" />
                <span className="capitalize">{block.blockType}</span>
                {block.headingLevel && (
                  <span className="text-zinc-500">H{block.headingLevel}</span>
                )}
              </div>

              {/* Timestamps */}
              {showTimestamps && (
                <div className="flex items-center gap-1.5 text-[9px] text-zinc-400">
                  <Clock className="w-2.5 h-2.5" />
                  <span>Tagged {formatTimestamp(block.updatedAt)}</span>
                </div>
              )}

              {/* Source */}
              {showSource && (block.sourceFile || block.sourceUrl) && (
                <div className="flex items-center gap-1.5 text-[9px] text-zinc-400">
                  <ExternalLink className="w-2.5 h-2.5" />
                  <span className="truncate">
                    {block.sourceFile || block.sourceUrl}
                  </span>
                </div>
              )}

              {/* Extractive summary preview */}
              {block.extractiveSummary && (
                <div className="mt-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50">
                  <p className="text-[9px] text-zinc-500 dark:text-zinc-400 italic line-clamp-2">
                    "{block.extractiveSummary}"
                  </p>
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
   INLINE WRAPPER FOR DOCUMENT INTEGRATION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Wrapper component for rendering block tags inline with document content.
 * Use this in ReaderModePanel or other content views.
 */
export function InlineBlockTags({
  block,
  enabled = true,
  onTagClick,
  onAcceptTag,
  onRejectTag,
}: {
  block: StrandBlock
  enabled?: boolean
  onTagClick?: (tag: string) => void
  onAcceptTag?: (blockId: string, tag: string) => void
  onRejectTag?: (blockId: string, tag: string) => void
}) {
  if (!enabled) return null

  const hasContent = (block.tags?.length ?? 0) > 0 || (block.suggestedTags?.length ?? 0) > 0

  if (!hasContent) return null

  return (
    <div className="inline-block ml-2 align-middle opacity-50 hover:opacity-100 transition-opacity">
      <BlockTagsDisplay
        block={block}
        mode="inline"
        onTagClick={onTagClick}
        onAcceptTag={onAcceptTag}
        onRejectTag={onRejectTag}
        maxVisibleTags={2}
      />
    </div>
  )
}

/**
 * Floating indicator for blocks with tags (minimal mode)
 * Shows in the margin/gutter of the document
 */
export function BlockTagsGutterIndicator({
  block,
  onClick,
}: {
  block: StrandBlock
  onClick?: () => void
}) {
  const tagCount = block.tags?.length ?? 0
  const suggestedCount = block.suggestedTags?.length ?? 0
  const total = tagCount + suggestedCount

  if (total === 0) return null

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-center w-5 h-5 rounded-full',
        'text-[8px] font-medium transition-all',
        suggestedCount > 0
          ? 'bg-amber-500/20 text-amber-600 hover:bg-amber-500/30'
          : 'bg-cyan-500/20 text-cyan-600 hover:bg-cyan-500/30',
        'hover:scale-110'
      )}
      title={`${tagCount} tags, ${suggestedCount} suggestions`}
    >
      {total}
    </button>
  )
}
