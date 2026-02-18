/**
 * Cache Control Panel Component
 * @module quarry/ui/learning/CacheControlPanel
 *
 * Displays cache status and provides controls for clearing/regenerating
 * cached Learning Studio content.
 * 
 * Enhanced features:
 * - Per-content-type cache stats (flashcards, quizzes, glossary)
 * - LLM toggle for regeneration
 * - Force regenerate option
 * - Cache size display
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Database, RotateCw, Trash2, Clock, CheckCircle2,
  ChevronDown, Sparkles, Zap, CreditCard, HelpCircle, Book,
  AlertTriangle
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface ContentTypeCacheStats {
  exists: boolean
  itemCount: number
  createdAt?: string
  generationMethod?: 'nlp' | 'llm' | 'hybrid' | 'static'
  sizeBytes?: number
}

export interface CacheStats {
  /** Whether cached data exists for current selection */
  exists: boolean
  /** When the cache was created */
  createdAt?: string
  /** Number of items in cache */
  itemCount?: number
  /** Generation method used ('nlp', 'llm', 'hybrid', 'multi-strand') */
  generationMethod?: string
  /** Cache key for display */
  cacheKey?: string
  /** Per-content-type stats */
  flashcards?: ContentTypeCacheStats
  quizzes?: ContentTypeCacheStats
  glossary?: ContentTypeCacheStats
  /** Total cache size in bytes */
  totalSizeBytes?: number
}

