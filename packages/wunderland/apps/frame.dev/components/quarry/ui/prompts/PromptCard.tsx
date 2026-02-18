/**
 * Prompt Card Component
 * @module components/quarry/ui/PromptCard
 *
 * Individual prompt card with image, category badge, and hover actions.
 * Used in PromptGallery grid view.
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Play, Sparkles, Wand2 } from 'lucide-react'
import type { ThemeName } from '@/types/theme'
import type { GalleryPrompt } from '@/lib/prompts/types'
import { CATEGORY_DISPLAY, MOOD_GRADIENTS } from '@/lib/prompts/types'
import { Tooltip } from '../common/Tooltip'

interface PromptCardProps {
  /** The prompt to display */
  prompt: GalleryPrompt
  /** Current theme */
  theme?: ThemeName
  /** Click handler for card */
  onClick?: () => void
  /** Use prompt handler */
  onUse?: () => void
  /** Toggle favorite handler */
  onToggleFavorite?: () => void
  /** Generate image handler */
  onGenerateImage?: () => void
  /** Whether image generation is available */
  canGenerateImage?: boolean
  /** Whether image is currently being generated */
  isGenerating?: boolean
}

/**
 * Individual prompt card with image and actions
 */
export default function PromptCard({
  prompt,
  theme = 'light',
  onClick,
  onUse,
  onToggleFavorite,
  onGenerateImage,
  canGenerateImage = false,
  isGenerating = false,
}: PromptCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const isDark = theme.includes('dark')

  const categoryDisplay = CATEGORY_DISPLAY[prompt.category]
  const moodGradient = prompt.mood?.[0]
    ? MOOD_GRADIENTS[prompt.mood[0]]
    : categoryDisplay?.gradient || 'from-blue-500/20 to-purple-500/20'

  const hasImage = !!prompt.imageUrl && !imageError

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative rounded-xl overflow-hidden cursor-pointer group
        ${isDark ? 'bg-gray-800' : 'bg-white'}
        shadow-lg hover:shadow-xl transition-shadow
      `}
      onClick={onClick}
    >
      {/* Image or Gradient Placeholder */}
      <div className="aspect-square relative overflow-hidden">
        {hasImage ? (
          <>
            <img
              src={prompt.imageUrl}
              alt=""
              className={`
                w-full h-full object-cover transition-opacity duration-300
                ${imageLoaded ? 'opacity-100' : 'opacity-0'}
              `}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
            {/* Gradient overlay - stronger for text readability */}
            {imageLoaded && (
              <>
                {/* Cohesive warm tint filter */}
                <div className="absolute inset-0 bg-amber-900/[0.08] mix-blend-multiply pointer-events-none" />
                {/* Text readability gradient */}
                <div
                  className={`
                    absolute inset-0 bg-gradient-to-t
                    from-black/80 via-black/40 to-black/10
                    pointer-events-none
                  `}
                />
              </>
            )}
            {!imageLoaded && (
              <div className={`absolute inset-0 bg-gradient-to-br ${moodGradient} animate-pulse`} />
            )}
          </>
        ) : (
          <div
            className={`
              absolute inset-0 bg-gradient-to-br ${moodGradient}
              flex items-center justify-center
            `}
          >
            {isGenerating ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Wand2 className={`w-10 h-10 ${isDark ? 'text-white/40' : 'text-gray-500/50'}`} />
              </motion.div>
            ) : canGenerateImage ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onGenerateImage?.()
                }}
                className={`
                  flex flex-col items-center gap-2 p-4 rounded-xl
                  transition-all hover:scale-105
                  ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}
                `}
              >
                <Wand2 className={`w-8 h-8 ${isDark ? 'text-white/40' : 'text-gray-500/50'}`} />
                <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500/50'}`}>
                  Generate
                </span>
              </button>
            ) : (
              <Sparkles className={`w-10 h-10 ${isDark ? 'text-white/30' : 'text-gray-400/40'}`} />
            )}
          </div>
        )}

        {/* Hover Overlay with Actions */}
        <div
          className={`
            absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
            transition-opacity flex items-center justify-center gap-3
          `}
        >
          <Tooltip
            content="Start Writing"
            description="Begin a new writing session with this prompt as your starting point"
            shortcut="Enter"
            placement="top"
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                onUse?.()
              }}
              aria-label="Use this prompt to start writing"
              className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <Play className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip
            content={prompt.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
            description={prompt.isFavorite
              ? 'Remove from your favorites collection'
              : 'Save to favorites for quick access later'}
            shortcut="f"
            placement="top"
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite?.()
              }}
              aria-label={prompt.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={prompt.isFavorite}
              className={`
                p-3 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center
                focus:outline-none focus:ring-2 focus:ring-white/50
                ${prompt.isFavorite
                  ? 'bg-red-500/80 hover:bg-red-500 text-white'
                  : 'bg-white/20 hover:bg-white/30 text-white'
                }
              `}
            >
              <Heart className={`w-5 h-5 ${prompt.isFavorite ? 'fill-current' : ''}`} />
            </button>
          </Tooltip>
        </div>

        {/* Favorite Badge - clickable for quick unfavorite */}
        {prompt.isFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite?.()
            }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/90 hover:bg-red-600 text-white shadow-lg transition-all hover:scale-110 active:scale-95"
            aria-label="Remove from favorites"
          >
            <Heart className="w-4 h-4 fill-current" />
          </button>
        )}

        {/* Category Badge - solid background for readability */}
        <div
          className={`
            absolute bottom-2 left-2 px-2.5 py-1 rounded-full text-xs font-medium
            flex items-center gap-1.5 shadow-md
            bg-white text-gray-800
          `}
        >
          <span>{categoryDisplay?.emoji}</span>
          <span className="capitalize">{categoryDisplay?.label || prompt.category}</span>
        </div>

        {/* Custom Badge */}
        {prompt.isCustom && (
          <div
            className={`
              absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs
              ${isDark ? 'bg-purple-500/80 text-white' : 'bg-purple-100 text-purple-700'}
            `}
          >
            Custom
          </div>
        )}
      </div>

      {/* Text Preview */}
      <div className="p-3">
        <p
          className={`
            text-sm line-clamp-2 leading-relaxed
            ${isDark ? 'text-gray-300' : 'text-gray-700'}
          `}
        >
          {prompt.text}
        </p>

        {/* Footer with mood and stats */}
        <div className="flex items-center justify-between mt-2">
          {prompt.mood?.[0] && (
            <span
              className={`
                text-xs px-2 py-0.5 rounded-full
                ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}
              `}
            >
              {prompt.mood[0]}
            </span>
          )}
          {prompt.useCount > 0 && (
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Used {prompt.useCount}x
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
