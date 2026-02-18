/**
 * Learning Studio Tooltips
 * @module components/quarry/ui/learning/LearningTooltips
 * 
 * @description
 * Rich tooltips for Learning Studio features explaining:
 * - FSRS ratings (Again/Hard/Good/Easy)
 * - Quiz difficulty levels
 * - Spaced repetition concepts
 * - Keyboard shortcuts
 * 
 * @example
 * ```tsx
 * <FSRSRatingTooltip rating="good">
 *   <RatingButton>Good</RatingButton>
 * </FSRSRatingTooltip>
 * ```
 */

'use client'

import React from 'react'
import { Tooltip } from '@/components/quarry/ui/common/Tooltip'
import { HelpCircle, Zap, Clock, Target, Brain, Keyboard, Star, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// FSRS RATING TOOLTIPS
// ============================================================================

interface FSRSRatingTooltipProps {
  rating: 'again' | 'hard' | 'good' | 'easy'
  children: React.ReactNode
  interval?: string
}

const RATING_INFO = {
  again: {
    content: 'Again',
    shortcut: '1',
    description: "You didn't remember this card. It will be shown again soon.",
    effect: 'Resets the card and schedules for relearning.',
  },
  hard: {
    content: 'Hard',
    shortcut: '2',
    description: 'You remembered with significant difficulty.',
    effect: 'Slightly increases the interval, but less than Good.',
  },
  good: {
    content: 'Good',
    shortcut: '3',
    description: 'You remembered correctly with some effort.',
    effect: 'Normal interval increase based on your memory strength.',
  },
  easy: {
    content: 'Easy',
    shortcut: '4',
    description: 'You remembered instantly without effort.',
    effect: 'Significantly increases the interval.',
  },
}

export function FSRSRatingTooltip({ rating, children, interval }: FSRSRatingTooltipProps) {
  const info = RATING_INFO[rating]

  return (
    <Tooltip
      content={info.content}
      shortcut={info.shortcut}
      description={`${info.description}\n\n${info.effect}${interval ? `\n\nNext review: ${interval}` : ''}`}
      placement="top"
    >
      {children}
    </Tooltip>
  )
}

// ============================================================================
// QUIZ DIFFICULTY TOOLTIP
// ============================================================================

interface QuizDifficultyTooltipProps {
  difficulty: 'easy' | 'medium' | 'hard'
  children: React.ReactNode
}

const DIFFICULTY_INFO = {
  easy: {
    content: 'Easy',
    description: 'Basic recall question. Tests fundamental concepts.',
    example: 'What is React? → A JavaScript library',
  },
  medium: {
    content: 'Medium',
    description: 'Requires understanding relationships between concepts.',
    example: 'How does useState differ from useReducer?',
  },
  hard: {
    content: 'Hard',
    description: 'Tests deep understanding and application.',
    example: 'When would you choose Context over Redux?',
  },
}

export function QuizDifficultyTooltip({ difficulty, children }: QuizDifficultyTooltipProps) {
  const info = DIFFICULTY_INFO[difficulty]

  return (
    <Tooltip
      content={info.content}
      description={info.description}
      example={info.example}
      placement="top"
    >
      {children}
    </Tooltip>
  )
}

// ============================================================================
// SPACED REPETITION HELP
// ============================================================================

interface SpacedRepetitionHelpProps {
  isDark?: boolean
  className?: string
}

export function SpacedRepetitionHelp({ isDark, className }: SpacedRepetitionHelpProps) {
  return (
    <Tooltip
      content="How Spaced Repetition Works"
      description={`The FSRS algorithm optimizes your review schedule based on:
      
• Stability: How well you remember this card
• Difficulty: How hard this card is for you
• Retrievability: Probability of recall

Rate honestly for best results!`}
      placement="bottom"
      clickable
      interactive
    >
      <button
        type="button"
        className={cn(
          'p-1.5 rounded-lg transition-colors',
          isDark
            ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700',
          className
        )}
        aria-label="Learn about spaced repetition"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
    </Tooltip>
  )
}

// ============================================================================
// KEYBOARD SHORTCUTS TOOLTIP
// ============================================================================

interface KeyboardShortcutsTooltipProps {
  context: 'flashcards' | 'quiz' | 'glossary'
  children: React.ReactNode
}

const SHORTCUTS = {
  flashcards: [
    { key: 'Space', action: 'Flip card' },
    { key: '1', action: 'Rate: Again' },
    { key: '2', action: 'Rate: Hard' },
    { key: '3', action: 'Rate: Good' },
    { key: '4', action: 'Rate: Easy' },
    { key: '←', action: 'Previous card' },
    { key: '→', action: 'Next card' },
    { key: 'E', action: 'Edit card' },
  ],
  quiz: [
    { key: '1-4', action: 'Select option' },
    { key: 'Enter', action: 'Submit answer' },
    { key: 'Space', action: 'Next question' },
    { key: 'H', action: 'Show hint' },
    { key: 'S', action: 'Skip question' },
  ],
  glossary: [
    { key: '/', action: 'Search terms' },
    { key: 'Enter', action: 'View definition' },
    { key: 'E', action: 'Edit term' },
    { key: 'N', action: 'New term' },
  ],
}

export function KeyboardShortcutsTooltip({ context, children }: KeyboardShortcutsTooltipProps) {
  const shortcuts = SHORTCUTS[context]
  const shortcutList = shortcuts.map(s => `${s.key}: ${s.action}`).join('\n')

  return (
    <Tooltip
      content="Keyboard Shortcuts"
      description={shortcutList}
      placement="bottom"
      clickable
      interactive
    >
      {children}
    </Tooltip>
  )
}

// ============================================================================
// FEATURE INFO BADGES
// ============================================================================

interface FeatureInfoProps {
  feature: 'llm' | 'offline' | 'cached' | 'rag' | 'fsrs'
  isDark?: boolean
}

const FEATURE_INFO = {
  llm: {
    icon: Zap,
    label: 'LLM Enhanced',
    description: 'This content was generated using AI for higher quality.',
    color: 'text-amber-500',
  },
  offline: {
    icon: Clock,
    label: 'Offline Mode',
    description: 'Using local NLP. Some features may be limited.',
    color: 'text-zinc-500',
  },
  cached: {
    icon: Target,
    label: 'From Cache',
    description: 'Loaded from local storage. Regenerate for fresh content.',
    color: 'text-cyan-500',
  },
  rag: {
    icon: Brain,
    label: 'RAG Enhanced',
    description: 'Uses your knowledge base for contextual answers.',
    color: 'text-purple-500',
  },
  fsrs: {
    icon: TrendingUp,
    label: 'FSRS Algorithm',
    description: 'Optimized spaced repetition for maximum retention.',
    color: 'text-green-500',
  },
}

export function FeatureInfoBadge({ feature, isDark }: FeatureInfoProps) {
  const info = FEATURE_INFO[feature]
  const Icon = info.icon

  return (
    <Tooltip
      content={info.label}
      description={info.description}
      placement="top"
    >
      <span className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        isDark ? 'bg-zinc-800' : 'bg-zinc-100',
        info.color
      )}>
        <Icon className="w-3 h-3" />
        {info.label}
      </span>
    </Tooltip>
  )
}

