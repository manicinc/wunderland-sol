/**
 * Link Autocomplete Component
 * @module codex/ui/links/LinkAutocomplete
 *
 * Roam Research-style autocomplete that appears when typing [[
 * Shows strand suggestions with fuzzy search and keyboard navigation.
 */

'use client'

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Folder,
  Hash,
  Tag,
  ChevronRight,
  Search,
  Plus,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface StrandSuggestion {
  /** Full path to the strand */
  path: string
  /** Display title */
  title: string
  /** Optional icon */
  icon?: 'file' | 'folder' | 'tag'
  /** Tags for display */
  tags?: string[]
  /** Last modified date */
  lastModified?: string
  /** Whether this is a "create new" option */
  isCreateNew?: boolean
}

export interface LinkAutocompleteProps {
  /** Visible state */
  isOpen: boolean
  /** Callback to close the autocomplete */
  onClose: () => void
  /** Called when user selects a strand */
  onSelect: (suggestion: StrandSuggestion) => void
  /** Search function to get suggestions */
  searchStrands: (query: string) => Promise<StrandSuggestion[]>
  /** Current query (text after [[) */
  query: string
  /** Position of the autocomplete dropdown */
  position: { top: number; left: number }
  /** Theme */
  theme?: string
  /** Allow creating new strands from the autocomplete */
  allowCreate?: boolean
  /** Maximum number of suggestions to show */
  maxSuggestions?: number
  /** Z-index for positioning */
  zIndex?: number
}

