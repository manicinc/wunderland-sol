/**
 * Daily Writing Prompt Component
 * @module codex/ui/DailyPrompt
 * 
 * Displays a writing prompt to inspire users to create new strands.
 * Features:
 * - One "prompt of the day" consistent for that day
 * - Up to 4 alternatives that won't repeat too soon (decay system)
 * - Mood-based personalization
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, Clock, ChevronDown, ChevronUp, Shuffle, Check } from 'lucide-react'
import { 
  PROMPT_CATEGORIES,
  type WritingPrompt,
  type PromptCategory 
} from '@/lib/codex/prompts'
import {
  getDailyPrompts,
  selectAlternativePrompt,
  type DailyPromptResult,
} from '@/lib/codex/dailyPrompts'
import { getCurrentMood, type MoodState } from '@/lib/codex/mood'

interface DailyPromptProps {
  /** Called when user wants to write from prompt */
  onStartWriting?: (prompt: WritingPrompt) => void
  /** Current mood (if not provided, fetched from storage) */
  mood?: MoodState | null
  /** Compact display mode */
  compact?: boolean
  /** Show category filter */
  showCategoryFilter?: boolean
  /** Current theme */
  theme?: string
}

/**
 * Daily prompt card with alternatives selection
 */
export default function DailyPrompt({
  onStartWriting,
  mood: propMood,
  compact = false,
  showCategoryFilter = false,
  theme = 'light',
}: DailyPromptProps) {
  const [promptData, setPromptData] = useState<DailyPromptResult | null>(null)
  const [showAlternatives, setShowAlternatives] = useState(false)
  
  // Get mood from props or storage
  const mood = propMood ?? getCurrentMood()
  const isDark = theme?.includes('dark')
  
  // Load daily prompts on mount
  useEffect(() => {
    const data = getDailyPrompts(mood ?? undefined)
    setPromptData(data)
  }, [mood])
  
  const handleSelectAlternative = useCallback((prompt: WritingPrompt) => {
    selectAlternativePrompt(prompt.id)
    setPromptData(prev => prev ? {
      ...prev,
      selected: prompt,
      isAlternativeSelected: prompt.id !== prev.primary.id,
    } : null)
    setShowAlternatives(false)
  }, [])
  
  if (!promptData) return null
  
  const { primary, alternatives, selected, isAlternativeSelected } = promptData
  const categoryConfig = PROMPT_CATEGORIES[selected.category]
  
  if (compact) {
    return (
      <motion.button
        onClick={() => onStartWriting?.(selected)}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full text-left p-3 rounded-lg bg-gradient-to-br from-emerald-50 to-cyan-50 
          dark:from-emerald-900/20 dark:to-cyan-900/20 
          border border-emerald-200/50 dark:border-emerald-800/50
          hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 group"
      >
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2">
              {selected.text}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] ${categoryConfig.color}`}>
                {categoryConfig.emoji} {categoryConfig.label}
              </span>
              {selected.estimatedTime && (
                <span className="text-[10px] text-zinc-400 flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {selected.estimatedTime}
                </span>
              )}
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-500 
            group-hover:translate-x-0.5 transition-all flex-shrink-0" />
        </div>
      </motion.button>
    )
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden"
    >
      {/* Main prompt card */}
      <div className="p-4 bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50 
        dark:from-emerald-900/20 dark:via-cyan-900/20 dark:to-blue-900/20
        border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/80 dark:bg-zinc-800/80">
              <Sparkles className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
              Today's Prompt
            </span>
            {isAlternativeSelected && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                Alt
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAlternatives(!showAlternatives)}
            className={`
              flex items-center gap-1 px-2 py-1 rounded-lg text-xs
              transition-colors
              ${showAlternatives
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'hover:bg-white/60 dark:hover:bg-zinc-800/60 text-zinc-500'
              }
            `}
            title="Show alternatives"
          >
            <Shuffle className="w-3 h-3" />
            <span className="hidden sm:inline">{alternatives.length} more</span>
          </button>
        </div>
        
        {/* Prompt text */}
        <motion.p
          key={selected.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-base text-zinc-800 dark:text-zinc-200 font-medium mb-3 leading-relaxed"
        >
          "{selected.text}"
        </motion.p>
        
        {/* Metadata */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium ${categoryConfig.color} 
              px-2 py-0.5 rounded-full bg-white/60 dark:bg-zinc-800/60`}>
              {categoryConfig.emoji} {categoryConfig.label}
            </span>
            {selected.estimatedTime && (
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {selected.estimatedTime}
              </span>
            )}
            {selected.difficulty && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded 
                ${selected.difficulty === 'beginner' 
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                  : selected.difficulty === 'intermediate'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                }`}>
                {selected.difficulty}
              </span>
            )}
          </div>
        </div>
        
        {/* Action button */}
        <motion.button
          onClick={() => onStartWriting?.(selected)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-4 rounded-lg
            bg-gradient-to-r from-emerald-500 to-cyan-500 
            hover:from-emerald-600 hover:to-cyan-600
            text-white font-medium text-sm shadow-sm
            hover:shadow-md transition-all duration-200"
        >
          <Sparkles className="w-4 h-4" />
          Start Writing
        </motion.button>
      </div>
      
      {/* Alternatives dropdown */}
      <AnimatePresence>
        {showAlternatives && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-1.5">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wide">
                  Today's Alternatives
                </span>
                <span className="text-[9px] text-zinc-400">
                  (won't repeat for a while)
                </span>
              </div>
              
              {/* Primary prompt option */}
              {isAlternativeSelected && (
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => handleSelectAlternative(primary)}
                  className={`
                    w-full text-left p-3 rounded-lg border transition-all duration-200 group
                    ${isDark 
                      ? 'border-zinc-700 hover:border-emerald-700 hover:bg-emerald-900/10' 
                      : 'border-zinc-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                    }
                  `}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-1">
                        {primary.text}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] ${PROMPT_CATEGORIES[primary.category].color}`}>
                          {PROMPT_CATEGORIES[primary.category].emoji} {PROMPT_CATEGORIES[primary.category].label}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                          Original
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              )}
              
              {/* Alternative prompts */}
              {alternatives.map((prompt, index) => {
                const isSelected = selected.id === prompt.id
                const promptCategory = PROMPT_CATEGORIES[prompt.category]
                
                return (
                  <motion.button
                    key={prompt.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => !isSelected && handleSelectAlternative(prompt)}
                    disabled={isSelected}
                    className={`
                      w-full text-left p-3 rounded-lg border transition-all duration-200 group
                      ${isSelected
                        ? isDark 
                          ? 'border-emerald-700 bg-emerald-900/20' 
                          : 'border-emerald-300 bg-emerald-50'
                        : isDark 
                          ? 'border-zinc-700 hover:border-violet-700 hover:bg-violet-900/10' 
                          : 'border-zinc-200 hover:border-violet-300 hover:bg-violet-50/50'
                      }
                    `}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-1">
                          {prompt.text}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] ${promptCategory.color}`}>
                            {promptCategory.emoji} {promptCategory.label}
                          </span>
                          {prompt.estimatedTime && (
                            <span className="text-[10px] text-zinc-400 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {prompt.estimatedTime}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      )}
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