// ============================================================================
// CONFIDENCE INDICATOR
// ============================================================================

interface ConfidenceTooltipProps {
  confidence: number
  children: React.ReactNode
}

export function ConfidenceTooltip({ confidence, children }: ConfidenceTooltipProps) {
  const percentage = Math.round(confidence * 100)
  let description = ''

  if (confidence >= 0.9) {
    description = 'High confidence. This is likely accurate.'
  } else if (confidence >= 0.7) {
    description = 'Good confidence. Consider verifying important details.'
  } else if (confidence >= 0.5) {
    description = 'Medium confidence. Review for accuracy.'
  } else {
    description = 'Low confidence. Manual review recommended.'
  }

  return (
    <Tooltip
      content={`${percentage}% Confidence`}
      description={description}
      placement="top"
    >
      {children}
    </Tooltip>
  )
}

// ============================================================================
// STUDY STREAK TOOLTIP
// ============================================================================

interface StreakTooltipProps {
  streak: number
  lastStudied?: Date
  children: React.ReactNode
}

export function StreakTooltip({ streak, lastStudied, children }: StreakTooltipProps) {
  const streakEmoji = streak >= 7 ? '🔥' : streak >= 3 ? '⭐' : '📚'
  const lastStudiedText = lastStudied
    ? `Last studied: ${lastStudied.toLocaleDateString()}`
    : 'Start your streak today!'

  return (
    <Tooltip
      content={`${streakEmoji} ${streak} Day Streak`}
      description={`${lastStudiedText}\n\nStudy every day to maintain your streak and maximize retention!`}
      placement="bottom"
    >
      {children}
    </Tooltip>
  )
}

// ============================================================================
// EXPORT
// ============================================================================

export const LearningTooltips = {
  FSRSRating: FSRSRatingTooltip,
  QuizDifficulty: QuizDifficultyTooltip,
  SpacedRepetitionHelp,
  KeyboardShortcuts: KeyboardShortcutsTooltip,
  FeatureInfo: FeatureInfoBadge,
  Confidence: ConfidenceTooltip,
  Streak: StreakTooltip,
}

export default LearningTooltips

