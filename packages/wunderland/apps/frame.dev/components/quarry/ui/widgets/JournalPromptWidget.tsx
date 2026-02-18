/**
 * Journal Prompt Widget Component
 * @module components/quarry/ui/JournalPromptWidget
 *
 * Sidebar widget showing today's writing prompt with alternatives.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, RefreshCw, ChevronRight, Wand2, ArrowRight } from 'lucide-react'
import type { ThemeName } from '@/types/theme'
import type { GalleryPrompt, ImageStyle } from '@/lib/prompts/types'
import { MOOD_GRADIENTS, CATEGORY_DISPLAY } from '@/lib/prompts/types'
import { getPromptManager, type PromptManager } from '@/lib/prompts'

interface JournalPromptWidgetProps {
  /** Current theme */
  theme?: ThemeName
  /** Callback when a prompt is selected */
  onSelectPrompt?: (prompt: GalleryPrompt) => void
  /** Compact mode (smaller widget) */
  compact?: boolean
}

/**
 * Daily writing prompt suggestion widget
 */
export default function JournalPromptWidget({
  theme = 'light',
  onSelectPrompt,
  compact = false,
}: JournalPromptWidgetProps) {
  const [manager, setManager] = useState<PromptManager | null>(null)
  const [dailyPrompt, setDailyPrompt] = useState<GalleryPrompt | null>(null)
  const [alternatives, setAlternatives] = useState<GalleryPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [canGenerateImages, setCanGenerateImages] = useState(false)

  const isDark = theme.includes('dark')

  // Initialize
  useEffect(() => {
    const init = async () => {
      const mgr = await getPromptManager()
      setManager(mgr)
      setCanGenerateImages(mgr.canGenerateImages())
      await loadDailyPrompt(mgr)
    }
    init()
  }, [])

  const loadDailyPrompt = async (mgr: PromptManager) => {
    setLoading(true)
    try {
      const prompt = await mgr.getDailyPrompt()
      setDailyPrompt(prompt)

      // Load alternatives
      const alts = await mgr.getDailyAlternatives(undefined, 2)
      setAlternatives(alts)
    } catch (error) {
      console.error('[JournalPromptWidget] Failed to load daily prompt:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateImage = async () => {
    if (!dailyPrompt || !manager) return
    setGeneratingImage(true)
    try {
      await manager.ensureImage(dailyPrompt.id)
      const updated = await manager.getPrompt(dailyPrompt.id)
      if (updated) setDailyPrompt(updated)
    } finally {
      setGeneratingImage(false)
    }
  }

  const handleSelectPrompt = async (prompt: GalleryPrompt) => {
    if (!manager) return
    await manager.usePrompt(prompt.id)
    onSelectPrompt?.(prompt)
  }

  const handleSelectAlternative = async (prompt: GalleryPrompt) => {
    setDailyPrompt(prompt)
    handleSelectPrompt(prompt)
  }

  if (loading) {
    return (
      <div
        className={`
          p-4 rounded-xl animate-pulse
          ${isDark ? 'bg-gray-800' : 'bg-white'}
        `}
      >
        <div className={`h-24 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
        <div className={`h-4 mt-3 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'} w-3/4`} />
        <div className={`h-4 mt-2 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'} w-1/2`} />
      </div>
    )
  }

  if (!dailyPrompt) return null

  const categoryDisplay = CATEGORY_DISPLAY[dailyPrompt.category]
  const moodGradient = dailyPrompt.mood?.[0]
    ? MOOD_GRADIENTS[dailyPrompt.mood[0]]
    : categoryDisplay?.gradient || 'from-blue-500/20 to-purple-500/20'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        rounded-xl overflow-hidden shadow-lg
        ${isDark ? 'bg-gray-800' : 'bg-white'}
      `}
    >
      {/* Image or Gradient Header */}
      <div className={`relative ${compact ? 'h-24' : 'h-32'}`}>
        {dailyPrompt.imageUrl ? (
          <img
            src={dailyPrompt.imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`
              w-full h-full bg-gradient-to-br ${moodGradient}
              flex items-center justify-center
            `}
          >
            {generatingImage ? (
              <RefreshCw className={`w-8 h-8 animate-spin ${isDark ? 'text-white/50' : 'text-gray-500/50'}`} />
            ) : canGenerateImages ? (
              <button
                onClick={generateImage}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg
                  ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/10 hover:bg-black/20'}
                  text-white text-sm transition-colors
                `}
              >
                <Wand2 className="w-4 h-4" />
                Generate Art
              </button>
            ) : (
              <Sparkles className={`w-10 h-10 ${isDark ? 'text-white/30' : 'text-gray-400/40'}`} />
            )}
          </div>
        )}

        {/* Today's Prompt Badge */}
        <div
          className={`
            absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1
            rounded-full backdrop-blur-sm text-xs font-medium
            ${isDark ? 'bg-black/30 text-white' : 'bg-white/80 text-gray-700'}
          `}
        >
          <Sparkles className="w-3 h-3" />
          Today's Prompt
        </div>

        {/* Category Badge */}
        <div
          className={`
            absolute bottom-2 right-2 px-2 py-1 rounded-full backdrop-blur-sm text-xs
            ${isDark ? 'bg-black/30 text-white' : 'bg-white/80 text-gray-700'}
          `}
        >
          {categoryDisplay?.emoji} {categoryDisplay?.label}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p
          className={`
            ${compact ? 'text-sm line-clamp-2' : 'text-base line-clamp-3'}
            leading-relaxed mb-4
            ${isDark ? 'text-gray-200' : 'text-gray-700'}
          `}
        >
          {dailyPrompt.text}
        </p>

        {/* Start Writing Button */}
        <button
          onClick={() => handleSelectPrompt(dailyPrompt)}
          className={`
            w-full flex items-center justify-center gap-2 py-2.5 rounded-lg
            font-medium text-sm transition-colors
            ${isDark
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
            }
          `}
        >
          Start Writing
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Alternatives */}
        {!compact && alternatives.length > 0 && (
          <div className={`mt-4 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <p className={`text-xs mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Or try these:
            </p>
            <div className="space-y-2">
              {alternatives.map((alt) => (
                <button
                  key={alt.id}
                  onClick={() => handleSelectAlternative(alt)}
                  className={`
                    w-full flex items-center gap-2 p-2 rounded-lg text-left
                    transition-colors group
                    ${isDark
                      ? 'hover:bg-gray-700/50 text-gray-400 hover:text-gray-200'
                      : 'hover:bg-gray-50 text-gray-500 hover:text-gray-700'
                    }
                  `}
                >
                  <span className="text-xs">{CATEGORY_DISPLAY[alt.category]?.emoji}</span>
                  <span className="flex-1 text-xs line-clamp-1">{alt.text}</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
