'use client'

/**
 * Batch Actions Bar
 * @module codex/ui/BatchActionsBar
 * 
 * Floating bar at the bottom of the sidebar when items are selected.
 * Shows selection count and provides batch action buttons.
 */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Layers,
  BookOpen,
  HelpCircle,
  X,
  Sparkles,
  Box,
  FileText,
} from 'lucide-react'
import type { SelectionStats } from '../../hooks/useTreeSelection'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface BatchActionsBarProps {
  /** Selection statistics */
  stats: SelectionStats
  /** Whether the bar is visible */
  isVisible: boolean
  /** Theme */
  theme?: string
  /** Callback to generate flashcards */
  onGenerateFlashcards?: () => void
  /** Callback to generate glossary */
  onGenerateGlossary?: () => void
  /** Callback to generate quiz */
  onGenerateQuiz?: () => void
  /** Callback to clear selection */
  onClearSelection?: () => void
  /** Whether flashcard generation is loading */
  isGeneratingFlashcards?: boolean
  /** Whether glossary generation is loading */
  isGeneratingGlossary?: boolean
  /** Whether quiz generation is loading */
  isGeneratingQuiz?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function BatchActionsBar({
  stats,
  isVisible,
  theme = 'dark',
  onGenerateFlashcards,
  onGenerateGlossary,
  onGenerateQuiz,
  onClearSelection,
  isGeneratingFlashcards = false,
  isGeneratingGlossary = false,
  isGeneratingQuiz = false,
}: BatchActionsBarProps) {
  const isDark = theme.includes('dark')
  const isGenerating = isGeneratingFlashcards || isGeneratingGlossary || isGeneratingQuiz
  
  // Format selection summary - only show strand count
  // When selecting folders (weaves/looms), all contained strands are selected recursively
  const getSummary = () => {
    if (stats.strands === 0) return 'No strands selected'
    return `${stats.strands} strand${stats.strands !== 1 ? 's' : ''} selected`
  }
  
  return (
    <AnimatePresence>
      {isVisible && stats.total > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`
            absolute bottom-2 left-2 right-2 rounded-xl shadow-2xl overflow-hidden
            ${isDark 
              ? 'bg-zinc-900/95 border border-zinc-700/50 backdrop-blur-lg' 
              : 'bg-white/95 border border-zinc-200/50 backdrop-blur-lg'}
          `}
        >
          {/* Header with strand count */}
          <div 
            className={`
              px-3 py-2 flex items-center justify-between
              ${isDark ? 'border-b border-zinc-800' : 'border-b border-zinc-100'}
            `}
          >
            <div className="flex items-center gap-2">
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}
              `}>
                {stats.strands}
              </div>
              <span className={`text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {getSummary()}
              </span>
            </div>
            
            <button
              onClick={onClearSelection}
              className={`
                p-1 rounded transition-colors
                ${isDark 
                  ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' 
                  : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'}
              `}
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Action buttons */}
          <div className="px-2 py-2 flex items-center gap-2">
            <ActionButton
              icon={Layers}
              label="Flashcards"
              onClick={onGenerateFlashcards}
              isLoading={isGeneratingFlashcards}
              disabled={isGenerating}
              isDark={isDark}
              color="purple"
            />
            
            <ActionButton
              icon={BookOpen}
              label="Glossary"
              onClick={onGenerateGlossary}
              isLoading={isGeneratingGlossary}
              disabled={isGenerating}
              isDark={isDark}
              color="emerald"
            />
            
            <ActionButton
              icon={HelpCircle}
              label="Quiz"
              onClick={onGenerateQuiz}
              isLoading={isGeneratingQuiz}
              disabled={isGenerating}
              isDark={isDark}
              color="blue"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   ACTION BUTTON
═══════════════════════════════════════════════════════════════════════════ */

function ActionButton({
  icon: Icon,
  label,
  onClick,
  isLoading = false,
  disabled = false,
  isDark = false,
  color = 'blue',
}: {
  icon: typeof Layers
  label: string
  onClick?: () => void
  isLoading?: boolean
  disabled?: boolean
  isDark?: boolean
  color?: 'purple' | 'emerald' | 'blue'
}) {
  const colorClasses = {
    purple: {
      bg: isDark ? 'bg-purple-600 hover:bg-purple-500' : 'bg-purple-500 hover:bg-purple-600',
      text: 'text-white',
      disabled: isDark ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-200 text-purple-400',
    },
    emerald: {
      bg: isDark ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-500 hover:bg-emerald-600',
      text: 'text-white',
      disabled: isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-200 text-emerald-400',
    },
    blue: {
      bg: isDark ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600',
      text: 'text-white',
      disabled: isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-200 text-blue-400',
    },
  }
  
  const classes = colorClasses[color]
  const isDisabled = disabled || isLoading
  
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
        text-xs font-medium transition-all
        ${isDisabled ? classes.disabled : `${classes.bg} ${classes.text}`}
        ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {isLoading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-3.5 h-3.5" />
        </motion.div>
      ) : (
        <Icon className="w-3.5 h-3.5" />
      )}
      <span>{label}</span>
    </button>
  )
}

export default BatchActionsBar









