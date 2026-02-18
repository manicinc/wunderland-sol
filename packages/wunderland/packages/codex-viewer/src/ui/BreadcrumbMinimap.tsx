/**
 * Breadcrumb minimap showing hierarchy preview on hover
 * @module codex/ui/BreadcrumbMinimap
 * 
 * @remarks
 * - Shows tree preview of siblings and children
 * - Quick jump to any item in preview
 * - Display strand counts and icons
 * - Smart positioning (avoid viewport edges)
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Folder, FileText } from 'lucide-react'
import type { KnowledgeTreeNode } from '../types'
import { LEVEL_STYLES } from '../constants'

interface BreadcrumbMinimapProps {
  /** Breadcrumb segment label */
  segment: string
  /** Path to this segment */
  path: string
  /** Tree nodes at this level */
  siblings: KnowledgeTreeNode[]
  /** Children of this node */
  children?: KnowledgeTreeNode[]
  /** Navigate to a path */
  onNavigate: (path: string) => void
  /** Whether this is the current/active segment */
  isActive?: boolean
}

/**
 * Breadcrumb with hover minimap preview
 * 
 * @example
 * ```tsx
 * <BreadcrumbMinimap
 *   segment="tech"
 *   path="weaves/tech"
 *   siblings={weaveSiblings}
 *   children={techChildren}
 *   onNavigate={(path) => navigateTo(path)}
 *   isActive={currentPath === 'weaves/tech'}
 * />
 * ```
 */
export default function BreadcrumbMinimap({
  segment,
  path,
  siblings,
  children,
  onNavigate,
  isActive,
}: BreadcrumbMinimapProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const minimapRef = useRef<HTMLDivElement>(null)
  const hoverTimeout = useRef<NodeJS.Timeout>()

  const handleMouseEnter = () => {
    hoverTimeout.current = setTimeout(() => {
      setIsHovered(true)
      updatePosition()
    }, 400)
  }

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    setIsHovered(false)
  }

  const updatePosition = () => {
    if (!triggerRef.current || !minimapRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const viewport = { width: window.innerWidth, height: window.innerHeight }

    // Position below breadcrumb
    let x = triggerRect.left
    let y = triggerRect.bottom + 8

    // Keep within viewport
    x = Math.max(8, Math.min(x, viewport.width - 320 - 8))

    setPosition({ x, y })
  }

  useEffect(() => {
    if (isHovered) {
      updatePosition()
      window.addEventListener('resize', updatePosition)
      return () => window.removeEventListener('resize', updatePosition)
    }
  }, [isHovered])

  const totalItems = (siblings?.length || 0) + (children?.length || 0)
  if (totalItems === 0) {
    // No minimap for empty segments
    return (
      <button
        onClick={() => onNavigate(path)}
        className={`hover:text-cyan-600 dark:hover:text-cyan-400 active:text-cyan-700 dark:active:text-cyan-300 font-medium touch-manipulation min-h-[44px] px-2 ${
          isActive ? 'text-cyan-600 dark:text-cyan-400' : 'dark:text-gray-300'
        }`}
      >
        {segment}
      </button>
    )
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => onNavigate(path)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`hover:text-cyan-600 dark:hover:text-cyan-400 active:text-cyan-700 dark:active:text-cyan-300 font-medium touch-manipulation min-h-[44px] px-2 ${
          isActive ? 'text-cyan-600 dark:text-cyan-400' : 'dark:text-gray-300'
        }`}
      >
        {segment}
      </button>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            ref={minimapRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[100]"
            style={{ left: position.x, top: position.y }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="w-80 max-h-96 overflow-y-auto bg-white dark:bg-gray-900 rounded-xl shadow-2xl border-2 border-gray-200 dark:border-gray-800 p-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Quick Jump
                </h4>
                <span className="text-xs text-gray-500">
                  {totalItems} items
                </span>
              </div>

              {/* Siblings */}
              {siblings && siblings.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Same Level:</p>
                  <div className="space-y-1">
                    {siblings.slice(0, 10).map((node) => {
                      const LevelIcon = LEVEL_STYLES[node.level]?.icon || Folder
                      const isCurrent = node.path === path

                      return (
                        <button
                          key={node.path}
                          onClick={() => {
                            onNavigate(node.path)
                            setIsHovered(false)
                          }}
                          className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                            isCurrent
                              ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-900 dark:text-cyan-100'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <LevelIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm truncate flex-1">{node.name}</span>
                          {node.type === 'dir' && (
                            <span className="text-xs text-gray-500">
                              {node.strandCount}
                            </span>
                          )}
                        </button>
                      )
                    })}
                    {siblings.length > 10 && (
                      <p className="text-xs text-gray-500 text-center py-1">
                        +{siblings.length - 10} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Children */}
              {children && children.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Inside {segment}:</p>
                  <div className="space-y-1">
                    {children.slice(0, 10).map((node) => {
                      const LevelIcon = LEVEL_STYLES[node.level]?.icon || FileText

                      return (
                        <button
                          key={node.path}
                          onClick={() => {
                            onNavigate(node.path)
                            setIsHovered(false)
                          }}
                          className="w-full flex items-center gap-2 p-2 pl-6 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
                        >
                          <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <LevelIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm truncate flex-1">{node.name}</span>
                          {node.type === 'dir' && (
                            <span className="text-xs text-gray-500">
                              {node.strandCount}
                            </span>
                          )}
                        </button>
                      )
                    })}
                    {children.length > 10 && (
                      <p className="text-xs text-gray-500 text-center py-1">
                        +{children.length - 10} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

