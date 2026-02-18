/**
 * CoverPreview - Live Cover Preview Component
 * @module components/quarry/ui/creation/CoverPreview
 *
 * Displays a live preview of a cover image with optional overlay content.
 */

'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { CoverSelection } from './CoverPhotoPicker'

// ============================================================================
// TYPES
// ============================================================================

export interface CoverPreviewProps {
  /** Cover selection to preview */
  cover: CoverSelection | null
  /** Title to overlay */
  title?: string
  /** Subtitle/description to overlay */
  subtitle?: string
  /** Icon or emoji to display */
  icon?: string | React.ReactNode
  /** Aspect ratio */
  aspectRatio?: 'wide' | 'square' | 'portrait' | 'banner'
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show overlay gradient */
  showOverlay?: boolean
  /** Whether dark mode is enabled */
  isDark?: boolean
  /** Custom class name */
  className?: string
  /** Click handler */
  onClick?: () => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ASPECT_RATIOS = {
  wide: 'aspect-[2/1]',
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  banner: 'aspect-[4/1]',
}

const SIZES = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
}

const TITLE_SIZES = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
}

const SUBTITLE_SIZES = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CoverPreview({
  cover,
  title,
  subtitle,
  icon,
  aspectRatio = 'wide',
  size = 'md',
  showOverlay = true,
  isDark = false,
  className = '',
  onClick,
}: CoverPreviewProps) {
  // Placeholder background for when no cover is selected
  const placeholderBg = useMemo(() => {
    if (isDark) {
      return 'bg-gradient-to-br from-zinc-800 to-zinc-900'
    }
    return 'bg-gradient-to-br from-zinc-100 to-zinc-200'
  }, [isDark])

  const hasContent = title || subtitle || icon

  return (
    <motion.div
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={`
        relative overflow-hidden
        ${ASPECT_RATIOS[aspectRatio]}
        ${SIZES[size]}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* Background Image or Placeholder */}
      {cover ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${cover.url}")` }}
        />
      ) : (
        <div className={`absolute inset-0 ${placeholderBg}`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`
              text-center
              ${isDark ? 'text-zinc-600' : 'text-zinc-400'}
            `}>
              <div className="text-4xl mb-2">🖼️</div>
              <span className="text-sm">No cover selected</span>
            </div>
          </div>
        </div>
      )}

      {/* Overlay Gradient */}
      {showOverlay && cover && hasContent && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      )}

      {/* Content */}
      {hasContent && (
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <div className="flex items-end gap-3">
            {/* Icon */}
            {icon && (
              <div className="flex-shrink-0">
                {typeof icon === 'string' ? (
                  <span className={`
                    ${size === 'sm' ? 'text-2xl' : size === 'md' ? 'text-3xl' : 'text-4xl'}
                  `}>
                    {icon}
                  </span>
                ) : (
                  icon
                )}
              </div>
            )}

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className={`
                  font-semibold text-white truncate
                  ${TITLE_SIZES[size]}
                `}>
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className={`
                  text-white/80 truncate mt-0.5
                  ${SUBTITLE_SIZES[size]}
                `}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// Named export
export { CoverPreview }

