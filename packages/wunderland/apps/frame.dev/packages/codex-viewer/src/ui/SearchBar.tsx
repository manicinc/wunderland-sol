/**
 * Advanced search bar with filter options for Quarry Codex
 * @module codex/ui/SearchBar
 */

'use client'

import { Search, SlidersHorizontal, X, File, Highlighter, Bookmark } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import type { SearchOptions, SearchMode } from '../types'

interface SearchBarProps {
  /** Current search options */
  options: SearchOptions
  /** Update search query */
  onQueryChange: (query: string) => void
  /** Change search mode (optional - defaults to no-op) */
  onModeChange?: (mode: SearchMode) => void
  /** Toggle search in names */
  onToggleSearchNames: () => void
  /** Toggle search in content */
  onToggleSearchContent: () => void
  /** Toggle case sensitivity */
  onToggleCaseSensitive: () => void
  /** Reset all filters */
  onReset: () => void
  /** Optional ID for the input (for hotkey focus) */
  inputId?: string
  /** Optional placeholder text */
  placeholder?: string
}

/**
 * Advanced search bar with expandable filter options
 * 
 * @remarks
 * - Debounced input handled by parent hook
 * - Expandable filter panel with checkboxes
 * - Clear button when query is active
 * - Mobile-optimized with 44px touch targets
 * - Keyboard accessible (Enter to search, Esc to clear)
 * 
 * @example
 * ```tsx
 * <SearchBar
 *   options={searchOptions}
 *   onQueryChange={setQuery}
 *   onToggleSearchNames={toggleSearchNames}
 *   onToggleSearchContent={toggleSearchContent}
 *   onToggleCaseSensitive={toggleCaseSensitive}
 *   onReset={resetFilters}
 *   inputId="codex-search-input"
 *   placeholder="Search knowledge..."
 * />
 * ```
 */
export default function SearchBar({
  options,
  onQueryChange,
  onModeChange = () => {},
  onToggleSearchNames,
  onToggleSearchContent,
  onToggleCaseSensitive,
  onReset,
  inputId = 'codex-search-input',
  placeholder = 'Search knowledge...',
}: SearchBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onReset()
      e.currentTarget.blur()
    }
  }

  const activeFiltersCount = [
    !options.searchNames,
    options.searchContent,
    options.caseSensitive,
  ].filter(Boolean).length

  return (
    <div className="space-y-2">
      {/* Mode Switcher Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => onModeChange('files')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            options.mode === 'files'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          aria-label="Search files"
        >
          <File className="w-4 h-4" />
          <span>Files</span>
        </button>
        <button
          onClick={() => onModeChange('highlights')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            options.mode === 'highlights'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/30'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          aria-label="Search highlights"
        >
          <Highlighter className="w-4 h-4" />
          <span>Highlights</span>
        </button>
        <button
          onClick={() => onModeChange('bookmarks')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            options.mode === 'bookmarks'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          aria-label="Search bookmarks"
        >
          <Bookmark className="w-4 h-4" />
          <span>Bookmarks</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        
        <input
          id={inputId}
          type="text"
          value={options.query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-24 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 dark:text-white text-sm transition-shadow"
          aria-label="Search Quarry Codex"
        />

        {/* Action Buttons */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {/* Clear Button */}
          {options.query && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={onReset}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors touch-manipulation"
              aria-label="Clear search"
              title="Clear search (Esc)"
            >
              <X className="w-4 h-4 text-gray-500" />
            </motion.button>
          )}

          {/* Filters Toggle */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`relative p-1.5 rounded-lg transition-colors touch-manipulation ${
              filtersOpen || activeFiltersCount > 0
                ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500'
            }`}
            aria-label="Toggle search filters"
            aria-expanded={filtersOpen}
            title="Search filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-600 dark:bg-cyan-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Options Panel */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Search Options
                </h4>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={onReset}
                    className="text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 font-semibold"
                  >
                    Reset All
                  </button>
                )}
              </div>

              {/* Search Scope */}
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer group touch-manipulation min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={options.searchNames}
                    onChange={onToggleSearchNames}
                    className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      Search file names
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Match query against file and folder names
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group touch-manipulation min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={options.searchContent}
                    onChange={onToggleSearchContent}
                    className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      Full-text search
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Search inside file content (slower)
                    </p>
                  </div>
                </label>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-300 dark:border-gray-700" />

              {/* Search Modifiers */}
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer group touch-manipulation min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={options.caseSensitive}
                    onChange={onToggleCaseSensitive}
                    className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      Case-sensitive
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Distinguish between uppercase and lowercase
                    </p>
                  </div>
                </label>
              </div>

              {/* Info Note */}
              <div className="pt-2 border-t border-gray-300 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">💡</span>
                  <span>
                    Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded text-[10px] font-mono border border-gray-300 dark:border-gray-700">/</kbd> to focus search, 
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded text-[10px] font-mono border border-gray-300 dark:border-gray-700 ml-1">Esc</kbd> to clear
                  </span>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

