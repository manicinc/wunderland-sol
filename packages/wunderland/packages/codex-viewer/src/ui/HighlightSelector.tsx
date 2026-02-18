/**
 * Text selection component for creating highlights
 * @module codex/ui/HighlightSelector
 *
 * @remarks
 * - Listens to selectionchange event
 * - Shows floating toolbar on text selection
 * - Calculates character offsets from block boundaries
 * - Creates highlights with color, category, notes
 */

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Highlighter, X, Tag, StickyNote, Check } from 'lucide-react'
import type { HighlightColor, CreateHighlightData } from '../lib/highlightTypes'
import { useHighlights } from '../hooks/useHighlights'

interface HighlightSelectorProps {
  /** Current file path */
  filePath: string
  /** Container element to monitor for selections */
  containerRef: React.RefObject<HTMLElement>
  /** Callback when highlight is created */
  onHighlightCreated?: (highlightId: string) => void
}

interface SelectionPosition {
  x: number
  y: number
  width: number
  height: number
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
 * Floating toolbar for creating highlights from text selection
 *
 * @example
 * ```tsx
 * function ContentViewer({ filePath }: { filePath: string }) {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *
 *   return (
 *     <div ref={containerRef}>
 *       <MarkdownContent />
 *       <HighlightSelector
 *         filePath={filePath}
 *         containerRef={containerRef}
 *         onHighlightCreated={(id) => console.log('Created:', id)}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export default function HighlightSelector({
  filePath,
  containerRef,
  onHighlightCreated,
}: HighlightSelectorProps) {
  const { createHighlight } = useHighlights({ filePath })

  const [selectedText, setSelectedText] = useState<string>('')
  const [selectionPosition, setSelectionPosition] = useState<SelectionPosition | null>(null)
  const [showToolbar, setShowToolbar] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showCategoryInput, setShowCategoryInput] = useState(false)
  const [showNotesInput, setShowNotesInput] = useState(false)

  const [selectedColor, setSelectedColor] = useState<HighlightColor>('yellow')
  const [categoryTag, setCategoryTag] = useState('')
  const [userNotes, setUserNotes] = useState('')

  const [startOffset, setStartOffset] = useState(0)
  const [endOffset, setEndOffset] = useState(0)

  const toolbarRef = useRef<HTMLDivElement>(null)

  /**
   * Calculate character offset from the start of the container
   */
  const calculateOffset = useCallback((node: Node, offset: number): number => {
    if (!containerRef.current) return 0

    const range = document.createRange()
    range.setStart(containerRef.current, 0)
    range.setEnd(node, offset)

    const textContent = range.toString()
    return textContent.length
  }, [containerRef])

  /**
   * Handle text selection change
   */
  const handleSelectionChange = useCallback(() => {
    if (!containerRef.current) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      setShowToolbar(false)
      return
    }

    const range = selection.getRangeAt(0)
    const text = range.toString().trim()

    // Only show toolbar if text is selected and within our container
    if (
      text.length === 0 ||
      !containerRef.current.contains(range.commonAncestorContainer)
    ) {
      setShowToolbar(false)
      return
    }

    // Calculate offsets
    const start = calculateOffset(range.startContainer, range.startOffset)
    const end = calculateOffset(range.endContainer, range.endOffset)

    setSelectedText(text)
    setStartOffset(start)
    setEndOffset(end)

    // Get selection bounding box for toolbar positioning
    const rect = range.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()

    setSelectionPosition({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
    })

    setShowToolbar(true)
  }, [containerRef, calculateOffset])

  /**
   * Create highlight with current settings
   */
  const handleCreateHighlight = useCallback(async () => {
    if (!selectedText || !filePath) return

    try {
      const data: CreateHighlightData = {
        filePath,
        content: selectedText,
        selectionType: 'text',
        startOffset,
        endOffset,
        color: selectedColor,
        categoryTag: categoryTag || undefined,
        userNotes: userNotes || undefined,
      }

      const highlight = await createHighlight(data)

      // Clear selection and reset state
      window.getSelection()?.removeAllRanges()
      setShowToolbar(false)
      setShowColorPicker(false)
      setShowCategoryInput(false)
      setShowNotesInput(false)
      setCategoryTag('')
      setUserNotes('')

      if (onHighlightCreated) {
        onHighlightCreated(highlight.id)
      }
    } catch (error) {
      console.error('[HighlightSelector] Failed to create highlight:', error)
    }
  }, [
    selectedText,
    filePath,
    startOffset,
    endOffset,
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
    window.getSelection()?.removeAllRanges()
  }, [])

  /**
   * Listen to selection changes
   */
  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [handleSelectionChange])

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

  if (!showToolbar || !selectionPosition) return null

  return (
    <AnimatePresence>
      <motion.div
        ref={toolbarRef}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.15 }}
        className="absolute z-50"
        style={{
          left: `${selectionPosition.x}px`,
          top: `${selectionPosition.y - 60}px`,
          transform: 'translateX(-50%)',
        }}
      >
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
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
              className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-medium rounded hover:from-cyan-600 hover:to-purple-600 transition-all flex items-center gap-1"
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

        {/* Arrow pointing to selection */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-200 dark:border-t-gray-700"
          style={{ top: '100%' }}
        />
      </motion.div>
    </AnimatePresence>
  )
}
