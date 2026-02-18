/**
 * Bookmarks and reading history panel
 * @module codex/ui/BookmarksPanel
 * 
 * @remarks
 * - Side panel showing bookmarks and recent files
 * - Toggle with keyboard shortcut 'b'
 * - Click any item to navigate
 * - Remove items individually or clear all
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bookmark, Clock, Trash2, Star, Highlighter, Download, FileJson, FileText, FileCode } from 'lucide-react'
import type { Bookmark as BookmarkType, HistoryEntry } from '../lib/localStorage'
import type { Highlight } from '../lib/highlightTypes'
import HighlightCard from './HighlightCard'
import { useHighlights } from '../hooks/useHighlights'
import { exportHighlights, exportBookmarks, exportHistory, exportAll, type ExportFormat } from '../lib/exportUtils'
import { useGroups } from '../hooks/useGroups'

interface BookmarksPanelProps {
  /** Whether panel is open */
  isOpen: boolean
  /** Close panel callback */
  onClose: () => void
  /** Bookmarks list */
  bookmarks: BookmarkType[]
  /** History list */
  history: HistoryEntry[]
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
}

/**
 * Panel displaying bookmarks and reading history
 * 
 * @example
 * ```tsx
 * <BookmarksPanel
 *   isOpen={bookmarksOpen}
 *   onClose={() => setBookmarksOpen(false)}
 *   bookmarks={bookmarks}
 *   history={history}
 *   onNavigate={(path) => openFile(path)}
 *   onRemoveBookmark={removeBookmark}
 *   onRemoveHistory={removeFromHistory}
 *   onClearBookmarks={clearAllBookmarks}
 *   onClearHistory={clearAllHistory}
 * />
 * ```
 */
export default function BookmarksPanel({
  isOpen,
  onClose,
  bookmarks,
  history,
  onNavigate,
  onRemoveBookmark,
  onRemoveHistory,
  onClearBookmarks,
  onClearHistory,
}: BookmarksPanelProps) {
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'highlights' | 'history'>('bookmarks')
  const { highlights, loading: highlightsLoading, updateHighlight, deleteHighlight } = useHighlights({ autoLoad: isOpen })
  const { groups } = useGroups()
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  /**
   * Close export menu when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showExportMenu])

  /**
   * Handle export based on active tab and format
   */
  const handleExport = (format: ExportFormat) => {
    switch (activeTab) {
      case 'bookmarks':
        exportBookmarks(bookmarks, format)
        break
      case 'highlights':
        exportHighlights(highlights, format)
        break
      case 'history':
        exportHistory(history, format)
        break
    }
    setShowExportMenu(false)
  }

  /**
   * Handle export all data
   */
  const handleExportAll = () => {
    exportAll(highlights, bookmarks, history, groups)
    setShowExportMenu(false)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-50 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 w-80 max-w-[90vw] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {activeTab === 'bookmarks' && 'Bookmarks'}
            {activeTab === 'highlights' && 'Highlights'}
            {activeTab === 'history' && 'Recent'}
          </h2>
          <div className="flex items-center gap-2">
            {/* Export button with dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Export data"
                title="Export data"
              >
                <Download className="w-5 h-5" />
              </button>

              {/* Export dropdown menu */}
              <AnimatePresence>
                {showExportMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-10 overflow-hidden"
                  >
                    {/* Export current tab */}
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1">
                        Export {activeTab === 'bookmarks' ? 'Bookmarks' : activeTab === 'highlights' ? 'Highlights' : 'History'}
                      </p>
                      <button
                        onClick={() => handleExport('json')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      >
                        <FileJson className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Export as JSON</span>
                      </button>
                      <button
                        onClick={() => handleExport('csv')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      >
                        <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span>Export as CSV</span>
                      </button>
                      <button
                        onClick={() => handleExport('markdown')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      >
                        <FileCode className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span>Export as Markdown</span>
                      </button>
                    </div>

                    {/* Export all */}
                    <div className="p-2">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1">
                        Export Everything
                      </p>
                      <button
                        onClick={handleExportAll}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gradient-to-r hover:from-cyan-50 hover:to-purple-50 dark:hover:from-cyan-900/20 dark:hover:to-purple-900/20 rounded transition-colors"
                      >
                        <Download className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        <span>Export All Data (JSON)</span>
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1">
                        Includes highlights, bookmarks, history, and groups
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close bookmarks panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex-1 py-3 px-2 text-sm font-medium transition-colors ${
              activeTab === 'bookmarks'
                ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <Bookmark className="w-4 h-4" />
              <span className="hidden sm:inline">Bookmarks</span>
              <span className="text-xs">({bookmarks.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('highlights')}
            className={`flex-1 py-3 px-2 text-sm font-medium transition-colors ${
              activeTab === 'highlights'
                ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-600 dark:border-amber-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <Highlighter className="w-4 h-4" />
              <span className="hidden sm:inline">Highlights</span>
              <span className="text-xs">({highlights.length})</span>
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
            <div className="flex items-center justify-center gap-1">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Recent</span>
              <span className="text-xs">({history.length})</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'bookmarks' ? (
            <div>
              {bookmarks.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Star className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">No bookmarks yet</p>
                  <p className="text-xs mt-2">Press ′b′ to bookmark the current file</p>
                </div>
              ) : (
                <>
                  {bookmarks.map((bookmark) => (
                    <div
                      key={bookmark.path}
                      className="group flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800"
                    >
                      <button
                        onClick={() => onNavigate(bookmark.path)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {bookmark.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {bookmark.path}
                        </div>
                        {bookmark.notes && (
                          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            {bookmark.notes}
                          </div>
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
          ) : activeTab === 'highlights' ? (
            <div>
              {highlightsLoading ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="animate-spin w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-sm">Loading highlights...</p>
                </div>
              ) : highlights.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Highlighter className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">No highlights yet</p>
                  <p className="text-xs mt-2">Select text to create your first highlight</p>
                </div>
              ) : (
                <div className="space-y-2 p-2">
                  {highlights.map((highlight) => (
                    <HighlightCard
                      key={highlight.id}
                      highlight={highlight}
                      onNavigate={onNavigate}
                      onEdit={(h) => console.log('Edit:', h)}
                      onDelete={deleteHighlight}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
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
                      <button
                        onClick={() => onNavigate(entry.path)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {entry.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {entry.path}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(entry.viewedAt).toLocaleDateString()} • {entry.viewCount}{' '}
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
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 text-center">
            Stored locally in your browser • Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">b</kbd> to toggle
          </p>
        </div>
      </motion.div>
    </>
  )
}

