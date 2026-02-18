/**
 * Bento Prompt Card Component
 * @module components/quarry/ui/BentoPromptCard
 *
 * Variable-size prompt card for bento grid layout.
 * Supports featured (2x2), regular (1x1), and compact sizes.
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Play, Sparkles } from 'lucide-react'
import type { ThemeName } from '@/types/theme'
import type { GalleryPrompt } from '@/lib/prompts/types'
import { CATEGORY_DISPLAY, MOOD_GRADIENTS } from '@/lib/prompts/types'
import { cn } from '@/lib/utils'
import { Tooltip } from '../common/Tooltip'

export type BentoCardSize = 'featured' | 'regular' | 'compact'

interface BentoPromptCardProps {
  /** The prompt to display */
  prompt: GalleryPrompt
  /** Card size variant */
  size?: BentoCardSize
  /** Current theme */
  theme?: ThemeName
  /** Click handler for card */
  onClick?: () => void
  /** Use prompt handler */
  onUse?: () => void
  /** Toggle favorite handler */
  onToggleFavorite?: () => void
}

/**
 * Bento-style prompt card with variable sizes
 */
export default function BentoPromptCard({
  prompt,
  size = 'regular',
  theme = 'light',
  onClick,
  onUse,
  onToggleFavorite,
}: BentoPromptCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const isDark = theme.includes('dark')

  const categoryDisplay = CATEGORY_DISPLAY[prompt.category]
  const moodGradient = prompt.mood?.[0]
    ? MOOD_GRADIENTS[prompt.mood[0]]
    : categoryDisplay?.gradient || 'from-blue-500/20 to-purple-500/20'

  const hasImage = !!prompt.imageUrl && !imageError

  // Size-specific styles
  const sizeConfig = {
    featured: {
      aspect: 'aspect-[4/3]', // Wider featured cards
      textSize: 'text-base md:text-lg',
      lines: 'line-clamp-3',
      padding: 'p-4',
      badgeSize: 'text-sm',
      iconSize: 'w-6 h-6',
      showMood: true,
      showStats: true,
    },
    regular: {
      aspect: 'aspect-[4/5]', // Balanced aspect ratio for regular cards
      textSize: 'text-sm',
      lines: 'line-clamp-2',
      padding: 'p-3',
      badgeSize: 'text-xs',
      iconSize: 'w-5 h-5',
      showMood: true,
      showStats: false,
    },
    compact: {
      aspect: 'aspect-[16/9]', // Standard widescreen aspect
      textSize: 'text-xs',
      lines: 'line-clamp-1',
      padding: 'p-2',
      badgeSize: 'text-[10px]',
      iconSize: 'w-4 h-4',
      showMood: false,
      showStats: false,
    },
  }

  const config = sizeConfig[size]

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative rounded-xl overflow-hidden cursor-pointer group',
        'shadow-lg hover:shadow-xl transition-all duration-300',
        'touch-manipulation', // Faster touch response on mobile
        isDark ? 'bg-zinc-800/80' : 'bg-white',
        size === 'featured' && 'col-span-2 row-span-2',
      )}
      onClick={onClick}
    >
      {/* Image Container */}
      <div className={cn('relative overflow-hidden', config.aspect)}>
        {hasImage ? (
          <>
            <img
              src={prompt.imageUrl}
              alt=""
              loading="lazy"
              className={cn(
                'w-full h-full object-cover transition-all duration-500',
                imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105',
                'group-hover:scale-110'
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
            {/* Gradient overlay - stronger for text readability */}
            {imageLoaded && (
              <>
                {/* Cohesive warm tint filter */}
                <div className="absolute inset-0 bg-amber-900/[0.08] mix-blend-multiply pointer-events-none" />
                {/* Text readability gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10 pointer-events-none" />
              </>
            )}
            {!imageLoaded && (
              <div className={cn('absolute inset-0 bg-gradient-to-br animate-pulse', moodGradient)} />
            )}
          </>
        ) : (
          <div className={cn(
            'absolute inset-0 bg-gradient-to-br flex items-center justify-center',
            moodGradient
          )}>
            <Sparkles className={cn(
              isDark ? 'text-white/30' : 'text-gray-400/40',
              size === 'featured' ? 'w-12 h-12' : 'w-8 h-8'
            )} />
          </div>
        )}

        {/* Hover Overlay with Actions */}
        <div className={cn(
          'absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100',
          'transition-opacity duration-200 flex items-center justify-center gap-3'
        )}>
          <Tooltip
            content="Start Writing"
            description="Begin a new writing session with this prompt"
            shortcut="Enter"
            placement="top"
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation()
                onUse?.()
              }}
              aria-label="Use this prompt to start writing"
              className={cn(
                'rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors',
                'min-w-[44px] min-h-[44px] flex items-center justify-center',
                'focus:outline-none focus:ring-2 focus:ring-white/50',
                size === 'featured' ? 'p-4' : 'p-3'
              )}
            >
              <Play className={config.iconSize} />
            </motion.button>
          </Tooltip>
          <Tooltip
            content={prompt.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
            description={prompt.isFavorite
              ? 'Remove from your favorites'
              : 'Save for quick access later'}
            shortcut="f"
            placement="top"
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite?.()
              }}
              aria-label={prompt.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={prompt.isFavorite}
              className={cn(
                'rounded-full transition-colors',
                'min-w-[44px] min-h-[44px] flex items-center justify-center',
                'focus:outline-none focus:ring-2 focus:ring-white/50',
                size === 'featured' ? 'p-4' : 'p-3',
                prompt.isFavorite
                  ? 'bg-red-500/80 hover:bg-red-500 text-white'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              )}
            >
              <Heart className={cn(config.iconSize, prompt.isFavorite && 'fill-current')} />
            </motion.button>
          </Tooltip>
        </div>

        {/* Favorite Badge - clickable for quick unfavorite */}
        {prompt.isFavorite && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite?.()
            }}
            className={cn(
              'absolute top-2 right-2 p-1.5 rounded-full transition-all',
              'bg-red-500/90 hover:bg-red-600 text-white shadow-lg',
              'group-hover:opacity-100'
            )}
            aria-label="Remove from favorites"
          >
            <Heart className="w-4 h-4 fill-current" />
          </motion.button>
        )}

        {/* Category Badge - solid background for readability */}
        <div className={cn(
          'absolute bottom-2 left-2 px-2.5 py-1 rounded-full font-medium',
          'flex items-center gap-1.5 shadow-md',
          config.badgeSize,
          'bg-white text-gray-800'
        )}>
          <span>{categoryDisplay?.emoji}</span>
          {size !== 'compact' && (
            <span className="capitalize">{categoryDisplay?.label || prompt.category}</span>
          )}
        </div>

        {/* Custom Badge */}
        {prompt.isCustom && (
          <div className={cn(
            'absolute top-2 left-2 px-2 py-0.5 rounded-full',
            config.badgeSize,
            isDark ? 'bg-purple-500/80 text-white' : 'bg-purple-100 text-purple-700'
          )}>
            Custom
          </div>
        )}

        {/* Prompt text overlay for cards with images - positioned above badge */}
        {hasImage && imageLoaded && (
          <div className={cn(
            'absolute left-0 right-0',
            config.padding,
            'pointer-events-none',
            size === 'featured' ? 'bottom-12' : 'bottom-10'
          )}>
            <p className={cn(
              'text-white font-semibold leading-tight',
              '[text-shadow:_0_2px_8px_rgba(0,0,0,0.8),_0_1px_3px_rgba(0,0,0,0.9)]',
              config.textSize,
              config.lines
            )}>
              {prompt.text}
            </p>
          </div>
        )}
      </div>

      {/* Text section for cards without images */}
      {(!hasImage || !imageLoaded) && (
        <div className={config.padding}>
          <p className={cn(
            'leading-relaxed',
            config.textSize,
            config.lines,
            isDark ? 'text-gray-300' : 'text-gray-700'
          )}>
            {prompt.text}
          </p>
        </div>
      )}

      {/* Footer with mood and stats */}
      {(config.showMood || config.showStats) && (
        <div className={cn(
          'flex items-center justify-between',
          config.padding,
          'pt-0'
        )}>
          {config.showMood && prompt.mood?.[0] && (
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-gray-100 text-gray-500'
            )}>
              {prompt.mood[0]}
            </span>
          )}
          {config.showStats && prompt.useCount > 0 && (
            <span className={cn(
              'text-xs',
              isDark ? 'text-zinc-500' : 'text-gray-400'
            )}>
              Used {prompt.useCount}x
            </span>
          )}
        </div>
      )}
    </motion.div>
  )
}
