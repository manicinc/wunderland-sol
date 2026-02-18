/**
 * Hierarchical Breadcrumb Navigation
 * @module codex/ui/HierarchyBreadcrumb
 * 
 * @remarks
 * Horizontally scrolling breadcrumb that shows the knowledge hierarchy:
 * Fabric → Weave → Loom → Strand
 * 
 * Features:
 * - Auto-scrolls to active item
 * - Animated transitions between levels
 * - Touch-optimized with momentum scrolling
 * - Visual indicators for hierarchy levels
 */

'use client'

import React, { useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Layers, Box, GitBranch, FileText } from 'lucide-react'
import type { NodeLevel } from '../../types'

interface BreadcrumbSegment {
  /** Display name */
  name: string
  /** Navigation path */
  path: string
  /** Hierarchy level */
  level: NodeLevel
  /** Is this the active/current segment */
  isActive?: boolean
}

interface HierarchyBreadcrumbProps {
  /** Current full path */
  currentPath: string
  /** Currently selected file path */
  selectedPath?: string
  /** Navigate to path callback (auto-selects file) */
  onNavigate: (path: string) => void
  /** Browse directory callback (shows folder explorer, no auto-select) */
  onBrowse?: (path: string) => void
  /** Current theme */
  theme?: string
  /** Show weave/loom/strand indicators */
  showLevelIndicators?: boolean
}

// Level styling and icons
const LEVEL_CONFIG: Record<NodeLevel, {
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  borderColor: string
  label: string
}> = {
  fabric: {
    icon: Home,
    color: 'text-zinc-700 dark:text-zinc-300',
    bgColor: 'bg-zinc-100 dark:bg-zinc-800',
    borderColor: 'border-zinc-300 dark:border-zinc-700',
    label: 'Fabric',
  },
  weave: {
    icon: Layers,
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/40',
    borderColor: 'border-purple-300 dark:border-purple-700',
    label: 'Weave',
  },
  loom: {
    icon: Box,
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-100 dark:bg-amber-900/40',
    borderColor: 'border-amber-300 dark:border-amber-700',
    label: 'Loom',
  },
  collection: {
    icon: Layers,
    color: 'text-violet-700 dark:text-violet-300',
    bgColor: 'bg-violet-100 dark:bg-violet-900/40',
    borderColor: 'border-violet-300 dark:border-violet-700',
    label: 'Collection',
  },
  strand: {
    icon: FileText,
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/40',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    label: 'Strand',
  },
  folder: {
    icon: GitBranch,
    color: 'text-zinc-600 dark:text-zinc-400',
    bgColor: 'bg-zinc-100 dark:bg-zinc-800',
    borderColor: 'border-zinc-300 dark:border-zinc-700',
    label: 'Folder',
  },
}

/**
 * Determine the hierarchy level from a path segment
 * Consistent with determineNodeLevel in utils.ts
 */
function getPathLevel(path: string, index: number, segments: string[]): NodeLevel {
  if (path === '' || index === 0) return 'fabric'

  // Check if we're in weaves hierarchy
  if (segments[0] === 'weaves') {
    if (index === 0) return 'fabric'
    if (index === 1) return 'weave' // weaves/tech -> weave

    // Check if it's a file (strand)
    const segmentName = segments[index]
    if (segmentName.endsWith('.md') || segmentName.endsWith('.mdx')) {
      return 'strand'
    }

    // 'looms' and 'strands' are organizational folders
    if (segmentName === 'looms' || segmentName === 'strands') {
      return 'folder'
    }

    // Any other directory at depth 3+ is a loom
    if (index >= 2) {
      return 'loom'
    }
  }

  // Check file extension for strands outside weaves
  if (path.endsWith('.md') || path.endsWith('.mdx')) return 'strand'

  return 'folder'
}

/**
 * Parse a path into breadcrumb segments with hierarchy levels
 * Note: Does NOT include a root/home segment - only shows actual path hierarchy
 */
function parsePathSegments(currentPath: string, selectedPath?: string): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = []

  // No root segment - only show path when navigating somewhere
  if (!currentPath && !selectedPath) return segments

  const pathToUse = selectedPath || currentPath
  const parts = pathToUse.split('/').filter(Boolean)

  parts.forEach((part, index) => {
    const path = parts.slice(0, index + 1).join('/')
    const level = getPathLevel(path, index + 1, ['', ...parts])
    const isActive = index === parts.length - 1

    // Clean up display name
    let displayName = part
      .replace(/\.md$/, '')
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')

    // Capitalize first letter of each word
    displayName = displayName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    segments.push({
      name: displayName,
      path,
      level,
      isActive,
    })
  })

  return segments
}

