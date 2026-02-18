/**
 * Link Suggestion Banner Component
 * @module codex/ui/suggestions/LinkSuggestionBanner
 *
 * Shows a non-intrusive banner when potential links are detected in content.
 * Allows users to review and accept/dismiss suggestions inline.
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Link2,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Sparkles,
  ArrowRight,
  Lightbulb,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UnlinkedMention } from '@/lib/linkSuggestion/autoDetector'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface LinkSuggestionBannerProps {
  /** Detected unlinked mentions */
  mentions: UnlinkedMention[]
  /** Called when user accepts a suggestion */
  onAccept: (mention: UnlinkedMention) => void
  /** Called when user dismisses a suggestion */
  onDismiss: (mention: UnlinkedMention) => void
  /** Called when user dismisses all */
  onDismissAll: () => void
  /** Called when user wants to navigate to a strand */
  onNavigate?: (path: string) => void
  /** Theme */
  theme?: string
  /** Whether to show in compact mode */
  compact?: boolean
  /** Maximum suggestions to show in collapsed state */
  collapsedMax?: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

interface SuggestionItemProps {
  mention: UnlinkedMention
  onAccept: () => void
  onDismiss: () => void
  onNavigate?: () => void
  isDark: boolean
  compact?: boolean
}

function SuggestionItem({
  mention,
  onAccept,
  onDismiss,
  onNavigate,
  isDark,
  compact,
}: SuggestionItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'flex items-start gap-2 p-2 rounded-lg transition-colors',
        isDark
          ? 'bg-zinc-800/50 hover:bg-zinc-800'
          : 'bg-white hover:bg-zinc-50',
        compact ? 'py-1.5' : 'py-2'
      )}
    >
      {/* Match indicator */}
      <div className={cn(
        'p-1 rounded flex-shrink-0 mt-0.5',
        mention.isExactMatch
          ? isDark
            ? 'bg-emerald-900/30 text-emerald-400'
            : 'bg-emerald-100 text-emerald-600'
          : isDark
            ? 'bg-amber-900/30 text-amber-400'
            : 'bg-amber-100 text-amber-600'
      )}>
        <Link2 className="w-3 h-3" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn(
            'text-xs font-medium',
            isDark ? 'text-white' : 'text-zinc-900'
          )}>
            &quot;{mention.matchedText}&quot;
          </span>
          <ArrowRight className={cn(
            'w-3 h-3 flex-shrink-0',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )} />
          <span className={cn(
            'text-xs font-medium truncate',
            isDark ? 'text-cyan-400' : 'text-cyan-600'
          )}>
            {mention.targetStrand.title}
          </span>
        </div>
        {!compact && (
          <p className={cn(
            'text-[10px] mt-0.5 line-clamp-1',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            {mention.context}
          </p>
        )}
        {/* Confidence badge */}
        <div className="flex items-center gap-1.5 mt-1">
          <span className={cn(
            'text-[9px] px-1 py-0.5 rounded',
            mention.confidence > 0.9
              ? isDark
                ? 'bg-emerald-900/30 text-emerald-400'
                : 'bg-emerald-100 text-emerald-600'
              : isDark
                ? 'bg-zinc-700 text-zinc-400'
                : 'bg-zinc-100 text-zinc-500'
          )}>
            {Math.round(mention.confidence * 100)}% match
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {onNavigate && (
          <button
            onClick={onNavigate}
            className={cn(
              'p-1.5 rounded transition-colors',
              isDark
                ? 'hover:bg-zinc-700 text-zinc-400 hover:text-white'
                : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900'
            )}
            title="Preview strand"
            aria-label={`Preview ${mention.targetStrand.title}`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onAccept}
          className={cn(
            'p-1.5 rounded transition-colors',
            isDark
              ? 'hover:bg-emerald-900/30 text-emerald-400 hover:text-emerald-300'
              : 'hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700'
          )}
          title="Accept suggestion"
          aria-label={`Link ${mention.matchedText} to ${mention.targetStrand.title}`}
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDismiss}
          className={cn(
            'p-1.5 rounded transition-colors',
            isDark
              ? 'hover:bg-zinc-700 text-zinc-400 hover:text-white'
              : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900'
          )}
          title="Dismiss suggestion"
          aria-label={`Dismiss suggestion for ${mention.matchedText}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function LinkSuggestionBanner({
  mentions,
  onAccept,
  onDismiss,
  onDismissAll,
  onNavigate,
  theme = 'light',
  compact = false,
  collapsedMax = 2,
}: LinkSuggestionBannerProps) {
  const isDark = theme?.includes('dark')
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // Filter out dismissed mentions
  const visibleMentions = useMemo(
    () => mentions.filter(m => !dismissed.has(`${m.startIndex}-${m.endIndex}`)),
    [mentions, dismissed]
  )

  // Determine which mentions to show
  const displayMentions = expanded ? visibleMentions : visibleMentions.slice(0, collapsedMax)
  const hasMore = visibleMentions.length > collapsedMax

  // Handle local dismiss (doesn't trigger parent callback until user explicitly dismisses)
  const handleDismiss = useCallback((mention: UnlinkedMention) => {
    const key = `${mention.startIndex}-${mention.endIndex}`
    setDismissed(prev => new Set([...prev, key]))
    onDismiss(mention)
  }, [onDismiss])

  // Handle dismiss all
  const handleDismissAll = useCallback(() => {
    const allKeys = visibleMentions.map(m => `${m.startIndex}-${m.endIndex}`)
    setDismissed(new Set(allKeys))
    onDismissAll()
  }, [visibleMentions, onDismissAll])

  if (visibleMentions.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        'rounded-lg border overflow-hidden',
        isDark
          ? 'bg-zinc-900/95 border-zinc-700'
          : 'bg-zinc-50 border-zinc-200'
      )}
      role="region"
      aria-label="Link suggestions"
    >
      {/* Header */}
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <Sparkles className={cn('w-4 h-4', isDark ? 'text-amber-400' : 'text-amber-500')} />
        <span className={cn(
          'text-xs font-medium flex-1',
          isDark ? 'text-white' : 'text-zinc-900'
        )}>
          {visibleMentions.length} potential link{visibleMentions.length !== 1 ? 's' : ''} found
        </span>
        <div className="flex items-center gap-1">
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors',
                isDark
                  ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
                  : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900'
              )}
              aria-expanded={expanded}
              aria-label={expanded ? 'Show less' : 'Show all'}
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  +{visibleMentions.length - collapsedMax} more
                </>
              )}
            </button>
          )}
          <button
            onClick={handleDismissAll}
            className={cn(
              'px-2 py-1 rounded text-[10px] font-medium transition-colors',
              isDark
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
                : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900'
            )}
            aria-label="Dismiss all suggestions"
          >
            Dismiss all
          </button>
        </div>
      </div>

      {/* Suggestions list */}
      <div className="px-2 py-2 space-y-1 max-h-64 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {displayMentions.map((mention) => (
            <SuggestionItem
              key={`${mention.startIndex}-${mention.endIndex}`}
              mention={mention}
              onAccept={() => onAccept(mention)}
              onDismiss={() => handleDismiss(mention)}
              onNavigate={onNavigate ? () => onNavigate(mention.targetStrand.path) : undefined}
              isDark={isDark}
              compact={compact}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Help text */}
      <div className={cn(
        'flex items-center gap-2 px-3 py-1.5 border-t text-[10px]',
        isDark
          ? 'border-zinc-800 text-zinc-500'
          : 'border-zinc-200 text-zinc-400'
      )}>
        <Lightbulb className="w-3 h-3" />
        <span>Click ✓ to add [[link]] to your content</span>
      </div>
    </motion.div>
  )
}

export { LinkSuggestionBanner }

