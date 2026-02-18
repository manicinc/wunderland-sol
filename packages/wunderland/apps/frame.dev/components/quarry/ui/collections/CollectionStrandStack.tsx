/**
 * Collection Strand Stack - Fanned card preview of strands
 * @module codex/ui/collections/CollectionStrandStack
 *
 * Visual preview of strands in a collection with a fanned stack effect.
 * Shows top 4 strands with subtle rotation and hover spread animation.
 */

'use client'

import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Image as ImageIcon, StickyNote } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StrandPreview {
  path: string
  title: string
  thumbnail?: string
  isSupernote?: boolean
  color?: string
}

interface CollectionStrandStackProps {
  /** Strands to display (first 4 will be shown) */
  strands: StrandPreview[]
  /** Accent color for gradients */
  accentColor?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Whether in dark mode */
  isDark?: boolean
  /** Click handler */
  onClick?: () => void
  /** Show count badge for extra strands */
  showExtraCount?: boolean
}

/** Size configurations */
const SIZES = {
  sm: { width: 48, height: 60, offset: 6, rotation: 2.5 },
  md: { width: 64, height: 80, offset: 8, rotation: 3 },
  lg: { width: 80, height: 100, offset: 10, rotation: 3.5 },
}

/**
 * Fanned card stack showing strand previews
 */
export const CollectionStrandStack = memo(function CollectionStrandStack({
  strands,
  accentColor = '#8b5cf6',
  size = 'md',
  isDark = false,
  onClick,
  showExtraCount = true,
}: CollectionStrandStackProps) {
  const [isHovered, setIsHovered] = useState(false)
  const config = SIZES[size]
  
  // Take first 4 strands for display
  const displayStrands = strands.slice(0, 4)
  const extraCount = strands.length - 4

  if (strands.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg border-2 border-dashed transition-colors',
          isDark ? 'border-zinc-700 text-zinc-600' : 'border-zinc-300 text-zinc-400'
        )}
        style={{ width: config.width + config.offset * 3, height: config.height + config.offset * 2 }}
      >
        <FileText className="w-6 h-6 opacity-50" />
      </div>
    )
  }

  return (
    <div
      className="relative cursor-pointer touch-manipulation"
      style={{ 
        width: config.width + config.offset * (displayStrands.length - 1) + 8,
        height: config.height + config.offset + 8,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      aria-label={`Stack of ${strands.length} strands`}
    >
      <AnimatePresence>
        {displayStrands.map((strand, index) => {
          const isTop = index === displayStrands.length - 1
          const baseRotation = (index - 1.5) * config.rotation
          const spreadOffset = isHovered ? (index - 1.5) * (config.offset * 2.5) : 0
          
          return (
            <motion.div
              key={strand.path}
              className={cn(
                'absolute rounded-lg overflow-hidden shadow-md transition-shadow',
                isTop && isHovered && 'shadow-xl ring-2 ring-white/20',
                strand.isSupernote 
                  ? isDark ? 'bg-stone-800' : 'bg-amber-50'
                  : isDark ? 'bg-zinc-800' : 'bg-white'
              )}
              style={{
                width: config.width,
                height: config.height,
                zIndex: index + 1,
                borderWidth: 1,
                borderColor: strand.isSupernote
                  ? isDark ? '#78716c' : '#fcd34d'
                  : isDark ? '#3f3f46' : '#e4e4e7',
              }}
              initial={{ 
                x: index * config.offset,
                y: index * (config.offset / 2),
                rotate: baseRotation,
              }}
              animate={{
                x: index * config.offset + spreadOffset,
                y: index * (config.offset / 2) + (isHovered && isTop ? -4 : 0),
                rotate: isHovered ? baseRotation * 0.5 : baseRotation,
                scale: isHovered && isTop ? 1.05 : 1,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {/* Thumbnail or gradient */}
              {strand.thumbnail ? (
                <img
                  src={strand.thumbnail}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    background: strand.isSupernote
                      ? isDark 
                        ? 'linear-gradient(135deg, #44403c 0%, #292524 100%)'
                        : 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)'
                      : `linear-gradient(135deg, ${accentColor}15 0%, ${accentColor}30 100%)`,
                  }}
                >
                  {strand.isSupernote ? (
                    <StickyNote 
                      className="w-5 h-5" 
                      style={{ color: isDark ? '#a8a29e' : '#78350f' }} 
                    />
                  ) : (
                    <FileText 
                      className="w-5 h-5" 
                      style={{ color: accentColor }} 
                    />
                  )}
                </div>
              )}
              
              {/* Corner fold for supernotes */}
              {strand.isSupernote && (
                <div
                  className="absolute top-0 right-0 w-0 h-0"
                  style={{
                    borderLeft: '10px solid transparent',
                    borderTop: isDark ? '10px solid #57534e' : '10px solid #fcd34d',
                  }}
                />
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Extra count badge */}
      {showExtraCount && extraCount > 0 && (
        <motion.div
          className={cn(
            'absolute bottom-0 right-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm',
            isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
          )}
          style={{ zIndex: displayStrands.length + 1 }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          +{extraCount}
        </motion.div>
      )}
    </div>
  )
})

export default CollectionStrandStack


