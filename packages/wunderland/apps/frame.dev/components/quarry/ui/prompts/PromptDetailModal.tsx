/**
 * Prompt Detail Modal Component
 * @module components/quarry/ui/PromptDetailModal
 *
 * Full-screen modal for viewing prompt details with image and actions.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  X,
  Heart,
  Play,
  Wand2,
  Clock,
  Tag,
  Sparkles,
  RefreshCw,
  ChevronDown,
} from 'lucide-react'
import type { ThemeName } from '@/types/theme'
import type { GalleryPrompt, ImageStyle } from '@/lib/prompts/types'
import { CATEGORY_DISPLAY, IMAGE_STYLES, MOOD_GRADIENTS } from '@/lib/prompts/types'

interface PromptDetailModalProps {
  /** The prompt to display */
  prompt: GalleryPrompt
  /** Current theme */
  theme?: ThemeName
  /** Close handler */
  onClose: () => void
  /** Use prompt handler */
  onUse: () => void
  /** Toggle favorite handler */
  onToggleFavorite: () => void
  /** Regenerate image handler */
  onRegenerateImage?: (style: ImageStyle) => void
  /** Whether image generation is available */
  canGenerateImage?: boolean
  /** Whether image is currently being generated */
  isGenerating?: boolean
}

/**
 * Full prompt detail view with image and actions
 */
export default function PromptDetailModal({
  prompt,
  theme = 'light',
  onClose,
  onUse,
  onToggleFavorite,
  onRegenerateImage,
  canGenerateImage = false,
  isGenerating = false,
}: PromptDetailModalProps) {
  const [showStylePicker, setShowStylePicker] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const isDark = theme.includes('dark')

  const categoryDisplay = CATEGORY_DISPLAY[prompt.category]
  const moodGradient = prompt.mood?.[0]
    ? MOOD_GRADIENTS[prompt.mood[0]]
    : categoryDisplay?.gradient || 'from-blue-500/20 to-purple-500/20'

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

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
          w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl
          ${isDark ? 'bg-gray-900' : 'bg-white'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image Section */}
        <div className="relative aspect-video">
          {prompt.imageUrl ? (
            <>
              <img
                src={prompt.imageUrl}
                alt=""
                className={`
                  w-full h-full object-cover transition-opacity duration-300
                  ${imageLoaded ? 'opacity-100' : 'opacity-0'}
                `}
                onLoad={() => setImageLoaded(true)}
              />
              {!imageLoaded && (
                <div className={`absolute inset-0 bg-gradient-to-br ${moodGradient} animate-pulse`} />
              )}
            </>
          ) : (
            <div
              className={`
                w-full h-full bg-gradient-to-br ${moodGradient}
                flex items-center justify-center
              `}
            >
              {isGenerating ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Wand2 className={`w-16 h-16 ${isDark ? 'text-white/40' : 'text-gray-500/50'}`} />
                </motion.div>
              ) : (
                <Sparkles className={`w-16 h-16 ${isDark ? 'text-white/30' : 'text-gray-400/40'}`} />
              )}
            </div>
          )}

          {/* Close Button - 44x44 touch target */}
          <button
            onClick={onClose}
            className={`
              absolute top-3 right-3 min-w-[44px] min-h-[44px]
              flex items-center justify-center
              rounded-full backdrop-blur-sm transition-all
              ${isDark ? 'bg-black/30 hover:bg-black/50 active:bg-black/60' : 'bg-white/30 hover:bg-white/50 active:bg-white/60'}
              text-white active:scale-95 touch-manipulation
            `}
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Category & Custom Badges */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span
              className={`
                px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm
                ${isDark ? 'bg-black/30 text-white' : 'bg-white/80 text-gray-700'}
              `}
            >
              {categoryDisplay?.emoji} {categoryDisplay?.label}
            </span>
            {prompt.isCustom && (
              <span
                className={`
                  px-3 py-1 rounded-full text-sm font-medium
                  bg-purple-500/80 text-white backdrop-blur-sm
                `}
              >
                Custom
              </span>
            )}
          </div>

          {/* Regenerate Image Button */}
          {canGenerateImage && prompt.imageUrl && (
            <div className="absolute bottom-4 right-4">
              <div className="relative">
                <button
                  onClick={() => setShowStylePicker(!showStylePicker)}
                  disabled={isGenerating}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                    backdrop-blur-sm transition-colors
                    ${isDark ? 'bg-black/30 hover:bg-black/50 text-white' : 'bg-white/80 hover:bg-white text-gray-700'}
                    disabled:opacity-50
                  `}
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  Regenerate
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Style Picker */}
                {showStylePicker && !isGenerating && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`
                      absolute bottom-full right-0 mb-2 p-2 rounded-lg shadow-lg min-w-[180px]
                      ${isDark ? 'bg-gray-800' : 'bg-white'}
                    `}
                  >
                    {Object.entries(IMAGE_STYLES).map(([id, config]) => (
                      <button
                        key={id}
                        onClick={() => {
                          setShowStylePicker(false)
                          onRegenerateImage?.(id as ImageStyle)
                        }}
                        className={`
                          w-full px-3 py-2 rounded-lg text-sm text-left
                          ${isDark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'}
                          ${prompt.imageStyle === id
                            ? isDark ? 'bg-purple-900/50' : 'bg-purple-50'
                            : ''
                          }
                        `}
                      >
                        {config.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-6">
          {/* Prompt Text */}
          <p className={`text-xl leading-relaxed mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {prompt.text}
          </p>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {prompt.mood?.map((mood) => (
              <span
                key={mood}
                className={`
                  px-3 py-1 rounded-full text-sm
                  ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}
                `}
              >
                {mood}
              </span>
            ))}
            {prompt.difficulty && (
              <span
                className={`
                  px-3 py-1 rounded-full text-sm
                  ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}
                `}
              >
                {prompt.difficulty}
              </span>
            )}
            {prompt.estimatedTime && (
              <span
                className={`
                  flex items-center gap-1 px-3 py-1 rounded-full text-sm
                  ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}
                `}
              >
                <Clock className="w-3.5 h-3.5" />
                {prompt.estimatedTime}
              </span>
            )}
          </div>

          {/* Stats */}
          {(prompt.useCount > 0 || prompt.lastUsedAt) && (
            <div className={`mb-6 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {prompt.useCount > 0 && <span>Used {prompt.useCount} times</span>}
              {prompt.useCount > 0 && prompt.lastUsedAt && <span className="mx-2">·</span>}
              {prompt.lastUsedAt && (
                <span>Last used {new Date(prompt.lastUsedAt).toLocaleDateString()}</span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onUse}
              className={`
                flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                font-medium text-white transition-colors
                ${isDark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'}
              `}
            >
              <Play className="w-5 h-5" />
              Start Writing
            </button>

            <button
              onClick={onToggleFavorite}
              className={`
                p-3 rounded-xl transition-colors
                ${prompt.isFavorite
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : isDark
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }
              `}
            >
              <Heart className={`w-5 h-5 ${prompt.isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
