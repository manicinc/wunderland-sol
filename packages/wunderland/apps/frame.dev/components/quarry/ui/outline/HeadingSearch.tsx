/**
 * Heading Search Component
 * @module codex/ui/outline/HeadingSearch
 *
 * Fuzzy search within TOC to quickly find and navigate to sections.
 * Features:
 * - Fuzzy matching
 * - Keyboard navigation
 * - Highlight matched text
 * - Recent searches
 */

'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Search, X, Hash, ChevronRight, Clock, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface SearchHeading {
  slug: string
  text: string
  level: number
  /** Optional path/breadcrumb for context */
  path?: string
}

export interface HeadingSearchProps {
  /** List of headings to search */
  headings: SearchHeading[]
  /** Theme */
  theme?: string
  /** Callback when heading is selected */
  onSelect?: (slug: string) => void
  /** Callback when search is closed */
  onClose?: () => void
  /** Placeholder text */
  placeholder?: string
  /** Whether search is open/focused */
  isOpen?: boolean
  /** Max results to show */
  maxResults?: number
  /** Show keyboard hints */
  showKeyboardHints?: boolean
}

interface SearchResult extends SearchHeading {
  score: number
  matchedRanges: [number, number][]
}

/* ═══════════════════════════════════════════════════════════════════════════
   FUZZY SEARCH
═══════════════════════════════════════════════════════════════════════════ */

function fuzzyMatch(text: string, query: string): { score: number; ranges: [number, number][] } | null {
  const textLower = text.toLowerCase()
  const queryLower = query.toLowerCase()
  
  if (queryLower.length === 0) return { score: 1, ranges: [] }
  
  // Check if query is a substring (highest score)
  const substringIndex = textLower.indexOf(queryLower)
  if (substringIndex !== -1) {
    return {
      score: 100 - substringIndex, // Earlier matches score higher
      ranges: [[substringIndex, substringIndex + query.length]],
    }
  }
  
  // Fuzzy match - each query char must appear in order
  const ranges: [number, number][] = []
  let score = 0
  let queryIndex = 0
  let lastMatchIndex = -1
  let consecutiveBonus = 0
  
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      // Track consecutive matches
      if (lastMatchIndex === i - 1) {
        consecutiveBonus += 2
      }
      
      // Word boundary bonus
      if (i === 0 || /\s/.test(text[i - 1])) {
        score += 5
      }
      
      // Build ranges for highlighting
      if (ranges.length > 0 && ranges[ranges.length - 1][1] === i) {
        ranges[ranges.length - 1][1] = i + 1
      } else {
        ranges.push([i, i + 1])
      }
      
      score += 1 + consecutiveBonus
      lastMatchIndex = i
      queryIndex++
    }
  }
  
  // All query chars must be found
  if (queryIndex !== queryLower.length) {
    return null
  }
  
  return { score, ranges }
}

function searchHeadings(headings: SearchHeading[], query: string, maxResults: number): SearchResult[] {
  if (!query.trim()) return []
  
  const results: SearchResult[] = []
  
  for (const heading of headings) {
    const match = fuzzyMatch(heading.text, query)
    if (match) {
      results.push({
        ...heading,
        score: match.score,
        matchedRanges: match.ranges,
      })
    }
  }
  
  // Sort by score (descending)
  results.sort((a, b) => b.score - a.score)
  
  return results.slice(0, maxResults)
}

