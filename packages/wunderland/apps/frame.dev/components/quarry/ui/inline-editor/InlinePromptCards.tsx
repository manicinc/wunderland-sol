/**
 * InlinePromptCards - Compact, hover-expandable prompt selection
 * @module codex/ui/InlinePromptCards
 * 
 * @description
 * Minimal inline prompt cards that expand on hover/focus
 * Overlays the random facts section when expanded
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  ChevronRight,
  Shuffle,
  X,
  PenTool
} from 'lucide-react'
import { 
  getRandomPrompt, 
  WRITING_PROMPTS,
  PROMPT_CATEGORIES,
  type WritingPrompt,
} from '@/lib/codex/prompts'
import { getCurrentMood } from '@/lib/codex/mood'

interface InlinePromptCardsProps {
  onSelectPrompt: (prompt: WritingPrompt) => void
  onCreateStrand?: () => void
  theme?: string
  maxVisible?: number
}

const CARD_GRADIENTS = [
  'from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20',
  'from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20',
  'from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20',
  'from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20',
  'from-rose-500/10 to-red-500/10 hover:from-rose-500/20 hover:to-red-500/20',
]

export default function InlinePromptCards({ 
  onSelectPrompt,
  onCreateStrand,
  theme = 'light',
  maxVisible = 5
}: InlinePromptCardsProps) {
  const isDark = theme?.includes('dark')
  const [isExpanded, setIsExpanded] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedPrompt, setSelectedPrompt] = useState<WritingPrompt | null>(null)
  
  // Get mood-matched prompts for display
  const currentMood = getCurrentMood()
  const displayPrompts = React.useMemo(() => {
    let prompts = [...WRITING_PROMPTS]
    
    // Sort by mood match if available
    if (currentMood) {
      prompts.sort((a, b) => {
        const aMatch = a.mood?.includes(currentMood) ? 1 : 0
        const bMatch = b.mood?.includes(currentMood) ? 1 : 0
        return bMatch - aMatch
      })
    }
    
    // Shuffle for variety, but keep mood-matched ones first
    const moodMatched = prompts.filter(p => currentMood && p.mood?.includes(currentMood))
    const others = prompts.filter(p => !currentMood || !p.mood?.includes(currentMood))
    
    // Shuffle others
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]]
    }
    
    return [...moodMatched.slice(0, 2), ...others].slice(0, maxVisible)
  }, [currentMood, maxVisible])
  
  const handleRandomPrompt = useCallback(() => {
    const prompt = getRandomPrompt({ mood: currentMood || undefined })
    setSelectedPrompt(prompt)
    setIsExpanded(true)
  }, [currentMood])
  
  const handleSelectAndCreate = useCallback((prompt: WritingPrompt) => {
    onSelectPrompt(prompt)
    setIsExpanded(false)
    setSelectedPrompt(null)
    onCreateStrand?.()
  }, [onSelectPrompt, onCreateStrand])

  return (
    <div className="relative">
      {/* Collapsed State - Minimal Trigger */}
      <AnimatePresence mode="wait">
        {!isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2"
          >
            <button
              onClick={() => setIsExpanded(true)}
              aria-label="Open writing prompts"
              className={`
                group flex items-center gap-2 px-4 py-2.5 rounded-lg
                text-sm font-medium transition-all duration-200
                min-h-[44px]
                ${isDark
                  ? 'bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400 border border-zinc-700/50 hover:border-cyan-700/50'
                  : 'bg-white/60 hover:bg-white text-zinc-500 hover:text-cyan-600 border border-zinc-200/50 hover:border-cyan-300/50'
                }
                backdrop-blur-sm shadow-sm hover:shadow
                focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-transparent
              `}
            >
              <Sparkles className="w-4 h-4" />
              <span>Writing Prompts</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={handleRandomPrompt}
              aria-label="Get random writing prompt"
              className={`
                p-2.5 rounded-lg transition-all duration-200
                min-w-[44px] min-h-[44px] flex items-center justify-center
                ${isDark
                  ? 'bg-zinc-800/60 hover:bg-amber-900/40 text-zinc-500 hover:text-amber-400 border border-zinc-700/50 hover:border-amber-700/50'
                  : 'bg-white/60 hover:bg-amber-50 text-zinc-400 hover:text-amber-600 border border-zinc-200/50 hover:border-amber-300/50'
                }
                backdrop-blur-sm
                focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-transparent
              `}
              title="Random prompt"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded State - Card Grid Overlay */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`
              absolute top-0 left-0 right-0 z-30
              rounded-xl overflow-hidden
              ${isDark 
                ? 'bg-zinc-900/95 border border-zinc-700/80' 
                : 'bg-white/95 border border-zinc-200/80'
              }
              backdrop-blur-md shadow-xl
            `}
          >
            {/* Header */}
            <div className={`
              flex items-center justify-between px-3 py-2 border-b
              ${isDark ? 'border-zinc-800' : 'border-zinc-100'}
            `}>
              <div className="flex items-center gap-2">
                <Sparkles className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                <span className={`text-xs font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                  Choose a Prompt
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleRandomPrompt}
                  aria-label="Get random prompt"
                  className={`
                    p-2.5 rounded-lg transition-colors text-sm flex items-center gap-1.5
                    min-w-[44px] min-h-[44px] justify-center
                    ${isDark
                      ? 'hover:bg-amber-900/40 text-amber-400'
                      : 'hover:bg-amber-50 text-amber-600'
                    }
                    focus:outline-none focus:ring-2 focus:ring-amber-500/50
                  `}
                  title="Random"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsExpanded(false)
                    setSelectedPrompt(null)
                  }}
                  aria-label="Close prompt selector"
                  className={`
                    p-2.5 rounded-lg transition-colors
                    min-w-[44px] min-h-[44px] flex items-center justify-center
                    ${isDark ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'}
                    focus:outline-none focus:ring-2 focus:ring-zinc-500/50
                  `}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Selected Prompt Preview */}
            <AnimatePresence mode="wait">
              {selectedPrompt && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`
                    px-3 py-3 border-b
                    ${isDark 
                      ? 'bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border-cyan-800/30' 
                      : 'bg-gradient-to-r from-cyan-50 to-purple-50 border-cyan-200/50'
                    }
                  `}
                >
                  <p className={`text-sm leading-relaxed mb-3 ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
                    "{selectedPrompt.text}"
                  </p>
                  <button
                    onClick={() => handleSelectAndCreate(selectedPrompt)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                      bg-gradient-to-r from-cyan-500 to-purple-500 text-white
                      hover:from-cyan-400 hover:to-purple-400
                      shadow-lg shadow-cyan-500/20 transition-all
                    `}
                  >
                    <PenTool className="w-4 h-4" />
                    Start Writing
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Prompt Cards Grid */}
            <div className="p-2 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-1 gap-1.5">
                {displayPrompts.map((prompt, index) => {
                  const categoryConfig = PROMPT_CATEGORIES[prompt.category]
                  const isHovered = hoveredId === prompt.id
                  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length]
                  
                  return (
                    <motion.button
                      key={prompt.id}
                      onMouseEnter={() => setHoveredId(prompt.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => setSelectedPrompt(prompt)}
                      whileHover={{ x: 4 }}
                      className={`
                        relative w-full text-left px-3 py-2 rounded-lg
                        transition-all duration-200 overflow-hidden
                        bg-gradient-to-r ${gradient}
                        ${isDark ? 'border border-zinc-800' : 'border border-zinc-100'}
                        ${isHovered ? 'shadow-md' : ''}
                      `}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-base flex-shrink-0">{categoryConfig.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`
                            text-xs leading-relaxed line-clamp-2
                            ${isDark ? 'text-zinc-200' : 'text-zinc-700'}
                          `}>
                            {prompt.text}
                          </p>
                          
                          {/* Expand on hover to show more */}
                          <AnimatePresence>
                            {isHovered && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-center gap-1.5 mt-1.5"
                              >
                                <span className={`
                                  px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide
                                  ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200/80 text-zinc-600'}
                                `}>
                                  {categoryConfig.label}
                                </span>
                                {prompt.difficulty && (
                                  <span className={`
                                    px-1.5 py-0.5 rounded text-[9px] font-medium capitalize
                                    ${prompt.difficulty === 'beginner' 
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                      : prompt.difficulty === 'intermediate'
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                      : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                                    }
                                  `}>
                                    {prompt.difficulty}
                                  </span>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <ChevronRight className={`
                          w-3.5 h-3.5 flex-shrink-0 transition-all
                          ${isHovered 
                            ? isDark ? 'text-cyan-400 translate-x-0.5' : 'text-cyan-600 translate-x-0.5'
                            : isDark ? 'text-zinc-600' : 'text-zinc-400'
                          }
                        `} />
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

