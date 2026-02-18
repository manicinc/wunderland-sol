/**
 * Collection Header - Title bar with icon, actions, and indicators
 * @module codex/ui/canvas/shapes/CollectionShape/CollectionHeader
 */

'use client'

import React, { memo } from 'react'
import {
  FolderOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  Folder,
  Brain,
  BookOpen,
  Star,
  Lightbulb,
  Target,
  Flame,
  Heart,
  Zap,
} from 'lucide-react'

/** Icon name to component mapping */
const ICON_MAP: Record<string, React.ElementType> = {
  folder: Folder,
  'folder-open': FolderOpen,
  brain: Brain,
  book: BookOpen,
  'book-open': BookOpen,
  star: Star,
  lightbulb: Lightbulb,
  target: Target,
  flame: Flame,
  heart: Heart,
  zap: Zap,
}

interface CollectionHeaderProps {
  title: string
  strandCount: number
  color: string
  icon?: string
  isSmart?: boolean
  crossWeave: boolean
  crossLoom: boolean
  expanded: boolean
  onToggle: (e: React.MouseEvent) => void
  onNavigate: (e: React.MouseEvent) => void
  isDark: boolean
}

/**
 * Header component for CollectionShape
 */
export const CollectionHeader = memo(function CollectionHeader({
  title,
  strandCount,
  color,
  icon,
  isSmart,
  crossWeave,
  crossLoom,
  expanded,
  onToggle,
  onNavigate,
  isDark,
}: CollectionHeaderProps) {
  // Get icon component
  const IconComponent = icon
    ? ICON_MAP[icon.toLowerCase()] || FolderOpen
    : FolderOpen

  // Check if icon is an emoji (starts with non-ASCII)
  const isEmoji = icon && /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u.test(icon)

  return (
    <div
      className="flex items-center justify-between px-3 py-2.5 rounded-t-2xl"
      style={{ backgroundColor: color }}
    >
      {/* Left: Icon + Title */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Icon or Emoji */}
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
          {isEmoji ? (
            <span className="text-lg">{icon}</span>
          ) : (
            <IconComponent className="w-5 h-5 text-white" />
          )}
        </div>

        {/* Title */}
        <h3
          className="font-semibold text-sm text-white truncate"
          title={title}
        >
          {title}
        </h3>

        {/* Smart collection indicator */}
        {isSmart && (
          <div
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-white/20"
            title="Smart collection - updates automatically"
          >
            <Sparkles className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Right: Count + Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Strand count badge */}
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
          {strandCount}
        </span>

        {/* Expand/collapse */}
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-white/20 transition-colors"
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-white" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white" />
          )}
        </button>

        {/* Navigate to collection */}
        <button
          onClick={onNavigate}
          className="p-1 rounded hover:bg-white/20 transition-colors"
          title="Open collection"
        >
          <ExternalLink className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  )
})

export default CollectionHeader
