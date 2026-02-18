/**
 * Prompt Guided Tour Component
 * @module codex/ui/PromptGuidedTour
 *
 * First-time user guide for the prompt writing experience.
 * Shows contextual tips when starting from a blank prompt.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Lightbulb,
  Keyboard,
  Clock,
  ChevronRight,
  CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PromptGuidedTourProps {
  /** Theme */
  theme?: 'light' | 'dark'
  /** Prompt text for context */
  promptText?: string
  /** Close handler */
  onClose: () => void
  /** "Don't show again" handler */
  onDismissPermanently?: () => void
}

const TOUR_STORAGE_KEY = 'codex-prompt-tour-dismissed'

interface TourStep {
  icon: React.ReactNode
  title: string
  content: string
}

const TOUR_STEPS: TourStep[] = [
  {
    icon: <Lightbulb className="w-5 h-5 text-amber-400" />,
    title: 'Just Start Writing',
    content:
      "There's no right or wrong way. Let your thoughts flow freely. You can always edit later.",
  },
  {
    icon: <Clock className="w-5 h-5 text-blue-400" />,
    title: 'Set a Timer',
    content:
      'Try writing for just 5-10 minutes. Short focused sessions often produce the best insights.',
  },
  {
    icon: <Keyboard className="w-5 h-5 text-green-400" />,
    title: 'Quick Tips',
    content:
      'Press Cmd/Ctrl + S to save. Use # for headers, ** for bold, and - for lists.',
  },
]

/**
 * Check if tour should be shown
 */
export function shouldShowTour(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(TOUR_STORAGE_KEY) !== 'true'
}

/**
 * Mark tour as dismissed
 */
export function dismissTour(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOUR_STORAGE_KEY, 'true')
}

export function PromptGuidedTour({
  theme = 'dark',
  promptText,
  onClose,
  onDismissPermanently,
}: PromptGuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const isDark = theme.includes('dark')
  const step = TOUR_STEPS[currentStep]
  const isLastStep = currentStep === TOUR_STEPS.length - 1

  const handleNext = () => {
    if (isLastStep) {
      handleClose()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const handleDismissPermanently = () => {
    dismissTour()
    onDismissPermanently?.()
    handleClose()
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-80 rounded-xl shadow-2xl overflow-hidden',
          isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'px-4 py-3 flex items-center justify-between border-b',
            isDark ? 'border-zinc-800' : 'border-zinc-200'
          )}
        >
          <div className="flex items-center gap-2">
            {step.icon}
            <span
              className={cn(
                'text-sm font-medium',
                isDark ? 'text-white' : 'text-zinc-900'
              )}
            >
              {step.title}
            </span>
          </div>
          <button
            onClick={handleClose}
            className={cn(
              'p-1 rounded-md transition-colors',
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          <p
            className={cn(
              'text-sm leading-relaxed',
              isDark ? 'text-zinc-300' : 'text-zinc-600'
            )}
          >
            {step.content}
          </p>
        </div>

        {/* Footer */}
        <div
          className={cn(
            'px-4 py-3 border-t flex items-center justify-between',
            isDark ? 'border-zinc-800' : 'border-zinc-200'
          )}
        >
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-colors',
                  i === currentStep
                    ? 'bg-blue-500'
                    : i < currentStep
                      ? 'bg-green-500'
                      : isDark
                        ? 'bg-zinc-700'
                        : 'bg-zinc-300'
                )}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDismissPermanently}
              className={cn(
                'text-xs px-2 py-1 rounded transition-colors',
                isDark
                  ? 'text-zinc-500 hover:text-zinc-300'
                  : 'text-zinc-400 hover:text-zinc-600'
              )}
            >
              Don't show again
            </button>
            <motion.button
              onClick={handleNext}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isDark
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLastStep ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Got it!
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default PromptGuidedTour
