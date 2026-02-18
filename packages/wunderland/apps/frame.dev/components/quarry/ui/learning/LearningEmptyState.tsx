'use client'

/**
 * Learning Empty State - Prompt to select strands or apply filters
 * @module codex/ui/LearningEmptyState
 *
 * Shown when no strand is selected and no filters are applied,
 * prompting the user to select strands or apply filters to begin learning.
 */

import React from 'react'
import { motion } from 'framer-motion'
import {
  GraduationCap,
  Library,
  Filter,
  Sparkles,
  ChevronRight,
  Layers,
  Brain,
  Zap,
  Target,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LearningEmptyStateProps {
  /** Theme */
  theme?: string
  /** Callback to open strand selector */
  onSelectStrands: () => void
  /** Callback to expand filter panel */
  onApplyFilters: () => void
  /** Whether filters are currently active */
  hasActiveFilters?: boolean
  /** Number of strands selected in sidebar */
  selectionCount?: number
  /** Callback when user wants to use sidebar selection */
  onUseSidebarSelection?: () => void
}

export default function LearningEmptyState({
  theme = 'light',
  onSelectStrands,
  onApplyFilters,
  hasActiveFilters = false,
  selectionCount = 0,
  onUseSidebarSelection,
}: LearningEmptyStateProps) {
  const isDark = theme?.includes('dark')

  return (
    <div className={cn(
      'flex flex-col min-h-full',
      isDark ? 'bg-zinc-900/30' : 'bg-zinc-50/50'
    )}>
      {/* Main Content - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-2xl mx-auto"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className={cn(
              'inline-flex p-5 rounded-2xl mb-6',
              isDark
                ? 'bg-gradient-to-br from-emerald-900/50 to-cyan-900/40 border border-emerald-700/40'
                : 'bg-gradient-to-br from-emerald-100 to-cyan-100 border border-emerald-200/60'
            )}
          >
            <GraduationCap className={cn('w-10 h-10', isDark ? 'text-emerald-400' : 'text-emerald-600')} />
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={cn('text-2xl font-bold mb-3', isDark ? 'text-zinc-100' : 'text-zinc-900')}
          >
            Learning Studio
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={cn('text-sm mb-8 max-w-md mx-auto leading-relaxed', isDark ? 'text-zinc-400' : 'text-zinc-600')}
          >
            Generate flashcards, quizzes, and mind maps from your knowledge base.
            Select strands or filter by topics to begin.
          </motion.p>

          {/* Sidebar Selection Banner */}
          {selectionCount > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              onClick={onUseSidebarSelection}
              className={cn(
                'flex items-center gap-3 px-5 py-3.5 rounded-xl mb-6 w-full max-w-sm mx-auto',
                'transition-all border',
                isDark
                  ? 'bg-purple-900/30 border-purple-700/50 hover:bg-purple-900/50 text-purple-300'
                  : 'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-700'
              )}
            >
              <div className={cn(
                'p-2 rounded-lg',
                isDark ? 'bg-purple-800/50' : 'bg-purple-200/50'
              )}>
                <Layers className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">
                  {selectionCount} strand{selectionCount !== 1 ? 's' : ''} selected
                </p>
                <p className={cn('text-xs', isDark ? 'text-purple-400' : 'text-purple-600')}>
                  Click to use this selection
                </p>
              </div>
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto"
          >
            {/* Select Strands Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onSelectStrands}
              className={cn(
                'flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl',
                'font-semibold text-sm transition-all',
                'bg-gradient-to-r from-emerald-600 to-cyan-600',
                'text-white shadow-lg shadow-emerald-500/25',
                'hover:shadow-xl hover:shadow-emerald-500/30'
              )}
            >
              <Library className="w-4 h-4" />
              Select Strands
            </motion.button>

            {/* Filter Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onApplyFilters}
              className={cn(
                'flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl',
                'font-semibold text-sm transition-all border',
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                  : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200 shadow-sm'
              )}
            >
              <Filter className="w-4 h-4" />
              Filter by Topic
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      {/* Features Grid - Bottom */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={cn(
          'border-t px-6 py-6',
          isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-white/50'
        )}
      >
        <div className="max-w-3xl mx-auto">
          <h3 className={cn(
            'text-xs font-semibold uppercase tracking-wider mb-4 flex items-center justify-center gap-2',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            <Sparkles className="w-3.5 h-3.5" />
            Learning Tools
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Zap, label: 'Flashcards', desc: 'Spaced repetition', color: 'emerald' },
              { icon: Target, label: 'Quizzes', desc: 'Test knowledge', color: 'blue' },
              { icon: Brain, label: 'Mind Maps', desc: 'Visual connections', color: 'purple' },
              { icon: BookOpen, label: 'Glossary', desc: 'Key terms', color: 'amber' },
            ].map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.label}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                    isDark
                      ? 'bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800'
                      : 'bg-white border-zinc-200 hover:bg-zinc-50'
                  )}
                >
                  <div className={cn(
                    'p-2 rounded-lg',
                    feature.color === 'emerald' && (isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600'),
                    feature.color === 'blue' && (isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'),
                    feature.color === 'purple' && (isDark ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-100 text-purple-600'),
                    feature.color === 'amber' && (isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-600'),
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
                      {feature.label}
                    </p>
                    <p className={cn('text-xs truncate', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                      {feature.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
