/**
 * Setup Wizard Component
 * Main container for the onboarding setup wizard
 * @module quarry/ui/setup/SetupWizard
 */

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Target,
  FolderTree,
  Download,
  Eye,
  Wand2,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
} from 'lucide-react'
import { SetupWizardProvider, useSetupWizard, STEP_ORDER } from './SetupWizardContext'
import GoalsStep from './steps/GoalsStep'
import OrganizationStep from './steps/OrganizationStep'
import IntegrationsStep from './steps/IntegrationsStep'
import PreviewStep from './steps/PreviewStep'
import GenerateStep from './steps/GenerateStep'
import type { WizardStep } from './types'

// ============================================================================
// STEP CONFIG
// ============================================================================

const STEP_CONFIG: Record<
  WizardStep,
  { title: string; description: string; icon: React.ElementType }
> = {
  goals: {
    title: 'Goals',
    description: 'What do you want to achieve?',
    icon: Target,
  },
  organization: {
    title: 'Organization',
    description: 'How do you like to organize?',
    icon: FolderTree,
  },
  integrations: {
    title: 'Import',
    description: 'Bring your existing notes',
    icon: Download,
  },
  preview: {
    title: 'Preview',
    description: 'Review your structure',
    icon: Eye,
  },
  generate: {
    title: 'Create',
    description: 'Build your workspace',
    icon: Wand2,
  },
}

// ============================================================================
// STEP INDICATOR
// ============================================================================

function StepIndicator() {
  const { state, goToStep, canProceed } = useSetupWizard()
  const currentIndex = STEP_ORDER.indexOf(state.currentStep)

  return (
    <div className="flex items-center justify-center gap-2 py-6">
      {STEP_ORDER.map((step, index) => {
        const config = STEP_CONFIG[step]
        const Icon = config.icon
        const isActive = step === state.currentStep
        const isCompleted = index < currentIndex
        const isAccessible = index <= currentIndex || (index === currentIndex + 1 && canProceed())

        return (
          <React.Fragment key={step}>
            {index > 0 && (
              <div
                className={`
                  h-0.5 w-8 transition-colors duration-300
                  ${isCompleted ? 'bg-cyan-500' : 'bg-zinc-200 dark:bg-zinc-700'}
                `}
              />
            )}
            <button
              onClick={() => isAccessible && goToStep(step)}
              disabled={!isAccessible}
              className={`
                relative flex items-center justify-center w-10 h-10 rounded-full
                transition-all duration-300
                ${
                  isActive
                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                    : isCompleted
                      ? 'bg-cyan-500/20 text-cyan-500'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                }
                ${isAccessible && !isActive ? 'hover:scale-110 cursor-pointer' : ''}
                ${!isAccessible ? 'cursor-not-allowed opacity-50' : ''}
              `}
              title={config.title}
            >
              {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
            </button>
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ============================================================================
// STEP HEADER
// ============================================================================

function StepHeader() {
  const { state } = useSetupWizard()
  const config = STEP_CONFIG[state.currentStep]
  const Icon = config.icon

  return (
    <div className="text-center mb-8">
      <motion.div
        key={state.currentStep}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 mb-4"
      >
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">
          Step {STEP_ORDER.indexOf(state.currentStep) + 1} of {STEP_ORDER.length}
        </span>
      </motion.div>
      <motion.h2
        key={`${state.currentStep}-title`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-zinc-900 dark:text-white mb-2"
      >
        {config.title}
      </motion.h2>
      <motion.p
        key={`${state.currentStep}-desc`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-zinc-600 dark:text-zinc-400"
      >
        {config.description}
      </motion.p>
    </div>
  )
}

// ============================================================================
// STEP CONTENT
// ============================================================================

function StepContent() {
  const { state } = useSetupWizard()

  const variants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  }

  return (
    <div className="min-h-[400px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={state.currentStep}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2 }}
        >
          {state.currentStep === 'goals' && <GoalsStep />}
          {state.currentStep === 'organization' && <OrganizationStep />}
          {state.currentStep === 'integrations' && <IntegrationsStep />}
          {state.currentStep === 'preview' && <PreviewStep />}
          {state.currentStep === 'generate' && <GenerateStep />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// NAVIGATION
// ============================================================================

function Navigation() {
  const { state, nextStep, prevStep, canProceed } = useSetupWizard()
  const currentIndex = STEP_ORDER.indexOf(state.currentStep)
  const isFirst = currentIndex === 0
  const isLast = currentIndex === STEP_ORDER.length - 1
  const isGenerating = state.currentStep === 'generate' && state.generationProgress.phase !== 'idle'

  return (
    <div className="flex items-center justify-between pt-6 border-t border-zinc-200 dark:border-zinc-700">
      <button
        onClick={prevStep}
        disabled={isFirst || isGenerating}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
          transition-colors
          ${
            isFirst || isGenerating
              ? 'opacity-50 cursor-not-allowed text-zinc-400'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }
        `}
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      {!isLast ? (
        <button
          onClick={nextStep}
          disabled={!canProceed()}
          className={`
            inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm
            transition-all
            ${
              canProceed()
                ? 'bg-cyan-500 text-white hover:bg-cyan-600 shadow-lg shadow-cyan-500/25'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
            }
          `}
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </button>
      ) : (
        state.generationProgress.phase === 'complete' && (
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/25"
          >
            <Check className="w-4 h-4" />
            Get Started
          </button>
        )
      )}
    </div>
  )
}

// ============================================================================
// MAIN WIZARD COMPONENT
// ============================================================================

function SetupWizardContent() {
  const { state } = useSetupWizard()

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-cyan-500/20 mb-4">
          <Sparkles className="w-4 h-4 text-cyan-500" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            AI-Powered Setup
          </span>
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
          Let&apos;s set up your workspace
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Tell us about your goals and we&apos;ll create a personalized structure
        </p>
      </div>

      {/* Progress */}
      <StepIndicator />

      {/* Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xl p-8">
        {/* Step Header */}
        <StepHeader />

        {/* Step Content */}
        <StepContent />

        {/* Navigation */}
        <Navigation />
      </div>

      {/* Loading Overlay */}
      {state.isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-2xl flex items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
            <span className="text-zinc-900 dark:text-white font-medium">Processing...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SetupWizard() {
  return (
    <SetupWizardProvider>
      <SetupWizardContent />
    </SetupWizardProvider>
  )
}
