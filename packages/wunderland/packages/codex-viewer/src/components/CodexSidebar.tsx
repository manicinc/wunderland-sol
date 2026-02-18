/**
 * Sidebar component for Frame Codex viewer
 * Displays file tree, knowledge tree, breadcrumbs, and search
 * @module codex/CodexSidebar
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Home, ChevronRight, Loader2, ExternalLink, FileText, GitBranch, X, Moon, Sun, LifeBuoy } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import type { GitHubFile, KnowledgeTreeNode, SidebarMode, SearchOptions } from './types'
import { LEVEL_STYLES, REPO_CONFIG, PAGINATION } from './constants'
import { formatNodeName } from './utils'
import SearchBar from './ui/SearchBar'

interface CodexSidebarProps {
  /** Whether sidebar is open (mobile) */
  isOpen: boolean
  /** Close sidebar callback (mobile) */
  onClose: () => void
  /** Current directory path */
  currentPath: string
  /** Files in current directory */
  files: GitHubFile[]
  /** Currently selected file */
  selectedFile: GitHubFile | null
  /** File click handler */
  onFileClick: (file: GitHubFile) => void
  /** Navigate to directory */
  onNavigate: (path: string) => void
  /** Sidebar display mode */
  mode: SidebarMode
  /** Change sidebar mode */
  onModeChange: (mode: SidebarMode) => void
  /** Knowledge tree data */
  knowledgeTree: KnowledgeTreeNode[]
  /** Knowledge tree loading state */
  knowledgeTreeLoading: boolean
  /** Knowledge tree error */
  knowledgeTreeError: string | null
  /** Total strands in tree */
  totalTreeStrands: number
  /** Total weaves in tree */
  totalTreeWeaves: number
  /** Expanded tree paths */
  expandedTreePaths: Set<string>
  /** Toggle tree path */
  onToggleTreePath: (path: string) => void
  /** Open file from tree */
  onOpenFileFromTree: (path: string) => void
  /** Loading state */
  loading: boolean
  /** Error state */
  error: string | null
  /** Filtered files after search */
  filteredFiles: GitHubFile[]
  /** Current search options */
  searchOptions: SearchOptions
  /** Search query change handler */
  onSearchQueryChange: (query: string) => void
  /** Toggle searching file names */
  onToggleSearchNames: () => void
  /** Toggle full-text search */
  onToggleSearchContent: () => void
  /** Toggle case sensitivity */
  onToggleCaseSensitive: () => void
  /** Reset search filters */
  onResetSearch: () => void
  /** Open help panel */
  onOpenHelp: () => void
}

/**
 * Sidebar component with file browser and knowledge tree
 * 
 * @remarks
 * - Responsive: Slides in/out on mobile, fixed on desktop
 * - Two modes: Outline (current directory) and Tree (full hierarchy)
 * - Advanced search with filters
 * - Breadcrumb navigation
 * - Pagination for large directories
 * - Touch-optimized (44px+ targets)
 * 
 * @example
 * ```tsx
 * <CodexSidebar
 *   isOpen={sidebarOpen}
 *   onClose={() => setSidebarOpen(false)}
 *   currentPath="weaves/tech"
 *   files={files}
 *   selectedFile={selectedFile}
 *   onFileClick={handleFileClick}
 *   onNavigate={navigate}
 *   mode="tree"
 *   onModeChange={setMode}
 *   knowledgeTree={tree}
 *   // ... other props
 * />
 * ```
 */
