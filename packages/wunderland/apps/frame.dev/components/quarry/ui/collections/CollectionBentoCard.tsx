/**
 * Collection Bento Card - Sleek product-card style collection display
 * @module codex/ui/collections/CollectionBentoCard
 *
 * Premium glassmorphic card for displaying collections in the bento grid.
 * Features stacked strand previews, quick actions, and smooth animations.
 */

'use client'

import { memo, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  Pin, 
  PinOff, 
  MoreHorizontal, 
  Trash2, 
  Copy, 
  Edit2,
  FolderOpen,
  Layers,
  Image as ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CollectionStrandStack } from './CollectionStrandStack'
import { generateCollectionCoverDataUrl, getPatternFromSeed } from '@/lib/collections/coverGenerator'
import { useIsTouchDevice } from '@/components/quarry/hooks/useIsTouchDevice'
import type { CollectionMetadata } from '@/components/quarry/types'

/** Strand preview data */
interface StrandPreview {
  path: string
  title: string
  thumbnail?: string
  isSupernote?: boolean
}

interface CollectionBentoCardProps {
  /** Collection data */
  collection: CollectionMetadata
  /** Strand previews for the stack */
  strandPreviews: StrandPreview[]
  /** Card size based on strand count */
  size: '1x1' | '2x1' | '2x2'
  /** Whether in dark mode */
  isDark?: boolean
  /** Click to navigate to collection */
  onClick?: () => void
  /** Toggle pin status */
  onTogglePin?: () => void
  /** Edit collection */
  onEdit?: () => void
  /** Delete collection */
  onDelete?: () => void
  /** Duplicate collection */
  onDuplicate?: () => void
}

/** Format relative time */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Get icon component for collection */
function getCollectionIcon(icon?: string) {
  // Could be emoji or icon name - for now just show Layers
  if (icon && /\p{Emoji}/u.test(icon)) {
    return <span className="text-lg">{icon}</span>
  }
  return <FolderOpen className="w-5 h-5" />
}

/**
 * Premium bento-style collection card
 */
