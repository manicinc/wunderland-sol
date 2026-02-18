/**
 * Inline Tag Editor - Text selection tag editor
 * @module components/quarry/ui/editor/InlineTagEditor
 *
 * A floating popover that appears when text is selected,
 * allowing users to add block tags with auto-suggest.
 */

'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Hash, X, Check, Plus, Search, Tag, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme } from '@/types/theme'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface InlineTagEditorProps {
    /** Selection position for positioning the popover */
    position: { x: number; y: number } | null
    /** Selected text content */
    selectedText: string
    /** Callback when tag is added */
    onAddTag: (tag: string, selectedText: string) => void
    /** Callback to close the editor */
    onClose: () => void
    /** Existing tags for auto-suggest */
    existingTags?: string[]
    /** Theme */
    theme?: ThemeName
    /** Maximum suggestions to show */
    maxSuggestions?: number
}

export interface TagSuggestion {
    tag: string
    relevance: 'exact' | 'partial' | 'new'
    frequency?: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get tag suggestions based on input and existing tags
 */
function getTagSuggestions(
    input: string,
    existingTags: string[],
    selectedText: string,
    maxSuggestions: number
): TagSuggestion[] {
    const suggestions: TagSuggestion[] = []
    const inputLower = input.toLowerCase().trim()
    const textWords = selectedText.toLowerCase().split(/\s+/).filter(w => w.length > 3)

    if (!inputLower) {
        // No input - suggest based on selected text and popular tags
        for (const word of textWords.slice(0, 3)) {
            const matchingTag = existingTags.find(t => t.toLowerCase().includes(word))
            if (matchingTag && !suggestions.find(s => s.tag === matchingTag)) {
                suggestions.push({ tag: matchingTag, relevance: 'partial' })
            }
        }

        // Add popular existing tags
        for (const tag of existingTags.slice(0, maxSuggestions - suggestions.length)) {
            if (!suggestions.find(s => s.tag === tag)) {
                suggestions.push({ tag, relevance: 'partial' })
            }
        }

        return suggestions.slice(0, maxSuggestions)
    }

    // Exact matches
    for (const tag of existingTags) {
        if (tag.toLowerCase() === inputLower) {
            suggestions.push({ tag, relevance: 'exact' })
        }
    }

    // Partial matches (starts with)
    for (const tag of existingTags) {
        if (tag.toLowerCase().startsWith(inputLower) && !suggestions.find(s => s.tag === tag)) {
            suggestions.push({ tag, relevance: 'partial' })
        }
    }

    // Contains matches
    for (const tag of existingTags) {
        if (tag.toLowerCase().includes(inputLower) && !suggestions.find(s => s.tag === tag)) {
            suggestions.push({ tag, relevance: 'partial' })
        }
    }

    // Add "create new" option if no exact match
    if (!suggestions.find(s => s.relevance === 'exact') && inputLower.length > 1) {
        suggestions.push({ tag: inputLower, relevance: 'new' })
    }

    return suggestions.slice(0, maxSuggestions)
}

/**
 * Format tag for display (remove special chars, normalize)
 */
function formatTag(tag: string): string {
    return tag
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function InlineTagEditor({
    position,
    selectedText,
    onAddTag,
    onClose,
    existingTags = [],
    theme = 'dark',
    maxSuggestions = 6,
}: InlineTagEditorProps) {
    const [input, setInput] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const isDark = isDarkTheme(theme)

    // Get suggestions based on input
    const suggestions = useMemo(
        () => getTagSuggestions(input, existingTags, selectedText, maxSuggestions),
        [input, existingTags, selectedText, maxSuggestions]
    )

    // Focus input on mount
    useEffect(() => {
        if (position && inputRef.current) {
            inputRef.current.focus()
        }
    }, [position])

    // Handle click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onClose])

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1))
                break
            case 'ArrowUp':
                e.preventDefault()
                setSelectedIndex(i => Math.max(i - 1, 0))
                break
            case 'Enter':
                e.preventDefault()
                if (suggestions[selectedIndex]) {
                    handleSelectTag(suggestions[selectedIndex].tag)
                } else if (input.trim()) {
                    handleSelectTag(formatTag(input))
                }
                break
            case 'Escape':
                e.preventDefault()
                onClose()
                break
            case 'Tab':
                e.preventDefault()
                if (suggestions[selectedIndex]) {
                    setInput(suggestions[selectedIndex].tag)
                }
                break
        }
    }, [suggestions, selectedIndex, input, onClose])

    const handleSelectTag = useCallback((tag: string) => {
        const formattedTag = formatTag(tag)
        if (formattedTag) {
            onAddTag(formattedTag, selectedText)
            onClose()
        }
    }, [onAddTag, selectedText, onClose])

    if (!position) return null

    return (
        <AnimatePresence>
            <motion.div
                ref={containerRef}
                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                style={{
                    position: 'fixed',
                    left: position.x,
                    top: position.y + 10,
                    zIndex: 9999,
                }}
                className={cn(
                    'w-64 rounded-lg shadow-2xl border overflow-hidden',
                    isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
                )}
            >
                {/* Header */}
                <div className={cn(
                    'flex items-center justify-between px-3 py-2 border-b',
                    isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-100 bg-zinc-50'
                )}>
                    <div className="flex items-center gap-2">
                        <Hash className={cn('w-4 h-4', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                        <span className={cn('text-xs font-medium', isDark ? 'text-zinc-300' : 'text-zinc-600')}>
                            Add Block Tag
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className={cn(
                            'p-1 rounded hover:bg-zinc-700/50 transition-colors',
                            isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'
                        )}
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Selected text preview */}
                <div className={cn(
                    'px-3 py-2 text-xs border-b truncate',
                    isDark ? 'text-zinc-500 border-zinc-800 bg-zinc-900/50' : 'text-zinc-400 border-zinc-100 bg-zinc-50/50'
                )}>
                    &ldquo;{selectedText.slice(0, 50)}{selectedText.length > 50 ? '...' : ''}&rdquo;
                </div>

                {/* Search input */}
                <div className={cn(
                    'flex items-center gap-2 px-3 py-2 border-b',
                    isDark ? 'border-zinc-800' : 'border-zinc-100'
                )}>
                    <Search className={cn('w-4 h-4 flex-shrink-0', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value)
                            setSelectedIndex(0)
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Type tag name..."
                        className={cn(
                            'flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-500',
                            isDark ? 'text-white' : 'text-zinc-900'
                        )}
                    />
                </div>

                {/* Suggestions list */}
                <div className="max-h-48 overflow-y-auto">
                    {suggestions.length === 0 && input.trim() && (
                        <button
                            onClick={() => handleSelectTag(input)}
                            className={cn(
                                'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                                isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
                            )}
                        >
                            <Plus className="w-4 h-4 text-green-500" />
                            <span className="text-sm">Create &quot;{formatTag(input)}&quot;</span>
                        </button>
                    )}

                    {suggestions.map((suggestion, idx) => (
                        <button
                            key={`${suggestion.tag}-${idx}`}
                            onClick={() => handleSelectTag(suggestion.tag)}
                            className={cn(
                                'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                                idx === selectedIndex
                                    ? isDark ? 'bg-cyan-500/20' : 'bg-cyan-50'
                                    : isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50',
                                isDark ? 'text-zinc-200' : 'text-zinc-700'
                            )}
                        >
                            {suggestion.relevance === 'new' ? (
                                <Plus className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : suggestion.relevance === 'exact' ? (
                                <Check className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                            ) : (
                                <Tag className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                            )}
                            <span className="text-sm truncate">{suggestion.tag}</span>
                            {suggestion.relevance === 'new' && (
                                <span className={cn(
                                    'ml-auto text-xs px-1.5 py-0.5 rounded',
                                    isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                                )}>
                                    new
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Footer hint */}
                <div className={cn(
                    'flex items-center gap-3 px-3 py-1.5 text-xs border-t',
                    isDark ? 'border-zinc-800 text-zinc-500' : 'border-zinc-100 text-zinc-400'
                )}>
                    <span>↑↓ navigate</span>
                    <span>↵ select</span>
                    <span>esc close</span>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}

export default InlineTagEditor
