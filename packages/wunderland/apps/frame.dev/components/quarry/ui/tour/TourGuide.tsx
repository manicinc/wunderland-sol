/**
 * TourGuide - Interactive guided tour component
 * @module codex/ui/tour/TourGuide
 *
 * Displays step-by-step tour overlays with spotlight effects,
 * tooltips, and progress tracking.
 */

'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  SkipForward,
  Sparkles,
  HelpCircle,
} from 'lucide-react'
import type { TourStep, TourDefinition } from './useTour'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface TourGuideProps {
  /** Whether the tour is active */
  isActive: boolean
  /** Current step data */
  currentStep: TourStep | null
  /** Current step index (0-based) */
  currentStepIndex: number
  /** Total number of steps */
  totalSteps: number
  /** Progress percentage (0-100) */
  progress: number
  /** Current tour info */
  currentTour: TourDefinition | null
  /** Callbacks */
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  onComplete: () => void
  onGoToStep: (index: number) => void
  /** Theme */
  isDark?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   SPOTLIGHT OVERLAY
═══════════════════════════════════════════════════════════════════════════ */

interface SpotlightOverlayProps {
  targetSelector?: string
  isDark: boolean
  onClick?: () => void
}

function SpotlightOverlay({ targetSelector, isDark, onClick }: SpotlightOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (!targetSelector) {
      setTargetRect(null)
      return
    }

    const updateRect = () => {
      const element = document.querySelector(targetSelector)
      if (element) {
        setTargetRect(element.getBoundingClientRect())
      }
    }

    updateRect()

    // Update on resize/scroll
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)

    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [targetSelector])

  const padding = 8

  return (
    <div
      className="fixed inset-0 z-[9998] pointer-events-auto"
      onClick={onClick}
    >
      {/* Dark overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)'}
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Spotlight border glow */}
      {targetRect && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute rounded-lg pointer-events-none"
          style={{
            left: targetRect.left - padding,
            top: targetRect.top - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.6), 0 0 40px rgba(16, 185, 129, 0.3)',
          }}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOOLTIP
═══════════════════════════════════════════════════════════════════════════ */

interface TooltipProps {
  step: TourStep
  stepIndex: number
  totalSteps: number
  progress: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  onComplete: () => void
  isDark: boolean
}

function Tooltip({
  step,
  stepIndex,
  totalSteps,
  progress,
  onNext,
  onPrev,
  onSkip,
  onComplete,
  isDark,
}: TooltipProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const tooltipRef = useRef<HTMLDivElement>(null)

  const isLast = stepIndex === totalSteps - 1
  const isFirst = stepIndex === 0

  useEffect(() => {
    const calculatePosition = () => {
      if (!step.target) {
        // Center on screen
        setPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        })
        return
      }

      const element = document.querySelector(step.target)
      if (!element) {
        setPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        })
        return
      }

      const rect = element.getBoundingClientRect()
      const tooltipWidth = 400
      const tooltipHeight = 250
      const padding = 16

      let x = 0
      let y = 0

      switch (step.placement) {
        case 'top':
          x = rect.left + rect.width / 2
          y = rect.top - tooltipHeight - padding
          break
        case 'bottom':
          x = rect.left + rect.width / 2
          y = rect.bottom + padding
          break
        case 'left':
          x = rect.left - tooltipWidth - padding
          y = rect.top + rect.height / 2
          break
        case 'right':
          x = rect.right + padding
          y = rect.top + rect.height / 2
          break
        default: // center
          x = window.innerWidth / 2
          y = window.innerHeight / 2
      }

      // Keep tooltip in viewport
      x = Math.max(padding, Math.min(x, window.innerWidth - tooltipWidth - padding))
      y = Math.max(padding, Math.min(y, window.innerHeight - tooltipHeight - padding))

      setPosition({ x, y })
    }

    calculatePosition()
    window.addEventListener('resize', calculatePosition)
    return () => window.removeEventListener('resize', calculatePosition)
  }, [step])

  return (
    <motion.div
      ref={tooltipRef}
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ duration: 0.2 }}
      className="fixed z-[9999] w-[400px] max-w-[calc(100vw-32px)] rounded-2xl shadow-2xl overflow-hidden"
      style={{
        left: step.placement === 'center' ? '50%' : position.x,
        top: step.placement === 'center' ? '50%' : position.y,
        transform: step.placement === 'center' ? 'translate(-50%, -50%)' : 'none',
        backgroundColor: isDark ? '#1f1f23' : '#ffffff',
        border: `1px solid ${isDark ? '#3f3f46' : '#e5e7eb'}`,
      }}
    >
      {/* Progress bar */}
      <div
        className="h-1"
        style={{ backgroundColor: isDark ? '#27272a' : '#f3f4f6' }}
      >
        <motion.div
          className="h-full bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <span
            className="text-sm font-medium"
            style={{ color: isDark ? '#a1a1aa' : '#6b7280' }}
          >
            Step {stepIndex + 1} of {totalSteps}
          </span>
        </div>
        <button
          onClick={onSkip}
          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
          title="Skip tour"
        >
          <X
            className="w-4 h-4"
            style={{ color: isDark ? '#71717a' : '#9ca3af' }}
          />
        </button>
      </div>

      {/* Content */}
      <div className="px-5 py-3">
        <h3
          className="text-lg font-semibold mb-2"
          style={{ color: isDark ? '#f4f4f5' : '#18181b' }}
        >
          {step.title}
        </h3>
        <p
          className="text-sm leading-relaxed"
          style={{ color: isDark ? '#a1a1aa' : '#6b7280' }}
        >
          {step.content}
        </p>

        {/* Optional image */}
        {step.image && (
          <div className="mt-3 rounded-lg overflow-hidden">
            <img
              src={step.image}
              alt={step.title}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Optional action */}
        {step.action && (
          <button
            onClick={step.action.onClick}
            className="mt-3 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {step.action.label}
          </button>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-5 py-4 border-t"
        style={{ borderColor: isDark ? '#27272a' : '#f3f4f6' }}
      >
        {/* Step dots */}
        <div className="flex items-center gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <button
              key={i}
              onClick={() => {}}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === stepIndex
                  ? 'bg-emerald-500'
                  : i < stepIndex
                    ? 'bg-emerald-300'
                    : isDark
                      ? 'bg-zinc-600'
                      : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          {/* Skip button */}
          <button
            onClick={onSkip}
            className="px-3 py-1.5 text-sm rounded-lg transition-colors"
            style={{
              color: isDark ? '#a1a1aa' : '#6b7280',
            }}
          >
            Skip
          </button>

          {/* Prev button */}
          {!isFirst && (
            <button
              onClick={onPrev}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: isDark ? '#27272a' : '#f3f4f6',
                color: isDark ? '#e4e4e7' : '#374151',
              }}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {/* Next/Complete button */}
          <button
            onClick={isLast ? onComplete : onNext}
            className="flex items-center gap-1 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isLast ? (
              <>
                Done
                <Check className="w-4 h-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function TourGuide({
  isActive,
  currentStep,
  currentStepIndex,
  totalSteps,
  progress,
  currentTour,
  onNext,
  onPrev,
  onSkip,
  onComplete,
  onGoToStep,
  isDark = false,
}: TourGuideProps) {
  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault()
          if (currentStepIndex < totalSteps - 1) {
            onNext()
          } else {
            onComplete()
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (currentStepIndex > 0) {
            onPrev()
          }
          break
        case 'Escape':
          e.preventDefault()
          onSkip()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive, currentStepIndex, totalSteps, onNext, onPrev, onSkip, onComplete])

  // Scroll target into view
  useEffect(() => {
    if (!isActive || !currentStep?.target) return

    const element = document.querySelector(currentStep.target)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isActive, currentStep])

  return (
    <AnimatePresence>
      {isActive && currentStep && (
        <>
          {/* Spotlight overlay */}
          {currentStep.spotlight !== false && (
            <SpotlightOverlay
              targetSelector={currentStep.target}
              isDark={isDark}
            />
          )}

          {/* Tooltip */}
          <Tooltip
            step={currentStep}
            stepIndex={currentStepIndex}
            totalSteps={totalSteps}
            progress={progress}
            onNext={onNext}
            onPrev={onPrev}
            onSkip={onSkip}
            onComplete={onComplete}
            isDark={isDark}
          />
        </>
      )}
    </AnimatePresence>
  )
}

export default TourGuide