export interface LinkAutocompleteRef {
  /** Handle keyboard navigation */
  handleKeyDown: (e: React.KeyboardEvent) => boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function getIcon(type: string | undefined, isDark: boolean) {
  const iconClass = cn('w-3.5 h-3.5', isDark ? 'text-zinc-400' : 'text-zinc-500')
  switch (type) {
    case 'folder':
      return <Folder className={iconClass} />
    case 'tag':
      return <Tag className={iconClass} />
    default:
      return <FileText className={iconClass} />
  }
}

function highlightMatch(text: string, query: string, isDark: boolean): React.ReactNode {
  if (!query.trim()) return text
  
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerText.indexOf(lowerQuery)
  
  if (index === -1) return text
  
  return (
    <>
      {text.slice(0, index)}
      <span className={cn('font-semibold', isDark ? 'text-cyan-400' : 'text-cyan-600')}>
        {text.slice(index, index + query.length)}
      </span>
      {text.slice(index + query.length)}
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

const LinkAutocomplete = forwardRef<LinkAutocompleteRef, LinkAutocompleteProps>(
  function LinkAutocomplete(
    {
      isOpen,
      onClose,
      onSelect,
      searchStrands,
      query,
      position,
      theme = 'light',
      allowCreate = true,
      maxSuggestions = 8,
      zIndex = 9999,
    },
    ref
  ) {
    const isDark = theme?.includes('dark')
    const [suggestions, setSuggestions] = useState<StrandSuggestion[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [loading, setLoading] = useState(false)
    const listRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)

    // Reset selection when query changes
    useEffect(() => {
      setSelectedIndex(0)
    }, [query])

    // Search for suggestions when query changes
    useEffect(() => {
      if (!isOpen) return

      // Debounce search
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      debounceRef.current = setTimeout(async () => {
        setLoading(true)
        try {
          const results = await searchStrands(query)
          let items = results.slice(0, maxSuggestions)
          
          // Add "create new" option if allowed and query is not empty
          if (allowCreate && query.trim() && !items.some(s => s.path === query)) {
            items = [
              ...items,
              {
                path: query.trim(),
                title: query.trim(),
                isCreateNew: true,
              },
            ]
          }
          
          setSuggestions(items)
        } catch (error) {
          console.error('[LinkAutocomplete] Search error:', error)
          setSuggestions([])
        } finally {
          setLoading(false)
        }
      }, 150)

      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current)
        }
      }
    }, [query, isOpen, searchStrands, maxSuggestions, allowCreate])

    // Scroll selected item into view
    useEffect(() => {
      if (!listRef.current) return
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement | undefined
      selectedElement?.scrollIntoView({ block: 'nearest' })
    }, [selectedIndex])

    // Keyboard navigation handler
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent): boolean => {
        if (!isOpen || suggestions.length === 0) return false

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault()
            setSelectedIndex((prev) => (prev + 1) % suggestions.length)
            return true
          case 'ArrowUp':
            e.preventDefault()
            setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
            return true
          case 'Enter':
          case 'Tab':
            e.preventDefault()
            if (suggestions[selectedIndex]) {
              onSelect(suggestions[selectedIndex])
            }
            return true
          case 'Escape':
            e.preventDefault()
            onClose()
            return true
          default:
            return false
        }
      },
      [isOpen, suggestions, selectedIndex, onSelect, onClose]
    )

    // Expose keyboard handler to parent
    useImperativeHandle(ref, () => ({
      handleKeyDown,
    }), [handleKeyDown])

    if (!isOpen) return null

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex,
          }}
          className={cn(
            // Responsive width - larger on mobile for better tap targets
            'w-[90vw] max-w-72 sm:w-72 max-h-[60vh] sm:max-h-80 rounded-lg border shadow-xl overflow-hidden',
            isDark
              ? 'bg-zinc-900 border-zinc-700'
              : 'bg-white border-zinc-200'
          )}
          role="listbox"
          aria-label="Strand suggestions"
          aria-activedescendant={suggestions[selectedIndex]?.path}
        >
          {/* Header */}
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 border-b',
            isDark ? 'border-zinc-800 bg-zinc-900/80' : 'border-zinc-100 bg-zinc-50'
          )}>
            <Search className={cn('w-3.5 h-3.5', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
            <span className={cn(
              'text-xs font-medium',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}>
              Link to strand
            </span>
            {loading && (
              <Loader2 className={cn(
                'w-3 h-3 animate-spin ml-auto',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )} />
            )}
          </div>

          {/* Suggestions list */}
          <div
            ref={listRef}
            className="overflow-y-auto max-h-60"
            role="presentation"
          >
            {suggestions.length === 0 && !loading ? (
              <div className={cn(
                'px-3 py-6 text-center',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}>
                <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No strands found</p>
                {allowCreate && query.trim() && (
                  <p className="text-[10px] mt-1 opacity-70">
                    Press Enter to create &quot;{query}&quot;
                  </p>
                )}
              </div>
            ) : (
              suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.path}
                  id={suggestion.path}
                  role="option"
                  aria-selected={index === selectedIndex}
                  onClick={() => onSelect(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    // Larger tap targets on mobile (min 44px)
                    'w-full flex items-start gap-2 px-3 py-3 sm:py-2 text-left transition-colors touch-manipulation',
                    index === selectedIndex
                      ? isDark
                        ? 'bg-cyan-900/30'
                        : 'bg-cyan-50'
                      : isDark
                        ? 'hover:bg-zinc-800/50 active:bg-zinc-700/50'
                        : 'hover:bg-zinc-50 active:bg-zinc-100'
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    'mt-0.5 p-1 rounded flex-shrink-0',
                    suggestion.isCreateNew
                      ? isDark
                        ? 'bg-emerald-900/30 text-emerald-400'
                        : 'bg-emerald-100 text-emerald-600'
                      : isDark
                        ? 'bg-zinc-800'
                        : 'bg-zinc-100'
                  )}>
                    {suggestion.isCreateNew ? (
                      <Plus className="w-3 h-3" />
                    ) : (
                      getIcon(suggestion.icon, isDark)
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm truncate',
                      suggestion.isCreateNew
                        ? isDark
                          ? 'text-emerald-400'
                          : 'text-emerald-600'
                        : isDark
                          ? 'text-white'
                          : 'text-zinc-900'
                    )}>
                      {suggestion.isCreateNew ? (
                        <>Create &quot;{suggestion.title}&quot;</>
                      ) : (
                        highlightMatch(suggestion.title, query, isDark)
                      )}
                    </p>
                    {!suggestion.isCreateNew && (
                      <p className={cn(
                        'text-[10px] truncate mt-0.5',
                        isDark ? 'text-zinc-500' : 'text-zinc-400'
                      )}>
                        {suggestion.path}
                      </p>
                    )}
                    {/* Tags */}
                    {suggestion.tags && suggestion.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {suggestion.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className={cn(
                              'text-[9px] px-1 py-0.5 rounded',
                              isDark
                                ? 'bg-zinc-800 text-zinc-400'
                                : 'bg-zinc-100 text-zinc-500'
                            )}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  {index === selectedIndex && (
                    <ChevronRight className={cn(
                      'w-3.5 h-3.5 flex-shrink-0 mt-1',
                      isDark ? 'text-cyan-400' : 'text-cyan-600'
                    )} />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer with keyboard hints */}
          <div className={cn(
            'flex items-center gap-3 px-3 py-1.5 border-t text-[10px]',
            isDark
              ? 'border-zinc-800 bg-zinc-900/80 text-zinc-500'
              : 'border-zinc-100 bg-zinc-50 text-zinc-400'
          )}>
            <span className="flex items-center gap-1">
              <kbd className={cn(
                'px-1 py-0.5 rounded text-[9px] font-mono',
                isDark ? 'bg-zinc-800' : 'bg-zinc-200'
              )}>↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className={cn(
                'px-1 py-0.5 rounded text-[9px] font-mono',
                isDark ? 'bg-zinc-800' : 'bg-zinc-200'
              )}>↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className={cn(
                'px-1 py-0.5 rounded text-[9px] font-mono',
                isDark ? 'bg-zinc-800' : 'bg-zinc-200'
              )}>Esc</kbd>
              close
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }
)

export default LinkAutocomplete
export { LinkAutocomplete }

