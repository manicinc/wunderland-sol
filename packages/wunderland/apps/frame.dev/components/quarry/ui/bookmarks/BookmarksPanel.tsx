/**
 * Bookmarks, Highlights, and Reading History panel
 * @module codex/ui/BookmarksPanel
 *
 * @remarks
 * - Side panel showing bookmarks, highlights, and recent files
 * - Toggle with keyboard shortcut 'b'
 * - Highlights support grouping/categories with colors
 * - Click any item to navigate
 * - Remove items individually or clear all
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Bookmark, Clock, Trash2, Star, Highlighter, Edit2, ChevronDown, Folder, Plus,
  Search, Download, Copy, FileText, ArrowUpDown, Calendar, Palette, FileIcon, Check, ExternalLink
} from 'lucide-react'
import type { Bookmark as BookmarkType, HistoryEntry, Highlight, HighlightGroup, HighlightColor } from '@/lib/localStorage'

type SortOption = 'date-desc' | 'date-asc' | 'color' | 'file'

// Highlight color configurations
const HIGHLIGHT_COLORS: Record<HighlightColor, { bg: string; border: string; text: string }> = {
  yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-400', text: 'text-yellow-700 dark:text-yellow-300' },
  green: { bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-400', text: 'text-green-700 dark:text-green-300' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-400', text: 'text-blue-700 dark:text-blue-300' },
  pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-400', text: 'text-pink-700 dark:text-pink-300' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-400', text: 'text-purple-700 dark:text-purple-300' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-400', text: 'text-orange-700 dark:text-orange-300' },
}

type TabId = 'bookmarks' | 'highlights' | 'history'

interface BookmarksPanelProps {
  /** Whether panel is open */
  isOpen: boolean
  /** Close panel callback */
  onClose: () => void
  /** Bookmarks list */
  bookmarks: BookmarkType[]
  /** History list */
  history: HistoryEntry[]
  /** Highlights list */
  highlights?: Highlight[]
  /** Highlight groups */
  highlightGroups?: HighlightGroup[]
  /** Default tab to show when opening */
  defaultTab?: TabId
  /** Navigate to a file */
  onNavigate: (path: string) => void
  /** Remove a bookmark */
  onRemoveBookmark: (path: string) => void
  /** Remove from history */
  onRemoveHistory: (path: string) => void
  /** Clear all bookmarks */
  onClearBookmarks: () => void
  /** Clear all history */
  onClearHistory: () => void
  /** Remove a highlight */
  onRemoveHighlight?: (id: string) => void
  /** Update a highlight */
  onUpdateHighlight?: (id: string, updates: Partial<Pick<Highlight, 'color' | 'groupId' | 'notes'>>) => void
  /** Clear all highlights */
  onClearHighlights?: () => void
  /** Add a highlight group */
  onAddHighlightGroup?: (name: string, color?: string) => void
}

/**
 * Panel displaying bookmarks, highlights, and reading history
 */
