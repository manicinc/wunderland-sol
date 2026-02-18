'use client'

/**
 * Graph Left Sidebar
 * @module components/quarry/ui/sidebar/GraphLeftSidebar
 *
 * Left sidebar for the Knowledge Graph page with:
 * - Graph layout controls
 * - Node type filters
 * - Search/highlight
 * - Legend
 */

import React from 'react'
import Link from 'next/link'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import {
  Network,
  Layers,
  Filter,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3X3,
  Circle,
  ChevronRight,
  FileText,
  Tag,
  Folder,
  Link as LinkIcon,
  Eye,
  EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CollapsibleSidebarSection } from './sections/CollapsibleSidebarSection'
import { TimerSection } from './sections/TimerSection'

export interface GraphLeftSidebarProps {
  isDark: boolean
  /** Current layout type */
  layout?: 'force' | 'radial' | 'tree' | 'grid'
  /** Callback when layout changes */
  onLayoutChange?: (layout: 'force' | 'radial' | 'tree' | 'grid') => void
  /** Node type visibility */
  nodeFilters?: {
    strands: boolean
    tags: boolean
    folders: boolean
    links: boolean
  }
  /** Callback when filters change */
  onFiltersChange?: (filters: { strands: boolean; tags: boolean; folders: boolean; links: boolean }) => void
  /** Search query */
  searchQuery?: string
  /** Callback when search changes */
  onSearchChange?: (query: string) => void
  /** Total node count */
  nodeCount?: number
  /** Total edge count */
  edgeCount?: number
  className?: string
}

export default function GraphLeftSidebar({
  isDark,
  layout = 'force',
  onLayoutChange,
  nodeFilters = { strands: true, tags: true, folders: true, links: true },
  onFiltersChange,
  searchQuery = '',
  onSearchChange,
  nodeCount = 0,
  edgeCount = 0,
  className,
}: GraphLeftSidebarProps) {
  const resolvePath = useQuarryPath()
  const layouts = [
    { id: 'force', label: 'Force', icon: Network },
    { id: 'radial', label: 'Radial', icon: Circle },
    { id: 'tree', label: 'Tree', icon: Layers },
    { id: 'grid', label: 'Grid', icon: Grid3X3 },
  ] as const

  const nodeTypes = [
    { id: 'strands', label: 'Strands', icon: FileText, color: 'text-cyan-500' },
    { id: 'tags', label: 'Tags', icon: Tag, color: 'text-violet-500' },
    { id: 'folders', label: 'Folders', icon: Folder, color: 'text-amber-500' },
    { id: 'links', label: 'Links', icon: LinkIcon, color: 'text-emerald-500' },
  ] as const

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Stats */}
      <div className={cn(
        'p-3 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Circle className={cn('w-3 h-3', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
            <span className={cn('text-xs font-medium', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
              {nodeCount} nodes
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <LinkIcon className={cn('w-3 h-3', isDark ? 'text-violet-400' : 'text-violet-600')} />
            <span className={cn('text-xs font-medium', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
              {edgeCount} edges
            </span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className={cn(
        'p-3 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <div className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-lg',
          isDark ? 'bg-zinc-800' : 'bg-zinc-100'
        )}>
          <Search className={cn('w-3.5 h-3.5', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className={cn(
              'flex-1 bg-transparent text-xs outline-none placeholder:text-zinc-500',
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            )}
          />
        </div>
      </div>

      {/* Layout Options */}
      <CollapsibleSidebarSection
        title="Layout"
        icon={Grid3X3}
        defaultExpanded={true}
        isDark={isDark}
      >
        <div className="p-2 grid grid-cols-2 gap-1">
          {layouts.map((l) => {
            const Icon = l.icon
            const isActive = layout === l.id
            return (
              <button
                key={l.id}
                onClick={() => onLayoutChange?.(l.id)}
                className={cn(
                  'flex items-center gap-1.5 p-2 rounded-lg text-xs transition-colors',
                  isActive
                    ? isDark
                      ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30'
                      : 'bg-cyan-100 text-cyan-700 ring-1 ring-cyan-300'
                    : isDark
                      ? 'text-zinc-400 hover:bg-zinc-800'
                      : 'text-zinc-600 hover:bg-zinc-100'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{l.label}</span>
              </button>
            )
          })}
        </div>
      </CollapsibleSidebarSection>

      {/* Node Filters */}
      <CollapsibleSidebarSection
        title="Show/Hide"
        icon={Filter}
        defaultExpanded={true}
        isDark={isDark}
      >
        <div className="p-2 space-y-1">
          {nodeTypes.map((type) => {
            const Icon = type.icon
            const isVisible = nodeFilters[type.id as keyof typeof nodeFilters]
            return (
              <button
                key={type.id}
                onClick={() => onFiltersChange?.({
                  ...nodeFilters,
                  [type.id]: !isVisible,
                })}
                className={cn(
                  'w-full flex items-center gap-2 p-2 rounded-lg text-xs transition-colors',
                  isDark
                    ? 'hover:bg-zinc-800'
                    : 'hover:bg-zinc-100'
                )}
              >
                <Icon className={cn('w-4 h-4', type.color)} />
                <span className={cn(
                  'flex-1 text-left',
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                )}>
                  {type.label}
                </span>
                {isVisible ? (
                  <Eye className={cn('w-3.5 h-3.5', isDark ? 'text-emerald-400' : 'text-emerald-600')} />
                ) : (
                  <EyeOff className={cn('w-3.5 h-3.5', isDark ? 'text-zinc-600' : 'text-zinc-400')} />
                )}
              </button>
            )
          })}
        </div>
      </CollapsibleSidebarSection>

      {/* Focus Timer */}
      <TimerSection
        isDark={isDark}
        defaultExpanded={false}
        defaultMinutes={15}
        maxMinutes={60}
        title="Focus Timer"
      />

      {/* Related */}
      <CollapsibleSidebarSection
        title="Related"
        icon={Layers}
        defaultExpanded={false}
        isDark={isDark}
      >
        <div className="p-2 space-y-1">
          <Link
            href={resolvePath('/quarry/analytics')}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg text-xs transition-colors',
              isDark
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-800'
            )}
          >
            <Layers className="w-4 h-4" />
            <span className="flex-1">Analytics</span>
            <ChevronRight className="w-3 h-3 opacity-50" />
          </Link>
          <Link
            href={resolvePath('/quarry/evolution')}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg text-xs transition-colors',
              isDark
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-800'
            )}
          >
            <Network className="w-4 h-4" />
            <span className="flex-1">Evolution</span>
            <ChevronRight className="w-3 h-3 opacity-50" />
          </Link>
        </div>
      </CollapsibleSidebarSection>

      {/* Spacer */}
      <div className="flex-1" />
    </div>
  )
}

