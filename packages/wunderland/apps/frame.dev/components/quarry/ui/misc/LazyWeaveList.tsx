/**
 * Lazy Weave List - Smart pagination and lazy loading for weaves
 * @module codex/ui/LazyWeaveList
 * 
 * @remarks
 * Handles large numbers of weaves efficiently with:
 * - Pagination (configurable page size)
 * - Collapsed/Expanded view modes
 * - Progressive loading (stats first, details on expand)
 * - Virtual scrolling hints for performance
 * - Search/filter integration
 */

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, ChevronUp, Grid3X3, List, Layers, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Filter, SortAsc, SortDesc
} from 'lucide-react'
import type { KnowledgeTreeNode } from '../../types'
import WeaveCard from '../canvas/WeaveCard'

export type WeaveViewMode = 'expanded' | 'compact' | 'grid'
export type WeaveSortBy = 'name' | 'strands' | 'looms' | 'recent'

interface LazyWeaveListProps {
  /** All weave nodes */
  weaves: KnowledgeTreeNode[]
  /** Currently expanded weave paths */
  expandedPaths: Set<string>
  /** Toggle weave expansion */
  onToggleExpand: (path: string) => void
  /** Navigate to weave */
  onNavigate: (path: string) => void
  /** Toggle loom expansion */
  onToggleLoom?: (path: string) => void
  /** Edit weave config */
  onEdit?: (node: KnowledgeTreeNode) => void
  /** Current theme */
  theme?: string
  /** Current path for active state */
  currentPath?: string
  /** Selected file path */
  selectedPath?: string
  /** Initial view mode */
  initialViewMode?: WeaveViewMode
  /** Page size */
  pageSize?: number
  /** Show pagination controls */
  showPagination?: boolean
  /** Show view mode toggle */
  showViewToggle?: boolean
  /** Compact mode for sidebar */
  compact?: boolean
  /** Render children callback - for rendering looms/strands within weaves */
  renderChildren?: (node: KnowledgeTreeNode, depth: number) => React.ReactNode
  /** External view mode control */
  viewMode?: WeaveViewMode
  /** View mode change handler */
  onViewModeChange?: (mode: WeaveViewMode) => void
}

/**
 * Count total strands in a weave
 */
function countStrands(node: KnowledgeTreeNode): number {
  return node.strandCount || 0
}

/**
 * Count looms in a weave
 */
function countLooms(node: KnowledgeTreeNode): number {
  if (!node.children) return 0
  return node.children.filter(child => 
    child.type === 'dir' && child.level === 'loom'
  ).length
}

/**
 * Compact Weave Card for collapsed view
 */
function CompactWeaveCard({
  node,
  isActive,
  isExpanded,
  onToggle,
  onNavigate,
  theme = 'light',
}: {
  node: KnowledgeTreeNode
  isActive: boolean
  isExpanded: boolean
  onToggle: () => void
  onNavigate: (path: string) => void
  theme?: string
}) {
  const isDark = theme.includes('dark')
  const strandCount = countStrands(node)
  const loomCount = countLooms(node)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`
        flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer
        transition-colors group min-h-[22px]
        border-l-2
        ${isActive
          ? isDark
            ? 'bg-emerald-900/40 border-emerald-500'
            : 'bg-emerald-50 border-emerald-500'
          : isDark
            ? 'hover:bg-zinc-800/60 border-purple-500'
            : 'hover:bg-zinc-100 border-purple-500'
        }
      `}
      onClick={() => {
        console.log('[CompactWeaveCard] WEAVE CLICK:', { name: node.name, path: node.path })
        onNavigate(node.path)
      }}
      onPointerDown={() => console.log('[CompactWeaveCard] WEAVE POINTER DOWN:', node.name)}
    >
      {/* Expand toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          console.log('[CompactWeaveCard] EXPAND TOGGLE:', { name: node.name, isExpanded })
          onToggle()
        }}
        onPointerDown={(e) => {
          e.stopPropagation()
          console.log('[CompactWeaveCard] EXPAND POINTER DOWN:', node.name)
        }}
        className="p-0.5 rounded transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700"
      >
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronRight className="w-3 h-3 text-zinc-500" />
        </motion.div>
      </button>

      {/* Icon */}
      <Layers className={`w-3 h-3 flex-shrink-0 ${isActive ? 'text-emerald-500' : 'text-purple-500'}`} />

      {/* Name */}
      <span className={`
        flex-1 text-[11px] font-medium truncate capitalize leading-tight
        ${isActive
          ? isDark ? 'text-emerald-200' : 'text-emerald-800'
          : isDark ? 'text-zinc-100' : 'text-zinc-800'
        }
      `}>
        {node.name}
      </span>

      {/* Stats - compact badges */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <span className="text-[9px] font-semibold px-1 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300" title={`${loomCount} looms`}>
          {loomCount}
        </span>
        <span className="text-[9px] font-semibold px-1 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300" title={`${strandCount} strands`}>
          {strandCount}
        </span>
      </div>
    </motion.div>
  )
}

/**
 * Grid Weave Card for grid view
 */
