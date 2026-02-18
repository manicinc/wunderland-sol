/**
 * Responsive Toolbar Component
 * @module codex/ui/ResponsiveToolbar
 *
 * @remarks
 * Mobile-friendly toolbar with icon dropdowns, tooltips, and touch optimization
 * - Mobile: Icon buttons with dropdown menus on tap
 * - Tablet: Condensed dropdown groups
 * - Desktop: Full inline buttons or dropdown menus
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { Z_INDEX } from '../../constants'
import { useIsTouchDevice } from '../../hooks/useIsTouchDevice'

// ============================================================================
// TYPES
// ============================================================================

interface ToolbarItem {
  id: string
  label: string
  icon: React.ReactNode
  description?: string
  onClick?: () => void
  href?: string
  hotkey?: string
  disabled?: boolean
}

interface ToolbarGroup {
  id: string
  label: string
  items: ToolbarItem[]
  /** If true, render as a direct button (no dropdown) - uses first item */
  directAction?: boolean
}

interface ResponsiveToolbarProps {
  groups: ToolbarGroup[]
  className?: string
}

// ============================================================================
// TOOLTIP COMPONENT
// ============================================================================

interface TooltipProps {
  content: string
  hotkey?: string
  position: { x: number; y: number }
  visible: boolean
}

function Tooltip({ content, hotkey, position, visible }: TooltipProps) {
  if (!visible) return null

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.95 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="
        fixed px-3 py-2 rounded-lg
        bg-zinc-900 dark:bg-zinc-100
        text-white dark:text-zinc-900
        text-xs font-medium
        shadow-lg shadow-black/20
        pointer-events-none
        max-w-[200px]
      "
      style={{
        zIndex: Z_INDEX.TOOLTIP,
        left: position.x,
        top: position.y,
        transform: 'translateX(-50%)',
      }}
    >
      <div>{content}</div>
      {hotkey && (
        <div className="mt-1 flex items-center gap-1 opacity-70">
          <span className="text-[10px]">Shortcut:</span>
          <kbd className="px-1.5 py-0.5 bg-zinc-800 dark:bg-zinc-200 rounded text-[10px] font-mono">
            {hotkey}
          </kbd>
        </div>
      )}
      {/* Arrow */}
      <div
        className="absolute w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rotate-45"
        style={{ top: -4, left: '50%', transform: 'translateX(-50%)' }}
      />
    </motion.div>,
    document.body
  )
}

// ============================================================================
// TOOLBAR BUTTON (Icon only with tooltip)
// ============================================================================

