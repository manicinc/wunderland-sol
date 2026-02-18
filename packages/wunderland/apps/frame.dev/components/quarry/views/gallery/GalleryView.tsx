/**
 * Gallery View Component
 *
 * Visual card grid view for strands.
 * @module components/quarry/views/gallery/GalleryView
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid,
  Grid3X3,
  Search,
  X,
  Loader2,
  Image as ImageIcon,
  Columns,
} from 'lucide-react'
import { GalleryCard } from './GalleryCard'
import type { GalleryViewProps, StrandWithPath } from '../types'

interface GalleryViewExtendedProps extends GalleryViewProps {
  /** Search query */
  searchQuery?: string
  /** Search change handler */
  onSearchChange?: (query: string) => void
}

export default function GalleryView({
  strands,
  layout,
  onLayoutChange,
  columns,
  onColumnsChange,
  onNavigate,
  onEdit,
  onDelete,
  theme = 'light',
  isLoading = false,
  searchQuery = '',
  onSearchChange,
}: GalleryViewExtendedProps) {
  const isDark = theme.includes('dark')
  const [localSearch, setLocalSearch] = useState(searchQuery)

  // Filter strands by search
  const filteredStrands = useMemo(() => {
    if (!localSearch.trim()) return strands

    const query = localSearch.toLowerCase()
    return strands.filter((strand) => {
      return (
        strand.title?.toLowerCase().includes(query) ||
        strand.path.toLowerCase().includes(query) ||
        strand.summary?.toLowerCase().includes(query) ||
        strand.metadata.tags?.toString().toLowerCase().includes(query)
      )
    })
  }, [strands, localSearch])

  const containerClasses = `
    flex flex-col h-full overflow-hidden rounded-lg border
    ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}
  `

  const toolbarClasses = `
    flex items-center justify-between gap-3 p-3 border-b
    ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
  `

  const gridClasses = `
    grid gap-4
    ${columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-4'}
  `

  return (
    <div className={containerClasses}>
      {/* Toolbar */}
      <div className={toolbarClasses}>
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg
              ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
            `}
          >
            <Search className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value)
                onSearchChange?.(e.target.value)
              }}
              placeholder="Search strands..."
              className={`
                flex-1 bg-transparent text-sm outline-none
                ${isDark ? 'text-zinc-100 placeholder-zinc-500' : 'text-zinc-800 placeholder-zinc-400'}
              `}
            />
            {localSearch && (
              <button
                onClick={() => {
                  setLocalSearch('')
                  onSearchChange?.('')
                }}
                className={`p-0.5 rounded ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Count */}
          <span className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {filteredStrands.length} strands
          </span>

          {/* Column selector */}
          <div className="flex items-center gap-1">
            <Columns className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => onColumnsChange(n)}
                className={`
                  w-7 h-7 flex items-center justify-center rounded text-sm
                  ${columns === n
                    ? isDark
                      ? 'bg-zinc-700 text-zinc-200'
                      : 'bg-zinc-200 text-zinc-800'
                    : isDark
                      ? 'text-zinc-500 hover:text-zinc-300'
                      : 'text-zinc-400 hover:text-zinc-600'
                  }
                  transition-colors
                `}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Layout toggle */}
          <div className={`flex rounded-lg overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
            <button
              onClick={() => onLayoutChange('grid')}
              className={`
                p-2 transition-colors
                ${layout === 'grid'
                  ? isDark
                    ? 'bg-zinc-700 text-zinc-200'
                    : 'bg-zinc-200 text-zinc-800'
                  : isDark
                    ? 'text-zinc-500 hover:text-zinc-300'
                    : 'text-zinc-400 hover:text-zinc-600'
                }
              `}
              title="Grid layout"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onLayoutChange('masonry')}
              className={`
                p-2 transition-colors
                ${layout === 'masonry'
                  ? isDark
                    ? 'bg-zinc-700 text-zinc-200'
                    : 'bg-zinc-200 text-zinc-800'
                  : isDark
                    ? 'text-zinc-500 hover:text-zinc-300'
                    : 'text-zinc-400 hover:text-zinc-600'
                }
              `}
              title="Masonry layout"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
          </div>
        ) : filteredStrands.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full gap-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <ImageIcon className="w-12 h-12 opacity-30" />
            <p className="text-sm">
              {localSearch ? 'No strands match your search' : 'No strands found'}
            </p>
          </div>
        ) : (
          <div className={gridClasses}>
            <AnimatePresence mode="popLayout">
              {filteredStrands.map((strand, index) => (
                <motion.div
                  key={strand.path}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.02, duration: 0.2 }}
                >
                  <GalleryCard
                    strand={strand}
                    onNavigate={onNavigate}
                    onEdit={onEdit}
                    theme={theme}
                    size={columns === 2 ? 'large' : columns === 3 ? 'medium' : 'small'}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
