/**
 * ReflectionInsights - Display and generate insights for reflections
 * @module components/quarry/ui/ReflectionInsights
 *
 * Multi-tier insight display with on-demand generation.
 * Shows themes, entities, sentiment, key phrases, and tags.
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Brain,
  Tag,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Heart,
  CheckCircle,
  AlertCircle,
  Zap,
  Cloud,
  Cpu,
  Hash,
  User,
  MapPin,
  Briefcase,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Plus,
  X,
} from 'lucide-react'
import { generateInsights } from '@/lib/reflect/reflectionInsights'
import { getTierConfig, type TierDisplayConfig } from '@/lib/reflect/insightSettings'
import type { ReflectionInsights as InsightType, InsightTier } from '@/lib/reflect/types'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

export interface ReflectionInsightsProps {
  /** The reflection date key */
  dateKey: string
  /** Reflection content */
  content: string
  /** User's selected mood */
  mood?: string
  /** Existing insights (if loaded from storage) */
  existingInsights?: InsightType
  /** Called when insights are generated */
  onInsightsGenerated?: (insights: InsightType) => void
  /** Called when a suggested tag is applied */
  onApplyTag?: (tag: string) => void
  /** Already applied tags (to show checkmarks) */
  appliedTags?: string[]
  /** Dark mode */
  isDark?: boolean
  /** Default collapsed state */
  defaultCollapsed?: boolean
  /** Additional class name */
  className?: string
}

// ============================================================================
// TIER BADGE
// ============================================================================

const TIER_ICONS: Record<InsightTier, React.ElementType> = {
  llm: Cloud,
  bert: Cpu,
  nlp: Zap,
}

const TIER_TOOLTIPS: Record<InsightTier, { title: string; description: string }> = {
  llm: {
    title: 'AI Cloud',
    description: 'Uses Claude, GPT, or other LLMs for rich insights. Requires API key.',
  },
  bert: {
    title: 'Local AI',
    description: 'Uses on-device BERT model for semantic analysis. Works offline.',
  },
  nlp: {
    title: 'Fast Analysis',
    description: 'Instant keyword extraction and sentiment. No AI required.',
  },
}

