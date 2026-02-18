/**
 * Worthiness Preview Modal
 * @module codex/ui/WorthinessPreviewModal
 *
 * @remarks
 * Preview auto-selected content before illustration generation.
 * Shows worthiness analysis results with confidence scores and reasoning.
 */

'use client'

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, AlertCircle, Sparkles, DollarSign, Filter, Brain } from 'lucide-react'
import type { WorthinessResult } from '@/lib/nlp/autoTagging'

export interface WorthinessPreviewItem {
  chunkId: string
  title: string
  result: WorthinessResult
  overridden?: boolean
}

interface WorthinessPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  items: WorthinessPreviewItem[]
  threshold: number
  setThreshold: (threshold: number) => void
  onToggleOverride: (chunkId: string, selected: boolean) => void
  onConfirm: () => void
  estimatedCostPerImage: number
}

export default function WorthinessPreviewModal({
  isOpen,
  onClose,
  items,
  threshold,
  setThreshold,
  onToggleOverride,
  onConfirm,
  estimatedCostPerImage,
}: WorthinessPreviewModalProps) {
  // Calculate stats
  const stats = useMemo(() => {
    const selected = items.filter(item => {
      // If overridden, use override value
      if (item.overridden !== undefined) {
        return item.overridden
      }
      // Otherwise use worthiness result
      return item.result.warrants && item.result.confidence >= threshold
    })

    const skipped = items.length - selected.length
    const totalCost = selected.length * estimatedCostPerImage

    // Method breakdown
    const methods = items.reduce((acc, item) => {
      const method = item.result.method
      acc[method] = (acc[method] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Confidence breakdown
    const highConfidence = items.filter(i => i.result.confidence >= 0.7).length
    const mediumConfidence = items.filter(i => i.result.confidence >= 0.4 && i.result.confidence < 0.7).length
    const lowConfidence = items.filter(i => i.result.confidence < 0.4).length

    return {
      selected: selected.length,
      skipped,
      totalCost,
      methods,
      highConfidence,
      mediumConfidence,
      lowConfidence,
    }
  }, [items, threshold, estimatedCostPerImage])

  // Determine if item is selected
  const isSelected = (item: WorthinessPreviewItem) => {
    if (item.overridden !== undefined) {
      return item.overridden
    }
    return item.result.warrants && item.result.confidence >= threshold
  }

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-600 dark:text-green-400'
    if (confidence >= 0.4) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  // Get confidence bg
  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 0.7) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    if (confidence >= 0.4) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-purple-50 to-cyan-50 dark:from-purple-900/20 dark:to-cyan-900/20">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                  Worthiness Analysis Results
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Review auto-selected content for illustration generation
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 dark:hover:bg-black/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Selected</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.selected}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Skipped</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.skipped}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Estimated Cost
              </p>
              <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                ${stats.totalCost.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
                <Brain className="w-3 h-3" />
                Analysis Method
              </p>
              <div className="text-xs space-y-0.5">
                {Object.entries(stats.methods).map(([method, count]) => (
                  <div key={method} className="flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400 capitalize">{method}:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Threshold Control */}
          <div className="px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Confidence Threshold: {(threshold * 100).toFixed(0)}%
                </label>
              </div>
              <input
                type="range"
                min={0.3}
                max={0.9}
                step={0.05}
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="flex-1 max-w-xs"
              />
              <div className="text-xs text-zinc-500 dark:text-zinc-400 flex gap-4">
                <span className={stats.highConfidence > 0 ? 'text-green-600 dark:text-green-400 font-semibold' : ''}>
                  High: {stats.highConfidence}
                </span>
                <span className={stats.mediumConfidence > 0 ? 'text-yellow-600 dark:text-yellow-400 font-semibold' : ''}>
                  Medium: {stats.mediumConfidence}
                </span>
                <span className={stats.lowConfidence > 0 ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>
                  Low: {stats.lowConfidence}
                </span>
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {items.map((item) => {
              const selected = isSelected(item)
              const confidenceColor = getConfidenceColor(item.result.confidence)
              const confidenceBg = getConfidenceBg(item.result.confidence)

              return (
                <div
                  key={item.chunkId}
                  className={`p-4 rounded-lg border ${confidenceBg} transition-all`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => onToggleOverride(item.chunkId, e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                          {item.title}
                        </h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                          {item.result.reasoning}
                        </p>
                        {item.result.visualIndicators && item.result.visualIndicators.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {item.result.visualIndicators.map((concept, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 text-xs bg-white dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                              >
                                {concept}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs">
                          <span className={`font-semibold ${confidenceColor}`}>
                            Confidence: {(item.result.confidence * 100).toFixed(0)}%
                          </span>
                          <span className="text-zinc-500 dark:text-zinc-400 capitalize">
                            Method: {item.result.method}
                          </span>
                          {item.result.suggestedType && (
                            <span className="text-cyan-600 dark:text-cyan-400">
                              Type: {item.result.suggestedType}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      {selected ? (
                        <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                  </div>
                  {item.overridden !== undefined && (
                    <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                        ⚡ Manual override: {item.overridden ? 'Force include' : 'Force exclude'}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <div className="flex items-center gap-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {stats.selected} selected · ${stats.totalCost.toFixed(2)} estimated
              </p>
              <button
                onClick={onConfirm}
                disabled={stats.selected === 0}
                className="px-6 py-2 text-sm font-semibold text-white bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Confirm Selection
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
