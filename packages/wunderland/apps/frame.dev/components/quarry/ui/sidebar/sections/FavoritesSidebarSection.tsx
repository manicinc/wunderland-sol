/**
 * Favorites Sidebar Section
 *
 * Displays favorited strands in a collapsible sidebar section.
 * Shows quick access to starred strands from any weave.
 * @module components/quarry/ui/sidebar/sections/FavoritesSidebarSection
 */

'use client'

import React, { useMemo } from 'react'
import { Star, FileText, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { CollectionMetadata } from '@/components/quarry/types'
import { CollapsibleSidebarSection } from './CollapsibleSidebarSection'

export interface FavoritesSidebarSectionProps {
  /** Favorites collection data */
  collection: CollectionMetadata
  /** Navigate to a strand path */
  onNavigate: (path: string) => void
  /** Whether section is expanded */
  isExpanded?: boolean
  /** Toggle expansion callback */
  onToggleExpand?: () => void
  /** Whether in dark mode */
  isDark: boolean
  /** Maximum items to show before "View all" link */
  maxItems?: number
}

/**
 * Extract display name from strand path
 * Converts 'weaves/wiki/frame/getting-started.md' to 'Getting Started'
 */
function getStrandDisplayName(path: string): string {
  // Get filename without extension
  const filename = path.split('/').pop()?.replace(/\.md$/, '') || path
  // Convert kebab-case to Title Case
  return filename
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Get parent context from path
 * Returns 'wiki/frame' from 'weaves/wiki/frame/getting-started.md'
 */
function getParentContext(path: string): string {
  const parts = path.split('/')
  // Remove 'weaves' prefix and filename
  if (parts[0] === 'weaves') {
    parts.shift()
  }
  parts.pop() // Remove filename
  return parts.join('/')
}

interface FavoriteStrandItemProps {
  path: string
  onNavigate: (path: string) => void
  isDark: boolean
}

function FavoriteStrandItem({ path, onNavigate, isDark }: FavoriteStrandItemProps) {
  const displayName = getStrandDisplayName(path)
  const parentContext = getParentContext(path)

  return (
    <button
      onClick={() => onNavigate(path)}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 text-left',
        'text-sm transition-colors rounded-sm',
        'group',
        isDark
          ? 'hover:bg-zinc-800/70 text-zinc-300'
          : 'hover:bg-zinc-100 text-zinc-700'
      )}
    >
      <FileText className={cn(
        'w-3.5 h-3.5 flex-shrink-0',
        isDark ? 'text-zinc-500' : 'text-zinc-400'
      )} />
      <div className="flex-1 min-w-0">
        <div className="truncate">{displayName}</div>
        {parentContext && (
          <div className={cn(
            'text-xs truncate',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            {parentContext}
          </div>
        )}
      </div>
      <ChevronRight className={cn(
        'w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity',
        isDark ? 'text-zinc-500' : 'text-zinc-400'
      )} />
    </button>
  )
}

export function FavoritesSidebarSection({
  collection,
  onNavigate,
  isExpanded,
  onToggleExpand,
  isDark,
  maxItems = 10,
}: FavoritesSidebarSectionProps) {
  const strandCount = collection.strandPaths.length
  const displayedStrands = useMemo(
    () => collection.strandPaths.slice(0, maxItems),
    [collection.strandPaths, maxItems]
  )
  const hasMore = strandCount > maxItems

  // Don't render if no favorites
  if (strandCount === 0) {
    return null
  }

  const badge = (
    <span className={cn(
      'text-xs px-1.5 py-0.5 rounded-full',
      isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
    )}>
      {strandCount}
    </span>
  )

  return (
    <CollapsibleSidebarSection
      title="Favorites"
      icon={Star}
      isExpanded={isExpanded}
      onToggle={onToggleExpand ? () => onToggleExpand() : undefined}
      isDark={isDark}
      badge={badge}
      defaultExpanded={true}
    >
      <div className="pb-2">
        {displayedStrands.map((path) => (
          <FavoriteStrandItem
            key={path}
            path={path}
            onNavigate={onNavigate}
            isDark={isDark}
          />
        ))}

        {hasMore && (
          <Link
            href="/quarry/collections"
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 text-xs',
              'transition-colors',
              isDark
                ? 'text-emerald-400 hover:text-emerald-300'
                : 'text-emerald-600 hover:text-emerald-700'
            )}
          >
            View all {strandCount} favorites
            <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </CollapsibleSidebarSection>
  )
}

export default FavoritesSidebarSection
