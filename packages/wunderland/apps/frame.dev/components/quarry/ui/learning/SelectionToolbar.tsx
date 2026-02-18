/**
 * Selection Toolbar Component
 * @module quarry/ui/learning/SelectionToolbar
 * 
 * Floating toolbar that appears when strands are selected in the sidebar.
 * Provides quick actions for:
 * - Opening Learning Studio with selection
 * - Quick flashcard generation
 * - Quick quiz generation
 * - Quick glossary generation
 * - Selection stats display
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard, HelpCircle, Book, GraduationCap, X,
  Sparkles, Zap, ChevronUp, ChevronDown, Loader2,
  FileStack, Tag, FolderOpen, BarChart3
} from 'lucide-react'
import { useSelectedStrands } from '../../contexts/SelectedStrandsContext'

export interface SelectionToolbarProps {
  /** Theme */
  isDark?: boolean
  /** Open Learning Studio callback */
  onOpenLearningStudio?: () => void
  /** Generate flashcards callback */
  onGenerateFlashcards?: (options?: { useLLM?: boolean }) => Promise<void>
  /** Generate quiz callback */
  onGenerateQuiz?: (options?: { useLLM?: boolean }) => Promise<void>
  /** Generate glossary callback */
  onGenerateGlossary?: (options?: { useLLM?: boolean }) => Promise<void>
  /** Position - fixed or inline */
  position?: 'fixed' | 'inline'
  /** Loading states */
  isGenerating?: {
    flashcards?: boolean
    quiz?: boolean
    glossary?: boolean
  }
}

