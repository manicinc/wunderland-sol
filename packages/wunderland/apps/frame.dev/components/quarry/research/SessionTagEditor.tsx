/**
 * Session Tag Editor
 * @module components/quarry/research/SessionTagEditor
 *
 * Component for adding, removing, and managing tags on research sessions.
 */

'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tag, X, Plus, Loader2, Check } from 'lucide-react'
import {
  addTagToSession,
  removeTagFromSession,
  getAllTags,
  setSessionTags,
} from '@/lib/research/sessionLinking'
import type { ResearchSession } from '@/lib/research/types'

// ============================================================================
// TYPES
// ============================================================================

interface SessionTagEditorProps {
  /** The session to edit tags for */
  session: ResearchSession
  /** Callback when tags are updated */
  onTagsChange?: (tags: string[]) => void
  /** Whether to show inline (compact) mode */
  inline?: boolean
  /** Maximum tags to show before collapsing */
  maxVisible?: number
  /** Whether editing is enabled */
  editable?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SessionTagEditor({
  session,
  onTagsChange,
  inline = false,
  maxVisible = 5,
  editable = true,
}: SessionTagEditorProps) {
  const [tags, setTags] = useState<string[]>(session.tags || [])
  const [inputValue, setInputValue] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [suggestions, setSuggestions] = useState<Array<{ tag: string; count: number }>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  // Load tag suggestions
  useEffect(() => {
    if (isAdding) {
      getAllTags().then(setSuggestions)
    }
  }, [isAdding])

  // Filter suggestions based on input
  const filteredSuggestions = suggestions
    .filter(
      (s) =>
        s.tag.includes(inputValue.toLowerCase()) &&
        !tags.includes(s.tag)
    )
    .slice(0, 5)

  const handleAddTag = useCallback(
    async (tag: string) => {
      const normalizedTag = tag.toLowerCase().trim()
      if (!normalizedTag || tags.includes(normalizedTag)) return

      setLoading(true)
      try {
        await addTagToSession(session.id, normalizedTag)
        const newTags = [...tags, normalizedTag]
        setTags(newTags)
        onTagsChange?.(newTags)
        setInputValue('')
        setShowSuggestions(false)
      } finally {
        setLoading(false)
      }
    },
    [session.id, tags, onTagsChange]
  )

  const handleRemoveTag = useCallback(
    async (tag: string) => {
      setLoading(true)
      try {
        await removeTagFromSession(session.id, tag)
        const newTags = tags.filter((t) => t !== tag)
        setTags(newTags)
        onTagsChange?.(newTags)
      } finally {
        setLoading(false)
      }
    },
    [session.id, tags, onTagsChange]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      handleAddTag(inputValue)
    } else if (e.key === 'Escape') {
      setIsAdding(false)
      setInputValue('')
      setShowSuggestions(false)
    }
  }

  const visibleTags = expanded ? tags : tags.slice(0, maxVisible)
  const hiddenCount = tags.length - maxVisible

  if (inline) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {visibleTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full"
          >
            #{tag}
            {editable && (
              <button
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        {hiddenCount > 0 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            +{hiddenCount} more
          </button>
        )}
        {editable && (
          <button
            onClick={() => setIsAdding(true)}
            className="p-0.5 text-zinc-400 hover:text-violet-600 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tags</span>
          {tags.length > 0 && (
            <span className="text-xs text-zinc-400">({tags.length})</span>
          )}
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />}
      </div>

      {/* Tags list */}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {visibleTags.map((tag) => (
            <motion.div
              key={tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-lg text-sm"
            >
              <span>#{tag}</span>
              {editable && (
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {hiddenCount > 0 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            +{hiddenCount} more
          </button>
        )}

        {/* Add tag button / input */}
        {editable && !isAdding && (
          <button
            onClick={() => {
              setIsAdding(true)
              setTimeout(() => inputRef.current?.focus(), 50)
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-zinc-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 border border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add tag
          </button>
        )}

        {isAdding && (
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                setShowSuggestions(true)
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Type tag..."
              className="px-3 py-1.5 text-sm bg-white dark:bg-zinc-800 border border-violet-300 dark:border-violet-600 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none w-32"
            />

            {/* Suggestions dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-10 overflow-hidden">
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.tag}
                    onClick={() => handleAddTag(suggestion.tag)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-violet-50 dark:hover:bg-violet-900/20 flex items-center justify-between"
                  >
                    <span className="text-zinc-700 dark:text-zinc-300">#{suggestion.tag}</span>
                    <span className="text-xs text-zinc-400">{suggestion.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Empty state */}
      {tags.length === 0 && !isAdding && (
        <p className="text-sm text-zinc-400">
          No tags yet. Add tags to organize and find related sessions.
        </p>
      )}
    </div>
  )
}

export default SessionTagEditor
