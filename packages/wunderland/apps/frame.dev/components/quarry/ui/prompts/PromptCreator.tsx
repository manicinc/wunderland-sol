/**
 * Prompt Creator Component
 * @module components/quarry/ui/PromptCreator
 *
 * Modal for creating custom writing prompts with optional image generation.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  X,
  Wand2,
  Sparkles,
  Check,
} from 'lucide-react'
import type { ThemeName } from '@/types/theme'
import type { GalleryPrompt, PromptCategory, ImageStyle } from '@/lib/prompts/types'
import { CATEGORY_DISPLAY, IMAGE_STYLES } from '@/lib/prompts/types'
import type { MoodState } from '@/lib/codex/mood'
import { MOOD_CONFIG } from '@/lib/codex/mood'
import { getPromptManager, type PromptManager } from '@/lib/prompts'

interface PromptCreatorProps {
  /** Current theme */
  theme?: ThemeName
  /** Close handler */
  onClose: () => void
  /** Created callback */
  onCreated: (prompt: GalleryPrompt) => void
  /** Whether image generation is available */
  canGenerateImage?: boolean
}

const DIFFICULTIES = [
  { id: 'beginner', label: 'Beginner', description: 'Quick, easy prompts' },
  { id: 'intermediate', label: 'Intermediate', description: 'More depth required' },
  { id: 'advanced', label: 'Advanced', description: 'Deep exploration' },
] as const

/**
 * Create custom writing prompts
 */
export default function PromptCreator({
  theme = 'light',
  onClose,
  onCreated,
  canGenerateImage = false,
}: PromptCreatorProps) {
  const [manager, setManager] = useState<PromptManager | null>(null)
  const [text, setText] = useState('')
  const [category, setCategory] = useState<PromptCategory>('reflection')
  const [moods, setMoods] = useState<MoodState[]>([])
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [generateImage, setGenerateImage] = useState(false)
  const [imageStyle, setImageStyle] = useState<ImageStyle>('watercolor')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDark = theme.includes('dark')

  useEffect(() => {
    const init = async () => {
      const mgr = await getPromptManager()
      setManager(mgr)
    }
    init()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manager || !text.trim()) return

    setError(null)
    setSaving(true)

    try {
      const prompt = await manager.createPrompt(
        text.trim(),
        category,
        moods.length > 0 ? moods : undefined,
        {
          difficulty,
          generateImage: generateImage && canGenerateImage,
          imageStyle,
        }
      )

      onCreated(prompt)
    } catch (err) {
      console.error('[PromptCreator] Failed to create prompt:', err)
      setError(err instanceof Error ? err.message : 'Failed to create prompt')
    } finally {
      setSaving(false)
    }
  }

  const toggleMood = (mood: MoodState) => {
    setMoods((prev) =>
      prev.includes(mood)
        ? prev.filter((m) => m !== mood)
        : [...prev, mood]
    )
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={`
          w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl
          ${isDark ? 'bg-gray-900' : 'bg-white'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <Sparkles className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Create Prompt
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
          >
            <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Prompt Text */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Prompt Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What would you like to reflect on?"
              rows={3}
              className={`
                w-full px-4 py-3 rounded-xl border resize-none
                ${isDark
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500/50
              `}
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Category
            </label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(CATEGORY_DISPLAY).map(([id, config]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCategory(id as PromptCategory)}
                  className={`
                    flex flex-col items-center gap-1 p-3 rounded-xl text-center transition-colors
                    ${category === id
                      ? isDark
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : isDark
                        ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                    }
                  `}
                >
                  <span className="text-lg">{config.emoji}</span>
                  <span className="text-xs">{config.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Moods */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Best for moods (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(MOOD_CONFIG) as MoodState[]).map((mood) => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => toggleMood(mood)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors
                    ${moods.includes(mood)
                      ? isDark
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-500 text-white'
                      : isDark
                        ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }
                  `}
                >
                  <span>{MOOD_CONFIG[mood].emoji}</span>
                  <span>{MOOD_CONFIG[mood].label}</span>
                  {moods.includes(mood) && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Difficulty
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDifficulty(d.id)}
                  className={`
                    p-3 rounded-xl text-center transition-colors
                    ${difficulty === d.id
                      ? isDark
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : isDark
                        ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                    }
                  `}
                >
                  <span className="block text-sm font-medium">{d.label}</span>
                  <span className={`block text-xs mt-0.5 ${difficulty === d.id ? 'text-white/80' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {d.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Image Option */}
          {canGenerateImage && (
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className={`
                    relative w-10 h-6 rounded-full transition-colors
                    ${generateImage
                      ? isDark ? 'bg-purple-600' : 'bg-purple-500'
                      : isDark ? 'bg-gray-700' : 'bg-gray-300'
                    }
                  `}
                  onClick={() => setGenerateImage(!generateImage)}
                >
                  <div
                    className={`
                      absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                      ${generateImage ? 'left-5' : 'left-1'}
                    `}
                  />
                </div>
                <div>
                  <span className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Generate illustration
                  </span>
                  <span className={`block text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Create AI artwork for this prompt
                  </span>
                </div>
              </label>

              {/* Style Selection */}
              {generateImage && (
                <div className="mt-3 pl-13">
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(IMAGE_STYLES).slice(0, 6).map(([id, config]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setImageStyle(id as ImageStyle)}
                        className={`
                          px-3 py-2 rounded-lg text-xs text-center transition-colors
                          ${imageStyle === id
                            ? isDark
                              ? 'bg-purple-600 text-white'
                              : 'bg-purple-500 text-white'
                            : isDark
                              ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                          }
                        `}
                      >
                        {config.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className={`p-3 rounded-lg text-sm ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'}`}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!text.trim() || saving}
            className={`
              w-full flex items-center justify-center gap-2 py-3 rounded-xl
              font-medium transition-colors disabled:opacity-50
              ${isDark
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              }
            `}
          >
            {saving ? (
              <>
                <Wand2 className="w-5 h-5 animate-spin" />
                {generateImage ? 'Creating & Generating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Create Prompt
              </>
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}
