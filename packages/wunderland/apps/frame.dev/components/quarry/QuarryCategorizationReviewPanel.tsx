/**
 * Categorization Review Panel Component
 * @module components/quarry/CategorizationReviewPanel
 *
 * UI for reviewing and approving categorization suggestions
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePendingCategorizations } from './hooks/usePendingCategorizations'
import type { CategorizationResult } from '@/lib/categorization/types'

export interface CategorizationReviewPanelProps {
  /** Show only results from specific job */
  jobId?: string
  /** Callback when panel is closed */
  onClose?: () => void
}

export function CategorizationReviewPanel({ jobId, onClose }: CategorizationReviewPanelProps) {
  const {
    results,
    loading,
    error,
    refresh,
    approve,
    reject,
    modify,
    approveHighConfidence,
  } = usePendingCategorizations({ jobId })

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [modifyingId, setModifyingId] = useState<string | null>(null)
  const [modifyValue, setModifyValue] = useState('')

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleApprove = async (id: string) => {
    try {
      await approve(id)
    } catch (error) {
      console.error('Failed to approve:', error)
    }
  }

  const handleReject = async (id: string) => {
    try {
      await reject(id, 'Rejected by user')
    } catch (error) {
      console.error('Failed to reject:', error)
    }
  }

  const handleModifyStart = (result: CategorizationResult) => {
    setModifyingId(result.id)
    setModifyValue(result.suggested_category)
  }

  const handleModifySave = async (id: string) => {
    try {
      await modify(id, modifyValue)
      setModifyingId(null)
      setModifyValue('')
    } catch (error) {
      console.error('Failed to modify:', error)
    }
  }

  const handleModifyCancel = () => {
    setModifyingId(null)
    setModifyValue('')
  }

  const handleApproveAll = async (threshold: number) => {
    try {
      await approveHighConfidence(threshold)
    } catch (error) {
      console.error('Failed to bulk approve:', error)
    }
  }

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-emerald-600 dark:text-emerald-400'
    if (confidence >= 0.5) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getConfidenceBg = (confidence: number): string => {
    if (confidence >= 0.8) return 'bg-emerald-500/10 border-emerald-500/30'
    if (confidence >= 0.5) return 'bg-amber-500/10 border-amber-500/30'
    return 'bg-red-500/10 border-red-500/30'
  }

  const highConfidenceCount = results.filter(r => r.confidence >= 0.8).length
  const mediumConfidenceCount = results.filter(r => r.confidence >= 0.5 && r.confidence < 0.8).length
  const lowConfidenceCount = results.filter(r => r.confidence < 0.5).length

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Categorization Review
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {results.length} pending categorization{results.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {highConfidenceCount > 0 && (
            <button
              onClick={() => handleApproveAll(0.8)}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Approve High Confidence ({highConfidenceCount})
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Statistics */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
          <div className="flex flex-col">
            <span className="text-xs text-gray-600 dark:text-gray-400">High Confidence</span>
            <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              {highConfidenceCount}
            </span>
            <span className="text-xs text-gray-500">≥ 80%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-600 dark:text-gray-400">Medium Confidence</span>
            <span className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
              {mediumConfidenceCount}
            </span>
            <span className="text-xs text-gray-500">50-79%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-600 dark:text-gray-400">Low Confidence</span>
            <span className="text-2xl font-semibold text-red-600 dark:text-red-400">
              {lowConfidenceCount}
            </span>
            <span className="text-xs text-gray-500">&lt; 50%</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading && results.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500 dark:text-gray-400">Loading categorizations...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-red-600 dark:text-red-400">Error: {error}</div>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">No pending categorizations</p>
            <p className="text-sm mt-1">All items have been reviewed</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {results.map(result => {
                const isExpanded = expandedIds.has(result.id)
                const isModifying = modifyingId === result.id
                const filename = result.strand_path.split('/').pop() || 'Untitled'
                const confidencePercent = Math.round(result.confidence * 100)

                return (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`border rounded-lg overflow-hidden ${getConfidenceBg(result.confidence)}`}
                  >
                    {/* Card Header */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {filename}
                            </h3>
                            <span className={`text-sm font-semibold ${getConfidenceColor(result.confidence)}`}>
                              {confidencePercent}%
                            </span>
                          </div>

                          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {isModifying ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={modifyValue}
                                  onChange={e => setModifyValue(e.target.value)}
                                  className="flex-1 px-3 py-1 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                                  placeholder="New category path..."
                                />
                                <button
                                  onClick={() => handleModifySave(result.id)}
                                  className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleModifyCancel}
                                  className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded hover:bg-gray-200 dark:hover:bg-slate-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="text-gray-500 dark:text-gray-500">
                                  {result.current_category}
                                </span>
                                {' → '}
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {result.suggested_category}
                                </span>
                              </>
                            )}
                          </div>

                          {!isModifying && (
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                              {result.reasoning}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(result.id)}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded hover:bg-emerald-700 transition-colors"
                            title="Approve"
                          >
                            Approve
                          </button>

                          <button
                            onClick={() => handleModifyStart(result)}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                            title="Modify"
                          >
                            Modify
                          </button>

                          <button
                            onClick={() => handleReject(result.id)}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                            title="Reject"
                          >
                            Reject
                          </button>

                          <button
                            onClick={() => toggleExpanded(result.id)}
                            className="px-2 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                            title={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            <svg
                              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-gray-200 dark:border-slate-600"
                        >
                          <div className="p-4 bg-white/50 dark:bg-slate-800/50">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                              Alternative Suggestions
                            </h4>
                            {result.alternatives && JSON.parse(result.alternatives).length > 0 ? (
                              <div className="space-y-2">
                                {JSON.parse(result.alternatives).map((alt: any, index: number) => (
                                  <div
                                    key={index}
                                    className="flex items-start justify-between p-2 bg-gray-50 dark:bg-slate-700/50 rounded"
                                  >
                                    <div className="flex-1">
                                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                        {alt.category}
                                      </div>
                                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                        {alt.reasoning}
                                      </div>
                                    </div>
                                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 ml-4">
                                      {Math.round(alt.confidence * 100)}%
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 dark:text-gray-500">
                                No alternative suggestions
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
