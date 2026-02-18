/**
 * Teach Mode Gap Report Component
 *
 * Displays the gap analysis results after a teaching session:
 * - Coverage percentage
 * - Concepts covered
 * - Knowledge gaps identified
 * - Suggestions for improvement
 * - Option to generate flashcards
 *
 * @module codex/ui/TeachModeGapReport
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2, XCircle, AlertCircle, Lightbulb,
  BookOpen, Sparkles, Trophy, Clock, Zap,
  ChevronDown, ChevronUp, Plus,
} from 'lucide-react'
import type { TeachSession, GapReport } from '@/types/openstrand'
import { STUDENT_PERSONAS } from '@/types/openstrand'

interface TeachModeGapReportProps {
  /** Completed teaching session */
  session: TeachSession
  /** Strand title for display */
  strandTitle: string
  /** Theme */
  isDark?: boolean
  /** Callback to generate flashcards from gaps */
  onGenerateFlashcards?: (gaps: string[]) => Promise<void>
  /** Callback to start a new session */
  onStartNew?: () => void
}

/**
 * Get color based on coverage percentage
 */
function getCoverageColor(coverage: number, isDark: boolean): string {
  if (coverage >= 80) {
    return isDark ? 'text-emerald-400' : 'text-emerald-600'
  } else if (coverage >= 50) {
    return isDark ? 'text-amber-400' : 'text-amber-600'
  } else {
    return isDark ? 'text-red-400' : 'text-red-600'
  }
}

/**
 * Get background color for coverage badge
 */
function getCoverageBgColor(coverage: number, isDark: boolean): string {
  if (coverage >= 80) {
    return isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'
  } else if (coverage >= 50) {
    return isDark ? 'bg-amber-500/20' : 'bg-amber-100'
  } else {
    return isDark ? 'bg-red-500/20' : 'bg-red-100'
  }
}

/**
 * Format duration in human readable format
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

/**
 * Collapsible section component
 */
function CollapsibleSection({
  title,
  icon,
  count,
  children,
  defaultOpen = true,
  isDark,
  accentColor = 'blue',
}: {
  title: string
  icon: React.ReactNode
  count?: number
  children: React.ReactNode
  defaultOpen?: boolean
  isDark: boolean
  accentColor?: 'green' | 'red' | 'amber' | 'blue'
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const colorClasses = {
    green: isDark ? 'text-emerald-400' : 'text-emerald-600',
    red: isDark ? 'text-red-400' : 'text-red-600',
    amber: isDark ? 'text-amber-400' : 'text-amber-600',
    blue: isDark ? 'text-blue-400' : 'text-blue-600',
  }

  return (
    <div className={`
      rounded-xl border overflow-hidden
      ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'}
    `}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between p-4
          ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}
        `}
      >
        <div className="flex items-center gap-3">
          <span className={colorClasses[accentColor]}>{icon}</span>
          <span className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            {title}
          </span>
          {count !== undefined && (
            <span className={`
              px-2 py-0.5 rounded-full text-xs font-medium
              ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}
            `}>
              {count}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className={`w-5 h-5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
        ) : (
          <ChevronDown className={`w-5 h-5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
        )}
      </button>

      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className={`px-4 pb-4 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}
        >
          <div className="pt-4">{children}</div>
        </motion.div>
      )}
    </div>
  )
}

/**
 * Teach Mode Gap Report
 *
 * Shows comprehensive analysis of a teaching session
 */
