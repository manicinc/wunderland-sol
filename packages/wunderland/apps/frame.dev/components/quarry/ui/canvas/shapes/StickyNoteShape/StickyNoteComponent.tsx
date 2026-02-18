/**
 * Sticky Note Component - Quick capture Post-it style notes
 * @module codex/ui/canvas/shapes/StickyNoteShape/StickyNoteComponent
 *
 * Features:
 * - Multiple color themes
 * - Editable text with auto-resize
 * - Font size options
 * - Paper fold effect
 * - Tilt animation on hover
 */

'use client'

import React, { useCallback, memo, useState, useRef, useEffect } from 'react'
import { HTMLContainer, track, useEditor, stopEventPropagation } from '@tldraw/tldraw'
import type { StickyNoteShape, StickyNoteColor } from '../types'
import type { StickyNoteShapeUtil } from './StickyNoteShapeUtil'

interface StickyNoteComponentProps {
  shape: StickyNoteShape
  util: StickyNoteShapeUtil
}

/** Color palette for sticky notes */
const STICKY_COLORS: Record<StickyNoteColor, { bg: string; darker: string; text: string }> = {
  yellow: { bg: '#fef08a', darker: '#fde047', text: '#713f12' },
  pink: { bg: '#fbcfe8', darker: '#f9a8d4', text: '#831843' },
  blue: { bg: '#bfdbfe', darker: '#93c5fd', text: '#1e3a8a' },
  green: { bg: '#bbf7d0', darker: '#86efac', text: '#14532d' },
  purple: { bg: '#ddd6fe', darker: '#c4b5fd', text: '#4c1d95' },
  orange: { bg: '#fed7aa', darker: '#fdba74', text: '#7c2d12' },
}

/** Font size options */
const FONT_SIZES: Record<'sm' | 'md' | 'lg', number> = {
  sm: 12,
  md: 16,
  lg: 20,
}

/**
 * Interactive sticky note component
 */
export const StickyNoteComponent = track(function StickyNoteComponent({
  shape,
  util,
}: StickyNoteComponentProps) {
  const editor = useEditor()
  const [isEditing, setIsEditing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { w, h, text, color, fontSize, rotation } = shape.props
  const colors = STICKY_COLORS[color]
  const fontSizePx = FONT_SIZES[fontSize]

  // Handle text change
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      editor.updateShapes([
        {
          id: shape.id,
          type: 'stickynote',
          props: { text: e.target.value },
        },
      ])
    },
    [editor, shape.id]
  )

  // Handle double click to edit
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setIsEditing(true)
    },
    []
  )

  // Handle blur to stop editing
  const handleBlur = useCallback(() => {
    setIsEditing(false)
  }, [])

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  // Color picker handler
  const cycleColor = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const colorOrder: StickyNoteColor[] = ['yellow', 'pink', 'blue', 'green', 'purple', 'orange']
      const currentIndex = colorOrder.indexOf(color)
      const nextColor = colorOrder[(currentIndex + 1) % colorOrder.length]
      editor.updateShapes([
        {
          id: shape.id,
          type: 'stickynote',
          props: { color: nextColor },
        },
      ])
    },
    [editor, shape.id, color]
  )

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
        className="relative w-full h-full transition-transform duration-200"
        style={{
          backgroundColor: colors.bg,
          borderRadius: 4,
          boxShadow: '2px 4px 8px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)',
          transform: `rotate(${rotation}deg)`,
        }}
        onDoubleClick={handleDoubleClick}
      >
        {/* Paper fold effect */}
        <div
          className="absolute top-0 right-0 w-5 h-5"
          style={{
            background: `linear-gradient(135deg, transparent 50%, ${colors.darker} 50%)`,
            borderTopRightRadius: 4,
          }}
        />

        {/* Color indicator / button */}
        <button
          onClick={cycleColor}
          onPointerDown={stopEventPropagation}
          className="absolute top-2 left-2 w-4 h-4 rounded-full border-2 border-white/50 shadow-sm transition-transform hover:scale-110"
          style={{ backgroundColor: colors.darker }}
          title="Change color"
        />

        {/* Text content */}
        <div className="p-3 pt-8 w-full h-full">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onBlur={handleBlur}
              onPointerDown={stopEventPropagation}
              className="w-full h-full resize-none bg-transparent outline-none font-handwriting"
              style={{
                fontSize: fontSizePx,
                color: colors.text,
                lineHeight: 1.4,
                fontFamily: "'Caveat', 'Segoe Script', cursive",
              }}
              placeholder="Type your note..."
            />
          ) : (
            <div
              className="w-full h-full overflow-hidden font-handwriting cursor-text"
              style={{
                fontSize: fontSizePx,
                color: colors.text,
                lineHeight: 1.4,
                fontFamily: "'Caveat', 'Segoe Script', cursive",
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {text || (
                <span className="opacity-50 italic">Double-click to edit...</span>
              )}
            </div>
          )}
        </div>

        {/* Subtle paper texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] rounded"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>
    </HTMLContainer>
  )
})

export default memo(StickyNoteComponent)

