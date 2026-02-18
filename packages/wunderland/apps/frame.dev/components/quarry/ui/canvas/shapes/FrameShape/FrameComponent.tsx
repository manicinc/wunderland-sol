/**
 * Frame Component - Container region for organizing canvas content
 * @module codex/ui/canvas/shapes/FrameShape/FrameComponent
 *
 * Features:
 * - Editable title header
 * - Customizable background color
 * - Dashed border style (like Figma frames)
 * - Collapse/expand functionality
 * - Sticky title that floats above content
 */

'use client'

import React, { useCallback, memo, useState, useRef, useEffect } from 'react'
import { HTMLContainer, track, useEditor, stopEventPropagation } from '@tldraw/tldraw'
import { ChevronDown, ChevronRight, Palette, Frame as FrameIcon } from 'lucide-react'
import type { FrameShape } from '../types'
import type { FrameShapeUtil } from './FrameShapeUtil'

interface FrameComponentProps {
  shape: FrameShape
  util: FrameShapeUtil
}

/** Preset background colors */
const FRAME_COLORS = [
  { id: 'transparent', value: 'transparent', label: 'Transparent' },
  { id: 'slate', value: '#f8fafc', label: 'Slate' },
  { id: 'blue', value: '#eff6ff', label: 'Blue' },
  { id: 'green', value: '#f0fdf4', label: 'Green' },
  { id: 'purple', value: '#faf5ff', label: 'Purple' },
  { id: 'amber', value: '#fffbeb', label: 'Amber' },
  { id: 'rose', value: '#fff1f2', label: 'Rose' },
]

/**
 * Interactive frame component for container regions
 */
export const FrameComponent = track(function FrameComponent({
  shape,
  util,
}: FrameComponentProps) {
  const editor = useEditor()
  const isDark = editor.user.getIsDarkMode()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const { w, h, title, backgroundColor, showTitle, collapsed, borderColor, borderStyle } = shape.props

  // Handle title change
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      editor.updateShapes([
        {
          id: shape.id,
          type: 'frame',
          props: { title: e.target.value },
        },
      ])
    },
    [editor, shape.id]
  )

  // Handle title double click
  const handleTitleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditingTitle(true)
  }, [])

  // Handle title blur
  const handleTitleBlur = useCallback(() => {
    setIsEditingTitle(false)
  }, [])

  // Handle title key down
  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditingTitle(false)
    }
  }, [])

  // Toggle collapsed
  const toggleCollapsed = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      editor.updateShapes([
        {
          id: shape.id,
          type: 'frame',
          props: { collapsed: !collapsed },
        },
      ])
    },
    [editor, shape.id, collapsed]
  )

  // Handle color change
  const handleColorChange = useCallback(
    (colorValue: string) => {
      editor.updateShapes([
        {
          id: shape.id,
          type: 'frame',
          props: { backgroundColor: colorValue },
        },
      ])
      setShowColorPicker(false)
    },
    [editor, shape.id]
  )

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  const displayHeight = collapsed ? 40 : h

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
        className="relative w-full h-full rounded-xl transition-all duration-200"
        style={{
          backgroundColor: backgroundColor || 'transparent',
          border: `2px ${borderStyle} ${borderColor || (isDark ? '#374151' : '#e2e8f0')}`,
        }}
      >
        {/* Title header */}
        {showTitle && (
          <div
            className="absolute -top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded"
            style={{
              backgroundColor: isDark ? '#1f2937' : '#1f2937',
            }}
          >
            {/* Collapse toggle */}
            <button
              onClick={toggleCollapsed}
              onPointerDown={stopEventPropagation}
              className="p-0.5 text-white/70 hover:text-white transition-colors"
            >
              {collapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Frame icon */}
            <FrameIcon className="w-3.5 h-3.5 text-white/70" />

            {/* Title */}
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                onPointerDown={stopEventPropagation}
                className="bg-transparent text-white text-xs font-semibold outline-none min-w-[60px]"
                style={{ width: Math.max(60, title.length * 7) }}
              />
            ) : (
              <span
                className="text-white text-xs font-semibold cursor-text"
                onDoubleClick={handleTitleDoubleClick}
              >
                {title || 'Untitled Frame'}
              </span>
            )}

            {/* Color picker toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowColorPicker(!showColorPicker)
              }}
              onPointerDown={stopEventPropagation}
              className="p-0.5 text-white/50 hover:text-white transition-colors ml-1"
              title="Change background"
            >
              <Palette className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Color picker dropdown */}
        {showColorPicker && (
          <div
            className="absolute -top-3 left-40 z-50 flex gap-1 p-1.5 rounded-lg shadow-lg"
            style={{
              backgroundColor: isDark ? '#1f2937' : '#ffffff',
              border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            }}
            onPointerDown={stopEventPropagation}
          >
            {FRAME_COLORS.map((color) => (
              <button
                key={color.id}
                onClick={() => handleColorChange(color.value)}
                className="w-5 h-5 rounded transition-transform hover:scale-110"
                style={{
                  backgroundColor: color.value === 'transparent' 
                    ? isDark ? '#374151' : '#f3f4f6'
                    : color.value,
                  border: backgroundColor === color.value 
                    ? '2px solid #3b82f6' 
                    : '1px solid rgba(0,0,0,0.1)',
                }}
                title={color.label}
              />
            ))}
          </div>
        )}

        {/* Content area - empty container for child shapes */}
        {!collapsed && (
          <div className="w-full h-full p-4 pt-6">
            {/* Child shapes will be positioned here by tldraw */}
          </div>
        )}

        {/* Collapsed indicator */}
        {collapsed && (
          <div
            className="absolute inset-0 flex items-center justify-center text-xs"
            style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
          >
            {/* Collapsed state visual */}
          </div>
        )}

        {/* Corner resize hint */}
        <div
          className="absolute bottom-1 right-1 w-3 h-3 opacity-30"
          style={{
            background: `linear-gradient(135deg, transparent 50%, ${isDark ? '#6b7280' : '#9ca3af'} 50%)`,
          }}
        />
      </div>
    </HTMLContainer>
  )
})

export default memo(FrameComponent)