export function TeachModeGapReport({
  session,
  strandTitle,
  isDark = false,
  onGenerateFlashcards,
  onStartNew,
}: TeachModeGapReportProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedGaps, setSelectedGaps] = useState<Set<string>>(new Set())

  const personaConfig = STUDENT_PERSONAS.find(p => p.id === session.persona)
  const gapReport = session.gapReport

  // Toggle gap selection
  const toggleGapSelection = useCallback((gap: string) => {
    setSelectedGaps(prev => {
      const next = new Set(prev)
      if (next.has(gap)) {
        next.delete(gap)
      } else {
        next.add(gap)
      }
      return next
    })
  }, [])

  // Select all gaps
  const selectAllGaps = useCallback(() => {
    if (gapReport) {
      setSelectedGaps(new Set(gapReport.gaps))
    }
  }, [gapReport])

  // Handle flashcard generation
  const handleGenerateFlashcards = useCallback(async () => {
    if (selectedGaps.size === 0 || !onGenerateFlashcards) return

    setIsGenerating(true)
    try {
      await onGenerateFlashcards(Array.from(selectedGaps))
    } finally {
      setIsGenerating(false)
    }
  }, [selectedGaps, onGenerateFlashcards])

  if (!gapReport) {
    return (
      <div className={`p-6 text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        No gap report available for this session.
      </div>
    )
  }

  return (
    <div className={`p-6 space-y-6 ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      {/* Header with coverage score */}
      <div className={`
        p-6 rounded-2xl
        ${isDark ? 'bg-zinc-800' : 'bg-white'}
        border ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
      `}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className={`text-xl font-semibold mb-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Gap Report
            </h2>
            <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {strandTitle}
            </p>
          </div>

          {/* Coverage badge */}
          <div className={`
            px-4 py-2 rounded-xl text-center
            ${getCoverageBgColor(gapReport.coveragePercent, isDark)}
          `}>
            <div className={`text-3xl font-bold ${getCoverageColor(gapReport.coveragePercent, isDark)}`}>
              {Math.round(gapReport.coveragePercent)}%
            </div>
            <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Coverage
            </div>
          </div>
        </div>

        {/* Session stats */}
        <div className={`
          flex items-center gap-6 mt-4 pt-4 border-t
          ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
        `}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{personaConfig?.icon}</span>
            <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {personaConfig?.name}
            </span>
          </div>
          <div className={`flex items-center gap-1.5 text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            <Clock className="w-4 h-4" />
            {formatDuration(session.durationSeconds)}
          </div>
          <div className={`flex items-center gap-1.5 text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            <Zap className="w-4 h-4" />
            +{session.xpEarned} XP
          </div>
          {session.xpEarned >= 150 && (
            <div className={`flex items-center gap-1.5 text-sm ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              <Trophy className="w-4 h-4" />
              Excellent!
            </div>
          )}
        </div>
      </div>

      {/* Covered concepts */}
      <CollapsibleSection
        title="Concepts Covered"
        icon={<CheckCircle2 className="w-5 h-5" />}
        count={gapReport.covered.length}
        isDark={isDark}
        accentColor="green"
      >
        <ul className="space-y-2">
          {gapReport.covered.map((concept, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className={`w-4 h-4 mt-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
              <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {concept}
              </span>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      {/* Knowledge gaps */}
      <CollapsibleSection
        title="Knowledge Gaps"
        icon={<XCircle className="w-5 h-5" />}
        count={gapReport.gaps.length}
        isDark={isDark}
        accentColor="red"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Select gaps to generate flashcards
            </p>
            <button
              onClick={selectAllGaps}
              className={`text-xs ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
            >
              Select all
            </button>
          </div>

          <ul className="space-y-2">
            {gapReport.gaps.map((gap, i) => (
              <li key={i}>
                <button
                  onClick={() => toggleGapSelection(gap)}
                  className={`
                    w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all
                    ${selectedGaps.has(gap)
                      ? isDark ? 'bg-red-500/20 border-red-500' : 'bg-red-50 border-red-300'
                      : isDark ? 'bg-zinc-800 border-zinc-700 hover:border-zinc-600' : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                    }
                    border
                  `}
                >
                  <div className={`
                    w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0
                    ${selectedGaps.has(gap)
                      ? isDark ? 'border-red-500 bg-red-500' : 'border-red-500 bg-red-500'
                      : isDark ? 'border-zinc-600' : 'border-zinc-300'
                    }
                  `}>
                    {selectedGaps.has(gap) && (
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    {gap}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* Generate flashcards button */}
          {onGenerateFlashcards && gapReport.gaps.length > 0 && (
            <button
              onClick={handleGenerateFlashcards}
              disabled={selectedGaps.size === 0 || isGenerating}
              className={`
                w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                font-medium transition-all
                ${selectedGaps.size > 0
                  ? isDark
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  : isDark
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                }
              `}
            >
              {isGenerating ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-5 h-5" />
                </motion.div>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Generate {selectedGaps.size} Flashcard{selectedGaps.size !== 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
        </div>
      </CollapsibleSection>

      {/* Suggestions */}
      <CollapsibleSection
        title="Suggestions"
        icon={<Lightbulb className="w-5 h-5" />}
        count={gapReport.suggestions.length}
        isDark={isDark}
        accentColor="amber"
        defaultOpen={false}
      >
        <ul className="space-y-2">
          {gapReport.suggestions.map((suggestion, i) => (
            <li key={i} className="flex items-start gap-2">
              <AlertCircle className={`w-4 h-4 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
              <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {suggestion}
              </span>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      {/* Start new session */}
      {onStartNew && (
        <button
          onClick={onStartNew}
          className={`
            w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
            font-medium transition-all border
            ${isDark
              ? 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
              : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
            }
          `}
        >
          <BookOpen className="w-5 h-5" />
          Start New Session
        </button>
      )}
    </div>
  )
}

export default TeachModeGapReport