function TierBadge({ tier, isDark, showTooltip = false }: { tier: InsightTier; isDark?: boolean; showTooltip?: boolean }) {
  const Icon = TIER_ICONS[tier]
  const config = getTierConfig(tier)
  const tooltip = TIER_TOOLTIPS[tier]
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="relative">
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium cursor-help',
          tier === 'llm' && (isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'),
          tier === 'bert' && (isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'),
          tier === 'nlp' && (isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'),
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Icon className="w-3 h-3" />
        <span>{config.label}</span>
        {showTooltip && <Info className="w-2.5 h-2.5 opacity-60" />}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={cn(
              'absolute z-50 top-full left-0 mt-1.5 p-2 rounded-lg shadow-lg text-xs w-48',
              isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'
            )}
          >
            <p className={cn('font-semibold mb-0.5', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
              {tooltip.title}
            </p>
            <p className={cn(isDark ? 'text-zinc-400' : 'text-zinc-500')}>
              {tooltip.description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// SENTIMENT INDICATOR
// ============================================================================

function SentimentIndicator({
  sentiment,
  isDark,
}: {
  sentiment: InsightType['sentiment']
  isDark?: boolean
}) {
  const Icon = sentiment.score > 0.1 ? TrendingUp : sentiment.score < -0.1 ? TrendingDown : Minus

  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-lg',
      isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
    )}>
      <div className={cn(
        'p-1.5 rounded-lg',
        sentiment.overall === 'positive' && (isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'),
        sentiment.overall === 'negative' && (isDark ? 'bg-red-500/20' : 'bg-red-100'),
        sentiment.overall === 'neutral' && (isDark ? 'bg-zinc-600/20' : 'bg-zinc-200'),
        sentiment.overall === 'mixed' && (isDark ? 'bg-amber-500/20' : 'bg-amber-100'),
      )}>
        <Icon className={cn(
          'w-4 h-4',
          sentiment.overall === 'positive' && 'text-emerald-500',
          sentiment.overall === 'negative' && 'text-red-500',
          sentiment.overall === 'neutral' && (isDark ? 'text-zinc-400' : 'text-zinc-500'),
          sentiment.overall === 'mixed' && 'text-amber-500',
        )} />
      </div>
      <div>
        <p className={cn('text-xs font-medium capitalize', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
          {sentiment.overall}
        </p>
        <p className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          Score: {(sentiment.score * 100).toFixed(0)}%
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// THEME CHIP
// ============================================================================

function ThemeChip({
  theme,
  isDark,
}: {
  theme: InsightType['themes'][0]
  isDark?: boolean
}) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs',
      isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-100 text-purple-700'
    )}>
      <Hash className="w-3 h-3" />
      <span className="font-medium">{theme.name}</span>
      <span className={cn('text-[10px]', isDark ? 'text-purple-500' : 'text-purple-400')}>
        {Math.round(theme.confidence * 100)}%
      </span>
    </div>
  )
}

// ============================================================================
// ENTITY CHIP
// ============================================================================

const ENTITY_ICONS: Record<string, React.ElementType> = {
  person: User,
  place: MapPin,
  project: Briefcase,
  event: Activity,
  emotion: Heart,
  activity: Activity,
}

function EntityChip({
  entity,
  isDark,
}: {
  entity: InsightType['entities'][0]
  isDark?: boolean
}) {
  const Icon = ENTITY_ICONS[entity.type] || Tag

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs',
      entity.type === 'person' && (isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-700'),
      entity.type === 'place' && (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-700'),
      entity.type === 'project' && (isDark ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-100 text-cyan-700'),
      entity.type === 'emotion' && (isDark ? 'bg-pink-500/10 text-pink-400' : 'bg-pink-100 text-pink-700'),
      (entity.type === 'event' || entity.type === 'activity') && (isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-700'),
    )}>
      <Icon className="w-3 h-3" />
      <span>{entity.name}</span>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ReflectionInsights({
  dateKey,
  content,
  mood,
  existingInsights,
  onInsightsGenerated,
  onApplyTag,
  appliedTags = [],
  isDark,
  defaultCollapsed = true,
  className,
}: ReflectionInsightsProps) {
  const [insights, setInsights] = useState<InsightType | null>(existingInsights || null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed)
  const [error, setError] = useState<string | null>(null)

  // Generate insights on demand
  const handleGenerate = useCallback(async (preferredTier?: InsightTier) => {
    if (!content.trim() || content.length < 50) {
      setError('Content is too short for insight generation')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const result = await generateInsights(content, {
        mood,
        date: dateKey,
        preferredTier,
        force: true,
      })
      setInsights(result)
      onInsightsGenerated?.(result)
      setIsExpanded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate insights')
    } finally {
      setIsGenerating(false)
    }
  }, [content, mood, dateKey, onInsightsGenerated])

  // Don't render if no insights and content is too short
  if (!insights && content.length < 50) {
    return null
  }

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden',
      isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-white',
      className
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3',
        isDark ? 'border-b border-zinc-800' : 'border-b border-zinc-200'
      )}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          <Sparkles className={cn('w-4 h-4', isDark ? 'text-purple-400' : 'text-purple-600')} />
          <span className={cn('text-sm font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
            Insights
          </span>
          {insights && <TierBadge tier={insights.tier} isDark={isDark} showTooltip />}
          {isExpanded ? (
            <ChevronUp className={cn('w-4 h-4', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
          ) : (
            <ChevronDown className={cn('w-4 h-4', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
          )}
        </button>

        <button
          onClick={() => handleGenerate()}
          disabled={isGenerating}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
            isDark
              ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
              : 'bg-purple-100 text-purple-700 hover:bg-purple-200',
            isGenerating && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Brain className="w-3.5 h-3.5" />
              <span>{insights ? 'Regenerate' : 'Generate'}</span>
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Error State */}
              {error && (
                <div className={cn(
                  'flex items-center gap-2 p-3 rounded-lg text-sm',
                  isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-100 text-red-700'
                )}>
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              {/* No Insights Yet */}
              {!insights && !error && (
                <div className={cn(
                  'text-center py-6',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}>
                  <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">Click "Generate" to analyze this reflection</p>
                  <p className="text-xs mt-2 opacity-75 max-w-xs mx-auto">
                    Extracts themes, entities, sentiment, and key phrases from your writing.
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-4 text-[10px]">
                    <div className="flex items-center gap-1">
                      <Cloud className="w-3 h-3 text-purple-500" />
                      <span>AI Cloud</span>
                    </div>
                    <span className="opacity-30">|</span>
                    <div className="flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-cyan-500" />
                      <span>Local AI</span>
                    </div>
                    <span className="opacity-30">|</span>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span>Fast</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Insights Display */}
              {insights && (
                <>
                  {/* Summary */}
                  {insights.summary && (
                    <div className={cn(
                      'p-3 rounded-lg',
                      isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
                    )}>
                      <p className={cn('text-sm', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                        {insights.summary}
                      </p>
                    </div>
                  )}

                  {/* Sentiment & Themes Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Sentiment */}
                    <div>
                      <h4 className={cn('text-xs font-medium mb-2', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                        Sentiment
                      </h4>
                      <SentimentIndicator sentiment={insights.sentiment} isDark={isDark} />
                    </div>

                    {/* Mood Alignment */}
                    {insights.moodAlignment && (
                      <div>
                        <h4 className={cn('text-xs font-medium mb-2', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                          Mood Match
                        </h4>
                        <div className={cn(
                          'flex items-center gap-2 p-2 rounded-lg',
                          isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
                        )}>
                          <CheckCircle className={cn(
                            'w-4 h-4',
                            insights.moodAlignment.matches ? 'text-emerald-500' : 'text-amber-500'
                          )} />
                          <span className={cn('text-xs', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                            {insights.moodAlignment.matches ? 'Matches your mood' : 'Differs from mood'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Themes */}
                  {insights.themes.length > 0 && (
                    <div>
                      <h4 className={cn('text-xs font-medium mb-2', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                        Themes
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {insights.themes.map((theme, i) => (
                          <ThemeChip key={i} theme={theme} isDark={isDark} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Entities */}
                  {insights.entities.length > 0 && (
                    <div>
                      <h4 className={cn('text-xs font-medium mb-2', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                        Mentioned
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {insights.entities.slice(0, 10).map((entity, i) => (
                          <EntityChip key={i} entity={entity} isDark={isDark} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Phrases */}
                  {insights.keyPhrases.length > 0 && (
                    <div>
                      <h4 className={cn('text-xs font-medium mb-2', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                        Key Phrases
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {insights.keyPhrases.map((phrase, i) => (
                          <span
                            key={i}
                            className={cn(
                              'px-2 py-1 rounded text-xs',
                              isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                            )}
                          >
                            "{phrase}"
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Items */}
                  {insights.actionItems && insights.actionItems.length > 0 && (
                    <div>
                      <h4 className={cn('text-xs font-medium mb-2', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                        Action Items
                      </h4>
                      <ul className="space-y-1">
                        {insights.actionItems.map((item, i) => (
                          <li key={i} className={cn('text-xs flex items-start gap-2', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                            <CheckCircle className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Gratitude Items */}
                  {insights.gratitudeItems && insights.gratitudeItems.length > 0 && (
                    <div>
                      <h4 className={cn('text-xs font-medium mb-2', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                        Gratitude
                      </h4>
                      <ul className="space-y-1">
                        {insights.gratitudeItems.map((item, i) => (
                          <li key={i} className={cn('text-xs flex items-start gap-2', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                            <Heart className="w-3.5 h-3.5 mt-0.5 text-pink-500 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggested Tags */}
                  {insights.suggestedTags.length > 0 && (
                    <div>
                      <h4 className={cn('text-xs font-medium mb-2', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                        Suggested Tags
                        {onApplyTag && (
                          <span className={cn('font-normal ml-2', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
                            Click to apply
                          </span>
                        )}
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {insights.suggestedTags.map((tag, i) => {
                          const isApplied = appliedTags.includes(tag.toLowerCase())
                          return (
                            <button
                              key={i}
                              onClick={() => !isApplied && onApplyTag?.(tag)}
                              disabled={isApplied || !onApplyTag}
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors',
                                isApplied
                                  ? isDark
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-emerald-100 text-emerald-700'
                                  : onApplyTag
                                    ? isDark
                                      ? 'bg-zinc-800 text-zinc-400 hover:bg-purple-500/20 hover:text-purple-400 cursor-pointer'
                                      : 'bg-zinc-200 text-zinc-600 hover:bg-purple-100 hover:text-purple-700 cursor-pointer'
                                    : isDark
                                      ? 'bg-zinc-800 text-zinc-400'
                                      : 'bg-zinc-200 text-zinc-600'
                              )}
                              title={isApplied ? 'Already applied' : onApplyTag ? 'Click to apply this tag' : undefined}
                            >
                              {isApplied ? (
                                <CheckCircle className="w-2.5 h-2.5" />
                              ) : onApplyTag ? (
                                <Plus className="w-2.5 h-2.5" />
                              ) : null}
                              <span>#{tag}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Generation Info */}
                  <div className={cn(
                    'flex items-center justify-between pt-2 border-t text-[10px]',
                    isDark ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-400'
                  )}>
                    <span>Generated in {insights.generationTimeMs}ms</span>
                    <span>{new Date(insights.generatedAt).toLocaleTimeString()}</span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// COMPACT VARIANT
// ============================================================================

/**
 * Compact insights badge for sidebar display
 */
export function ReflectionInsightsCompact({
  insights,
  isDark,
}: {
  insights?: InsightType
  isDark?: boolean
}) {
  if (!insights) return null

  return (
    <div className="flex items-center gap-2">
      <TierBadge tier={insights.tier} isDark={isDark} />
      <span className={cn(
        'text-xs capitalize',
        isDark ? 'text-zinc-400' : 'text-zinc-500'
      )}>
        {insights.sentiment.overall}
      </span>
    </div>
  )
}
