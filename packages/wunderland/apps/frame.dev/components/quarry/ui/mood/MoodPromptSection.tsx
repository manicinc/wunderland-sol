/**
 * Mood Prompt Section Component
 * @module components/quarry/ui/MoodPromptSection
 *
 * Hero section showing personalized prompts based on user's current mood.
 * Only renders when a mood is set for today.
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Play, Heart, ChevronRight } from 'lucide-react'
import type { ThemeName } from '@/types/theme'
import type { GalleryPrompt } from '@/lib/prompts/types'
import type { MoodState } from '@/lib/codex/mood'
import { MOOD_CONFIG } from '@/lib/codex/mood'
import { MOOD_GRADIENTS } from '@/lib/prompts/types'
import { cn } from '@/lib/utils'

interface MoodPromptSectionProps {
  /** Current mood state */
  mood: MoodState
  /** Prompts matching the mood (pre-filtered) */
  prompts: GalleryPrompt[]
  /** Current theme */
  theme?: ThemeName
  /** Click handler for selecting a prompt */
  onSelectPrompt?: (prompt: GalleryPrompt) => void
  /** Handler to start writing with a prompt */
  onUsePrompt?: (prompt: GalleryPrompt) => void
  /** Toggle favorite handler */
  onToggleFavorite?: (prompt: GalleryPrompt) => void
  /** Class name */
  className?: string
}

/**
 * Single mood prompt card (smaller variant for section)
 */
function MoodPromptCard({
  prompt,
  size = 'regular',
  theme = 'light',
  onClick,
  onUse,
}: {
  prompt: GalleryPrompt
  size?: 'featured' | 'regular'
  theme?: ThemeName
  onClick?: () => void
  onUse?: () => void
}) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const isDark = theme.includes('dark')
  const hasImage = !!prompt.imageUrl && !imageError

  const gradient = prompt.mood?.[0]
    ? MOOD_GRADIENTS[prompt.mood[0]]
    : 'from-blue-500/20 to-purple-500/20'

  const isFeatured = size === 'featured'

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative rounded-xl overflow-hidden cursor-pointer group',
        'shadow-lg hover:shadow-xl transition-all duration-300',
        isDark ? 'bg-zinc-800/80' : 'bg-white',
        isFeatured ? 'aspect-[4/3]' : 'aspect-square'
      )}
      onClick={onClick}
    >
      {/* Image or gradient */}
      <div className="absolute inset-0">
        {hasImage ? (
          <>
            <img
              src={prompt.imageUrl}
              alt=""
              loading="lazy"
              className={cn(
                'w-full h-full object-cover transition-all duration-500',
                imageLoaded ? 'opacity-100' : 'opacity-0',
                'group-hover:scale-105'
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          </>
        ) : (
          <div className={cn('w-full h-full bg-gradient-to-br', gradient)}>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className={cn(
                'opacity-30',
                isFeatured ? 'w-12 h-12' : 'w-8 h-8',
                isDark ? 'text-white' : 'text-gray-600'
              )} />
            </div>
          </div>
        )}
      </div>

      {/* Hover overlay */}
      <div className={cn(
        'absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100',
        'transition-opacity flex items-center justify-center'
      )}>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation()
            onUse?.()
          }}
          className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white"
        >
          <Play className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className={cn(
          'text-white font-medium leading-snug drop-shadow-lg',
          isFeatured ? 'text-base line-clamp-3' : 'text-sm line-clamp-2'
        )}>
          {prompt.text}
        </p>
      </div>

      {/* Favorite indicator */}
      {prompt.isFavorite && (
        <div className="absolute top-2 right-2">
          <Heart className="w-4 h-4 text-red-500 fill-red-500 drop-shadow-lg" />
        </div>
      )}
    </motion.div>
  )
}

/**
 * Mood-based prompt section with personalized recommendations
 */
export default function MoodPromptSection({
  mood,
  prompts,
  theme = 'light',
  onSelectPrompt,
  onUsePrompt,
  onToggleFavorite: _onToggleFavorite,
  className,
}: MoodPromptSectionProps) {
  const isDark = theme.includes('dark')
  const moodConfig = MOOD_CONFIG[mood]
  const moodGradient = MOOD_GRADIENTS[mood]

  // Show up to 4 prompts: 1 featured + 3 regular
  const displayPrompts = prompts.slice(0, 4)
  const featuredPrompt = displayPrompts[0]
  const regularPrompts = displayPrompts.slice(1)

  if (!featuredPrompt) {
    return null
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn('relative', className)}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex items-center justify-center w-10 h-10 rounded-xl',
            'bg-gradient-to-br',
            moodGradient.replace('/20', '/40')
          )}>
            <span className="text-xl">{moodConfig.emoji}</span>
          </div>
          <div>
            <h2 className={cn(
              'text-lg font-semibold',
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            )}>
              Feeling {moodConfig.label}?
            </h2>
            <p className={cn(
              'text-sm',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}>
              Prompts curated for your mood
            </p>
          </div>
        </div>

        {prompts.length > 4 && (
          <button
            onClick={() => {/* Could navigate to filtered view */}}
            className={cn(
              'flex items-center gap-1 text-sm font-medium',
              'px-3 py-1.5 rounded-lg transition-colors',
              isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
            )}
          >
            View all
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Prompt cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Featured (larger) card */}
        <div className="col-span-2 row-span-1">
          <MoodPromptCard
            prompt={featuredPrompt}
            size="featured"
            theme={theme}
            onClick={() => onSelectPrompt?.(featuredPrompt)}
            onUse={() => onUsePrompt?.(featuredPrompt)}
          />
        </div>

        {/* Regular cards */}
        {regularPrompts.map((prompt) => (
          <MoodPromptCard
            key={prompt.id}
            prompt={prompt}
            size="regular"
            theme={theme}
            onClick={() => onSelectPrompt?.(prompt)}
            onUse={() => onUsePrompt?.(prompt)}
          />
        ))}

        {/* Placeholder cards if less than 3 regular prompts */}
        {regularPrompts.length < 2 && (
          <div className={cn(
            'aspect-square rounded-xl',
            'bg-gradient-to-br opacity-30',
            moodGradient,
            'flex items-center justify-center'
          )}>
            <Sparkles className={cn(
              'w-6 h-6 opacity-50',
              isDark ? 'text-white' : 'text-gray-600'
            )} />
          </div>
        )}
      </div>
    </motion.section>
  )
}
