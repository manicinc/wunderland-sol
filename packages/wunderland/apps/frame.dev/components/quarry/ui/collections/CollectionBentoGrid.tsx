/**
 * Collection Bento Grid - Auto-layout masonry grid for collections
 * @module codex/ui/collections/CollectionBentoGrid
 *
 * Responsive bento-style grid with varied cell sizes based on collection content.
 * Features smooth reorder animations and adaptive layouts.
 */

'use client'

import { memo, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CollectionBentoCard } from './CollectionBentoCard'
import type { CollectionMetadata } from '@/components/quarry/types'

/** Strand preview for card display */
interface StrandPreview {
  path: string
  title: string
  thumbnail?: string
  isSupernote?: boolean
}

interface CollectionBentoGridProps {
  /** Collections to display */
  collections: CollectionMetadata[]
  /** Strand previews mapped by path */
  strandPreviews: Record<string, StrandPreview>
  /** Whether in dark mode */
  isDark?: boolean
  /** Navigate to collection detail */
  onCollectionClick?: (id: string) => void
  /** Toggle pin status */
  onTogglePin?: (id: string) => void
  /** Edit collection */
  onEdit?: (id: string) => void
  /** Delete collection */
  onDelete?: (id: string) => void
  /** Duplicate collection */
  onDuplicate?: (id: string) => void
  /** Create new collection */
  onCreateNew?: () => void
  /** Loading state */
  isLoading?: boolean
}

/**
 * Determine card size based on strand count
 */
function getCardSize(strandCount: number): '1x1' | '2x1' | '2x2' {
  if (strandCount <= 3) return '1x1'
  if (strandCount <= 8) return '2x1'
  return '2x2'
}

/**
 * Loading skeleton card
 */
const SkeletonCard = memo(function SkeletonCard({ isDark }: { isDark: boolean }) {
  return (
    <div
      className={cn(
        'rounded-2xl animate-pulse',
        isDark ? 'bg-zinc-800' : 'bg-zinc-100'
      )}
      style={{ height: 180 }}
    >
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <div className={cn('w-8 h-8 rounded-lg', isDark ? 'bg-zinc-700' : 'bg-zinc-200')} />
          <div className={cn('h-4 w-24 rounded', isDark ? 'bg-zinc-700' : 'bg-zinc-200')} />
        </div>
        <div className={cn('flex-1 rounded-lg', isDark ? 'bg-zinc-700' : 'bg-zinc-200')} />
        <div className="flex justify-between mt-3">
          <div className={cn('h-3 w-16 rounded', isDark ? 'bg-zinc-700' : 'bg-zinc-200')} />
          <div className={cn('h-3 w-12 rounded', isDark ? 'bg-zinc-700' : 'bg-zinc-200')} />
        </div>
      </div>
    </div>
  )
})

/**
 * Empty state component
 */
const EmptyState = memo(function EmptyState({ 
  isDark, 
  onCreateNew 
}: { 
  isDark: boolean
  onCreateNew?: () => void 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-8"
    >
      <div 
        className={cn(
          'w-20 h-20 rounded-2xl flex items-center justify-center mb-6',
          isDark ? 'bg-zinc-800' : 'bg-zinc-100'
        )}
      >
        <Plus className={cn('w-8 h-8', isDark ? 'text-zinc-600' : 'text-zinc-400')} />
      </div>
      <h3 className={cn(
        'text-xl font-semibold mb-2',
        isDark ? 'text-zinc-200' : 'text-zinc-800'
      )}>
        No collections yet
      </h3>
      <p className={cn(
        'text-sm text-center max-w-sm mb-6',
        isDark ? 'text-zinc-500' : 'text-zinc-500'
      )}>
        Create your first collection to organize strands by topic, project, or any way you like.
      </p>
      {onCreateNew && (
        <button
          type="button"
          onClick={onCreateNew}
          className={cn(
            'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm',
            'bg-violet-600 text-white hover:bg-violet-700',
            'shadow-lg shadow-violet-500/25 hover:shadow-violet-500/35',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2',
            isDark && 'focus:ring-offset-zinc-900'
          )}
        >
          <Plus className="w-4 h-4" />
          Create Collection
        </button>
      )}
    </motion.div>
  )
})

/**
 * Create new collection card - touch-optimized
 */
