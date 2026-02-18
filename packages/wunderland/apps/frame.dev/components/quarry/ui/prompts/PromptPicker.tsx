/**
 * PromptPicker - Browse, filter, and select writing prompts
 * @module codex/ui/PromptPicker
 *
 * @description
 * Modal/panel for browsing and selecting prompts with:
 * - Category filtering
 * - Mood-based suggestions
 * - Random prompt selection
 * - Search functionality
 */

'use client'

console.log('[PromptPicker] MODULE LOADING START', Date.now())

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  X, 
  Shuffle, 
  Sparkles, 
  Filter,
  ChevronDown,
  Check,
  Lightbulb
} from 'lucide-react'
import { 
  getPromptsByCategory, 
  getPromptsByMood, 
  getRandomPrompt, 
  WRITING_PROMPTS,
  PROMPT_CATEGORIES,
  type WritingPrompt,
  type PromptCategory 
} from '@/lib/codex/prompts'
import { getCurrentMood, type MoodState } from '@/lib/codex/mood'

interface PromptPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelectPrompt: (prompt: WritingPrompt) => void
  currentMood?: MoodState
  theme?: 'light' | 'dark'
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  advanced: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
}

export default function PromptPicker({ 
  isOpen, 
  onClose, 
  onSelectPrompt,
  currentMood,
  theme = 'light'
}: PromptPickerProps) {
  const isDark = theme === 'dark'
  
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | 'all'>('all')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [hoveredPrompt, setHoveredPrompt] = useState<string | null>(null)
  
  // Get mood if not provided
  const activeMood = currentMood ?? getCurrentMood() ?? undefined
  
  // Filter prompts
  const filteredPrompts = useMemo(() => {
    let prompts = [...WRITING_PROMPTS]
    
    // Filter by category
    if (selectedCategory !== 'all') {
      prompts = getPromptsByCategory(selectedCategory)
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      prompts = prompts.filter(p => 
        p.text.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        (p.tags?.some(t => t.toLowerCase().includes(query)) ?? false)
      )
    }
    
    // Sort: mood-matching prompts first
    if (activeMood) {
      prompts.sort((a, b) => {
        const aMatchesMood = a.mood?.includes(activeMood) ? 1 : 0
        const bMatchesMood = b.mood?.includes(activeMood) ? 1 : 0
        return bMatchesMood - aMatchesMood
      })
    }
    
    return prompts
  }, [searchQuery, selectedCategory, activeMood])
  
  // Mood-specific prompts
  const moodPrompts = useMemo(() => {
    if (!activeMood) return []
    return getPromptsByMood(activeMood).slice(0, 5)
  }, [activeMood])
  
  // Get random prompt
  const handleRandomPrompt = useCallback(() => {
    const prompt = getRandomPrompt({ 
      mood: activeMood,
      category: selectedCategory !== 'all' ? selectedCategory : undefined
    })
    onSelectPrompt(prompt)
    onClose()
  }, [activeMood, selectedCategory, onSelectPrompt, onClose])
  
  // Handle prompt selection
  const handleSelectPrompt = useCallback((prompt: WritingPrompt) => {
    onSelectPrompt(prompt)
    onClose()
  }, [onSelectPrompt, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`
              fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              w-full max-w-2xl max-h-[85vh] z-50
              rounded-2xl shadow-2xl overflow-hidden
              flex flex-col
              ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}
            `}
          >
            {/* Header */}
            <div className={`
              px-6 py-4 border-b flex-shrink-0
              ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
            `}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center
                    ${isDark ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20' : 'bg-gradient-to-br from-cyan-50 to-purple-50'}
                  `}>
                    <Lightbulb className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  </div>
                  <div>
                    <h2 className={`text-lg font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      Choose a Writing Prompt
                    </h2>
                    <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {filteredPrompts.length} prompts available
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className={`
                    p-2 rounded-lg transition-colors
                    ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}
                  `}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Search and Filters */}
              <div className="flex gap-3">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className={`
                    absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4
                    ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
                  `} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search prompts..."
                    className={`
                      w-full pl-10 pr-4 py-2.5 rounded-lg text-sm
                      ${isDark 
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500' 
                        : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
                      }
                      border focus:outline-none focus:ring-2 focus:ring-cyan-500/30
                    `}
                  />
                </div>
                
                {/* Category Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium
                      ${isDark 
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700' 
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                      }
                    `}
                  >
                    <Filter className="w-4 h-4" />
                    {selectedCategory === 'all' ? 'All Categories' : PROMPT_CATEGORIES[selectedCategory].label}
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  
                  <AnimatePresence>
                    {showCategoryDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`
                          absolute right-0 top-full mt-2 w-64 rounded-xl shadow-xl z-10
                          ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'}
                        `}
                      >
                        <div className="p-2 max-h-72 overflow-y-auto">
                          <button
                            onClick={() => {
                              setSelectedCategory('all')
                              setShowCategoryDropdown(false)
                            }}
                            className={`
                              w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left
                              ${selectedCategory === 'all'
                                ? isDark ? 'bg-cyan-900/30 text-cyan-300' : 'bg-cyan-50 text-cyan-700'
                                : isDark ? 'hover:bg-zinc-700 text-zinc-200' : 'hover:bg-zinc-50 text-zinc-700'
                              }
                            `}
                          >
                            <span className="text-lg">📚</span>
                            <span className="flex-1">All Categories</span>
                            {selectedCategory === 'all' && <Check className="w-4 h-4" />}
                          </button>
                          
                          {Object.entries(PROMPT_CATEGORIES).map(([key, config]) => (
                            <button
                              key={key}
                              onClick={() => {
                                setSelectedCategory(key as PromptCategory)
                                setShowCategoryDropdown(false)
                              }}
                              className={`
                                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left
                                ${selectedCategory === key
                                  ? isDark ? 'bg-cyan-900/30 text-cyan-300' : 'bg-cyan-50 text-cyan-700'
                                  : isDark ? 'hover:bg-zinc-700 text-zinc-200' : 'hover:bg-zinc-50 text-zinc-700'
                                }
                              `}
                            >
                              <span className="text-lg">{config.emoji}</span>
                              <span className="flex-1">{config.label}</span>
                              {selectedCategory === key && <Check className="w-4 h-4" />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Random Button */}
                <button
                  onClick={handleRandomPrompt}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
                    bg-gradient-to-r from-cyan-500 to-purple-500 text-white
                    hover:from-cyan-400 hover:to-purple-400
                    shadow-lg shadow-cyan-500/20
                    transition-all
                  `}
                >
                  <Shuffle className="w-4 h-4" />
                  Random
                </button>
              </div>
            </div>
            
            {/* Mood Suggestions (if active mood) */}
            {activeMood && moodPrompts.length > 0 && (
              <div className={`
                px-6 py-3 border-b flex-shrink-0
                ${isDark ? 'border-zinc-800 bg-zinc-800/50' : 'border-zinc-100 bg-zinc-50'}
              `}>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                  <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Suggested for your {activeMood} mood
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {moodPrompts.map((prompt) => (
                    <button
                      key={prompt.id}
                      onClick={() => handleSelectPrompt(prompt)}
                      className={`
                        flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
                        transition-all
                        ${isDark 
                          ? 'bg-amber-900/30 text-amber-300 hover:bg-amber-900/50' 
                          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        }
                      `}
                    >
                      {prompt.text.length > 40 ? prompt.text.slice(0, 40) + '...' : prompt.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Prompt List */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredPrompts.length === 0 ? (
                <div className={`text-center py-12 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No prompts found</p>
                  <p className="text-sm mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPrompts.map((prompt) => {
                    const categoryConfig = PROMPT_CATEGORIES[prompt.category]
                    const isHovered = hoveredPrompt === prompt.id
                    const matchesMood = activeMood && prompt.mood?.includes(activeMood)
                    
                    return (
                      <motion.button
                        key={prompt.id}
                        onClick={() => handleSelectPrompt(prompt)}
                        onMouseEnter={() => setHoveredPrompt(prompt.id)}
                        onMouseLeave={() => setHoveredPrompt(null)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`
                          w-full text-left p-4 rounded-xl border transition-all
                          ${isDark 
                            ? `${isHovered ? 'bg-zinc-800 border-cyan-700' : 'bg-zinc-800/50 border-zinc-700'}`
                            : `${isHovered ? 'bg-cyan-50 border-cyan-300' : 'bg-zinc-50 border-zinc-200'}`
                          }
                          ${matchesMood ? 'ring-2 ring-amber-500/30' : ''}
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl flex-shrink-0 mt-0.5">{categoryConfig.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium leading-relaxed ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                              {prompt.text}
                            </p>
                            
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {/* Category */}
                              <span className={`
                                px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide
                                ${isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-600'}
                              `}>
                                {categoryConfig.label}
                              </span>
                              
                              {/* Difficulty */}
                              {prompt.difficulty && (
                                <span className={`
                                  px-2 py-0.5 rounded text-[10px] font-medium capitalize
                                  ${DIFFICULTY_COLORS[prompt.difficulty]}
                                `}>
                                  {prompt.difficulty}
                                </span>
                              )}
                              
                              {/* Mood Match */}
                              {matchesMood && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                                  ✨ Matches mood
                                </span>
                              )}
                              
                              {/* Tags */}
                              {prompt.tags?.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className={`
                                    px-1.5 py-0.5 rounded text-[10px]
                                    ${isDark ? 'bg-zinc-700/50 text-zinc-500' : 'bg-zinc-100 text-zinc-500'}
                                  `}
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

