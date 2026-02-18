/**
 * Callout NodeView for TipTap Editor
 * @module quarry/ui/tiptap/extensions/CalloutNodeView
 *
 * React component that renders callout/admonition blocks.
 * Supports collapsible content, editable titles, and type switching.
 */

'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { CALLOUT_CONFIG, CalloutType } from './CalloutExtension'

/**
 * Callout NodeView Component
 *
 * Renders callout blocks with:
 * - Collapsible content
 * - Type indicator with icon
 * - Editable title
 * - Theme-aware styling
 */
export default function CalloutNodeView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const type = (node.attrs.type || 'note') as CalloutType
  const title = node.attrs.title || ''
  const collapsed = node.attrs.collapsed || false
  const isEditable = editor.isEditable

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState(title)

  // Detect theme
  const isDark = useMemo(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  }, [])

  const config = CALLOUT_CONFIG[type] || CALLOUT_CONFIG.note

  // Toggle collapsed state
  const toggleCollapsed = useCallback(() => {
    updateAttributes({ collapsed: !collapsed })
  }, [collapsed, updateAttributes])

  // Handle title editing
  const startEditingTitle = useCallback((e: React.MouseEvent) => {
    if (!isEditable) return
    e.stopPropagation()
    setEditTitle(title)
    setIsEditingTitle(true)
  }, [isEditable, title])

  const finishEditingTitle = useCallback(() => {
    updateAttributes({ title: editTitle })
    setIsEditingTitle(false)
  }, [editTitle, updateAttributes])

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      finishEditingTitle()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditTitle(title)
      setIsEditingTitle(false)
    }
  }, [finishEditingTitle, title])

  // Change callout type
  const changeType = useCallback((newType: CalloutType) => {
    updateAttributes({ type: newType })
  }, [updateAttributes])

  // Display title (use type label as fallback)
  const displayTitle = title || config.label

  return (
    <NodeViewWrapper
      className={`
        callout-wrapper my-4 rounded-lg border-l-4 overflow-hidden
        ${config.border}
        ${isDark ? config.darkBg : config.lightBg}
        ${selected ? 'ring-2 ring-cyan-500 ring-offset-2' : ''}
      `}
      data-type="callout"
      data-callout-type={type}
    >
      {/* Header */}
      <div
        className={`
          flex items-center gap-2 px-4 py-2 font-medium cursor-pointer
          ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}
          transition-colors
        `}
        onClick={toggleCollapsed}
      >
        {/* Collapse indicator */}
        <span className="text-xs opacity-50">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>

        {/* Icon */}
        <span className="text-base">{config.icon}</span>

        {/* Title */}
        {isEditingTitle ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            onBlur={finishEditingTitle}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className={`
              flex-1 px-2 py-0.5 text-sm font-medium rounded
              ${isDark ? 'bg-zinc-800 text-zinc-100' : 'bg-white text-zinc-900'}
              border ${isDark ? 'border-zinc-600' : 'border-zinc-300'}
              focus:outline-none focus:ring-1 focus:ring-cyan-500
            `}
            placeholder={config.label}
          />
        ) : (
          <span
            className={`flex-1 ${isEditable ? 'hover:text-cyan-500 transition-colors' : ''}`}
            onClick={isEditable ? startEditingTitle : undefined}
            title={isEditable ? 'Click to edit title' : undefined}
          >
            {displayTitle}
          </span>
        )}

        {/* Type selector (only in edit mode) */}
        {isEditable && (
          <select
            value={type}
            onChange={(e) => changeType(e.target.value as CalloutType)}
            onClick={(e) => e.stopPropagation()}
            className={`
              text-xs px-2 py-1 rounded border cursor-pointer
              ${isDark
                ? 'bg-zinc-800 border-zinc-600 text-zinc-300'
                : 'bg-white border-zinc-300 text-zinc-700'
              }
              focus:outline-none focus:ring-1 focus:ring-cyan-500
            `}
          >
            {Object.entries(CALLOUT_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.icon} {cfg.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      {!collapsed && (
        <div className={`px-4 pb-3 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          <NodeViewContent className="callout-content" />
        </div>
      )}
    </NodeViewWrapper>
  )
}
