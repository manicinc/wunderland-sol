/**
 * WeaveLoomGallery - Gallery View for Weaves and Looms
 * @module components/quarry/ui/browse/WeaveLoomGallery
 *
 * Main container for displaying weaves and looms in a product card gallery view.
 * Features filtering, sorting, search, and responsive grid layout.
 */

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  Grid,
  LayoutGrid,
  SortAsc,
  SortDesc,
  Plus,
  FolderPlus,
  RefreshCw,
  ChevronDown,
  Check,
  Loader2,
  FolderTree,
  Home,
  ChevronRight,
} from 'lucide-react'
import WeaveCard, { type WeaveCardData } from './WeaveCard'
import LoomCard, { type LoomCardData } from './LoomCard'

// ============================================================================
// TYPES
// ============================================================================

export interface WeaveLoomGalleryProps {
  /** Weave data */
  weaves: WeaveCardData[]
  /** Loom data */
  looms: LoomCardData[]
  /** Current path for breadcrumb navigation */
  currentPath?: string
  /** Whether data is loading */
  isLoading?: boolean
  /** Weave click handler */
  onWeaveClick?: (weave: WeaveCardData) => void
  /** Loom click handler */
  onLoomClick?: (loom: LoomCardData) => void
  /** Edit weave handler */
  onEditWeave?: (weave: WeaveCardData) => void
  /** Delete weave handler */
  onDeleteWeave?: (weave: WeaveCardData) => void
  /** Edit loom handler */
  onEditLoom?: (loom: LoomCardData) => void
  /** Delete loom handler */
  onDeleteLoom?: (loom: LoomCardData) => void
  /** Create new weave handler */
  onCreateWeave?: () => void
  /** Create new loom handler */
  onCreateLoom?: () => void
  /** Refresh handler */
  onRefresh?: () => void
  /** Navigate to path handler */
  onNavigate?: (path: string) => void
  /** Whether dark mode is enabled */
  isDark?: boolean
  /** Custom class name */
  className?: string
}

type SortField = 'name' | 'modified' | 'strands'
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
  { value: 'strands', label: 'Strand Count' },
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
  if (!path) return [{ name: 'Home', path: '/', emoji: '🏠' }]

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
  type: 'weaves' | 'looms' | 'search'
  onCreateWeave?: () => void
  onCreateLoom?: () => void
  isDark: boolean
}

