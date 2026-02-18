'use client'

/**
 * Color Picker Menu for TipTap Editor
 * @module quarry/ui/tiptap/menus/ColorPicker
 *
 * Dropdown menu for selecting text and background colors.
 * Used in bubble menu and toolbar.
 */

import React, { useState } from 'react'
import { Editor } from '@tiptap/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, Type, Highlighter, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TEXT_COLORS, BACKGROUND_COLORS } from '../extensions/TextColorExtension'

interface ColorPickerProps {
  editor: Editor
  isOpen: boolean
  onClose: () => void
  isDark?: boolean
  position?: { x: number; y: number }
}

type ColorTab = 'text' | 'background'

export function ColorPicker({ editor, isOpen, onClose, isDark, position }: ColorPickerProps) {
  const [activeTab, setActiveTab] = useState<ColorTab>('text')

  if (!isOpen) return null

  const currentTextColor = editor.getAttributes('textStyle').color
  const currentBgColor = editor.getAttributes('textStyle').backgroundColor

  const handleTextColor = (color: string | null) => {
    if (color) {
      editor.chain().focus().setTextColor(color).run()
    } else {
      editor.chain().focus().unsetTextColor().run()
    }
  }

  const handleBgColor = (color: string | null) => {
    if (color) {
      editor.chain().focus().setBackgroundColor(color).run()
    } else {
      editor.chain().focus().unsetBackgroundColor().run()
    }
  }

  const colors = activeTab === 'text' ? TEXT_COLORS : BACKGROUND_COLORS
  const currentColor = activeTab === 'text' ? currentTextColor : currentBgColor
  const handleColor = activeTab === 'text' ? handleTextColor : handleBgColor

  const style: React.CSSProperties = position
    ? {
        position: 'fixed',
        left: Math.min(position.x, window.innerWidth - 240),
        top: Math.min(position.y, window.innerHeight - 300),
        zIndex: 50,
      }
    : {}

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        style={style}
        className={cn(
          'w-56 rounded-xl shadow-xl border overflow-hidden',
          isDark
            ? 'bg-zinc-800 border-zinc-700'
            : 'bg-white border-zinc-200'
        )}
      >
        {/* Header with tabs */}
        <div
          className={cn(
            'flex items-center border-b',
            isDark ? 'border-zinc-700' : 'border-zinc-200'
          )}
        >
          <button
            onClick={() => setActiveTab('text')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors',
              activeTab === 'text'
                ? isDark
                  ? 'text-violet-400 border-b-2 border-violet-400'
                  : 'text-violet-600 border-b-2 border-violet-600'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200'
                : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            <Type className="w-4 h-4" />
            Text
          </button>
          <button
            onClick={() => setActiveTab('background')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors',
              activeTab === 'background'
                ? isDark
                  ? 'text-violet-400 border-b-2 border-violet-400'
                  : 'text-violet-600 border-b-2 border-violet-600'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200'
                : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            <Highlighter className="w-4 h-4" />
            Background
          </button>
          <button
            onClick={onClose}
            className={cn(
              'p-2 transition-colors',
              isDark
                ? 'text-zinc-400 hover:text-zinc-200'
                : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Color grid */}
        <div className="p-3">
          <div className="grid grid-cols-5 gap-2">
            {colors.map((color) => {
              const colorValue = activeTab === 'background' && isDark && 'darkValue' in color
                ? (color as { darkValue?: string }).darkValue || color.value
                : color.value
              const isActive = currentColor === colorValue || (!currentColor && !color.value)

              return (
                <button
                  key={color.name}
                  onClick={() => handleColor(colorValue)}
                  title={color.name}
                  className={cn(
                    'relative w-8 h-8 rounded-lg transition-all',
                    'hover:scale-110 hover:shadow-md',
                    isActive && 'ring-2 ring-violet-500 ring-offset-2',
                    isDark && 'ring-offset-zinc-800'
                  )}
                  style={{
                    backgroundColor: colorValue || (isDark ? '#27272a' : '#f4f4f5'),
                    border: !colorValue ? `2px dashed ${isDark ? '#52525b' : '#d4d4d8'}` : 'none',
                  }}
                >
                  {isActive && (
                    <Check
                      className={cn(
                        'absolute inset-0 m-auto w-4 h-4',
                        colorValue && getContrastColor(colorValue) === 'white'
                          ? 'text-white'
                          : 'text-zinc-800'
                      )}
                    />
                  )}
                  {!colorValue && (
                    <X
                      className={cn(
                        'absolute inset-0 m-auto w-4 h-4',
                        isDark ? 'text-zinc-500' : 'text-zinc-400'
                      )}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Current selection preview */}
        <div
          className={cn(
            'px-3 py-2 text-xs border-t',
            isDark ? 'border-zinc-700 text-zinc-400' : 'border-zinc-200 text-zinc-500'
          )}
        >
          {activeTab === 'text' ? 'Text color' : 'Background'}:{' '}
          <span className="font-medium">
            {colors.find(c => c.value === currentColor)?.name || 'Default'}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Helper to determine if text should be white or black on a color
function getContrastColor(hexColor: string): 'white' | 'black' {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? 'black' : 'white'
}

export default ColorPicker
