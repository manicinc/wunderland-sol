/**
 * BacklinkList Component
 * 
 * Displays reverse references to the current strand, showing which other
 * strands link to or mention this one.
 * 
 * @module backlink-list
 * 
 * @remarks
 * Uses the CrosslinkExplorer for rich backlink display with the transclusion
 * system. Falls back to a naive implementation if transclusion data is unavailable.
 * 
 * @example
 * ```tsx
 * <BacklinkList 
 *   currentPath="weaves/wiki/looms/architecture/strands/overview.md"
 *   files={allFiles}
 *   onNavigate={(path) => handleNavigation(path)}
 * />
 * ```
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Link2, ChevronDown, ChevronRight, ExternalLink, Layers } from 'lucide-react'
import { getBacklinksForStrand } from '@/lib/transclusion/transclusionManager'
import type { BacklinkWithContext } from '@/lib/transclusion/types'
import { cn } from '@/lib/utils'

interface BacklinkListProps {
  /** Current file path to find backlinks for */
  currentPath: string
  /** All files in the repository */
  files: Array<{ path: string; name: string; type: string }>
  /** Callback when clicking a backlink */
  onBacklinkClick?: (path: string, blockId?: string) => void
  /** Current theme */
  theme?: string
}

const DARK_THEMES = ['dark', 'sepia-dark', 'terminal-dark', 'oceanic-dark']

/**
 * Renders a list of files that reference the current strand
 * Uses the transclusion system for accurate backlinks with context
 */
export default function BacklinkList({ 
  currentPath, 
  files,
  onBacklinkClick,
  theme = 'light',
}: BacklinkListProps) {
  const isDark = DARK_THEMES.includes(theme)
  const [backlinks, setBacklinks] = useState<BacklinkWithContext[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // Load backlinks from transclusion system
  useEffect(() => {
    if (!currentPath) {
      setBacklinks([])
      setLoading(false)
      return
    }

    setLoading(true)
    getBacklinksForStrand(currentPath)
      .then(setBacklinks)
      .catch((err) => {
        console.error('[BacklinkList] Failed to load backlinks:', err)
        setBacklinks([])
      })
      .finally(() => setLoading(false))
  }, [currentPath])

  // Toggle expanded state for a backlink
  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Handle navigation
  const handleClick = (path: string, blockId?: string) => {
    if (onBacklinkClick) {
      onBacklinkClick(path, blockId)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="text-center py-4">
        <div className={cn(
          'inline-flex p-2 rounded-lg mb-2 animate-pulse',
          isDark ? 'bg-zinc-800' : 'bg-zinc-100'
        )}>
          <Link2 className="w-4 h-4 text-zinc-400" />
        </div>
        <p className="text-[10px] text-zinc-500">Loading backlinks...</p>
      </div>
    )
  }

  // Empty state - no backlinks from transclusion system
  if (backlinks.length === 0) {
    return (
      <div className="text-center py-6">
        <div className={cn(
          'inline-flex p-2 rounded-lg mb-2',
          isDark ? 'bg-zinc-800' : 'bg-zinc-100'
        )}>
          <Link2 className="w-4 h-4 text-zinc-400" />
        </div>
        <p className={cn(
          'text-xs italic',
          isDark ? 'text-zinc-400' : 'text-zinc-500'
        )}>
          No references yet
        </p>
        <p className={cn(
          'text-[10px] mt-1 max-w-[200px] mx-auto',
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        )}>
          When other strands reference this content, they will appear here.
        </p>
      </div>
    )
  }

  // Group backlinks by source strand for cleaner display
  const groupedBacklinks = new Map<string, BacklinkWithContext[]>()
  for (const bl of backlinks) {
    const key = bl.sourceStrand.path
    const existing = groupedBacklinks.get(key) || []
    existing.push(bl)
    groupedBacklinks.set(key, existing)
  }

  return (
    <div className="space-y-1.5">
      {/* Stats header */}
      <div className={cn(
        'flex items-center gap-2 px-2 py-1 rounded text-[10px]',
        isDark ? 'bg-zinc-800/50 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
      )}>
        <Link2 className="w-3 h-3" />
        <span>{backlinks.length} reference{backlinks.length !== 1 ? 's' : ''}</span>
        <span className="text-zinc-400">•</span>
        <span>{groupedBacklinks.size} strand{groupedBacklinks.size !== 1 ? 's' : ''}</span>
      </div>

      {/* Backlinks list */}
      <ul className="space-y-1 -mx-1">
        {Array.from(groupedBacklinks.entries()).map(([strandPath, links]) => {
          const firstLink = links[0]
          const isExpanded = expandedItems.has(strandPath)
          const hasContext = links.some(l => l.backlink.contextSnippet)

          return (
            <li key={strandPath}>
              <div
                className={cn(
                  'flex items-start gap-2 px-2 py-1.5 rounded transition-colors group cursor-pointer',
                  isDark
                    ? 'hover:bg-zinc-800'
                    : 'hover:bg-zinc-100'
                )}
                onClick={() => handleClick(strandPath, firstLink.backlink.referencingBlockId)}
              >
                {/* Expand toggle - only if has context */}
                {hasContext ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpanded(strandPath)
                    }}
                    className="mt-0.5 p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 text-zinc-400" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-zinc-400" />
                    )}
                  </button>
                ) : (
                  <div className="w-4" /> // Spacer
                )}

                {/* Connection icon */}
                <svg 
                  className={cn(
                    'w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-70 group-hover:opacity-100 transition-opacity',
                    isDark ? 'text-cyan-400' : 'text-cyan-600'
                  )}
                  viewBox="0 0 16 16" 
                  fill="none"
                >
                  <circle cx="3" cy="8" r="2" fill="currentColor" />
                  <circle cx="13" cy="8" r="2" fill="currentColor" />
                  <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="8" cy="8" r="1" fill="currentColor" />
                </svg>
                
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-xs font-medium truncate leading-tight',
                    isDark ? 'text-zinc-200' : 'text-zinc-800'
                  )}>
                    {firstLink.sourceStrand.title || strandPath.split('/').pop()?.replace('.md', '')}
                  </p>
                  {firstLink.sourceStrand.weave && (
                    <p className={cn(
                      'text-[10px] truncate mt-0.5 opacity-70',
                      isDark ? 'text-zinc-400' : 'text-zinc-500'
                    )}>
                      {firstLink.sourceStrand.weave}
                      {firstLink.sourceStrand.loom && ` / ${firstLink.sourceStrand.loom}`}
                    </p>
                  )}
                  {links.length > 1 && (
                    <p className="text-[9px] text-cyan-500 mt-0.5">
                      {links.length} references
                    </p>
                  )}
                </div>

                {/* Navigate indicator */}
                <ExternalLink className={cn(
                  'w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity',
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                )} />
              </div>

              {/* Context snippet - shown when expanded */}
              {isExpanded && hasContext && (
                <div className={cn(
                  'ml-8 mr-2 mb-2 p-2 rounded text-[10px] leading-relaxed',
                  isDark ? 'bg-zinc-900/50 text-zinc-400' : 'bg-zinc-50 text-zinc-600'
                )}>
                  {links.map((link, idx) => (
                    link.backlink.contextSnippet && (
                      <div key={idx} className={idx > 0 ? 'mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700' : ''}>
                        <p className="italic">{link.backlink.contextSnippet}</p>
                        {link.sourceBlock && (
                          <p className="text-[9px] text-zinc-400 mt-1 flex items-center gap-1">
                            <Layers className="w-2.5 h-2.5" />
                            {link.sourceBlock.blockType}
                          </p>
                        )}
                      </div>
                    )
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