/* ═══════════════════════════════════════════════════════════════════════════
   HIGHLIGHT COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

function HighlightedText({
  text,
  ranges,
  isDark,
}: {
  text: string
  ranges: [number, number][]
  isDark: boolean
}) {
  if (ranges.length === 0) {
    return <span>{text}</span>
  }
  
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  
  ranges.forEach(([start, end], i) => {
    // Text before match
    if (start > lastIndex) {
      parts.push(<span key={`text-${i}`}>{text.slice(lastIndex, start)}</span>)
    }
    // Matched text
    parts.push(
      <mark
        key={`match-${i}`}
        className={`
          px-0.5 rounded
          ${isDark ? 'bg-amber-500/30 text-amber-200' : 'bg-amber-200 text-amber-900'}
        `}
      >
        {text.slice(start, end)}
      </mark>
    )
    lastIndex = end
  })
  
  // Remaining text
  if (lastIndex < text.length) {
    parts.push(<span key="text-end">{text.slice(lastIndex)}</span>)
  }
  
  return <>{parts}</>
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function HeadingSearch({
  headings,
  theme = 'light',
  onSelect,
  onClose,
  placeholder = 'Search sections...',
  isOpen = true,
  maxResults = 10,
  showKeyboardHints = true,
}: HeadingSearchProps) {
  const isDark = theme?.includes('dark')
  const inputRef = useRef<HTMLInputElement>(null)
  
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  // Search results
  const results = useMemo(
    () => searchHeadings(headings, query, maxResults),
    [headings, query, maxResults]
  )
  
  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])
  
  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])
  
  // Handle selection
  const handleSelect = useCallback((slug: string) => {
    onSelect?.(slug)
    setQuery('')
    onClose?.()
  }, [onSelect, onClose])
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
        break
        
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
        
      case 'Enter':
        e.preventDefault()
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex].slug)
        }
        break
        
      case 'Escape':
        e.preventDefault()
        if (query) {
          setQuery('')
        } else {
          onClose?.()
        }
        break
    }
  }, [results, selectedIndex, query, handleSelect, onClose])
  
  if (!isOpen) return null

  return (
    <div className={`
      flex flex-col rounded-lg border overflow-hidden
      ${isDark
        ? 'bg-zinc-900 border-zinc-700'
        : 'bg-white border-zinc-200'
      }
    `}>
      {/* Search input */}
      <div className={`
        flex items-center gap-2 px-3 py-2 border-b
        ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
      `}>
        <Search className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`
            flex-1 bg-transparent outline-none text-sm
            ${isDark
              ? 'text-zinc-100 placeholder:text-zinc-500'
              : 'text-zinc-900 placeholder:text-zinc-400'
            }
          `}
          aria-label="Search headings"
          aria-autocomplete="list"
          aria-controls="heading-search-results"
          aria-activedescendant={results[selectedIndex]?.slug}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className={`
              p-1 rounded transition-colors
              ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}
            `}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      
      {/* Results */}
      <div
        id="heading-search-results"
        className="max-h-64 overflow-y-auto"
        role="listbox"
      >
        {query && results.length === 0 ? (
          <div className={`
            flex flex-col items-center justify-center py-6 text-center px-4
            ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
          `}>
            <Search className="w-6 h-6 mb-2 opacity-40" />
            <p className={`text-sm font-medium mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              No sections match "{query}"
            </p>
            <p className="text-xs opacity-70">
              Try a different search term
            </p>
          </div>
        ) : results.length === 0 && !query ? (
          <div className={`
            flex flex-col items-center justify-center py-6 text-center px-4
            ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
          `}>
            <Hash className="w-6 h-6 mb-2 opacity-40" />
            <p className="text-sm mb-1">Type to search sections</p>
            <p className="text-xs opacity-70">
              Find headings, topics, and jump to sections
            </p>
          </div>
        ) : (
          results.map((result, index) => (
            <button
              key={result.slug}
              id={result.slug}
              onClick={() => handleSelect(result.slug)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`
                w-full flex items-start gap-2 px-3 py-2 text-left transition-colors
                ${index === selectedIndex
                  ? isDark
                    ? 'bg-zinc-800'
                    : 'bg-zinc-100'
                  : isDark
                    ? 'hover:bg-zinc-800/50'
                    : 'hover:bg-zinc-50'
                }
              `}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <Hash className={`
                w-3.5 h-3.5 mt-0.5 flex-shrink-0
                ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
              `} />
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  <HighlightedText
                    text={result.text}
                    ranges={result.matchedRanges}
                    isDark={isDark}
                  />
                </div>
                {result.path && (
                  <div className={`text-xs truncate ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {result.path}
                  </div>
                )}
              </div>
              <span className={`
                text-[10px] px-1.5 py-0.5 rounded flex-shrink-0
                ${isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-500'}
              `}>
                H{result.level}
              </span>
            </button>
          ))
        )}
      </div>
      
      {/* Keyboard hints */}
      {showKeyboardHints && (
        <div className={`
          flex items-center gap-4 px-3 py-1.5 border-t text-[10px]
          ${isDark ? 'border-zinc-700 text-zinc-500' : 'border-zinc-200 text-zinc-400'}
        `}>
          <span className="flex items-center gap-1">
            <ArrowUp className="w-3 h-3" />
            <ArrowDown className="w-3 h-3" />
            navigate
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="w-3 h-3" />
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className={`px-1 rounded ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`}>esc</kbd>
            close
          </span>
        </div>
      )}
    </div>
  )
}

