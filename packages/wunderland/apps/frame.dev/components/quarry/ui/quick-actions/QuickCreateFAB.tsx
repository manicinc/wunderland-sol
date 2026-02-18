/**
 * Quick Create FAB - Floating Action Button for fast strand creation
 * @module codex/ui/QuickCreateFAB
 *
 * @remarks
 * Provides quick access to strand creation workflows:
 * - New Blank: Opens blank editor directly (bypass wizard)
 * - From Canvas: Smart export from WhiteboardCanvas
 * - From Template: Opens wizard at template tab
 *
 * Mobile-optimized with:
 * - 56px touch targets
 * - Haptic feedback
 * - Bottom-right positioning
 * - Safe area support
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Sparkles,
  PenTool,
  Layers,
  FileText,
  StickyNote,
  X,
} from 'lucide-react'
import { useHaptics } from '../../hooks/useHaptics'
import { useIsTouchDevice } from '../../hooks/useIsTouchDevice'
import type { ThemeName } from '@/types/theme'

interface QuickCreateOption {
  id: string
  label: string
  description: string
  icon: React.ElementType
  color: string
  hotkey?: string
}

interface QuickCreateFABProps {
  /** Callback for creating new blank strand */
  onNewBlank: () => void
  /** Callback for exporting from canvas */
  onFromCanvas: () => void
  /** Callback for opening wizard */
  onFromTemplate: () => void
  /** Callback for creating new supernote */
  onNewSupernote?: () => void
  /** Whether canvas has content to export */
  canvasHasContent?: boolean
  /** Current theme */
  theme?: ThemeName
  /** Position (default: bottom-right) */
  position?: 'bottom-right' | 'bottom-left' | 'toolbar'
  /** Optional className override */
  className?: string
}

/**
 * Quick strand creation options
 */
const CREATE_OPTIONS: QuickCreateOption[] = [
  {
    id: 'blank',
    label: 'New Blank',
    description: 'Start with empty editor',
    icon: Sparkles,
    color: 'from-violet-500 to-purple-600',
    hotkey: 'Cmd+N',
  },
  {
    id: 'supernote',
    label: 'New Supernote',
    description: 'Quick structured note',
    icon: StickyNote,
    color: 'from-amber-500 to-yellow-600',
    hotkey: 'Cmd+Shift+S',
  },
  {
    id: 'canvas',
    label: 'From Canvas',
    description: 'Export whiteboard as strand',
    icon: PenTool,
    color: 'from-cyan-500 to-blue-600',
    hotkey: 'Cmd+E',
  },
  {
    id: 'template',
    label: 'From Template',
    description: 'Use strand wizard',
    icon: Layers,
    color: 'from-orange-500 to-red-600',
    hotkey: 'Cmd+Shift+N',
  },
]

/**
 * Floating Action Button for quick strand creation
 *
 * @example
 * ```tsx
 * <QuickCreateFAB
 *   onNewBlank={() => router.push('/quarry/new?mode=blank')}
 *   onFromCanvas={() => setExportModalOpen(true)}
 *   onFromTemplate={() => router.push('/quarry/new')}
 *   theme="dark"
 * />
 * ```
 */