interface ToolbarButtonProps {
  item: ToolbarItem
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

function ToolbarButton({ item, size = 'md', showLabel = false }: ToolbarButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [isMounted, setIsMounted] = useState(false)
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement>(null)
  const isTouch = useIsTouchDevice()

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  const updateTooltipPosition = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setTooltipPos({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      })
    }
  }, [])

  const handleMouseEnter = () => {
    if (!isTouch) {
      updateTooltipPosition()
      setShowTooltip(true)
    }
  }

  const sizeClasses = {
    sm: 'p-1 min-w-[28px] min-h-[28px]',
    md: 'p-1.5 min-w-[32px] min-h-[32px]',
    lg: 'p-2 min-w-[36px] min-h-[36px]',
  }

  const baseClass = `
    inline-flex items-center justify-center gap-2
    ${sizeClasses[size]}
    rounded-lg
    text-zinc-600 dark:text-zinc-400
    transition-all duration-150 ease-out
    hover:bg-zinc-100 dark:hover:bg-zinc-800
    hover:text-zinc-900 dark:hover:text-white
    active:scale-95 active:bg-zinc-200 dark:active:bg-zinc-700
    focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2
    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
    select-none
  `

  const content = (
    <>
      <span className="flex-shrink-0">{item.icon}</span>
      {showLabel && (
        <span className="text-sm font-medium truncate">{item.label}</span>
      )}
    </>
  )

  if (item.href) {
    return (
      <div className="relative">
        <Link
          ref={ref as React.RefObject<HTMLAnchorElement>}
          href={item.href}
          className={baseClass}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={() => setShowTooltip(false)}
          aria-label={item.label}
        >
          {content}
        </Link>
        {isMounted && item.description && (
          <AnimatePresence>
            {showTooltip && (
              <Tooltip
                content={item.description}
                hotkey={item.hotkey}
                position={tooltipPos}
                visible={showTooltip}
              />
            )}
          </AnimatePresence>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        ref={ref as React.RefObject<HTMLButtonElement>}
        onClick={item.onClick}
        disabled={item.disabled}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTooltip(false)}
        className={baseClass}
        aria-label={item.label}
      >
        {content}
      </button>
      {isMounted && item.description && (
        <AnimatePresence>
          {showTooltip && (
            <Tooltip
              content={item.description}
              hotkey={item.hotkey}
              position={tooltipPos}
              visible={showTooltip}
            />
          )}
        </AnimatePresence>
      )}
    </div>
  )
}

// ============================================================================
// ICON DROPDOWN (Mobile-friendly)
// ============================================================================

interface IconDropdownProps {
  group: ToolbarGroup
  size?: 'sm' | 'md' | 'lg'
}

function IconDropdown({ group, size = 'md' }: IconDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, alignRight: false })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTouch = useIsTouchDevice()

  useEffect(() => {
    setIsMounted(true)
    return () => {
      setIsMounted(false)
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  // Close on escape
  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen])

  const updateMenuPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const menuWidth = 240
      const alignRight = rect.left + menuWidth > window.innerWidth - 16

      setMenuPos({
        top: rect.bottom + 6,
        left: alignRight ? rect.right : rect.left,
        alignRight,
      })
    }
  }, [])

  const handleOpen = () => {
    updateMenuPosition()
    setIsOpen(!isOpen)
  }

  // Hover handlers for non-touch devices
  const handleMouseEnter = useCallback(() => {
    if (isTouch) return
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    hoverTimeoutRef.current = setTimeout(() => {
      updateMenuPosition()
      setIsOpen(true)
    }, 80) // Small delay to prevent accidental opens
  }, [isTouch, updateMenuPosition])

  const handleMouseLeave = useCallback(() => {
    if (isTouch) return
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 150) // Delay to allow moving to menu
  }, [isTouch])

  const handleMenuMouseEnter = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }, [])

  const handleMenuMouseLeave = useCallback(() => {
    if (isTouch) return
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 150)
  }, [isTouch])

  // Get the first item's icon for the button
  const primaryIcon = group.items[0]?.icon || null

  const sizeClasses = {
    sm: 'p-1 min-w-[28px] min-h-[28px]',
    md: 'p-1.5 min-w-[32px] min-h-[32px]',
    lg: 'p-2 min-w-[36px] min-h-[36px]',
  }

  const menuContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - only for touch devices */}
          {isTouch && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0"
              style={{ zIndex: Z_INDEX.DROPDOWN - 1 }}
              onClick={() => setIsOpen(false)}
            />
          )}

          {/* Menu */}
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="
              fixed w-[240px] max-w-[calc(100vw-32px)]
              py-1.5 rounded-xl
              bg-white dark:bg-zinc-900
              border border-zinc-200 dark:border-zinc-700
              shadow-xl shadow-black/10 dark:shadow-black/30
              overflow-hidden
            "
            style={{
              zIndex: Z_INDEX.DROPDOWN,
              top: menuPos.top,
              left: menuPos.alignRight ? 'auto' : menuPos.left,
              right: menuPos.alignRight ? window.innerWidth - menuPos.left : 'auto',
            }}
            onMouseEnter={handleMenuMouseEnter}
            onMouseLeave={handleMenuMouseLeave}
          >
            {/* Group header */}
            <div className="px-3 py-2 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              {group.label}
            </div>

            {/* Items */}
            <div className="px-1.5">
              {group.items.map((item) => {
                const itemClass = `
                  w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg
                  text-left text-sm
                  transition-colors duration-100
                  hover:bg-zinc-100 dark:hover:bg-zinc-800
                  active:bg-zinc-200 dark:active:bg-zinc-700
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${isTouch ? 'min-h-[48px]' : 'min-h-[40px]'}
                `

                const itemContent = (
                  <>
                    <span className="w-5 h-5 flex items-center justify-center text-zinc-500 dark:text-zinc-400 flex-shrink-0">
                      {item.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-900 dark:text-white truncate">
                        {item.label}
                      </div>
                      {item.description && (
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                    {item.hotkey && (
                      <kbd className="text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-400 flex-shrink-0">
                        {item.hotkey}
                      </kbd>
                    )}
                  </>
                )

                return item.href ? (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={itemClass}
                    onClick={() => setIsOpen(false)}
                  >
                    {itemContent}
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.onClick?.()
                      setIsOpen(false)
                    }}
                    disabled={item.disabled}
                    className={itemClass}
                  >
                    {itemContent}
                  </button>
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className={`
          inline-flex items-center gap-0
          ${sizeClasses[size]}
          rounded-md
          text-zinc-600 dark:text-zinc-400
          transition-all duration-150
          hover:bg-zinc-100 dark:hover:bg-zinc-800
          hover:text-zinc-900 dark:hover:text-white
          active:scale-95
          focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
          ${isOpen ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' : ''}
        `}
        aria-label={group.label}
        aria-expanded={isOpen}
      >
        <span className="flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4">{primaryIcon}</span>
        <ChevronDown
          className={`w-2.5 h-2.5 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isMounted && createPortal(menuContent, document.body)}
    </div>
  )
}

// ============================================================================
// LABELED DROPDOWN (Desktop)
// ============================================================================

interface LabeledDropdownProps {
  group: ToolbarGroup
}

function LabeledDropdown({ group }: LabeledDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTouch = useIsTouchDevice()

  useEffect(() => {
    setIsMounted(true)
    return () => {
      setIsMounted(false)
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen])

  const updateMenuPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPos({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 260)),
      })
    }
  }, [])

  const handleOpen = () => {
    updateMenuPosition()
    setIsOpen(!isOpen)
  }

  // Hover handlers for non-touch devices
  const handleMouseEnter = useCallback(() => {
    if (isTouch) return
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    hoverTimeoutRef.current = setTimeout(() => {
      updateMenuPosition()
      setIsOpen(true)
    }, 80)
  }, [isTouch, updateMenuPosition])

  const handleMouseLeave = useCallback(() => {
    if (isTouch) return
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 150)
  }, [isTouch])

  const handleMenuMouseEnter = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }, [])

  const handleMenuMouseLeave = useCallback(() => {
    if (isTouch) return
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 150)
  }, [isTouch])

  const menuContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - only for touch devices */}
          {isTouch && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0"
              style={{ zIndex: Z_INDEX.DROPDOWN - 1 }}
              onClick={() => setIsOpen(false)}
            />
          )}

          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="
              fixed w-[260px] py-1.5 rounded-xl
              bg-white dark:bg-zinc-900
              border border-zinc-200 dark:border-zinc-700
              shadow-xl shadow-black/10 dark:shadow-black/30
              overflow-hidden
            "
            style={{
              zIndex: Z_INDEX.DROPDOWN,
              top: menuPos.top,
              left: menuPos.left,
            }}
            onMouseEnter={handleMenuMouseEnter}
            onMouseLeave={handleMenuMouseLeave}
          >
            <div className="px-3 py-2 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 mb-1">
              {group.label}
            </div>

            <div className="px-1.5 max-h-[60vh] overflow-y-auto">
              {group.items.map((item) => {
                const itemClass = `
                  w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg
                  text-left text-sm
                  transition-colors duration-100
                  hover:bg-zinc-100 dark:hover:bg-zinc-800
                  active:bg-zinc-200 dark:active:bg-zinc-700
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${isTouch ? 'min-h-[48px]' : 'min-h-[40px]'}
                `

                const itemContent = (
                  <>
                    <span className="w-5 h-5 flex items-center justify-center text-zinc-500 dark:text-zinc-400 flex-shrink-0">
                      {item.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-900 dark:text-white">
                        {item.label}
                      </div>
                      {item.description && (
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                    {item.hotkey && (
                      <kbd className="text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-400 flex-shrink-0">
                        {item.hotkey}
                      </kbd>
                    )}
                  </>
                )

                return item.href ? (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={itemClass}
                    onClick={() => setIsOpen(false)}
                  >
                    {itemContent}
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.onClick?.()
                      setIsOpen(false)
                    }}
                    disabled={item.disabled}
                    className={itemClass}
                  >
                    {itemContent}
                  </button>
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className={`
          inline-flex items-center gap-1 px-2 py-1 rounded-md
          text-[13px] font-medium
          text-zinc-600 dark:text-zinc-400
          transition-all duration-150
          hover:bg-zinc-100 dark:hover:bg-zinc-800
          hover:text-zinc-900 dark:hover:text-white
          active:scale-[0.98]
          focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
          ${isOpen ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' : ''}
        `}
        aria-expanded={isOpen}
      >
        {group.label}
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isMounted && createPortal(menuContent, document.body)}
    </div>
  )
}

// ============================================================================
// DIRECT ACTION BUTTON (No dropdown, single click action)
// ============================================================================

interface DirectActionButtonProps {
  group: ToolbarGroup
  size?: 'sm' | 'md' | 'lg'
}

function DirectActionButton({ group, size = 'md' }: DirectActionButtonProps) {
  const item = group.items[0]
  if (!item) return null

  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [isMounted, setIsMounted] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const isTouch = useIsTouchDevice()

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    if (isTouch) return
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 })
    }
    setShowTooltip(true)
  }, [isTouch])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    setShowTooltip(false)
  }, [])

  // Check if this is the Ask action (special minimal styling)
  const isAsk = group.id === 'ask'

  if (isAsk) {
    return (
      <div className="relative" ref={ref as React.RefObject<HTMLDivElement>}>
        <button
          onClick={item.onClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`
            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md
            text-[12px] font-medium
            text-zinc-600 dark:text-zinc-400
            transition-all duration-150
            hover:bg-zinc-100 dark:hover:bg-zinc-800
            hover:text-zinc-900 dark:hover:text-white
            active:scale-[0.98]
            focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2
          `}
          aria-label="Ask AI"
        >
          {/* Custom animated SVG icon - same size as other toolbar icons */}
          <motion.svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className="flex-shrink-0"
          >
            <defs>
              <linearGradient id="askGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <motion.stop
                  offset="0%"
                  animate={{
                    stopColor: isHovered ? '#a855f7' : '#6366f1',
                  }}
                  transition={{ duration: 0.3 }}
                />
                <motion.stop
                  offset="100%"
                  animate={{
                    stopColor: isHovered ? '#22d3ee' : '#8b5cf6',
                  }}
                  transition={{ duration: 0.3 }}
                />
              </linearGradient>
              <filter id="askGlow">
                <feGaussianBlur stdDeviation="1" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Central brain/neural core - use scale instead of animating r to avoid SVG attribute errors */}
            <motion.circle
              cx="12"
              cy="12"
              r={3.5}
              fill="url(#askGradient)"
              filter={isHovered ? 'url(#askGlow)' : undefined}
              style={{ transformOrigin: '12px 12px' }}
              animate={isHovered ? { scale: [1.14, 1.29, 1.14] } : { scale: 1 }}
              transition={{
                duration: 1.2,
                repeat: isHovered ? Infinity : 0,
                ease: 'easeInOut',
              }}
            />

            {/* Orbiting dots */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => {
              const rad = (angle * Math.PI) / 180
              const baseX = 12 + Math.cos(rad) * 7.5
              const baseY = 12 + Math.sin(rad) * 7.5
              return (
                <motion.circle
                  key={i}
                  cx={baseX}
                  cy={baseY}
                  r={1.5}
                  fill="url(#askGradient)"
                  initial={{ opacity: 0.6 }}
                  animate={{
                    opacity: isHovered ? [0.5, 1, 0.5] : 0.6,
                    scale: isHovered ? [1, 1.3, 1] : 1,
                  }}
                  transition={{
                    duration: 1,
                    delay: i * 0.1,
                    repeat: isHovered ? Infinity : 0,
                    ease: 'easeInOut',
                  }}
                />
              )
            })}

            {/* Connecting lines */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => {
              const rad = (angle * Math.PI) / 180
              const x2 = 12 + Math.cos(rad) * 7.5
              const y2 = 12 + Math.sin(rad) * 7.5
              return (
                <motion.line
                  key={`line-${i}`}
                  x1="12"
                  y1="12"
                  x2={String(x2)}
                  y2={String(y2)}
                  stroke="url(#askGradient)"
                  strokeWidth={isHovered ? 1.2 : 0.8}
                  strokeLinecap="round"
                  initial={{ opacity: 0.3 }}
                  animate={{
                    opacity: isHovered ? [0.3, 0.7, 0.3] : 0.3,
                    pathLength: isHovered ? [0.6, 1, 0.6] : 1,
                  }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.08,
                    repeat: isHovered ? Infinity : 0,
                    ease: 'easeInOut',
                  }}
                />
              )
            })}

            {/* Sparkle on hover */}
            <AnimatePresence>
              {isHovered && (
                <motion.path
                  d="M12 2 L12.5 4 L13 2 L12.5 4 L12 2"
                  stroke="#fbbf24"
                  strokeWidth="1"
                  fill="none"
                  initial={{ opacity: 0, scale: 0.5, y: 2 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 2 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </AnimatePresence>
          </motion.svg>

          {/* Ask text - hidden on small screens like other buttons */}
          <span className="hidden sm:inline">Ask</span>
        </button>

        {isMounted && item.description && (
          <AnimatePresence>
            {showTooltip && (
              <Tooltip
                content={item.description}
                hotkey={item.hotkey}
                position={tooltipPos}
                visible={showTooltip}
              />
            )}
          </AnimatePresence>
        )}
      </div>
    )
  }

  // Default button styling for non-Ask direct actions
  return (
    <div className="relative">
      <button
        ref={ref as React.RefObject<HTMLButtonElement>}
        onClick={item.onClick}
        disabled={item.disabled}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md
          text-[12px] font-medium
          text-zinc-600 dark:text-zinc-400
          transition-all duration-150
          hover:bg-zinc-100 dark:hover:bg-zinc-800
          hover:text-zinc-900 dark:hover:text-white
          active:scale-[0.98]
          focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        aria-label={item.label}
      >
        {item.icon}
        <span>{group.label}</span>
      </button>
      
      {isMounted && item.description && (
        <AnimatePresence>
          {showTooltip && (
            <Tooltip
              content={item.description}
              hotkey={item.hotkey}
              position={tooltipPos}
              visible={showTooltip}
            />
          )}
        </AnimatePresence>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ResponsiveToolbar({
  groups,
  className = '',
}: ResponsiveToolbarProps) {
  const { isMobile, isTablet } = useBreakpoint()
  const isTouch = useIsTouchDevice()

  // Filter out empty groups
  const activeGroups = groups.filter((g) => g.items.length > 0)

  // Helper to render a group (either as dropdown or direct action)
  const renderGroup = (group: ToolbarGroup, size: 'sm' | 'md' | 'lg' = 'sm') => {
    if (group.directAction && group.items.length > 0) {
      return <DirectActionButton key={group.id} group={group} size={size} />
    }
    return <IconDropdown key={group.id} group={group} size={size} />
  }

  // Mobile: Icon dropdowns for each group with arrows
  if (isMobile) {
    return (
      <div className={`flex items-center gap-0.5 ${className}`}>
        {activeGroups.map((group) => renderGroup(group, isTouch ? 'md' : 'sm'))}
      </div>
    )
  }

  // Tablet: Icon dropdowns, slightly larger
  if (isTablet) {
    return (
      <div className={`flex items-center gap-0.5 ${className}`}>
        {activeGroups.map((group, i) => (
          <React.Fragment key={group.id}>
            {i > 0 && <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700" />}
            {group.directAction && group.items.length > 0 ? (
              <DirectActionButton group={group} size="sm" />
            ) : (
              <IconDropdown group={group} size="sm" />
            )}
          </React.Fragment>
        ))}
      </div>
    )
  }

  // Desktop: Labeled dropdowns with separators (direct actions as buttons)
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {activeGroups.map((group, i) => (
        <React.Fragment key={group.id}>
          {i > 0 && <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />}
          {group.directAction && group.items.length > 0 ? (
            <DirectActionButton group={group} size="md" />
          ) : (
            <LabeledDropdown group={group} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
