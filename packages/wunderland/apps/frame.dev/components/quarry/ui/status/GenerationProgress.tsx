/**
 * Generation Progress Indicator
 * Shows progress during glossary/flashcard/quiz generation
 *
 * @module codex/ui/GenerationProgress
 */

'use client'

import React from 'react'
import { Sparkles, Zap, CheckCircle2, Loader2 } from 'lucide-react'

export type GenerationStage =
  | 'idle'
  | 'cache_check'
  | 'extracting_tech'
  | 'extracting_acronyms'
  | 'extracting_entities'
  | 'extracting_keywords'
  | 'llm_generating'
  | 'merging'
  | 'saving_cache'
  | 'complete'

export interface GenerationProgressProps {
  /** Current stage */
  stage: GenerationStage
  /** Progress within current stage (0-1) */
  progress: number
  /** Overall progress (0-1) */
  overallProgress: number
  /** Number of items found so far */
  itemsFound?: number
  /** Theme */
  isDark?: boolean
  /** Generation method being used */
  method?: 'nlp' | 'llm' | 'hybrid'
  /** Compact mode */
  compact?: boolean
}

const STAGE_INFO: Record<GenerationStage, { label: string; weight: number }> = {
  idle: { label: 'Starting...', weight: 0 },
  cache_check: { label: 'Checking cache', weight: 0.05 },
  extracting_tech: { label: 'Extracting technologies', weight: 0.15 },
  extracting_acronyms: { label: 'Finding acronyms', weight: 0.10 },
  extracting_entities: { label: 'Identifying entities', weight: 0.25 },
  extracting_keywords: { label: 'Extracting keywords', weight: 0.15 },
  llm_generating: { label: 'AI enhancement', weight: 0.20 },
  merging: { label: 'Merging results', weight: 0.05 },
  saving_cache: { label: 'Saving to cache', weight: 0.05 },
  complete: { label: 'Complete!', weight: 0 },
}

/**
 * Get the stage index for progress calculation
 */
function getStageIndex(stage: GenerationStage): number {
  const stages = Object.keys(STAGE_INFO) as GenerationStage[]
  return stages.indexOf(stage)
}

/**
 * Calculate overall progress from stage and stage progress
 */
export function calculateOverallProgress(stage: GenerationStage, stageProgress: number): number {
  const stages = Object.keys(STAGE_INFO) as GenerationStage[]
  const stageIndex = stages.indexOf(stage)

  if (stageIndex === -1 || stage === 'complete') return 1

  // Sum weights of completed stages
  let completedWeight = 0
  for (let i = 0; i < stageIndex; i++) {
    completedWeight += STAGE_INFO[stages[i]].weight
  }

  // Add progress within current stage
  const currentWeight = STAGE_INFO[stage].weight * stageProgress

  return completedWeight + currentWeight
}

/**
 * Progress bar with animated segments
 */
function ProgressBar({
  progress,
  isDark,
  showPercentage = true,
}: {
  progress: number
  isDark: boolean
  showPercentage?: boolean
}) {
  const percentage = Math.round(progress * 100)

  return (
    <div className="space-y-1">
      <div
        className={`h-2 rounded-full overflow-hidden ${
          isDark ? 'bg-zinc-700' : 'bg-zinc-200'
        }`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && (
        <div className={`text-right text-[10px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          {percentage}%
        </div>
      )}
    </div>
  )
}

/**
 * Stage indicator with checkmarks
 */
function StageList({
  currentStage,
  isDark,
  method,
}: {
  currentStage: GenerationStage
  isDark: boolean
  method?: 'nlp' | 'llm' | 'hybrid'
}) {
  const stages = Object.entries(STAGE_INFO).filter(([key]) => {
    // Filter stages based on method
    if (method === 'llm' && ['extracting_tech', 'extracting_acronyms', 'extracting_entities', 'extracting_keywords'].includes(key)) {
      return false
    }
    if (method === 'nlp' && key === 'llm_generating') {
      return false
    }
    return key !== 'idle' && key !== 'complete'
  })

  const currentIndex = getStageIndex(currentStage)

  return (
    <div className="space-y-1.5">
      {stages.map(([key, { label }], index) => {
        const stageIndex = getStageIndex(key as GenerationStage)
        const isComplete = stageIndex < currentIndex
        const isCurrent = key === currentStage
        const isPending = stageIndex > currentIndex

        return (
          <div
            key={key}
            className={`flex items-center gap-2 text-xs transition-colors ${
              isComplete
                ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                : isCurrent
                ? isDark ? 'text-zinc-100' : 'text-zinc-900'
                : isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`}
          >
            {isComplete ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : isCurrent ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <div className={`w-3.5 h-3.5 rounded-full border ${isDark ? 'border-zinc-600' : 'border-zinc-300'}`} />
            )}
            <span className={isCurrent ? 'font-medium' : ''}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Main progress component
 */
export function GenerationProgress({
  stage,
  progress,
  overallProgress,
  itemsFound,
  isDark = false,
  method = 'nlp',
  compact = false,
}: GenerationProgressProps) {
  if (stage === 'idle') return null

  const stageInfo = STAGE_INFO[stage]

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {method === 'llm' || method === 'hybrid' ? (
              <Sparkles className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'} animate-pulse`} />
            ) : (
              <Zap className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            )}
            <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
              {stageInfo.label}
            </span>
          </div>
          {itemsFound !== undefined && itemsFound > 0 && (
            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {itemsFound} found
            </span>
          )}
        </div>
        <ProgressBar progress={overallProgress} isDark={isDark} />
      </div>
    )
  }

  return (
    <div
      className={`p-4 rounded-xl space-y-4 ${
        isDark
          ? 'bg-gradient-to-br from-zinc-800/80 to-zinc-900'
          : 'bg-gradient-to-br from-zinc-50 to-white border border-zinc-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              isDark ? 'bg-emerald-900/40' : 'bg-emerald-100'
            }`}
          >
            {method === 'llm' || method === 'hybrid' ? (
              <Sparkles className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'} animate-pulse`} />
            ) : (
              <Zap className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            )}
          </div>
          <div>
            <div className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Generating Glossary
            </div>
            <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Using {method === 'hybrid' ? 'NLP + LLM' : method.toUpperCase()}
            </div>
          </div>
        </div>
        {itemsFound !== undefined && itemsFound > 0 && (
          <div className="text-right">
            <div className={`text-lg font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {itemsFound}
            </div>
            <div className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              terms found
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <ProgressBar progress={overallProgress} isDark={isDark} />

      {/* Stage list */}
      <StageList currentStage={stage} isDark={isDark} method={method} />
    </div>
  )
}

export default GenerationProgress