export default function QuickCreateFAB({
  onNewBlank,
  onFromCanvas,
  onFromTemplate,
  onNewSupernote,
  canvasHasContent = false,
  theme = 'light',
  position = 'bottom-right',
  className = '',
}: QuickCreateFABProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { haptic } = useHaptics()
  const isTouch = useIsTouchDevice()

  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const toggleMenu = useCallback(() => {
    haptic('medium')
    setIsOpen((prev) => !prev)
  }, [haptic])

  const handleOptionClick = useCallback(
    (option: QuickCreateOption) => {
      haptic('light')
      setIsOpen(false)

      switch (option.id) {
        case 'blank':
          onNewBlank()
          break
        case 'supernote':
          onNewSupernote?.()
          break
        case 'canvas':
          onFromCanvas()
          break
        case 'template':
          onFromTemplate()
          break
      }
    },
    [haptic, onNewBlank, onNewSupernote, onFromCanvas, onFromTemplate]
  )

  // Position classes
  const positionClasses =
    position === 'bottom-right'
      ? 'fixed bottom-6 right-6 pb-safe pr-safe'
      : position === 'bottom-left'
        ? 'fixed bottom-6 left-6 pb-safe pl-safe'
        : 'relative'

  // Theme classes
  const fabBgClasses = isTerminal
    ? isDark
      ? 'bg-black border-green-500/50 text-green-400 hover:bg-green-950'
      : 'bg-zinc-900 border-amber-500/50 text-amber-500 hover:bg-zinc-800'
    : isDark
      ? 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700'
      : 'bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50'

  const menuBgClasses = isTerminal
    ? isDark
      ? 'bg-black/95 border-green-500/30 backdrop-blur-xl'
      : 'bg-zinc-900/95 border-amber-500/30 backdrop-blur-xl'
    : isDark
      ? 'bg-zinc-900/95 border-zinc-700/50 backdrop-blur-xl'
      : 'bg-white/95 border-zinc-200/50 backdrop-blur-xl'

  // Touch target sizes
  const buttonSize = isTouch ? 56 : 48
  const iconSize = isTouch ? 24 : 20

  return (
    <div className={`${positionClasses} z-[45] ${className}`}>
      {/* Options Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`
              absolute ${position === 'toolbar' ? 'top-full mt-2' : 'bottom-full mb-3'}
              ${position === 'bottom-left' ? 'left-0' : 'right-0'}
              rounded-xl shadow-2xl border
              ${menuBgClasses}
              overflow-hidden
              min-w-[240px]
            `}
          >
            <div className="p-1.5">
              {CREATE_OPTIONS.map((option, index) => {
                const isDisabled = option.id === 'canvas' && !canvasHasContent
                const Icon = option.icon

                return (
                  <motion.button
                    key={option.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => !isDisabled && handleOptionClick(option)}
                    disabled={isDisabled}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                      text-left transition-all duration-150
                      ${isDisabled
                        ? 'opacity-40 cursor-not-allowed'
                        : isTerminal
                          ? isDark
                            ? 'hover:bg-green-950/50'
                            : 'hover:bg-amber-950/30'
                          : isDark
                            ? 'hover:bg-zinc-800'
                            : 'hover:bg-zinc-100'
                      }
                      ${isTouch ? 'min-h-[52px]' : 'min-h-[44px]'}
                    `}
                  >
                    {/* Icon */}
                    <div
                      className={`
                        flex items-center justify-center rounded-lg
                        bg-gradient-to-br ${option.color}
                        ${isTouch ? 'w-10 h-10' : 'w-9 h-9'}
                      `}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div
                        className={`
                        text-sm font-medium
                        ${isTerminal
                          ? isDark ? 'text-green-300' : 'text-amber-300'
                          : isDark ? 'text-zinc-100' : 'text-zinc-900'
                        }
                      `}
                      >
                        {option.label}
                      </div>
                      <div
                        className={`
                        text-xs truncate
                        ${isTerminal
                          ? isDark ? 'text-green-500/70' : 'text-amber-500/70'
                          : isDark ? 'text-zinc-400' : 'text-zinc-500'
                        }
                      `}
                      >
                        {option.description}
                      </div>
                    </div>

                    {/* Hotkey badge */}
                    {option.hotkey && !isTouch && (
                      <span
                        className={`
                        text-[10px] font-mono px-1.5 py-0.5 rounded
                        ${isTerminal
                          ? isDark
                            ? 'bg-green-950 text-green-400'
                            : 'bg-amber-950 text-amber-400'
                          : isDark
                            ? 'bg-zinc-800 text-zinc-400'
                            : 'bg-zinc-200 text-zinc-500'
                        }
                      `}
                      >
                        {option.hotkey}
                      </span>
                    )}
                  </motion.button>
                )
              })}
            </div>

            {/* Divider */}
            <div
              className={`
              mx-3 border-t
              ${isTerminal
                ? isDark ? 'border-green-500/20' : 'border-amber-500/20'
                : isDark ? 'border-zinc-700' : 'border-zinc-200'
              }
            `}
            />

            {/* Footer tip */}
            <div className="px-3 py-2">
              <p
                className={`
                text-[10px]
                ${isTerminal
                  ? isDark ? 'text-green-500/50' : 'text-amber-500/50'
                  : isDark ? 'text-zinc-500' : 'text-zinc-400'
                }
              `}
              >
                Press{' '}
                <kbd
                  className={`
                  px-1 py-0.5 rounded font-mono
                  ${isTerminal
                    ? isDark ? 'bg-green-950' : 'bg-amber-950'
                    : isDark ? 'bg-zinc-800' : 'bg-zinc-200'
                  }
                `}
                >
                  ?
                </kbd>{' '}
                for all shortcuts
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <motion.button
        ref={buttonRef}
        onClick={toggleMenu}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          flex items-center justify-center
          rounded-full shadow-lg border-2
          ${fabBgClasses}
          transition-colors duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          ${isTerminal
            ? isDark ? 'focus-visible:ring-green-500' : 'focus-visible:ring-amber-500'
            : 'focus-visible:ring-blue-500'
          }
        `}
        style={{ width: buttonSize, height: buttonSize }}
        aria-label={isOpen ? 'Close create menu' : 'Create new strand'}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ type: 'spring', damping: 15 }}
        >
          {isOpen ? (
            <X style={{ width: iconSize, height: iconSize }} />
          ) : (
            <Plus style={{ width: iconSize, height: iconSize }} />
          )}
        </motion.div>
      </motion.button>
    </div>
  )
}

/**
 * Inline toolbar variant (non-floating)
 */
export function QuickCreateToolbarButton({
  onNewBlank,
  onFromCanvas,
  onFromTemplate,
  onNewSupernote,
  canvasHasContent = false,
  theme = 'light',
}: Omit<QuickCreateFABProps, 'position' | 'className'>) {
  return (
    <QuickCreateFAB
      onNewBlank={onNewBlank}
      onFromCanvas={onFromCanvas}
      onFromTemplate={onFromTemplate}
      onNewSupernote={onNewSupernote}
      canvasHasContent={canvasHasContent}
      theme={theme}
      position="toolbar"
    />
  )
}