export const CollectionBentoCard = memo(function CollectionBentoCard({
  collection,
  strandPreviews,
  size,
  isDark = false,
  onClick,
  onTogglePin,
  onEdit,
  onDelete,
  onDuplicate,
}: CollectionBentoCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const isTouch = useIsTouchDevice()

  const accentColor = collection.color || '#8b5cf6'

  // Touch-friendly long press for context menu
  const handleTouchStart = useCallback(() => {
    if (isTouch) {
      setIsHovered(true)
    }
  }, [isTouch])

  const handleTouchEnd = useCallback(() => {
    if (isTouch) {
      // Delay hiding hover state for smoother touch experience
      setTimeout(() => setIsHovered(false), 150)
    }
  }, [isTouch])
  
  // Generate cover URL - either custom image, or generated SVG
  const coverUrl = useMemo(() => {
    // Use custom cover image if provided
    if (collection.coverImage) {
      return collection.coverImage
    }
    
    // Generate SVG cover based on collection properties
    const seed = collection.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const pattern = collection.coverPattern || getPatternFromSeed(seed)
    
    return generateCollectionCoverDataUrl({
      pattern,
      primaryColor: accentColor,
      secondaryColor: collection.coverSecondaryColor,
      seed,
    }, size === '1x1' ? 200 : size === '2x1' ? 400 : 400, size === '2x2' ? 300 : 150)
  }, [collection.coverImage, collection.coverPattern, collection.coverSecondaryColor, collection.title, accentColor, size])

  // Size-based configurations
  const sizeConfig = useMemo(() => {
    switch (size) {
      case '1x1':
        return { 
          padding: 'p-4', 
          titleSize: 'text-sm', 
          stackSize: 'sm' as const,
          showDescription: false,
          gridClass: 'col-span-1 row-span-1',
        }
      case '2x1':
        return { 
          padding: 'p-5', 
          titleSize: 'text-base', 
          stackSize: 'md' as const,
          showDescription: true,
          gridClass: 'col-span-2 row-span-1',
        }
      case '2x2':
        return { 
          padding: 'p-6', 
          titleSize: 'text-lg', 
          stackSize: 'lg' as const,
          showDescription: true,
          gridClass: 'col-span-2 row-span-2',
        }
    }
  }, [size])

  return (
    <motion.article
      className={cn(
        sizeConfig.gridClass,
        'relative group rounded-2xl overflow-hidden cursor-pointer',
        'transition-all duration-300 ease-out',
        'border backdrop-blur-sm',
        isDark 
          ? 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700' 
          : 'bg-white/90 border-zinc-200 hover:border-zinc-300',
        'shadow-sm hover:shadow-xl',
        // Glassmorphic glow on hover
        isHovered && 'ring-1',
      )}
      style={{
        ...(isHovered && {
          ['--tw-ring-color' as string]: `${accentColor}40`,
          boxShadow: `0 8px 32px -8px ${accentColor}25, 0 4px 16px -4px rgba(0,0,0,0.1)`,
        }),
      }}
      onClick={onClick}
      onMouseEnter={() => !isTouch && setIsHovered(true)}
      onMouseLeave={() => { !isTouch && setIsHovered(false); setShowMenu(false) }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      whileHover={!isTouch ? { y: -2, scale: 1.01 } : undefined}
      whileTap={{ scale: 0.98 }}
      layout
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      aria-label={`${collection.title} collection with ${collection.strandPaths.length} strands`}
    >
      {/* Cover image/pattern */}
      <div 
        className={cn(
          'absolute inset-x-0 top-0 overflow-hidden',
          size === '2x2' ? 'h-24' : 'h-16',
        )}
      >
        <div 
          className="w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url("${coverUrl}")` }}
        />
        {/* Gradient fade to content */}
        <div 
          className={cn(
            'absolute inset-x-0 bottom-0 h-12',
            isDark 
              ? 'bg-gradient-to-t from-zinc-900/95 via-zinc-900/70 to-transparent' 
              : 'bg-gradient-to-t from-white/95 via-white/70 to-transparent'
          )}
        />
      </div>

      <div className={cn('relative h-full flex flex-col', sizeConfig.padding, size === '2x2' ? 'pt-20' : 'pt-14')}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          {/* Icon + Title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div 
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ 
                backgroundColor: `${accentColor}15`,
                color: accentColor,
              }}
            >
              {getCollectionIcon(collection.icon)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 
                className={cn(
                  'font-semibold truncate',
                  sizeConfig.titleSize,
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                )}
              >
                {collection.title}
              </h3>
              {sizeConfig.showDescription && collection.description && (
                <p className={cn(
                  'text-xs truncate mt-0.5',
                  isDark ? 'text-zinc-500' : 'text-zinc-500'
                )}>
                  {collection.description}
                </p>
              )}
            </div>
          </div>

          {/* Pin button - touch-friendly size */}
          <motion.button
            type="button"
            onClick={(e) => { e.stopPropagation(); onTogglePin?.() }}
            className={cn(
              'flex-shrink-0 rounded-lg transition-colors touch-manipulation',
              // Touch-friendly minimum size
              'min-w-[44px] min-h-[44px] p-2.5 -m-1',
              collection.pinned
                ? 'text-amber-500'
                : isDark 
                  ? 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 active:bg-zinc-700' 
                  : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200',
              // Show on hover (desktop) or always on touch
              isTouch ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500'
            )}
            initial={false}
            animate={{ 
              scale: collection.pinned ? [1, 1.2, 1] : 1,
              rotate: collection.pinned ? [0, -10, 0] : 0,
            }}
            aria-label={collection.pinned ? 'Unpin collection' : 'Pin collection'}
          >
            {collection.pinned ? <Pin className="w-5 h-5" /> : <PinOff className="w-5 h-5" />}
          </motion.button>

          {/* More menu - touch-friendly */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
              className={cn(
                'rounded-lg transition-colors touch-manipulation',
                // Touch-friendly minimum size
                'min-w-[44px] min-h-[44px] p-2.5 -m-1',
                isDark 
                  ? 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 active:bg-zinc-700' 
                  : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200',
                isTouch ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500'
              )}
              aria-label="More options"
              aria-expanded={showMenu}
              aria-haspopup="true"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {/* Dropdown menu - touch-optimized */}
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={cn(
                  'absolute right-0 top-full mt-1 z-50 py-1.5 rounded-xl shadow-xl border min-w-[160px]',
                  isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'
                )}
                onClick={(e) => e.stopPropagation()}
                role="menu"
              >
                <button
                  type="button"
                  onClick={() => { onEdit?.(); setShowMenu(false) }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors touch-manipulation',
                    'min-h-[44px]', // Touch-friendly height
                    isDark 
                      ? 'hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300' 
                      : 'hover:bg-zinc-50 active:bg-zinc-100 text-zinc-700'
                  )}
                  role="menuitem"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => { onDuplicate?.(); setShowMenu(false) }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors touch-manipulation',
                    'min-h-[44px]',
                    isDark 
                      ? 'hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300' 
                      : 'hover:bg-zinc-50 active:bg-zinc-100 text-zinc-700'
                  )}
                  role="menuitem"
                >
                  <Copy className="w-4 h-4" />
                  Duplicate
                </button>
                <div className={cn('h-px my-1', isDark ? 'bg-zinc-700' : 'bg-zinc-200')} role="separator" />
                <button
                  type="button"
                  onClick={() => { onDelete?.(); setShowMenu(false) }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors touch-manipulation',
                    'min-h-[44px]',
                    'text-red-500 hover:bg-red-50 active:bg-red-100 dark:hover:bg-red-950/30 dark:active:bg-red-950/50'
                  )}
                  role="menuitem"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Strand stack preview */}
        <div className="flex-1 flex items-center justify-center py-2">
          <CollectionStrandStack
            strands={strandPreviews}
            accentColor={accentColor}
            size={sizeConfig.stackSize}
            isDark={isDark}
            showExtraCount
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="flex items-center gap-1.5">
            <Layers 
              className="w-3.5 h-3.5" 
              style={{ color: accentColor }}
            />
            <span className={cn(
              'text-xs font-medium',
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            )}>
              {collection.strandPaths.length} {collection.strandPaths.length === 1 ? 'strand' : 'strands'}
            </span>
          </div>
          <span className={cn(
            'text-[10px]',
            isDark ? 'text-zinc-600' : 'text-zinc-400'
          )}>
            {formatRelativeTime(collection.updatedAt)}
          </span>
        </div>
      </div>
    </motion.article>
  )
})

export default CollectionBentoCard

