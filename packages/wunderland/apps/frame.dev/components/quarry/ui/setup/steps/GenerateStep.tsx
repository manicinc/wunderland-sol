/**
 * Generate Step
 * Create the proposed structure with progress indication
 * @module quarry/ui/setup/steps/GenerateStep
 */

'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  Check,
  AlertCircle,
  FolderOpen,
  FileText,
  Tags,
  Download,
  Sparkles,
  PartyPopper,
  ArrowRight,
  RotateCcw,
} from 'lucide-react'
import { useSetupWizard } from '../SetupWizardContext'
import type { GenerationProgress } from '../types'

// ============================================================================
// PHASE CONFIGURATION
// ============================================================================

interface PhaseConfig {
  id: GenerationProgress['phase']
  label: string
  activeLabel: string
  icon: React.ElementType
  color: string
}

const PHASES: PhaseConfig[] = [
  {
    id: 'creating-weaves',
    label: 'Create Weaves',
    activeLabel: 'Creating weaves...',
    icon: FolderOpen,
    color: 'text-blue-500',
  },
  {
    id: 'creating-looms',
    label: 'Create Looms',
    activeLabel: 'Creating looms...',
    icon: FolderOpen,
    color: 'text-purple-500',
  },
  {
    id: 'creating-strands',
    label: 'Create Strands',
    activeLabel: 'Creating starter strands...',
    icon: FileText,
    color: 'text-green-500',
  },
  {
    id: 'processing-imports',
    label: 'Process Imports',
    activeLabel: 'Processing imported files...',
    icon: Download,
    color: 'text-orange-500',
  },
  {
    id: 'finalizing',
    label: 'Finalize',
    activeLabel: 'Applying templates...',
    icon: Tags,
    color: 'text-cyan-500',
  },
]

// ============================================================================
// PHASE INDICATOR
// ============================================================================

interface PhaseIndicatorProps {
  phase: PhaseConfig
  status: 'pending' | 'active' | 'completed' | 'error'
  currentItem?: string
}

function PhaseIndicator({ phase, status, currentItem }: PhaseIndicatorProps) {
  const Icon = phase.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`
        flex items-center gap-3 p-3 rounded-lg transition-colors
        ${
          status === 'active'
            ? 'bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30'
            : status === 'completed'
              ? 'bg-green-50 dark:bg-green-500/10'
              : status === 'error'
                ? 'bg-red-50 dark:bg-red-500/10'
                : 'bg-zinc-50 dark:bg-zinc-800/50'
        }
      `}
    >
      {/* Status Icon */}
      <div
        className={`
          w-8 h-8 rounded-full flex items-center justify-center
          ${
            status === 'active'
              ? 'bg-cyan-100 dark:bg-cyan-500/20'
              : status === 'completed'
                ? 'bg-green-100 dark:bg-green-500/20'
                : status === 'error'
                  ? 'bg-red-100 dark:bg-red-500/20'
                  : 'bg-zinc-100 dark:bg-zinc-700'
          }
        `}
      >
        {status === 'active' ? (
          <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
        ) : status === 'completed' ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : status === 'error' ? (
          <AlertCircle className="w-4 h-4 text-red-500" />
        ) : (
          <Icon className={`w-4 h-4 ${phase.color}`} />
        )}
      </div>

      {/* Label */}
      <div className="flex-1">
        <span
          className={`
            font-medium
            ${
              status === 'active'
                ? 'text-cyan-700 dark:text-cyan-300'
                : status === 'completed'
                  ? 'text-green-700 dark:text-green-300'
                  : status === 'error'
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-zinc-500 dark:text-zinc-400'
            }
          `}
        >
          {status === 'active' ? phase.activeLabel : phase.label}
        </span>
        {status === 'active' && currentItem && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
            {currentItem}
          </p>
        )}
      </div>

      {/* Completed indicator */}
      {status === 'completed' && (
        <Check className="w-5 h-5 text-green-500" />
      )}
    </motion.div>
  )
}

// ============================================================================
// PROGRESS BAR
// ============================================================================

