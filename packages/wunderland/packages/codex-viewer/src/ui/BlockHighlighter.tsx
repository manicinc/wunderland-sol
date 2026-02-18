/**
 * Block-level highlighting component
 * @module codex/ui/BlockHighlighter
 *
 * @remarks
 * - Identifies markdown blocks (headings, quotes, code, paragraphs)
 * - Shows highlight button on hover
 * - Generates stable block IDs from content hash
 * - Creates block-level highlights
 */

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Highlighter, Tag, StickyNote, Check, X } from 'lucide-react'
import type { HighlightColor, CreateHighlightData } from '../lib/highlightTypes'
import { useHighlights } from '../hooks/useHighlights'

interface BlockHighlighterProps {
  /** Current file path */
  filePath: string
  /** Container element to monitor for block hovers */
  containerRef: React.RefObject<HTMLElement>
  /** Callback when highlight is created */
  onHighlightCreated?: (highlightId: string) => void
}

interface HoveredBlock {
  element: HTMLElement
  blockId: string
  content: string
  x: number
  y: number
}

const COLORS: { value: HighlightColor; label: string; class: string }[] = [
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-400 hover:bg-yellow-500' },
  { value: 'green', label: 'Green', class: 'bg-green-400 hover:bg-green-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-400 hover:bg-blue-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-400 hover:bg-pink-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-400 hover:bg-purple-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-400 hover:bg-orange-500' },
]

/**
 * Generate a stable block ID from content and position
 */
function generateBlockId(element: HTMLElement, index: number): string {
  const content = element.textContent || ''
  const tagName = element.tagName.toLowerCase()

  // Simple hash function
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return `${tagName}-${index}-${Math.abs(hash).toString(36)}`
}

/**
 * Check if element is a highlightable block
 */
function isHighlightableBlock(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase()

  return [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', // Headings
    'p', // Paragraphs
    'blockquote', // Quotes
    'pre', // Code blocks
    'ul', 'ol', // Lists
    'table', // Tables
  ].includes(tagName)
}

