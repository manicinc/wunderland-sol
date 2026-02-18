/**
 * Cache Status Badge Component
 * @module quarry/ui/cache/CacheStatusBadge
 *
 * Visual indicator showing cache state with metadata:
 * - Fresh (green): Loaded from cache, content unchanged
 * - Stale (amber): Cached but may be outdated
 * - Generating (blue): Currently generating
 * - Regenerating (purple): Had cache, regenerating
 * - Empty (gray): No cache exists
 * - Error (red): Cache error
 *
 * Features:
 * - Shows generation date/time
 * - Shows load vs regenerate status
 * - Hover tooltip with full metadata
 * - Click to regenerate option
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Info,
  X,
  Zap,
  History,
  FileText,
  Cloud,
  Cpu,
} from 'lucide-react'
import type {
  CacheMetadata,
  CacheState,
  ContentType,
  GenerationMethod,
} from '@/lib/generation/cacheMetadataService'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface CacheStatusBadgeProps {
  /** Current cache state */
  state: CacheState
  /** Cache metadata (if available) */
  metadata?: CacheMetadata | null
  /** Content type being cached */
  contentType: ContentType
  /** Whether to show compact badge only */
  compact?: boolean
  /** Theme */
  isDark: boolean
  /** Callback to regenerate content */
  onRegenerate?: (options?: { forceRegenerate?: boolean; useLLM?: boolean }) => void
  /** Callback to clear cache */
  onClearCache?: () => void
  /** Whether regeneration is disabled */
  disableRegenerate?: boolean
  /** Custom class name */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   STATE CONFIGURATION
═══════════════════════════════════════════════════════════════════════════ */

interface StateConfig {
  label: string
  description: string
  icon: typeof Database
  bgClass: string
  textClass: string
  borderClass: string
  pulseClass?: string
}

const STATE_CONFIG: Record<CacheState, StateConfig> = {
  fresh: {
    label: 'Cached',
    description: 'Loaded from cache',
    icon: CheckCircle2,
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-300 dark:border-emerald-700',
  },
  stale: {
    label: 'Stale',
    description: 'Cache may be outdated',
    icon: AlertTriangle,
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-300 dark:border-amber-700',
  },
  generating: {
    label: 'Generating',
    description: 'Creating new content',
    icon: Loader2,
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-300 dark:border-blue-700',
    pulseClass: 'animate-pulse',
  },
  regenerating: {
    label: 'Regenerating',
    description: 'Updating cached content',
    icon: RefreshCw,
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    textClass: 'text-purple-700 dark:text-purple-300',
    borderClass: 'border-purple-300 dark:border-purple-700',
    pulseClass: 'animate-pulse',
  },
  empty: {
    label: 'No Cache',
    description: 'Generate to create cache',
    icon: Database,
    bgClass: 'bg-zinc-100 dark:bg-zinc-800',
    textClass: 'text-zinc-600 dark:text-zinc-400',
    borderClass: 'border-zinc-300 dark:border-zinc-600',
  },
  error: {
    label: 'Error',
    description: 'Cache operation failed',
    icon: AlertTriangle,
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-300',
    borderClass: 'border-red-300 dark:border-red-700',
  },
}

const METHOD_ICONS: Record<GenerationMethod, typeof Cloud> = {
  nlp: Cpu,
  llm: Cloud,
  hybrid: Sparkles,
  static: FileText,
  cached: Database,
}

const METHOD_LABELS: Record<GenerationMethod, string> = {
  nlp: 'On-device NLP',
  llm: 'Cloud AI',
  hybrid: 'Hybrid (NLP + AI)',
  static: 'Static Analysis',
  cached: 'From Cache',
}

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  flashcards: 'Flashcards',
  quiz: 'Quiz',
  glossary: 'Glossary',
  mindmap: 'Mindmap',
  teach: 'Teach Mode',
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Unknown'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOOLTIP CONTENT
═══════════════════════════════════════════════════════════════════════════ */

interface TooltipProps {
  metadata: CacheMetadata
  state: CacheState
  contentType: ContentType
  isDark: boolean
  onRegenerate?: (options?: { forceRegenerate?: boolean; useLLM?: boolean }) => void
  onClearCache?: () => void
  onClose: () => void
  disableRegenerate?: boolean
}

