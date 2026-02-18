/**
 * Sidebar Width Control Component
 * @module codex/ui/SidebarWidthControl
 * 
 * @remarks
 * Controls for sidebar width presets and font size adjustments:
 * - Width: Small (280px) / Medium (340px) / Large (400px)
 * - Font: +/- buttons to scale text (xs/sm/base/lg)
 */

'use client'

import React from 'react'
import { Minus, Plus } from 'lucide-react'

interface SidebarWidthControlProps {
  /** Current width in pixels */
  width: number
  /** Width change handler */
  onChange: (width: number) => void
  /** Current font size scale (0 = xs, 1 = sm, 2 = base, 3 = lg) */
  fontSize?: number
  /** Font size change handler */
  onFontSizeChange?: (size: number) => void
  /** Theme */
  theme?: string
}

const PRESETS = {
  small: 280,
  medium: 340,
  large: 400,
} as const

const FONT_SIZES = ['xs', 'sm', 'base', 'lg'] as const
const MIN_FONT = 0
const MAX_FONT = 3

/**
 * Sidebar width and font size control
 */
export default function SidebarWidthControl({
  width,
  onChange,
  fontSize = 1,
  onFontSizeChange,
  theme = 'light',
}: SidebarWidthControlProps) {
  const isTerminal = theme?.includes('terminal')
  const isDark = theme?.includes('dark')
  
  // Determine which preset is currently active (closest match)
  const activePreset = 
    Math.abs(width - PRESETS.small) < 40 ? 'small'
    : Math.abs(width - PRESETS.large) < 40 ? 'large'
    : 'medium'
  
  const decreaseFont = () => {
    if (onFontSizeChange && fontSize > MIN_FONT) {
      onFontSizeChange(fontSize - 1)
    }
  }
  
  const increaseFont = () => {
    if (onFontSizeChange && fontSize < MAX_FONT) {
      onFontSizeChange(fontSize + 1)
    }
  }
  
  return (
    <div className="flex items-center gap-2 min-w-0 overflow-hidden">
      {/* Width Controls - Compact */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-[9px] text-zinc-500 dark:text-zinc-500 uppercase tracking-wider font-medium">
          W
        </span>
        <div className="inline-flex border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden rounded-md">
          {(['small', 'medium', 'large'] as const).map((preset) => {
            const isActive = activePreset === preset
            return (
              <button
                key={preset}
                onClick={() => onChange(PRESETS[preset])}
                className={`
                  w-7 h-7 text-[10px] font-bold uppercase
                  transition-all duration-200 touch-manipulation
                  border-r border-zinc-200 dark:border-zinc-700 last:border-r-0
                  ${isActive
                    ? isTerminal
                      ? 'bg-green-900 text-green-300'
                      : 'bg-emerald-500 text-white'
                    : isDark
                      ? 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800'
                  }
                `}
                title={`Width: ${PRESETS[preset]}px`}
              >
                {preset[0].toUpperCase()}
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Divider */}
      <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-600 flex-shrink-0" />
      
      {/* Font Size Controls */}
      {onFontSizeChange && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[9px] text-zinc-500 dark:text-zinc-500 uppercase tracking-wider font-medium">
            A
          </span>
          <div className="inline-flex items-center border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden rounded-md">
            <button
              onClick={decreaseFont}
              disabled={fontSize <= MIN_FONT}
              className={`
                w-7 h-7 flex items-center justify-center transition-all duration-200 touch-manipulation
                disabled:opacity-30 disabled:cursor-not-allowed
                ${isDark 
                  ? 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200' 
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800'
                }
              `}
              title="Decrease font size"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className={`
              w-8 flex items-center justify-center text-[10px] font-mono font-bold border-x border-zinc-200 dark:border-zinc-700
              ${isTerminal ? 'text-green-400' : isDark ? 'text-zinc-300' : 'text-zinc-700'}
            `}>
              {FONT_SIZES[fontSize]}
            </span>
            <button
              onClick={increaseFont}
              disabled={fontSize >= MAX_FONT}
              className={`
                w-7 h-7 flex items-center justify-center transition-all duration-200 touch-manipulation
                disabled:opacity-30 disabled:cursor-not-allowed
                ${isDark 
                  ? 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200' 
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800'
                }
              `}
              title="Increase font size"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