/**
 * Block-level highlighting with hover buttons
 *
 * @example
 * ```tsx
 * function ContentViewer({ filePath }: { filePath: string }) {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *
 *   return (
 *     <div ref={containerRef}>
 *       <MarkdownContent />
 *       <BlockHighlighter
 *         filePath={filePath}
 *         containerRef={containerRef}
 *         onHighlightCreated={(id) => console.log('Created:', id)}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export default function BlockHighlighter({
  filePath,
  containerRef,
  onHighlightCreated,
}: BlockHighlighterProps) {
  const { createHighlight } = useHighlights({ filePath })

  const [hoveredBlock, setHoveredBlock] = useState<HoveredBlock | null>(null)
  const [showToolbar, setShowToolbar] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showCategoryInput, setShowCategoryInput] = useState(false)
  const [showNotesInput, setShowNotesInput] = useState(false)

  const [selectedColor, setSelectedColor] = useState<HighlightColor>('yellow')
  const [categoryTag, setCategoryTag] = useState('')
  const [userNotes, setUserNotes] = useState('')

  const toolbarRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout>()

  /**
   * Add block IDs to all highlightable elements
   */
  const addBlockIds = useCallback(() => {
    if (!containerRef.current) return

    const blocks = containerRef.current.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, p, blockquote, pre, ul, ol, table'
    )

    blocks.forEach((block, index) => {
      if (block instanceof HTMLElement && !block.dataset.blockId) {
        block.dataset.blockId = generateBlockId(block, index)
      }
    })
  }, [containerRef])

  /**
   * Handle mouse enter on block
   */
  const handleBlockMouseEnter = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // Find the closest highlightable block
      let blockElement: HTMLElement | null = target
      while (blockElement && !isHighlightableBlock(blockElement)) {
        blockElement = blockElement.parentElement
      }

      if (!blockElement || !containerRef.current?.contains(blockElement)) {
        return
      }

      // Don't show if toolbar is already open
      if (showToolbar) return

      // Clear previous timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }

      // Debounce hover to avoid flickering
      hoverTimeoutRef.current = setTimeout(() => {
        const blockId = blockElement!.dataset.blockId || generateBlockId(blockElement!, 0)
        const content = blockElement!.textContent || ''
        const rect = blockElement!.getBoundingClientRect()
        const containerRect = containerRef.current!.getBoundingClientRect()

        setHoveredBlock({
          element: blockElement!,
          blockId,
          content,
          x: rect.right - containerRect.left,
          y: rect.top - containerRect.top,
        })
      }, 200)
    },
    [containerRef, showToolbar]
  )

  /**
   * Handle mouse leave from block
   */
  const handleBlockMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    // Don't clear if toolbar is open
    if (!showToolbar) {
      setHoveredBlock(null)
    }
  }, [showToolbar])

  /**
   * Show the highlight toolbar
   */
  const handleShowToolbar = useCallback(() => {
    setShowToolbar(true)
  }, [])

  /**
   * Create highlight with current settings
   */
  const handleCreateHighlight = useCallback(async () => {
    if (!hoveredBlock || !filePath) return

    try {
      const data: CreateHighlightData = {
        filePath,
        content: hoveredBlock.content,
        selectionType: 'block',
        blockId: hoveredBlock.blockId,
        color: selectedColor,
        categoryTag: categoryTag || undefined,
        userNotes: userNotes || undefined,
      }

      const highlight = await createHighlight(data)

      // Add highlight class to the block
      hoveredBlock.element.classList.add('codex-highlighted-block')
      hoveredBlock.element.dataset.highlightId = highlight.id
      hoveredBlock.element.dataset.highlightColor = selectedColor

      // Reset state
      setShowToolbar(false)
      setShowColorPicker(false)
      setShowCategoryInput(false)
      setShowNotesInput(false)
      setCategoryTag('')
      setUserNotes('')
      setHoveredBlock(null)

      if (onHighlightCreated) {
        onHighlightCreated(highlight.id)
      }
    } catch (error) {
      console.error('[BlockHighlighter] Failed to create highlight:', error)
    }
  }, [
    hoveredBlock,
    filePath,
    selectedColor,
    categoryTag,
    userNotes,
    createHighlight,
    onHighlightCreated,
  ])

  /**
   * Close toolbar
   */
  const handleClose = useCallback(() => {
    setShowToolbar(false)
    setShowColorPicker(false)
    setShowCategoryInput(false)
    setShowNotesInput(false)
    setCategoryTag('')
    setUserNotes('')
    setHoveredBlock(null)
  }, [])

  /**
   * Initialize block IDs and event listeners
   */
  useEffect(() => {
    if (!containerRef.current) return

    addBlockIds()

    const container = containerRef.current
    container.addEventListener('mouseenter', handleBlockMouseEnter, true)
    container.addEventListener('mouseleave', handleBlockMouseLeave, true)

    return () => {
      container.removeEventListener('mouseenter', handleBlockMouseEnter, true)
      container.removeEventListener('mouseleave', handleBlockMouseLeave, true)
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [containerRef, addBlockIds, handleBlockMouseEnter, handleBlockMouseLeave])

  /**
   * Re-add block IDs when content changes
   */
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new MutationObserver(() => {
      addBlockIds()
    })

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [containerRef, addBlockIds])

  /**
   * Close toolbar when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }

    if (showToolbar) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showToolbar, handleClose])

  return (
    <>
      {/* Hover button */}
      <AnimatePresence>
        {hoveredBlock && !showToolbar && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={handleShowToolbar}
            className="absolute z-40 p-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg shadow-lg hover:from-amber-600 hover:to-orange-600 transition-all"
            style={{
              left: `${hoveredBlock.x + 10}px`,
              top: `${hoveredBlock.y}px`,
            }}
            title="Highlight this block"
          >
            <Highlighter className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <AnimatePresence>
        {showToolbar && hoveredBlock && (
          <motion.div
            ref={toolbarRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50"
            style={{
              left: `${hoveredBlock.x + 10}px`,
              top: `${hoveredBlock.y}px`,
            }}
          >
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-[280px]">
              {/* Main toolbar */}
              <div className="flex items-center gap-1 p-2">
                {/* Color indicator with picker toggle */}
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className={`w-8 h-8 rounded ${COLORS.find((c) => c.value === selectedColor)?.class} flex items-center justify-center transition-transform hover:scale-110`}
                  title="Choose color"
                >
                  <Highlighter className="w-4 h-4 text-white drop-shadow" />
                </button>

                {/* Category tag button */}
                <button
                  onClick={() => setShowCategoryInput(!showCategoryInput)}
                  className={`p-2 rounded transition-colors ${
                    showCategoryInput || categoryTag
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                  title="Add category tag"
                >
                  <Tag className="w-4 h-4" />
                </button>

                {/* Notes button */}
                <button
                  onClick={() => setShowNotesInput(!showNotesInput)}
                  className={`p-2 rounded transition-colors ${
                    showNotesInput || userNotes
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                  title="Add notes"
                >
                  <StickyNote className="w-4 h-4" />
                </button>

                {/* Divider */}
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                {/* Create button */}
                <button
                  onClick={handleCreateHighlight}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded hover:from-amber-600 hover:to-orange-600 transition-all flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Highlight</span>
                </button>

                {/* Close button */}
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-600 dark:text-gray-400"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Color picker */}
              <AnimatePresence>
                {showColorPicker && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="border-t border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="p-2 grid grid-cols-6 gap-2">
                      {COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => {
                            setSelectedColor(color.value)
                            setShowColorPicker(false)
                          }}
                          className={`w-8 h-8 rounded ${color.class} transition-transform hover:scale-110 ${
                            selectedColor === color.value
                              ? 'ring-2 ring-gray-900 dark:ring-white ring-offset-2'
                              : ''
                          }`}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Category input */}
              <AnimatePresence>
                {showCategoryInput && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="border-t border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="p-2">
                      <input
                        type="text"
                        value={categoryTag}
                        onChange={(e) => setCategoryTag(e.target.value)}
                        placeholder="Category tag (e.g., Important, Question)"
                        className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        autoFocus
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Notes input */}
              <AnimatePresence>
                {showNotesInput && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="border-t border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="p-2">
                      <textarea
                        value={userNotes}
                        onChange={(e) => setUserNotes(e.target.value)}
                        placeholder="Add your notes..."
                        rows={3}
                        className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                        autoFocus
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global styles for highlighted blocks */}
      <style jsx global>{`
        .codex-highlighted-block {
          position: relative;
          transition: all 0.2s ease;
        }

        .codex-highlighted-block[data-highlight-color='yellow'] {
          background-color: rgba(251, 191, 36, 0.15);
          border-left: 3px solid rgb(251, 191, 36);
        }

        .codex-highlighted-block[data-highlight-color='green'] {
          background-color: rgba(34, 197, 94, 0.15);
          border-left: 3px solid rgb(34, 197, 94);
        }

        .codex-highlighted-block[data-highlight-color='blue'] {
          background-color: rgba(59, 130, 246, 0.15);
          border-left: 3px solid rgb(59, 130, 246);
        }

        .codex-highlighted-block[data-highlight-color='pink'] {
          background-color: rgba(236, 72, 153, 0.15);
          border-left: 3px solid rgb(236, 72, 153);
        }

        .codex-highlighted-block[data-highlight-color='purple'] {
          background-color: rgba(168, 85, 247, 0.15);
          border-left: 3px solid rgb(168, 85, 247);
        }

        .codex-highlighted-block[data-highlight-color='orange'] {
          background-color: rgba(249, 115, 22, 0.15);
          border-left: 3px solid rgb(249, 115, 22);
        }

        .codex-highlighted-block:hover {
          filter: brightness(1.05);
        }

        /* Dark mode adjustments */
        .dark .codex-highlighted-block[data-highlight-color='yellow'] {
          background-color: rgba(251, 191, 36, 0.2);
        }

        .dark .codex-highlighted-block[data-highlight-color='green'] {
          background-color: rgba(34, 197, 94, 0.2);
        }

        .dark .codex-highlighted-block[data-highlight-color='blue'] {
          background-color: rgba(59, 130, 246, 0.2);
        }

        .dark .codex-highlighted-block[data-highlight-color='pink'] {
          background-color: rgba(236, 72, 153, 0.2);
        }

        .dark .codex-highlighted-block[data-highlight-color='purple'] {
          background-color: rgba(168, 85, 247, 0.2);
        }

        .dark .codex-highlighted-block[data-highlight-color='orange'] {
          background-color: rgba(249, 115, 22, 0.2);
        }
      `}</style>
    </>
  )
}
