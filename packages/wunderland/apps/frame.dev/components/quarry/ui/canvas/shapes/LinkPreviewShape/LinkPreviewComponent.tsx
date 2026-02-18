/**
 * Link Preview Component - Rich URL embed cards
 * @module codex/ui/canvas/shapes/LinkPreviewShape/LinkPreviewComponent
 *
 * Features:
 * - Thumbnail image display
 * - Site favicon
 * - Title and description
 * - Click to open link
 * - Loading state for unfetched URLs
 * - Error state for failed fetches
 */

'use client'

import React, { useCallback, memo, useState } from 'react'
import { HTMLContainer, track, useEditor, stopEventPropagation } from '@tldraw/tldraw'
import { ExternalLink, Globe, RefreshCw, AlertCircle, Link2 } from 'lucide-react'
import type { LinkPreviewShape } from '../types'
import type { LinkPreviewShapeUtil } from './LinkPreviewShapeUtil'

interface LinkPreviewComponentProps {
  shape: LinkPreviewShape
  util: LinkPreviewShapeUtil
}

/**
 * Interactive link preview component
 */
export const LinkPreviewComponent = track(function LinkPreviewComponent({
  shape,
  util,
}: LinkPreviewComponentProps) {
  const editor = useEditor()
  const isDark = editor.user.getIsDarkMode()
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const {
    w,
    h,
    url,
    title,
    description,
    thumbnailUrl,
    siteName,
    faviconUrl,
    loading,
    error,
  } = shape.props

  // Handle click to open URL
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    },
    [url]
  )

  // Handle refresh/refetch
  const handleRefresh = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      // Dispatch custom event for refetching metadata
      window.dispatchEvent(
        new CustomEvent('canvas-link-refetch', {
          detail: { shapeId: shape.id, url },
        })
      )
    },
    [shape.id, url]
  )

  // Extract domain from URL
  const getDomain = (urlStr: string) => {
    try {
      return new URL(urlStr).hostname.replace('www.', '')
    } catch {
      return urlStr
    }
  }

  // Loading state
  if (loading) {
    return (
      <HTMLContainer id={shape.id} style={{ width: w, height: h, pointerEvents: 'all' }}>
        <div
          className="w-full h-full rounded-xl flex items-center justify-center"
          style={{
            backgroundColor: isDark ? '#1f2937' : '#f9fafb',
            border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          }}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <RefreshCw className="w-6 h-6 animate-spin" style={{ color: isDark ? '#9ca3af' : '#6b7280' }} />
            <span className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              Fetching preview...
            </span>
          </div>
        </div>
      </HTMLContainer>
    )
  }

  // Error state
  if (error) {
    return (
      <HTMLContainer id={shape.id} style={{ width: w, height: h, pointerEvents: 'all' }}>
        <div
          className="w-full h-full rounded-xl flex flex-col items-center justify-center gap-2 p-4"
          style={{
            backgroundColor: isDark ? '#1f2937' : '#fef2f2',
            border: `1px solid ${isDark ? '#7f1d1d' : '#fecaca'}`,
          }}
        >
          <AlertCircle className="w-6 h-6" style={{ color: isDark ? '#f87171' : '#ef4444' }} />
          <span className="text-xs text-center" style={{ color: isDark ? '#f87171' : '#dc2626' }}>
            Failed to load preview
          </span>
          <button
            onClick={handleRefresh}
            onPointerDown={stopEventPropagation}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-black/10"
            style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      </HTMLContainer>
    )
  }

  const hasThumbnail = thumbnailUrl && !imageError
  const displayHeight = hasThumbnail ? Math.max(h, 160) : Math.max(h, 100)

  return (
    <HTMLContainer
      id={shape.id}
      style={{
        width: w,
        height: displayHeight,
        pointerEvents: 'all',
      }}
    >
      <div
        className="relative w-full h-full rounded-xl overflow-hidden transition-all duration-200 cursor-pointer group"
        style={{
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          border: `1px solid ${isHovered ? (isDark ? '#4b5563' : '#d1d5db') : (isDark ? '#374151' : '#e5e7eb')}`,
          boxShadow: isHovered 
            ? '0 4px 12px rgba(0,0,0,0.15)' 
            : '0 1px 3px rgba(0,0,0,0.08)',
        }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Thumbnail image */}
        {hasThumbnail && (
          <div className="relative w-full h-20 overflow-hidden">
            <img
              src={thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.1) 100%)',
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className="p-3">
          {/* Site info row */}
          <div className="flex items-center gap-2 mb-2">
            {/* Favicon */}
            {faviconUrl ? (
              <img
                src={faviconUrl}
                alt=""
                className="w-4 h-4 rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              <Globe className="w-4 h-4" style={{ color: isDark ? '#6b7280' : '#9ca3af' }} />
            )}
            
            {/* Site name / domain */}
            <span
              className="text-xs uppercase tracking-wide truncate"
              style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
            >
              {siteName || getDomain(url)}
            </span>

            {/* External link icon */}
            <ExternalLink
              className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: isDark ? '#60a5fa' : '#3b82f6' }}
            />
          </div>

          {/* Title */}
          <h3
            className="font-semibold text-sm leading-tight line-clamp-2 mb-1"
            style={{ color: isDark ? '#f3f4f6' : '#1f2937' }}
          >
            {title || url}
          </h3>

          {/* Description */}
          {description && (
            <p
              className="text-xs line-clamp-2 leading-relaxed"
              style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
            >
              {description}
            </p>
          )}

          {/* URL display */}
          <div className="flex items-center gap-1 mt-2">
            <Link2 className="w-3 h-3" style={{ color: isDark ? '#4b5563' : '#d1d5db' }} />
            <span
              className="text-xs truncate"
              style={{ color: isDark ? '#4b5563' : '#9ca3af' }}
            >
              {getDomain(url)}
            </span>
          </div>
        </div>

        {/* Hover overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, transparent 80%, ${isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)'} 100%)`,
          }}
        />
      </div>
    </HTMLContainer>
  )
})

export default memo(LinkPreviewComponent)

