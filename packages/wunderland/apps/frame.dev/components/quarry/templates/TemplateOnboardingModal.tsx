/**
 * Template Onboarding Modal
 * @module codex/templates/TemplateOnboardingModal
 *
 * @remarks
 * Shows a brief introduction to templates for first-time users.
 * Appears on first visit to template selector, can be dismissed permanently.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, FileText, Layers, Sparkles, PenTool,
  ArrowRight, Check, ChevronRight
} from 'lucide-react'

const ONBOARDING_STORAGE_KEY = 'quarry-template-onboarding-seen'

interface TemplateOnboardingModalProps {
  /** Whether to force show the modal (for settings/help) */
  forceShow?: boolean
  /** Callback when modal is closed */
  onClose?: () => void
}

const steps = [
  {
    icon: FileText,
    title: 'Start with Templates',
    description: 'Templates give your notes structure with pre-built form fields, validation, and beautiful formatting.',
    color: 'cyan',
  },
  {
    icon: Layers,
    title: 'Browse 50+ Templates',
    description: '8 categories from quick notes to research documentation. Each template includes smart fields that guide your writing.',
    color: 'purple',
  },
  {
    icon: PenTool,
    title: 'Create Your Own',
    description: 'Build custom templates with 16 field types, validation rules, and conditional display. Share with the community.',
    color: 'emerald',
  },
]

export default function TemplateOnboardingModal({
  forceShow = false,
  onClose,
}: TemplateOnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  // Check if user has seen onboarding
  useEffect(() => {
    if (forceShow) {
      setIsOpen(true)
      return
    }

    const hasSeen = localStorage.getItem(ONBOARDING_STORAGE_KEY)
    if (!hasSeen) {
      setIsOpen(true)
    }
  }, [forceShow])

  const handleClose = () => {
    if (dontShowAgain || currentStep === steps.length - 1) {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    }
    setIsOpen(false)
    onClose?.()
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    cyan: {
      bg: 'bg-cyan-100 dark:bg-cyan-900/30',
      text: 'text-cyan-700 dark:text-cyan-300',
      border: 'border-cyan-200 dark:border-cyan-800',
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
    },
    emerald: {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
  }

  if (!isOpen) return null

  const step = steps[currentStep]
  const StepIcon = step.icon
  const colors = colorClasses[step.color]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Sparkles className="w-4 h-4" />
              Welcome to Templates
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Step indicator */}
            <div className="flex justify-center gap-2 mb-6">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentStep
                      ? 'bg-cyan-500'
                      : i < currentStep
                      ? 'bg-cyan-300'
                      : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                />
              ))}
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                <div className={`inline-flex p-4 rounded-2xl mb-4 ${colors.bg}`}>
                  <StepIcon className={`w-8 h-8 ${colors.text}`} />
                </div>

                <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200 mb-2">
                  {step.title}
                </h3>

                <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto">
                  {step.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              {/* Don't show again checkbox */}
              <label className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="rounded border-zinc-300"
                />
                Don&apos;t show again
              </label>

              {/* Next/Done button */}
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors"
              >
                {currentStep < steps.length - 1 ? (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Got it
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Hook to check if onboarding has been seen
 */
export function useTemplateOnboarding() {
  const [hasSeen, setHasSeen] = useState(true)

  useEffect(() => {
    const seen = localStorage.getItem(ONBOARDING_STORAGE_KEY)
    setHasSeen(!!seen)
  }, [])

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY)
    setHasSeen(false)
  }

  return { hasSeen, resetOnboarding }
}