export default function BookmarksPanel({
  isOpen,
  onClose,
  bookmarks,
  history,
  highlights = [],
  highlightGroups = [],
  defaultTab = 'bookmarks',
  onNavigate,
  onRemoveBookmark,
  onRemoveHistory,
  onClearBookmarks,
  onClearHistory,
  onRemoveHighlight,
  onUpdateHighlight,
  onClearHighlights,
  onAddHighlightGroup,
}: BookmarksPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab)

  // Sync activeTab when defaultTab changes (e.g., opening from highlights button)
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab)
    }
  }, [isOpen, defaultTab])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [editingHighlightId, setEditingHighlightId] = useState<string | null>(null)
  const [showGroupDropdown, setShowGroupDropdown] = useState(false)
  const [showNewGroupInput, setShowNewGroupInput] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)

  // Handle escape key to close panel
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  // Filter and sort highlights - must be before any early returns
  const filteredHighlights = useMemo(() => {
    let result = [...highlights]

    // Filter by group
    if (selectedGroupId) {
      result = result.filter((h) => h.groupId === selectedGroupId || (!h.groupId && selectedGroupId === 'default'))
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (h) =>
          h.content.toLowerCase().includes(query) ||
          h.filePath.toLowerCase().includes(query) ||
          h.notes?.toLowerCase().includes(query)
      )
    }

    // Sort
    switch (sortBy) {
      case 'date-desc':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'date-asc':
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'color':
        const colorOrder: HighlightColor[] = ['yellow', 'orange', 'pink', 'purple', 'blue', 'green']
        result.sort((a, b) => colorOrder.indexOf(a.color) - colorOrder.indexOf(b.color))
        break
      case 'file':
        result.sort((a, b) => a.filePath.localeCompare(b.filePath))
        break
    }

    return result
  }, [highlights, selectedGroupId, searchQuery, sortBy])

  // Export highlights to markdown
  const exportToMarkdown = useCallback(() => {
    const lines = ['# Highlights\n']
    const byFile = new Map<string, Highlight[]>()

    filteredHighlights.forEach((h) => {
      const existing = byFile.get(h.filePath) || []
      existing.push(h)
      byFile.set(h.filePath, existing)
    })

    byFile.forEach((fileHighlights, filePath) => {
      lines.push(`\n## ${filePath.split('/').pop()}\n`)
      lines.push(`*Source: ${filePath}*\n`)
      fileHighlights.forEach((h) => {
        lines.push(`\n> ${h.content}`)
        if (h.notes) lines.push(`\n*Note: ${h.notes}*`)
        lines.push(`\n— *${new Date(h.createdAt).toLocaleDateString()}*\n`)
      })
    })

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `highlights-${new Date().toISOString().split('T')[0]}.md`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportDropdown(false)
  }, [filteredHighlights])

  // Copy highlights to clipboard
  const copyToClipboard = useCallback(async () => {
    const lines = filteredHighlights.map((h) => {
      let line = `"${h.content}"`
      if (h.notes) line += ` — ${h.notes}`
      line += ` (${h.filePath.split('/').pop()})`
      return line
    })

    await navigator.clipboard.writeText(lines.join('\n\n'))
    setCopiedToClipboard(true)
    setTimeout(() => setCopiedToClipboard(false), 2000)
    setShowExportDropdown(false)
  }, [filteredHighlights])

  // Handle creating a new group
  const handleCreateGroup = () => {
    if (newGroupName.trim() && onAddHighlightGroup) {
      onAddHighlightGroup(newGroupName.trim())
      setNewGroupName('')
      setShowNewGroupInput(false)
    }
  }

  // Early return AFTER all hooks to avoid React error #310
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-16 bottom-0 w-96 max-w-[90vw] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {activeTab === 'bookmarks' ? 'Bookmarks' : activeTab === 'highlights' ? 'Highlights' : 'Recent'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close panel (Esc)"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex-1 py-3 px-2 text-sm font-medium transition-colors ${
              activeTab === 'bookmarks'
                ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-600 dark:border-amber-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Bookmark className="w-4 h-4" />
              <span className="hidden sm:inline">Bookmarks</span>
              <span className="text-xs opacity-70">({bookmarks.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('highlights')}
            className={`flex-1 py-3 px-2 text-sm font-medium transition-colors ${
              activeTab === 'highlights'
                ? 'text-yellow-600 dark:text-yellow-400 border-b-2 border-yellow-600 dark:border-yellow-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Highlighter className="w-4 h-4" />
              <span className="hidden sm:inline">Highlights</span>
              <span className="text-xs opacity-70">({highlights.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-2 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-600 dark:border-cyan-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Recent</span>
              <span className="text-xs opacity-70">({history.length})</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Bookmarks Tab */}
          {activeTab === 'bookmarks' && (
            <div>
              {bookmarks.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="inline-flex p-4 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 mb-4">
                    <Star className="w-8 h-8 text-amber-500 dark:text-amber-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No bookmarks yet</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Save strands for quick access
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    💡 Click the ⭐ icon on any strand to bookmark it
                  </p>
                </div>
              ) : (
                <>
                  {bookmarks.map((bookmark) => (
                    <div
                      key={bookmark.path}
                      className="group flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800"
                    >
                      <button onClick={() => onNavigate(bookmark.path)} className="flex-1 text-left min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {bookmark.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{bookmark.path}</div>
                        {bookmark.notes && (
                          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{bookmark.notes}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(bookmark.addedAt).toLocaleDateString()}
                        </div>
                      </button>
                      <button
                        onClick={() => onRemoveBookmark(bookmark.path)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-opacity"
                        title="Remove bookmark"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                  <div className="p-3 border-t border-gray-200 dark:border-gray-800">
                    <button
                      onClick={onClearBookmarks}
                      className="w-full py-2 px-4 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      Clear All Bookmarks
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Highlights Tab */}
          {activeTab === 'highlights' && (
            <div>
              {/* Toolbar: Search, Sort, Export */}
              <div className="p-3 border-b border-gray-200 dark:border-gray-800 space-y-2">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search highlights..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg border-none focus:ring-2 focus:ring-yellow-500 dark:focus:ring-yellow-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    >
                      <X className="w-3 h-3 text-gray-500" />
                    </button>
                  )}
                </div>

                {/* Filter Row: Group, Sort, Export */}
                <div className="flex items-center gap-2">
                  {/* Group Filter */}
                  <div className="relative flex-1">
                    <button
                      onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5 text-gray-500" />
                        <span className="truncate">{selectedGroupId ? highlightGroups.find((g) => g.id === selectedGroupId)?.name : 'All'}</span>
                      </div>
                      <ChevronDown className={`w-3 h-3 transition-transform ${showGroupDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showGroupDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                        <button
                          onClick={() => {
                            setSelectedGroupId(null)
                            setShowGroupDropdown(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                            !selectedGroupId ? 'bg-gray-100 dark:bg-gray-700' : ''
                          }`}
                        >
                          All Groups
                        </button>
                        {highlightGroups.map((group) => (
                          <button
                            key={group.id}
                            onClick={() => {
                              setSelectedGroupId(group.id)
                              setShowGroupDropdown(false)
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                              selectedGroupId === group.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: group.color || '#6b7280' }}
                            />
                            <span>{group.name}</span>
                            <span className="ml-auto text-xs text-gray-400">
                              {highlights.filter((h) => h.groupId === group.id).length}
                            </span>
                          </button>
                        ))}

                        {/* Add new group button */}
                        {onAddHighlightGroup && (
                          <>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                            {showNewGroupInput ? (
                              <div className="p-2">
                                <input
                                  type="text"
                                  value={newGroupName}
                                  onChange={(e) => setNewGroupName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateGroup()
                                    if (e.key === 'Escape') setShowNewGroupInput(false)
                                  }}
                                  placeholder="Group name..."
                                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowNewGroupInput(true)}
                                className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <Plus className="w-4 h-4" />
                                New Group
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sort Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSortDropdown(!showSortDropdown)}
                      className="flex items-center gap-1 px-2 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      title="Sort highlights"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
                      <ChevronDown className={`w-3 h-3 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showSortDropdown && (
                      <div className="absolute top-full right-0 mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                        {[
                          { id: 'date-desc' as SortOption, label: 'Newest first', icon: Calendar },
                          { id: 'date-asc' as SortOption, label: 'Oldest first', icon: Calendar },
                          { id: 'color' as SortOption, label: 'By color', icon: Palette },
                          { id: 'file' as SortOption, label: 'By file', icon: FileIcon },
                        ].map((option) => (
                          <button
                            key={option.id}
                            onClick={() => {
                              setSortBy(option.id)
                              setShowSortDropdown(false)
                            }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                              sortBy === option.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                            }`}
                          >
                            <option.icon className="w-3.5 h-3.5 text-gray-500" />
                            {option.label}
                            {sortBy === option.id && <Check className="w-3 h-3 ml-auto text-green-500" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Export Dropdown */}
                  {filteredHighlights.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowExportDropdown(!showExportDropdown)}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="Export highlights"
                      >
                        <Download className="w-3.5 h-3.5 text-gray-500" />
                      </button>

                      {showExportDropdown && (
                        <div className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                          <button
                            onClick={exportToMarkdown}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <FileText className="w-3.5 h-3.5 text-gray-500" />
                            Export to Markdown
                          </button>
                          <button
                            onClick={copyToClipboard}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            {copiedToClipboard ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-green-500" />
                                <span className="text-green-600 dark:text-green-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-gray-500" />
                                Copy to Clipboard
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Results info */}
              {searchQuery && (
                <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-200 dark:border-gray-800">
                  {filteredHighlights.length} result{filteredHighlights.length !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;
                </div>
              )}

              {filteredHighlights.length === 0 ? (
                <div className="p-8 text-center">
                  {searchQuery ? (
                    <>
                      <Search className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">No highlights match your search</p>
                      <button
                        onClick={() => setSearchQuery('')}
                        className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 hover:underline"
                      >
                        Clear search
                      </button>
                    </>
                  ) : (
                    <>
                      <Highlighter className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No highlights yet</p>
                      <p className="text-xs text-gray-500 mt-2 max-w-[200px] mx-auto">
                        Double-click on any text in the editor to save it as a highlight
                      </p>
                      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-yellow-400" />
                          <span className="w-3 h-3 rounded-full bg-green-400" />
                          <span className="w-3 h-3 rounded-full bg-blue-400" />
                          <span className="w-3 h-3 rounded-full bg-pink-400" />
                        </span>
                        <span>6 colors available</span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {filteredHighlights.map((highlight) => {
                    const colorConfig = HIGHLIGHT_COLORS[highlight.color] || HIGHLIGHT_COLORS.yellow
                    const group = highlightGroups.find((g) => g.id === highlight.groupId)

                    return (
                      <div
                        key={highlight.id}
                        className={`group p-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${colorConfig.bg}`}
                      >
                        <div className="flex items-start gap-2">
                          {/* Color indicator */}
                          <div className={`w-1 self-stretch rounded-full ${colorConfig.border} border-2`} />

                          <div className="flex-1 min-w-0">
                            {/* Content */}
                            <p className={`text-sm font-medium ${colorConfig.text} line-clamp-3`}>
                              &ldquo;{highlight.content}&rdquo;
                            </p>

                            {/* Source file */}
                            <button
                              onClick={() => onNavigate(highlight.filePath)}
                              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 truncate block mt-1"
                            >
                              {highlight.filePath}
                            </button>

                            {/* Notes */}
                            {highlight.notes && (
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 italic">{highlight.notes}</p>
                            )}

                            {/* Meta row */}
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                              {group && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                  style={{ backgroundColor: group.color + '20', color: group.color }}
                                >
                                  {group.name}
                                </span>
                              )}
                              <span>{new Date(highlight.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Quick color change */}
                            {onUpdateHighlight && (
                              <div className="flex items-center gap-0.5 p-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map((color) => (
                                  <button
                                    key={color}
                                    onClick={() => onUpdateHighlight(highlight.id, { color })}
                                    className={`w-4 h-4 rounded-full transition-transform hover:scale-110 ${
                                      highlight.color === color ? 'ring-1 ring-offset-1 ring-gray-400' : ''
                                    }`}
                                    style={{
                                      backgroundColor:
                                        color === 'yellow' ? '#fbbf24' :
                                        color === 'green' ? '#22c55e' :
                                        color === 'blue' ? '#3b82f6' :
                                        color === 'pink' ? '#ec4899' :
                                        color === 'purple' ? '#a855f7' : '#f97316',
                                    }}
                                    title={color.charAt(0).toUpperCase() + color.slice(1)}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Edit and delete buttons */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => onNavigate(highlight.filePath)}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                title="Go to source"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                              </button>
                              {onUpdateHighlight && (
                                <button
                                  onClick={() => setEditingHighlightId(editingHighlightId === highlight.id ? null : highlight.id)}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                  title="Edit highlight"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                                </button>
                              )}
                              {onRemoveHighlight && (
                                <button
                                  onClick={() => onRemoveHighlight(highlight.id)}
                                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                  title="Remove highlight"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Edit panel */}
                        {editingHighlightId === highlight.id && onUpdateHighlight && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            {/* Color picker */}
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-gray-500">Color:</span>
                              {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map((color) => (
                                <button
                                  key={color}
                                  onClick={() => onUpdateHighlight(highlight.id, { color })}
                                  className={`w-5 h-5 rounded-full border-2 ${
                                    highlight.color === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''
                                  }`}
                                  style={{
                                    backgroundColor:
                                      color === 'yellow'
                                        ? '#fbbf24'
                                        : color === 'green'
                                          ? '#22c55e'
                                          : color === 'blue'
                                            ? '#3b82f6'
                                            : color === 'pink'
                                              ? '#ec4899'
                                              : color === 'purple'
                                                ? '#a855f7'
                                                : '#f97316',
                                  }}
                                />
                              ))}
                            </div>

                            {/* Group selector */}
                            {highlightGroups.length > 0 && (
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs text-gray-500">Group:</span>
                                <select
                                  value={highlight.groupId || 'default'}
                                  onChange={(e) => onUpdateHighlight(highlight.id, { groupId: e.target.value })}
                                  className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border-none"
                                >
                                  {highlightGroups.map((g) => (
                                    <option key={g.id} value={g.id}>
                                      {g.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Notes input */}
                            <div className="flex items-start gap-2">
                              <span className="text-xs text-gray-500 mt-1">Notes:</span>
                              <textarea
                                defaultValue={highlight.notes || ''}
                                onBlur={(e) => onUpdateHighlight(highlight.id, { notes: e.target.value })}
                                placeholder="Add a note..."
                                className="flex-1 text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border-none resize-none"
                                rows={2}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {onClearHighlights && filteredHighlights.length > 0 && (
                    <div className="p-3 border-t border-gray-200 dark:border-gray-800">
                      <button
                        onClick={onClearHighlights}
                        className="w-full py-2 px-4 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        Clear All Highlights
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              {history.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">No reading history</p>
                </div>
              ) : (
                <>
                  {history.map((entry) => (
                    <div
                      key={entry.path}
                      className="group flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800"
                    >
                      <button onClick={() => onNavigate(entry.path)} className="flex-1 text-left min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{entry.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{entry.path}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(entry.viewedAt).toLocaleDateString()} &bull; {entry.viewCount}{' '}
                          {entry.viewCount === 1 ? 'view' : 'views'}
                        </div>
                      </button>
                      <button
                        onClick={() => onRemoveHistory(entry.path)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-opacity"
                        title="Remove from history"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                  <div className="p-3 border-t border-gray-200 dark:border-gray-800">
                    <button
                      onClick={onClearHistory}
                      className="w-full py-2 px-4 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      Clear All History
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 space-y-1.5 text-center">
          <p className="text-xs text-gray-500">
            Bookmarks, highlights & history are stored <strong>only in this browser</strong>.
          </p>
          <p className="text-xs text-gray-500">
            Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">b</kbd> to toggle this
            panel.
          </p>
        </div>
      </motion.div>
    </>
  )
}
