/**
 * Widget Wrapper Component
 *
 * Common wrapper for dashboard widgets with drag handle and actions.
 * @module components/quarry/dashboard/widgets/WidgetWrapper
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  GripVertical,
  X,
  Maximize2,
  Minimize2,
  Settings2,
  Check,
} from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import type { WidgetWrapperProps } from '../types'

export function WidgetWrapper({
  widget,
  layout,
  theme,
  onNavigate,
  onRemove,
  onResize,
  isEditing = false,
  dragHandleProps,
}: WidgetWrapperProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const isDark = theme.includes('dark')

  const Icon = widget.icon

  // Determine size variant based on grid dimensions
  const size = layout.w >= 6 ? 'large' : layout.w >= 4 ? 'medium' : 'small'

  const containerClasses = `
    relative h-full flex flex-col rounded-xl overflow-hidden
    ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}
    border shadow-sm
    ${isEditing ? 'ring-2 ring-rose-500/50' : ''}
  `

  const headerClasses = `
    flex items-center justify-between px-3 py-2 border-b
    ${isDark ? 'border-zinc-700' : 'border-zinc-100'}
  `

  const WidgetComponent = widget.component

  return (
    <motion.div
      className={containerClasses}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      layout
    >
      {/* Header */}
      <div className={headerClasses}>
        <div className="flex items-center gap-2">
          {isEditing && (
            <div
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 touch-none"
              {...dragHandleProps}
            >
              <GripVertical className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
            </div>
          )}
          <Icon className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
          <h3 className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            {widget.title}
          </h3>
        </div>

        {/* Actions */}
        <div
          className={`
            flex items-center gap-1 transition-opacity relative
            ${isHovered || isEditing ? 'opacity-100' : 'opacity-0'}
          `}
        >
          {/* Settings Dropdown */}
          {isEditing && onResize && (
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`
                  p-1 rounded transition-colors
                  ${showSettings
                    ? isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-200 text-zinc-700'
                    : isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                  }
                `}
                title="Widget settings"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>

              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    className={`
                      absolute right-0 top-full mt-1 z-50 min-w-[140px]
                      rounded-lg shadow-lg border overflow-hidden
                      ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}
                    `}
                  >
                    <div className={`px-2 py-1.5 text-xs font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      Size
                    </div>
                    {(['small', 'medium', 'large'] as const).map((sizeOption) => {
                      const currentSize = layout.w >= 6 ? 'large' : layout.w >= 4 ? 'medium' : 'small'
                      const isActive = sizeOption === currentSize
                      return (
                        <button
                          key={sizeOption}
                          onClick={() => {
                            onResize(widget.id, sizeOption)
                            setShowSettings(false)
                          }}
                          className={`
                            w-full flex items-center justify-between px-3 py-2 text-sm
                            transition-colors text-left
                            ${isActive
                              ? isDark ? 'bg-violet-600/20 text-violet-400' : 'bg-violet-100 text-violet-700'
                              : isDark ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'
                            }
                          `}
                        >
                          <span className="flex items-center gap-2">
                            {sizeOption === 'small' && <Minimize2 className="w-3.5 h-3.5" />}
                            {sizeOption === 'medium' && <Settings2 className="w-3.5 h-3.5" />}
                            {sizeOption === 'large' && <Maximize2 className="w-3.5 h-3.5" />}
                            {sizeOption.charAt(0).toUpperCase() + sizeOption.slice(1)}
                          </span>
                          {isActive && <Check className="w-3.5 h-3.5" />}
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {onRemove && (
            <button
              onClick={() => onRemove(widget.id)}
              className={`
                p-1 rounded transition-colors
                ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}
              `}
              title="Hide widget"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        <WidgetComponent
          theme={theme}
          size={size}
          onNavigate={onNavigate}
          compact={size === 'small'}
        />
      </div>
    </motion.div>
  )
}

export default WidgetWrapper
