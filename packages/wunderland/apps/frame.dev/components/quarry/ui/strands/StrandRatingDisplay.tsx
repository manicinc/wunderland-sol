'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle,
  Info,
  TrendingUp,
  Target,
  Eye,
  BookOpen,
  Lightbulb,
  Layers,
  HelpCircle,
} from 'lucide-react'
import { useStrandRatings, type LocalStrandRating, type LocalLLMStrandRating } from '../../hooks/useStrandRatings'
import {
  generateStrandRating,
  getRatingSummary,
  type RatingInput,
} from '@/lib/rating'
import type { RatingDimension } from '@/types/openstrand'
import type { ThemeName } from '@/types/theme'

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Extract dimension scores from a LocalLLMStrandRating
 */
function getDimensionScoresFromRating(
  rating: LocalLLMStrandRating
): Array<{ dimension: RatingDimension; score: number }> {
  const scores: Array<{ dimension: RatingDimension; score: number }> = []
  
  if (rating.qualityScore != null) scores.push({ dimension: 'quality', score: rating.qualityScore })
  if (rating.completenessScore != null) scores.push({ dimension: 'completeness', score: rating.completenessScore })
  if (rating.accuracyScore != null) scores.push({ dimension: 'accuracy', score: rating.accuracyScore })
  if (rating.clarityScore != null) scores.push({ dimension: 'clarity', score: rating.clarityScore })
  if (rating.relevanceScore != null) scores.push({ dimension: 'relevance', score: rating.relevanceScore })
  if (rating.depthScore != null) scores.push({ dimension: 'depth', score: rating.depthScore })
  
  return scores
}

/**
 * Get vibrant color based on score (0-10)
 */
function getScoreColor(score: number): string {
  if (score >= 8) return 'text-emerald-400'
  if (score >= 6) return 'text-cyan-400'
  if (score >= 4) return 'text-amber-400'
  return 'text-rose-400'
}

/**
 * Get vibrant background color based on score
 */
function getScoreBgColor(score: number): string {
  if (score >= 8) return 'bg-emerald-500/20'
  if (score >= 6) return 'bg-cyan-500/20'
  if (score >= 4) return 'bg-amber-500/20'
  return 'bg-rose-500/20'
}

/**
 * Get gradient for progress bars based on score
 */
function getScoreGradient(score: number): string {
  if (score >= 8) return 'from-emerald-500 to-emerald-400'
  if (score >= 6) return 'from-cyan-500 to-cyan-400'
  if (score >= 4) return 'from-amber-500 to-amber-400'
  return 'from-rose-500 to-rose-400'
}

/**
 * Get star fill color based on score
 */
function getStarFillColor(score: number): string {
  if (score >= 8) return 'fill-amber-400 text-amber-400 drop-shadow-[0_0_3px_rgba(251,191,36,0.5)]'
  if (score >= 6) return 'fill-amber-400 text-amber-400'
  if (score >= 4) return 'fill-amber-300 text-amber-300'
  return 'fill-amber-200 text-amber-200'
}

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface StrandRatingDisplayProps {
  strandId: string
  strandPath: string
  strandTitle: string
  content: string
  metadata?: Record<string, unknown>
  theme?: ThemeName
  compact?: boolean
  showLLMRating?: boolean
  showUserRating?: boolean
  editable?: boolean
  onRatingChange?: (rating: LocalStrandRating | LocalLLMStrandRating, type: 'user' | 'llm') => void
}

/* ═══════════════════════════════════════════════════════════════════════════
   DIMENSION CONFIG
═══════════════════════════════════════════════════════════════════════════ */

const DIMENSION_ICONS: Record<RatingDimension, typeof Star> = {
  quality: TrendingUp,
  completeness: Target,
  accuracy: CheckCircle,
  clarity: Eye,
  relevance: BookOpen,
  depth: Layers,
}

const DIMENSION_LABELS: Record<RatingDimension, string> = {
  quality: 'Quality',
  completeness: 'Completeness',
  accuracy: 'Accuracy',
  clarity: 'Clarity',
  relevance: 'Relevance',
  depth: 'Depth',
}

