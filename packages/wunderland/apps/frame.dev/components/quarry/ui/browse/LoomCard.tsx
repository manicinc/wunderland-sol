/**
 * LoomCard - Product Card for Looms
 * @module components/quarry/ui/browse/LoomCard
 *
 * Product card for displaying looms with cover photos,
 * parent weave indicators, and quick actions.
 */

'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Folder,
  MoreHorizontal,
  FileText,
  Pencil,
  Trash2,
  ChevronRight,
  Clock,
  FolderOpen,
} from 'lucide-react'
import { generateDefaultCover } from '@/lib/collections/coverGenerator'

// ============================================================================
// TYPES
// ============================================================================

export interface LoomCardData {
  id: string
  name: string
  slug: string
  path: string
  description?: string
  coverUrl?: string
  emoji?: string
  accentColor?: string
  parentWeave: string
  parentWeaveName: string
  parentWeaveEmoji?: string
  strandCount: number
  depth: number
  lastModified?: string
}

export interface LoomCardProps {
  /** Loom data */
  data: LoomCardData
  /** Whether card is selected */
  isSelected?: boolean
  /** Click handler */
  onClick?: () => void
  /** Edit handler */
  onEdit?: () => void
  /** Delete handler */
  onDelete?: () => void
  /** Parent click handler */
  onParentClick?: () => void
  /** Whether dark mode is enabled */
  isDark?: boolean
  /** Card size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show parent breadcrumb */
  showParent?: boolean
  /** Custom class name */
  className?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SIZE_CONFIGS = {
  sm: {
    coverHeight: 'h-20',
    padding: 'p-3',
    titleSize: 'text-sm',
    iconSize: 'w-7 h-7 text-lg',
    gap: 'gap-2',
  },
  md: {
    coverHeight: 'h-28',
    padding: 'p-4',
    titleSize: 'text-base',
    iconSize: 'w-9 h-9 text-xl',
    gap: 'gap-3',
  },
  lg: {
    coverHeight: 'h-36',
    padding: 'p-5',
    titleSize: 'text-lg',
    iconSize: 'w-11 h-11 text-2xl',
    gap: 'gap-4',
  },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatRelativeTime(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface QuickActionsProps {
  onEdit?: () => void
  onDelete?: () => void
  isDark: boolean
}

function QuickActions({ onEdit, onDelete, isDark }: QuickActionsProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  if (!onEdit && !onDelete) return null

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className={`
          p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100
          ${isDark
            ? 'text-zinc-400 hover:text-white hover:bg-zinc-700'
            : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
          }
        `}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`
              absolute right-0 top-full mt-1 z-20 min-w-[120px]
              rounded-lg shadow-xl border overflow-hidden
              ${isDark
                ? 'bg-zinc-800 border-zinc-700'
                : 'bg-white border-zinc-200'
              }
            `}
          >
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
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
                <Pencil className="w-4 h-4" />
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                  setIsOpen(false)
                }}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-500
                  ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-50'}
                `}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </motion.div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LoomCard({
  data,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  onParentClick,
  isDark = false,
  size = 'md',
  showParent = true,
  className = '',
}: LoomCardProps) {
  const config = SIZE_CONFIGS[size]

  // Generate default cover if none provided
  const coverUrl = useMemo(() => {
    if (data.coverUrl) return data.coverUrl
    return generateDefaultCover(data.name, data.accentColor || '#8b5cf6')
  }, [data.coverUrl, data.name, data.accentColor])

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`
        group relative flex flex-col overflow-hidden rounded-xl cursor-pointer
        transition-all duration-300
        ${isDark
          ? 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700'
          : 'bg-white border border-zinc-200 hover:border-zinc-300 shadow-sm hover:shadow-md'
        }
        ${isSelected
          ? isDark
            ? 'ring-2 ring-cyan-500 border-cyan-500'
            : 'ring-2 ring-cyan-500 border-cyan-500'
          : ''
        }
        ${className}
      `}
    >
      {/* Parent Breadcrumb */}
      {showParent && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onParentClick?.()
          }}
          className={`
            flex items-center gap-1.5 px-3 py-2 text-xs
            border-b transition-colors
            ${isDark
              ? 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              : 'border-zinc-100 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50'
            }
          `}
        >
          <span>{data.parentWeaveEmoji || '📚'}</span>
          <span className="truncate">{data.parentWeaveName}</span>
          <ChevronRight className="w-3 h-3 opacity-50" />
        </button>
      )}

      {/* Cover Image */}
      <div
        className={`relative ${config.coverHeight} bg-cover bg-center`}
        style={{ backgroundImage: `url("${coverUrl}")` }}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Depth Indicator */}
        {data.depth > 0 && (
          <div className="absolute top-2 left-2">
            <div className={`
              px-2 py-0.5 rounded-full text-xs font-medium
              bg-black/40 backdrop-blur-sm text-white/80
            `}>
              Level {data.depth + 1}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="absolute top-2 right-2">
          <QuickActions onEdit={onEdit} onDelete={onDelete} isDark />
        </div>

        {/* Icon Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <div
            className={`
              ${config.iconSize} rounded-lg flex items-center justify-center
              bg-black/30 backdrop-blur-sm
            `}
          >
            {data.emoji || '📁'}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 flex flex-col ${config.padding}`}>
        <h3 className={`font-semibold truncate ${config.titleSize} ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          {data.name}
        </h3>
        
        {data.description && (
          <p className={`text-sm mt-1 line-clamp-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {data.description}
          </p>
        )}

        {/* Stats */}
        <div className={`flex items-center ${config.gap} mt-auto pt-2`}>
          <div className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <FileText className="w-3.5 h-3.5" />
            <span className="text-xs">{data.strandCount} strands</span>
          </div>
          {data.lastModified && (
            <div className={`flex items-center gap-1.5 ml-auto ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
              <Clock className="w-3 h-3" />
              <span className="text-xs">{formatRelativeTime(data.lastModified)}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Named export
export { LoomCard }

