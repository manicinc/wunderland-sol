'use client'

/**
 * Streaming Text Display Component
 *
 * Displays text that streams in with typing animation.
 * Features:
 * - Smooth character-by-character reveal
 * - Optional cursor animation
 * - Markdown rendering support
 * - Loading/error states
 * - Abort button
 *
 * @module codex/ui/StreamingText
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, StopCircle, AlertCircle, Copy, Check, RotateCcw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface StreamingTextProps {
  /** Text content (streaming or complete) */
  text: string
  /** Whether currently streaming */
  isStreaming: boolean
  /** Error message if any */
  error?: string | null
  /** Whether to render as markdown */
  markdown?: boolean
  /** Show cursor during streaming */
  showCursor?: boolean
  /** Typing speed in ms per character (0 = instant) */
  typingSpeed?: number
  /** Called when abort button clicked */
  onAbort?: () => void
  /** Called when retry button clicked */
  onRetry?: () => void
  /** Additional className */
  className?: string
  /** Theme */
  theme?: 'light' | 'dark'
  /** Show copy button when complete */
  showCopy?: boolean
  /** Placeholder shown before text arrives */
  placeholder?: string
  /** Usage stats to display */
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  } | null
}

/* ═══════════════════════════════════════════════════════════════════════════
   CURSOR COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

function BlinkingCursor({ isDark }: { isDark: boolean }) {
  return (
    <motion.span
      className={`inline-block w-2 h-5 ml-0.5 rounded-sm ${
        isDark ? 'bg-emerald-400' : 'bg-emerald-600'
      }`}
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
    />
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING INDICATOR
═══════════════════════════════════════════════════════════════════════════ */

function LoadingDots({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex items-center gap-1.5 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`w-2 h-2 rounded-full ${isDark ? 'bg-zinc-500' : 'bg-zinc-400'}`}
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROGRESS BAR
═══════════════════════════════════════════════════════════════════════════ */

function StreamingProgress({ isDark, tokens }: { isDark: boolean; tokens?: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
      {tokens !== undefined && (
        <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {tokens} tokens
        </span>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function StreamingText({
  text,
  isStreaming,
  error,
  markdown = true,
  showCursor = true,
  typingSpeed = 0,
  onAbort,
  onRetry,
  className = '',
  theme = 'dark',
  showCopy = true,
  placeholder = 'Generating...',
  usage,
}: StreamingTextProps) {
  const isDark = theme === 'dark'
  const [copied, setCopied] = useState(false)
  const [displayedText, setDisplayedText] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle typing animation
  useEffect(() => {
    if (typingSpeed === 0 || !isStreaming) {
      setDisplayedText(text)
      return
    }

    // Typing effect for new characters
    if (text.length > displayedText.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length + 1))
      }, typingSpeed)
      return () => clearTimeout(timeout)
    }
  }, [text, displayedText, typingSpeed, isStreaming])

  // Reset displayed text when text resets
  useEffect(() => {
    if (text === '' || text.length < displayedText.length) {
      setDisplayedText(text)
    }
  }, [text])

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [displayedText, isStreaming])

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [text])

  // Actual text to show
  const visibleText = typingSpeed > 0 ? displayedText : text

  // Render content
  const content = useMemo(() => {
    if (error) {
      return (
        <div className={`flex items-start gap-3 p-4 rounded-lg ${
          isDark ? 'bg-red-900/20 border border-red-800/50' : 'bg-red-50 border border-red-200'
        }`}>
          <AlertCircle className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>
              Error
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-red-400/80' : 'text-red-600'}`}>
              {error}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className={`mt-3 flex items-center gap-1.5 text-sm font-medium ${
                  isDark ? 'text-red-300 hover:text-red-200' : 'text-red-600 hover:text-red-700'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                Retry
              </button>
            )}
          </div>
        </div>
      )
    }

    if (!visibleText && isStreaming) {
      return (
        <div className="space-y-3 py-2">
          <LoadingDots isDark={isDark} />
          <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {placeholder}
          </p>
        </div>
      )
    }

    if (!visibleText) {
      return null
    }

    if (markdown) {
      return (
        <div className={`prose prose-sm max-w-none ${isDark ? 'prose-invert' : ''}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {visibleText}
          </ReactMarkdown>
          {isStreaming && showCursor && <BlinkingCursor isDark={isDark} />}
        </div>
      )
    }

    return (
      <div className="whitespace-pre-wrap">
        {visibleText}
        {isStreaming && showCursor && <BlinkingCursor isDark={isDark} />}
      </div>
    )
  }, [visibleText, isStreaming, error, isDark, markdown, showCursor, placeholder, onRetry])

  return (
    <div className={`relative ${className}`}>
      {/* Main content */}
      <div
        ref={containerRef}
        className={`overflow-auto ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}
      >
        {content}
      </div>

      {/* Footer with controls */}
      <AnimatePresence>
        {(isStreaming || (text && showCopy)) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`flex items-center justify-between mt-4 pt-3 border-t ${
              isDark ? 'border-zinc-700' : 'border-zinc-200'
            }`}
          >
            {/* Left side - streaming status */}
            <div className="flex items-center gap-3">
              {isStreaming ? (
                <>
                  <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Streaming...
                  </span>
                </>
              ) : usage ? (
                <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {usage.totalTokens.toLocaleString()} tokens ({usage.promptTokens.toLocaleString()} in, {usage.completionTokens.toLocaleString()} out)
                </span>
              ) : null}
            </div>

            {/* Right side - actions */}
            <div className="flex items-center gap-2">
              {isStreaming && onAbort && (
                <button
                  onClick={onAbort}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    isDark
                      ? 'text-red-400 hover:bg-red-900/30'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  Stop
                </button>
              )}

              {!isStreaming && showCopy && text && (
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    isDark
                      ? 'text-zinc-400 hover:bg-zinc-700/50'
                      : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPACT VARIANT
═══════════════════════════════════════════════════════════════════════════ */

export function StreamingTextCompact({
  text,
  isStreaming,
  error,
  className = '',
  theme = 'dark',
}: Pick<StreamingTextProps, 'text' | 'isStreaming' | 'error' | 'className' | 'theme'>) {
  const isDark = theme === 'dark'

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-red-400' : 'text-red-600'} ${className}`}>
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    )
  }

  if (isStreaming && !text) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
        <span className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Generating...
        </span>
      </div>
    )
  }

  return (
    <div className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'} ${className}`}>
      {text}
      {isStreaming && (
        <motion.span
          className={`inline-block w-1.5 h-4 ml-0.5 rounded-sm ${isDark ? 'bg-emerald-400' : 'bg-emerald-600'}`}
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   INLINE STREAMING INDICATOR
═══════════════════════════════════════════════════════════════════════════ */

export function StreamingIndicator({
  isStreaming,
  tokens,
  className = '',
  theme = 'dark',
}: {
  isStreaming: boolean
  tokens?: number
  className?: string
  theme?: 'light' | 'dark'
}) {
  const isDark = theme === 'dark'

  if (!isStreaming) return null

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative w-4 h-4">
        <motion.div
          className={`absolute inset-0 rounded-full ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-500/10'}`}
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <div className={`absolute inset-1 rounded-full ${isDark ? 'bg-emerald-500' : 'bg-emerald-600'}`} />
      </div>
      <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        {tokens ? `${tokens} tokens` : 'Streaming...'}
      </span>
    </div>
  )
}
