/**
 * Prompt Category Navigation Component
 * @module components/quarry/ui/PromptCategoryNav
 *
 * Horizontal scrolling category pills for filtering prompts.
 */

'use client'

import React, { useRef } from 'react'
import { motion } from 'framer-motion'
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ThemeName } from '@/types/theme'
import type { PromptCategory } from '@/lib/prompts/types'
import { CATEGORY_DISPLAY } from '@/lib/prompts/types'
import { cn } from '@/lib/utils'

type CategoryFilter = PromptCategory | 'all' | 'favorites'

interface PromptCategoryNavProps {
  /** Currently active category */
  activeCategory: CategoryFilter
  /** Category selection handler */
  onSelectCategory: (category: CategoryFilter) => void
  /** Count of prompts per category (optional) */
  categoryCounts?: Partial<Record<CategoryFilter, number>>
  /** Current theme */
  theme?: ThemeName
  /** Class name */
  className?: string
}

// All categories in display order
const CATEGORY_ORDER: CategoryFilter[] = [
  'all',
  'favorites',
  'creative',
  'reflection',
  'exploration',
  'philosophical',
  'personal',
  'learning',
  'practical',
  'technical',
]

/**
 * Category pill button
 */
function CategoryPill({
  category,
  isActive,
  count,
  onClick,
  isDark,
}: {
  category: CategoryFilter
  isActive: boolean
  count?: number
  onClick: () => void
  isDark: boolean
}) {
  const isSpecial = category === 'all' || category === 'favorites'
  const display = isSpecial ? null : CATEGORY_DISPLAY[category as PromptCategory]

  const label = category === 'all'
    ? 'All'
    : category === 'favorites'
    ? 'Favorites'
    : display?.label || category

  const emoji = category === 'all'
    ? '✨'
    : category === 'favorites'
    ? null
    : display?.emoji

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
        'whitespace-nowrap transition-all duration-200',
        'border',
        isActive
          ? isDark
            ? 'bg-white text-zinc-900 border-white'
            : 'bg-zinc-900 text-white border-zinc-900'
          : isDark
            ? 'bg-zinc-800/50 text-zinc-300 border-zinc-700 hover:bg-zinc-700/50 hover:text-zinc-100'
            : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900'
      )}
    >
      {category === 'favorites' ? (
        <Heart className={cn(
          'w-3.5 h-3.5',
          isActive ? 'fill-current' : ''
        )} />
      ) : (
        emoji && <span className="text-sm">{emoji}</span>
      )}
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center',
          isActive
            ? isDark
              ? 'bg-zinc-200 text-zinc-800'
              : 'bg-zinc-700 text-zinc-100'
            : isDark
              ? 'bg-zinc-700 text-zinc-400'
              : 'bg-zinc-100 text-zinc-500'
        )}>
          {count}
        </span>
      )}
    </motion.button>
  )
}

/**
 * Horizontal scrolling category navigation
 */
export default function PromptCategoryNav({
  activeCategory,
  onSelectCategory,
  categoryCounts,
  theme = 'light',
  className,
}: PromptCategoryNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isDark = theme.includes('dark')

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  return (
    <div className={cn('relative', className)}>
      {/* Scroll buttons for overflow */}
      <button
        onClick={() => scroll('left')}
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 z-10',
          'w-8 h-8 flex items-center justify-center rounded-full',
          'transition-opacity duration-200',
          isDark
            ? 'bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700'
            : 'bg-white/90 text-zinc-600 hover:bg-zinc-100 shadow-md',
          'hidden md:flex'
        )}
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <button
        onClick={() => scroll('right')}
        className={cn(
          'absolute right-0 top-1/2 -translate-y-1/2 z-10',
          'w-8 h-8 flex items-center justify-center rounded-full',
          'transition-opacity duration-200',
          isDark
            ? 'bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700'
            : 'bg-white/90 text-zinc-600 hover:bg-zinc-100 shadow-md',
          'hidden md:flex'
        )}
        aria-label="Scroll right"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Scrollable pills container */}
      <div
        ref={scrollRef}
        className={cn(
          'flex items-center gap-2 overflow-x-auto scrollbar-hide',
          'px-1 py-1 -mx-1',
          'md:px-10' // Make room for scroll buttons on desktop
        )}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {CATEGORY_ORDER.map((category) => (
          <CategoryPill
            key={category}
            category={category}
            isActive={activeCategory === category}
            count={categoryCounts?.[category]}
            onClick={() => onSelectCategory(category)}
            isDark={isDark}
          />
        ))}
      </div>

      {/* Gradient fade edges */}
      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-8 pointer-events-none',
        'bg-gradient-to-r md:hidden',
        isDark ? 'from-zinc-900 to-transparent' : 'from-white to-transparent'
      )} />
      <div className={cn(
        'absolute right-0 top-0 bottom-0 w-8 pointer-events-none',
        'bg-gradient-to-l md:hidden',
        isDark ? 'from-zinc-900 to-transparent' : 'from-white to-transparent'
      )} />
    </div>
  )
}
