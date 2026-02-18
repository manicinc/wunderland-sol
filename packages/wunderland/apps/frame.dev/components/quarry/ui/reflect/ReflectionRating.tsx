'use client'

/**
 * ReflectionRating - Star rating for reflections with optional AI analysis
 * @module components/quarry/ui/reflect/ReflectionRating
 *
 * Simple 5-star rating that hooks into the existing strand rating system.
 * Optionally shows AI-powered 6-dimension analysis.
 * Uses portal for tooltip to escape overflow:hidden containers.
 */

import React, { useState, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Loader2, HelpCircle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStrandRatings } from '@/components/quarry/hooks/useStrandRatings'
import { generateStrandRating, getRatingSummary, getRatingColor } from '@/lib/rating/strandRatingService'

interface ReflectionRatingProps {
  /** Unique ID for the reflection strand */
  strandId: string | undefined
  /** Path to the reflection strand */
  strandPath: string | undefined
  /** Content for AI analysis */
  strandContent?: string
  /** Title for AI analysis */
  strandTitle?: string
  /** Dark mode */
  isDark?: boolean
  /** Compact mode for sidebar */
  compact?: boolean
  /** Max rating (default 5) */
  maxRating?: number
  /** Show loading state */
  showLoading?: boolean
  /** Show AI rating section */
  showAIRating?: boolean
}

/** Simple inline tooltip component using portal to escape overflow:hidden */
function Tooltip({
  children,
  content,
  isDark
}: {
  children: React.ReactNode
  content: string
  isDark?: boolean
}) {
  const [show, setShow] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = React.useRef<HTMLDivElement>(null)

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.top - 8, // Position above with some margin
        left: rect.left + rect.width / 2,
      })
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    updatePosition()
    setShow(true)
  }, [updatePosition])

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {typeof document !== 'undefined' && show && ReactDOM.createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              transform: 'translate(-50%, -100%)',
            }}
            className={cn(
              'z-[9999] px-2 py-1.5 rounded-md text-xs max-w-[200px] whitespace-normal text-center shadow-lg pointer-events-none',
              isDark
                ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                : 'bg-white text-zinc-700 border border-zinc-200'
            )}
          >
            {content}
            {/* Arrow */}
            <div className={cn(
              'absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent',
              isDark ? 'border-t-zinc-800' : 'border-t-white'
            )} />
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}

