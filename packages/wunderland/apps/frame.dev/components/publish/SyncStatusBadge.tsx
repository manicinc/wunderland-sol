/**
 * SyncStatusBadge Component
 * @module components/publish/SyncStatusBadge
 *
 * Visual indicator for sync status of publishable content.
 * Shows current state: local, pending, syncing, synced, modified, conflict, failed.
 */

'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import type { SyncStatus } from '@/lib/publish/types'
import { SYNC_STATUS_LABELS, SYNC_STATUS_COLORS } from '@/lib/publish/constants'

// ============================================================================
// TYPES
// ============================================================================

export interface SyncStatusBadgeProps {
  /** Current sync status */
  status: SyncStatus
  /** Show text label */
  showLabel?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional className */
  className?: string
  /** Show tooltip on hover */
  showTooltip?: boolean
  /** Custom tooltip text */
  tooltipText?: string
  /** Click handler */
  onClick?: () => void
}

// ============================================================================
// STATUS ICONS
// ============================================================================

const StatusIcons: Record<SyncStatus, React.ReactNode> = {
  local: (
    <svg className="w-full h-full" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="4" fill="currentColor" />
    </svg>
  ),
  pending: (
    <svg className="w-full h-full" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="4" fill="currentColor" />
    </svg>
  ),
  syncing: (
    <svg className="w-full h-full animate-spin" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 2C4.686 2 2 4.686 2 8s2.686 6 6 6 6-2.686 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  synced: (
    <svg className="w-full h-full" viewBox="0 0 16 16" fill="none">
      <path
        d="M4 8l3 3 5-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  modified: (
    <svg className="w-full h-full" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="4" fill="currentColor" />
    </svg>
  ),
  conflict: (
    <svg className="w-full h-full" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 4v5M8 11v1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  failed: (
    <svg className="w-full h-full" viewBox="0 0 16 16" fill="none">
      <path
        d="M5 5l6 6M11 5l-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
}

// ============================================================================
// SIZE VARIANTS
// ============================================================================

const sizeClasses = {
  sm: {
    badge: 'h-4 px-1.5 text-[10px]',
    dot: 'w-2 h-2',
    icon: 'w-3 h-3',
  },
  md: {
    badge: 'h-5 px-2 text-xs',
    dot: 'w-2.5 h-2.5',
    icon: 'w-3.5 h-3.5',
  },
  lg: {
    badge: 'h-6 px-2.5 text-sm',
    dot: 'w-3 h-3',
    icon: 'w-4 h-4',
  },
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SyncStatusBadge({
  status,
  showLabel = true,
  size = 'md',
  className,
  showTooltip = true,
  tooltipText,
  onClick,
}: SyncStatusBadgeProps) {
  const colors = SYNC_STATUS_COLORS[status]
  const label = SYNC_STATUS_LABELS[status]
  const sizes = sizeClasses[size]

  const tooltip = tooltipText || getTooltipText(status)

  const badge = (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors',
        colors.bg,
        colors.text,
        sizes.badge,
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Icon or dot */}
      <span className={cn('flex-shrink-0', sizes.icon)}>
        {StatusIcons[status]}
      </span>

      {/* Label */}
      {showLabel && (
        <span className="leading-none">{label}</span>
      )}
    </div>
  )

  // Wrap with tooltip if enabled
  if (showTooltip && tooltip) {
    return (
      <div className="relative group inline-block">
        {badge}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {tooltip}
        </div>
      </div>
    )
  }

  return badge
}

// ============================================================================
// DOT ONLY VARIANT
// ============================================================================

export interface SyncStatusDotProps {
  status: SyncStatus
  size?: 'sm' | 'md' | 'lg'
  className?: string
  pulse?: boolean
}

export function SyncStatusDot({
  status,
  size = 'md',
  className,
  pulse = false,
}: SyncStatusDotProps) {
  const colors = SYNC_STATUS_COLORS[status]
  const sizes = sizeClasses[size]

  const shouldPulse = pulse || status === 'syncing' || status === 'pending'

  return (
    <span
      className={cn(
        'inline-block rounded-full',
        colors.dot,
        sizes.dot,
        shouldPulse && 'animate-pulse',
        className
      )}
      title={SYNC_STATUS_LABELS[status]}
    />
  )
}

// ============================================================================
// ICON ONLY VARIANT
// ============================================================================

export interface SyncStatusIconProps {
  status: SyncStatus
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function SyncStatusIcon({
  status,
  size = 'md',
  className,
}: SyncStatusIconProps) {
  const colors = SYNC_STATUS_COLORS[status]
  const sizes = sizeClasses[size]

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        colors.text,
        sizes.icon,
        className
      )}
      title={SYNC_STATUS_LABELS[status]}
    >
      {StatusIcons[status]}
    </span>
  )
}

// ============================================================================
// HELPERS
// ============================================================================

function getTooltipText(status: SyncStatus): string {
  switch (status) {
    case 'local':
      return 'Only exists locally, not published'
    case 'pending':
      return 'Queued for publishing'
    case 'syncing':
      return 'Currently syncing with GitHub'
    case 'synced':
      return 'Successfully synced with GitHub'
    case 'modified':
      return 'Local changes since last sync'
    case 'conflict':
      return 'Conflict with remote version'
    case 'failed':
      return 'Sync failed - click to retry'
    default:
      return ''
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default SyncStatusBadge
