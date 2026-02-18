/**
 * StrandCard - Minimal Card for Strands
 * @module components/quarry/ui/browse/StrandCard
 *
 * Minimal product card for displaying strands with optional thumbnail,
 * word count, and last modified date. Simpler than WeaveCard/LoomCard
 * since strands don't have dedicated cover photos.
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  Clock,
  BookOpen,
  Image as ImageIcon,
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export interface StrandCardData {
  id: string
  name: string
  path: string
  description?: string
  /** Optional thumbnail from frontmatter or first image */
  thumbnail?: string
  wordCount?: number
  lastModified?: string
  /** Parent loom's accent color for subtle styling */
  accentColor?: string
  /** Tags from frontmatter */
  tags?: string[]
}

export interface StrandCardProps {
  /** Strand data */
  data: StrandCardData
  /** Whether card is selected */
  isSelected?: boolean
  /** Click handler */
  onClick?: () => void
  /** Edit handler */
  onEdit?: () => void
  /** Delete handler */
  onDelete?: () => void
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
    padding: 'p-3',
    titleSize: 'text-sm',
    gap: 'gap-2',
    thumbnailSize: 'w-12 h-12',
    accentHeight: 'h-1',
  },
  md: {
    padding: 'p-4',
    titleSize: 'text-base',
    gap: 'gap-3',
    thumbnailSize: 'w-16 h-16',
    accentHeight: 'h-1.5',
  },
  lg: {
    padding: 'p-5',
    titleSize: 'text-lg',
    gap: 'gap-4',
    thumbnailSize: 'w-20 h-20',
    accentHeight: 'h-2',
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

function formatWordCount(count: number): string {
  if (count < 1000) return `${count} words`
  return `${(count / 1000).toFixed(1)}k words`
}

function getReadTime(wordCount: number): string {
  const minutes = Math.ceil(wordCount / 200)
  return `${minutes} min read`
}

/** Extract display name from path (remove extension, format) */
function getDisplayName(name: string, path: string): string {
  // Remove .md extension if present
  const cleanName = name.replace(/\.md$/i, '')
  // Convert kebab-case or snake_case to Title Case
  return cleanName
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
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

export default function StrandCard({
  data,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  isDark = false,
  size = 'md',
  className = '',
}: StrandCardProps) {
  const config = SIZE_CONFIGS[size]
  const displayName = getDisplayName(data.name, data.path)
  const accentColor = data.accentColor || '#6366f1'

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -2, scale: 1.01 }}
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
      {/* Accent Color Bar */}
      <div
        className={`w-full ${config.accentHeight}`}
        style={{ backgroundColor: accentColor }}
      />

      {/* Content */}
      <div className={`flex-1 flex ${config.padding}`}>
        {/* Thumbnail or Icon */}
        <div className="flex-shrink-0 mr-3">
          {data.thumbnail ? (
            <div
              className={`${config.thumbnailSize} rounded-lg bg-cover bg-center`}
              style={{ backgroundImage: `url("${data.thumbnail}")` }}
            />
          ) : (
            <div
              className={`
                ${config.thumbnailSize} rounded-lg flex items-center justify-center
                ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
              `}
            >
              <FileText className={`w-6 h-6 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
            </div>
          )}
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-semibold truncate ${config.titleSize} ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {displayName}
            </h3>
            <QuickActions onEdit={onEdit} onDelete={onDelete} isDark={isDark} />
          </div>

          {data.description && (
            <p className={`text-sm mt-1 line-clamp-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {data.description}
            </p>
          )}

          {/* Stats */}
          <div className={`flex items-center flex-wrap ${config.gap} mt-auto pt-2`}>
            {data.wordCount && data.wordCount > 0 && (
              <div className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                <BookOpen className="w-3.5 h-3.5" />
                <span className="text-xs">{formatWordCount(data.wordCount)}</span>
              </div>
            )}
            {data.wordCount && data.wordCount > 0 && (
              <div className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                <span className="text-xs">{getReadTime(data.wordCount)}</span>
              </div>
            )}
            {data.lastModified && (
              <div className={`flex items-center gap-1.5 ml-auto ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                <Clock className="w-3 h-3" />
                <span className="text-xs">{formatRelativeTime(data.lastModified)}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {data.tags && data.tags.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {data.tags.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  className={`
                    px-2 py-0.5 rounded-full text-xs
                    ${isDark
                      ? 'bg-zinc-800 text-zinc-400'
                      : 'bg-zinc-100 text-zinc-500'
                    }
                  `}
                >
                  {tag}
                </span>
              ))}
              {data.tags.length > 3 && (
                <span className={`text-xs ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  +{data.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Named export
export { StrandCard }
