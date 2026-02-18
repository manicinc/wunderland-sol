'use client'

/**
 * Floating Window
 * @module components/quarry/ui/meditate/FloatingWindow
 * 
 * Draggable, resizable window with terminal-style aesthetics.
 * Supports holographic glow, frosted glass, and traffic light buttons.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Minus, Maximize2, Minimize2, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme, getThemeCategory, isTerminalTheme } from '@/types/theme'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface WindowPosition {
  x: number
  y: number
}

export interface WindowSize {
  width: number
  height: number
}

export interface FloatingWindowProps {
  /** Unique window ID */
  id: string
  /** Window title */
  title: string
  /** Window icon */
  icon?: React.ReactNode
  /** Initial position */
  initialPosition?: WindowPosition
  /** Initial size */
  initialSize?: WindowSize
  /** Minimum size */
  minSize?: WindowSize
  /** Maximum size */
  maxSize?: WindowSize
  /** Whether window is focused */
  isFocused?: boolean
  /** Whether window is minimized */
  isMinimized?: boolean
  /** Current theme */
  theme: ThemeName
  /** Z-index for stacking */
  zIndex?: number
  /** Called when window is closed */
  onClose?: () => void
  /** Called when window is minimized */
  onMinimize?: () => void
  /** Called when window is maximized */
  onMaximize?: () => void
  /** Called when window is focused */
  onFocus?: () => void
  /** Called when position changes */
  onPositionChange?: (position: WindowPosition) => void
  /** Called when size changes */
  onSizeChange?: (size: WindowSize) => void
  /** Window content */
  children: React.ReactNode
  /** Custom className */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function FloatingWindow({
  id,
  title,
  icon,
  initialPosition = { x: 100, y: 100 },
  initialSize = { width: 400, height: 300 },
  minSize = { width: 200, height: 150 },
  maxSize = { width: 800, height: 600 },
  isFocused = false,
  isMinimized = false,
  theme,
  zIndex = 10,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  onPositionChange,
  onSizeChange,
  children,
  className,
}: FloatingWindowProps) {
  const isDark = isDarkTheme(theme)
  const isTerminal = isTerminalTheme(theme)
  const themeCategory = getThemeCategory(theme)

  const [position, setPosition] = useState(initialPosition)
  const [size, setSize] = useState(initialSize)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [preMaximizeState, setPreMaximizeState] = useState({ position, size })

  const windowRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 })
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 })

  // Theme-based colors
  const glowColor = getGlowColor(themeCategory, isDark)
  const borderColor = getBorderColor(themeCategory, isDark)
  const holographicBg = getHolographicBackground(themeCategory, isDark)
  const holographicChrome = getHolographicChrome(themeCategory, isDark)

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (isMaximized) return
    e.preventDefault()
    onFocus?.()
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    }
  }, [isMaximized, onFocus, position])

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (isMaximized) return
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    }
  }, [isMaximized, size])

  // Handle mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartRef.current.x
        const deltaY = e.clientY - dragStartRef.current.y
        const newPos = {
          x: Math.max(0, dragStartRef.current.posX + deltaX),
          y: Math.max(0, dragStartRef.current.posY + deltaY),
        }
        setPosition(newPos)
        onPositionChange?.(newPos)
      }

      if (isResizing) {
        const deltaX = e.clientX - resizeStartRef.current.x
        const deltaY = e.clientY - resizeStartRef.current.y
        const newSize = {
          width: Math.max(minSize.width, Math.min(maxSize.width, resizeStartRef.current.width + deltaX)),
          height: Math.max(minSize.height, Math.min(maxSize.height, resizeStartRef.current.height + deltaY)),
        }
        setSize(newSize)
        onSizeChange?.(newSize)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, minSize, maxSize, onPositionChange, onSizeChange])

  // Toggle maximize
  const handleToggleMaximize = useCallback(() => {
    if (isMaximized) {
      setPosition(preMaximizeState.position)
      setSize(preMaximizeState.size)
      setIsMaximized(false)
    } else {
      setPreMaximizeState({ position, size })
      setPosition({ x: 20, y: 20 })
      setSize({
        width: window.innerWidth - 40,
        height: window.innerHeight - 100,
      })
      setIsMaximized(true)
    }
    onMaximize?.()
  }, [isMaximized, position, size, preMaximizeState, onMaximize])

  if (isMinimized) {
    return null
  }

  return (
    <motion.div
      ref={windowRef}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'fixed rounded-2xl overflow-hidden',
        isDragging && 'cursor-grabbing',
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: isFocused ? zIndex + 100 : zIndex,
        background: holographicBg,
        border: `1px solid ${isFocused ? borderColor : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
        boxShadow: isFocused
          ? `0 0 60px ${glowColor}, 0 0 30px ${glowColor}, 0 25px 50px -12px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.1)`
          : `0 0 20px ${glowColor.replace('0.3', '0.1')}, 0 20px 40px -12px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
      onMouseDown={() => onFocus?.()}
    >
      {/* Window chrome - holographic title bar */}
      <div
        className={cn(
          'flex items-center justify-between h-10 px-3',
          'select-none cursor-grab',
          'backdrop-blur-xl'
        )}
        style={{
          background: holographicChrome,
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.05)',
        }}
        onMouseDown={handleDragStart}
      >
        {/* Traffic light buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
            title="Close"
          />
          <button
            onClick={onMinimize}
            className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors"
            title="Minimize"
          />
          <button
            onClick={handleToggleMaximize}
            className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
          />
        </div>

        {/* Title */}
        <div className={cn(
          'flex items-center gap-2 text-sm font-medium',
          isDark ? 'text-white/80' : 'text-black/80'
        )}>
          {icon}
          <span className="truncate max-w-[200px]">{title}</span>
        </div>

        {/* Spacer for symmetry */}
        <div className="w-14" />
      </div>

      {/* Content area - transparent to show holographic background */}
      <div
        className={cn(
          'flex-1 overflow-auto',
          'backdrop-blur-xl'
        )}
        style={{ 
          height: size.height - 40,
          background: isDark 
            ? 'rgba(0,0,0,0.2)' 
            : 'rgba(255,255,255,0.3)',
        }}
      >
        {children}
      </div>

      {/* Resize handle */}
      {!isMaximized && (
        <div
          className={cn(
            'absolute bottom-0 right-0 w-4 h-4 cursor-se-resize',
            'flex items-center justify-center',
            isDark ? 'text-white/30' : 'text-black/30'
          )}
          onMouseDown={handleResizeStart}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="currentColor"
          >
            <path d="M9 10H10V9H9V10ZM6 10H7V9H6V10ZM3 10H4V9H3V10ZM9 7H10V6H9V7ZM6 7H7V6H6V7ZM9 4H10V3H9V4Z" />
          </svg>
        </div>
      )}

      {/* Holographic shimmer overlay */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
        style={{
          background: `linear-gradient(135deg, transparent 0%, ${glowColor.replace('0.3', '0.05')} 50%, transparent 100%)`,
        }}
      />

      {/* Subtle scanline effect for all themes */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          background: isDark
            ? 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.01) 2px, rgba(255,255,255,0.01) 4px)'
            : 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.01) 2px, rgba(0,0,0,0.01) 4px)',
          opacity: isTerminal ? 0.3 : 0.15,
        }}
      />

      {/* Top highlight edge */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)'} 50%, transparent 100%)`,
        }}
      />
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function getGlowColor(category: string, isDark: boolean): string {
  switch (category) {
    case 'terminal':
      return isDark ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 176, 0, 0.3)'
    case 'sepia':
      return 'rgba(212, 165, 116, 0.3)'
    case 'oceanic':
      return isDark ? 'rgba(34, 211, 238, 0.3)' : 'rgba(14, 116, 144, 0.3)'
    default:
      return isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)'
  }
}

