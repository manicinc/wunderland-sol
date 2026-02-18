/**
 * Gallery Card Component
 *
 * Visual card with thumbnail for gallery view.
 * @module components/quarry/views/gallery/GalleryCard
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Edit3,
  MoreHorizontal,
  BookOpen,
  Calendar,
  StickyNote,
  Tag,
  FolderPlus,
} from 'lucide-react'
import type { StrandWithPath } from '../types'
import { AddToCollectionModal } from '@/components/quarry/ui/collections'

interface GalleryCardProps {
  /** Strand data */
  strand: StrandWithPath
  /** Navigate handler */
  onNavigate: (path: string) => void
  /** Edit handler */
  onEdit?: (strand: StrandWithPath) => void
  /** Current theme */
  theme?: string
  /** Card size */
  size?: 'small' | 'medium' | 'large'
}

export function GalleryCard({
  strand,
  onNavigate,
  onEdit,
  theme = 'light',
  size = 'medium',
}: GalleryCardProps) {
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showAddToCollection, setShowAddToCollection] = useState(false)
  const isDark = theme.includes('dark')

  // Check if this is a supernote
  const isSupernote = strand.metadata.strandType === 'supernote'
  const primarySupertag = strand.metadata.supernote?.primarySupertag

  const thumbnail = strand.thumbnail || strand.coverImage
  const hasThumbnail = thumbnail && !imageError

  const tags = Array.isArray(strand.metadata.tags)
    ? strand.metadata.tags
    : strand.metadata.tags
      ? [strand.metadata.tags]
      : []

  const difficulty = typeof strand.metadata.difficulty === 'string'
    ? strand.metadata.difficulty
    : null

  const status = strand.metadata.publishing?.status || 'draft'

  const difficultyColors: Record<string, string> = {
    beginner: 'bg-green-500',
    intermediate: 'bg-amber-500',
    advanced: 'bg-red-500',
  }

  const sizeClasses = {
    small: 'h-48',
    medium: 'h-64',
    large: 'h-80',
  }

  const cardClasses = `
    group relative flex flex-col overflow-hidden rounded-xl cursor-pointer
    ${isSupernote
      ? isDark
        ? 'bg-gradient-to-br from-stone-800 to-stone-900'
        : 'bg-gradient-to-br from-yellow-50 to-amber-100'
      : isDark
        ? 'bg-zinc-800'
        : 'bg-white'
    }
    border ${isSupernote
      ? isDark ? 'border-stone-600' : 'border-amber-300'
      : isDark ? 'border-zinc-700' : 'border-zinc-200'
    }
    shadow-sm hover:shadow-lg transition-all duration-200
    ${sizeClasses[size]}
  `

  return (
    <motion.div
      className={cardClasses}
      onClick={() => onNavigate(strand.path)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
      layout
    >
      {/* Corner fold effect for supernotes */}
      {isSupernote && (
        <div
          className="absolute top-0 right-0 z-10 w-0 h-0"
          style={{
            borderLeft: '20px solid transparent',
            borderTop: isDark ? '20px solid #57534e' : '20px solid #fcd34d',
          }}
        />
      )}

      {/* Thumbnail area */}
      <div className={`relative flex-shrink-0 ${hasThumbnail ? 'h-1/2' : isSupernote ? 'h-20' : 'h-16'}`}>
        {hasThumbnail ? (
          <>
            <img
              src={thumbnail}
              alt={strand.title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
            {/* Overlay on hover */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
            />
          </>
        ) : (
          <div
            className={`
              w-full h-full flex items-center justify-center
              ${isSupernote
                ? isDark ? 'bg-stone-700' : 'bg-amber-100/50'
                : isDark ? 'bg-zinc-700' : 'bg-zinc-100'
              }
            `}
          >
            {isSupernote ? (
              <StickyNote className={`w-8 h-8 ${isDark ? 'text-amber-500' : 'text-amber-600'}`} />
            ) : (
              <FileText className={`w-8 h-8 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
            )}
          </div>
        )}

        {/* Supernote badge with supertag */}
        {isSupernote && primarySupertag && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            <span className={`
              inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full
              ${isDark ? 'bg-amber-900/80 text-amber-300' : 'bg-amber-300 text-amber-900'}
            `}>
              <StickyNote className="w-2.5 h-2.5" />
              supernote
            </span>
            <span className={`
              inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded
              ${isDark ? 'bg-stone-800/80 text-stone-300' : 'bg-white/80 text-amber-800'}
            `}>
              <Tag className="w-2.5 h-2.5" />
              {primarySupertag}
            </span>
          </div>
        )}

        {/* Difficulty indicator */}
        {difficulty && !isSupernote && (
          <div
            className={`absolute top-2 left-2 w-2 h-2 rounded-full ${difficultyColors[difficulty]}`}
            title={difficulty}
          />
        )}

        {/* Status badge */}
        {status !== 'published' && !isSupernote && (
          <span
            className={`
              absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-medium rounded
              ${status === 'draft'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-zinc-200 text-zinc-600'
              }
            `}
          >
            {status}
          </span>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col p-3 overflow-hidden">
        {/* Title */}
        <h3
          className={`
            text-sm font-semibold line-clamp-2 mb-1
            ${isDark ? 'text-zinc-100' : 'text-zinc-800'}
          `}
        >
          {strand.title || strand.path.split('/').pop()}
        </h3>

        {/* Summary */}
        {strand.summary && (
          <p
            className={`
              text-xs line-clamp-2 mb-2 flex-1
              ${isDark ? 'text-zinc-400' : 'text-zinc-500'}
            `}
          >
            {strand.summary}
          </p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className={`
                  px-1.5 py-0.5 text-[10px] rounded
                  ${isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}
                `}
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Path */}
        <div
          className={`
            mt-2 pt-2 border-t text-[10px] truncate
            ${isDark ? 'border-zinc-700 text-zinc-500' : 'border-zinc-100 text-zinc-400'}
          `}
        >
          {strand.weave && `${strand.weave}`}
          {strand.loom && ` / ${strand.loom}`}
        </div>
      </div>

      {/* Hover overlay with actions */}
      <motion.div
        className={`
          absolute inset-0 flex items-center justify-center gap-2
          ${isDark ? 'bg-zinc-900/80' : 'bg-white/80'}
          backdrop-blur-sm
        `}
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onNavigate(strand.path)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg
            ${isDark ? 'bg-rose-600 hover:bg-rose-500' : 'bg-rose-500 hover:bg-rose-600'}
            text-white text-sm font-medium transition-colors
          `}
        >
          <BookOpen className="w-4 h-4" />
          Open
        </button>
        <button
          onClick={() => setShowAddToCollection(true)}
          className={`
            p-2 rounded-lg
            ${isDark ? 'bg-violet-600 hover:bg-violet-500' : 'bg-violet-500 hover:bg-violet-600'}
            text-white transition-colors
          `}
          title="Add to collection"
        >
          <FolderPlus className="w-4 h-4" />
        </button>
        {onEdit && (
          <button
            onClick={() => onEdit(strand)}
            className={`
              p-2 rounded-lg
              ${isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-200 hover:bg-zinc-300'}
              transition-colors
            `}
          >
            <Edit3 className={`w-4 h-4 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`} />
          </button>
        )}
      </motion.div>

      {/* Add to Collection Modal */}
      <AddToCollectionModal
        isOpen={showAddToCollection}
        onClose={() => setShowAddToCollection(false)}
        strandPaths={strand.path}
        strandTitle={strand.title}
        isDark={isDark}
      />
    </motion.div>
  )
}

export default GalleryCard
