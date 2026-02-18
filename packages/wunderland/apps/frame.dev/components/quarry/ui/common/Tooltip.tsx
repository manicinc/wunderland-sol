/**
 * Rich tooltip component with keyboard shortcuts and examples
 * @module codex/ui/Tooltip
 * 
 * @remarks
 * - Two modes: hover (default) or click-to-stay-open (clickable=true)
 * - Hover delay: 500ms before showing
 * - Smart positioning: auto-adjusts to viewport edges
 * - Supports keyboard shortcuts display
 * - Visual examples and descriptions
 * - Accessible (ARIA labels)
 * - Click outside to close (when clickable)
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Z_INDEX } from '../../constants'

interface TooltipProps {
  /** Tooltip content */
  content: React.ReactNode
  /** Keyboard shortcut (optional) */
  shortcut?: string
  /** Description text */
  description?: string
  /** Example text (optional) */
  example?: string
  /** Trigger element */
  children: React.ReactNode
  /** Position preference */
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** Hover delay in ms */
  delay?: number
  /** Click to toggle and stay open (vs hover only) */
  clickable?: boolean
  /** Interactive content - allows hovering over tooltip content */
  interactive?: boolean
  /** Custom max width */
  maxWidth?: string
}

/**
 * Rich tooltip with smart positioning and keyboard shortcuts
 * 
 * @example
 * ```tsx
 * // Hover tooltip
 * <Tooltip
 *   content="Toggle Metadata Panel"
 *   shortcut="m"
 *   description="Show/hide file metadata, tags, and backlinks"
 *   placement="bottom"
 * >
 *   <button>Info</button>
 * </Tooltip>
 * 
 * // Click-to-stay-open tooltip
 * <Tooltip
 *   content="Detailed Info"
 *   description="This stays open until you click outside"
 *   clickable
 *   interactive
 * >
 *   <button>Click me</button>
 * </Tooltip>
 * ```
 */
