/**
 * Frame Codex Viewer - Main orchestrator component
 * Coordinates sidebar, content, metadata panel, and state management
 * @module codex/CodexViewer
 */

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import type { GitHubFile, SidebarMode, FrameCodexViewerProps } from './types'
import { parseWikiMetadata, shouldIgnorePath, isMarkdownFile } from './utils'
import { API_ENDPOINTS, REPO_CONFIG } from './constants'
import { useGithubTree } from './hooks/useGithubTree'
import { useCodexHotkeys } from './hooks/useCodexHotkeys'
import { useBookmarks } from './hooks/useBookmarks'
import { usePreferences } from './hooks/usePreferences'
import { useSwipeGesture } from './hooks/useSwipeGesture'
import { clearAllCodexData } from '../lib/localStorage'
import { getCachedStrand, setCachedStrand } from '../lib/codexCache'
import CodexSidebar from './CodexSidebar'
import CodexContent from './CodexContent'
import CodexMetadataPanel from './CodexMetadataPanel'
import CodexToolbar from './CodexToolbar'
import MobileToggle from './ui/MobileToggle'
import BookmarksPanel from './ui/BookmarksPanel'
import PreferencesModal from './ui/PreferencesModal'
import TutorialTour from './ui/TutorialTour'
import HelpInfoPanel from './ui/HelpInfoPanel'
import MobileBottomNav from './ui/MobileBottomNav'
import KnowledgeGraphView from './ui/KnowledgeGraphView'
import TimelineView from './ui/TimelineView'
import ContributeModal from './ui/ContributeModal'
import { TUTORIALS, type TutorialId } from './tutorials'
import { useSearchFilter } from './hooks/useSearchFilter'
import { getSearchEngine } from '../lib/search/engine'
import type { CodexSearchResult } from '../lib/search/types'
import SearchResultsPanel from './ui/SearchResultsPanel'
import HighlightSelector from '../ui/HighlightSelector'
import BlockHighlighter from '../ui/BlockHighlighter'
import GroupManager from '../ui/GroupManager'
import MigrationPrompt from '../ui/MigrationPrompt'
import { useHighlights } from '../hooks/useHighlights'
import { useGroups } from '../hooks/useGroups'
import { checkMigrationStatus, migrateLocalStorageToSQL } from '../lib/migrationUtils'
import { generateDefaultGroups } from '../lib/groupGenerator'

/**
 * Main Frame Codex viewer component
 * 
 * @remarks
 * **Features:**
 * - Full-screen modal or embedded page mode
 * - Knowledge tree with hierarchical navigation
 * - Advanced search (name + full-text, case-sensitive)
 * - Markdown rendering with syntax highlighting
 * - Wiki-style internal links
 * - Metadata panel with backlinks
 * - Keyboard shortcuts (m, /, g h, s)
 * - Mobile-responsive (80vw sidebar, 56px FAB, 44px+ touch targets)
 * - Analog styling (paper texture, inner shadows)
 * - URL-based navigation with query params
 * 
 * **Architecture:**
 * - Modular: 8 components + 3 hooks + utilities
 * - Type-safe: Full TypeScript with TSDoc
 * - Accessible: ARIA labels, keyboard nav, focus management
 * - Performant: Debounced search, pagination, lazy loading
 * 
 * @example
 * ```tsx
 * // Modal mode
 * <FrameCodexViewer
 *   isOpen={modalOpen}
 *   onClose={() => setModalOpen(false)}
 *   mode="modal"
 * />
 * 
 * // Page mode
 * <FrameCodexViewer
 *   isOpen={true}
 *   mode="page"
 *   initialPath="weaves/tech"
 * />
 * ```
 */
