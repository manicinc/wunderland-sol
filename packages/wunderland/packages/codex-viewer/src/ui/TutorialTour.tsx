/**
 * Interactive tutorial tour system for Codex viewer
 * @module codex/ui/TutorialTour
 * 
 * @remarks
 * - Step-by-step guided tours
 * - Highlights UI elements with tooltips
 * - Keyboard navigation (next/prev/skip)
 * - Progress tracking in localStorage
 * - Multiple tours: Getting Started, Advanced Search, Contributing
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ArrowLeft, CheckCircle, HelpCircle } from 'lucide-react'

export interface TutorialStep {
  /** Unique step ID */
  id: string
  /** Step title */
  title: string
  /** Step description */
  description: string
  /** CSS selector for element to highlight */
  target: string
  /** Position of tooltip relative to target */
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** Optional action to perform before showing step */
  action?: () => void
}

export interface TutorialTourProps {
  /** Unique tour ID */
  tourId: string
  /** Tour title */
  title: string
  /** Array of tutorial steps */
  steps: TutorialStep[]
  /** Whether tour is active */
  isActive: boolean
  /** Callback when tour is completed */
  onComplete: () => void
  /** Callback when tour is skipped */
  onSkip: () => void
}

/**
 * Interactive tutorial tour with step highlighting
 * 
 * @example
 * ```tsx
 * const steps = [
 *   {
 *     id: 'search',
 *     title: 'Search',
 *     description: 'Use the search bar to find content',
 *     target: '#codex-search-input',
 *     placement: 'bottom'
 *   }
 * ]
 * 
 * <TutorialTour
 *   tourId="getting-started"
 *   title="Getting Started"
 *   steps={steps}
 *   isActive={tourActive}
 *   onComplete={() => setTourActive(false)}
 *   onSkip={() => setTourActive(false)}
 * />
 * ```
 */
export default function TutorialTour({
  tourId,
  title,
  steps,
  isActive,
  onComplete,
  onSkip,
}: TutorialTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const rafRef = useRef<number>()

  const step = steps[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1

  // Update target element position
  useEffect(() => {
    if (!isActive || !step) return

    const updatePosition = () => {
      const element = document.querySelector(step.target)
      if (element) {
        const rect = element.getBoundingClientRect()
        setTargetRect(rect)
        // Execute step action if provided
        step.action?.()
      }
      rafRef.current = requestAnimationFrame(updatePosition)
    }

    updatePosition()

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isActive, step])

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip()
      } else if (e.key === 'ArrowRight' && !isLast) {
        handleNext()
      } else if (e.key === 'ArrowLeft' && !isFirst) {
        handlePrev()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, currentStep, isFirst, isLast, onSkip])

  const handleNext = () => {
    if (isLast) {
      onComplete()
      // Mark tour as completed
      localStorage.setItem(`tutorial-${tourId}-completed`, 'true')
    } else {
      setCurrentStep((s) => s + 1)
    }
  }

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep((s) => s - 1)
    }
  }

  if (!isActive || !targetRect) return null

  const placement = step.placement || 'bottom'
  let tooltipStyle: React.CSSProperties = {}

  // Position tooltip relative to target
  switch (placement) {
    case 'top':
      tooltipStyle = {
        left: targetRect.left + targetRect.width / 2,
        top: targetRect.top - 20,
        transform: 'translate(-50%, -100%)',
      }
      break
    case 'bottom':
      tooltipStyle = {
        left: targetRect.left + targetRect.width / 2,
        top: targetRect.bottom + 20,
        transform: 'translateX(-50%)',
      }
      break
    case 'left':
      tooltipStyle = {
        left: targetRect.left - 20,
        top: targetRect.top + targetRect.height / 2,
        transform: 'translate(-100%, -50%)',
      }
      break
    case 'right':
      tooltipStyle = {
        left: targetRect.right + 20,
        top: targetRect.top + targetRect.height / 2,
        transform: 'translateY(-50%)',
      }
      break
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[80]" onClick={onSkip} />

      {/* Highlight cutout */}
      <div
        className="fixed z-[85] pointer-events-none"
        style={{
          left: targetRect.left - 4,
          top: targetRect.top - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          border: '3px solid #06B6D4',
          borderRadius: '8px',
        }}
      />

      {/* Tooltip */}
      <AnimatePresence>
        <motion.div
          key={step.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed z-[90] w-80 max-w-[90vw]"
          style={tooltipStyle}
        >
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border-2 border-cyan-600 dark:border-cyan-400 overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold">{title}</h3>
                <button
                  onClick={onSkip}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Skip tutorial (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>
                  Step {currentStep + 1} of {steps.length}
                </span>
                <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all"
                    style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {step.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">{step.description}</p>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
              <button
                onClick={onSkip}
                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Skip Tutorial
              </button>
              <div className="flex items-center gap-2">
                {!isFirst && (
                  <button
                    onClick={handlePrev}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Previous (←)"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white rounded-lg transition-colors"
                  title={isLast ? 'Complete' : 'Next (→)'}
                >
                  {isLast ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Complete</span>
                    </>
                  ) : (
                    <>
                      <span>Next</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  )
}

/**
 * Check if a tutorial has been completed
 * @param tourId - Unique tour ID
 * @returns true if completed
 */
export function isTutorialCompleted(tourId: string): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(`tutorial-${tourId}-completed`) === 'true'
}

/**
 * Reset a tutorial's completion status
 * @param tourId - Unique tour ID
 */
export function resetTutorial(tourId: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(`tutorial-${tourId}-completed`)
}

/**
 * Reset all tutorials
 */
export function resetAllTutorials(): void {
  if (typeof window === 'undefined') return
  const keys = Object.keys(localStorage)
  keys.forEach((key) => {
    if (key.startsWith('tutorial-') && key.endsWith('-completed')) {
      localStorage.removeItem(key)
    }
  })
}

