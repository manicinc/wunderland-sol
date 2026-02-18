/**
 * WizardTour Component
 * @module codex/help/WizardTour
 *
 * @description
 * Interactive first-time user walkthrough with spotlight highlighting.
 * Features:
 * - Non-blocking spotlight (no overlay)
 * - Syncs with wizard step changes
 * - "Don't show again" persistence
 * - Keyboard navigation (Escape to dismiss)
 */

'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WizardTourStep } from './HelpContent'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface WizardTourProps {
  /** Whether tour is active */
  isActive: boolean
  /** Current tour step */
  currentStep: WizardTourStep | null
  /** Current step index */
  stepIndex: number
  /** Total steps */
  totalSteps: number
  /** Go to next step */
  onNext: () => void
  /** Go to previous step */
  onPrev: () => void
  /** Dismiss tour */
  onDismiss: (dontShowAgain?: boolean) => void
  /** Dark mode */
  isDark?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   POSITION CALCULATION
═══════════════════════════════════════════════════════════════════════════ */

interface TooltipPosition {
  top: number
  left: number
  arrowPosition: 'top' | 'bottom' | 'left' | 'right'
}

function calculateTooltipPosition(
  targetRect: DOMRect,
  position: 'top' | 'bottom' | 'left' | 'right' | 'center' = 'bottom',
  tooltipWidth = 320,
  tooltipHeight = 200
): TooltipPosition {
  const padding = 12
  const arrowSize = 8
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let top = 0
  let left = 0
  let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = 'top'

  switch (position) {
    case 'top':
      top = targetRect.top - tooltipHeight - arrowSize - padding
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
      arrowPosition = 'bottom'
      break
    case 'bottom':
      top = targetRect.bottom + arrowSize + padding
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
      arrowPosition = 'top'
      break
    case 'left':
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
      left = targetRect.left - tooltipWidth - arrowSize - padding
      arrowPosition = 'right'
      break
    case 'right':
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
      left = targetRect.right + arrowSize + padding
      arrowPosition = 'left'
      break
    case 'center':
      top = viewportHeight / 2 - tooltipHeight / 2
      left = viewportWidth / 2 - tooltipWidth / 2
      arrowPosition = 'top' // No arrow for center
      break
  }

  // Keep tooltip within viewport
  if (left < padding) left = padding
  if (left + tooltipWidth > viewportWidth - padding) {
    left = viewportWidth - tooltipWidth - padding
  }
  if (top < padding) top = padding
  if (top + tooltipHeight > viewportHeight - padding) {
    top = viewportHeight - tooltipHeight - padding
  }

  return { top, left, arrowPosition }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SPOTLIGHT
═══════════════════════════════════════════════════════════════════════════ */

function Spotlight({ targetRect }: { targetRect: DOMRect | null }) {
  if (!targetRect) return null

  const padding = 8

  return (
    <div
      className="fixed pointer-events-none z-[9998] transition-all duration-300 ease-out"
      style={{
        top: targetRect.top - padding,
        left: targetRect.left - padding,
        width: targetRect.width + padding * 2,
        height: targetRect.height + padding * 2,
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
        borderRadius: 8,
      }}
    />
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function WizardTour({
  isActive,
  currentStep,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onDismiss,
  isDark = false,
}: WizardTourProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
    top: 0,
    left: 0,
    arrowPosition: 'top',
  })
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Find and observe target element
  useEffect(() => {
    if (!isActive || !currentStep) {
      setTargetRect(null)
      return
    }

    const findTarget = () => {
      const target = document.querySelector(currentStep.target)
      if (target) {
        const rect = target.getBoundingClientRect()
        setTargetRect(rect)

        // Calculate tooltip position
        const pos = calculateTooltipPosition(
          rect,
          currentStep.position,
          320,
          200
        )
        setTooltipPosition(pos)

        // Scroll target into view
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        setTargetRect(null)
      }
    }

    // Initial find
    findTarget()

    // Re-find on window resize
    const handleResize = () => findTarget()
    window.addEventListener('resize', handleResize)

    // Observer for DOM changes
    const observer = new MutationObserver(findTarget)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.removeEventListener('resize', handleResize)
      observer.disconnect()
    }
  }, [isActive, currentStep])

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss(dontShowAgain)
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        onNext()
      } else if (e.key === 'ArrowLeft') {
        onPrev()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, onDismiss, onNext, onPrev, dontShowAgain])

  // Call step onShow callback
  useEffect(() => {
    if (isActive && currentStep?.onShow) {
      currentStep.onShow()
    }
  }, [isActive, currentStep])

  const handleDismiss = useCallback(() => {
    onDismiss(dontShowAgain)
  }, [onDismiss, dontShowAgain])

  const handleNext = useCallback(() => {
    if (currentStep?.onComplete) {
      currentStep.onComplete()
    }
    onNext()
  }, [currentStep, onNext])

  if (!isActive || !currentStep) return null

  return (
    <>
      {/* Spotlight */}
      <Spotlight targetRect={targetRect} />

      {/* Tooltip */}
      <AnimatePresence>
        <motion.div
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'fixed z-[9999] w-80 p-4 rounded-xl shadow-2xl border',
            isDark
              ? 'bg-zinc-900 border-zinc-700 text-zinc-100'
              : 'bg-white border-zinc-200 text-zinc-900'
          )}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            className={cn(
              'absolute top-3 right-3 p-1 rounded-lg transition-colors',
              isDark
                ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
            )}
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="pr-6">
            <h3 className="font-semibold mb-2">{currentStep.title}</h3>
            <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
              {currentStep.description}
            </p>
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between">
            {/* Progress */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    i === stepIndex
                      ? 'bg-cyan-500'
                      : i < stepIndex
                        ? 'bg-cyan-400/50'
                        : isDark
                          ? 'bg-zinc-700'
                          : 'bg-zinc-300'
                  )}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={onPrev}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    isDark
                      ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                      : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 transition-colors"
              >
                {stepIndex === totalSteps - 1
                  ? currentStep.actionText || 'Finish'
                  : currentStep.actionText || 'Next'}
              </button>
            </div>
          </div>

          {/* Don't show again */}
          {stepIndex === 0 && (
            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-600"
                />
                <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                  Don't show this again
                </span>
              </label>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  )
}

export { WizardTour }