/**
 * Hierarchical breadcrumb with horizontal scrolling
 */
export default function HierarchyBreadcrumb({
  currentPath,
  selectedPath,
  onNavigate,
  onBrowse,
  theme = 'light',
  showLevelIndicators = true,
}: HierarchyBreadcrumbProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)
  const isDark = theme.includes('dark')

  // Parse path into segments
  const segments = useMemo(
    () => parsePathSegments(currentPath, selectedPath),
    [currentPath, selectedPath]
  )

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current
      const active = activeRef.current

      // Calculate scroll position to center the active item
      const containerWidth = container.offsetWidth
      const activeLeft = active.offsetLeft
      const activeWidth = active.offsetWidth
      const scrollTarget = activeLeft - (containerWidth / 2) + (activeWidth / 2)

      container.scrollTo({
        left: Math.max(0, scrollTarget),
        behavior: 'smooth',
      })
    }
  }, [segments])

  return (
    <div className="relative group">
      {/* Fade indicators for overflow - visible on hover */}
      <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-zinc-100/90 dark:from-zinc-900/90 to-transparent pointer-events-none z-10 opacity-60 group-hover:opacity-100 transition-opacity" />
      <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-zinc-100/90 dark:from-zinc-900/90 to-transparent pointer-events-none z-10 opacity-60 group-hover:opacity-100 transition-opacity" />

      {/* Scrollable container - reduced height */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1 overflow-x-auto px-2 py-1 scroll-smooth"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <AnimatePresence mode="popLayout">
          {segments.map((segment, index) => {
            const config = LEVEL_CONFIG[segment.level]
            const Icon = config.icon
            const isLast = index === segments.length - 1

            // For weaves, looms, and folders - use browse (show folder explorer)
            // For strands - use navigate (auto-select file)
            const shouldBrowse = onBrowse && (segment.level === 'weave' || segment.level === 'loom' || segment.level === 'folder')
            const handleClick = () => {
              if (shouldBrowse) {
                onBrowse(segment.path)
              } else {
                onNavigate(segment.path)
              }
            }

            return (
              <React.Fragment key={segment.path || 'root'}>
                <motion.button
                  ref={segment.isActive ? activeRef : undefined}
                  onClick={handleClick}
                  initial={{ opacity: 0, scale: 0.8, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 10 }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                    delay: index * 0.05
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded
                    text-[8px] sm:text-[10px] font-medium whitespace-nowrap
                    transition-all duration-200
                    min-h-[18px] sm:min-h-[22px] touch-manipulation
                    ${segment.isActive
                      ? `${config.bgColor} ${config.color} border ${config.borderColor} shadow-sm`
                      : `hover:bg-zinc-200/70 dark:hover:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400`
                    }
                  `}
                  title={segment.level === 'fabric' ? 'Home' : segment.name}
                >
                  <Icon className={`w-2 h-2 sm:w-2.5 sm:h-2.5 flex-shrink-0 ${segment.isActive ? config.color : ''}`} />
                  {/* Only show name if not the root fabric level (which uses icon only) */}
                  {segment.name && <span className="truncate max-w-[60px] sm:max-w-none">{segment.name}</span>}

                  {/* Level indicator badge - only on active */}
                  {showLevelIndicators && segment.isActive && segment.level !== 'fabric' && segment.level !== 'folder' && (
                    <span className={`
                      text-[6px] sm:text-[7px] uppercase tracking-wider font-bold px-0.5 sm:px-1 py-0 rounded
                      bg-white/50 dark:bg-black/30 hidden sm:inline
                    `}>
                      {config.label}
                    </span>
                  )}
                </motion.button>

                {/* SVG Arrow separator */}
                {!isLast && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 + 0.1 }}
                    className="flex-shrink-0"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" className="text-zinc-400 dark:text-zinc-600">
                      <path
                        d="M4 2L8 6L4 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>
                )}
              </React.Fragment>
            )
          })}
        </AnimatePresence>

        {/* Spacer for scroll padding */}
        <div className="w-6 flex-shrink-0" aria-hidden />
      </div>

      {/* Custom scrollbar styling */}
      <style jsx>{`
        div::-webkit-scrollbar {
          height: 4px;
        }
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        div::-webkit-scrollbar-thumb {
          background: rgba(155, 155, 155, 0.4);
          border-radius: 4px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: rgba(155, 155, 155, 0.6);
        }
      `}</style>
    </div>
  )
}

