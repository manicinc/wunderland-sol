'use client'

/**
 * Compact Rating Badge with Click-to-Open Popover
 * @module codex/ui/RatingBadgePopover
 * 
 * A sleek, compact rating badge that shows overall score.
 * Click to open a popover with full rating details.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Target,
  CheckCircle,
  Eye,
  BookOpen,
  Layers,
  X,
  AlertCircle,
} from 'lucide-react'
import { useStrandRatings, type LocalLLMStrandRating } from '../../hooks/useStrandRatings'
import { generateStrandRating, type RatingInput } from '@/lib/rating'
import type { RatingDimension } from '@/types/openstrand'
import type { ThemeName } from '@/types/theme'

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function getScoreColor(score: number): string {
  if (score >= 8) return 'text-emerald-400'
  if (score >= 6) return 'text-cyan-400'
  if (score >= 4) return 'text-amber-400'
  return 'text-rose-400'
}

function getScoreGradient(score: number): string {
  if (score >= 8) return 'from-emerald-500 to-emerald-400'
  if (score >= 6) return 'from-cyan-500 to-cyan-400'
  if (score >= 4) return 'from-amber-500 to-amber-400'
  return 'from-rose-500 to-rose-400'
}

function getScoreLabel(score: number): string {
  if (score >= 9) return 'Excellent'
  if (score >= 7) return 'Good'
  if (score >= 5) return 'Fair'
  if (score >= 3) return 'Needs Work'
  return 'Poor'
}

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
  completeness: 'Complete',
  accuracy: 'Accuracy',
  clarity: 'Clarity',
  relevance: 'Relevant',
  depth: 'Depth',
}

function getDimensionScores(rating: LocalLLMStrandRating): Array<{ dimension: RatingDimension; score: number }> {
  const scores: Array<{ dimension: RatingDimension; score: number }> = []
  if (rating.qualityScore != null) scores.push({ dimension: 'quality', score: rating.qualityScore })
  if (rating.completenessScore != null) scores.push({ dimension: 'completeness', score: rating.completenessScore })
  if (rating.accuracyScore != null) scores.push({ dimension: 'accuracy', score: rating.accuracyScore })
  if (rating.clarityScore != null) scores.push({ dimension: 'clarity', score: rating.clarityScore })
  if (rating.relevanceScore != null) scores.push({ dimension: 'relevance', score: rating.relevanceScore })
  if (rating.depthScore != null) scores.push({ dimension: 'depth', score: rating.depthScore })
  return scores
}

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface RatingBadgePopoverProps {
  strandId: string
  strandPath: string
  strandTitle: string
  content: string
  metadata?: Record<string, unknown>
  theme?: ThemeName
  size?: 'sm' | 'md'
  showUserRating?: boolean
  editable?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function RatingBadgePopover({
  strandId,
  strandPath,
  strandTitle,
  content,
  metadata,
  theme = 'dark',
  size = 'sm',
  showUserRating = true,
  editable = true,
}: RatingBadgePopoverProps) {
  const isDark = theme.includes('dark')
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  
  const {
    userRating,
    llmRating,
    isLoading,
    setUserRating,
    saveLLMRating,
  } = useStrandRatings(strandId, strandPath)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        popoverRef.current?.contains(e.target as Node)
      ) return
      setIsOpen(false)
    }
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])
  
  // Generate LLM rating
  const handleGenerateRating = useCallback(async () => {
    if (!editable) return
    setIsGenerating(true)
    setGenError(null)
    
    try {
      const input: RatingInput = {
        strandId,
        strandPath,
        strandTitle,
        content,
        metadata: metadata as Record<string, unknown>,
      }
      
      const result = await generateStrandRating(input, { forceRegenerate: true })
      if (result.rating) {
        await saveLLMRating(result.rating)
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setIsGenerating(false)
    }
  }, [strandId, strandPath, strandTitle, content, metadata, editable, saveLLMRating])
  
  // Quick user rating (1-10)
  const handleQuickRate = useCallback(async (rating: number) => {
    if (!editable) return
    await setUserRating(rating)
  }, [editable, setUserRating])
  
  // Calculate position for popover
  const getPopoverPosition = useCallback(() => {
    if (!triggerRef.current) return { top: 0, left: 0 }
    const rect = triggerRef.current.getBoundingClientRect()
    return {
      top: rect.bottom + 8,
      left: Math.max(8, rect.left - 120 + rect.width / 2), // Center under badge, with edge padding
    }
  }, [])
  
  const hasRating = !!llmRating || !!userRating
  const displayScore = llmRating?.overallScore ?? userRating?.rating ?? 0
  const dimensionScores = llmRating ? getDimensionScores(llmRating) : []
  
  const badgeSizeClasses = size === 'sm' 
    ? 'px-1.5 py-0.5 text-[10px] gap-1' 
    : 'px-2 py-1 text-xs gap-1.5'
  
  return (
    <>
      {/* Badge Trigger */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center rounded-md font-semibold transition-all
          ${badgeSizeClasses}
          ${hasRating
            ? isDark
              ? 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700'
              : 'bg-zinc-100 hover:bg-zinc-200 border border-zinc-200'
            : isDark
              ? 'bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-500'
              : 'bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/50 text-zinc-400'
          }
        `}
        title={hasRating ? `Rating: ${displayScore.toFixed(1)}/10` : 'Click to rate'}
      >
        {isLoading ? (
          <RefreshCw className="w-3 h-3 animate-spin" />
        ) : (
          <>
            {llmRating ? (
              <Sparkles className={`w-3 h-3 ${hasRating ? 'text-violet-400' : ''}`} />
            ) : (
              <Star className={`w-3 h-3 ${hasRating ? 'text-amber-400' : ''}`} />
            )}
            <span className={hasRating ? getScoreColor(displayScore) : ''}>
              {hasRating ? displayScore.toFixed(1) : '—'}
            </span>
          </>
        )}
      </button>
      
      {/* Popover Portal */}
      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed',
                ...getPopoverPosition(),
                zIndex: 99999,
              }}
              className={`
                w-72 rounded-xl shadow-2xl overflow-hidden
                ${isDark 
                  ? 'bg-zinc-900 border border-zinc-700' 
                  : 'bg-white border border-zinc-200'
                }
              `}
            >
              {/* Header */}
              <div className={`
                px-3 py-2 border-b flex items-center justify-between
                ${isDark ? 'border-zinc-800 bg-zinc-800/50' : 'border-zinc-100 bg-zinc-50'}
              `}>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                    Rating
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-1 rounded-md ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}`}
                >
                  <X className="w-3.5 h-3.5 text-zinc-500" />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-3 space-y-3">
                {/* Overall Score */}
                {hasRating && (
                  <div className={`
                    flex items-center justify-between p-2 rounded-lg
                    ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}
                  `}>
                    <div>
                      <p className={`text-[10px] uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Overall
                      </p>
                      <p className={`text-xs font-medium ${getScoreColor(displayScore)}`}>
                        {getScoreLabel(displayScore)}
                      </p>
                    </div>
                    <div className={`text-2xl font-black ${getScoreColor(displayScore)}`}>
                      {displayScore.toFixed(1)}
                    </div>
                  </div>
                )}
                
                {/* Dimension Scores (compact) */}
                {dimensionScores.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {dimensionScores.map(({ dimension, score }) => {
                      const Icon = DIMENSION_ICONS[dimension]
                      return (
                        <div
                          key={dimension}
                          className={`
                            flex flex-col items-center p-1.5 rounded-md
                            ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}
                          `}
                          title={dimension}
                        >
                          <Icon className={`w-3 h-3 ${getScoreColor(score)}`} />
                          <span className={`text-[9px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {DIMENSION_LABELS[dimension]}
                          </span>
                          <span className={`text-xs font-bold ${getScoreColor(score)}`}>
                            {score.toFixed(1)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
                
                {/* User Quick Rating */}
                {showUserRating && editable && (
                  <div>
                    <p className={`text-[10px] mb-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      Your Rating
                    </p>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <button
                          key={n}
                          onClick={() => handleQuickRate(n)}
                          className={`
                            flex-1 py-1 text-[10px] font-bold rounded transition-all
                            ${(userRating?.rating ?? 0) >= n
                              ? 'bg-amber-500 text-white'
                              : isDark
                                ? 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                                : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                            }
                          `}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Generate AI Rating */}
                {editable && (
                  <button
                    onClick={handleGenerateRating}
                    disabled={isGenerating}
                    className={`
                      w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold
                      transition-all
                      ${isGenerating
                        ? 'opacity-60 cursor-wait'
                        : isDark
                          ? 'bg-violet-600 hover:bg-violet-500 text-white'
                          : 'bg-violet-600 hover:bg-violet-500 text-white'
                      }
                    `}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                    {llmRating ? 'Re-analyze with AI' : 'Analyze with AI'}
                  </button>
                )}
                
                {/* Error */}
                {genError && (
                  <div className="flex items-center gap-1.5 text-[10px] text-rose-400">
                    <AlertCircle className="w-3 h-3" />
                    {genError}
                  </div>
                )}
                
                {/* Empty state */}
                {!hasRating && !isGenerating && (
                  <div className={`text-center py-2 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    No rating yet. Click analyze or rate manually.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

export default RatingBadgePopover

