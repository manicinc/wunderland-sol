/**
 * Tag Multi-Select Component
 * @module codex/ui/TagMultiSelect
 *
 * @remarks
 * A searchable multi-select dropdown for selecting tags.
 * Shows tag counts and supports compact mode.
 */

'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Check, ChevronDown, X } from 'lucide-react'
import type { TagIndexEntry } from '../../types'

interface TagMultiSelectProps {
  /** Currently selected tags */
  selectedTags: string[]
  /** Available tags with counts */
  availableTags: TagIndexEntry[]
  /** Toggle a tag */
  onToggleTag: (tag: string) => void
  /** Compact mode */
  compact?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Optional class name */
  className?: string
}

/**
 * Tag Multi-Select - Searchable tag picker
 *
 * @example
 * ```tsx
 * <TagMultiSelect
 *   selectedTags={selectedTags}
 *   availableTags={tagsIndex.tags}
 *   onToggleTag={toggleTag}
 *   compact
 * />
 * ```
 */
export default function TagMultiSelect({
  selectedTags,
  availableTags,
  onToggleTag,
  compact = false,
  placeholder = 'Select tags...',
  className = '',
}: TagMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter tags by search query
  const filteredTags = useMemo(() => {
    const tags = availableTags || []
    if (!searchQuery.trim()) return tags
    const query = searchQuery.toLowerCase()
    return tags.filter(tag =>
      tag.name.toLowerCase().includes(query)
    )
  }, [availableTags, searchQuery])

  // Sort: selected first, then by count
  const sortedTags = useMemo(() => {
    return [...filteredTags].sort((a, b) => {
      const aSelected = selectedTags.includes(a.name)
      const bSelected = selectedTags.includes(b.name)
      if (aSelected && !bSelected) return -1
      if (!aSelected && bSelected) return 1
      return b.count - a.count
    })
  }, [filteredTags, selectedTags])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  if (compact) {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        {/* Trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full flex items-center justify-between gap-1 px-2 py-1 rounded border
            text-[10px] transition-colors
            ${isOpen
              ? 'border-cyan-400 dark:border-cyan-600 bg-white dark:bg-zinc-800'
              : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900'
            }
            hover:border-zinc-300 dark:hover:border-zinc-600
            focus:outline-none focus:ring-1 focus:ring-cyan-500
          `}
        >
          <span className={selectedTags.length > 0 ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-500'}>
            {selectedTags.length > 0 ? `${selectedTags.length} selected` : placeholder}
          </span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Selected tags preview */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {selectedTags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full
                  bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300
                  text-[9px]"
              >
                {tag}
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleTag(tag) }}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            {selectedTags.length > 3 && (
              <span className="text-[9px] text-zinc-500">
                +{selectedTags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
              className="absolute top-full left-0 right-0 mt-1 z-50
                bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700
                shadow-lg max-h-[200px] overflow-hidden"
            >
              {/* Search input */}
              <div className="p-1.5 border-b border-zinc-100 dark:border-zinc-800">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tags..."
                    className="w-full pl-6 pr-2 py-1 text-[10px] rounded border border-zinc-200 dark:border-zinc-700
                      bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Tag list */}
              <div className="max-h-[150px] overflow-y-auto p-1">
                {sortedTags.length === 0 ? (
                  <div className="px-2 py-3 text-[10px] text-zinc-500 text-center">
                    No tags found
                  </div>
                ) : (
                  sortedTags.map(tag => {
                    const isSelected = selectedTags.includes(tag.name)
                    return (
                      <button
                        key={tag.name}
                        onClick={() => onToggleTag(tag.name)}
                        className={`
                          w-full flex items-center justify-between px-2 py-1 rounded
                          text-[10px] transition-colors
                          ${isSelected
                            ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                          }
                        `}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={`w-3 h-3 rounded border flex items-center justify-center
                            ${isSelected
                              ? 'bg-cyan-500 border-cyan-500'
                              : 'border-zinc-300 dark:border-zinc-600'
                            }`}
                          >
                            {isSelected && <Check className="w-2 h-2 text-white" />}
                          </span>
                          <span>{tag.name}</span>
                        </div>
                        <span className="text-[9px] text-zinc-400">{tag.count}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Full-size mode (similar structure, larger sizing)
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border
          text-sm transition-colors
          ${isOpen
            ? 'border-cyan-400 dark:border-cyan-600 bg-white dark:bg-zinc-800'
            : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900'
          }
          hover:border-zinc-300 dark:hover:border-zinc-600
        `}
      >
        <span className={selectedTags.length > 0 ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-400'}>
          {selectedTags.length > 0 ? `${selectedTags.length} tags selected` : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedTags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full
                bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300
                text-xs"
            >
              {tag}
              <button
                onClick={() => onToggleTag(tag)}
                className="hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full left-0 right-0 mt-2 z-50
              bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700
              shadow-lg max-h-[300px] overflow-hidden"
          >
            <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tags..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700
                    bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="max-h-[240px] overflow-y-auto p-2">
              {sortedTags.length === 0 ? (
                <div className="px-3 py-4 text-sm text-zinc-500 text-center">
                  No tags found
                </div>
              ) : (
                sortedTags.map(tag => {
                  const isSelected = selectedTags.includes(tag.name)
                  return (
                    <button
                      key={tag.name}
                      onClick={() => onToggleTag(tag.name)}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 rounded-lg
                        text-sm transition-colors
                        ${isSelected
                          ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300'
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded border flex items-center justify-center
                          ${isSelected
                            ? 'bg-cyan-500 border-cyan-500'
                            : 'border-zinc-300 dark:border-zinc-600'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </span>
                        <span>{tag.name}</span>
                      </div>
                      <span className="text-xs text-zinc-400">{tag.count}</span>
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