export interface CacheControlPanelProps {
  /** Theme */
  isDark: boolean
  /** Current cache key (if selection exists) */
  cacheKey: string | null
  /** Cache statistics */
  cacheStats: CacheStats
  /** Clear cache handler */
  onClearCache: () => void
  /** Regenerate handler */
  onRegenerate: (options?: { forceRegenerate?: boolean; useLLM?: boolean }) => void
  /** Whether an operation is loading */
  isLoading: boolean
  /** Compact mode */
  compact?: boolean
  /** Per-type clear handlers (optional) */
  onClearFlashcards?: () => void
  onClearQuizzes?: () => void
  onClearGlossary?: () => void
  /** Per-type regenerate handlers (optional) */
  onRegenerateFlashcards?: (options?: { forceRegenerate?: boolean; useLLM?: boolean }) => void
  onRegenerateQuizzes?: (options?: { forceRegenerate?: boolean; useLLM?: boolean }) => void
  onRegenerateGlossary?: (options?: { forceRegenerate?: boolean; useLLM?: boolean }) => void
  /** Show LLM toggle */
  showLLMToggle?: boolean
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

function formatGenerationMethod(method?: string): string {
  switch (method) {
    case 'nlp':
      return 'NLP Only'
    case 'llm':
      return 'LLM Enhanced'
    case 'hybrid':
      return 'Hybrid'
    case 'multi-strand':
      return 'Multi-strand'
    case 'static':
      return 'Static'
    default:
      return method || 'Unknown'
  }
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const CONTENT_TYPE_CONFIG = {
  flashcards: {
    icon: CreditCard,
    label: 'Flashcards',
    color: { light: 'text-cyan-600', dark: 'text-cyan-400' },
    bgColor: { light: 'bg-cyan-50', dark: 'bg-cyan-900/30' },
    borderColor: { light: 'border-cyan-200', dark: 'border-cyan-800/50' },
  },
  quizzes: {
    icon: HelpCircle,
    label: 'Quizzes',
    color: { light: 'text-violet-600', dark: 'text-violet-400' },
    bgColor: { light: 'bg-violet-50', dark: 'bg-violet-900/30' },
    borderColor: { light: 'border-violet-200', dark: 'border-violet-800/50' },
  },
  glossary: {
    icon: Book,
    label: 'Glossary',
    color: { light: 'text-emerald-600', dark: 'text-emerald-400' },
    bgColor: { light: 'bg-emerald-50', dark: 'bg-emerald-900/30' },
    borderColor: { light: 'border-emerald-200', dark: 'border-emerald-800/50' },
  },
}

/**
 * Single content type cache card
 */
function ContentTypeCacheCard({
  type,
  stats,
  isDark,
  isLoading,
  onClear,
  onRegenerate,
}: {
  type: 'flashcards' | 'quizzes' | 'glossary'
  stats?: ContentTypeCacheStats
  isDark: boolean
  isLoading: boolean
  onClear?: () => void
  onRegenerate?: (options?: { forceRegenerate?: boolean; useLLM?: boolean }) => void
}) {
  const config = CONTENT_TYPE_CONFIG[type]
  const Icon = config.icon
  const hasCache = stats?.exists ?? false

  return (
    <div
      className={`
        rounded-xl p-3 border transition-all
        ${isDark
          ? `${config.bgColor.dark} ${config.borderColor.dark}`
          : `${config.bgColor.light} ${config.borderColor.light}`
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${isDark ? config.color.dark : config.color.light}`} />
          <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
            {config.label}
          </span>
        </div>
        
        {hasCache ? (
          <span className={`text-xs font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            {stats?.itemCount ?? 0} items
          </span>
        ) : (
          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Empty
          </span>
        )}
      </div>

      {hasCache && stats && (
        <div className={`mt-2 text-[11px] space-y-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          <div className="flex justify-between">
            <span>Generated:</span>
            <span>{formatRelativeTime(stats.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span>Method:</span>
            <span className="flex items-center gap-1">
              {stats.generationMethod === 'llm' ? (
                <Sparkles className="w-3 h-3 text-purple-400" />
              ) : (
                <Zap className="w-3 h-3 text-blue-400" />
              )}
              {formatGenerationMethod(stats.generationMethod)}
            </span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-1.5 mt-2">
        {onRegenerate && (
          <button
            onClick={() => onRegenerate({ forceRegenerate: true })}
            disabled={isLoading}
            className={`
              flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg
              text-[11px] font-medium transition-colors
              ${isDark
                ? 'bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300'
                : 'bg-white/50 hover:bg-white/80 text-zinc-600'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <RotateCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            {hasCache ? 'Regen' : 'Generate'}
          </button>
        )}
        {hasCache && onClear && (
          <button
            onClick={onClear}
            disabled={isLoading}
            className={`
              flex items-center justify-center px-2 py-1.5 rounded-lg
              text-[11px] transition-colors
              ${isDark
                ? 'text-red-400 hover:bg-red-900/30'
                : 'text-red-500 hover:bg-red-50'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function CacheControlPanel({
  isDark,
  cacheKey,
  cacheStats,
  onClearCache,
  onRegenerate,
  isLoading,
  compact = false,
  onClearFlashcards,
  onClearQuizzes,
  onClearGlossary,
  onRegenerateFlashcards,
  onRegenerateQuizzes,
  onRegenerateGlossary,
  showLLMToggle = false,
}: CacheControlPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [useLLM, setUseLLM] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  
  const hasCache = cacheStats.exists
  const hasPerTypeStats = cacheStats.flashcards || cacheStats.quizzes || cacheStats.glossary
  const hasPerTypeActions = onClearFlashcards || onClearQuizzes || onClearGlossary || 
                           onRegenerateFlashcards || onRegenerateQuizzes || onRegenerateGlossary

  const handleRegenerate = useCallback(() => {
    onRegenerate({ forceRegenerate: true, useLLM })
  }, [onRegenerate, useLLM])

  const handleClearAll = useCallback(() => {
    onClearCache()
    setShowClearConfirm(false)
  }, [onClearCache])

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Cache indicator */}
        {hasCache ? (
          <span
            className={`
              flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
              ${isDark
                ? 'bg-emerald-900/50 text-emerald-400'
                : 'bg-emerald-100 text-emerald-700'
              }
            `}
          >
            <CheckCircle2 className="w-3 h-3" />
            Cached
            {cacheStats.itemCount && (
              <span className={isDark ? 'text-emerald-500' : 'text-emerald-600'}>
                ({cacheStats.itemCount})
              </span>
            )}
          </span>
        ) : (
          <span
            className={`
              flex items-center gap-1 px-2 py-0.5 rounded text-xs
              ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
            `}
          >
            <Clock className="w-3 h-3" />
            Not cached
          </span>
        )}

        {/* LLM toggle (compact) */}
        {showLLMToggle && (
          <button
            onClick={() => setUseLLM(!useLLM)}
            className={`
              flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors
              ${useLLM
                ? isDark
                  ? 'bg-purple-900/50 text-purple-400'
                  : 'bg-purple-100 text-purple-600'
                : isDark
                  ? 'text-zinc-500 hover:text-zinc-300'
                  : 'text-zinc-400 hover:text-zinc-600'
              }
            `}
            title={useLLM ? 'LLM Enhanced' : 'NLP Only'}
          >
            {useLLM ? <Sparkles className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
          </button>
        )}

        {/* Regenerate button */}
        <button
          onClick={handleRegenerate}
          disabled={isLoading}
          className={`
            flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
            transition-colors
            ${isDark
              ? 'text-purple-400 hover:bg-purple-900/30'
              : 'text-purple-600 hover:bg-purple-50'
            }
            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <RotateCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          {hasCache ? 'Regenerate' : 'Generate'}
        </button>

        {/* Clear button */}
        {hasCache && (
          <button
            onClick={onClearCache}
            disabled={isLoading}
            className={`
              p-1 rounded text-xs transition-colors
              ${isDark
                ? 'text-zinc-500 hover:text-red-400 hover:bg-red-900/20'
                : 'text-zinc-400 hover:text-red-600 hover:bg-red-50'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            title="Clear cache"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className={`
        rounded-xl overflow-hidden
        ${isDark
          ? 'bg-zinc-800/50 border border-zinc-700'
          : 'bg-zinc-50 border border-zinc-200'
        }
      `}
    >
      {/* Header - clickable to expand */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full p-4 flex items-center justify-between
          transition-colors
          ${isDark ? 'hover:bg-zinc-800/80' : 'hover:bg-zinc-100/80'}
        `}
      >
        <div className="flex items-center gap-3">
          <Database
            className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
          />
          <div className="text-left">
            <span
              className={`text-sm font-semibold ${
                isDark ? 'text-zinc-200' : 'text-zinc-700'
              }`}
            >
              Cache & Regeneration
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              {hasCache ? (
                <span className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {cacheStats.itemCount ?? 0} items cached
                </span>
              ) : (
                <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  No cache
                </span>
              )}
              {cacheStats.totalSizeBytes && (
                <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  • {formatBytes(cacheStats.totalSizeBytes)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasCache && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`
                px-2 py-0.5 rounded text-xs font-medium
                ${isDark
                  ? 'bg-emerald-900/50 text-emerald-400'
                  : 'bg-emerald-100 text-emerald-700'
                }
              `}
            >
              <CheckCircle2 className="w-3 h-3 inline mr-1" />
              Cached
            </motion.span>
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className={`w-5 h-5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
          </motion.div>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`px-4 pb-4 space-y-4 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
              {/* LLM Toggle */}
              {showLLMToggle && (
                <div className={`flex items-center justify-between pt-4`}>
                  <div className="flex items-center gap-2">
                    {useLLM ? (
                      <Sparkles className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    ) : (
                      <Zap className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    )}
                    <div>
                      <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                        {useLLM ? 'LLM Enhanced' : 'NLP Only'}
                      </span>
                      <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {useLLM 
                          ? 'Uses AI for higher quality, slower' 
                          : 'Fast local processing, instant'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setUseLLM(!useLLM)}
                    className={`
                      relative w-12 h-6 rounded-full transition-colors
                      ${useLLM
                        ? isDark ? 'bg-purple-600' : 'bg-purple-500'
                        : isDark ? 'bg-zinc-700' : 'bg-zinc-300'
                      }
                    `}
                  >
                    <motion.div
                      className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                      animate={{ left: useLLM ? '1.5rem' : '0.25rem' }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              )}

              {/* Per-type cache stats */}
              {hasPerTypeStats && hasPerTypeActions && (
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <ContentTypeCacheCard
                    type="flashcards"
                    stats={cacheStats.flashcards}
                    isDark={isDark}
                    isLoading={isLoading}
                    onClear={onClearFlashcards}
                    onRegenerate={onRegenerateFlashcards}
                  />
                  <ContentTypeCacheCard
                    type="quizzes"
                    stats={cacheStats.quizzes}
                    isDark={isDark}
                    isLoading={isLoading}
                    onClear={onClearQuizzes}
                    onRegenerate={onRegenerateQuizzes}
                  />
                  <ContentTypeCacheCard
                    type="glossary"
                    stats={cacheStats.glossary}
                    isDark={isDark}
                    isLoading={isLoading}
                    onClear={onClearGlossary}
                    onRegenerate={onRegenerateGlossary}
                  />
                </div>
              )}

              {/* Overall cache info (when no per-type stats) */}
              {!hasPerTypeStats && hasCache && (
                <div
                  className={`
                    text-xs space-y-1.5 pt-4
                    ${isDark ? 'text-zinc-400' : 'text-zinc-500'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span>Items:</span>
                    <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>
                      {cacheStats.itemCount ?? '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Generated:</span>
                    <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>
                      {formatRelativeTime(cacheStats.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Method:</span>
                    <span className={`flex items-center gap-1 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                      {cacheStats.generationMethod === 'llm' && <Sparkles className="w-3 h-3 text-purple-400" />}
                      {cacheStats.generationMethod === 'nlp' && <Zap className="w-3 h-3 text-blue-400" />}
                      {formatGenerationMethod(cacheStats.generationMethod)}
                    </span>
                  </div>
                </div>
              )}

              {/* No cache message */}
              {!hasCache && (
                <p className={`text-xs pt-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  No cached content for this selection. Generate to create and cache content.
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleRegenerate}
                  disabled={isLoading}
                  className={`
                    flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                    text-sm font-semibold transition-all
                    bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white
                    shadow-lg shadow-purple-500/20
                    hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  {hasCache ? 'Regenerate All' : 'Generate All'}
                  {useLLM && <Sparkles className="w-3 h-3" />}
                </button>

                {hasCache && (
                  <>
                    {showClearConfirm ? (
                      <div className="flex gap-1">
                        <button
                          onClick={handleClearAll}
                          disabled={isLoading}
                          className={`
                            flex items-center gap-1 px-3 py-2.5 rounded-xl
                            text-sm font-medium transition-colors
                            ${isDark
                              ? 'bg-red-900/50 text-red-400'
                              : 'bg-red-100 text-red-600'
                            }
                          `}
                        >
                          <AlertTriangle className="w-4 h-4" />
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowClearConfirm(false)}
                          className={`
                            px-3 py-2.5 rounded-xl text-sm
                            ${isDark ? 'text-zinc-400' : 'text-zinc-500'}
                          `}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowClearConfirm(true)}
                        disabled={isLoading}
                        className={`
                          flex items-center gap-1.5 px-4 py-2.5 rounded-xl
                          text-sm font-medium transition-colors
                          ${isDark
                            ? 'text-red-400 hover:bg-red-900/30 border border-red-800/30'
                            : 'text-red-600 hover:bg-red-50 border border-red-200'
                          }
                          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear All
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Cache key (debug) */}
              {cacheKey && process.env.NODE_ENV === 'development' && (
                <p
                  className={`
                    text-[10px] font-mono truncate pt-2 border-t
                    ${isDark
                      ? 'text-zinc-600 border-zinc-700'
                      : 'text-zinc-400 border-zinc-200'
                    }
                  `}
                  title={cacheKey}
                >
                  Key: {cacheKey}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CacheControlPanel
