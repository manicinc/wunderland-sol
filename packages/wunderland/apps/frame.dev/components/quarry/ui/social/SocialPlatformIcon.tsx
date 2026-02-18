/**
 * Social Platform Icon Component
 * @module codex/ui/SocialPlatformIcon
 *
 * @remarks
 * Renders social media platform icons with brand colors.
 * Supports multiple sizes and optional background styling.
 */

'use client'

import React from 'react'
import { getPlatformById, type SocialPlatform } from '@/lib/social/platforms'
import DynamicIcon from '../common/DynamicIcon'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface SocialPlatformIconProps {
  /** Platform ID (e.g., 'reddit', 'twitter') or full platform object */
  platform: string | SocialPlatform
  /** Icon size */
  size?: IconSize
  /** Show brand color background */
  showBackground?: boolean
  /** Additional CSS classes */
  className?: string
  /** Use light mode variant of brand color */
  useLightColor?: boolean
  /** Custom inline styles */
  style?: React.CSSProperties
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIZE MAPPINGS
═══════════════════════════════════════════════════════════════════════════ */

const ICON_SIZES: Record<IconSize, { icon: number; container: string }> = {
  xs: { icon: 12, container: 'w-4 h-4' },
  sm: { icon: 14, container: 'w-5 h-5' },
  md: { icon: 16, container: 'w-6 h-6' },
  lg: { icon: 20, container: 'w-8 h-8' },
  xl: { icon: 24, container: 'w-10 h-10' },
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Social Platform Icon
 *
 * Displays a platform icon with optional brand color background.
 *
 * @example
 * ```tsx
 * // Simple icon
 * <SocialPlatformIcon platform="reddit" />
 *
 * // With background
 * <SocialPlatformIcon platform="twitter" size="lg" showBackground />
 *
 * // From platform object
 * <SocialPlatformIcon platform={detectedPlatform} size="md" />
 * ```
 */
export default function SocialPlatformIcon({
  platform,
  size = 'md',
  showBackground = false,
  className = '',
  useLightColor = false,
  style,
}: SocialPlatformIconProps) {
  // Resolve platform object
  const platformData =
    typeof platform === 'string' ? getPlatformById(platform) : platform

  if (!platformData) {
    // Fallback for unknown platform
    return (
      <div
        className={`
          inline-flex items-center justify-center rounded
          ${ICON_SIZES[size].container}
          bg-gray-200 dark:bg-gray-700
          ${className}
        `}
        style={style}
        title="Unknown platform"
      >
        <DynamicIcon
          name="Globe"
          size={ICON_SIZES[size].icon}
          className="text-gray-500 dark:text-gray-400"
        />
      </div>
    )
  }

  const brandColor = useLightColor && platformData.colorLight
    ? platformData.colorLight
    : platformData.color

  if (showBackground) {
    return (
      <div
        className={`
          inline-flex items-center justify-center rounded
          ${ICON_SIZES[size].container}
          ${className}
        `}
        style={{
          backgroundColor: brandColor,
          ...style,
        }}
        title={platformData.name}
        role="img"
        aria-label={`${platformData.name} icon`}
      >
        <DynamicIcon
          name={platformData.icon}
          size={ICON_SIZES[size].icon}
          className="text-white"
        />
      </div>
    )
  }

  return (
    <div
      className={`
        inline-flex items-center justify-center
        ${ICON_SIZES[size].container}
        ${className}
      `}
      style={style}
      title={platformData.name}
      role="img"
      aria-label={`${platformData.name} icon`}
    >
      <DynamicIcon
        name={platformData.icon}
        size={ICON_SIZES[size].icon}
        style={{ color: brandColor }}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   VARIANT COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Compact platform indicator with name
 */
export function SocialPlatformLabel({
  platform,
  size = 'sm',
  showIcon = true,
  className = '',
}: {
  platform: string | SocialPlatform
  size?: IconSize
  showIcon?: boolean
  className?: string
}) {
  const platformData =
    typeof platform === 'string' ? getPlatformById(platform) : platform

  if (!platformData) return null

  return (
    <span
      className={`
        inline-flex items-center gap-1
        text-xs font-medium
        ${className}
      `}
      style={{ color: platformData.color }}
    >
      {showIcon && (
        <SocialPlatformIcon platform={platformData} size={size} />
      )}
      <span>{platformData.name}</span>
    </span>
  )
}

/**
 * Circular platform icon with white background
 */
export function SocialPlatformAvatar({
  platform,
  size = 'lg',
  className = '',
}: {
  platform: string | SocialPlatform
  size?: IconSize
  className?: string
}) {
  const platformData =
    typeof platform === 'string' ? getPlatformById(platform) : platform

  if (!platformData) {
    return (
      <div
        className={`
          inline-flex items-center justify-center rounded-full
          bg-gray-100 dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          ${ICON_SIZES[size].container}
          ${className}
        `}
      >
        <DynamicIcon
          name="Globe"
          size={ICON_SIZES[size].icon * 0.7}
          className="text-gray-400"
        />
      </div>
    )
  }

  return (
    <div
      className={`
        inline-flex items-center justify-center rounded-full
        bg-white dark:bg-gray-900
        border-2
        ${ICON_SIZES[size].container}
        ${className}
      `}
      style={{ borderColor: platformData.color }}
      title={platformData.name}
    >
      <DynamicIcon
        name={platformData.icon}
        size={ICON_SIZES[size].icon * 0.65}
        style={{ color: platformData.color }}
      />
    </div>
  )
}

/**
 * Stack of multiple platform icons
 */
export function SocialPlatformStack({
  platforms,
  maxVisible = 3,
  size = 'sm',
  className = '',
}: {
  platforms: (string | SocialPlatform)[]
  maxVisible?: number
  size?: IconSize
  className?: string
}) {
  const visible = platforms.slice(0, maxVisible)
  const overflow = platforms.length - maxVisible

  return (
    <div className={`flex items-center -space-x-1 ${className}`}>
      {visible.map((platform, i) => {
        const platformData =
          typeof platform === 'string' ? getPlatformById(platform) : platform
        const id = platformData?.id || `unknown-${i}`

        return (
          <SocialPlatformAvatar
            key={id}
            platform={platform}
            size={size}
            className="ring-2 ring-white dark:ring-gray-900"
          />
        )
      })}
      {overflow > 0 && (
        <div
          className={`
            inline-flex items-center justify-center rounded-full
            bg-gray-100 dark:bg-gray-800
            ring-2 ring-white dark:ring-gray-900
            ${ICON_SIZES[size].container}
          `}
        >
          <span className="text-[10px] font-bold text-gray-500">
            +{overflow}
          </span>
        </div>
      )}
    </div>
  )
}
