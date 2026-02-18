/**
 * Bento Prompt Grid Component
 * @module components/quarry/ui/BentoPromptGrid
 *
 * Responsive masonry-style grid with variable card sizes.
 * Featured prompts span 2x2, regular prompts span 1x1.
 */

'use client'

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ThemeName } from '@/types/theme'
import type { GalleryPrompt } from '@/lib/prompts/types'
import BentoPromptCard from './BentoPromptCard'
import { cn } from '@/lib/utils'

interface BentoPromptGridProps {
  /** Array of prompts to display */
  prompts: GalleryPrompt[]
  /** Current theme */
  theme?: ThemeName
  /** IDs of prompts to feature (larger cards) */
  featuredIds?: string[]
  /** Number of prompts to feature if not specified */
  autoFeatureCount?: number
  /** Click handler for card */
  onSelectPrompt?: (prompt: GalleryPrompt) => void
  /** Use prompt handler */
  onUsePrompt?: (prompt: GalleryPrompt) => void
  /** Toggle favorite handler */
  onToggleFavorite?: (prompt: GalleryPrompt) => void
  /** Class name for grid container */
  className?: string
  /** Whether to show loading state */
  isLoading?: boolean
}

/**
 * Select prompts to feature based on criteria
 */
function selectFeaturedPrompts(
  prompts: GalleryPrompt[],
  count: number,
  manualIds?: string[]
): Set<string> {
  if (manualIds && manualIds.length > 0) {
    return new Set(manualIds.slice(0, count))
  }

  // Prioritize prompts with images and high use count
  const scored = prompts
    .map((p) => ({
      id: p.id,
      score:
        (p.imageUrl ? 10 : 0) +
        (p.isFavorite ? 5 : 0) +
        Math.min(p.useCount, 10),
    }))
    .sort((a, b) => b.score - a.score)

  // Take top prompts but ensure variety by category
  const featured = new Set<string>()
  const usedCategories = new Set<string>()

  for (const item of scored) {
    if (featured.size >= count) break
    const prompt = prompts.find((p) => p.id === item.id)
    if (prompt && !usedCategories.has(prompt.category)) {
      featured.add(item.id)
      usedCategories.add(prompt.category)
    }
  }

  // Fill remaining slots if needed
  for (const item of scored) {
    if (featured.size >= count) break
    if (!featured.has(item.id)) {
      featured.add(item.id)
    }
  }

  return featured
}

/**
 * Skeleton card for loading state
 */
function SkeletonCard({ isDark, isFeatured = false }: { isDark: boolean; isFeatured?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden',
        isFeatured && 'col-span-2 row-span-2',
        isDark ? 'bg-zinc-800/60' : 'bg-gray-100'
      )}
    >
      {/* Image area - matches card aspect ratios */}
      <div className={cn(
        isFeatured ? 'aspect-[4/3]' : 'aspect-[4/5]',
        'relative',
        isDark ? 'bg-zinc-700/50' : 'bg-gray-200',
        'animate-pulse'
      )}>
        {/* Category badge skeleton */}
        <div className={cn(
          'absolute bottom-2 left-2 w-16 h-6 rounded-full',
          isDark ? 'bg-zinc-600/50' : 'bg-gray-300'
        )} />
      </div>
      {/* Text area */}
      <div className="p-3 space-y-2">
        {/* Text line skeletons */}
        <div className={cn(
          'h-3 rounded-full w-full',
          isDark ? 'bg-zinc-700/50' : 'bg-gray-200',
          'animate-pulse'
        )} />
        <div className={cn(
          'h-3 rounded-full w-3/4',
          isDark ? 'bg-zinc-700/50' : 'bg-gray-200',
          'animate-pulse'
        )} style={{ animationDelay: '75ms' }} />
        {isFeatured && (
          <div className={cn(
            'h-3 rounded-full w-1/2',
            isDark ? 'bg-zinc-700/50' : 'bg-gray-200',
            'animate-pulse'
          )} style={{ animationDelay: '150ms' }} />
        )}
        {/* Mood/stats skeleton */}
        <div className="flex items-center justify-between mt-2">
          <div className={cn(
            'h-5 w-12 rounded-full',
            isDark ? 'bg-zinc-700/50' : 'bg-gray-200',
            'animate-pulse'
          )} style={{ animationDelay: '100ms' }} />
          <div className={cn(
            'h-4 w-10 rounded',
            isDark ? 'bg-zinc-700/50' : 'bg-gray-200',
            'animate-pulse'
          )} style={{ animationDelay: '125ms' }} />
        </div>
      </div>
    </div>
  )
}

/**
 * Loading skeleton for grid
 */
function GridSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 sm:gap-1.5" aria-busy="true" aria-label="Loading prompts">
      {/* Regular skeletons with staggered animation */}
      {Array.from({ length: 18 }).map((_, i) => (
        <SkeletonCard key={i} isDark={isDark} />
      ))}
    </div>
  )
}

/**
 * Empty state when no prompts match filters
 */
function EmptyState({ isDark }: { isDark: boolean }) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 text-center',
      isDark ? 'text-zinc-400' : 'text-gray-500'
    )}>
      <div className="text-4xl mb-4">🔍</div>
      <h3 className="text-lg font-medium mb-2">No prompts found</h3>
      <p className="text-sm max-w-xs">
        Try adjusting your filters or search to discover more prompts
      </p>
    </div>
  )
}

/**
 * Bento grid layout for prompt cards
 */
export default function BentoPromptGrid({
  prompts,
  theme = 'light',
  featuredIds,
  autoFeatureCount = 3,
  onSelectPrompt,
  onUsePrompt,
  onToggleFavorite,
  className,
  isLoading = false,
}: BentoPromptGridProps) {
  const isDark = theme.includes('dark')

  // Sort prompts: favorites first, then by use count
  const sortedPrompts = useMemo(() => {
    return [...prompts].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
      return b.useCount - a.useCount
    })
  }, [prompts])

  if (isLoading) {
    return <GridSkeleton isDark={isDark} />
  }

  if (prompts.length === 0) {
    return <EmptyState isDark={isDark} />
  }

  return (
    <motion.div
      layout
      className={cn(
        // Tight grid with minimal gaps - no gaps creates seamless look
        'grid gap-1 sm:gap-1.5',
        // More columns for denser layout
        'grid-cols-3',
        'sm:grid-cols-4',
        'md:grid-cols-5',
        'lg:grid-cols-6',
        className
      )}
    >
      <AnimatePresence mode="popLayout">
        {sortedPrompts.map((prompt) => {
          // All cards same size for consistent grid without gaps
          return (
            <motion.div
              key={prompt.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <BentoPromptCard
                prompt={prompt}
                size="regular"
                theme={theme}
                onClick={() => onSelectPrompt?.(prompt)}
                onUse={() => onUsePrompt?.(prompt)}
                onToggleFavorite={() => onToggleFavorite?.(prompt)}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </motion.div>
  )
}