function getBorderColor(category: string, isDark: boolean): string {
  switch (category) {
    case 'terminal':
      return isDark ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 176, 0, 0.5)'
    case 'sepia':
      return 'rgba(212, 165, 116, 0.5)'
    case 'oceanic':
      return isDark ? 'rgba(34, 211, 238, 0.5)' : 'rgba(14, 116, 144, 0.5)'
    default:
      return isDark ? 'rgba(139, 92, 246, 0.4)' : 'rgba(99, 102, 241, 0.3)'
  }
}

function getHolographicBackground(category: string, isDark: boolean): string {
  if (isDark) {
    switch (category) {
      case 'terminal':
        return 'linear-gradient(135deg, rgba(0,20,10,0.9) 0%, rgba(10,30,20,0.85) 50%, rgba(5,25,15,0.9) 100%)'
      case 'sepia':
        return 'linear-gradient(135deg, rgba(30,25,20,0.9) 0%, rgba(40,30,25,0.85) 50%, rgba(35,28,22,0.9) 100%)'
      case 'oceanic':
        return 'linear-gradient(135deg, rgba(10,20,30,0.9) 0%, rgba(15,30,45,0.85) 50%, rgba(12,25,38,0.9) 100%)'
      default:
        return 'linear-gradient(135deg, rgba(15,12,25,0.92) 0%, rgba(25,18,40,0.88) 30%, rgba(35,20,50,0.85) 60%, rgba(20,15,35,0.92) 100%)'
    }
  } else {
    switch (category) {
      case 'terminal':
        return 'linear-gradient(135deg, rgba(255,250,240,0.95) 0%, rgba(255,248,235,0.9) 50%, rgba(255,252,245,0.95) 100%)'
      case 'sepia':
        return 'linear-gradient(135deg, rgba(255,252,245,0.95) 0%, rgba(252,248,240,0.9) 50%, rgba(255,250,242,0.95) 100%)'
      case 'oceanic':
        return 'linear-gradient(135deg, rgba(240,250,255,0.95) 0%, rgba(235,248,255,0.9) 50%, rgba(242,252,255,0.95) 100%)'
      default:
        return 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,246,255,0.9) 30%, rgba(252,250,255,0.92) 60%, rgba(255,255,255,0.95) 100%)'
    }
  }
}

function getHolographicChrome(category: string, isDark: boolean): string {
  if (isDark) {
    switch (category) {
      case 'terminal':
        return 'linear-gradient(180deg, rgba(0,40,20,0.95) 0%, rgba(0,30,15,0.9) 100%)'
      case 'sepia':
        return 'linear-gradient(180deg, rgba(50,40,30,0.95) 0%, rgba(40,32,25,0.9) 100%)'
      case 'oceanic':
        return 'linear-gradient(180deg, rgba(15,35,50,0.95) 0%, rgba(12,28,42,0.9) 100%)'
      default:
        return 'linear-gradient(180deg, rgba(30,22,45,0.95) 0%, rgba(25,18,38,0.9) 100%)'
    }
  } else {
    switch (category) {
      case 'terminal':
        return 'linear-gradient(180deg, rgba(255,250,235,0.98) 0%, rgba(252,245,225,0.95) 100%)'
      case 'sepia':
        return 'linear-gradient(180deg, rgba(252,248,240,0.98) 0%, rgba(248,242,232,0.95) 100%)'
      case 'oceanic':
        return 'linear-gradient(180deg, rgba(235,248,255,0.98) 0%, rgba(228,242,252,0.95) 100%)'
      default:
        return 'linear-gradient(180deg, rgba(250,248,255,0.98) 0%, rgba(245,242,252,0.95) 100%)'
    }
  }
}


