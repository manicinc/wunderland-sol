/**
 * Quick Tag Popover
 * @module codex/ui/QuickTagPopover
 *
 * @remarks
 * A compact, keyboard-focused popover for quickly adding/removing tags on a block.
 * Triggered by Cmd+T or clicking the tag button in the toolbar.
 *
 * Features:
 * - Text input with autocomplete dropdown
 * - Current tags shown as removable pills
 * - Keyboard navigation (arrows to select, Enter to add, Escape to close)
 * - Creates new tags if not in autocomplete list
 */

'use client'

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Tag, Plus, Hash } from 'lucide-react'
import type { TagIndexEntry } from '../../types'

interface QuickTagPopoverProps {
  /** Whether the popover is open */
  isOpen: boolean
  /** Close the popover */
  onClose: () => void
  /** Current block ID */
  blockId: string
  /** Current strand path */
  strandPath: string
  /** Tags currently on the block */
  currentTags: string[]
  /** Available tags from the index */
  availableTags: TagIndexEntry[]
  /** Add a tag to the block */
  onAddTag: (tag: string) => Promise<void>
  /** Remove a tag from the block */
  onRemoveTag: (tag: string) => Promise<void>
  /** Anchor position for the popover */
  anchorPosition?: { top: number; left: number }
  /** Theme */
  isDark?: boolean
}

/**
 * Quick Tag Popover - Keyboard-focused tag entry
 */
export default function QuickTagPopover({
  isOpen,
  onClose,
  blockId,
  strandPath,
  currentTags,
  availableTags,
  onAddTag,
  onRemoveTag,
  anchorPosition,
  isDark = false,
}: QuickTagPopoverProps) {
  const [inputValue, setInputValue] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isAdding, setIsAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter available tags by input, excluding current tags
  const filteredTags = useMemo(() => {
    const query = inputValue.toLowerCase().trim()
    const filtered = (availableTags || []).filter(
      (tag) =>
        !(currentTags || []).includes(tag.name) &&
        (query === '' || tag.name.toLowerCase().includes(query))
    )

    // Sort: exact prefix match first, then by count
    return filtered.sort((a, b) => {
      if (query) {
        const aStartsWith = a.name.toLowerCase().startsWith(query)
        const bStartsWith = b.name.toLowerCase().startsWith(query)
        if (aStartsWith && !bStartsWith) return -1
        if (!aStartsWith && bStartsWith) return 1
      }
      return b.count - a.count
    }).slice(0, 8) // Limit to 8 suggestions
  }, [availableTags, currentTags, inputValue])

  // Check if input is a new tag (not in available tags)
  const isNewTag = useMemo(() => {
    const trimmed = inputValue.trim().toLowerCase()
    if (!trimmed) return false
    return !(availableTags || []).some((t) => t.name.toLowerCase() === trimmed)
  }, [inputValue, availableTags])

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setInputValue('')
      setSelectedIndex(0)
      // Focus input after a short delay for animation
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredTags.length])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  // Handle adding a tag
  const handleAddTag = useCallback(
    async (tag: string) => {
      const trimmed = tag.trim().toLowerCase().replace(/\s+/g, '-')
      if (!trimmed || currentTags.includes(trimmed)) return

      setIsAdding(true)
      try {
        await onAddTag(trimmed)
        setInputValue('')
        setSelectedIndex(0)
      } finally {
        setIsAdding(false)
        inputRef.current?.focus()
      }
    },
    [currentTags, onAddTag]
  )

  // Handle removing a tag
  const handleRemoveTag = useCallback(
    async (tag: string) => {
      await onRemoveTag(tag)
      inputRef.current?.focus()
    },
    [onRemoveTag]
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onClose()
          break

        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < filteredTags.length - 1 ? prev + 1 : prev
          )
          break

        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
          break

        case 'Enter':
          e.preventDefault()
          if (filteredTags.length > 0 && selectedIndex < filteredTags.length) {
            handleAddTag(filteredTags[selectedIndex].name)
          } else if (inputValue.trim()) {
            handleAddTag(inputValue)
          }
          break

        case 'Tab':
          e.preventDefault()
          if (filteredTags.length > 0 && selectedIndex < filteredTags.length) {
            // Autocomplete the selected suggestion
            setInputValue(filteredTags[selectedIndex].name)
          }
          break

        case 'Backspace':
          if (inputValue === '' && currentTags.length > 0) {
            // Remove last tag when backspacing on empty input
            handleRemoveTag(currentTags[currentTags.length - 1])
          }
          break
      }
    },
    [filteredTags, selectedIndex, inputValue, currentTags, onClose, handleAddTag, handleRemoveTag]
  )

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: -8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        style={
          anchorPosition
            ? { position: 'fixed', top: anchorPosition.top, left: anchorPosition.left }
            : undefined
        }
        className={`
          ${anchorPosition ? '' : 'absolute top-full left-0 mt-2'}
          z-50 w-72 p-3 rounded-lg shadow-xl border
          ${isDark
            ? 'bg-zinc-900 border-zinc-700'
            : 'bg-white border-zinc-200'
          }
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Tag className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
              Quick Tag
            </span>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors`}
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Current tags */}
        {currentTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {currentTags.map((tag) => (
              <span
                key={tag}
                className={`
                  inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                  ${isDark
                    ? 'bg-cyan-900/40 text-cyan-300'
                    : 'bg-cyan-100 text-cyan-700'
                  }
                `}
              >
                <Hash className="w-3 h-3" />
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-500 transition-colors ml-0.5"
                  title="Remove tag"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="relative">
          <Hash
            className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`}
          />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a tag..."
            disabled={isAdding}
            className={`
              w-full pl-8 pr-3 py-2 text-sm rounded-lg border
              focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent
              ${isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
              }
              ${isAdding ? 'opacity-50' : ''}
            `}
          />
        </div>

        {/* Suggestions */}
        {(filteredTags.length > 0 || isNewTag) && (
          <div
            className={`
              mt-2 max-h-48 overflow-y-auto rounded-lg border
              ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
            `}
          >
            {/* New tag option */}
            {isNewTag && inputValue.trim() && (
              <button
                onClick={() => handleAddTag(inputValue)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                  ${isDark
                    ? 'hover:bg-zinc-800 text-emerald-400'
                    : 'hover:bg-zinc-50 text-emerald-600'
                  }
                  ${selectedIndex === -1 ? (isDark ? 'bg-zinc-800' : 'bg-zinc-50') : ''}
                `}
              >
                <Plus className="w-4 h-4" />
                <span>Create &quot;{inputValue.trim().toLowerCase().replace(/\s+/g, '-')}&quot;</span>
              </button>
            )}

            {/* Existing tags */}
            {filteredTags.map((tag, index) => (
              <button
                key={tag.name}
                onClick={() => handleAddTag(tag.name)}
                className={`
                  w-full flex items-center justify-between px-3 py-2 text-sm text-left
                  ${index === selectedIndex
                    ? isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                    : isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
                  }
                  ${isDark ? 'text-zinc-200' : 'text-zinc-700'}
                `}
              >
                <div className="flex items-center gap-2">
                  <Hash className="w-3 h-3 text-zinc-400" />
                  <span>{tag.name}</span>
                </div>
                <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {tag.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Keyboard hints */}
        <div className={`mt-2 flex items-center gap-3 text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">↵</kbd> add
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">esc</kbd> close
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