function CacheTooltip({
  metadata,
  state,
  contentType,
  isDark,
  onRegenerate,
  onClearCache,
  onClose,
  disableRegenerate,
}: TooltipProps) {
  const MethodIcon = METHOD_ICONS[metadata.generationMethod]
  const isProcessing = state === 'generating' || state === 'regenerating'

  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 5, scale: 0.95 }}
      className={`
        absolute top-full left-0 mt-2 z-50
        w-72 rounded-xl shadow-2xl border p-3
        ${isDark
          ? 'bg-zinc-900 border-zinc-700'
          : 'bg-white border-zinc-200'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className={`text-sm font-semibold ${
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        }`}>
          {CONTENT_TYPE_LABELS[contentType]} Cache
        </h4>
        <button
          onClick={onClose}
          className={`p-1 rounded transition-colors ${
            isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
          }`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Metadata Grid */}
      <div className="space-y-2 text-xs">
        {/* Generation Method */}
        <div className="flex items-center justify-between">
          <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>Method</span>
          <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
            <MethodIcon className="w-3.5 h-3.5" />
            {METHOD_LABELS[metadata.generationMethod]}
          </span>
        </div>

        {/* Generated Date */}
        <div className="flex items-center justify-between">
          <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>Generated</span>
          <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
            <Clock className="w-3.5 h-3.5" />
            {formatRelativeTime(metadata.createdAt)}
          </span>
        </div>

        {/* Last Accessed */}
        <div className="flex items-center justify-between">
          <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>Last Used</span>
          <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>
            {formatRelativeTime(metadata.lastAccessedAt)}
          </span>
        </div>

        {/* Generation Duration */}
        {metadata.generationDurationMs > 0 && (
          <div className="flex items-center justify-between">
            <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>Gen. Time</span>
            <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>
              {formatDuration(metadata.generationDurationMs)}
            </span>
          </div>
        )}

        {/* Source Count */}
        <div className="flex items-center justify-between">
          <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>Sources</span>
          <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>
            {metadata.sourceCount} strand{metadata.sourceCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Item Count */}
        <div className="flex items-center justify-between">
          <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>Items</span>
          <span className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
            {metadata.itemCount}
          </span>
        </div>

        {/* Loaded from Cache indicator */}
        {metadata.loadedFromCache && (
          <div className={`
            flex items-center gap-1.5 px-2 py-1 rounded mt-2
            ${isDark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}
          `}>
            <Database className="w-3.5 h-3.5" />
            <span>Loaded from cache</span>
          </div>
        )}

        {/* Stale warning */}
        {state === 'stale' && (
          <div className={`
            flex items-center gap-1.5 px-2 py-1 rounded mt-2
            ${isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700'}
          `}>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Source content may have changed</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {(onRegenerate || onClearCache) && (
        <div className={`
          flex gap-2 mt-3 pt-3 border-t
          ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
        `}>
          {onRegenerate && (
            <button
              onClick={() => onRegenerate({ forceRegenerate: true })}
              disabled={isProcessing || disableRegenerate}
              className={`
                flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg
                text-xs font-medium transition-colors
                ${isProcessing || disableRegenerate
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
                }
                ${isDark
                  ? 'bg-cyan-900/50 text-cyan-300 hover:bg-cyan-900/70'
                  : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
                }
              `}
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Regenerate
            </button>
          )}

          {onClearCache && (
            <button
              onClick={onClearCache}
              disabled={isProcessing}
              className={`
                flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg
                text-xs font-medium transition-colors
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
                ${isDark
                  ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }
              `}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function CacheStatusBadge({
  state,
  metadata,
  contentType,
  compact = false,
  isDark,
  onRegenerate,
  onClearCache,
  disableRegenerate,
  className = '',
}: CacheStatusBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const config = STATE_CONFIG[state]
  const Icon = config.icon
  const isAnimating = state === 'generating' || state === 'regenerating'

  const handleClick = useCallback(() => {
    if (metadata) {
      setShowTooltip((prev) => !prev)
    }
  }, [metadata])

  return (
    <div className={`relative inline-flex ${className}`}>
      {/* Badge */}
      <button
        onClick={handleClick}
        className={`
          flex items-center gap-1.5 rounded-lg border transition-all
          ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}
          ${config.bgClass} ${config.textClass} ${config.borderClass}
          ${config.pulseClass || ''}
          ${metadata ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
        `}
      >
        <Icon className={`
          ${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}
          ${isAnimating ? 'animate-spin' : ''}
        `} />
        
        <span className="font-medium">{config.label}</span>

        {/* Show time for cached states */}
        {!compact && metadata && (state === 'fresh' || state === 'stale') && (
          <span className="opacity-75">
            · {formatRelativeTime(metadata.createdAt)}
          </span>
        )}

        {/* Show item count if available */}
        {!compact && metadata && metadata.itemCount > 0 && (
          <span className={`
            px-1.5 py-0.5 rounded text-[10px]
            ${isDark ? 'bg-white/10' : 'bg-black/10'}
          `}>
            {metadata.itemCount}
          </span>
        )}

        {/* Info indicator when tooltip available */}
        {metadata && !compact && (
          <Info className="w-3 h-3 opacity-50" />
        )}
      </button>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && metadata && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowTooltip(false)}
            />
            
            <CacheTooltip
              metadata={metadata}
              state={state}
              contentType={contentType}
              isDark={isDark}
              onRegenerate={onRegenerate}
              onClearCache={onClearCache}
              onClose={() => setShowTooltip(false)}
              disableRegenerate={disableRegenerate}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   INLINE VARIANT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Inline text-style cache indicator
 */
export function CacheStatusInline({
  state,
  metadata,
  isDark,
}: {
  state: CacheState
  metadata?: CacheMetadata | null
  isDark: boolean
}) {
  const config = STATE_CONFIG[state]
  const Icon = config.icon
  const isAnimating = state === 'generating' || state === 'regenerating'

  return (
    <span className={`
      inline-flex items-center gap-1 text-xs
      ${config.textClass}
    `}>
      <Icon className={`w-3 h-3 ${isAnimating ? 'animate-spin' : ''}`} />
      <span>
        {config.label}
        {metadata && (state === 'fresh' || state === 'stale') && (
          <> · {formatRelativeTime(metadata.createdAt)}</>
        )}
      </span>
    </span>
  )
}

export default CacheStatusBadge

