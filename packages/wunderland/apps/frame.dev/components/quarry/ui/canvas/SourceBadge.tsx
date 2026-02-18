/**
 * Source Badge - Platform badge overlay for canvas shapes
 * @module codex/ui/canvas/SourceBadge
 *
 * Shows the source platform for imported content with platform-specific
 * styling and colors.
 */

'use client'

import React from 'react'
import {
  Pin,
  Instagram,
  Twitter,
  Youtube,
  Github,
  Linkedin,
  Globe,
  FileText,
  BookOpen,
  Video,
  MessageCircle,
  Circle,
  PenTool,
  Music,
  Headphones,
  Figma,
} from 'lucide-react'
import type { Platform, PlatformSourceMetadata } from '@/lib/canvas/sourceDetection'
import { getPlatformBadgeStyles, PLATFORM_INFO } from '@/lib/canvas/sourceDetection'

interface SourceBadgeProps {
  source: PlatformSourceMetadata
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
  /** Preview link in sidebar (Alt+Click) */
  onPreviewLink?: (url: string) => void
}

// Icon mapping for platforms
const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  pin: Pin,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  github: Github,
  linkedin: Linkedin,
  globe: Globe,
  'file-text': FileText,
  'book-open': BookOpen,
  video: Video,
  'message-circle': MessageCircle,
  circle: Circle,
  'pen-tool': PenTool,
  music: Music,
  headphones: Headphones,
  figma: Figma,
}

/**
 * Platform source badge component
 */
export function SourceBadge({
  source,
  size = 'sm',
  showLabel = false,
  className = '',
  onPreviewLink,
}: SourceBadgeProps) {
  const styles = getPlatformBadgeStyles(source.platform)
  const Icon = PLATFORM_ICONS[source.iconName] || Globe

  const sizeClasses = {
    sm: 'h-5 px-1.5 text-[10px]',
    md: 'h-6 px-2 text-xs',
    lg: 'h-8 px-3 text-sm',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Alt+Click triggers preview if available
    if (e.altKey && onPreviewLink && source.url) {
      e.preventDefault()
      onPreviewLink(source.url)
    }
  }

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        inline-flex items-center gap-1 rounded-full
        font-medium transition-all
        hover:scale-105 hover:shadow-md
        ${sizeClasses[size]}
        ${className}
      `}
      style={{
        backgroundColor: styles.backgroundColor,
        color: styles.textColor,
        border: `1px solid ${styles.borderColor}`,
      }}
      title={onPreviewLink ? `View on ${source.platformName} • Alt+Click to preview` : `View on ${source.platformName}`}
      onClick={handleClick}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && (
        <span className="truncate max-w-[100px]">
          {source.username || source.platformName}
        </span>
      )}
    </a>
  )
}

/**
 * Compact source indicator (just icon)
 */
export function SourceIndicator({
  platform,
  url,
  size = 16,
  className = '',
  onPreviewLink,
}: {
  platform: Platform
  url: string
  size?: number
  className?: string
  /** Preview link in sidebar (Alt+Click) */
  onPreviewLink?: (url: string) => void
}) {
  const info = PLATFORM_INFO[platform]
  const Icon = PLATFORM_ICONS[info.icon] || Globe

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Alt+Click triggers preview if available
    if (e.altKey && onPreviewLink) {
      e.preventDefault()
      onPreviewLink(url)
    }
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        inline-flex items-center justify-center rounded-full
        transition-all hover:scale-110
        ${className}
      `}
      style={{
        width: size,
        height: size,
        backgroundColor: `${info.color}20`,
        color: info.color,
      }}
      title={onPreviewLink ? `View on ${info.name} • Alt+Click to preview` : `View on ${info.name}`}
      onClick={handleClick}
    >
      <Icon style={{ width: size * 0.6, height: size * 0.6 }} />
    </a>
  )
}

export default SourceBadge
