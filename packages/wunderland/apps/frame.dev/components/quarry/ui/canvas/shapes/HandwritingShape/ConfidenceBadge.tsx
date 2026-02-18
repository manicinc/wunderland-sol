/**
 * Confidence Badge Component
 * @module codex/ui/canvas/shapes/HandwritingShape/ConfidenceBadge
 *
 * Displays OCR confidence score with color-coded indicator
 * Includes word-level confidence highlighting and alternatives
 */

import React, { useState, useMemo, memo } from 'react'
import { CheckCircle, AlertTriangle, XCircle, HelpCircle, ChevronDown } from 'lucide-react'

/**
 * Word-level confidence data
 */
export interface WordConfidence {
  word: string
  confidence: number
  alternatives?: string[]
  startIndex: number
  endIndex: number
}

export interface ConfidenceBadgeProps {
  /**
   * Confidence score (0-1)
   */
  value: number
  /**
   * Size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Show animated indicator during processing
   * @default false
   */
  isProcessing?: boolean
}

/**
 * Get confidence level and color based on score
 */
function getConfidenceLevel(confidence: number): {
  level: 'high' | 'medium' | 'low'
  label: string
  color: string
  bgColor: string
} {
  if (confidence >= 0.85) {
    return {
      level: 'high',
      label: 'High',
      color: 'text-emerald-700 dark:text-emerald-300',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
    }
  }

  if (confidence >= 0.60) {
    return {
      level: 'medium',
      label: 'Medium',
      color: 'text-amber-700 dark:text-amber-300',
      bgColor: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
    }
  }

  return {
    level: 'low',
    label: 'Low',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800',
  }
}

/**
 * Get appropriate icon based on confidence level
 */
function getConfidenceIcon(level: 'high' | 'medium' | 'low', className: string) {
  switch (level) {
    case 'high':
      return <CheckCircle className={className} />
    case 'medium':
      return <AlertTriangle className={className} />
    case 'low':
      return <XCircle className={className} />
  }
}

/**
 * Confidence Badge Component
 *
 * Displays OCR confidence score with color coding:
 * - Green (≥85%): High confidence
 * - Yellow (60-84%): Medium confidence
 * - Red (<60%): Low confidence
 */