const DIMENSION_DESCRIPTIONS: Record<RatingDimension, string> = {
  quality: 'Overall writing quality, structure, and professionalism of the document',
  completeness: 'How thoroughly and comprehensively the topic is covered',
  accuracy: 'Factual correctness and reliability of the information presented',
  clarity: 'How easy the content is to read, understand, and follow',
  relevance: 'How well the content matches its stated purpose and audience',
  depth: 'Level of analytical detail, nuance, and thoroughness',
}

const DIMENSION_COLORS: Record<RatingDimension, { icon: string; bar: string }> = {
  quality: { icon: 'text-violet-400', bar: 'from-violet-500 to-violet-400' },
  completeness: { icon: 'text-cyan-400', bar: 'from-cyan-500 to-cyan-400' },
  accuracy: { icon: 'text-emerald-400', bar: 'from-emerald-500 to-emerald-400' },
  clarity: { icon: 'text-sky-400', bar: 'from-sky-500 to-sky-400' },
  relevance: { icon: 'text-amber-400', bar: 'from-amber-500 to-amber-400' },
  depth: { icon: 'text-rose-400', bar: 'from-rose-500 to-rose-400' },
}

/* ═══════════════════════════════════════════════════════════════════════════
   USER RATING TOOLTIPS
═══════════════════════════════════════════════════════════════════════════ */

const USER_RATING_TOOLTIP = `⭐ YOUR PERSONAL RATING

Rate this document based on what matters to you:

📊 Quality — Is the information well-written?
✅ Completeness — Does it cover everything?
💡 Usefulness — Is it helpful for your goals?

Click the stars to rate from 1-10.
Your ratings are stored locally and never shared.`

const LLM_RATING_TOOLTIP = `🤖 AI-GENERATED RATING

The AI analyzes this document across 6 dimensions:

📈 Quality — Writing structure & professionalism
🎯 Completeness — Topic coverage depth
✓ Accuracy — Factual correctness
👁 Clarity — Readability & understanding
📖 Relevance — Purpose alignment
📚 Depth — Analytical detail

Ratings are generated locally using LLMs and stored on your device.`

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

function StarRating({
  value,
  onChange,
  max = 10,
  disabled = false,
  size = 'md',
  theme,
  showLabel = true,
}: {
  value: number
  onChange?: (value: number) => void
  max?: number
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  theme?: ThemeName
  showLabel?: boolean
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const isDark = theme?.includes('dark') ?? true

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7',
  }

  const displayValue = hovered ?? value
  const hasValue = displayValue > 0

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
      {Array.from({ length: max }, (_, i) => i + 1).map((rating) => {
        const isFilled = rating <= displayValue
        return (
          <motion.button
            key={rating}
            type="button"
            disabled={disabled}
            whileHover={!disabled ? { scale: 1.15, y: -2 } : undefined}
            whileTap={!disabled ? { scale: 0.95 } : undefined}
            className={`
              ${disabled ? 'cursor-default' : 'cursor-pointer'}
              transition-all duration-150 relative
            `}
            onMouseEnter={() => !disabled && setHovered(rating)}
            onClick={() => !disabled && onChange?.(rating)}
          >
            <Star
              className={`
                ${sizeClasses[size]}
                transition-all duration-200
                ${
                  isFilled
                    ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]'
                    : isDark
                      ? 'text-zinc-700 hover:text-zinc-500'
                      : 'text-zinc-300 hover:text-zinc-400'
                }
              `}
              strokeWidth={isFilled ? 0 : 1.5}
            />
            {/* Glow effect for filled stars */}
            {isFilled && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                className="absolute inset-0 bg-amber-400 blur-md rounded-full -z-10"
              />
            )}
          </motion.button>
        )
      })}
      {showLabel && (
        <motion.div
          initial={false}
          animate={{ 
            scale: hasValue ? 1 : 0.9,
            opacity: hasValue ? 1 : 0.5
          }}
          className={`
            ml-3 px-3 py-1.5 rounded-lg font-bold tabular-nums text-sm
            ${hasValue 
              ? `${getScoreBgColor(displayValue)} ${getScoreColor(displayValue)}`
              : isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400'
            }
          `}
        >
          {displayValue > 0 ? `${displayValue}/10` : '—/10'}
        </motion.div>
      )}
    </div>
  )
}

