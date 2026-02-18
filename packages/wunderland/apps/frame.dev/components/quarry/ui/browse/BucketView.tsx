/**
 * BucketView - Context-Aware Card Grid for Weave/Loom Contents
 * @module components/quarry/ui/browse/BucketView
 *
 * Displays child items as product cards based on current context:
 * - Inside a Weave: Shows LoomCards with cover art
 * - Inside a Loom: Shows StrandCards with metadata
 *
 * Features search, sorting, grid size control, and responsive layout.
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Grid,
  LayoutGrid,
  SortAsc,
  SortDesc,
  ChevronDown,
  Check,
  Loader2,
  FolderTree,
  Home,
  ChevronRight,
  FileText,
  Folder,
} from 'lucide-react'
import LoomCard, { type LoomCardData } from './LoomCard'
import StrandCard, { type StrandCardData } from './StrandCard'

// ============================================================================
// TYPES
// ============================================================================

export type BucketLevel = 'weave' | 'loom'

export interface BucketViewProps {
  /** Current context level */
  level: BucketLevel
  /** Current path for breadcrumb */
  currentPath: string
  /** Current container name (weave or loom name) */
  currentName: string
  /** Current container emoji */
  currentEmoji?: string
  /** Loom data (when level is 'weave') */
  looms?: LoomCardData[]
  /** Strand data (when level is 'loom') */
  strands?: StrandCardData[]
  /** Parent accent color for strands */
  accentColor?: string
  /** Whether data is loading */
  isLoading?: boolean
  /** Loom click handler */
  onLoomClick?: (loom: LoomCardData) => void
  /** Strand click handler */
  onStrandClick?: (strand: StrandCardData) => void
  /** Edit loom handler */
  onEditLoom?: (loom: LoomCardData) => void
  /** Delete loom handler */
  onDeleteLoom?: (loom: LoomCardData) => void
  /** Edit strand handler */
  onEditStrand?: (strand: StrandCardData) => void
  /** Delete strand handler */
  onDeleteStrand?: (strand: StrandCardData) => void
  /** Navigate to path handler */
  onNavigate?: (path: string) => void
  /** Whether dark mode is enabled */
  isDark?: boolean
  /** Custom class name */
  className?: string
}

type SortField = 'name' | 'modified' | 'count'
type SortOrder = 'asc' | 'desc'
type GridSize = 'small' | 'medium' | 'large'

interface Breadcrumb {
  name: string
  path: string
  emoji?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'modified', label: 'Last Modified' },
  { value: 'count', label: 'Item Count' },
]

