/**
 * Citation Display Component
 * Shows the source text that a flashcard/quiz question was generated from
 * with expandable details and jump-to-source functionality
 *
 * @module codex/ui/CitationDisplay
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  ChevronDown,
  ExternalLink,
  Sparkles,
  Target,
  Quote
} from 'lucide-react'

interface CitationDisplayProps {
  /** The original source text */
  sourceText?: string
  /** Generation method (keyword-extraction, definition-extraction, etc.) */
  method?: string
  /** Confidence score 0-1 */
  confidence?: number
  /** Theme */
  isDark?: boolean
  /** Callback to scroll to source in content */
  onJumpToSource?: (text: string) => void
  /** Compact mode for smaller spaces */
  compact?: boolean
}

/**
 * Format confidence as percentage with color
 */
function getConfidenceInfo(confidence: number): { label: string; color: string } {
  if (confidence >= 0.8) {
    return { label: 'High confidence', color: 'text-emerald-500' }
  } else if (confidence >= 0.6) {
    return { label: 'Medium confidence', color: 'text-amber-500' }
  } else {
    return { label: 'Low confidence', color: 'text-red-400' }
  }
}

/**
 * Format generation method for display
 */
function formatMethod(method: string): string {
  const methodLabels: Record<string, string> = {
    'keyword-extraction': 'Keyword extraction',
    'definition-extraction': 'Definition pattern',
    'cloze-deletion': 'Cloze deletion',
    'multiple_choice': 'Multiple choice',
    'true_false': 'True/False',
    'fill_blank': 'Fill in blank',
  }
  return methodLabels[method] || method.replace(/-/g, ' ').replace(/_/g, ' ')
}

/**
 * Truncate text with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

export default function CitationDisplay({
  sourceText,
  method,
  confidence,
  isDark = false,
  onJumpToSource,
  compact = false,
}: CitationDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleJumpToSource = useCallback(() => {
    if (sourceText && onJumpToSource) {
      onJumpToSource(sourceText)
    }
  }, [sourceText, onJumpToSource])

  if (!sourceText) return null

  const confidenceInfo = confidence !== undefined ? getConfidenceInfo(confidence) : null
  const displayText = isExpanded ? sourceText : truncate(sourceText, compact ? 60 : 100)
  const canExpand = sourceText.length > (compact ? 60 : 100)

  return (
    <div className={`
      rounded-xl border overflow-hidden
      ${isDark
        ? 'bg-zinc-800/50 border-zinc-700/50'
        : 'bg-zinc-50 border-zinc-200'
      }
      ${compact ? 'text-xs' : 'text-sm'}
    `}>
      {/* Header */}
      <button
        onClick={() => canExpand && setIsExpanded(!isExpanded)}
        className={`
          w-full flex items-center gap-2 px-3 py-2
          ${canExpand ? 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700/50' : 'cursor-default'}
          transition-colors
        `}
      >
        <Quote className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'} flex-shrink-0`} />
        <span className={`font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
          Source
        </span>

        {/* Method badge */}
        {method && (
          <span className={`
            px-1.5 py-0.5 rounded text-[10px] font-medium
            ${isDark ? 'bg-violet-900/50 text-violet-400' : 'bg-violet-100 text-violet-600'}
          `}>
            {formatMethod(method)}
          </span>
        )}

        {/* Confidence indicator */}
        {confidenceInfo && (
          <span className={`text-[10px] ${confidenceInfo.color} flex items-center gap-1`}>
            <Sparkles className="w-3 h-3" />
            {Math.round((confidence || 0) * 100)}%
          </span>
        )}

        {/* Expand indicator */}
        {canExpand && (
          <ChevronDown
            className={`
              w-4 h-4 ml-auto transition-transform
              ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
              ${isExpanded ? 'rotate-180' : ''}
            `}
          />
        )}
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        <motion.div
          initial={false}
          animate={{ height: 'auto' }}
          className="px-3 pb-3"
        >
          {/* Source text */}
          <div className={`
            relative pl-3 border-l-2
            ${isDark ? 'border-cyan-500/30 text-zinc-400' : 'border-cyan-500/50 text-zinc-600'}
          `}>
            <p className="italic leading-relaxed">
              "{displayText}"
            </p>
          </div>

          {/* Actions */}
          <AnimatePresence>
            {isExpanded && onJumpToSource && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-3 flex items-center gap-2"
              >
                <button
                  onClick={handleJumpToSource}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                    text-xs font-medium transition-all
                    ${isDark
                      ? 'bg-cyan-900/50 text-cyan-400 hover:bg-cyan-900/70'
                      : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
                    }
                  `}
                >
                  <Target className="w-3.5 h-3.5" />
                  Jump to source
                </button>

                {confidenceInfo && (
                  <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {confidenceInfo.label}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/**
 * Inline citation badge - minimal version for tight spaces
 */
export function CitationBadge({
  sourceText,
  confidence,
  isDark = false,
  onClick,
}: {
  sourceText?: string
  confidence?: number
  isDark?: boolean
  onClick?: () => void
}) {
  if (!sourceText) return null

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded-full
        text-[10px] font-medium transition-all
        ${isDark
          ? 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700'
          : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
        }
      `}
      title={`Source: "${truncate(sourceText, 50)}"`}
    >
      <BookOpen className="w-3 h-3" />
      <span>View source</span>
      {confidence !== undefined && (
        <span className={confidence >= 0.7 ? 'text-emerald-500' : 'text-amber-500'}>
          {Math.round(confidence * 100)}%
        </span>
      )}
    </button>
  )
}
