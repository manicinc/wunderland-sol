/**
 * Connection Component - Relationship link visualization
 * @module codex/ui/canvas/shapes/ConnectionShape/ConnectionComponent
 *
 * Features:
 * - Styled line per relationship type
 * - Hover effects
 * - Label display
 * - Arrow indicators
 */

'use client'

import React, { useMemo } from 'react'
import { HTMLContainer, track, useEditor } from '@tldraw/tldraw'
import type { ConnectionShape } from '../types'
import { getConnectionVisuals } from '../types'
import type { ConnectionShapeUtil } from './ConnectionShapeUtil'

interface ConnectionComponentProps {
  shape: ConnectionShape
  util: ConnectionShapeUtil
}

/**
 * Relationship visualization component for ConnectionShape
 */
export const ConnectionComponent = track(function ConnectionComponent({
  shape,
  util,
}: ConnectionComponentProps) {
  const editor = useEditor()
  const isDark = editor.user.getIsDarkMode()

  const {
    w,
    h,
    relationshipType,
    strength,
    bidirectional,
    label,
    lineStyle,
    color,
    arrowType,
  } = shape.props

  // Get visuals from relationship type
  const visuals = useMemo(() => getConnectionVisuals(relationshipType), [relationshipType])

  // Calculate stroke width based on strength
  const strokeWidth = 1 + strength * 3

  // Generate dash array based on line style
  const dashArray = useMemo(() => {
    if (lineStyle === 'dashed') return '8 4'
    if (lineStyle === 'dotted') return '2 4'
    return undefined
  }, [lineStyle])

  return (
    <HTMLContainer
      id={shape.id}
      style={{
        width: w,
        height: h,
        pointerEvents: 'all',
      }}
    >
      <svg
        width={w}
        height={h}
        className="overflow-visible"
      >
        {/* Main line */}
        <line
          x1={0}
          y1={h / 2}
          x2={w}
          y2={h / 2}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          strokeLinecap="round"
          className="transition-all duration-200"
        />

        {/* Forward arrow */}
        {(arrowType === 'forward' || arrowType === 'both') && (
          <polygon
            points={`${w - 10},${h / 2 - 5} ${w},${h / 2} ${w - 10},${h / 2 + 5}`}
            fill={color}
          />
        )}

        {/* Backward arrow */}
        {(arrowType === 'backward' || arrowType === 'both') && (
          <polygon
            points={`10,${h / 2 - 5} 0,${h / 2} 10,${h / 2 + 5}`}
            fill={color}
          />
        )}

        {/* Label background */}
        {label && (
          <>
            <rect
              x={w / 2 - label.length * 3 - 4}
              y={h / 2 - 18}
              width={label.length * 6 + 8}
              height={16}
              rx={4}
              fill={isDark ? '#1f2937' : '#ffffff'}
              stroke={color}
              strokeWidth={1}
            />
            <text
              x={w / 2}
              y={h / 2 - 7}
              fontSize={10}
              fill={color}
              textAnchor="middle"
              className="font-medium"
            >
              {label}
            </text>
          </>
        )}
      </svg>
    </HTMLContainer>
  )
})
