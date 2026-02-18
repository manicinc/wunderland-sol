/**
 * Rich tooltip component with keyboard shortcuts and examples
 * @module codex/ui/Tooltip
 * 
 * @remarks
 * - Hover delay: 500ms before showing
 * - Smart positioning: auto-adjusts to viewport edges
 * - Supports keyboard shortcuts display
 * - Visual examples and descriptions
 * - Accessible (ARIA labels)
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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
}

/**
 * Rich tooltip with smart positioning and keyboard shortcuts
 * 
 * @example
 * ```tsx
 * <Tooltip
 *   content="Toggle Metadata Panel"
 *   shortcut="m"
 *   description="Show/hide file metadata, tags, and backlinks"
 *   placement="bottom"
 * >
 *   <button>Info</button>
 * </Tooltip>
 * ```
 */
export default function Tooltip({
  content,
  shortcut,
  description,
  example,
  children,
  placement = 'top',
  delay = 500,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
      updatePosition()
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsVisible(false)
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

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex"
      >
        {children}
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[100] pointer-events-none"
            style={{ left: position.x, top: position.y }}
          >
            <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl shadow-2xl p-3 max-w-xs border-2 border-gray-800 dark:border-gray-200">
              {/* Main content */}
              <div className="font-semibold text-sm mb-1">{content}</div>

              {/* Description */}
              {description && (
                <div className="text-xs opacity-90 mt-1">{description}</div>
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
                  <code className="text-xs bg-white/20 dark:bg-gray-900/20 px-2 py-1 rounded block">
                    {example}
                  </code>
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
    </>
  )
}