export function Tooltip({
  content,
  shortcut,
  description,
  example,
  children,
  placement = 'top',
  delay = 300, // Reduced from 500ms for faster, more responsive UX
  clickable = false,
  interactive = false,
  maxWidth = '320px',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isPinned, setIsPinned] = useState(false) // Clicked open, stays open
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isMounted, setIsMounted] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  // Handle click to toggle pinned state
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!clickable) return
    e.stopPropagation()
    
    if (isPinned) {
      setIsPinned(false)
      setIsVisible(false)
    } else {
      setIsPinned(true)
      setIsVisible(true)
      setTimeout(updatePosition, 0)
    }
  }, [clickable, isPinned])

  // Handle click outside to close
  useEffect(() => {
    if (!isPinned || !clickable) return
    
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current && !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsPinned(false)
        setIsVisible(false)
      }
    }
    
    // Escape key to close
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPinned(false)
        setIsVisible(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isPinned, clickable])

  const handleMouseEnter = () => {
    if (isPinned) return // Don't override pinned state
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
      updatePosition()
    }, delay)
  }

  const handleMouseLeave = () => {
    if (isPinned) return // Don't close if pinned
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (!interactive) {
      setIsVisible(false)
    }
  }
  
  // For interactive tooltips, also handle leaving the tooltip itself
  const handleTooltipMouseLeave = () => {
    if (isPinned) return
    if (interactive) {
      setIsVisible(false)
    }
  }

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    }

    let x = 0
    let y = 0

    // Calculate position based on placement
    switch (placement) {
      case 'top':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
        y = triggerRect.top - tooltipRect.height - 8
        break
      case 'bottom':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
        y = triggerRect.bottom + 8
        break
      case 'left':
        x = triggerRect.left - tooltipRect.width - 8
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
        break
      case 'right':
        x = triggerRect.right + 8
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
        break
    }

    // Keep within viewport bounds
    x = Math.max(8, Math.min(x, viewport.width - tooltipRect.width - 8))
    y = Math.max(8, Math.min(y, viewport.height - tooltipRect.height - 8))

    setPosition({ x, y })
  }

  useEffect(() => {
    if (isVisible) {
      updatePosition()
      window.addEventListener('scroll', updatePosition)
      window.addEventListener('resize', updatePosition)
    }

    return () => {
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isVisible])

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  const tooltipNode = (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.92, y: placement === 'bottom' ? -8 : placement === 'top' ? 8 : 0 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: placement === 'bottom' ? -4 : placement === 'top' ? 4 : 0 }}
          transition={{ 
            type: 'spring',
            stiffness: 400,
            damping: 25,
            mass: 0.5,
          }}
          className={`fixed ${interactive || isPinned ? 'pointer-events-auto' : 'pointer-events-none'}`}
          style={{ left: position.x, top: position.y, maxWidth, zIndex: Z_INDEX.TOOLTIP }}
          onMouseEnter={interactive ? () => setIsVisible(true) : undefined}
          onMouseLeave={handleTooltipMouseLeave}
        >
          <div className={`
            bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 
            rounded-xl shadow-2xl p-3 border-2 relative
            ${isPinned 
              ? 'border-cyan-500 dark:border-cyan-400 ring-2 ring-cyan-500/20' 
              : 'border-gray-800 dark:border-gray-200'
            }
          `}>
            {/* Close button when pinned */}
            {isPinned && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsPinned(false)
                  setIsVisible(false)
                }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-cyan-500 hover:bg-cyan-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
                aria-label="Close tooltip"
              >
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            
            {/* Main content */}
            <div className="font-semibold text-sm mb-1">{content}</div>

            {/* Description */}
            {description && (
              <div className="text-xs opacity-90 mt-1 leading-relaxed">{description}</div>
            )}

            {/* Keyboard shortcut */}
            {shortcut && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/20 dark:border-gray-900/20">
                <span className="text-xs opacity-75">Shortcut:</span>
                <kbd className="px-2 py-0.5 bg-white/20 dark:bg-gray-900/20 rounded text-xs font-mono border border-white/30 dark:border-gray-900/30">
                  {shortcut}
                </kbd>
              </div>
            )}

            {/* Example */}
            {example && (
              <div className="mt-2 pt-2 border-t border-white/20 dark:border-gray-900/20">
                <div className="text-xs opacity-75 mb-1">Example:</div>
                <code className="text-xs bg-white/20 dark:bg-gray-900/20 px-2 py-1 rounded block whitespace-pre-wrap">
                  {example}
                </code>
              </div>
            )}
            
            {/* Click hint for clickable tooltips */}
            {clickable && !isPinned && (
              <div className="mt-2 pt-2 border-t border-white/20 dark:border-gray-900/20 text-[10px] opacity-70 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 bg-white/10 dark:bg-gray-900/10 px-1.5 py-0.5 rounded">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  Click to pin
                </span>
                <span>•</span>
                <kbd className="px-1 py-0.5 bg-white/10 dark:bg-gray-900/10 rounded font-mono text-[9px]">Esc</kbd>
              </div>
            )}
            
            {isPinned && (
              <div className="mt-2 pt-2 border-t border-white/20 dark:border-gray-900/20 text-[10px] opacity-70 flex items-center justify-between">
                <span className="flex items-center gap-1 text-cyan-300 dark:text-cyan-600">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 4a1 1 0 0 1 1 1v4l-1 1-2-2-4 4-2-2-4 4V9a5 5 0 0 1 5-5h7z"/>
                    <path d="M8 15v6a1 1 0 0 0 2 0v-6l-1-1-1 1z"/>
                  </svg>
                  Pinned
                </span>
                <span className="flex items-center gap-1.5">
                  Click ✕ or <kbd className="px-1 py-0.5 bg-white/10 dark:bg-gray-900/10 rounded font-mono text-[9px]">Esc</kbd>
                </span>
              </div>
            )}

            {/* Arrow pointer */}
            <div
              className={`absolute w-2 h-2 bg-gray-900 dark:bg-gray-100 transform rotate-45 ${
                placement === 'top'
                  ? 'bottom-[-5px] left-1/2 -translate-x-1/2'
                  : placement === 'bottom'
                  ? 'top-[-5px] left-1/2 -translate-x-1/2'
                  : placement === 'left'
                  ? 'right-[-5px] top-1/2 -translate-y-1/2'
                  : 'left-[-5px] top-1/2 -translate-y-1/2'
              }`}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      <div
        ref={triggerRef}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`inline-flex ${clickable ? 'cursor-pointer' : ''}`}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-expanded={clickable ? isVisible : undefined}
      >
        {children}
      </div>

      {isMounted && createPortal(tooltipNode, document.body)}
    </>
  )
}

export default Tooltip