export function ReflectionRating({
  strandId,
  strandPath,
  strandContent,
  strandTitle,
  isDark = false,
  compact = false,
  maxRating = 5,
  showLoading = true,
  showAIRating = false,
}: ReflectionRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [showAISection, setShowAISection] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  const {
    userRating,
    llmRating,
    isLoading,
    isSaving,
    setUserRating,
    clearUserRating,
    saveLLMRating,
  } = useStrandRatings(strandId, strandPath)

  // Convert 1-10 scale to 1-5 scale for display
  const currentRating = userRating?.rating ? Math.round(userRating.rating / 2) : null
  const displayRating = hovered ?? currentRating ?? 0

  // Convert AI rating (1-10) to 5-star scale
  const aiStarRating = llmRating?.overallScore ? Math.round(llmRating.overallScore / 2) : 0

  const handleRatingClick = useCallback(async (value: number) => {
    if (!strandId || !strandPath) return

    // If clicking same rating, clear it
    if (currentRating === value) {
      await clearUserRating()
    } else {
      // Convert 5-star to 10-point scale
      await setUserRating(value * 2)
    }
  }, [strandId, strandPath, currentRating, setUserRating, clearUserRating])

  const handleGenerateAIRating = useCallback(async () => {
    if (!strandId || !strandPath || !strandContent) return

    setIsGenerating(true)
    setGenerationError(null)

    try {
      const result = await generateStrandRating({
        strandId,
        strandPath,
        strandTitle: strandTitle || 'Reflection',
        content: strandContent,
      })

      if (result.rating) {
        await saveLLMRating({
          strandId,
          strandPath,
          overallScore: result.rating.overallScore,
          qualityScore: result.rating.qualityScore,
          completenessScore: result.rating.completenessScore,
          accuracyScore: result.rating.accuracyScore,
          clarityScore: result.rating.clarityScore,
          relevanceScore: result.rating.relevanceScore,
          depthScore: result.rating.depthScore,
          reasoning: result.rating.reasoning,
          suggestions: result.rating.suggestions,
          modelUsed: result.provider || 'unknown',
        })
      }
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Failed to generate AI rating')
    } finally {
      setIsGenerating(false)
    }
  }, [strandId, strandPath, strandContent, strandTitle, saveLLMRating])

  if (!strandId || !strandPath) {
    return null
  }

  const isWorking = isLoading || isSaving

  return (
    <div className="space-y-2">
      {/* User Rating Row */}
      <div className="flex items-center gap-1.5">
        {/* Stars - compact but touch-friendly */}
        <div className="flex items-center">
          {Array.from({ length: maxRating }, (_, i) => i + 1).map((value) => (
            <motion.button
              key={value}
              onClick={() => handleRatingClick(value)}
              onMouseEnter={() => setHovered(value)}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={() => setHovered(value)}
              onTouchEnd={() => setHovered(null)}
              disabled={isWorking}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                'p-1 rounded transition-colors focus:outline-none touch-manipulation',
                'focus-visible:ring-2 focus-visible:ring-amber-500/50',
                'active:bg-amber-500/10',
                isWorking && 'opacity-50 cursor-wait'
              )}
              aria-label={`Rate ${value} out of ${maxRating} stars`}
            >
              <Star
                className={cn(
                  compact ? 'w-4 h-4' : 'w-5 h-5',
                  'transition-colors duration-150',
                  value <= displayRating
                    ? isDark
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-amber-500 text-amber-500'
                    : isDark
                      ? 'text-zinc-600 hover:text-zinc-500'
                      : 'text-zinc-300 hover:text-zinc-400'
                )}
              />
            </motion.button>
          ))}
        </div>

        {/* Rating display */}
        {currentRating !== null && (
          <span className={cn(
            'text-xs tabular-nums',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            {currentRating}/{maxRating}
          </span>
        )}

        {/* Loading indicator */}
        {showLoading && isWorking && (
          <Loader2 className={cn(
            'w-3 h-3 animate-spin',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )} />
        )}

        {/* Help tooltip */}
        <Tooltip
          content="Your personal rating. How meaningful or productive was this reflection?"
          isDark={isDark}
        >
          <HelpCircle className={cn(
            'w-3.5 h-3.5 cursor-help',
            isDark ? 'text-zinc-600' : 'text-zinc-400'
          )} />
        </Tooltip>
      </div>

      {/* AI Rating Section (collapsible) */}
      {showAIRating && strandContent && (
        <div className={cn(
          'rounded-lg overflow-hidden',
          isDark ? 'bg-zinc-800/50' : 'bg-zinc-100/50'
        )}>
          {/* AI Section Header */}
          <button
            onClick={() => setShowAISection(!showAISection)}
            className={cn(
              'w-full flex items-center justify-between px-2 py-1.5 text-xs transition-colors',
              isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-200/50'
            )}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className={cn('w-3 h-3', isDark ? 'text-purple-400' : 'text-purple-500')} />
              <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>
                AI
              </span>
              {/* AI Star Rating Display */}
              <span className="flex items-center">
                {Array.from({ length: 5 }, (_, i) => i + 1).map((value) => (
                  <Star
                    key={value}
                    className={cn(
                      'w-3.5 h-3.5',
                      value <= aiStarRating
                        ? isDark
                          ? 'fill-purple-400 text-purple-400'
                          : 'fill-purple-500 text-purple-500'
                        : isDark
                          ? 'text-zinc-700'
                          : 'text-zinc-300'
                    )}
                  />
                ))}
              </span>
              {llmRating && (
                <span className={cn(
                  'text-[10px] tabular-nums',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}>
                  {llmRating.overallScore}/10
                </span>
              )}
            </span>
            {showAISection ? (
              <ChevronUp className={cn('w-3 h-3', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
            ) : (
              <ChevronDown className={cn('w-3 h-3', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
            )}
          </button>

          {/* AI Section Content */}
          <AnimatePresence>
            {showAISection && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className={cn(
                  'px-2 pb-2 space-y-2 border-t',
                  isDark ? 'border-zinc-700' : 'border-zinc-200'
                )}>
                  {/* Existing AI Rating */}
                  {llmRating ? (
                    <div className="space-y-1.5 pt-2">
                      {/* Overall score */}
                      <div className="flex items-center justify-between">
                        <span className={cn('text-[10px]', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                          Overall
                        </span>
                        <span className={cn(
                          'text-xs font-medium',
                          getRatingColor(llmRating.overallScore ?? 0)
                        )}>
                          {getRatingSummary(llmRating)}
                        </span>
                      </div>

                      {/* Dimension bars */}
                      {[
                        { key: 'qualityScore', label: 'Quality' },
                        { key: 'completenessScore', label: 'Complete' },
                        { key: 'clarityScore', label: 'Clarity' },
                        { key: 'depthScore', label: 'Depth' },
                      ].map(({ key, label }) => {
                        const score = llmRating[key as keyof typeof llmRating] as number | undefined
                        if (!score) return null
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <span className={cn(
                              'text-[10px] w-14 truncate',
                              isDark ? 'text-zinc-500' : 'text-zinc-400'
                            )}>
                              {label}
                            </span>
                            <div className={cn(
                              'flex-1 h-1.5 rounded-full overflow-hidden',
                              isDark ? 'bg-zinc-700' : 'bg-zinc-200'
                            )}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${score * 10}%` }}
                                className={cn(
                                  'h-full rounded-full',
                                  score >= 8 ? 'bg-emerald-500' :
                                  score >= 6 ? 'bg-cyan-500' :
                                  score >= 4 ? 'bg-amber-500' : 'bg-rose-500'
                                )}
                              />
                            </div>
                            <span className={cn(
                              'text-[10px] w-4 text-right tabular-nums',
                              isDark ? 'text-zinc-500' : 'text-zinc-400'
                            )}>
                              {score}
                            </span>
                          </div>
                        )
                      })}

                      {/* Re-analyze button */}
                      <button
                        onClick={handleGenerateAIRating}
                        disabled={isGenerating}
                        className={cn(
                          'w-full mt-1 px-2 py-1 text-[10px] rounded transition-colors',
                          isDark
                            ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                            : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-600',
                          isGenerating && 'opacity-50 cursor-wait'
                        )}
                      >
                        {isGenerating ? 'Analyzing...' : 'Re-analyze'}
                      </button>
                    </div>
                  ) : (
                    /* No AI Rating Yet */
                    <div className="pt-2 space-y-2">
                      <p className={cn(
                        'text-[10px]',
                        isDark ? 'text-zinc-500' : 'text-zinc-400'
                      )}>
                        Analyze quality, completeness, accuracy, clarity, relevance & depth.
                      </p>
                      <button
                        onClick={handleGenerateAIRating}
                        disabled={isGenerating}
                        className={cn(
                          'w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded transition-colors',
                          isDark
                            ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300'
                            : 'bg-purple-100 hover:bg-purple-200 text-purple-700',
                          isGenerating && 'opacity-50 cursor-wait'
                        )}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            Analyze
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Error message */}
                  {generationError && (
                    <p className={cn(
                      'text-[10px] px-2 py-1 rounded',
                      isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-100 text-red-600'
                    )}>
                      {generationError}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export default ReflectionRating