function EmptyState({ type, onCreateWeave, onCreateLoom, isDark }: EmptyStateProps) {
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
          Try adjusting your search or filters
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className={`p-4 rounded-2xl mb-4 ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
        <FolderTree className={`w-8 h-8 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
      </div>
      <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
        {type === 'weaves' ? 'No weaves yet' : 'No looms in this weave'}
      </h3>
      <p className={`text-sm mt-1 max-w-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
        {type === 'weaves'
          ? 'Create your first weave to start organizing your knowledge.'
          : 'Add looms to organize your strands into collections.'}
      </p>
      {(onCreateWeave || onCreateLoom) && (
        <button
          onClick={type === 'weaves' ? onCreateWeave : onCreateLoom}
          className={`
            flex items-center gap-2 mt-4 px-4 py-2 rounded-xl font-medium
            bg-gradient-to-r from-cyan-500 to-blue-500 text-white
            hover:from-cyan-600 hover:to-blue-600
            transition-all duration-200
          `}
        >
          <Plus className="w-4 h-4" />
          {type === 'weaves' ? 'Create Weave' : 'Create Loom'}
        </button>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WeaveLoomGallery({
  weaves,
  looms,
  currentPath = '/',
  isLoading = false,
  onWeaveClick,
  onLoomClick,
  onEditWeave,
  onDeleteWeave,
  onEditLoom,
  onDeleteLoom,
  onCreateWeave,
  onCreateLoom,
  onRefresh,
  onNavigate,
  isDark = false,
  className = '',
}: WeaveLoomGalleryProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [gridSize, setGridSize] = useState<GridSize>('medium')

  // Breadcrumbs
  const breadcrumbs = useMemo(() => parsePath(currentPath), [currentPath])

  // Filtered and sorted data
  const filteredWeaves = useMemo(() => {
    let result = [...weaves]

    // Search filter
    if (searchQuery) {
      const lower = searchQuery.toLowerCase()
      result = result.filter(w =>
        w.name.toLowerCase().includes(lower) ||
        w.description?.toLowerCase().includes(lower)
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
        case 'strands':
          cmp = a.strandCount - b.strandCount
          break
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })

    return result
  }, [weaves, searchQuery, sortField, sortOrder])

  const filteredLooms = useMemo(() => {
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
        case 'strands':
          cmp = a.strandCount - b.strandCount
          break
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })

    return result
  }, [looms, searchQuery, sortField, sortOrder])

  const gridConfig = GRID_SIZES.find(g => g.value === gridSize) || GRID_SIZES[1]
  const cardSize = gridSize === 'small' ? 'sm' : gridSize === 'large' ? 'lg' : 'md'

  const hasResults = filteredWeaves.length > 0 || filteredLooms.length > 0
  const hasData = weaves.length > 0 || looms.length > 0

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className={`
        flex flex-col gap-4 px-6 py-4 border-b
        ${isDark ? 'border-zinc-800' : 'border-zinc-100'}
      `}>
        {/* Breadcrumb */}
        {onNavigate && (
          <BreadcrumbNav
            breadcrumbs={breadcrumbs}
            onNavigate={onNavigate}
            isDark={isDark}
          />
        )}

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
              placeholder="Search weaves and looms..."
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
          <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
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

          {/* Refresh */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className={`
                p-2 rounded-lg transition-colors
                ${isDark
                  ? 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                  : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'
                }
              `}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Create Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            {onCreateLoom && (
              <button
                onClick={onCreateLoom}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                  transition-colors
                  ${isDark
                    ? 'text-zinc-300 hover:bg-zinc-800'
                    : 'text-zinc-700 hover:bg-zinc-100'
                  }
                `}
              >
                <FolderPlus className="w-4 h-4" />
                <span className="hidden sm:inline">New Loom</span>
              </button>
            )}
            {onCreateWeave && (
              <button
                onClick={onCreateWeave}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
                  bg-gradient-to-r from-cyan-500 to-blue-500 text-white
                  hover:from-cyan-600 hover:to-blue-600
                  transition-all duration-200
                `}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Weave</span>
              </button>
            )}
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
            type="weaves"
            onCreateWeave={onCreateWeave}
            isDark={isDark}
          />
        ) : !hasResults ? (
          <EmptyState type="search" isDark={isDark} />
        ) : (
          <div className="space-y-8">
            {/* Weaves Section */}
            {filteredWeaves.length > 0 && (
              <section>
                <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  Weaves
                  <span className={`ml-2 text-sm font-normal ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    ({filteredWeaves.length})
                  </span>
                </h2>
                <div className={`grid ${gridConfig.cols} gap-4`}>
                  {filteredWeaves.map((weave) => (
                    <motion.div
                      key={weave.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <WeaveCard
                        data={weave}
                        onClick={() => onWeaveClick?.(weave)}
                        onEdit={() => onEditWeave?.(weave)}
                        onDelete={() => onDeleteWeave?.(weave)}
                        isDark={isDark}
                        size={cardSize}
                      />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Looms Section */}
            {filteredLooms.length > 0 && (
              <section>
                <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  Looms
                  <span className={`ml-2 text-sm font-normal ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    ({filteredLooms.length})
                  </span>
                </h2>
                <div className={`grid ${gridConfig.cols} gap-4`}>
                  {filteredLooms.map((loom) => (
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
                      />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Named export
export { WeaveLoomGallery }

