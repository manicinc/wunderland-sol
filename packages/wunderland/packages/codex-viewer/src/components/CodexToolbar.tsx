/**
 * Toolbar component for Frame Codex viewer
 * Contains navigation tools, contribute dropdown, and visualization toggle
 * @module codex/CodexToolbar
 */

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Search, Map, Info, Plus, GitPullRequest, HelpCircle, FileText, Code, Bookmark, BookmarkCheck, Star, Settings, LifeBuoy, Network, Clock } from 'lucide-react'
import { REPO_CONFIG } from './constants'

interface CodexToolbarProps {
  /** Current directory path */
  currentPath: string
  /** Whether metadata panel is open */
  metaOpen: boolean
  /** Toggle metadata panel */
  onToggleMeta: () => void
  /** Current file (if any) */
  currentFile?: { path: string; name: string } | null
  /** Whether current file is bookmarked */
  isBookmarked?: boolean
  /** Toggle bookmark for current file */
  onToggleBookmark?: () => void
  /** Open bookmarks panel */
  onOpenBookmarks?: () => void
  /** Open preferences */
  onOpenPreferences?: () => void
  /** Open help panel */
  onOpenHelp?: () => void
  /** Open graph view */
  onOpenGraph?: () => void
  /** Open timeline view */
  onOpenTimeline?: () => void
  /** Open contribution modal */
  onOpenContribute?: () => void
}

/**
 * Toolbar with high-level navigation and actions
 * 
 * @remarks
 * - Search, Architecture, Info buttons
 * - Contribute dropdown with context-aware options
 * - Mobile-optimized with 44px+ touch targets
 * - Tooltips for accessibility
 * 
 * @example
 * ```tsx
 * <CodexToolbar
 *   currentPath="weaves/tech"
 *   metaOpen={metaOpen}
 *   onToggleMeta={() => setMetaOpen(v => !v)}
 * />
 * ```
 */
export default function CodexToolbar({
  currentPath,
  metaOpen,
  onToggleMeta,
  currentFile,
  isBookmarked,
  onToggleBookmark,
  onOpenBookmarks,
  onOpenPreferences,
  onOpenHelp,
  onOpenGraph,
  onOpenTimeline,
  onOpenContribute,
}: CodexToolbarProps) {
  const [showContribute, setShowContribute] = useState(false)

  // Build contribution URLs
  const currentDir = currentPath || ''
  const baseNewUrl = `https://github.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/new/${REPO_CONFIG.BRANCH}/${
    currentDir ? `${currentDir}/` : ''
  }`
  const addStrandUrl = `${baseNewUrl}?filename=new-strand.md`
  const pathSegments = currentDir.split('/').filter(Boolean)
  let yamlSuggestion = ''
  if (pathSegments[0] === 'weaves') {
    if (pathSegments.length === 2) {
      yamlSuggestion = 'weave.yaml'
    } else if (pathSegments.length > 2) {
      yamlSuggestion = 'loom.yaml'
    }
  }
  const addYamlUrl = yamlSuggestion ? `${baseNewUrl}?filename=${yamlSuggestion}` : ''

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search */}
      <Link
        href="/codex/search"
        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors touch-manipulation min-h-[44px]"
        title="Advanced search"
      >
        <Search className="w-4 h-4" />
        <span className="hidden xs:inline">Search</span>
      </Link>

      {/* Knowledge Graph */}
      {onOpenGraph && (
        <button
          onClick={onOpenGraph}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors touch-manipulation min-h-[44px]"
          title="Knowledge graph visualization"
        >
          <Network className="w-4 h-4" />
          <span className="hidden xs:inline">Graph</span>
        </button>
      )}

      {/* Timeline View */}
      {onOpenTimeline && (
        <button
          onClick={onOpenTimeline}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors touch-manipulation min-h-[44px]"
          title="Reading timeline"
        >
          <Clock className="w-4 h-4" />
          <span className="hidden xs:inline">Timeline</span>
        </button>
      )}

      {/* Architecture Diagram */}
      <Link
        href="/codex/architecture"
        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors touch-manipulation min-h-[44px]"
        title="View architecture diagram"
      >
        <Map className="w-4 h-4" />
        <span className="hidden xs:inline">Diagram</span>
      </Link>

      {/* Bookmark Current File */}
      {currentFile && onToggleBookmark && (
        <button
          onClick={onToggleBookmark}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs rounded-lg border transition-colors touch-manipulation min-h-[44px] ${
            isBookmarked
              ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
              : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title={isBookmarked ? 'Remove bookmark (b)' : 'Add bookmark (b)'}
        >
          {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          <span className="hidden xs:inline">{isBookmarked ? 'Saved' : 'Save'}</span>
        </button>
      )}

      {/* Bookmarks List */}
      {onOpenBookmarks && (
        <button
          onClick={onOpenBookmarks}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors touch-manipulation min-h-[44px]"
          title="View bookmarks & history (b)"
        >
          <Star className="w-4 h-4" />
          <span className="hidden xs:inline">Bookmarks</span>
        </button>
      )}

      {/* Preferences */}
      {onOpenPreferences && (
        <button
          onClick={onOpenPreferences}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors touch-manipulation min-h-[44px]"
          title="Preferences (,)"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden xs:inline">Settings</span>
        </button>
      )}

      {/* Help */}
      {onOpenHelp && (
        <button
          onClick={onOpenHelp}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors touch-manipulation min-h-[44px]"
          title="Help & Keyboard Shortcuts (?)"
        >
          <LifeBuoy className="w-4 h-4" />
          <span className="hidden xs:inline">Help</span>
        </button>
      )}

      {/* Info Panel Toggle */}
      <button
        onClick={onToggleMeta}
        className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs rounded-lg border transition-colors touch-manipulation min-h-[44px] ${
          metaOpen
            ? 'border-gray-400 dark:border-gray-500 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        title="Toggle metadata panel (m)"
      >
        <Info className="w-4 h-4" />
        <span className="hidden xs:inline">Info</span>
      </button>

      {/* Contribute Button */}
      {onOpenContribute && (
        <button
          onClick={onOpenContribute}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs rounded-lg border-2 border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 active:bg-green-200 dark:active:bg-green-900/40 transition-colors touch-manipulation min-h-[44px] font-semibold"
          title="Contribute new strand"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden xs:inline">Contribute</span>
        </button>
      )}

      {/* Contribute Dropdown (fallback for direct GitHub links) */}
      <div className="relative">
        <button
          onClick={() => setShowContribute((v) => !v)}
          className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center md:hidden"
          title="Quick actions"
          aria-label="Quick actions"
          aria-expanded={showContribute}
        >
          <Plus className="w-4 h-4" />
        </button>
        {showContribute && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowContribute(false)}
              aria-hidden="true"
            />
            {/* Dropdown */}
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                Contribute to {currentDir || 'root'} in Frame Codex.
              </div>
              <div className="py-1">
                <a
                  href={addStrandUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowContribute(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors"
                >
                  <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>Add new Markdown strand (MD)</span>
                </a>
                {addYamlUrl && (
                  <a
                    href={addYamlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowContribute(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors"
                  >
                    <Code className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                    <span>Add {yamlSuggestion} manifest</span>
                  </a>
                )}
                <a
                  href={`https://github.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/compare`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowContribute(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors"
                >
                  <GitPullRequest className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Open Compare &amp; Pull Request</span>
                </a>
                <a
                  href={`https://github.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}#contributing`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowContribute(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors border-t border-gray-100 dark:border-gray-800"
                >
                  <HelpCircle className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  <span>Read contribution guide</span>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}



