/**
 * RichTooltip Component
 * @module codex/help/RichTooltip
 *
 * @description
 * Enhanced tooltip with structured content including:
 * - Description text
 * - Usage examples
 * - Caution/warning text
 * - Documentation link
 * - Mobile tap-to-show support
 */

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, ExternalLink, AlertTriangle, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RichTooltipContent } from './HelpContent'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface RichTooltipProps {
  /** Tooltip content */
  content: RichTooltipContent
  /** Position relative to trigger */
  position?: 'top' | 'bottom' | 'left' | 'right'
  /** Dark mode */
  isDark?: boolean
  /** Custom trigger element */
  children?: React.ReactNode
  /** Whether to show on tap (mobile) vs hover */
  tapToShow?: boolean
  /** Additional classes for trigger */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   POSITION STYLES
═══════════════════════════════════════════════════════════════════════════ */

const positionStyles: Record<string, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

const arrowStyles: Record<string, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-current border-x-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-current border-x-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-current border-y-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-current border-y-transparent border-l-transparent',
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function RichTooltip({
  content,
  position = 'top',
  isDark = false,
  children,
  tapToShow = false,
  className,
}: RichTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [])

  // Close on click outside (for tap mode)
  useEffect(() => {
    if (!tapToShow || !isVisible) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsVisible(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [tapToShow, isVisible])

  // Hover handlers
  const handleMouseEnter = useCallback(() => {
    if (tapToShow) return
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    setIsVisible(true)
  }, [tapToShow])

  const handleMouseLeave = useCallback(() => {
    if (tapToShow) return
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false)
    }, 100)
  }, [tapToShow])

  // Tap/click handler
  const handleClick = useCallback(() => {
    if (!tapToShow) return
    setIsVisible((v) => !v)
  }, [tapToShow])

  const hasExamples = content.examples && content.examples.length > 0
  const hasCaution = !!content.caution
  const hasDocLink = !!content.docLink

  return (
    <div className="relative inline-flex">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'p-0.5 rounded transition-colors cursor-help',
          isDark
            ? 'text-zinc-400 hover:text-zinc-200'
            : 'text-zinc-400 hover:text-zinc-600',
          className
        )}
        aria-label="Show help"
      >
        {children || <HelpCircle className="w-3.5 h-3.5" />}
      </button>

      {/* Tooltip */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={cn(
              'absolute z-50 w-64 p-3 rounded-lg shadow-lg border text-sm',
              positionStyles[position],
              isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                : 'bg-white border-zinc-200 text-zinc-700'
            )}
          >
            {/* Arrow */}
            <div
              className={cn(
                'absolute w-0 h-0 border-4',
                arrowStyles[position],
                isDark ? 'text-zinc-800' : 'text-white'
              )}
            />

            {/* Description */}
            <p className="leading-relaxed">{content.description}</p>

            {/* Examples */}
            {hasExamples && (
              <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-1 text-xs font-medium text-cyan-600 dark:text-cyan-400 mb-1">
                  <Lightbulb className="w-3 h-3" />
                  Examples
                </div>
                <ul className="space-y-0.5">
                  {content.examples!.map((example, i) => (
                    <li key={i} className="text-xs text-zinc-500 dark:text-zinc-400">
                      • {example}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Caution */}
            {hasCaution && (
              <div
                className={cn(
                  'mt-2 p-2 rounded text-xs',
                  isDark
                    ? 'bg-amber-900/30 text-amber-300'
                    : 'bg-amber-50 text-amber-700'
                )}
              >
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{content.caution}</span>
                </div>
              </div>
            )}

            {/* Doc Link */}
            {hasDocLink && (
              <a
                href={content.docLink}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'mt-2 flex items-center gap-1 text-xs font-medium',
                  isDark
                    ? 'text-cyan-400 hover:text-cyan-300'
                    : 'text-cyan-600 hover:text-cyan-700'
                )}
              >
                Learn more
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { RichTooltip }
