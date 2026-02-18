/**
 * Tutor Explanation Panel
 * @module components/quarry/ui/learning/TutorExplanationPanel
 *
 * Displays AI-generated explanations for quiz answers.
 * Shows why the correct answer is right, what was wrong,
 * and concepts to review.
 */

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lightbulb,
  CheckCircle2,
  XCircle,
  BookOpen,
  Sparkles,
  Link,
  Brain,
  Loader2,
  X,
} from 'lucide-react'
import type { TutorExplanation } from '@/components/quarry/hooks/useQuizTutor'

// ============================================================================
// TYPES
// ============================================================================

export interface TutorExplanationPanelProps {
  /** The explanation to display */
  explanation: TutorExplanation | null
  /** Whether currently loading */
  isLoading?: boolean
  /** Close handler */
  onClose?: () => void
  /** Theme */
  theme?: string
  /** Compact mode */
  compact?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TutorExplanationPanel({
  explanation,
  isLoading = false,
  onClose,
  theme = 'light',
  compact = false,
}: TutorExplanationPanelProps) {
  const isDark = theme.includes('dark')

  if (!explanation && !isLoading) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className={`
          rounded-xl overflow-hidden
          ${isDark 
            ? 'bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-700/50' 
            : 'bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200'
          }
          ${compact ? 'p-3' : 'p-4'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <span className={`font-semibold ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
              AI Tutor
            </span>
            {explanation?.llmUsed && (
              <span className={`
                text-xs px-2 py-0.5 rounded-full flex items-center gap-1
                ${isDark ? 'bg-purple-800/50 text-purple-300' : 'bg-purple-100 text-purple-700'}
              `}>
                <Sparkles className="w-3 h-3" />
                Enhanced
              </span>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className={`p-1 rounded-lg transition-colors ${
                isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center gap-3 py-4">
            <Loader2 className={`w-5 h-5 animate-spin ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
            <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>
              Generating explanation...
            </span>
          </div>
        )}

        {/* Explanation Content */}
        {explanation && !isLoading && (
          <div className="space-y-4">
            {/* Why Correct */}
            <div className={`p-3 rounded-lg ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
              <div className="flex items-start gap-2">
                <CheckCircle2 className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <div>
                  <p className={`text-sm font-medium mb-1 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    Why this is correct
                  </p>
                  <p className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    {explanation.whyCorrect}
                  </p>
                </div>
              </div>
            </div>

            {/* Why Wrong */}
            {explanation.whyWrong && (
              <div className={`p-3 rounded-lg ${isDark ? 'bg-amber-900/30' : 'bg-amber-50'}`}>
                <div className="flex items-start gap-2">
                  <XCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                  <div>
                    <p className={`text-sm font-medium mb-1 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                      About your answer
                    </p>
                    <p className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      {explanation.whyWrong}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Concepts to Review */}
            {explanation.conceptsToReview.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  <span className={`text-sm font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
                    Concepts to Review
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {explanation.conceptsToReview.map((concept, i) => (
                    <span
                      key={i}
                      className={`
                        px-2 py-1 rounded-md text-sm
                        ${isDark ? 'bg-indigo-800/50 text-indigo-200' : 'bg-indigo-100 text-indigo-700'}
                      `}
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Related Topics */}
            {explanation.relatedTopics.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  <span className={`text-sm font-medium ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                    Related Topics
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {explanation.relatedTopics.map((topic, i) => (
                    <span
                      key={i}
                      className={`
                        px-2 py-1 rounded-md text-sm
                        ${isDark ? 'bg-purple-800/50 text-purple-200' : 'bg-purple-100 text-purple-700'}
                      `}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Source indicator */}
            <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Explanation source: {explanation.source}
              {' • '}
              Confidence: {Math.round(explanation.confidence * 100)}%
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export default TutorExplanationPanel