export function ConfidenceBadge({ value, size = 'md', isProcessing = false }: ConfidenceBadgeProps) {
  const percentage = Math.round(value * 100)
  const { level, label, color, bgColor } = getConfidenceLevel(value)

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-sm px-2 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  if (isProcessing) {
    return (
      <span
        className={`inline-flex items-center rounded-full border font-medium ${sizeClasses[size]} text-slate-500 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700`}
      >
        <span className={`${iconSizes[size]} animate-spin`}>
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="32"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span>Analyzing...</span>
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses[size]} ${color} ${bgColor}`}
      title={`${percentage}% confidence (${label.toLowerCase()})`}
      role="status"
      aria-label={`OCR confidence: ${percentage}% (${label.toLowerCase()})`}
    >
      {getConfidenceIcon(level, iconSizes[size])}
      <span>{percentage}%</span>
      <span className="font-normal opacity-75">{label}</span>
    </span>
  )
}

/**
 * Word-level confidence text display props
 */
export interface ConfidenceTextProps {
  /**
   * The full transcribed text
   */
  text: string
  /**
   * Word-level confidence data
   */
  wordConfidences: WordConfidence[]
  /**
   * Callback when a word is clicked (for showing alternatives)
   */
  onWordClick?: (word: WordConfidence) => void
  /**
   * Size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Get underline color class based on confidence
 */
function getUnderlineColor(confidence: number): string {
  if (confidence >= 0.85) {
    return 'decoration-emerald-500'
  }
  if (confidence >= 0.60) {
    return 'decoration-amber-500'
  }
  return 'decoration-red-500'
}

/**
 * Confidence Text Component
 *
 * Displays transcribed text with word-level confidence indicators:
 * - Green underline: High confidence (≥85%)
 * - Yellow underline: Medium confidence (60-84%)
 * - Red underline: Low confidence (<60%)
 *
 * Click on low-confidence words to see alternatives.
 */
export const ConfidenceText = memo(function ConfidenceText({
  text,
  wordConfidences,
  onWordClick,
  size = 'md',
}: ConfidenceTextProps) {
  const [hoveredWord, setHoveredWord] = useState<number | null>(null)

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  // Build segments from word confidences
  const segments = useMemo(() => {
    const result: Array<{
      text: string
      type: 'word' | 'space'
      confidence?: number
      wordData?: WordConfidence
      index?: number
    }> = []

    let lastEnd = 0
    wordConfidences.forEach((wc, idx) => {
      // Add any text between last word and this word
      if (wc.startIndex > lastEnd) {
        result.push({
          text: text.slice(lastEnd, wc.startIndex),
          type: 'space',
        })
      }

      // Add the word
      result.push({
        text: wc.word,
        type: 'word',
        confidence: wc.confidence,
        wordData: wc,
        index: idx,
      })

      lastEnd = wc.endIndex
    })

    // Add any remaining text
    if (lastEnd < text.length) {
      result.push({
        text: text.slice(lastEnd),
        type: 'space',
      })
    }

    return result
  }, [text, wordConfidences])

  if (wordConfidences.length === 0) {
    return <span className={sizeClasses[size]}>{text}</span>
  }

  return (
    <span className={`${sizeClasses[size]} leading-relaxed`}>
      {segments.map((segment, idx) => {
        if (segment.type === 'space') {
          return <span key={idx}>{segment.text}</span>
        }

        const isLowConfidence = (segment.confidence ?? 1) < 0.60
        const hasAlternatives = (segment.wordData?.alternatives?.length ?? 0) > 0
        const isHovered = hoveredWord === segment.index
        const underlineColor = getUnderlineColor(segment.confidence ?? 1)

        return (
          <span
            key={idx}
            className={`
              underline underline-offset-4 decoration-2 ${underlineColor}
              ${isLowConfidence && hasAlternatives ? 'cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 rounded px-0.5 -mx-0.5' : ''}
              transition-colors duration-150
            `}
            onMouseEnter={() => setHoveredWord(segment.index ?? null)}
            onMouseLeave={() => setHoveredWord(null)}
            onClick={() => {
              if (isLowConfidence && segment.wordData) {
                onWordClick?.(segment.wordData)
              }
            }}
            title={
              segment.confidence !== undefined
                ? `${Math.round(segment.confidence * 100)}% confidence${
                    hasAlternatives
                      ? ` - Click to see alternatives: ${segment.wordData?.alternatives?.join(', ')}`
                      : ''
                  }`
                : undefined
            }
          >
            {segment.text}
            {isHovered && hasAlternatives && (
              <HelpCircle className="inline w-3 h-3 ml-0.5 opacity-60" />
            )}
          </span>
        )
      })}
    </span>
  )
})

/**
 * Confidence alternatives dropdown props
 */
export interface ConfidenceAlternativesProps {
  word: WordConfidence
  onSelect: (alternative: string) => void
  onDismiss: () => void
}

/**
 * Confidence Alternatives Dropdown
 *
 * Shows alternative suggestions for low-confidence words
 */
export function ConfidenceAlternatives({
  word,
  onSelect,
  onDismiss,
}: ConfidenceAlternativesProps) {
  if (!word.alternatives || word.alternatives.length === 0) {
    return null
  }

  return (
    <div className="absolute z-50 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[120px]">
      <div className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
        Did you mean?
      </div>
      {word.alternatives.map((alt, idx) => (
        <button
          key={idx}
          className="w-full px-3 py-1.5 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          onClick={() => {
            onSelect(alt)
            onDismiss()
          }}
        >
          {alt}
        </button>
      ))}
      <button
        className="w-full px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 text-left hover:bg-slate-100 dark:hover:bg-slate-700 border-t border-slate-100 dark:border-slate-700"
        onClick={onDismiss}
      >
        Keep "{word.word}"
      </button>
    </div>
  )
}

/**
 * Confidence progress bar props
 */
export interface ConfidenceProgressProps {
  /**
   * Confidence value (0-1)
   */
  value: number
  /**
   * Show percentage label
   * @default true
   */
  showLabel?: boolean
  /**
   * Height variant
   * @default 'md'
   */
  height?: 'sm' | 'md' | 'lg'
}

/**
 * Confidence Progress Bar
 *
 * Visual progress bar showing confidence level with gradient colors
 */
export function ConfidenceProgress({
  value,
  showLabel = true,
  height = 'md',
}: ConfidenceProgressProps) {
  const percentage = Math.round(value * 100)
  const { color } = getConfidenceLevel(value)

  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  // Determine bar color based on value
  let barColor = 'bg-red-500'
  if (value >= 0.85) {
    barColor = 'bg-emerald-500'
  } else if (value >= 0.60) {
    barColor = 'bg-amber-500'
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex-1 ${heightClasses[height]} bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden`}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`OCR confidence: ${percentage}%`}
      >
        <div
          className={`${heightClasses[height]} ${barColor} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className={`text-xs font-medium min-w-[3ch] text-right ${color}`}>
          {percentage}%
        </span>
      )}
    </div>
  )
}
