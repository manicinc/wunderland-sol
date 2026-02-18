/**
 * Social Source Badge Component
 * @module codex/ui/SocialSourceBadge
 *
 * @remarks
 * A compact chip that displays social platform source attribution.
 * Shows platform icon, username, and optionally engagement stats.
 * Clicking opens the original post in a new tab.
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Heart, MessageCircle, Share2, Eye, ArrowUp } from 'lucide-react'
import { getPlatformById, type SocialPlatform, type SocialEngagement } from '@/lib/social/platforms'
import SocialPlatformIcon from './SocialPlatformIcon'
import { Tooltip } from '../common/Tooltip'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface SocialSourceBadgeProps {
  /** Platform ID or object */
  platform: string | SocialPlatform
  /** Username (with @ prefix if applicable) */
  username?: string
  /** Post ID */
  postId?: string
  /** URL to the original post */
  sourceUrl?: string
  /** Engagement stats */
  engagement?: SocialEngagement
  /** Posted timestamp */
  postedAt?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show engagement stats in tooltip */
  showEngagement?: boolean
  /** Additional CSS classes */
  className?: string
  /** Click handler (overrides opening URL) */
  onClick?: () => void
  /** Preview link in sidebar (Alt+Click or via preview button) */
  onPreviewLink?: (url: string) => void
  /** Show preview button alongside external link */
  showPreviewButton?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
    return `${Math.floor(diffDays / 365)}y ago`
  } catch {
    return dateStr
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIZE CONFIG
═══════════════════════════════════════════════════════════════════════════ */

const SIZE_CLASSES = {
  sm: {
    container: 'px-1.5 py-0.5 gap-1 text-[10px]',
    icon: 'xs' as const,
  },
  md: {
    container: 'px-2 py-1 gap-1.5 text-xs',
    icon: 'sm' as const,
  },
  lg: {
    container: 'px-2.5 py-1.5 gap-2 text-sm',
    icon: 'md' as const,
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   ENGAGEMENT TOOLTIP CONTENT
═══════════════════════════════════════════════════════════════════════════ */

function EngagementTooltipContent({
  engagement,
  postedAt,
  platformName,
}: {
  engagement?: SocialEngagement
  postedAt?: string
  platformName: string
}) {
  if (!engagement && !postedAt) return null

  const stats = [
    engagement?.likes !== undefined && {
      icon: Heart,
      label: 'Likes',
      value: engagement.likes,
    },
    engagement?.upvotes !== undefined && {
      icon: ArrowUp,
      label: 'Upvotes',
      value: engagement.upvotes,
    },
    engagement?.comments !== undefined && {
      icon: MessageCircle,
      label: 'Comments',
      value: engagement.comments,
    },
    engagement?.shares !== undefined && {
      icon: Share2,
      label: 'Shares',
      value: engagement.shares,
    },
    engagement?.retweets !== undefined && {
      icon: Share2,
      label: 'Retweets',
      value: engagement.retweets,
    },
    engagement?.views !== undefined && {
      icon: Eye,
      label: 'Views',
      value: engagement.views,
    },
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: number }[]

  return (
    <div className="space-y-2 text-xs">
      <div className="font-medium text-gray-700 dark:text-gray-200">
        {platformName} Post
      </div>

      {postedAt && (
        <div className="text-gray-500 dark:text-gray-400">
          Posted {formatRelativeTime(postedAt)}
        </div>
      )}

      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 border-t border-gray-200 dark:border-gray-700">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-1">
              <Icon className="w-3 h-3 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300">
                {formatCount(value)}
              </span>
              <span className="text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-200 dark:border-gray-700">
        Click to view original • Alt+Click to preview
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Social Source Badge
 *
 * Compact attribution badge for social media sources.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <SocialSourceBadge
 *   platform="reddit"
 *   username="u/example"
 *   sourceUrl="https://reddit.com/r/..."
 * />
 *
 * // With engagement
 * <SocialSourceBadge
 *   platform="twitter"
 *   username="@handle"
 *   sourceUrl="https://twitter.com/..."
 *   engagement={{ likes: 1200, retweets: 45 }}
 *   showEngagement
 * />
 * ```
 */
export default function SocialSourceBadge({
  platform,
  username,
  postId,
  sourceUrl,
  engagement,
  postedAt,
  size = 'md',
  showEngagement = true,
  className = '',
  onClick,
  onPreviewLink,
  showPreviewButton = false,
}: SocialSourceBadgeProps) {
  const platformData =
    typeof platform === 'string' ? getPlatformById(platform) : platform

  if (!platformData) return null

  const sizeConfig = SIZE_CLASSES[size]

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick()
    } else if (sourceUrl) {
      // Alt+Click triggers preview if available
      if (e.altKey && onPreviewLink) {
        e.preventDefault()
        onPreviewLink(sourceUrl)
      } else {
        window.open(sourceUrl, '_blank', 'noopener,noreferrer')
      }
    }
  }

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (sourceUrl && onPreviewLink) {
      onPreviewLink(sourceUrl)
    }
  }

  const badgeContent = (
    <motion.button
      onClick={handleClick}
      disabled={!sourceUrl && !onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        inline-flex items-center rounded-full
        bg-gray-100 dark:bg-gray-800
        hover:bg-gray-200 dark:hover:bg-gray-700
        border border-gray-200 dark:border-gray-700
        transition-colors duration-150
        disabled:cursor-default disabled:hover:bg-gray-100 dark:disabled:hover:bg-gray-800
        ${sizeConfig.container}
        ${className}
      `}
      style={{
        borderColor: platformData.color + '40',
      }}
      aria-label={`View ${username || 'post'} on ${platformData.name}`}
    >
      <SocialPlatformIcon
        platform={platformData}
        size={sizeConfig.icon}
        showBackground
      />

      {username && (
        <span
          className="font-medium truncate max-w-[120px]"
          style={{ color: platformData.color }}
        >
          {username}
        </span>
      )}

      {!username && postId && (
        <span className="text-gray-500 dark:text-gray-400 truncate max-w-[80px]">
          #{postId.slice(0, 8)}
        </span>
      )}

      {sourceUrl && (
        <span className="flex items-center gap-0.5">
          {showPreviewButton && onPreviewLink && (
            <span
              onClick={handlePreview}
              className="p-0.5 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors cursor-pointer"
              title="Preview in sidebar"
            >
              <Eye className="w-2.5 h-2.5 text-cyan-500 dark:text-cyan-400" />
            </span>
          )}
          <ExternalLink className="w-2.5 h-2.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        </span>
      )}
    </motion.button>
  )

  // Wrap with tooltip if we have engagement data to show
  if (showEngagement && (engagement || postedAt)) {
    return (
      <Tooltip
        content={
          <EngagementTooltipContent
            engagement={engagement}
            postedAt={postedAt}
            platformName={platformData.name}
          />
        }
        placement="bottom"
      >
        {badgeContent}
      </Tooltip>
    )
  }

  return badgeContent
}

/* ═══════════════════════════════════════════════════════════════════════════
   VARIANT: INLINE ATTRIBUTION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Inline text attribution for social sources
 */
export function SocialSourceInline({
  platform,
  username,
  sourceUrl,
  className = '',
  onPreviewLink,
}: {
  platform: string | SocialPlatform
  username?: string
  sourceUrl?: string
  className?: string
  /** Preview link in sidebar (Alt+Click) */
  onPreviewLink?: (url: string) => void
}) {
  const platformData =
    typeof platform === 'string' ? getPlatformById(platform) : platform

  if (!platformData) return null

  const handleClick = (e: React.MouseEvent) => {
    if (sourceUrl && e.altKey && onPreviewLink) {
      e.preventDefault()
      onPreviewLink(sourceUrl)
    }
  }

  const content = (
    <span
      className={`
        inline-flex items-center gap-1
        text-xs
        ${className}
      `}
      style={{ color: platformData.color }}
    >
      <SocialPlatformIcon platform={platformData} size="xs" />
      <span className="font-medium">
        {username || platformData.name}
      </span>
    </span>
  )

  if (sourceUrl) {
    return (
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
        onClick={handleClick}
        title={onPreviewLink ? "Click to open • Alt+Click to preview" : undefined}
      >
        {content}
      </a>
    )
  }

  return content
}

/* ═══════════════════════════════════════════════════════════════════════════
   VARIANT: ENGAGEMENT STATS BAR
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Horizontal engagement stats display
 */
export function SocialEngagementBar({
  engagement,
  platform,
  className = '',
}: {
  engagement: SocialEngagement
  platform?: string | SocialPlatform
  className?: string
}) {
  const platformData = platform
    ? typeof platform === 'string'
      ? getPlatformById(platform)
      : platform
    : null

  const accentColor = platformData?.color || '#6b7280'

  const stats = [
    engagement.likes !== undefined && {
      icon: Heart,
      value: engagement.likes,
      label: 'likes',
    },
    engagement.upvotes !== undefined && {
      icon: ArrowUp,
      value: engagement.upvotes,
      label: 'upvotes',
    },
    engagement.comments !== undefined && {
      icon: MessageCircle,
      value: engagement.comments,
      label: 'comments',
    },
    engagement.shares !== undefined && {
      icon: Share2,
      value: engagement.shares,
      label: 'shares',
    },
    engagement.retweets !== undefined && {
      icon: Share2,
      value: engagement.retweets,
      label: 'retweets',
    },
    engagement.views !== undefined && {
      icon: Eye,
      value: engagement.views,
      label: 'views',
    },
  ].filter(Boolean) as { icon: React.ElementType; value: number; label: string }[]

  if (stats.length === 0) return null

  return (
    <div
      className={`
        flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400
        ${className}
      `}
    >
      {stats.map(({ icon: Icon, value, label }) => (
        <span key={label} className="inline-flex items-center gap-1">
          <Icon
            className="w-3.5 h-3.5"
            style={{ color: accentColor }}
          />
          <span>{formatCount(value)}</span>
        </span>
      ))}
    </div>
  )
}