const CreateCard = memo(function CreateCard({ 
  isDark, 
  onClick 
}: { 
  isDark: boolean
  onClick?: () => void 
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={cn(
        'col-span-1 row-span-1 rounded-2xl border-2 border-dashed',
        'flex flex-col items-center justify-center gap-3',
        // Touch-friendly padding and min height
        'p-6 sm:p-8 min-h-[160px] sm:min-h-[180px]',
        'transition-all duration-200 cursor-pointer group touch-manipulation',
        isDark 
          ? 'border-zinc-700 hover:border-violet-600/50 hover:bg-zinc-800/50 active:bg-zinc-800' 
          : 'border-zinc-300 hover:border-violet-400 hover:bg-violet-50/50 active:bg-violet-50',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
        isDark && 'focus-visible:ring-offset-zinc-900'
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
    >
      <div className={cn(
        'w-14 h-14 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-colors',
        isDark 
          ? 'bg-zinc-700 group-hover:bg-violet-600/20 group-active:bg-violet-600/30' 
          : 'bg-zinc-100 group-hover:bg-violet-100 group-active:bg-violet-200',
      )}>
        <Plus className={cn(
          'w-7 h-7 sm:w-6 sm:h-6 transition-colors',
          isDark 
            ? 'text-zinc-500 group-hover:text-violet-400' 
            : 'text-zinc-400 group-hover:text-violet-600'
        )} />
      </div>
      <span className={cn(
        'text-sm sm:text-base font-medium transition-colors',
        isDark 
          ? 'text-zinc-500 group-hover:text-violet-400' 
          : 'text-zinc-500 group-hover:text-violet-600'
      )}>
        New Collection
      </span>
    </motion.button>
  )
})

/**
 * Bento grid layout for collections
 */
export const CollectionBentoGrid = memo(function CollectionBentoGrid({
  collections,
  strandPreviews,
  isDark = false,
  onCollectionClick,
  onTogglePin,
  onEdit,
  onDelete,
  onDuplicate,
  onCreateNew,
  isLoading = false,
}: CollectionBentoGridProps) {
  
  // Get previews for a collection's strands
  const getStrandPreviewsForCollection = useCallback(
    (collection: CollectionMetadata) => {
      return collection.strandPaths
        .slice(0, 10) // Limit for performance
        .map((path) => strandPreviews[path])
        .filter(Boolean)
    },
    [strandPreviews]
  )

  // Memoize sorted collections (pinned first)
  const sortedCollections = useMemo(() => {
    return [...collections].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    })
  }, [collections])

  if (isLoading) {
    return (
      <div className={cn(
        'grid',
        // Mobile-first responsive grid matching main grid
        'grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
        'gap-3 sm:gap-4'
      )}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} isDark={isDark} />
        ))}
      </div>
    )
  }

  if (collections.length === 0) {
    return <EmptyState isDark={isDark} onCreateNew={onCreateNew} />
  }

  return (
    <LayoutGroup>
      <motion.div
        className={cn(
          'grid auto-rows-min',
          // Mobile-first responsive grid
          // On mobile (< 640px): single column, all cards full width
          // sm: 2 columns
          // md: 3 columns
          // lg: 4 columns
          // xl: 5 columns
          'grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
          // Tighter gap on mobile
          'gap-3 sm:gap-4',
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.05 }}
      >
        <AnimatePresence mode="popLayout">
          {sortedCollections.map((collection, index) => {
            const size = getCardSize(collection.strandPaths.length)
            const previews = getStrandPreviewsForCollection(collection)

            return (
              <motion.div
                key={collection.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ 
                  duration: 0.3,
                  delay: index * 0.03,
                }}
                className={cn(
                  // On mobile, all cards are single column
                  // Larger cards span on tablet+
                  size === '1x1' && 'col-span-1 row-span-1',
                  size === '2x1' && 'col-span-1 sm:col-span-2 row-span-1',
                  size === '2x2' && 'col-span-1 sm:col-span-2 row-span-1 sm:row-span-2',
                )}
              >
                <CollectionBentoCard
                  collection={collection}
                  strandPreviews={previews}
                  size={size}
                  isDark={isDark}
                  onClick={() => onCollectionClick?.(collection.id)}
                  onTogglePin={() => onTogglePin?.(collection.id)}
                  onEdit={() => onEdit?.(collection.id)}
                  onDelete={() => onDelete?.(collection.id)}
                  onDuplicate={() => onDuplicate?.(collection.id)}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Create new card at the end - touch-friendly */}
        {onCreateNew && (
          <CreateCard isDark={isDark} onClick={onCreateNew} />
        )}
      </motion.div>
    </LayoutGroup>
  )
})

export default CollectionBentoGrid


