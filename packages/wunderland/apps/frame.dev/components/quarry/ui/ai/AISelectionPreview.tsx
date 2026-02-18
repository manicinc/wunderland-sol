/**
 * AI Selection Preview Component
 * @module components/quarry/ui/AISelectionPreview
 *
 * Shows a preview of AI text transformation with accept/reject options.
 * Displays original vs transformed text with diff highlighting.
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  X,
  RotateCcw,
  Copy,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type SelectionAction, SELECTION_ACTIONS } from '@/lib/ai/selectionActions'

// ============================================================================
// TYPES
// ============================================================================

export interface AISelectionPreviewProps {
  /** Original selected text */
  originalText: string
  /** Transformed text from AI */
  transformedText: string
  /** The action that was performed */
  action: SelectionAction
  /** Whether the transformation is still loading */
  isLoading?: boolean
  /** Callback when user accepts the transformation */
  onAccept: (text: string) => void
  /** Callback when user rejects (keeps original) */
  onReject: () => void
  /** Callback to try again with same or different action */
  onRetry?: (action?: SelectionAction) => void
  /** Dark mode */
  isDark: boolean
  /** Position of the preview */
  position?: { top: number; left: number }
  /** Error message if transformation failed */
  error?: string
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AISelectionPreview({
  originalText,
  transformedText,
  action,
  isLoading = false,
  onAccept,
  onReject,
  onRetry,
  isDark,
  position,
  error,
}: AISelectionPreviewProps) {
  const [showOriginal, setShowOriginal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const actionMetadata = SELECTION_ACTIONS[action]

  // Auto-collapse if text is long
  const isLongText = transformedText.length > 300

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(transformedText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [transformedText])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onAccept(transformedText)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onReject()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onAccept, onReject, transformedText])

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'w-96 max-w-[90vw] rounded-xl shadow-2xl border overflow-hidden',
        isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'
      )}
      style={position ? { position: 'fixed', top: position.top, left: position.left, zIndex: 100 } : undefined}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 border-b',
          isDark ? 'border-zinc-700 bg-zinc-800/80' : 'border-zinc-200 bg-zinc-50'
        )}
      >
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
          ) : (
            <Sparkles className={cn('w-4 h-4', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
          )}
          <span className={cn('text-sm font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
            {isLoading ? 'Transforming...' : actionMetadata.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            title={showOriginal ? 'Show transformed' : 'Show original'}
            className={cn(
              'p-2 rounded-md transition-colors touch-manipulation',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
              isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
            )}
          >
            {showOriginal ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className={cn(
              'p-2 rounded-md transition-colors touch-manipulation',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
              isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
            )}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Error state */}
            {error && (
              <div className={cn('px-4 py-3 border-b', isDark ? 'border-zinc-700 bg-red-500/10' : 'border-zinc-200 bg-red-50')}>
                <p className={cn('text-sm', isDark ? 'text-red-400' : 'text-red-600')}>
                  {error}
                </p>
              </div>
            )}

            {/* Text preview */}
            <div className="p-4">
              {showOriginal ? (
                <div className="space-y-2">
                  <div className={cn('text-[10px] uppercase tracking-wide', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                    Original
                  </div>
                  <p
                    className={cn(
                      'text-sm leading-relaxed whitespace-pre-wrap',
                      isDark ? 'text-zinc-400' : 'text-zinc-600',
                      'line-through decoration-zinc-400/50'
                    )}
                  >
                    {originalText}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className={cn('text-[10px] uppercase tracking-wide', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                    {isLoading ? 'Generating...' : 'Transformed'}
                  </div>
                  {isLoading ? (
                    <div className="flex items-center gap-2 py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
                      <span className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                        AI is working on your text...
                      </span>
                    </div>
                  ) : (
                    <p
                      className={cn(
                        'text-sm leading-relaxed whitespace-pre-wrap',
                        isDark ? 'text-zinc-200' : 'text-zinc-800',
                        isLongText && !expanded && 'line-clamp-6'
                      )}
                    >
                      {transformedText}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Diff indicator */}
            {!isLoading && !error && originalText !== transformedText && (
              <div
                className={cn(
                  'px-4 py-2 border-t text-xs',
                  isDark ? 'border-zinc-700 bg-zinc-800/50 text-zinc-500' : 'border-zinc-200 bg-zinc-50 text-zinc-500'
                )}
              >
                <span className="text-green-500">+{transformedText.length - originalText.length > 0 ? transformedText.length - originalText.length : 0}</span>
                {' / '}
                <span className="text-red-500">-{originalText.length - transformedText.length > 0 ? originalText.length - transformedText.length : 0}</span>
                {' characters'}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 border-t',
          isDark ? 'border-zinc-700 bg-zinc-800/80' : 'border-zinc-200 bg-zinc-50'
        )}
      >
        <div className="flex items-center gap-2">
          {onRetry && (
            <button
              onClick={() => onRetry()}
              disabled={isLoading}
              title="Try again"
              className={cn(
                'p-2.5 rounded-lg transition-colors touch-manipulation',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
                isDark
                  ? 'hover:bg-zinc-700 text-zinc-400 disabled:opacity-50'
                  : 'hover:bg-zinc-200 text-zinc-500 disabled:opacity-50'
              )}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleCopy}
            disabled={isLoading}
            title={copied ? 'Copied!' : 'Copy to clipboard'}
            className={cn(
              'p-2.5 rounded-lg transition-colors touch-manipulation',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
              copied
                ? 'bg-green-500/20 text-green-500'
                : isDark
                  ? 'hover:bg-zinc-700 text-zinc-400 disabled:opacity-50'
                  : 'hover:bg-zinc-200 text-zinc-500 disabled:opacity-50'
            )}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onReject}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
              isDark
                ? 'hover:bg-zinc-700 text-zinc-400'
                : 'hover:bg-zinc-200 text-zinc-600'
            )}
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Reject</span>
          </button>
          <button
            onClick={() => onAccept(transformedText)}
            disabled={isLoading || !!error}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50',
              'bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Check className="w-4 h-4" />
            <span className="hidden sm:inline">Accept</span>
          </button>
        </div>
      </div>

      {/* Keyboard hint */}
      <div
        className={cn(
          'px-4 py-1.5 text-center border-t',
          isDark ? 'border-zinc-700 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-100/50'
        )}
      >
        <span className={cn('text-[10px]', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
          <kbd className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-mono">⌘↵</kbd> Accept
          {' · '}
          <kbd className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-mono">Esc</kbd> Reject
        </span>
      </div>
    </motion.div>
  )
}

export default AISelectionPreview