export default function FrameCodexViewer({
  isOpen,
  onClose,
  mode = 'modal',
  initialPath = '',
}: FrameCodexViewerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // State
  const [currentPath, setCurrentPath] = useState('')
  const [files, setFiles] = useState<GitHubFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<GitHubFile | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [fileMetadata, setFileMetadata] = useState<Record<string, any>>({})
  const {
    options: searchOptions,
    setQuery: setSearchQueryInput,
    toggleSearchNames,
    toggleSearchContent,
    toggleCaseSensitive,
    filteredFiles,
    resetFilters: resetSearchFilters,
  } = useSearchFilter(files)
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('tree')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [metaOpen, setMetaOpen] = useState(true)
  const [expandedTreePaths, setExpandedTreePaths] = useState<Set<string>>(new Set())
  const [bookmarksOpen, setBookmarksOpen] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [activeTutorial, setActiveTutorial] = useState<TutorialId | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [graphOpen, setGraphOpen] = useState(false)
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [contributeOpen, setContributeOpen] = useState(false)
  const [summaryIndex, setSummaryIndex] = useState<Map<string, { summary?: string; lastIndexed?: string }>>(
    () => new Map()
  )
  const [searchResults, setSearchResults] = useState<CodexSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [semanticEnabled, setSemanticEnabled] = useState(false)
  const [semanticSupported, setSemanticSupported] = useState(false)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [groupManagerOpen, setGroupManagerOpen] = useState(false)
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false)
  const contentContainerRef = useRef<HTMLDivElement>(null)

  // Knowledge tree
  const {
    tree: knowledgeTree,
    loading: knowledgeTreeLoading,
    error: knowledgeTreeError,
    totalStrands: totalTreeStrands,
    totalWeaves: totalTreeWeaves,
    resolvedBranch,
  } = useGithubTree()
  const activeBranchRef = useRef(REPO_CONFIG.BRANCH)

  // Bookmarks and history
  const {
    bookmarks,
    history,
    isBookmarked,
    toggleBookmark,
    recordView,
    removeBookmark,
    removeFromHistory,
    clearAllBookmarks,
    clearAllHistory,
  } = useBookmarks()

  // User preferences
  const {
    preferences,
    updateTheme,
    updateFontSize,
    updateTreeDensity,
    updateDefaultSidebarMode,
    updateSidebarOpenMobile,
    updateMultiple,
    reset: resetPreferences,
  } = usePreferences()

  // Highlights management
  const {
    highlights,
    loading: highlightsLoading,
    reload: reloadHighlights,
  } = useHighlights({ filePath: selectedFile?.path })

  // Groups management
  const { groups, reload: reloadGroups } = useGroups()

  // Apply preferences
  useEffect(() => {
    setSidebarMode(preferences.defaultSidebarMode)
  }, [preferences.defaultSidebarMode])

  // Check for migration on mount
  useEffect(() => {
    const checkMigration = async () => {
      const migrationComplete = await checkMigrationStatus()
      if (!migrationComplete) {
        setShowMigrationPrompt(true)
      }
    }

    checkMigration()
  }, [])

  // Generate default groups when knowledge tree loads
  useEffect(() => {
    const initializeGroups = async () => {
      if (knowledgeTree.length > 0) {
        try {
          await generateDefaultGroups(knowledgeTree)
          await reloadGroups()
        } catch (err) {
          console.error('[CodexViewer] Failed to generate default groups:', err)
        }
      }
    }

    initializeGroups()
  }, [knowledgeTree, reloadGroups])

  // Keyboard shortcuts
  useCodexHotkeys({
    onToggleMeta: () => setMetaOpen((v) => !v),
    onFocusSearch: () => {
      const input = document.getElementById('codex-search-input') as HTMLInputElement | null
      input?.focus()
    },
    onGoHome: () => router.push('/codex'),
    onToggleSidebar: () => setSidebarOpen((v) => !v),
    onToggleBookmarks: () => setBookmarksOpen((v) => !v),
    onOpenPreferences: () => setPreferencesOpen(true),
    onToggleHelp: () => setHelpOpen((v) => !v),
    onToggleHighlights: () => setBookmarksOpen(true),
    onOpenGroupManager: () => setGroupManagerOpen(true),
  })

  // Mobile swipe gestures
  useSwipeGesture({
    onSwipeRight: () => {
      if (window.innerWidth < 768 && !sidebarOpen) {
        setSidebarOpen(true)
      }
    },
    onSwipeLeft: () => {
      if (window.innerWidth < 768) {
        if (sidebarOpen) {
          setSidebarOpen(false)
        } else if (!metaOpen) {
          setMetaOpen(true)
        }
      }
    },
    threshold: 100,
  })

  useEffect(() => {
    if (resolvedBranch && activeBranchRef.current !== resolvedBranch) {
      activeBranchRef.current = resolvedBranch
      if (REPO_CONFIG.BRANCH !== resolvedBranch) {
        REPO_CONFIG.BRANCH = resolvedBranch
      }
    }
  }, [resolvedBranch])

  /**
   * Update URL when navigation changes (page mode only)
   */
  const updateURL = useCallback(
    (path: string, file?: string) => {
      if (mode === 'page') {
        const params = new URLSearchParams()
        if (path) params.set('path', path)
        if (file) params.set('file', file)

        const newPath = `${pathname}?${params.toString()}`
        router.push(newPath, { scroll: false })
      }
    },
    [mode, pathname, router]
  )

  /**
   * Load pre-computed Codex index (codex-index.json) for extractive summaries.
   * This file is generated by the Codex auto-indexer in GitHub Actions and
   * cached in SQLite based on content hash, so we only fetch a single JSON
   * blob here and reuse it for all strands.
   */
  useEffect(() => {
    let cancelled = false

    const fetchSummaryIndex = async () => {
      try {
        const indexUrl = API_ENDPOINTS.raw('codex-index.json', activeBranchRef.current)
        const response = await fetch(indexUrl)
        if (!response.ok) {
          // 404 is expected for non-Frame codex repos or when index isn't built yet
          console.warn('Codex summary index not available:', response.statusText)
          return
        }

        const data = await response.json()
        if (!Array.isArray(data)) return

        const map = new Map<string, { summary?: string; lastIndexed?: string }>()
        data.forEach((entry: any) => {
          if (!entry || typeof entry.path !== 'string') return
          const metadata = entry.metadata || {}
          const auto = metadata.autoGenerated || {}
          map.set(entry.path, {
            summary: metadata.summary,
            lastIndexed: auto.lastIndexed,
          })
        })

        if (!cancelled) {
          setSummaryIndex(map)
        }
      } catch (err) {
        console.warn('Failed to load Codex summary index:', err)
      }
    }

    fetchSummaryIndex()

    return () => {
      cancelled = true
    }
  }, [])

  // Debounce search query for advanced ranking engines
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim())
    }, 250)
    return () => window.clearTimeout(handle)
  }, [searchQuery])

  const handleSearchQueryChange = useCallback(
    (value: string) => {
      setSearchQueryInput(value)
      setSearchQuery(value)
    },
    [setSearchQueryInput],
  )

  const handleSearchReset = useCallback(() => {
    resetSearchFilters()
    setSearchQuery('')
    setSemanticEnabled(false)
  }, [resetSearchFilters])

  // Execute BM25 / semantic search when query changes
  useEffect(() => {
    let cancelled = false
    const query = debouncedSearchQuery

    if (!query) {
      setSearchResults([])
      setSearchError(null)
      setSearchLoading(false)
      return () => {
        cancelled = true
      }
    }

    const runSearch = async () => {
      setSearchLoading(true)
      setSearchError(null)
      try {
        const engine = getSearchEngine()
        const results = await engine.search(query, {
          limit: 25,
          semantic: semanticEnabled,
        })
        if (!cancelled) {
          setSemanticSupported(engine.canUseSemantic())
          setSearchResults(results)
        }
      } catch (err) {
        console.error('Advanced search error:', err)
        if (!cancelled) {
          setSearchError('Advanced search is temporarily unavailable.')
          setSearchResults([])
          setSemanticSupported(false)
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false)
        }
      }
    }

    runSearch()

    return () => {
      cancelled = true
    }
  }, [debouncedSearchQuery, semanticEnabled])

  /**
   * Fetch directory contents from GitHub API
   */
  const fetchContents = useCallback(
    async (path: string = '') => {
      setLoading(true)
      setError(null)
      const branchCandidates = Array.from(
        new Set(
          [resolvedBranch, activeBranchRef.current, 'master', 'main', REPO_CONFIG.BRANCH].filter(
            (value): value is string => Boolean(value && value.length)
          )
        )
      )
      let lastError: Error | null = null

      try {
        for (const branch of branchCandidates) {
          try {
            const response = await fetch(API_ENDPOINTS.contents(path, branch))
            if (!response.ok) {
              throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
            }

            const data = await response.json()
            const filtered = data.filter((item: GitHubFile) => !shouldIgnorePath(item.name))
            const sortedData = filtered.sort((a: GitHubFile, b: GitHubFile) => {
              if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
              return a.name.localeCompare(b.name)
            })

            setFiles(sortedData)
            setCurrentPath(path)
            updateURL(path)
            if (branch && branch !== REPO_CONFIG.BRANCH) {
              REPO_CONFIG.BRANCH = branch
            }
            if (activeBranchRef.current !== branch) {
              activeBranchRef.current = branch
            }
            return
          } catch (err) {
            lastError = err instanceof Error ? err : new Error('Failed to fetch repository contents')
          }
        }

        throw lastError ?? new Error('Failed to fetch repository contents')
      } catch (err) {
        console.error('Error fetching contents:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch repository contents')
      } finally {
        setLoading(false)
      }
    },
    [resolvedBranch, updateURL]
  )

  /**
   * Fetch file content from GitHub with optional SQL-backed cache.
   */
  const fetchFileContent = useCallback(
    async (file: GitHubFile) => {
      if (file.type !== 'file' || !file.download_url) return

      setLoading(true)
      setError(null)

      try {
        const cacheKey = file.path

        // Try cache first for instant load on repeat views.
        const cached = await getCachedStrand(cacheKey)
        let content = cached || ''

        if (!cached) {
          const response = await fetch(file.download_url)
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`)
          }

          content = await response.text()
          // Store in SQL-backed cache (IndexedDB/sql.js in browser, memory in SSR)
          await setCachedStrand(cacheKey, content)
        }

        setFileContent(content)
        setSelectedFile(file)

        // Parse metadata
        if (isMarkdownFile(file.name)) {
          const metadata = parseWikiMetadata(content)
          setFileMetadata(metadata)
        }

        // Record view in history
        recordView(file.path, file.name)

        updateURL(currentPath, file.path)
      } catch (err) {
        console.error('Error fetching file content:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch file content')
      } finally {
        setLoading(false)
      }
    },
    [currentPath, updateURL]
  )

  /**
   * Handle file/directory click
   */
  const handleFileClick = (file: GitHubFile) => {
    if (file.type === 'dir') {
      fetchContents(file.path)
    } else {
      fetchFileContent(file)
    }
  }

  /**
   * Toggle tree path expansion
   */
  const toggleTreePath = (path: string) => {
    setExpandedTreePaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  /**
   * Open file from knowledge tree
   */
  const openFileFromTree = useCallback(
    async (fullPath: string) => {
      const normalizedPath = fullPath.replace(/^\/+/, '')
      const segments = normalizedPath.split('/')
      const fileName = segments.pop() || normalizedPath
      const parentDir = segments.join('/')

      const filePayload: GitHubFile = {
        name: fileName,
        path: normalizedPath,
        type: 'file',
        sha: '',
        url: '',
        html_url: `https://github.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/blob/${REPO_CONFIG.BRANCH}/${normalizedPath}`,
        download_url: API_ENDPOINTS.raw(normalizedPath, activeBranchRef.current),
      }

      if (parentDir !== currentPath) {
        await fetchContents(parentDir)
      }

      await fetchFileContent(filePayload)

      // Auto-close sidebar on mobile
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      }
    },
    [currentPath, fetchContents, fetchFileContent]
  )

  const handleOpenSearchResult = useCallback(
    (fullPath: string) => {
      openFileFromTree(fullPath)
    },
    [openFileFromTree],
  )

  // Load from URL params on mount
  useEffect(() => {
    if (isOpen && mode === 'page') {
      const path = searchParams.get('path') || initialPath || ''
      const file = searchParams.get('file')

      fetchContents(path).then(() => {
        if (file) {
          const targetFile = files.find((f) => f.path === file)
          if (targetFile) {
            fetchFileContent(targetFile)
          }
        }
      })
    } else if (isOpen) {
      fetchContents(initialPath)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode])

  const isModal = mode === 'modal'

  if (!isOpen && isModal) return null

  const currentSummary =
    selectedFile && summaryIndex.size > 0 ? summaryIndex.get(selectedFile.path) ?? null : null
  const activeSearchQuery = searchQuery.trim()

  const content = (
    <div className="frame-codex-viewer flex-1 flex overflow-hidden">
      {/* Mobile Toggle Button */}
      <MobileToggle isOpen={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />

      {/* Sidebar */}
      <CodexSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentPath={currentPath}
        files={files}
        filteredFiles={filteredFiles}
        selectedFile={selectedFile}
        onFileClick={handleFileClick}
        onNavigate={fetchContents}
        mode={sidebarMode}
        onModeChange={setSidebarMode}
        knowledgeTree={knowledgeTree}
        knowledgeTreeLoading={knowledgeTreeLoading}
        knowledgeTreeError={knowledgeTreeError}
        totalTreeStrands={totalTreeStrands}
        totalTreeWeaves={totalTreeWeaves}
        expandedTreePaths={expandedTreePaths}
        onToggleTreePath={toggleTreePath}
        onOpenFileFromTree={openFileFromTree}
        loading={loading}
        error={error}
        searchOptions={searchOptions}
        onSearchQueryChange={handleSearchQueryChange}
        onToggleSearchNames={toggleSearchNames}
        onToggleSearchContent={toggleSearchContent}
        onToggleCaseSensitive={toggleCaseSensitive}
        onResetSearch={handleSearchReset}
        onOpenHelp={() => setHelpOpen(true)}
      />

      {/* Main content area with toolbar and content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <CodexToolbar
            currentPath={currentPath}
            metaOpen={metaOpen}
            onToggleMeta={() => setMetaOpen((v) => !v)}
            currentFile={selectedFile ? { path: selectedFile.path, name: selectedFile.name } : null}
            isBookmarked={selectedFile ? isBookmarked(selectedFile.path) : false}
            onToggleBookmark={selectedFile ? () => toggleBookmark(selectedFile.path, selectedFile.name) : undefined}
            onOpenBookmarks={() => setBookmarksOpen(true)}
            onOpenPreferences={() => setPreferencesOpen(true)}
            onOpenHelp={() => setHelpOpen(true)}
            onOpenGraph={() => setGraphOpen(true)}
            onOpenTimeline={() => setTimelineOpen(true)}
            onOpenContribute={() => setContributeOpen(true)}
          />
        </div>
        {activeSearchQuery.length > 0 && (
          <SearchResultsPanel
            query={activeSearchQuery}
            results={searchResults}
            loading={searchLoading}
            error={searchError}
            semanticEnabled={semanticEnabled}
            semanticSupported={semanticSupported}
            onToggleSemantic={setSemanticEnabled}
            onSelectResult={handleOpenSearchResult}
            onClear={handleSearchReset}
          />
        )}

        {/* Content Area */}
        <div ref={contentContainerRef} className="flex-1 overflow-auto">
          <CodexContent
            file={selectedFile}
            content={fileContent}
            metadata={fileMetadata}
            loading={loading}
            currentPath={currentPath}
            onNavigate={fetchContents}
            onFetchFile={fetchFileContent}
            pathname={pathname}
          />

          {/* Highlight Selection Components */}
          {selectedFile && contentContainerRef.current && (
            <>
              <HighlightSelector
                filePath={selectedFile.path}
                containerRef={contentContainerRef}
                onHighlightCreated={(id) => {
                  reloadHighlights()
                  console.log('[CodexViewer] Highlight created:', id)
                }}
              />
              <BlockHighlighter
                filePath={selectedFile.path}
                containerRef={contentContainerRef}
                onHighlightCreated={(id) => {
                  reloadHighlights()
                  console.log('[CodexViewer] Block highlight created:', id)
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Metadata Panel */}
      <CodexMetadataPanel
        isOpen={metaOpen}
        onClose={() => setMetaOpen(false)}
        metadata={fileMetadata}
        currentFile={selectedFile}
        allFiles={files}
        summaryInfo={currentSummary || undefined}
      />

      {/* Bookmarks Panel */}
      <BookmarksPanel
        isOpen={bookmarksOpen}
        onClose={() => setBookmarksOpen(false)}
        bookmarks={bookmarks}
        history={history}
        onNavigate={openFileFromTree}
        onRemoveBookmark={removeBookmark}
        onRemoveHistory={removeFromHistory}
        onClearBookmarks={clearAllBookmarks}
        onClearHistory={clearAllHistory}
      />

      {/* Preferences Modal */}
      <PreferencesModal
        isOpen={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
        preferences={preferences}
        onThemeChange={updateTheme}
        onFontSizeChange={updateFontSize}
        onTreeDensityChange={updateTreeDensity}
        onSidebarModeChange={updateDefaultSidebarMode}
        onSidebarOpenMobileChange={updateSidebarOpenMobile}
        onReset={resetPreferences}
        onClearAll={() => {
          clearAllCodexData()
          setPreferencesOpen(false)
        }}
      />

      {/* Tutorial Tour */}
      {activeTutorial && (
        <TutorialTour
          tourId={TUTORIALS[activeTutorial].id}
          title={TUTORIALS[activeTutorial].title}
          steps={TUTORIALS[activeTutorial].steps}
          isActive={!!activeTutorial}
          onComplete={() => setActiveTutorial(null)}
          onSkip={() => setActiveTutorial(null)}
        />
      )}

      {/* Help/Info Panel */}
      <HelpInfoPanel isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Knowledge Graph View */}
      {graphOpen && (
        <KnowledgeGraphView
          tree={knowledgeTree}
          selectedPath={selectedFile?.path}
          onNavigate={openFileFromTree}
          onClose={() => setGraphOpen(false)}
        />
      )}

      {/* Timeline View */}
      {timelineOpen && (
        <TimelineView
          history={history}
          onNavigate={openFileFromTree}
          onClose={() => setTimelineOpen(false)}
        />
      )}

      {/* Contribute Modal */}
      <ContributeModal
        isOpen={contributeOpen}
        onClose={() => setContributeOpen(false)}
        currentPath={currentPath}
      />

      {/* Group Manager */}
      <GroupManager
        isOpen={groupManagerOpen}
        onClose={() => setGroupManagerOpen(false)}
      />

      {/* Migration Prompt */}
      <MigrationPrompt
        isOpen={showMigrationPrompt}
        onClose={() => setShowMigrationPrompt(false)}
        onMigrationComplete={async () => {
          setShowMigrationPrompt(false)
          await reloadGroups()
          await reloadHighlights()
        }}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={selectedFile ? 'home' : undefined}
        onHome={() => {
          router.push('/codex')
          setSidebarOpen(false)
        }}
        onSearch={() => {
          const input = document.getElementById('codex-search-input') as HTMLInputElement | null
          input?.focus()
          setSidebarOpen(true)
        }}
        onBookmarks={() => {
          setBookmarksOpen(true)
          setSidebarOpen(false)
        }}
        onSettings={() => {
          setPreferencesOpen(true)
          setSidebarOpen(false)
        }}
      />
    </div>
  )

  // Modal mode
  if (isModal) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 dark:bg-black/80 z-[60] backdrop-blur-md"
              onClick={onClose}
            />

            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-7xl h-[90vh] bg-white dark:bg-gray-950 rounded-2xl overflow-hidden shadow-2xl flex"
              >
                {content}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    )
  }

  // Page mode
  return <div className="w-full h-screen flex flex-col md:flex-row pb-20 md:pb-0">{content}</div>
}