const GRID_SIZES: { value: GridSize; icon: React.ElementType; cols: string }[] = [
  { value: 'small', icon: Grid, cols: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' },
  { value: 'medium', icon: LayoutGrid, cols: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' },
  { value: 'large', icon: LayoutGrid, cols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parsePath(path: string): Breadcrumb[] {
  if (!path || path === '/') return [{ name: 'Home', path: '/', emoji: '🏠' }]

  const parts = path.split('/').filter(Boolean)
  const breadcrumbs: Breadcrumb[] = [{ name: 'Home', path: '/', emoji: '🏠' }]

  let currentPath = ''
  for (let i = 0; i < parts.length; i++) {
    currentPath += '/' + parts[i]
    breadcrumbs.push({
      name: parts[i].replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase()),
      path: currentPath,
    })
  }

  return breadcrumbs
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface SortDropdownProps {
  sortField: SortField
  sortOrder: SortOrder
  onSortChange: (field: SortField) => void
  onOrderToggle: () => void
  isDark: boolean
}

function SortDropdown({ sortField, sortOrder, onSortChange, onOrderToggle, isDark }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const currentLabel = SORT_OPTIONS.find(o => o.value === sortField)?.label

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
          transition-colors
          ${isDark
            ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          }
        `}
      >
        <span>{currentLabel}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`
                absolute right-0 top-full mt-1 z-20 min-w-[140px]
                rounded-lg shadow-xl border overflow-hidden
                ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}
              `}
            >
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onSortChange(option.value)
                    setIsOpen(false)
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 text-sm text-left
                    ${sortField === option.value
                      ? isDark
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-cyan-50 text-cyan-700'
                      : isDark
                        ? 'hover:bg-zinc-700 text-zinc-300'
                        : 'hover:bg-zinc-50 text-zinc-700'
                    }
                  `}
                >
                  {option.label}
                  {sortField === option.value && <Check className="w-4 h-4" />}
                </button>
              ))}
              <div className={`border-t ${isDark ? 'border-zinc-700' : 'border-zinc-100'}`}>
                <button
                  onClick={() => {
                    onOrderToggle()
                    setIsOpen(false)
                  }}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                    ${isDark
                      ? 'hover:bg-zinc-700 text-zinc-300'
                      : 'hover:bg-zinc-50 text-zinc-700'
                    }
                  `}
                >
                  {sortOrder === 'asc' ? (
                    <>
                      <SortAsc className="w-4 h-4" />
                      Ascending
                    </>
                  ) : (
                    <>
                      <SortDesc className="w-4 h-4" />
                      Descending
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

interface BreadcrumbNavProps {
  breadcrumbs: Breadcrumb[]
  onNavigate: (path: string) => void
  isDark: boolean
}

function BreadcrumbNav({ breadcrumbs, onNavigate, isDark }: BreadcrumbNavProps) {
  return (
    <nav className="flex items-center gap-1 text-sm overflow-x-auto pb-1">
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.path}>
          {index > 0 && (
            <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
          )}
          <button
            onClick={() => onNavigate(crumb.path)}
            className={`
              flex items-center gap-1.5 px-2 py-1 rounded-lg whitespace-nowrap
              transition-colors
              ${index === breadcrumbs.length - 1
                ? isDark
                  ? 'text-white font-medium'
                  : 'text-zinc-900 font-medium'
                : isDark
                  ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }
            `}
          >
            {crumb.emoji && <span>{crumb.emoji}</span>}
            {crumb.name}
          </button>
        </React.Fragment>
      ))}
    </nav>
  )
}

interface EmptyStateProps {
  type: 'looms' | 'strands' | 'search'
  isDark: boolean
}

function EmptyState({ type, isDark }: EmptyStateProps) {
  if (type === 'search') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className={`p-4 rounded-2xl mb-4 ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          <Search className={`w-8 h-8 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
        </div>
        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          No results found
        </h3>
        <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Try adjusting your search
        </p>
      </div>
    )
  }

  const Icon = type === 'looms' ? Folder : FileText
  const title = type === 'looms' ? 'No looms in this weave' : 'No strands in this loom'
  const description = type === 'looms'
    ? 'Create looms to organize your strands into collections.'
    : 'Add strands to start building your knowledge.'

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className={`p-4 rounded-2xl mb-4 ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
        <Icon className={`w-8 h-8 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
      </div>
      <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
        {title}
      </h3>
      <p className={`text-sm mt-1 max-w-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
        {description}
      </p>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BucketView({
  level,
  currentPath,
  currentName,
  currentEmoji,
  looms = [],
  strands = [],
  accentColor,
  isLoading = false,
  onLoomClick,
  onStrandClick,
  onEditLoom,
  onDeleteLoom,
  onEditStrand,
  onDeleteStrand,
  onNavigate,
  isDark = false,
  className = '',
}: BucketViewProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [gridSize, setGridSize] = useState<GridSize>('medium')

  // Breadcrumbs
  const breadcrumbs = useMemo(() => parsePath(currentPath), [currentPath])

  // Filtered and sorted looms
  const filteredLooms = useMemo(() => {
    if (level !== 'weave') return []

    let result = [...looms]

    // Search filter
    if (searchQuery) {
      const lower = searchQuery.toLowerCase()
      result = result.filter(l =>
        l.name.toLowerCase().includes(lower) ||
        l.description?.toLowerCase().includes(lower)
      )
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
        case 'modified':
          cmp = (a.lastModified || '').localeCompare(b.lastModified || '')
          break
        case 'count':
          cmp = a.strandCount - b.strandCount
          break
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })

    return result
  }, [level, looms, searchQuery, sortField, sortOrder])

  // Filtered and sorted strands
  const filteredStrands = useMemo(() => {
    if (level !== 'loom') return []

    let result = [...strands]

    // Search filter
    if (searchQuery) {
      const lower = searchQuery.toLowerCase()
      result = result.filter(s =>
        s.name.toLowerCase().includes(lower) ||
        s.description?.toLowerCase().includes(lower)
      )
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
        case 'modified':
          cmp = (a.lastModified || '').localeCompare(b.lastModified || '')
          break
        case 'count':
          cmp = (a.wordCount || 0) - (b.wordCount || 0)
          break
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })

    // Apply accent color from parent loom
    if (accentColor) {
      result = result.map(s => ({ ...s, accentColor: s.accentColor || accentColor }))
    }

    return result
  }, [level, strands, searchQuery, sortField, sortOrder, accentColor])

  const gridConfig = GRID_SIZES.find(g => g.value === gridSize) || GRID_SIZES[1]
  const cardSize = gridSize === 'small' ? 'sm' : gridSize === 'large' ? 'lg' : 'md'

  const items = level === 'weave' ? filteredLooms : filteredStrands
  const totalItems = level === 'weave' ? looms.length : strands.length
  const hasResults = items.length > 0
  const hasData = totalItems > 0

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className={`
        flex flex-col gap-4 px-6 py-4 border-b
        ${isDark ? 'border-zinc-800' : 'border-zinc-100'}
      `}>
        {/* Title and Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{currentEmoji || (level === 'weave' ? '📚' : '📁')}</span>
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                {currentName}
              </h2>
              <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {totalItems} {level === 'weave' ? 'looms' : 'strands'}
              </p>
            </div>
          </div>
          {onNavigate && (
            <BreadcrumbNav
              breadcrumbs={breadcrumbs}
              onNavigate={onNavigate}
              isDark={isDark}
            />
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className={`
              absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4
              ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
            `} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${level === 'weave' ? 'looms' : 'strands'}...`}
              className={`
                w-full pl-9 pr-4 py-2 rounded-lg text-sm
                ${isDark
                  ? 'bg-zinc-800 text-white placeholder:text-zinc-500 border-zinc-700'
                  : 'bg-white text-zinc-900 placeholder:text-zinc-400 border-zinc-200'
                }
                border focus:outline-none focus:ring-2 focus:ring-cyan-500/50
              `}
            />
          </div>

          {/* Sort */}
          <SortDropdown
            sortField={sortField}
            sortOrder={sortOrder}
            onSortChange={setSortField}
            onOrderToggle={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
            isDark={isDark}
          />

          {/* Grid Size */}
          <div className={`flex items-center gap-1 p-1 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
            {GRID_SIZES.map((size) => {
              const Icon = size.icon
              return (
                <button
                  key={size.value}
                  onClick={() => setGridSize(size.value)}
                  className={`
                    p-1.5 rounded-md transition-colors
                    ${gridSize === size.value
                      ? isDark
                        ? 'bg-zinc-700 text-white'
                        : 'bg-white text-zinc-900 shadow-sm'
                      : isDark
                        ? 'text-zinc-500 hover:text-zinc-300'
                        : 'text-zinc-400 hover:text-zinc-600'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
          </div>
        ) : !hasData ? (
          <EmptyState
            type={level === 'weave' ? 'looms' : 'strands'}
            isDark={isDark}
          />
        ) : !hasResults ? (
          <EmptyState type="search" isDark={isDark} />
        ) : (
          <div className={`grid ${gridConfig.cols} gap-4`}>
            {level === 'weave' ? (
              // Render LoomCards
              filteredLooms.map((loom) => (
                <motion.div
                  key={loom.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <LoomCard
                    data={loom}
                    onClick={() => onLoomClick?.(loom)}
                    onEdit={() => onEditLoom?.(loom)}
                    onDelete={() => onDeleteLoom?.(loom)}
                    onParentClick={() => onNavigate?.(loom.parentWeave)}
                    isDark={isDark}
                    size={cardSize}
                    showParent={false}
                  />
                </motion.div>
              ))
            ) : (
              // Render StrandCards
              filteredStrands.map((strand) => (
                <motion.div
                  key={strand.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <StrandCard
                    data={strand}
                    onClick={() => onStrandClick?.(strand)}
                    onEdit={() => onEditStrand?.(strand)}
                    onDelete={() => onDeleteStrand?.(strand)}
                    isDark={isDark}
                    size={cardSize}
                  />
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Named export
export { BucketView }
