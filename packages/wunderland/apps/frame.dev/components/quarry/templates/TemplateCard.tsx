/**
 * Template Card Component
 * @module codex/templates/TemplateCard
 * 
 * @remarks
 * Displays a single template in a card format with:
 * - Icon, name, and description
 * - Category and difficulty badges
 * - Favorite toggle
 * - Estimated time
 */

'use client'

import React, { memo, useCallback } from 'react'
import { Heart, Clock, ChevronRight, Star } from 'lucide-react'
import DynamicIcon from '../ui/common/DynamicIcon'
import { Tooltip } from '../ui/common/Tooltip'
import type { LoadedTemplate } from './types'

interface TemplateCardProps {
  /** Template data */
  template: LoadedTemplate
  /** Click handler */
  onClick: (template: LoadedTemplate) => void
  /** Favorite toggle handler */
  onToggleFavorite?: (templateId: string) => void
  /** Card size variant */
  variant?: 'compact' | 'default' | 'large'
  /** Whether to show category badge */
  showCategory?: boolean
  /** Whether to show favorite button */
  showFavorite?: boolean
  /** Whether card is selected */
  isSelected?: boolean
  /** Dark mode */
  isDark?: boolean
}

/** Difficulty colors */
const DIFFICULTY_COLORS = {
  beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

/** Difficulty tooltips */
const DIFFICULTY_TOOLTIPS = {
  beginner: 'Simple structure with few fields - great for getting started',
  intermediate: 'Moderate complexity with multiple sections and fields',
  advanced: 'Complex template with many fields and advanced formatting',
}

const TemplateCard = memo(function TemplateCard({
  template,
  onClick,
  onToggleFavorite,
  variant = 'default',
  showCategory = true,
  showFavorite = true,
  isSelected = false,
  isDark = false,
}: TemplateCardProps) {
  const handleClick = useCallback(() => {
    onClick(template)
  }, [onClick, template])

  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleFavorite?.(template.id)
  }, [onToggleFavorite, template.id])

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        className={`
          w-full p-2.5 rounded-lg text-left group
          border border-zinc-200 dark:border-zinc-700
          hover:border-cyan-400 dark:hover:border-cyan-500
          hover:bg-cyan-50 dark:hover:bg-cyan-900/20
          transition-all duration-150 ease-out
          hover:scale-[1.01] active:scale-[0.99]
          ${isSelected 
            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 ring-2 ring-cyan-500/50' 
            : ''}
        `}
      >
        <div className="flex items-center gap-2.5">
          <div className={`
            p-1.5 rounded-md flex-shrink-0
            ${isSelected 
              ? 'bg-cyan-500 text-white' 
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}
          `}>
            <DynamicIcon name={template.icon} className="w-4 h-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-zinc-800 dark:text-zinc-200 truncate">
              {template.name}
            </p>
          </div>

          {showFavorite && template.isFavorite && (
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          )}
          
          <ChevronRight className="w-4 h-4 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={`
        w-full p-4 rounded-xl text-left group relative
        border-2 
        transition-all duration-150 ease-out
        hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99]
        ${isSelected 
          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 shadow-lg shadow-cyan-500/20' 
          : 'border-zinc-200 dark:border-zinc-700 hover:border-cyan-400 dark:hover:border-cyan-500'}
        hover:bg-zinc-50 dark:hover:bg-zinc-800/50
      `}
    >
      {/* Featured badge */}
      {template.featured && (
        <Tooltip
          content="Featured Template"
          description="Curated templates chosen for quality, usefulness, and clear structure. Great starting points for common writing tasks."
          placement="left"
        >
          <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center gap-0.5 cursor-help">
            <Star className="w-2.5 h-2.5 fill-current" />
            Featured
          </div>
        </Tooltip>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div 
          className={`
            p-2.5 rounded-lg flex-shrink-0 transition-colors
            ${isSelected 
              ? 'bg-cyan-500 text-white' 
              : 'group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/30'}
          `}
          style={{ 
            backgroundColor: isSelected ? undefined : `${template.categoryMeta.color}20`,
            color: isSelected ? undefined : template.categoryMeta.color,
          }}
        >
          <DynamicIcon name={template.icon} className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">
                {template.name}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                {template.shortDescription}
              </p>
            </div>

            {/* Favorite button */}
            {showFavorite && onToggleFavorite && (
              <button
                onClick={handleFavoriteClick}
                className={`
                  p-1.5 rounded-full transition-colors
                  ${template.isFavorite 
                    ? 'text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30' 
                    : 'text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}
                `}
                aria-label={template.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={`w-4 h-4 ${template.isFavorite ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Category */}
            {showCategory && (
              <Tooltip
                content={template.categoryMeta.name}
                description={template.categoryMeta.description || `Templates for ${template.categoryMeta.name.toLowerCase()} writing`}
                placement="bottom"
              >
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full cursor-help"
                  style={{
                    backgroundColor: `${template.categoryMeta.color}20`,
                    color: template.categoryMeta.color,
                  }}
                >
                  {template.categoryMeta.name}
                </span>
              </Tooltip>
            )}

            {/* Difficulty */}
            <Tooltip
              content={`${template.difficulty.charAt(0).toUpperCase() + template.difficulty.slice(1)} Difficulty`}
              description={DIFFICULTY_TOOLTIPS[template.difficulty]}
              placement="bottom"
            >
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full cursor-help ${DIFFICULTY_COLORS[template.difficulty]}`}
              >
                {template.difficulty}
              </span>
            </Tooltip>

            {/* Time */}
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {template.estimatedTime}
            </span>

            {/* Use count */}
            {template.useCount && template.useCount > 0 && (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                Used {template.useCount}x
              </span>
            )}
          </div>

          {/* Tags */}
          {variant === 'large' && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {template.tags.slice(0, 4).map(tag => (
                <span 
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded"
                >
                  {tag}
                </span>
              ))}
              {template.tags.length > 4 && (
                <span className="text-[10px] text-zinc-400">
                  +{template.tags.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
      </div>
    </button>
  )
})

export default TemplateCard





