export default function CodexSidebar({
  isOpen,
  onClose,
  currentPath,
  files,
  filteredFiles,
  selectedFile,
  onFileClick,
  onNavigate,
  mode,
  onModeChange,
  knowledgeTree,
  knowledgeTreeLoading,
  knowledgeTreeError,
  totalTreeStrands,
  totalTreeWeaves,
  expandedTreePaths,
  onToggleTreePath,
  onOpenFileFromTree,
  loading,
  error,
  searchOptions,
  onSearchQueryChange,
  onToggleSearchNames,
  onToggleSearchContent,
  onToggleCaseSensitive,
  onResetSearch,
  onOpenHelp,
}: CodexSidebarProps) {
  const { theme, setTheme } = useTheme()
  
  // Pagination
  const [displayLimit, setDisplayLimit] = useState<number>(PAGINATION.INITIAL_LIMIT)
  const displayedFiles = filteredFiles.slice(0, displayLimit)
  const hasMore = filteredFiles.length > displayLimit

  useEffect(() => {
    setDisplayLimit(PAGINATION.INITIAL_LIMIT)
  }, [filteredFiles])

  /**
   * Render a single tree node recursively
   */
  const renderTreeNode = (node: KnowledgeTreeNode, depth = 0): React.ReactNode => {
    const isDir = node.type === 'dir'
    const isExpanded = expandedTreePaths.has(node.path)
    const isSelected = selectedFile?.path === node.path
    const levelStyle = LEVEL_STYLES[node.level] ?? LEVEL_STYLES.folder
    const LevelIcon = levelStyle.icon

    return (
      <div key={node.path} className="space-y-1">
        <div className={`relative ${depth > 0 ? 'pl-5' : ''}`}>
          {/* Connecting line for nested items */}
          {depth > 0 && (
            <span
              className="pointer-events-none absolute left-1 top-0 bottom-0 border-l border-dashed border-gray-200 dark:border-gray-700"
              aria-hidden
            />
          )}

          <button
            onClick={() => (isDir ? onToggleTreePath(node.path) : onOpenFileFromTree(node.path))}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all touch-manipulation min-h-[48px] ${
              isSelected
                ? 'bg-gray-200 dark:bg-gray-700 border-2 border-gray-400 dark:border-gray-500 shadow-inner'
                : 'hover:bg-gray-200/70 dark:hover:bg-gray-800/60 active:bg-gray-300/70 dark:active:bg-gray-700/60'
            }`}
            aria-expanded={isDir ? isExpanded : undefined}
          >
            {/* Icon + Name */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {isDir ? (
                <ChevronRight
                  className={`w-4 h-4 flex-shrink-0 text-gray-500 transition-transform ${
                    isExpanded ? 'rotate-90 text-gray-700 dark:text-gray-300' : ''
                  }`}
                />
              ) : LevelIcon ? (
                <LevelIcon className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
              )}
              <span className="text-sm font-medium truncate capitalize text-gray-800 dark:text-gray-100">
                {formatNodeName(node.name)}
              </span>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isDir && node.strandCount > 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                  {node.strandCount}
                </span>
              )}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${levelStyle.className}`}>
                {levelStyle.label}
              </span>
            </div>
          </button>
        </div>

        {/* Children */}
        {isDir && isExpanded && node.children && node.children.length > 0 && (
          <div className="ml-4 border-l border-dashed border-gray-200 dark:border-gray-700 pl-3 space-y-1">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  /**
   * Render knowledge tree view
   */
  const renderKnowledgeTree = () => {
    if (knowledgeTreeLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      )
    }

    if (knowledgeTreeError) {
      return (
        <div className="text-xs text-red-600 dark:text-red-400 p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
          {knowledgeTreeError}
        </div>
      )
    }

    if (knowledgeTree.length === 0) {
      return (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-8">
          Knowledge tree is still indexing…
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {/* Stats Card */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/40 p-4 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
                Knowledge Tree
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {totalTreeStrands.toLocaleString()} strands
              </p>
            </div>
            <div className="ml-auto flex flex-col text-right">
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Weaves</span>
              <span className="text-base font-semibold text-gray-900 dark:text-white">{totalTreeWeaves}</span>
            </div>
          </div>
        </div>

        {/* Tree Nodes */}
        <div className="space-y-2">{knowledgeTree.map((node) => renderTreeNode(node))}</div>
      </div>
    )
  }

  /**
   * Render outline (current directory) view
   */
  const renderOutlineList = () => {
    if (loading && files.length === 0) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      )
    }

    if (error) {
      return <div className="text-red-600 dark:text-red-400 text-sm p-4">{error}</div>
    }

    if (displayedFiles.length === 0) {
      return (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
          {searchOptions.query ? 'No files found' : 'No files in this directory'}
        </div>
      )
    }

    return (
      <>
        {displayedFiles.map((file) => {
          const depth = file.path.split('/').length - (file.type === 'dir' ? 0 : 1)
          const paddingLeft = depth * 16 + 12
          const isDir = file.type === 'dir'
          const cleanName = formatNodeName(file.name)

          return (
            <motion.button
              key={file.sha}
              onClick={() => {
                onFileClick(file)
                // Auto-close sidebar on mobile
                if (window.innerWidth < 768) {
                  onClose()
                }
              }}
              style={{ paddingLeft: `${paddingLeft}px` }}
              className={`w-full text-left py-3 pr-3 rounded-lg flex items-center gap-3 hover:bg-gray-200 dark:hover:bg-gray-800 active:bg-gray-300 dark:active:bg-gray-700 transition-colors touch-manipulation min-h-[48px] ${
                selectedFile?.path === file.path
                  ? 'bg-gray-200 dark:bg-gray-700 border-2 border-gray-400 dark:border-gray-500 shadow-inner'
                  : ''
              }`}
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2 }}
            >
              {/* Icon */}
              {isDir ? (
                <svg
                  className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
              )}
              <span
                className={`text-sm flex-1 ${
                  isDir
                    ? 'font-semibold tracking-wide uppercase text-gray-800 dark:text-gray-100'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {cleanName}
              </span>
            </motion.button>
          )
        })}

        {/* Load More */}
        {hasMore && (
          <button
            onClick={() => setDisplayLimit((prev) => prev + PAGINATION.LOAD_MORE_INCREMENT)}
            className="w-full mt-4 p-3 text-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-300 dark:border-gray-700"
          >
            Load more ({filteredFiles.length - displayLimit} remaining)
          </button>
        )}
      </>
    )
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <div
        className={`
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          fixed md:relative
          inset-y-0 left-0
          w-[74vw] sm:w-[280px] md:w-72 lg:w-80
          max-w-[360px]
          bg-gray-50 dark:bg-gray-900 
          md:border-r border-gray-200 dark:border-gray-800 
          flex flex-col flex-shrink-0
          transition-transform duration-300 ease-in-out
          z-40
          shadow-2xl md:shadow-none
          overflow-hidden
        `}
      >
        {/* Header */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          {/* Frame.dev Link */}
          <Link
            href="https://frame.dev"
            className="flex items-center gap-2 mb-3 p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors group"
          >
            <Image
              src="/frame-logo-no-subtitle.svg"
              alt="Frame.dev"
              width={20}
              height={20}
              className="flex-shrink-0 dark:invert"
            />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
              Back to Frame.dev
            </span>
            <ExternalLink className="w-3 h-3 text-gray-400 ml-auto" />
          </Link>

          <div className="flex items-center justify-between">
            {/* Codex Logo */}
            <div className="flex items-center gap-2">
              {/* Animated Book Icon */}
              <motion.svg
                className="w-5 h-5 text-gray-800 dark:text-gray-200 flex-shrink-0"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Codex Book"
              >
                <motion.rect
                  x="6"
                  y="6"
                  rx="3"
                  ry="3"
                  width="18"
                  height="36"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: [0.9, 0.7, 0.9] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.g
                  transform="translate(18,6)"
                  style={{ transformOrigin: '24px 24px' }}
                  animate={{ rotateY: [0, 25, 0] }}
                  transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
                >
                  <rect x="0" y="0" width="18" height="36" rx="2" ry="2" fill="currentColor" opacity="0.06" />
                  <g stroke="currentColor" strokeWidth="1" opacity="0.35">
                    <line x1="3" y1="6" x2="15" y2="6" />
                    <line x1="3" y1="12" x2="15" y2="12" />
                    <line x1="3" y1="18" x2="15" y2="18" />
                    <line x1="3" y1="24" x2="15" y2="24" />
                    <line x1="3" y1="30" x2="15" y2="30" />
                  </g>
                  <motion.path
                    d="M2 4 C8 6, 12 6, 16 4 L16 32 C12 34, 8 34, 2 32 Z"
                    fill="currentColor"
                    opacity="0.10"
                    animate={{ opacity: [0.1, 0.25, 0.1] }}
                    transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
                  />
                </motion.g>
                <motion.path
                  d="M11 8 L15 8 L15 20 L13 18 L11 20 Z"
                  fill="currentColor"
                  opacity="0.35"
                  animate={{ y: [0, 1.5, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.svg>
              <h2 className="text-sm font-bold tracking-wider text-gray-800 dark:text-gray-200">
                Codex
              </h2>
            </div>
            <div className="flex items-center gap-1">
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Toggle theme"
                title="Toggle dark/light mode"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-500" />
                ) : (
                  <Moon className="w-4 h-4 text-gray-700" />
                )}
              </button>
              {/* Close (Mobile) */}
              <button
                onClick={onClose}
                className="md:hidden p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          {/* Search Bar */}
          <div className="mt-3">

            {/* Search Bar */}
            <SearchBar
              options={searchOptions}
              onQueryChange={onSearchQueryChange}
              onToggleSearchNames={onToggleSearchNames}
              onToggleSearchContent={onToggleSearchContent}
              onToggleCaseSensitive={onToggleCaseSensitive}
              onReset={onResetSearch}
              inputId="codex-search-input"
              placeholder="Search knowledge..."
            />
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="px-4 py-3 bg-gray-100 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <div className="flex items-center gap-1 text-sm whitespace-nowrap">
            <button
              onClick={() => onNavigate('')}
              className="flex items-center gap-1 hover:text-cyan-600 dark:hover:text-cyan-400 active:text-cyan-700 dark:active:text-cyan-300 font-medium touch-manipulation min-h-[44px] px-2"
            >
              <Home className="w-4 h-4 flex-shrink-0" />
              <span>Codex</span>
            </button>
            {currentPath && (
              <>
                {currentPath.split('/').map((part, index, arr) => (
                  <>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <button
                      onClick={() => onNavigate(arr.slice(0, index + 1).join('/'))}
                      className="hover:text-cyan-600 dark:hover:text-cyan-400 active:text-cyan-700 dark:active:text-cyan-300 dark:text-gray-300 font-medium touch-manipulation min-h-[44px] px-2"
                    >
                      {part}
                    </button>
                  </>
                ))}
              </>
            )}
          </div>
        </div>

        {/* View Toggle */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/75 dark:bg-gray-900/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-gray-500 dark:text-gray-400">
                Navigation Mode
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Outline view or full Knowledge Tree with strand counts.
              </p>
            </div>
            <div className="inline-flex rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1 shadow-sm">
              <button
                onClick={() => onModeChange('tree')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                  mode === 'tree'
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Tree
              </button>
              <button
                onClick={() => onModeChange('toc')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                  mode === 'toc'
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Outline
              </button>
            </div>
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 overscroll-contain">
          {mode === 'tree' ? renderKnowledgeTree() : renderOutlineList()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 space-y-3">
          <button
            onClick={() => {
              onOpenHelp()
              if (window.innerWidth < 768) {
                onClose()
              }
            }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-[11px] font-semibold text-gray-700 dark:text-gray-200 py-2 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors"
          >
            <LifeBuoy className="w-4 h-4" />
            Tutorials & Help
          </button>
          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
            <span>{files.length} items</span>
            <a
              href={`https://github.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-cyan-600 dark:hover:text-cyan-400"
            >
              View on GitHub
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </>
  )
}



