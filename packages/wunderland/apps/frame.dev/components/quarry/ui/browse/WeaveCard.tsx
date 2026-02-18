/**
 * WeaveCard - Product Card for Weaves
 * @module components/quarry/ui/browse/WeaveCard
 *
 * Beautiful product card for displaying weaves with cover photos,
 * hierarchy indicators, and quick actions.
 */

'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  FolderOpen,
  MoreHorizontal,
  FileText,
  FolderTree,
  Pencil,
  Trash2,
  ExternalLink,
  Star,
  Clock,
} from 'lucide-react'
import { generateDefaultCover } from '@/lib/collections/coverGenerator'

// ============================================================================
// TYPES
// ============================================================================

export interface WeaveCardData {
  id: string
  name: string
  slug: string
  path: string
  description?: string
  coverUrl?: string
  emoji?: string
  icon?: string
  accentColor?: string
  strandCount: number
  loomCount: number
  lastModified?: string
  isFavorite?: boolean
}

export interface WeaveCardProps {
  /** Weave data */
  data: WeaveCardData
  /** Whether card is selected */
  isSelected?: boolean
  /** Click handler */
  onClick?: () => void
  /** Edit handler */
  onEdit?: () => void
  /** Delete handler */
  onDelete?: () => void
  /** Favorite toggle handler */
  onToggleFavorite?: () => void
  /** Whether dark mode is enabled */
  isDark?: boolean
  /** Card size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Custom class name */
  className?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SIZE_CONFIGS = {
  sm: {
    coverHeight: 'h-24',
    padding: 'p-3',
    titleSize: 'text-sm',
    iconSize: 'w-8 h-8 text-xl',
    gap: 'gap-2',
  },
  md: {
    coverHeight: 'h-32',
    padding: 'p-4',
    titleSize: 'text-base',
    iconSize: 'w-10 h-10 text-2xl',
    gap: 'gap-3',
  },
  lg: {
    coverHeight: 'h-40',
    padding: 'p-5',
    titleSize: 'text-lg',
    iconSize: 'w-12 h-12 text-3xl',
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
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface QuickActionsProps {
  onEdit?: () => void
  onDelete?: () => void
  onToggleFavorite?: () => void
  isFavorite?: boolean
  isDark: boolean
}

function QuickActions({ onEdit, onDelete, onToggleFavorite, isFavorite, isDark }: QuickActionsProps) {
  const [isOpen, setIsOpen] = React.useState(false)

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
              absolute right-0 top-full mt-1 z-20 min-w-[140px]
              rounded-lg shadow-xl border overflow-hidden
              ${isDark
                ? 'bg-zinc-800 border-zinc-700'
                : 'bg-white border-zinc-200'
              }
            `}
          >
            {onToggleFavorite && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleFavorite()
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
                <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                {isFavorite ? 'Unfavorite' : 'Favorite'}
              </button>
            )}
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

export default function WeaveCard({
  data,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  onToggleFavorite,
  isDark = false,
  size = 'md',
  className = '',
}: WeaveCardProps) {
  const config = SIZE_CONFIGS[size]

  // Generate default cover if none provided
  const coverUrl = useMemo(() => {
    if (data.coverUrl) return data.coverUrl
    return generateDefaultCover(data.name, data.accentColor || '#6366f1')
  }, [data.coverUrl, data.name, data.accentColor])

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`
        group relative flex flex-col overflow-hidden rounded-2xl cursor-pointer
        transition-all duration-300
        ${isDark
          ? 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700'
          : 'bg-white border border-zinc-200 hover:border-zinc-300 shadow-sm hover:shadow-lg'
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
      {/* Cover Image */}
      <div
        className={`relative ${config.coverHeight} bg-cover bg-center`}
        style={{ backgroundImage: `url("${coverUrl}")` }}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Favorite Badge */}
        {data.isFavorite && (
          <div className="absolute top-3 left-3">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400 drop-shadow-lg" />
          </div>
        )}

        {/* Quick Actions */}
        <div className="absolute top-2 right-2">
          <QuickActions
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleFavorite={onToggleFavorite}
            isFavorite={data.isFavorite}
            isDark
          />
        </div>

        {/* Icon Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-end gap-3">
            <div
              className={`
                ${config.iconSize} rounded-xl flex items-center justify-center
                bg-black/40 backdrop-blur-sm
              `}
            >
              {data.emoji || '📚'}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 flex flex-col ${config.padding}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold truncate ${config.titleSize} ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {data.name}
            </h3>
            {data.description && (
              <p className={`text-sm mt-1 line-clamp-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {data.description}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className={`flex items-center ${config.gap} mt-auto pt-3`}>
          <div className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <FolderTree className="w-4 h-4" />
            <span className="text-sm">{data.loomCount} looms</span>
          </div>
          <div className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <FileText className="w-4 h-4" />
            <span className="text-sm">{data.strandCount} strands</span>
          </div>
          {data.lastModified && (
            <div className={`flex items-center gap-1.5 ml-auto ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs">{formatRelativeTime(data.lastModified)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Path indicator on hover */}
      <div className={`
        absolute bottom-0 left-0 right-0 px-4 py-2
        opacity-0 group-hover:opacity-100 transition-opacity
        border-t
        ${isDark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white/95 border-zinc-100'}
      `}>
        <p className={`text-xs font-mono truncate ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {data.path}
        </p>
      </div>
    </motion.div>
  )
}

// Named export
export { WeaveCard }

