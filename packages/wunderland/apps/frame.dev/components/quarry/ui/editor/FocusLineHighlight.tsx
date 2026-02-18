/**
 * FocusLineHighlight - iA Writer-style focus line highlighting
 * @module components/quarry/ui/FocusLineHighlight
 *
 * Dims text outside the current paragraph/sentence to create
 * a focused writing experience.
 */

'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface FocusLineHighlightProps {
  /** Full content text */
  content: string
  /** Current cursor position in text */
  cursorPosition: number
  /** Whether focus mode is enabled */
  enabled?: boolean
  /** Focus mode: highlight paragraph or sentence */
  mode?: 'paragraph' | 'sentence'
  /** Dark theme */
  isDark?: boolean
  /** Dim opacity for non-focused text (0-1) */
  dimOpacity?: number
}

/**
 * Find the paragraph boundaries containing the cursor
 */
function findCurrentParagraph(
  content: string,
  cursorPosition: number
): { start: number; end: number } | null {
  if (!content) return null

  // Find paragraph start (previous double newline or start of text)
  let start = cursorPosition
  while (start > 0) {
    if (content[start - 1] === '\n' && (start < 2 || content[start - 2] === '\n')) {
      break
    }
    start--
  }

  // Find paragraph end (next double newline or end of text)
  let end = cursorPosition
  while (end < content.length) {
    if (content[end] === '\n' && (end + 1 >= content.length || content[end + 1] === '\n')) {
      break
    }
    end++
  }

  return { start, end }
}

/**
 * Find the sentence boundaries containing the cursor
 */
function findCurrentSentence(
  content: string,
  cursorPosition: number
): { start: number; end: number } | null {
  if (!content) return null

  const sentenceEnders = /[.!?]/

  // Find sentence start
  let start = cursorPosition
  while (start > 0) {
    if (sentenceEnders.test(content[start - 1]) && content[start] === ' ') {
      break
    }
    if (content[start - 1] === '\n') {
      break
    }
    start--
  }

  // Find sentence end
  let end = cursorPosition
  while (end < content.length) {
    if (sentenceEnders.test(content[end])) {
      end++ // Include the punctuation
      break
    }
    if (content[end] === '\n') {
      break
    }
    end++
  }

  return { start, end }
}

/**
 * Calculate line number from character position
 */
function getLineFromPosition(content: string, position: number): number {
  return content.slice(0, position).split('\n').length
}

/**
 * FocusLineHighlight component
 *
 * This creates an overlay that dims text outside the current focus area.
 * It's designed to work with a textarea by rendering transparent text
 * with selective opacity.
 */
export default function FocusLineHighlight({
  content,
  cursorPosition,
  enabled = true,
  mode = 'paragraph',
  isDark = true,
  dimOpacity = 0.35,
}: FocusLineHighlightProps) {
  // Calculate focus boundaries
  const focusBounds = useMemo(() => {
    if (!enabled || !content) return null

    return mode === 'paragraph'
      ? findCurrentParagraph(content, cursorPosition)
      : findCurrentSentence(content, cursorPosition)
  }, [content, cursorPosition, enabled, mode])

  // Split content into segments (before, focused, after)
  const segments = useMemo(() => {
    if (!focusBounds || !content) {
      return [{ text: content, focused: true }]
    }

    const { start, end } = focusBounds
    const segments: { text: string; focused: boolean }[] = []

    if (start > 0) {
      segments.push({ text: content.slice(0, start), focused: false })
    }

    segments.push({ text: content.slice(start, end), focused: true })

    if (end < content.length) {
      segments.push({ text: content.slice(end), focused: false })
    }

    return segments
  }, [content, focusBounds])

  if (!enabled) return null

  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none overflow-hidden',
        'whitespace-pre-wrap break-words'
      )}
      aria-hidden="true"
    >
      <div className="w-full max-w-3xl mx-auto px-8 py-16">
        <div className="font-mono text-xl leading-loose">
          {segments.map((segment, index) => (
            <motion.span
              key={index}
              initial={false}
              animate={{
                opacity: segment.focused ? 1 : dimOpacity,
              }}
              transition={{
                duration: 0.2,
                ease: 'easeOut',
              }}
              className={cn(
                'transition-colors',
                isDark ? 'text-zinc-200' : 'text-zinc-800'
              )}
              style={{
                color: 'transparent', // Text is invisible - we just control opacity
              }}
            >
              {segment.text}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to get focus line state
 */
export function useFocusLine(content: string, cursorPosition: number, mode: 'paragraph' | 'sentence' = 'paragraph') {
  return useMemo(() => {
    const bounds = mode === 'paragraph'
      ? findCurrentParagraph(content, cursorPosition)
      : findCurrentSentence(content, cursorPosition)

    if (!bounds) {
      return {
        currentLine: 0,
        focusStart: 0,
        focusEnd: content.length,
        focusedText: content,
      }
    }

    return {
      currentLine: getLineFromPosition(content, cursorPosition),
      focusStart: bounds.start,
      focusEnd: bounds.end,
      focusedText: content.slice(bounds.start, bounds.end),
    }
  }, [content, cursorPosition, mode])
}

/**
 * CSS-only focus line using CSS custom properties
 * This is more performant for simple use cases
 */
export function FocusLineCSSVars({
  content,
  cursorPosition,
  mode = 'paragraph',
}: {
  content: string
  cursorPosition: number
  mode?: 'paragraph' | 'sentence'
}) {
  const { focusStart, focusEnd } = useFocusLine(content, cursorPosition, mode)

  // Calculate percentage positions for CSS gradient
  const startPercent = content.length > 0 ? (focusStart / content.length) * 100 : 0
  const endPercent = content.length > 0 ? (focusEnd / content.length) * 100 : 100

  return {
    '--focus-start': `${startPercent}%`,
    '--focus-end': `${endPercent}%`,
  } as React.CSSProperties
}