export function SelectionToolbar({
  isDark = false,
  onOpenLearningStudio,
  onGenerateFlashcards,
  onGenerateQuiz,
  onGenerateGlossary,
  position = 'fixed',
  isGenerating = {},
}: SelectionToolbarProps) {
  const { strands, totalWords, clearAll, showSelectionToolbar, setShowSelectionToolbar } = useSelectedStrands()
  const [isExpanded, setIsExpanded] = useState(true)
  const [useLLM, setUseLLM] = useState(false)
  
  const hasSelection = strands.length > 0
  const isVisible = hasSelection && showSelectionToolbar
  
  // Aggregate unique tags from selection
  const uniqueTags = React.useMemo(() => {
    const tags = new Set<string>()
    strands.forEach(s => s.tags?.forEach(t => tags.add(t)))
    return Array.from(tags).slice(0, 5) // Show max 5
  }, [strands])
  
  const handleGenerateFlashcards = useCallback(async () => {
    await onGenerateFlashcards?.({ useLLM })
  }, [onGenerateFlashcards, useLLM])
  
  const handleGenerateQuiz = useCallback(async () => {
    await onGenerateQuiz?.({ useLLM })
  }, [onGenerateQuiz, useLLM])
  
  const handleGenerateGlossary = useCallback(async () => {
    await onGenerateGlossary?.({ useLLM })
  }, [onGenerateGlossary, useLLM])
  
  const handleClose = useCallback(() => {
    setShowSelectionToolbar(false)
  }, [setShowSelectionToolbar])
  
  const anyLoading = isGenerating.flashcards || isGenerating.quiz || isGenerating.glossary
  
  if (position === 'fixed') {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`
              fixed bottom-4 left-1/2 -translate-x-1/2 z-[100]
              rounded-2xl shadow-2xl overflow-hidden
              ${isDark
                ? 'bg-zinc-900 border border-zinc-700'
                : 'bg-white border border-zinc-200'
              }
            `}
            style={{ maxWidth: 'calc(100vw - 2rem)' }}
          >
            {/* Header */}
            <div className={`
              px-4 py-3 flex items-center gap-3 border-b
              ${isDark ? 'border-zinc-800' : 'border-zinc-100'}
            `}>
              <div className={`
                p-1.5 rounded-lg
                ${isDark ? 'bg-cyan-900/50' : 'bg-cyan-50'}
              `}>
                <FileStack className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {strands.length} strand{strands.length !== 1 ? 's' : ''} selected
                  </span>
                  <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    • {totalWords.toLocaleString()} words
                  </span>
                </div>
                
                {/* Tags preview */}
                {uniqueTags.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Tag className={`w-3 h-3 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
                    <div className="flex gap-1 overflow-hidden">
                      {uniqueTags.map(tag => (
                        <span
                          key={tag}
                          className={`
                            text-[10px] px-1.5 py-0.5 rounded truncate
                            ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}
                          `}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* LLM Toggle */}
              <button
                onClick={() => setUseLLM(!useLLM)}
                className={`
                  flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors
                  ${useLLM
                    ? isDark
                      ? 'bg-purple-900/50 text-purple-400'
                      : 'bg-purple-100 text-purple-600'
                    : isDark
                      ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                      : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
                  }
                `}
                title={useLLM ? 'LLM Enhanced (slower, higher quality)' : 'NLP Only (faster)'}
              >
                {useLLM ? <Sparkles className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                {useLLM ? 'LLM' : 'NLP'}
              </button>
              
              {/* Expand/Collapse */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`
                  p-1.5 rounded-lg transition-colors
                  ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}
                `}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              
              {/* Close */}
              <button
                onClick={handleClose}
                className={`
                  p-1.5 rounded-lg transition-colors
                  ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}
                `}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Actions */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 flex gap-2">
                    {/* Open Learning Studio */}
                    {onOpenLearningStudio && (
                      <button
                        onClick={onOpenLearningStudio}
                        className={`
                          flex items-center gap-2 px-4 py-2.5 rounded-xl
                          text-sm font-semibold transition-all
                          bg-gradient-to-r from-cyan-600 to-emerald-600 text-white
                          shadow-lg shadow-cyan-500/20
                          hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                        `}
                      >
                        <GraduationCap className="w-4 h-4" />
                        Open Studio
                      </button>
                    )}
                    
                    {/* Quick Generate Actions */}
                    {onGenerateFlashcards && (
                      <button
                        onClick={handleGenerateFlashcards}
                        disabled={anyLoading}
                        className={`
                          flex items-center gap-1.5 px-3 py-2.5 rounded-xl
                          text-sm font-medium transition-colors
                          ${isDark
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50'
                            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 disabled:opacity-50'
                          }
                        `}
                      >
                        {isGenerating.flashcards ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CreditCard className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">Cards</span>
                      </button>
                    )}
                    
                    {onGenerateQuiz && (
                      <button
                        onClick={handleGenerateQuiz}
                        disabled={anyLoading}
                        className={`
                          flex items-center gap-1.5 px-3 py-2.5 rounded-xl
                          text-sm font-medium transition-colors
                          ${isDark
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50'
                            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 disabled:opacity-50'
                          }
                        `}
                      >
                        {isGenerating.quiz ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <HelpCircle className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">Quiz</span>
                      </button>
                    )}
                    
                    {onGenerateGlossary && (
                      <button
                        onClick={handleGenerateGlossary}
                        disabled={anyLoading}
                        className={`
                          flex items-center gap-1.5 px-3 py-2.5 rounded-xl
                          text-sm font-medium transition-colors
                          ${isDark
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50'
                            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 disabled:opacity-50'
                          }
                        `}
                      >
                        {isGenerating.glossary ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Book className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">Glossary</span>
                      </button>
                    )}
                    
                    {/* Clear Selection */}
                    <button
                      onClick={clearAll}
                      className={`
                        ml-auto flex items-center gap-1.5 px-3 py-2.5 rounded-xl
                        text-sm font-medium transition-colors
                        ${isDark
                          ? 'text-red-400 hover:bg-red-900/30'
                          : 'text-red-500 hover:bg-red-50'
                        }
                      `}
                    >
                      <X className="w-4 h-4" />
                      <span className="hidden sm:inline">Clear</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }
  
  // Inline variant
  return (
    <div className={`
      rounded-xl p-3 space-y-3
      ${isDark
        ? 'bg-zinc-800/50 border border-zinc-700'
        : 'bg-zinc-50 border border-zinc-200'
      }
    `}>
      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileStack className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
          <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
            {strands.length} strand{strands.length !== 1 ? 's' : ''}
          </span>
          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            • {totalWords.toLocaleString()} words
          </span>
        </div>
        
        <button
          onClick={() => setUseLLM(!useLLM)}
          className={`
            flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors
            ${useLLM
              ? isDark ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-100 text-purple-600'
              : isDark ? 'text-zinc-500' : 'text-zinc-400'
            }
          `}
        >
          {useLLM ? <Sparkles className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
          {useLLM ? 'LLM' : 'NLP'}
        </button>
      </div>
      
      {/* Tags */}
      {uniqueTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {uniqueTags.map(tag => (
            <span
              key={tag}
              className={`
                text-[10px] px-1.5 py-0.5 rounded
                ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}
              `}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {onGenerateFlashcards && (
          <button
            onClick={handleGenerateFlashcards}
            disabled={anyLoading}
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors
              ${isDark
                ? 'bg-cyan-900/40 hover:bg-cyan-900/60 text-cyan-400'
                : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700'
              }
            `}
          >
            {isGenerating.flashcards ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
            Flashcards
          </button>
        )}
        
        {onGenerateQuiz && (
          <button
            onClick={handleGenerateQuiz}
            disabled={anyLoading}
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors
              ${isDark
                ? 'bg-violet-900/40 hover:bg-violet-900/60 text-violet-400'
                : 'bg-violet-50 hover:bg-violet-100 text-violet-700'
              }
            `}
          >
            {isGenerating.quiz ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HelpCircle className="w-3.5 h-3.5" />}
            Quiz
          </button>
        )}
        
        {onGenerateGlossary && (
          <button
            onClick={handleGenerateGlossary}
            disabled={anyLoading}
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors
              ${isDark
                ? 'bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-400'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
              }
            `}
          >
            {isGenerating.glossary ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Book className="w-3.5 h-3.5" />}
            Glossary
          </button>
        )}
      </div>
    </div>
  )
}

export default SelectionToolbar