function GridWeaveCard({
  node,
  isActive,
  onNavigate,
  theme = 'light',
}: {
  node: KnowledgeTreeNode
  isActive: boolean
  onNavigate: (path: string) => void
  theme?: string
}) {
  const isDark = theme.includes('dark')
  const strandCount = countStrands(node)
  const loomCount = countLooms(node)
  const customStyle = node.style
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onNavigate(node.path)}
      className={`
        relative p-3 rounded-xl cursor-pointer
        border transition-all
        ${isActive 
          ? isDark ? 'bg-cyan-900/30 border-cyan-600' : 'bg-cyan-50 border-cyan-300'
          : isDark ? 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600' : 'bg-white border-zinc-200 hover:border-zinc-300'
        }
      `}
      style={customStyle?.accentColor ? {
        borderLeftColor: customStyle.accentColor,
        borderLeftWidth: '3px',
      } : undefined}
    >
      {/* Thumbnail placeholder */}
      <div className={`
        w-full aspect-video rounded-lg mb-2 flex items-center justify-center
        ${isDark ? 'bg-zinc-900' : 'bg-zinc-100'}
      `}>
        {customStyle?.thumbnail ? (
          <img src={customStyle.thumbnail} alt="" className="w-full h-full object-cover rounded-lg" />
        ) : (
          <Layers className="w-8 h-8 text-purple-400 opacity-50" />
        )}
      </div>
      
      {/* Name */}
      <h4 className={`text-sm font-semibold truncate ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
        {node.name}
      </h4>
      
      {/* Stats row */}
      <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
        <span>{loomCount} looms</span>
        <span>·</span>
        <span>{strandCount} strands</span>
      </div>
    </motion.div>
  )
}

/**
 * Lazy Weave List with pagination and view modes
 */
export default function LazyWeaveList({
  weaves,
  expandedPaths,
  onToggleExpand,
  onNavigate,
  onToggleLoom,
  onEdit,
  theme = 'light',
  currentPath = '',
  selectedPath,
  initialViewMode = 'expanded',
  pageSize = 10,
  showPagination = true,
  showViewToggle = true,
  compact = false,
  renderChildren,
  viewMode: externalViewMode,
  onViewModeChange,
}: LazyWeaveListProps) {
  const [internalViewMode, setInternalViewMode] = useState<WeaveViewMode>(initialViewMode)
  
  // Use external view mode if provided, otherwise use internal
  const viewMode = externalViewMode ?? internalViewMode
  const setViewMode = onViewModeChange ?? setInternalViewMode
  const [currentPage, setCurrentPage] = useState(0)
  const [sortBy, setSortBy] = useState<WeaveSortBy>('name')
  const [sortDesc, setSortDesc] = useState(false)
  const [showAllExpanded, setShowAllExpanded] = useState(false)
  
  const isDark = theme.includes('dark')
  
  // Sort weaves
  const sortedWeaves = useMemo(() => {
    const sorted = [...weaves].sort((a, b) => {
      switch (sortBy) {
        case 'strands':
          return countStrands(b) - countStrands(a)
        case 'looms':
          return countLooms(b) - countLooms(a)
        case 'name':
        default:
          return a.name.localeCompare(b.name)
      }
    })
    return sortDesc ? sorted.reverse() : sorted
  }, [weaves, sortBy, sortDesc])
  
  // Pagination
  const totalPages = Math.ceil(sortedWeaves.length / pageSize)
  const paginatedWeaves = useMemo(() => {
    if (!showPagination || showAllExpanded) return sortedWeaves
    const start = currentPage * pageSize
    return sortedWeaves.slice(start, start + pageSize)
  }, [sortedWeaves, currentPage, pageSize, showPagination, showAllExpanded])
  
  // Navigation helpers
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)))
  }, [totalPages])
  
  // Toggle all expanded
  const handleToggleAll = useCallback(() => {
    setShowAllExpanded(prev => !prev)
    if (!showAllExpanded) {
      setCurrentPage(0)
    }
  }, [showAllExpanded])
  
  // Render based on view mode
  const renderWeave = (node: KnowledgeTreeNode, index: number) => {
    const isActive = currentPath.startsWith(node.path) || selectedPath?.startsWith(node.path)
    const isExpanded = expandedPaths.has(node.path)
    
    if (viewMode === 'compact') {
      return (
        <div key={node.path} className="space-y-0.5">
          <CompactWeaveCard
            node={node}
            isActive={isActive || false}
            isExpanded={isExpanded}
            onToggle={() => onToggleExpand(node.path)}
            onNavigate={onNavigate}
            theme={theme}
          />

          {/* Render children (looms/strands) when expanded */}
          <AnimatePresence>
            {isExpanded && node.children && node.children.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="ml-3 pl-2 border-l-2 border-zinc-200 dark:border-zinc-700 overflow-hidden"
              >
                {(() => {
                  console.log('[LazyWeaveList] Rendering children for weave:', node.name, 'children:', node.children.map(c => ({ name: c.name, type: c.type, level: c.level })))
                  return renderChildren
                    ? node.children.map(child => renderChildren(child, 1))
                    : node.children.map(child => (
                        <div key={child.path} className="py-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                          {child.name}
                        </div>
                      ))
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    }
    
    if (viewMode === 'grid') {
      return (
        <GridWeaveCard
          key={node.path}
          node={node}
          isActive={isActive || false}
          onNavigate={onNavigate}
          theme={theme}
        />
      )
    }
    
    // Expanded view - full WeaveCard
    return (
      <div key={node.path} className="space-y-1">
        <WeaveCard
          node={node}
          isActive={isActive}
          isExpanded={isExpanded}
          onToggle={() => onToggleExpand(node.path)}
          onNavigate={onNavigate}
          onToggleLoom={onToggleLoom}
          onEdit={onEdit}
          theme={theme}
        />
        
        {/* Render children (looms/strands) when expanded */}
        <AnimatePresence>
          {isExpanded && node.children && node.children.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="ml-3 pl-2 border-l-2 border-zinc-200 dark:border-zinc-700 overflow-hidden"
            >
              {renderChildren 
                ? node.children.map(child => renderChildren(child, 1))
                : node.children.map(child => (
                    <div key={child.path} className="py-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                      {child.name}
                    </div>
                  ))
              }
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
  
  return (
    <div className="space-y-2">
      {/* Controls bar */}
      {(showViewToggle || showPagination) && weaves.length > 3 && (
        <div className={`
          flex items-center justify-between gap-2 px-1 py-1
          ${compact ? 'text-[9px]' : 'text-xs'}
        `}>
          {/* Left: View mode & sort */}
          <div className="flex items-center gap-1">
            {showViewToggle && (
              <div className={`
                inline-flex rounded border overflow-hidden
                ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-200 bg-white'}
              `}>
                <button
                  onClick={() => setViewMode('expanded')}
                  className={`p-1 transition-colors ${
                    viewMode === 'expanded'
                      ? isDark ? 'bg-cyan-800 text-cyan-200' : 'bg-cyan-100 text-cyan-700'
                      : isDark ? 'text-zinc-400 hover:bg-zinc-700' : 'text-zinc-500 hover:bg-zinc-100'
                  }`}
                  title="Expanded view"
                >
                  <List className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  className={`p-1 transition-colors ${
                    viewMode === 'compact'
                      ? isDark ? 'bg-cyan-800 text-cyan-200' : 'bg-cyan-100 text-cyan-700'
                      : isDark ? 'text-zinc-400 hover:bg-zinc-700' : 'text-zinc-500 hover:bg-zinc-100'
                  }`}
                  title="Compact view"
                >
                  <Filter className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1 transition-colors ${
                    viewMode === 'grid'
                      ? isDark ? 'bg-cyan-800 text-cyan-200' : 'bg-cyan-100 text-cyan-700'
                      : isDark ? 'text-zinc-400 hover:bg-zinc-700' : 'text-zinc-500 hover:bg-zinc-100'
                  }`}
                  title="Grid view"
                >
                  <Grid3X3 className="w-3 h-3" />
                </button>
              </div>
            )}
            
            {/* Sort toggle */}
            <button
              onClick={() => setSortDesc(prev => !prev)}
              className={`
                p-1 rounded transition-colors
                ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}
              `}
              title={sortDesc ? 'Sort ascending' : 'Sort descending'}
            >
              {sortDesc ? <SortDesc className="w-3 h-3" /> : <SortAsc className="w-3 h-3" />}
            </button>
          </div>
          
          {/* Right: Stats & expand all */}
          <div className="flex items-center gap-2 text-zinc-500">
            <span>{weaves.length} weaves</span>
            {showPagination && weaves.length > pageSize && (
              <button
                onClick={handleToggleAll}
                className={`
                  px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors
                  ${showAllExpanded
                    ? isDark ? 'bg-amber-800 text-amber-200' : 'bg-amber-100 text-amber-700'
                    : isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'
                  }
                `}
              >
                {showAllExpanded ? 'Paginate' : 'Show all'}
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Weave list */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-1.5'}>
        <AnimatePresence mode="popLayout">
          {paginatedWeaves.map((weave, index) => renderWeave(weave, index))}
        </AnimatePresence>
      </div>
      
      {/* Pagination controls */}
      {showPagination && totalPages > 1 && !showAllExpanded && (
        <div className={`
          flex items-center justify-center gap-1 pt-2
          ${isDark ? 'text-zinc-400' : 'text-zinc-500'}
        `}>
          <button
            onClick={() => goToPage(0)}
            disabled={currentPage === 0}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="First page"
          >
            <ChevronsLeft className="w-3 h-3" />
          </button>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous page"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          
          <span className="px-2 text-[10px] font-medium">
            {currentPage + 1} / {totalPages}
          </span>
          
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next page"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => goToPage(totalPages - 1)}
            disabled={currentPage >= totalPages - 1}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Last page"
          >
            <ChevronsRight className="w-3 h-3" />
          </button>
        </div>
      )}
      
      {/* Load more hint for large lists */}
      {!showPagination && weaves.length > 20 && (
        <div className={`
          text-center py-2 text-[10px]
          ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
        `}>
          Showing all {weaves.length} weaves • Consider using pagination for better performance
        </div>
      )}
    </div>
  )
}