interface ProgressBarProps {
  percentage: number
}

function ProgressBar({ percentage }: ProgressBarProps) {
  return (
    <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.3 }}
        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
      />
    </div>
  )
}

// ============================================================================
// COMPLETION CELEBRATION
// ============================================================================

function CompletionCelebration() {
  const { state } = useSetupWizard()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-8"
    >
      {/* Celebration Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-cyan-500 flex items-center justify-center"
      >
        <PartyPopper className="w-10 h-10 text-white" />
      </motion.div>

      {/* Message */}
      <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
        Your workspace is ready!
      </h3>
      <p className="text-zinc-600 dark:text-zinc-400 mb-6">
        We&apos;ve created your personalized knowledge base structure.
      </p>

      {/* Stats */}
      {state.generatedIds && (
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-cyan-500">
              {state.generatedIds.weaves.length}
            </div>
            <div className="text-sm text-zinc-500">Weaves</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-500">
              {state.generatedIds.looms.length}
            </div>
            <div className="text-sm text-zinc-500">Looms</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-500">
              {state.generatedIds.strands.length}
            </div>
            <div className="text-sm text-zinc-500">Strands</div>
          </div>
        </div>
      )}

      {/* Next Steps */}
      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
        <h4 className="font-medium text-zinc-900 dark:text-white mb-3 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-500" />
          What&apos;s next?
        </h4>
        <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-cyan-500" />
            <span>Explore your new weaves and looms</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-cyan-500" />
            <span>Create your first strand</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-cyan-500" />
            <span>Ask the AI copilot any questions</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// ERROR STATE
// ============================================================================

interface ErrorStateProps {
  error: string
  onRetry: () => void
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-8"
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
        Something went wrong
      </h3>
      <p className="text-zinc-600 dark:text-zinc-400 mb-6">{error}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
      >
        <RotateCcw className="w-4 h-4" />
        Try Again
      </button>
    </motion.div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GenerateStep() {
  const { state, setGenerationProgress, setGeneratedIds, prevStep } = useSetupWizard()
  const [hasStarted, setHasStarted] = useState(false)

  // Start generation
  useEffect(() => {
    if (hasStarted || state.generationProgress.phase === 'complete') return
    setHasStarted(true)
    runGeneration()
  }, [])

  const runGeneration = async () => {
    try {
      // Phase 1: Creating weaves
      setGenerationProgress({
        phase: 'creating-weaves',
        currentPhase: 1,
        percentage: 10,
      })

      const weaveIds: string[] = []
      if (state.proposedStructure) {
        for (let i = 0; i < state.proposedStructure.weaves.length; i++) {
          const weave = state.proposedStructure.weaves[i]
          setGenerationProgress({
            currentItem: `Creating weave: ${weave.name}`,
            percentage: 10 + (i / state.proposedStructure.weaves.length) * 15,
          })
          await simulateApiCall()
          weaveIds.push(`weave-${Date.now()}-${i}`)
        }
      }
      setGenerationProgress({ completedPhases: [1] })

      // Phase 2: Creating looms
      setGenerationProgress({
        phase: 'creating-looms',
        currentPhase: 2,
        percentage: 30,
      })

      const loomIds: string[] = []
      if (state.proposedStructure) {
        let loomCount = 0
        const totalLooms = state.proposedStructure.weaves.reduce(
          (sum, w) => sum + w.looms.length,
          0
        )
        for (const weave of state.proposedStructure.weaves) {
          for (const loom of weave.looms) {
            setGenerationProgress({
              currentItem: `Creating loom: ${loom.name}`,
              percentage: 30 + (loomCount / Math.max(totalLooms, 1)) * 20,
            })
            await simulateApiCall()
            loomIds.push(`loom-${Date.now()}-${loomCount}`)
            loomCount++
          }
        }
      }
      setGenerationProgress({ completedPhases: [1, 2] })

      // Phase 3: Creating strands
      setGenerationProgress({
        phase: 'creating-strands',
        currentPhase: 3,
        percentage: 55,
        currentItem: 'Creating starter strands...',
      })

      const strandIds: string[] = []
      if (state.organizationPreferences.createStarterStrands) {
        await simulateApiCall(800)
        strandIds.push(`strand-${Date.now()}-readme`)
      }
      if (state.organizationPreferences.includeReadme) {
        await simulateApiCall(500)
        strandIds.push(`strand-${Date.now()}-guide`)
      }
      setGenerationProgress({ completedPhases: [1, 2, 3], percentage: 70 })

      // Phase 4: Processing imports
      if (state.importedData.length > 0 || Object.keys(state.importConfigs).length > 0) {
        setGenerationProgress({
          phase: 'processing-imports',
          currentPhase: 4,
          percentage: 75,
          currentItem: 'Processing imported files...',
        })
        await simulateApiCall(1500)
        setGenerationProgress({ completedPhases: [1, 2, 3, 4], percentage: 85 })
      } else {
        setGenerationProgress({ completedPhases: [1, 2, 3, 4], percentage: 85 })
      }

      // Phase 5: Finalizing
      setGenerationProgress({
        phase: 'finalizing',
        currentPhase: 5,
        percentage: 90,
        currentItem: 'Applying templates and settings...',
      })
      await simulateApiCall(1000)

      // Complete
      setGenerationProgress({
        phase: 'complete',
        completedPhases: [1, 2, 3, 4, 5],
        percentage: 100,
      })

      setGeneratedIds({
        weaves: weaveIds,
        looms: loomIds,
        strands: strandIds,
      })
    } catch (err) {
      setGenerationProgress({
        phase: 'error',
        error: err instanceof Error ? err.message : 'An unexpected error occurred',
      })
    }
  }

  const simulateApiCall = (delay = 400) =>
    new Promise((resolve) => setTimeout(resolve, delay + Math.random() * 300))

  const handleRetry = () => {
    setGenerationProgress({
      phase: 'idle',
      currentPhase: 0,
      completedPhases: [],
      percentage: 0,
      error: undefined,
    })
    setHasStarted(false)
  }

  const getPhaseStatus = (
    phase: PhaseConfig
  ): 'pending' | 'active' | 'completed' | 'error' => {
    const phaseIndex = PHASES.findIndex((p) => p.id === phase.id)
    const currentPhaseIndex = PHASES.findIndex(
      (p) => p.id === state.generationProgress.phase
    )

    if (state.generationProgress.phase === 'error') {
      if (phaseIndex === currentPhaseIndex) return 'error'
      if (phaseIndex < currentPhaseIndex) return 'completed'
      return 'pending'
    }

    if (state.generationProgress.completedPhases.includes(phaseIndex + 1)) {
      return 'completed'
    }
    if (phase.id === state.generationProgress.phase) {
      return 'active'
    }
    return 'pending'
  }

  // Error state
  if (state.generationProgress.phase === 'error') {
    return (
      <ErrorState
        error={state.generationProgress.error || 'An error occurred'}
        onRetry={handleRetry}
      />
    )
  }

  // Complete state
  if (state.generationProgress.phase === 'complete') {
    return <CompletionCelebration />
  }

  // In progress
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
          Creating your workspace
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400">
          Please wait while we set up your personalized structure...
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">Progress</span>
          <span className="font-medium text-cyan-600 dark:text-cyan-400">
            {Math.round(state.generationProgress.percentage)}%
          </span>
        </div>
        <ProgressBar percentage={state.generationProgress.percentage} />
      </div>

      {/* Phase Indicators */}
      <div className="space-y-2">
        {PHASES.map((phase) => (
          <PhaseIndicator
            key={phase.id}
            phase={phase}
            status={getPhaseStatus(phase)}
            currentItem={
              phase.id === state.generationProgress.phase
                ? state.generationProgress.currentItem
                : undefined
            }
          />
        ))}
      </div>

      {/* Tip */}
      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
        <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Tip: You can customize everything later from the settings
        </p>
      </div>
    </div>
  )
}
