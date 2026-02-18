/**
 * Summarization Panel
 * @module codex/ui/SummarizationPanel
 *
 * UI for AI-powered summarization of research results.
 * Supports multiple summary types and streaming output.
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  FileText,
  Key,
  ListChecks,
  Scale,
  Presentation,
  RefreshCw,
  Settings2,
  ChevronDown,
} from 'lucide-react'
import type { WebSearchResult, ResearchSession } from '@/lib/research/types'
import {
  useSummarization,
  type SummaryType,
  type SummaryLength,
  SUMMARY_TYPE_CONFIG,
  SUMMARY_LENGTH_CONFIG,
  resultsToSources,
} from '@/lib/summarization'
import { Z_INDEX } from '../../constants'

// ============================================================================
// TYPES
// ============================================================================

interface SummarizationPanelProps {
  /** Whether the panel is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Results to summarize */
  results: WebSearchResult[]
  /** Optional session for context */
  session?: ResearchSession
  /** Current theme */
  theme?: string
  /** Callback to insert summary into editor */
  onInsert?: (content: string) => void
}

// ============================================================================
// ICONS FOR SUMMARY TYPES
// ============================================================================

const SUMMARY_TYPE_ICONS: Record<SummaryType, React.ReactNode> = {
  digest: <FileText className="w-4 h-4" />,
  abstract: <Presentation className="w-4 h-4" />,
  'key-points': <ListChecks className="w-4 h-4" />,
  comparison: <Scale className="w-4 h-4" />,
  executive: <Key className="w-4 h-4" />,
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SummarizationPanel({
  isOpen,
  onClose,
  results,
  session,
  theme = 'light',
  onInsert,
}: SummarizationPanelProps) {
  const isDark = theme?.includes('dark')

  // Summarization hook
  const {
    status,
    content,
    progress,
    provider,
    error,
    summarize,
    cancel,
    reset,
  } = useSummarization()

  // Options state
  const [summaryType, setSummaryType] = useState<SummaryType>('digest')
  const [summaryLength, setSummaryLength] = useState<SummaryLength>('standard')
  const [includeCitations, setIncludeCitations] = useState(true)
  const [focus, setFocus] = useState('')
  const [showOptions, setShowOptions] = useState(false)

  // Copy state
  const [copied, setCopied] = useState(false)

  // Reset when results change
  useEffect(() => {
    if (results.length > 0) {
      reset()
    }
  }, [results, reset])

  // Check if comparison is available
  const canCompare = results.length >= 2

  // Handle summarize
  const handleSummarize = useCallback(async () => {
    const sources = resultsToSources(results)

    await summarize({
      sources,
      type: summaryType,
      length: summaryLength,
      includeCitations,
      focus: focus || undefined,
    })
  }, [results, summaryType, summaryLength, includeCitations, focus, summarize])

  // Handle copy
  const handleCopy = useCallback(async () => {
    if (!content) return

    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [content])

  // Handle insert
  const handleInsert = useCallback(() => {
    if (!content || !onInsert) return
    onInsert(content)
    onClose()
  }, [content, onInsert, onClose])

  // Handle escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (status === 'summarizing') {
          cancel()
        } else {
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, status, cancel, onClose])

  if (!isOpen) return null

  const isIdle = status === 'idle'
  const isSummarizing = status === 'summarizing'
  const isComplete = status === 'complete'
  const isError = status === 'error'

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: Z_INDEX.MODAL }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={isSummarizing ? undefined : onClose}
        />

        {/* Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`
            relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden
            ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white'}
          `}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-violet-900/30' : 'bg-violet-100'}`}>
                  <Sparkles className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    AI Summary
                  </h2>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {results.length} source{results.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              </div>
              <button
                onClick={isSummarizing ? cancel : onClose}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Summary Type Selection */}
            {isIdle && (
              <>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Summary Type
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(Object.entries(SUMMARY_TYPE_CONFIG) as [SummaryType, typeof SUMMARY_TYPE_CONFIG[SummaryType]][]).map(([type, config]) => {
                      const isDisabled = type === 'comparison' && !canCompare
                      const isSelected = summaryType === type

                      return (
                        <button
                          key={type}
                          onClick={() => !isDisabled && setSummaryType(type)}
                          disabled={isDisabled}
                          className={`
                            p-3 rounded-xl text-left transition-all border-2
                            ${isSelected
                              ? isDark
                                ? 'border-violet-500 bg-violet-900/20'
                                : 'border-violet-500 bg-violet-50'
                              : isDark
                                ? 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                                : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                            }
                            ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          `}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={isSelected
                              ? isDark ? 'text-violet-400' : 'text-violet-600'
                              : isDark ? 'text-gray-400' : 'text-gray-500'
                            }>
                              {SUMMARY_TYPE_ICONS[type]}
                            </span>
                            <span className={`text-sm font-medium ${
                              isSelected
                                ? isDark ? 'text-violet-300' : 'text-violet-700'
                                : isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                              {config.label}
                            </span>
                          </div>
                          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {config.description}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Summary Length */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Length
                  </label>
                  <div className="flex gap-2">
                    {(Object.entries(SUMMARY_LENGTH_CONFIG) as [SummaryLength, typeof SUMMARY_LENGTH_CONFIG[SummaryLength]][]).map(([length, config]) => (
                      <button
                        key={length}
                        onClick={() => setSummaryLength(length)}
                        className={`
                          flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                          ${summaryLength === length
                            ? isDark
                              ? 'bg-violet-600 text-white'
                              : 'bg-violet-600 text-white'
                            : isDark
                              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                        `}
                      >
                        {config.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Advanced Options Toggle */}
                <button
                  onClick={() => setShowOptions(!showOptions)}
                  className={`flex items-center gap-2 text-sm ${
                    isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'
                  }`}
                >
                  <Settings2 className="w-4 h-4" />
                  Advanced Options
                  <ChevronDown className={`w-4 h-4 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
                </button>

                {/* Advanced Options */}
                <AnimatePresence>
                  {showOptions && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      {/* Focus Area */}
                      <div>
                        <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Focus Area (optional)
                        </label>
                        <input
                          type="text"
                          value={focus}
                          onChange={(e) => setFocus(e.target.value)}
                          placeholder="e.g., methodology, conclusions, data..."
                          className={`
                            w-full px-4 py-2 rounded-lg text-sm outline-none transition-all
                            ${isDark
                              ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-violet-600'
                              : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-violet-500'
                            }
                          `}
                        />
                      </div>

                      {/* Include Citations */}
                      <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                        isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={includeCitations}
                          onChange={(e) => setIncludeCitations(e.target.checked)}
                          className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
                        />
                        <div>
                          <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            Include inline citations
                          </span>
                          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Reference sources in [Author/Domain] format
                          </p>
                        </div>
                      </label>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Generate Button */}
                <button
                  onClick={handleSummarize}
                  disabled={results.length === 0}
                  className={`
                    w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-colors
                    ${results.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-violet-600 hover:bg-violet-700 text-white'
                    }
                  `}
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Summary
                </button>
              </>
            )}

            {/* Summarizing State */}
            {isSummarizing && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <Loader2 className={`w-10 h-10 mx-auto animate-spin ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
                  <p className={`mt-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Generating {SUMMARY_TYPE_CONFIG[summaryType].label.toLowerCase()}...
                  </p>
                  {provider && (
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Using {provider}
                    </p>
                  )}
                </div>

                {/* Progress Bar */}
                <div className={`w-full h-2 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                  <motion.div
                    className="h-full rounded-full bg-violet-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* Streaming Preview */}
                {content && (
                  <div className={`
                    p-4 rounded-lg text-sm whitespace-pre-wrap
                    ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-700'}
                  `}>
                    {content}
                    <span className="animate-pulse">▌</span>
                  </div>
                )}

                <button
                  onClick={cancel}
                  className={`
                    w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors
                    ${isDark
                      ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Complete State */}
            {isComplete && content && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Summary Complete
                  </span>
                  {provider && (
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      via {provider}
                    </span>
                  )}
                </div>

                <div className={`
                  p-4 rounded-lg text-sm whitespace-pre-wrap max-h-60 overflow-y-auto
                  ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-700'}
                `}>
                  {content}
                </div>
              </div>
            )}

            {/* Error State */}
            {isError && (
              <div className={`p-4 rounded-lg ${isDark ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                      Summarization Failed
                    </p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-red-300' : 'text-red-600'}`}>
                      {error}
                    </p>
                    <button
                      onClick={handleSummarize}
                      className={`mt-3 flex items-center gap-1.5 text-sm font-medium ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {isComplete && content && (
            <div className={`px-6 py-4 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className={`
                      flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors
                      ${isDark
                        ? 'text-gray-300 hover:bg-gray-800'
                        : 'text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={reset}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-lg transition-colors
                      ${isDark
                        ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    New Summary
                  </button>
                  {onInsert && (
                    <button
                      onClick={handleInsert}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Insert
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