function Tooltip({
  children,
  content,
  theme,
  position = 'top',
}: {
  children: React.ReactNode
  content: string
  theme?: ThemeName
  position?: 'top' | 'bottom' | 'left' | 'right'
}) {
  const [isVisible, setIsVisible] = useState(false)
  const isDark = theme?.includes('dark') ?? true

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowClasses = {
    top: 'left-1/2 -translate-x-1/2 top-full rotate-45',
    bottom: 'left-1/2 -translate-x-1/2 bottom-full -rotate-135',
    left: 'top-1/2 -translate-y-1/2 left-full rotate-135',
    right: 'top-1/2 -translate-y-1/2 right-full -rotate-45',
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: position === 'top' ? 8 : position === 'bottom' ? -8 : 0, x: position === 'left' ? 8 : position === 'right' ? -8 : 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: position === 'top' ? 8 : position === 'bottom' ? -8 : 0, x: position === 'left' ? 8 : position === 'right' ? -8 : 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`
              absolute z-[100] w-72 p-4 text-xs rounded-xl shadow-2xl
              ${positionClasses[position]}
              ${isDark 
                ? 'bg-zinc-900 text-zinc-200 border border-zinc-700 shadow-black/50' 
                : 'bg-white text-zinc-700 border border-zinc-200 shadow-zinc-300/50'
              }
            `}
          >
            <pre className="whitespace-pre-wrap font-sans leading-relaxed">{content}</pre>
            <div
              className={`
                absolute w-3 h-3
                ${arrowClasses[position]}
                ${isDark ? 'bg-zinc-900 border-r border-b border-zinc-700' : 'bg-white border-r border-b border-zinc-200'}
              `}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DimensionBar({
  dimension,
  score,
  theme,
  showTooltip = true,
}: {
  dimension: RatingDimension
  score: number
  theme?: ThemeName
  showTooltip?: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)
  const isDark = theme?.includes('dark') ?? true
  const Icon = DIMENSION_ICONS[dimension]
  const percent = (score / 10) * 100
  const colors = DIMENSION_COLORS[dimension]

  const bar = (
    <motion.div 
      className="flex items-center gap-3 group py-1.5"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Icon with color */}
      <motion.div
        animate={{ scale: isHovered ? 1.1 : 1 }}
        className={`p-1.5 rounded-lg ${isDark ? 'bg-zinc-800/80' : 'bg-zinc-100'}`}
      >
        <Icon className={`w-4 h-4 ${colors.icon}`} />
      </motion.div>

      {/* Label */}
      <span
        className={`
          w-28 text-xs font-medium
          ${isDark ? 'text-zinc-300' : 'text-zinc-600'}
        `}
      >
        {DIMENSION_LABELS[dimension]}
      </span>

      {/* Progress Bar */}
      <div
        className={`
          flex-1 h-3 rounded-full overflow-hidden relative
          ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}
        `}
      >
        {/* Background shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
        
        {/* Progress fill with gradient */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          className={`h-full rounded-full bg-gradient-to-r ${colors.bar} relative overflow-hidden`}
        >
          {/* Shine effect */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
          />
        </motion.div>
      </div>

      {/* Score badge */}
      <motion.span
        animate={{ 
          scale: isHovered ? 1.1 : 1,
          color: isHovered ? (isDark ? '#fff' : '#000') : undefined 
        }}
        className={`
          w-12 text-right text-sm font-bold tabular-nums
          ${getScoreColor(score)}
        `}
      >
        {score.toFixed(1)}
      </motion.span>

      {/* Info button */}
      {showTooltip && (
        <Tooltip content={DIMENSION_DESCRIPTIONS[dimension]} theme={theme} position="left">
          <button 
            className={`
              p-1 rounded-md transition-colors
              ${isDark ? 'hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300' : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600'}
            `}
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      )}
    </motion.div>
  )

  return bar
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function StrandRatingDisplay({
  strandId,
  strandPath,
  strandTitle,
  content,
  metadata,
  theme = 'dark',
  compact = false,
  showLLMRating = true,
  showUserRating = true,
  editable = true,
  onRatingChange,
}: StrandRatingDisplayProps) {
  const isDark = theme.includes('dark')

  const {
    userRating,
    llmRating,
    isLoading,
    isSaving,
    error,
    setUserRating,
    clearUserRating,
    saveLLMRating,
    clearLLMRating,
  } = useStrandRatings(strandId, strandPath)

  const [isExpanded, setIsExpanded] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState<string | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)

  // Handle user rating change
  const handleUserRatingChange = useCallback(
    async (rating: number) => {
      if (!editable) return
      const saved = await setUserRating(rating)
      if (saved) {
        onRatingChange?.(saved, 'user')
      }
    },
    [editable, setUserRating, onRatingChange]
  )

  // Handle LLM rating generation
  const handleGenerateLLMRating = useCallback(async () => {
    if (!editable) return

    setIsGenerating(true)
    setGenerationError(null)

    try {
      const input: RatingInput = {
        strandId,
        strandPath,
        strandTitle,
        content,
        metadata: metadata as Record<string, unknown>,
      }

      const result = await generateStrandRating(
        input,
        { forceRegenerate: true },
        (stage, _percent) => setGenerationProgress(stage)
      )

      if (result.rating) {
        await saveLLMRating(result.rating)
        onRatingChange?.(result.rating, 'llm')
      }
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Failed to generate rating')
    } finally {
      setIsGenerating(false)
      setGenerationProgress(null)
    }
  }, [strandId, strandPath, strandTitle, content, metadata, editable, saveLLMRating, onRatingChange])

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`
          rounded-lg p-4
          ${isDark ? 'bg-zinc-900/50' : 'bg-zinc-50'}
        `}
      >
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-zinc-500" />
          <span className="text-sm text-zinc-500">Loading ratings...</span>
        </div>
      </div>
    )
  }

  // Compact view
  if (compact) {
    return (
      <div className="flex items-center gap-4">
        {showUserRating && (
          <Tooltip content={USER_RATING_TOOLTIP} theme={theme}>
            <div className="flex items-center gap-2 cursor-help group">
              <Star 
                className={`w-5 h-5 transition-all ${
                  userRating 
                    ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]' 
                    : isDark ? 'text-zinc-600' : 'text-zinc-400'
                } group-hover:scale-110`} 
              />
              <span className={`text-sm font-bold tabular-nums ${
                userRating ? getScoreColor(userRating.rating) : isDark ? 'text-zinc-500' : 'text-zinc-400'
              }`}>
                {userRating ? `${userRating.rating}/10` : '—'}
              </span>
            </div>
          </Tooltip>
        )}
        {showLLMRating && (
          <Tooltip content={LLM_RATING_TOOLTIP} theme={theme}>
            <div className="flex items-center gap-2 cursor-help group">
              <Sparkles 
                className={`w-5 h-5 transition-all ${
                  llmRating 
                    ? 'text-violet-400 drop-shadow-[0_0_4px_rgba(167,139,250,0.5)]' 
                    : isDark ? 'text-zinc-600' : 'text-zinc-400'
                } group-hover:scale-110`} 
              />
              <span className={`text-sm font-bold tabular-nums ${
                llmRating ? getScoreColor(llmRating.overallScore) : isDark ? 'text-zinc-500' : 'text-zinc-400'
              }`}>
                {llmRating ? `${llmRating.overallScore.toFixed(1)}/10` : '—'}
              </span>
            </div>
          </Tooltip>
        )}
      </div>
    )
  }

  // Full view
  const dimensionScores = llmRating ? getDimensionScoresFromRating(llmRating) : []

  return (
    <div
      className={`
        rounded-2xl border overflow-hidden
        ${isDark 
          ? 'bg-gradient-to-b from-zinc-900 to-zinc-900/80 border-zinc-700/50' 
          : 'bg-gradient-to-b from-white to-zinc-50 border-zinc-200'
        }
        shadow-xl ${isDark ? 'shadow-black/30' : 'shadow-zinc-300/30'}
      `}
    >
      {/* Header */}
      <div
        className={`
          px-5 py-4 border-b flex items-center justify-between
          ${isDark 
            ? 'border-zinc-800 bg-gradient-to-r from-violet-500/5 via-transparent to-amber-500/5' 
            : 'border-zinc-200 bg-gradient-to-r from-violet-500/5 via-transparent to-amber-500/5'
          }
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <h3 className={`text-base font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
              Document Ratings
            </h3>
            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Personal & AI analysis
            </p>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-1.5 text-rose-400 text-xs bg-rose-500/10 px-2 py-1 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-6">
        {/* User Rating */}
        {showUserRating && (
          <div className={`
            p-4 rounded-xl space-y-4
            ${isDark ? 'bg-zinc-800/30' : 'bg-zinc-50'}
          `}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <span className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                    Your Rating
                  </span>
                  <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Rate based on your experience
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip content={USER_RATING_TOOLTIP} theme={theme}>
                  <button className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'}`}>
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </Tooltip>
                {userRating && editable && (
                  <button
                    onClick={clearUserRating}
                    disabled={isSaving}
                    className={`
                      p-1.5 rounded-lg transition-colors
                      ${isDark ? 'hover:bg-rose-500/20 text-rose-400' : 'hover:bg-rose-100 text-rose-500'}
                    `}
                    title="Clear your rating"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <StarRating
              value={userRating?.rating ?? 0}
              onChange={handleUserRatingChange}
              disabled={!editable || isSaving}
              theme={theme}
              size="lg"
            />
          </div>
        )}

        {/* LLM Rating */}
        {showLLMRating && (
          <div className={`
            p-4 rounded-xl space-y-4
            ${isDark ? 'bg-violet-500/5 border border-violet-500/20' : 'bg-violet-50 border border-violet-100'}
          `}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
                  <Sparkles className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <span className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                    AI Rating
                  </span>
                  <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Multi-dimensional analysis
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip content={LLM_RATING_TOOLTIP} theme={theme}>
                  <button className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-violet-500/20 text-violet-400' : 'hover:bg-violet-200 text-violet-500'}`}>
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </Tooltip>
                {llmRating && editable && (
                  <button
                    onClick={clearLLMRating}
                    disabled={isGenerating}
                    className={`
                      p-1.5 rounded-lg transition-colors
                      ${isDark ? 'hover:bg-rose-500/20 text-rose-400' : 'hover:bg-rose-100 text-rose-500'}
                    `}
                    title="Clear AI rating"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {editable && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGenerateLLMRating}
                    disabled={isGenerating}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
                      transition-all duration-200 shadow-lg
                      ${
                        isGenerating
                          ? 'opacity-60 cursor-wait'
                          : isDark
                            ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-500 hover:to-violet-400 shadow-violet-500/25'
                            : 'bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-500 hover:to-violet-400 shadow-violet-500/25'
                      }
                    `}
                  >
                    <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                    {llmRating ? 'Re-analyze' : 'Analyze'}
                  </motion.button>
                )}
              </div>
            </div>

            {/* Generation Progress */}
            {isGenerating && generationProgress && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`
                  px-3 py-2 rounded-lg text-xs
                  ${isDark ? 'bg-purple-900/20 text-purple-300' : 'bg-purple-50 text-purple-700'}
                `}
              >
                <RefreshCw className="w-3 h-3 animate-spin inline mr-2" />
                {generationProgress}
              </motion.div>
            )}

            {/* Generation Error */}
            {generationError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`
                  px-3 py-2 rounded-lg text-xs
                  ${isDark ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'}
                `}
              >
                <AlertCircle className="w-3 h-3 inline mr-2" />
                {generationError}
              </motion.div>
            )}

            {/* LLM Rating Display */}
            {llmRating && !isGenerating && (
              <div className="space-y-4">
                {/* Overall Score - Big Display */}
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`
                    relative flex items-center justify-between p-4 rounded-xl overflow-hidden
                    ${isDark ? 'bg-zinc-800/50' : 'bg-white border border-zinc-200'}
                  `}
                >
                  {/* Background gradient based on score */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${getScoreGradient(llmRating.overallScore)} opacity-10`} />
                  
                  <div className="relative z-10">
                    <p className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Overall Score
                    </p>
                    <p className={`text-sm font-semibold mt-0.5 ${getScoreColor(llmRating.overallScore)}`}>
                      {getRatingSummary(llmRating)}
                    </p>
                  </div>
                  
                  <div className="relative z-10 text-right">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.1 }}
                      className={`
                        text-4xl font-black tabular-nums
                        ${getScoreColor(llmRating.overallScore)}
                        drop-shadow-lg
                      `}
                    >
                      {llmRating.overallScore.toFixed(1)}
                    </motion.div>
                    <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>out of 10</p>
                  </div>
                </motion.div>

                {/* Dimension Scores (Expandable) */}
                {dimensionScores.length > 0 && (
                  <>
                    <motion.button
                      whileHover={{ x: 4 }}
                      onClick={() => setIsExpanded(!isExpanded)}
                      className={`
                        flex items-center gap-2 text-sm font-medium w-full py-2
                        ${isDark ? 'text-zinc-300 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'}
                      `}
                    >
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-5 h-5" />
                      </motion.div>
                      <span>
                        {isExpanded ? 'Hide' : 'Show'} dimension breakdown
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
                        {dimensionScores.length} metrics
                      </span>
                    </motion.button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className={`
                            space-y-2 overflow-hidden rounded-xl p-4
                            ${isDark ? 'bg-zinc-800/30' : 'bg-zinc-50'}
                          `}
                        >
                          {dimensionScores.map((dim, idx) => (
                            <motion.div
                              key={dim.dimension}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                            >
                              <DimensionBar
                                dimension={dim.dimension as RatingDimension}
                                score={dim.score}
                                theme={theme}
                              />
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}

                {/* Reasoning */}
                {llmRating.reasoning && isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`
                      p-4 rounded-xl
                      ${isDark ? 'bg-amber-500/5 border border-amber-500/20' : 'bg-amber-50 border border-amber-100'}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <h4 className={`text-sm font-semibold mb-1 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                          AI Analysis
                        </h4>
                        <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                          {llmRating.reasoning}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Suggestions */}
                {llmRating.suggestions && llmRating.suggestions.length > 0 && isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`
                      p-4 rounded-xl space-y-3
                      ${isDark ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100'}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                        <Target className="w-4 h-4 text-emerald-500" />
                      </div>
                      <h4 className={`text-sm font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                        Suggestions for Improvement
                      </h4>
                    </div>
                    <ul className="space-y-2">
                      {llmRating.suggestions.map((suggestion, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={`
                            flex items-start gap-3 text-sm
                            ${isDark ? 'text-zinc-300' : 'text-zinc-600'}
                          `}
                        >
                          <span className={`
                            flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                            ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}
                          `}>
                            {i + 1}
                          </span>
                          <span>{suggestion}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {/* Model Info */}
                {llmRating.modelUsed && isExpanded && (
                  <div className={`
                    flex items-center gap-2 text-xs px-3 py-2 rounded-lg
                    ${isDark ? 'bg-zinc-800/50 text-zinc-500' : 'bg-zinc-100 text-zinc-400'}
                  `}>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Analyzed by <strong>{llmRating.modelUsed}</strong></span>
                    <span>•</span>
                    <span>{new Date(llmRating.updatedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!llmRating && !isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`
                  py-8 text-center rounded-xl border-2 border-dashed
                  ${isDark ? 'border-violet-500/30 bg-violet-500/5' : 'border-violet-200 bg-violet-50/50'}
                `}
              >
                <motion.div
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Sparkles className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
                </motion.div>
                <p className={`text-base font-semibold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  No AI rating yet
                </p>
                {editable && (
                  <p className={`text-sm mt-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Click <strong>&quot;Analyze&quot;</strong> to get a detailed AI assessment
                  </p>
                )}
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default StrandRatingDisplay

