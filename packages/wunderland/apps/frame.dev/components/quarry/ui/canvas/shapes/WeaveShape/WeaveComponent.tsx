/**
 * Weave Component - Knowledge universe region for infinite canvas
 * @module codex/ui/canvas/shapes/WeaveShape/WeaveComponent
 *
 * Features:
 * - Large semi-transparent colored region
 * - Title in top-left corner with weave icon
 * - Gradient fade at edges
 * - Contains looms and strands
 * - Background layer (renders behind other shapes)
 */

'use client'

import React, { useMemo } from 'react'
import { HTMLContainer, track, useEditor } from '@tldraw/tldraw'
import { Globe, Layers } from 'lucide-react'
import type { WeaveShape } from '../types'
import { getShapeColors } from '../types'
import type { WeaveShapeUtil } from './WeaveShapeUtil'

interface WeaveComponentProps {
  shape: WeaveShape
  util: WeaveShapeUtil
}

/**
 * Knowledge universe region component for WeaveShape
 */
export const WeaveComponent = track(function WeaveComponent({
  shape,
  util,
}: WeaveComponentProps) {
  const editor = useEditor()
  const isDark = editor.user.getIsDarkMode()
  const colors = getShapeColors('weave', isDark)

  const {
    w,
    h,
    title,
    description,
    style,
    childLoomIds,
    childStrandIds,
    regionColor,
    regionOpacity,
  } = shape.props

  // Calculate child counts
  const totalChildren = childLoomIds.length + childStrandIds.length

  // Generate gradient style
  const gradientStyle = useMemo(() => {
    return {
      background: `radial-gradient(ellipse at center, ${regionColor}${Math.round(regionOpacity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
    }
  }, [regionColor, regionOpacity])

  return (
    <HTMLContainer
      id={shape.id}
      style={{
        width: w,
        height: h,
        pointerEvents: 'all',
      }}
    >
      <div
        className="relative w-full h-full rounded-3xl overflow-hidden"
        style={gradientStyle}
      >
        {/* Border ring */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            border: `2px dashed ${regionColor}40`,
          }}
        />

        {/* Title badge in top-left */}
        <div
          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-sm"
          style={{
            backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)',
          }}
        >
          {/* Icon */}
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ backgroundColor: regionColor }}
          >
            {style?.emoji ? (
              <span className="text-lg">{style.emoji}</span>
            ) : (
              <Globe className="w-5 h-5 text-white" />
            )}
          </div>

          {/* Title and stats */}
          <div>
            <h2
              className="font-bold text-lg"
              style={{ color: regionColor }}
            >
              {title}
            </h2>
            {description && (
              <p
                className="text-xs max-w-xs truncate"
                style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Stats badge in top-right */}
        {totalChildren > 0 && (
          <div
            className="absolute top-4 right-4 flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-sm"
            style={{
              backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)',
            }}
          >
            <Layers
              className="w-4 h-4"
              style={{ color: regionColor }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: isDark ? '#d1d5db' : '#374151' }}
            >
              {childLoomIds.length > 0 && `${childLoomIds.length} loom${childLoomIds.length !== 1 ? 's' : ''}`}
              {childLoomIds.length > 0 && childStrandIds.length > 0 && ', '}
              {childStrandIds.length > 0 && `${childStrandIds.length} strand${childStrandIds.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        )}

        {/* Center content indicator (when empty) */}
        {totalChildren === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="text-center p-6 rounded-2xl backdrop-blur-sm"
              style={{
                backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)',
              }}
            >
              <Globe
                className="w-12 h-12 mx-auto mb-3"
                style={{ color: `${regionColor}80` }}
              />
              <p
                className="text-sm"
                style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
              >
                Drop looms and strands here
              </p>
            </div>
          </div>
        )}
      </div>
    </HTMLContainer>
  )
})
