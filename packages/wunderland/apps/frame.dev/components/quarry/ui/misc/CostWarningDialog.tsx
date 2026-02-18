/**
 * Cost Warning Dialog
 * @module codex/ui/CostWarningDialog
 *
 * Modal dialog that shows estimated LLM API costs before generating
 * abstractive summaries or other AI features.
 *
 * Reminds users that LLM API usage costs money.
 */

'use client'

import React from 'react'
import { AlertTriangle, DollarSign, Zap, X } from 'lucide-react'
import { formatCost, estimateTokens } from '@/lib/costs/pricingModels'

// ============================================================================
// TYPES
// ============================================================================

export interface CostEstimate {
  estimatedInputTokens: number
  estimatedOutputTokens: number
  estimatedCost: number
  provider: string
  model: string
}

export interface CostWarningDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  costEstimate: CostEstimate
  scope: 'document' | 'blocks' | 'selection'
  isLoading?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CostWarningDialog({
  isOpen,
  onClose,
  onConfirm,
  costEstimate,
  scope,
  isLoading = false,
}: CostWarningDialogProps) {
  if (!isOpen) return null

  const scopeLabels = {
    document: 'entire document',
    blocks: 'selected blocks',
    selection: 'current selection',
  }

  const isHighCost = costEstimate.estimatedCost > 0.10 // $0.10 threshold

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border border-zinc-200 dark:border-zinc-700">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-700 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              AI Generation Cost
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {/* Warning message */}
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Generating AI summaries for the <strong>{scopeLabels[scope]}</strong> will
            make API calls that incur costs. Review the estimate below.
          </p>

          {/* Cost breakdown */}
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Provider</span>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 capitalize">
                {costEstimate.provider}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Model</span>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 font-mono">
                {costEstimate.model}
              </span>
            </div>
            <div className="border-t border-zinc-200 dark:border-zinc-700 my-2" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Est. Input Tokens</span>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                ~{costEstimate.estimatedInputTokens.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Est. Output Tokens</span>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                ~{costEstimate.estimatedOutputTokens.toLocaleString()}
              </span>
            </div>
            <div className="border-t border-zinc-200 dark:border-zinc-700 my-2" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Estimated Cost
              </span>
              <span className={`text-lg font-bold ${
                isHighCost
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {formatCost(costEstimate.estimatedCost)}
              </span>
            </div>
          </div>

          {/* High cost warning */}
          {isHighCost && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-200">
                This is above the typical cost threshold. Consider summarizing smaller sections
                or using a more cost-effective model.
              </p>
            </div>
          )}

          {/* API usage reminder */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> LLM API usage costs money. Costs are tracked locally
              and you can view your usage in Settings → API Costs.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50
              ${isHighCost
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-violet-600 hover:bg-violet-700'
              }
            `}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Generate Summary
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// HELPER HOOK
// ============================================================================

/**
 * Helper to estimate costs for content summarization
 */
export function estimateSummarizationCost(
  content: string,
  provider: string,
  model: string
): CostEstimate {
  // Rough estimation: input is content length, output is ~20% of input for summaries
  const inputTokens = estimateTokens(content)
  const outputTokens = Math.ceil(inputTokens * 0.2)

  // Import dynamically to avoid circular deps
  let cost = 0
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { calculateTokenCost } = require('@/lib/costs/pricingModels')
    cost = calculateTokenCost(provider, model, inputTokens, outputTokens)
  } catch {
    // Fallback: rough estimate based on Claude Sonnet pricing
    cost = (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15
  }

  return {
    estimatedInputTokens: inputTokens,
    estimatedOutputTokens: outputTokens,
    estimatedCost: cost,
    provider,
    model,
  }
}

export default CostWarningDialog
