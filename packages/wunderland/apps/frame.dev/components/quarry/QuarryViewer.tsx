/**
 * Quarry Codex Viewer - Main orchestrator component
 * Coordinates sidebar, content, metadata panel, and state management
 * @module codex/QuarryViewer
 */

'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Info, FileText, X, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import type { GitHubFile, SidebarMode, QuarryQuarryViewerProps, StrandMetadata, TagsIndex, TagIndexEntry } from './types'
import type { MoveOperation, DeleteOperation } from './tree/types'
import { parseWikiMetadata, shouldIgnorePath, isMarkdownFile } from './utils'
import { API_ENDPOINTS, REPO_CONFIG } from './constants'
import { useContentTree } from './hooks/useContentTree'
import { useCodexHotkeys } from './hooks/useCodexHotkeys'
import { useBookmarks } from './hooks/useBookmarks'
import { useCollections } from '@/lib/collections'
import { useHighlights } from './hooks/useHighlights'
import { usePreferences } from './hooks/usePreferences'
import { useBlockLevelShortcuts } from '@/lib/hooks/useBlockLevelShortcuts'
import { useBlockTags } from '@/lib/hooks/useBlockTags'
import { useSwipeGesture } from './hooks/useSwipeGesture'
import { useTextToSpeech } from './hooks/useTextToSpeech'
import { useMediaStorage } from './hooks/useMediaStorage'
import { clearAllCodexData, getLastViewedLocation, saveLastViewedLocation } from '@/lib/localStorage'
import { saveStrandMetadata, type SaveResult } from '@/lib/content/saveStrandMetadata'
import { reindexStrandMetadata } from '@/lib/jobs/reindexStrand'
import { getVocabularyService, type ClassificationResult } from '@/lib/indexer/vocabularyService'
import { getCachedStrand, setCachedStrand } from '@/lib/codexCache'
import { getContentStore } from '@/lib/content/sqliteStore'
import { getDailyFacts, type StudyStats } from '@/lib/codex/facts'
import { getOrCreateDailyNote, getTodayKey } from '@/lib/dailyNotes'
import { formatVoiceNote, formatImageNote } from '@/lib/media/formatVoiceNote'
import { useFeatureFlags } from '@/lib/config/featureFlags'
import QuarrySidebar from './QuarrySidebar'
import QuarryContent from './QuarryContent'
import QuarryMetadataPanel from './QuarryMetadataPanel'
import QuarryToolbar from './QuarryToolbar'
import { QuarryUnifiedHeader } from './ui/header'
// MobileToggle replaced with centered inline button
import MetadataToggleFAB from './ui/misc/MetadataToggleFAB'
import MediaCaptureFAB from './ui/media/MediaCaptureFAB'
import type { MediaAsset } from './ui/misc/RadialMediaMenu'
import SidebarCollapseToggle from './ui/sidebar/SidebarCollapseToggle'
import BookmarksPanel from './ui/bookmarks/BookmarksPanel'
import QuarrySettingsModal, { type SettingsTab } from './ui/quarry-core/QuarrySettingsModal'
import TutorialTour from './ui/misc/TutorialTour'
import HelpInfoPanel from './ui/help/HelpInfoPanel'
import MobileBottomNav from './ui/mobile/MobileBottomNav'
import QuarryBrand from './ui/quarry-core/QuarryBrand'
import dynamic from 'next/dynamic'

// Lazy load heavy components for better initial load performance
const KnowledgeGraphView = dynamic(() => import('./ui/graphs/KnowledgeGraphView'), { ssr: false })
const FabricGraphView = dynamic(() => import('./ui/graphs/FabricGraphView'), { ssr: false })
const TimelineView = dynamic(() => import('./ui/misc/TimelineView'), { ssr: false })
const ContributeModal = dynamic(() => import('./ui/misc/ContributeModal'), { ssr: false })
const ApiStatusBanner = dynamic(() => import('./ui/api/ApiStatusBanner'), { ssr: false })
// SettingsModal is now consolidated into QuarrySettingsModal
const StrandEditor = dynamic(() => import('./ui/strands/StrandEditor'), { ssr: false })
const UnifiedAskInterface = dynamic(() => import('./ui/qa/UnifiedAskInterface'), { ssr: false })
const FlashcardQuizPopover = dynamic(() => import('./ui/flashcards/FlashcardQuizPopover'), { ssr: false })
const GlossaryPopover = dynamic(() => import('./ui/glossary/GlossaryPopover'), { ssr: false })
const QuizPopover = dynamic(() => import('./ui/quiz/QuizPopover'), { ssr: false })
const ResearchPopover = dynamic(() => import('./ui/research/ResearchPopover'), { ssr: false })
const StrandMindMap = dynamic(() => import('./ui/strands/StrandMindMap'), { ssr: false })
const QuickTagPopover = dynamic(() => import('./ui/quick-actions/QuickTagPopover'), { ssr: false })
const KeyboardShortcutsModal = dynamic(() => import('./ui/keyboard/KeyboardShortcutsModal'), { ssr: false })
const MovePublishModal = dynamic(() => import('./ui/misc/MovePublishModal'), { ssr: false })
const SupertagDesignerModal = dynamic(() => import('./ui/supertags/SupertagDesignerModal'), { ssr: false })
const ShareHtmlModal = dynamic(() => import('./ui/export/ShareHtmlModal'), { ssr: false })
import { PendingMovesBadge } from './ui/misc/MovePublishModal'
import TreeStatusBar from './ui/status/TreeStatusBar'
import { StrandTabBar } from './ui/tabs'
import { useOpenTabsSafe, useActiveTab } from './contexts/OpenTabsContext'
import { useTreePersistence } from '@/lib/planner/hooks/useTreePersistence'
import { processMoveOperations, queueMoveProcessing } from '@/lib/nlp/moveProcessor'
import { batchMoveVaultItems, getStoredVaultHandle } from '@/lib/vault'
import { TUTORIALS, type TutorialId } from './tutorials'
import { useSearchFilter } from './hooks/useSearchFilter'
import { useResponsiveLayout, Z_INDEX } from './hooks/useResponsiveLayout'
import { getSearchEngine } from '@/lib/search/engine'
import type { CodexSearchResult } from '@/lib/search/types'
import SearchResultsPanel from './ui/search/SearchResultsPanel'
import { useDateIndex } from './hooks/useDateIndex'
import { useTreeSelection } from './hooks/useTreeSelection'
import { useJobQueue, JOB_TYPE_LABELS } from './hooks/useJobQueue'
import { useToast } from './ui/common/Toast'
import { pluginEvents, setViewerHooks, clearViewerHooks, pluginUIRegistry } from '@/lib/plugins/QuarryPluginAPI'
import { quarryPluginManager } from '@/lib/plugins/QuarryPluginManager'
import type { ContentSource } from '@/lib/content/types'
import { isElectronWithVault, getElectronVaultStatus } from '@/lib/vault/electronVault'
import { isElectronMac, isElectron } from '@/lib/electron'

// Lazy load JobStatusPanel
const JobStatusPanel = dynamic(() => import('./ui/status/JobStatusPanel'), { ssr: false })

// Lazy load QuarryWelcomeStats for home page
const QuarryWelcomeStats = dynamic(() => import('./ui/quarry-core/QuarryWelcomeStats'), { ssr: false })

// Lazy load FullView components for different views
const PlannerFullView = dynamic(() => import('./ui/planner/PlannerFullView'), { ssr: false })
const SearchFullView = dynamic(() => import('./ui/search/SearchFullView'), { ssr: false })
const ResearchFullView = dynamic(() => import('./ui/research/ResearchFullView'), { ssr: false })
const NewFullView = dynamic(() => import('./ui/misc/NewFullView'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-500">Loading strand creator...</p>
      </div>
    </div>
  )
})
const AnalyticsFullView = dynamic(() => import('./ui/analytics/AnalyticsFullView'), { ssr: false })
const BrowseFullView = dynamic(() => import('./ui/browse/BrowseFullView'), { ssr: false })
const TagsFullView = dynamic(() => import('./ui/tags/TagsFullView'), { ssr: false })

type SummaryIndexEntry = {
  path?: string
  metadata?: {
    summary?: string
    tags?: string | string[]
    taxonomy?: {
      subjects?: string[]
      topics?: string[]
    }
    autoGenerated?: {
      lastIndexed?: string
    }
  }
}

// Cache for auto-classification results to avoid re-running on the same content
const classificationCache = new Map<string, { subjects: string[]; topics: string[]; tags: string[] }>()

/**
 * Auto-classify content and return hierarchical taxonomy with no duplicates.
 * Hierarchy: subjects (highest) > topics > tags (lowest)
 * Terms appearing in a higher level are removed from lower levels.
 */
async function autoClassifyContent(
  content: string,
  existingSubjects: string[] = [],
  existingTopics: string[] = [],
  existingTags: string[] = []
): Promise<{ subjects: string[]; topics: string[]; tags: string[] }> {
  // Generate cache key from content hash
  const cacheKey = content.slice(0, 500) + content.length
  const cached = classificationCache.get(cacheKey)
  if (cached) return cached

  try {
    const vocabService = getVocabularyService()
    await vocabService.initialize()

    const classification = await vocabService.classify(content)

    // Start with existing values (from frontmatter)
    const subjectsSet = new Set(existingSubjects.map(s => s.toLowerCase()))
    const topicsSet = new Set(existingTopics.map(t => t.toLowerCase()))
    const tagsSet = new Set(existingTags.map(t => t.toLowerCase()))

    // Add classified subjects (highest level)
    classification.subjects.forEach((s: string) => subjectsSet.add(s.toLowerCase()))

    // Add classified topics, but exclude those already in subjects
    classification.topics.forEach((t: string) => {
      const lower = t.toLowerCase()
      if (!subjectsSet.has(lower)) {
        topicsSet.add(lower)
      }
    })

    // Add classified tags, but exclude those in subjects or topics
    classification.tags.forEach((t: string) => {
      const lower = t.toLowerCase()
      if (!subjectsSet.has(lower) && !topicsSet.has(lower)) {
        tagsSet.add(lower)
      }
    })

    // Also add skills as tags (they're specific technologies)
    classification.skills.forEach((s: string) => {
      const lower = s.toLowerCase()
      if (!subjectsSet.has(lower) && !topicsSet.has(lower)) {
        tagsSet.add(lower)
      }
    })

    const result = {
      subjects: Array.from(subjectsSet),
      topics: Array.from(topicsSet),
      tags: Array.from(tagsSet),
    }

    // Cache the result
    classificationCache.set(cacheKey, result)

    // Limit cache size
    if (classificationCache.size > 100) {
      const firstKey = classificationCache.keys().next().value
      if (firstKey) classificationCache.delete(firstKey)
    }

    return result
  } catch (error) {
    console.warn('[QuarryViewer] Auto-classification failed:', error)
    return { subjects: existingSubjects, topics: existingTopics, tags: existingTags }
  }
}

/**
 * Main Quarry Codex viewer component
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
 * <QuarryQuarryViewer
 *   isOpen={modalOpen}
 *   onClose={() => setModalOpen(false)}
 *   mode="modal"
 * />
 *
 * // Page mode
 * <QuarryQuarryViewer
 *   isOpen={true}
 *   mode="page"
 *   initialPath="weaves/tech"
 * />
 * ```
 */
export default function QuarryQuarryViewer({
  isOpen,
  onClose,
  mode = 'modal',
  initialPath = '',
  initialFile = null,
  initialView = 'document',
}: QuarryQuarryViewerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const {
    preferences,
    updateTheme,
    updateFontSize,
    updateTreeDensity,
    updateDefaultSidebarMode,
    updateSidebarOpenMobile,
    updateMetadataPanelSize,
    updateLeftSidebarFontSize,
    updateSidebarCollapsed,
    updateMultiple,
    reset: resetPreferences,
  } = usePreferences()

  // Tab system integration
  const tabsContext = useOpenTabsSafe()
  const activeTab = useActiveTab()

  // Ref to access tabsContext in effects without dependency cycles
  // The functions (isTabOpen, updateTabContent, etc.) are stable via useCallback
  const tabsContextRef = useRef(tabsContext)
  useEffect(() => { tabsContextRef.current = tabsContext }, [tabsContext])

  // Check if we're in tabbed mode (context available and has tabs)
  const isTabMode = Boolean(tabsContext && tabsContext.tabs.length > 0)

  // State
  const [currentPath, setCurrentPath] = useState('')
  const [files, setFiles] = useState<GitHubFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<GitHubFile | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [fileMetadata, setFileMetadata] = useState<StrandMetadata>({})
  // Full index map stores complete metadata including autoGenerated fields
  // NOTE: Must be declared before metadataMap which depends on it
  const [fullIndexMap, setFullIndexMap] = useState<Map<string, { metadata?: StrandMetadata & { autoGenerated?: Record<string, unknown> } }>>(
    () => new Map()
  )
  // Build metadata map for advanced filtering from the full index
  const metadataMap = useMemo(() => {
    const map = new Map<string, StrandMetadata>()
    fullIndexMap.forEach((entry, path) => {
      if (entry.metadata) {
        map.set(path, entry.metadata as StrandMetadata)
      }
    })
    return map
  }, [fullIndexMap])

  // Build date index for calendar filtering
  const { dateIndex } = useDateIndex(metadataMap)

  const {
    options: searchOptions,
    setQuery: setSearchQueryInput,
    toggleSearchNames,
    toggleSearchContent,
    toggleCaseSensitive,
    setFilterScope,
    toggleHideEmptyFolders,
    setRootScope,
    filteredFiles,
    resetFilters: resetSearchFilters,
    // Advanced filters
    advancedFilters,
    setDateFilter,
    toggleTag,
    setSelectedTags,
    setTagMatchMode,
    toggleSubject,
    setSelectedSubjects,
    toggleTopic,
    setSelectedTopics,
    excludePath,
    includePath,
    resetAdvancedFilters,
    activeAdvancedFilterCount,
    hasAdvancedFilters,
  } = useSearchFilter(files, new Map(), metadataMap)
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(initialView === 'planner' ? 'planner' : 'tree')
  // Link preview state for sidebar
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  // Initialize sidebar state from preferences (persisted across sessions)
  // On small screens (<640px), default to collapsed regardless of preferences
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return false // Always collapsed on small screens
    }
    return !preferences.sidebarCollapsed
  })
  const [sidebarWidth, setSidebarWidth] = useState(340)
  // Use persisted font size from preferences, defaulting to 2 (base)
  const [sidebarFontSize, setSidebarFontSizeLocal] = useState(() => preferences.leftSidebarFontSize ?? 2)
  // Search section expanded state (for unified header control)
  const [searchExpanded, setSearchExpanded] = useState(true)

  // Electron detection for window drag and Mac traffic light padding
  const [isElectronApp, setIsElectronApp] = useState(false)
  const [electronMacPadding, setElectronMacPadding] = useState(false)

  // Content source state for sidebar badge
  const [contentSource, setContentSource] = useState<ContentSource | null>(null)
  const [contentSourcePath, setContentSourcePath] = useState<string | undefined>(undefined)

  // Detect Electron for window drag region and macOS for traffic light padding
  useEffect(() => {
    setIsElectronApp(isElectron())
    setElectronMacPadding(isElectronMac())
  }, [])

  // Auto-collapse sidebar on small screens after hydration
  useEffect(() => {
    if (window.innerWidth < 640) {
      setSidebarOpen(false)
    }
  }, [])

  // Initialize content source from Electron vault or default to sqlite
  useEffect(() => {
    async function initContentSource() {
      if (isElectronWithVault()) {
        try {
          const vaultStatus = await getElectronVaultStatus()
          if (vaultStatus?.electronVaultInitialized && vaultStatus.vaultPath) {
            setContentSource({
              type: 'sqlite',
              isOnline: navigator.onLine,
              lastSync: null,
              pendingChanges: 0,
              displayPath: vaultStatus.vaultPath,
            })
            setContentSourcePath(vaultStatus.vaultPath)
            return
          }
        } catch (err) {
          console.warn('[QuarryViewer] Failed to get Electron vault status:', err)
        }
      }
      // Default to sqlite (IndexedDB in browser)
      setContentSource({
        type: 'sqlite',
        isOnline: navigator.onLine,
        lastSync: null,
        pendingChanges: 0,
      })
    }
    initContentSource()
  }, [])

  // Sync sidebar font size when preferences load/change
  useEffect(() => {
    if (preferences.leftSidebarFontSize !== undefined && preferences.leftSidebarFontSize !== sidebarFontSize) {
      setSidebarFontSizeLocal(preferences.leftSidebarFontSize)
    }
  }, [preferences.leftSidebarFontSize])

  // Sync tab content when file content is fetched
  // Uses ref to avoid dependency on tabsContext which changes on every state update
  useEffect(() => {
    const ctx = tabsContextRef.current
    if (ctx && selectedFile && fileContent) {
      // Update the tab content when we fetch new content
      const tabId = selectedFile.path
      if (ctx.isTabOpen(tabId)) {
        ctx.updateTabContent(tabId, fileContent, fileMetadata)
      }
    }
  }, [selectedFile, fileContent, fileMetadata])

  // Update document title with current strand/weave title
  useEffect(() => {
    const baseTitle = 'Quarry'
    if (selectedFile && fileMetadata?.title) {
      document.title = `${fileMetadata.title} | ${baseTitle}`
    } else if (selectedFile) {
      // Use filename without extension as fallback
      const filename = selectedFile.name.replace(/\.md$/, '')
      document.title = `${filename} | ${baseTitle}`
    } else {
      document.title = `${baseTitle} - Automatic Second Brain`
    }
  }, [selectedFile, fileMetadata?.title])

  // Switch to the correct file when active tab changes
  useEffect(() => {
    // When all tabs are closed, clear the selected file to show welcome/home view
    if (!activeTab && tabsContext && tabsContext.tabs.length === 0 && selectedFile) {
      setSelectedFile(null)
      setFileContent('')
      setFileMetadata({})
      return
    }

    if (activeTab && activeTab.path !== selectedFile?.path) {
      // Find the file in our files list
      const file = files.find(f => f.path === activeTab.path)
      if (file) {
        // If the tab has cached content, use it
        if (activeTab.content) {
          setSelectedFile(file)
          setFileContent(activeTab.content)
          if (activeTab.metadata) {
            // Cast to local StrandMetadata type (compatible structure, different type definitions)
            setFileMetadata(activeTab.metadata as StrandMetadata)
          }
        } else {
          // Otherwise fetch the content
          fetchFileContent(file)
        }
      } else {
        // File not in current files array - create synthetic file object
        // This handles tabs restored from localStorage when on homepage/different directory
        const syntheticFile: GitHubFile = {
          name: activeTab.path.split('/').pop() || activeTab.title,
          path: activeTab.path,
          type: 'file',
          sha: '',
          size: 0,
          url: '',
          html_url: `https://github.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/blob/${REPO_CONFIG.BRANCH}/${activeTab.path}`,
          download_url: API_ENDPOINTS.raw(activeTab.path, activeBranchRef.current),
        }
        if (activeTab.content) {
          // Tab has cached content - use it directly
          setSelectedFile(syntheticFile)
          setFileContent(activeTab.content)
          if (activeTab.metadata) {
            setFileMetadata(activeTab.metadata as StrandMetadata)
          }
        } else {
          // No cached content - fetch it
          fetchFileContent(syntheticFile)
        }
      }
    }
  }, [activeTab?.path, activeTab?.content, tabsContext?.tabs.length])

  const [metaOpen, setMetaOpen] = useState(true)
  // Right panel is now unified - QuarryMetadataPanel handles its own tabs internally
  const [expandedTreePaths, setExpandedTreePaths] = useState<Set<string>>(new Set())
  const [bookmarksOpen, setBookmarksOpen] = useState(false)
  const [bookmarksDefaultTab, setBookmarksDefaultTab] = useState<'bookmarks' | 'highlights' | 'history'>('bookmarks')
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [preferencesInitialTab, setPreferencesInitialTab] = useState<SettingsTab>('profile')
  const [activeTutorial, setActiveTutorial] = useState<TutorialId | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [graphOpen, setGraphOpen] = useState(false)
  const [fabricGraphOpen, setFabricGraphOpen] = useState(false)
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [contributeOpen, setContributeOpen] = useState(false)
  // Settings modal is now consolidated into QuarrySettingsModal (preferencesOpen)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorDraft, setEditorDraft] = useState<{ content: string; metadata: StrandMetadata } | null>(null)
  const [pendingInsert, setPendingInsert] = useState<string | null>(null)
  const [savedScrollPosition, setSavedScrollPosition] = useState<number | null>(null)
  const [qaOpen, setQAOpen] = useState(false)
  const [flashcardsOpen, setFlashcardsOpen] = useState(false)
  const [glossaryOpen, setGlossaryOpen] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [mindMapOpen, setMindMapOpen] = useState(false)
  const [researchPopoverOpen, setResearchPopoverOpen] = useState(false)
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [supertagDesignerOpen, setSupertagDesignerOpen] = useState(false)
  const [editingSupertag, setEditingSupertag] = useState<import('@/lib/supertags').SupertagSchema | null>(null)
  // Supertag integration - track selected block and tag for sidebar
  const [selectedBlockId, setSelectedBlockId] = useState<string | undefined>(undefined)
  const [selectedTagName, setSelectedTagName] = useState<string | undefined>(undefined)
  const [navHidden, setNavHidden] = useState(false)
  const [shareHtmlOpen, setShareHtmlOpen] = useState(false)
  const [pendingMoves, setPendingMoves] = useState<MoveOperation[]>([])

  // Tree persistence hook for auto-save and publish
  const {
    state: treePersistState,
    addMoves: addTreeMoves,
    saveLocally: saveTreeLocally,
    publish: publishTree,
    clearPending: clearTreePending,
  } = useTreePersistence({
    strandSlug: selectedFile?.path,
    onSaveComplete: (success) => {
      if (success) {
        console.log('[QuarryViewer] Tree changes saved locally')
      }
    },
    onPublishComplete: (success, target) => {
      if (success) {
        // Clear moves and close modal
        setPendingMoves([])
        setMoveModalOpen(false)
        console.log('[QuarryViewer] Tree changes published to:', target)
      }
    },
  })
  const [summaryIndex, setSummaryIndex] = useState<Map<string, { summary?: string; lastIndexed?: string }>>(
    () => new Map()
  )
  const [tagsIndex, setTagsIndex] = useState<TagsIndex>({ tags: [], subjects: [], topics: [], skills: [] })
  const [searchResults, setSearchResults] = useState<CodexSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [semanticEnabled, setSemanticEnabled] = useState(false)
  const [semanticSupported, setSemanticSupported] = useState(false)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [graphqlAvailable, setGraphqlAvailable] = useState(true)
  const [searchIndexAvailable, setSearchIndexAvailable] = useState(true)
  const [semanticStatus, setSemanticStatus] = useState<'ready' | 'degraded' | 'offline'>('ready')
  const [metadataPanelSize, setMetadataPanelSize] = useState<'s' | 'm' | 'l'>(preferences.metadataPanelSize ?? 's')
  const [activeHeadingSlug, setActiveHeadingSlug] = useState<string | null>(null)
  const [scrollToSearchQuery, setScrollToSearchQuery] = useState<string | null>(null)
  // Ref to the content scroll container for Reader Mode scroll sync
  const contentScrollRef = useRef<HTMLElement | null>(null)
  const [pluginCommands, setPluginCommands] = useState<typeof pluginUIRegistry.allCommands>([])
  const [isSavingMetadata, setIsSavingMetadata] = useState(false)
  const [lastSaveResult, setLastSaveResult] = useState<SaveResult | null>(null)
  // Track original metadata to compute diff for GitHub PRs
  const [originalFileMetadata, setOriginalFileMetadata] = useState<StrandMetadata>({})

  // Responsive layout
  const layout = useResponsiveLayout({
    onLayoutChange: (newLayout) => {
      // When changing to mobile, close panels if both are open
      if (!newLayout.preset.canShowBothPanels && sidebarOpen && metaOpen) {
        setMetaOpen(false)
      }
    }
  })

  // Knowledge tree - uses local SQLite in Electron, GitHub otherwise
  // Skip tree loading for views that don't need it (like new strand creation)
  const skipTreeLoad = initialView === 'new'
  const {
    tree: knowledgeTree,
    loading: knowledgeTreeLoading,
    error: knowledgeTreeError,
    totalStrands: totalTreeStrands,
    totalWeaves: totalTreeWeaves,
    totalLooms: totalTreeLooms,
    sourceType: contentSourceType,
    sourcePath: detectedSourcePath,
    isLocalMode,
  } = useContentTree({ skip: skipTreeLoad })
  const activeBranchRef = useRef(REPO_CONFIG.BRANCH)

  // Update content source in state for UI display
  useEffect(() => {
    if (contentSourceType === 'local' || contentSourceType === 'indexeddb') {
      setContentSource({
        type: 'sqlite',
        isOnline: navigator.onLine,
        lastSync: null,
        pendingChanges: 0,
        displayPath: detectedSourcePath || undefined,
      })
      setContentSourcePath(detectedSourcePath || undefined)
      // In local mode, GraphQL status doesn't matter - set as available
      setGraphqlAvailable(true)
    } else {
      setContentSource({
        type: 'github',
        isOnline: navigator.onLine,
        lastSync: null,
        pendingChanges: 0,
      })
      setContentSourcePath(undefined)
    }
  }, [contentSourceType, detectedSourcePath])

  // Keyboard shortcut for hiding nav (⌘⇧H or Ctrl+Shift+H)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘⇧H or Ctrl+Shift+H to toggle nav
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault()
        setNavHidden((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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

  // Highlights management
  const {
    highlights,
    groups: highlightGroups,
    addHighlight,
    updateHighlight,
    removeHighlight,
    clearAllHighlights,
    addGroup: addHighlightGroup,
    getFileHighlights,
  } = useHighlights()

  // Collections management (for favorites)
  const {
    isFavorite: checkIsFavorite,
    toggleFavorite,
  } = useCollections()

  // Get highlights for current file (for inline rendering)
  const fileHighlights = useMemo(() => {
    if (!selectedFile?.path) return []
    return getFileHighlights(selectedFile.path)
  }, [selectedFile?.path, getFileHighlights, highlights]) // Re-compute when highlights change

  // Check if current file is favorited
  const currentFileIsFavorite = useMemo(() => {
    if (!selectedFile?.path) return false
    return checkIsFavorite(selectedFile.path)
  }, [selectedFile?.path, checkIsFavorite])

  // Handler for toggling favorite on current file
  const handleToggleFavorite = useCallback(() => {
    if (!selectedFile?.path) return
    toggleFavorite(selectedFile.path)
  }, [selectedFile?.path, toggleFavorite])

  // Helper function to handle highlight creation with duplicate detection
  // If the same content is already highlighted, remove it instead (toggle behavior)
  const handleCreateHighlight = useCallback((data: {
    filePath: string
    content: string
    selectionType: 'text' | 'block'
    startOffset?: number
    endOffset?: number
    color?: 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'orange'
  }) => {
    // Check if this exact content is already highlighted in this file
    const existingHighlight = highlights.find(
      h => h.filePath === data.filePath && h.content === data.content
    )

    if (existingHighlight) {
      // Already highlighted - remove it (toggle off)
      removeHighlight(existingHighlight.id)
      return { action: 'removed', highlight: existingHighlight }
    }

    // Not highlighted yet - add new highlight
    const newHighlight = addHighlight({
      filePath: data.filePath,
      content: data.content,
      selectionType: data.selectionType,
      startOffset: data.startOffset,
      endOffset: data.endOffset,
      color: data.color,
    })
    return { action: 'added', highlight: newHighlight }
  }, [highlights, addHighlight, removeHighlight])

  // Multi-selection for sidebar tree
  const treeSelection = useTreeSelection()

  // Toast notifications (must be before jobQueue which uses it)
  const toast = useToast()

  // Background job queue
  const jobQueue = useJobQueue({
    autoInit: true,
    onJobComplete: (job) => {
      toast.jobCompleted(JOB_TYPE_LABELS[job.type],
        typeof job.result === 'object' && job.result && 'count' in job.result
          ? (job.result as { count: number }).count
          : undefined
      )
    },
    onJobFailed: (job) => {
      toast.jobFailed(JOB_TYPE_LABELS[job.type], job.error || 'Unknown error')
    },
  })

  // Feature flags for gated features
  const { flags: featureFlags, isEnabled } = useFeatureFlags()

  // Media storage for captured assets (voice recordings, photos, drawings)
  const { storeAsset: storeMediaAsset } = useMediaStorage({
    strandPath: selectedFile?.path || '',
  })

  // Generate random facts for the welcome stats based on activity
  // Includes study encouragement when users browse but don't study (if feature enabled)
  const randomFacts = useMemo(() => {
    return getDailyFacts({
      history,
      totalStrands: totalTreeStrands,
      featureFlags: {
        enableFlashcards: featureFlags.enableFlashcards,
        enableQuizzes: featureFlags.enableQuizzes,
      },
      // Note: studyStats would be passed here when Learning Studio tracking is implemented
    })
  }, [history, totalTreeStrands, featureFlags.enableFlashcards, featureFlags.enableQuizzes])

  // User preferences
  // Apply preferences - ONLY on initial mount, not when mode is changed by user
  const hasAppliedInitialPrefsRef = React.useRef(false)
  useEffect(() => {
    // Only apply preferences on initial mount, not on subsequent changes
    if (!hasAppliedInitialPrefsRef.current) {
      setSidebarMode(preferences.defaultSidebarMode)
      hasAppliedInitialPrefsRef.current = true
    }
  }, [preferences.defaultSidebarMode])

  useEffect(() => {
    setMetadataPanelSize(preferences.metadataPanelSize ?? 's')
  }, [preferences.metadataPanelSize])

  // Panel toggle handlers that respect mobile constraints
  const handleToggleSidebar = useCallback((forceState?: boolean) => {
    const newState = forceState !== undefined ? forceState : !sidebarOpen
    setSidebarOpen(newState)
    // Persist sidebar state to preferences
    updateSidebarCollapsed(!newState)
    // On mobile, close right panel when opening left sidebar
    if (newState && !layout.preset.canShowBothPanels) {
      setMetaOpen(false)
    }
  }, [sidebarOpen, layout.preset.canShowBothPanels, updateSidebarCollapsed])

  const handleToggleMetaPanel = useCallback((forceState?: boolean) => {
    const newState = forceState !== undefined ? forceState : !metaOpen
    setMetaOpen(newState)
    // On mobile, close left sidebar when opening right panel
    if (newState && !layout.preset.canShowBothPanels) {
      setSidebarOpen(false)
    }
  }, [metaOpen, layout.preset.canShowBothPanels])

  // Toggle block tags visibility (persisted in preferences)
  const handleToggleBlockTags = useCallback(() => {
    updateMultiple({ showBlockTags: !preferences.showBlockTags })
  }, [preferences.showBlockTags, updateMultiple])

  // Keyboard shortcuts
  useCodexHotkeys({
    onToggleMeta: () => handleToggleMetaPanel(),
    onFocusSearch: () => {
      const input = document.getElementById('codex-search-input') as HTMLInputElement | null
      input?.focus()
      // On mobile, open sidebar to show search
      if (layout.isMobile) {
        handleToggleSidebar(true)
      }
    },
    onGoHome: () => { window.location.href = '/quarry/' },
    onToggleSidebar: () => handleToggleSidebar(),
    onToggleBookmarks: () => setBookmarksOpen((v) => !v),
    onOpenPreferences: () => setPreferencesOpen(true),
    onToggleHelp: () => setHelpOpen((v) => !v),
    onToggleEdit: selectedFile ? () => setEditorOpen((v) => !v) : undefined,
    onToggleQA: () => setQAOpen((v) => !v),
    onToggleShortcuts: () => setShortcutsOpen((v) => !v),
    onOpenTodayNote: async () => {
      // Open today's daily note (creates if doesn't exist)
      const todayKey = getTodayKey()
      const dailyNote = await getOrCreateDailyNote(todayKey)
      if (dailyNote) {
        openFileFromTree(dailyNote.path)
      }
    },
    onOpenResearch: () => setResearchPopoverOpen(true),
  }, pluginCommands.filter(({ pluginId }) => quarryPluginManager.isEnabled(pluginId)))

  // Block-level tagging hook - provides tag CRUD operations with optimistic updates
  const strandPath = selectedFile?.path ?? null
  const {
    blocks,
    isLoading: blocksLoading,
    acceptTag,
    rejectTag,
    addTag,
    removeTag,
    getBlockById,
    refetch,
  } = useBlockTags(strandPath, { strandContent: fileContent })

  // Transform blocks data for Reader Mode inline display
  const readerBlockTags = useMemo(() => {
    if (!blocks || blocks.length === 0) return []
    return blocks
      .filter(block => block.tags?.length > 0 || block.suggestedTags?.length > 0)
      .map(block => ({
        blockId: block.blockId,
        tags: block.tags || [],
        suggestedTags: block.suggestedTags?.map(st => ({
          tag: st.tag,
          confidence: st.confidence,
          source: st.source,
        })),
        worthinessScore: block.worthinessScore,
      }))
  }, [blocks])

  // Block-level keyboard shortcuts (Cmd+T for tagging, etc.)
  useBlockLevelShortcuts({
    onAddTag: () => {
      if (selectedBlockId && selectedFile) {
        setTagPopoverOpen(true)
      }
    },
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
    onSwipeDown: () => {
      // Close any open modals on swipe down
      if (window.innerWidth < 768) {
        if (qaOpen) setQAOpen(false)
        else if (editorOpen) setEditorOpen(false)
        else if (graphOpen) setGraphOpen(false)
        else if (bookmarksOpen) setBookmarksOpen(false)
        else if (preferencesOpen) setPreferencesOpen(false)
        else if (helpOpen) setHelpOpen(false)
      }
    },
    threshold: 100,
  })

  // Text-to-Speech
  // Wrapped in useMemo to prevent TDZ errors during SSR/initial render
  const tts = useTextToSpeech()

  // Apply saved TTS preferences when voices are loaded (run once when voices become available)
  const ttsInitializedRef = useRef(false)
  const availableVoicesLength = tts.availableVoices?.length ?? 0
  useEffect(() => {
    if (ttsInitializedRef.current) return
    if (!tts.isSupported || !tts.availableVoices || tts.availableVoices.length === 0) return

    ttsInitializedRef.current = true
    const savedTTS = preferences.tts
    if (!savedTTS) return

    // Apply saved voice
    if (savedTTS.voiceURI) {
      const voice = tts.availableVoices.find(v => v.voiceURI === savedTTS.voiceURI)
      if (voice) tts.setVoice(voice)
    }

    // Apply saved rate, volume, pitch
    if (savedTTS.rate !== undefined) tts.setRate(savedTTS.rate)
    if (savedTTS.volume !== undefined) tts.setVolume(savedTTS.volume)
    if (savedTTS.pitch !== undefined) tts.setPitch(savedTTS.pitch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tts.isSupported, availableVoicesLength])

  // Quarry Plugin System: Set up viewer hooks
  useEffect(() => {
    setViewerHooks({
      navigateTo: (path: string) => {
        // Respect local mode
        browseDirectory(path)
        if (mode === 'page') {
          saveLastViewedLocation(path)
        }
      },
      openFile: async (path: string) => {
        // Use openFileFromTree which handles local mode
        await openFileFromTree(path)
      },
      goBack: () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          window.history.back()
        }
      },
      goForward: () => {
        if (typeof window !== 'undefined') {
          window.history.forward()
        }
      },
      getContent: () => fileContent,
      getMetadata: () => fileMetadata,
      getKnowledgeTree: () => knowledgeTree,
      expandNode: (path: string) => {
        setExpandedTreePaths(prev => new Set([...prev, path]))
        pluginEvents.emit('tree:expand', { path })
      },
      collapseNode: (path: string) => {
        setExpandedTreePaths(prev => {
          const next = new Set(prev)
          next.delete(path)
          return next
        })
        pluginEvents.emit('tree:collapse', { path })
      },
      search: async (query: string) => {
        try {
          const engine = getSearchEngine()
          const results = await engine.search(query, { limit: 20 })
          return results.map(r => ({
            path: r.path,
            name: r.title,
            score: r.combinedScore
          }))
        } catch {
          return []
        }
      },
      showNotice: (message: string, type = 'info' as const, timeout?: number) => {
        // Use dedicated methods for success, error, info; showToast for warning
        if (type === 'success') {
          toast.success(message)
        } else if (type === 'error') {
          toast.error(message)
        } else if (type === 'warning') {
          toast.showToast(message, 'warning', timeout)
        } else {
          toast.info(message)
        }
      },
      showModal: async (options) => {
        return new Promise((resolve) => {
          // For now, use a simple confirm dialog
          // TODO: Implement proper modal system for plugins
          const message = options.content?.toString() || options.title
          const result = window.confirm(message)
          resolve(result)
        })
      },
      getCurrentFile: () => selectedFile ? {
        path: selectedFile.path,
        name: selectedFile.name,
        content: fileContent
      } : null,
      getCurrentPath: () => currentPath,
      getTheme: () => ({
        theme: preferences.theme,
        isDark: preferences.theme.includes('dark')
      }),
    })

    return () => {
      clearViewerHooks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile, fileContent, fileMetadata, knowledgeTree, expandedTreePaths, currentPath, preferences.theme, files, mode, toast])
  // Note: fetchContents & fetchFileContent omitted from deps - defined later as stable useCallbacks

  // Quarry Plugin System: Emit events for file open/close
  useEffect(() => {
    if (selectedFile) {
      pluginEvents.emit('file:open', {
        path: selectedFile.path,
        name: selectedFile.name
      })

      return () => {
        pluginEvents.emit('file:close', {
          path: selectedFile.path
        })
      }
    }
  }, [selectedFile])

  // Quarry Plugin System: Emit theme change events
  useEffect(() => {
    pluginEvents.emit('theme:change', {
      theme: preferences.theme,
      isDark: preferences.theme.includes('dark')
    })
  }, [preferences.theme])

  // Quarry Plugin System: Emit sidebar toggle events
  useEffect(() => {
    pluginEvents.emit('sidebar:toggle', {
      open: sidebarOpen
    })
  }, [sidebarOpen])

  // Quarry Plugin System: Emit sidebar mode change events
  useEffect(() => {
    pluginEvents.emit('sidebar:mode', {
      mode: sidebarMode
    })
  }, [sidebarMode])

  // Quarry Plugin System: Emit navigation change events
  const prevPathRef = useRef<string>('')
  useEffect(() => {
    if (currentPath !== prevPathRef.current) {
      const oldPath = prevPathRef.current
      prevPathRef.current = currentPath
      if (oldPath !== '') { // Don't emit on initial mount
        pluginEvents.emit('navigation:change', {
          from: oldPath,
          to: currentPath
        })
      }
    }
  }, [currentPath])

  // Quarry Plugin System: Subscribe to plugin commands for keyboard shortcuts
  useEffect(() => {
    setPluginCommands(pluginUIRegistry.allCommands)
    const unsubscribe = pluginUIRegistry.onChange(() => {
      setPluginCommands([...pluginUIRegistry.allCommands])
    })
    return unsubscribe
  }, [])

  // PWA

  // Speak current file content
  const handleReadAloud = useCallback(() => {
    // Defensive check: tts may not be fully initialized on first render
    if (!tts || !fileContent) return
    if (typeof tts.speak === 'function') {
      tts.speak(fileContent)
    }
  }, [fileContent, tts])

  /**
   * Update URL when navigation changes (page mode only)
   * Uses clean SEO-friendly URLs like /quarry/weaves/topic/strand-name
   * 
   * Note: Uses history.replaceState for URL updates without page reload,
   * since static export doesn't support Next.js RSC client navigation.
   */
  const updateURL = useCallback(
    (path: string, file?: string) => {
      if (mode === 'page') {
        // Use clean URLs for SEO: /quarry/weaves/topic/strand-name
        // Priority: file path > directory path
        const targetPath = file || path
        if (targetPath) {
          // Remove .md extension for clean URLs
          const cleanPath = targetPath.replace(/\.md$/, '')
          const cleanUrl = `/quarry/${cleanPath}/` // trailing slash for static export

          // Use replaceState to update URL without triggering navigation
          // This avoids RSC fetch issues with static export
          if (typeof window !== 'undefined' && window.location.pathname !== cleanUrl) {
            window.history.replaceState(null, '', cleanUrl)
          }
        }
      }
    },
    [mode]
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
          // 404 is expected for non-Quarry Codex repos or when index isn't built yet
          if (!cancelled) setSearchIndexAvailable(false)
          return
        }

        const payload = (await response.json()) as unknown
        if (!Array.isArray(payload)) return

        const entries = payload as SummaryIndexEntry[]
        const map = new Map<string, { summary?: string; lastIndexed?: string }>()
        const fullMap = new Map<string, { metadata?: StrandMetadata & { autoGenerated?: Record<string, unknown> } }>()

        // Build tags index
        const tagMap = new Map<string, { count: number; paths: string[] }>()
        const subjectMap = new Map<string, { count: number; paths: string[] }>()
        const topicMap = new Map<string, { count: number; paths: string[] }>()
        const skillMap = new Map<string, { count: number; paths: string[] }>()

        entries.forEach((entry) => {
          if (!entry?.path) return
          const metadata = entry.metadata || {}
          const auto = metadata.autoGenerated as StrandMetadata['autoGenerated'] || {}
          map.set(entry.path, {
            summary: metadata.summary,
            lastIndexed: auto?.lastIndexed,
          })
          // Store full metadata for merging with frontmatter
          fullMap.set(entry.path, { metadata })

          // Extract tags
          const rawTags = metadata.tags
          const tags = Array.isArray(rawTags) ? rawTags : typeof rawTags === 'string' ? [rawTags] : []
          tags.forEach((tag) => {
            const normalizedTag = String(tag).trim().toLowerCase()
            if (!normalizedTag) return
            const existing = tagMap.get(normalizedTag) || { count: 0, paths: [] }
            existing.count++
            existing.paths.push(entry.path!)
            tagMap.set(normalizedTag, existing)
          })

          // Extract taxonomy subjects (from frontmatter or auto-generated)
          // Handle both singular (subject) and plural (subjects) forms
          const rawSubjects = metadata.taxonomy?.subjects || (metadata.taxonomy as any)?.subject || auto?.subjects || []
          const subjects = Array.isArray(rawSubjects) ? rawSubjects : []
          subjects.forEach((subject: string) => {
            const normalized = String(subject).trim().toLowerCase()
            if (!normalized) return
            const existing = subjectMap.get(normalized) || { count: 0, paths: [] }
            existing.count++
            existing.paths.push(entry.path!)
            subjectMap.set(normalized, existing)
          })

          // Extract taxonomy topics (from frontmatter or auto-generated)
          // Handle both singular (topic) and plural (topics) forms
          const rawTopics = metadata.taxonomy?.topics || (metadata.taxonomy as any)?.topic || auto?.topics || []
          const topics = Array.isArray(rawTopics) ? rawTopics : []
          topics.forEach((topic: string) => {
            const normalized = String(topic).trim().toLowerCase()
            if (!normalized) return
            const existing = topicMap.get(normalized) || { count: 0, paths: [] }
            existing.count++
            existing.paths.push(entry.path!)
            topicMap.set(normalized, existing)
          })

          // Extract skills (from frontmatter or auto-generated)
          const rawSkills = (metadata as any).skills || auto?.skills || []
          const skills = Array.isArray(rawSkills) ? rawSkills : []
          skills.forEach((skill: string) => {
            const normalized = String(skill).trim().toLowerCase()
            if (!normalized) return
            const existing = skillMap.get(normalized) || { count: 0, paths: [] }
            existing.count++
            existing.paths.push(entry.path!)
            skillMap.set(normalized, existing)
          })
        })

        // Convert maps to arrays for TagsIndex
        const tagsArr: TagIndexEntry[] = Array.from(tagMap.entries()).map(([name, data]) => ({
          name,
          count: data.count,
          paths: data.paths,
        }))
        const subjectsArr: TagIndexEntry[] = Array.from(subjectMap.entries()).map(([name, data]) => ({
          name,
          count: data.count,
          paths: data.paths,
        }))
        const topicsArr: TagIndexEntry[] = Array.from(topicMap.entries()).map(([name, data]) => ({
          name,
          count: data.count,
          paths: data.paths,
        }))
        const skillsArr: TagIndexEntry[] = Array.from(skillMap.entries()).map(([name, data]) => ({
          name,
          count: data.count,
          paths: data.paths,
        }))

        if (!cancelled) {
          setSummaryIndex(map)
          setFullIndexMap(fullMap)
          setTagsIndex({ tags: tagsArr, subjects: subjectsArr, topics: topicsArr, skills: skillsArr })
          setSearchIndexAvailable(true)

          // Debug: log index loading
          if (process.env.NODE_ENV === 'development') {
            console.debug('[QuarryViewer] Index loaded: fullIndexMap size:', fullMap.size)
            console.debug('[QuarryViewer] Sample paths:', Array.from(fullMap.keys()).slice(0, 5))
            console.debug('[QuarryViewer] Subjects count:', subjectsArr.length)
            console.debug('[QuarryViewer] Topics count:', topicsArr.length)
            console.debug('[QuarryViewer] Skills count:', skillsArr.length)
          }
        }
      } catch (err) {
        if (!cancelled) setSearchIndexAvailable(false)
      }
    }

    fetchSummaryIndex()

    return () => {
      cancelled = true
    }
  }, [])

  // Re-merge metadata when index loads (fixes race condition)
  useEffect(() => {
    if (fullIndexMap.size === 0 || !selectedFile || !fileContent) return

    // SQLite strands don't have .md extension, so check for files without extension too
    if (isMarkdownFile(selectedFile.name) || !selectedFile.name.includes('.')) {
      const indexEntry = fullIndexMap.get(selectedFile.path)
      const autoGenerated = indexEntry?.metadata?.autoGenerated as Record<string, unknown> | undefined

      const frontmatter = parseWikiMetadata(fileContent)
      // Handle both singular (subject/topic) and plural (subjects/topics) forms from frontmatter
      // OpenStrand schema uses singular form (subject, topic) while the UI expects plural (subjects, topics)
      const fmSubjects = frontmatter.taxonomy?.subjects || (frontmatter.taxonomy as any)?.subject || []
      const fmTopics = frontmatter.taxonomy?.topics || (frontmatter.taxonomy as any)?.topic || []
      const fmTags = frontmatter.tags || (frontmatter.taxonomy as any)?.subtopic || []

      const mergedMetadata: StrandMetadata = {
        ...frontmatter,
        // Normalize tags from various sources
        tags: Array.isArray(fmTags) ? fmTags : typeof fmTags === 'string' ? fmTags.split(',').map(t => t.trim()) : [],
        taxonomy: {
          ...frontmatter.taxonomy,
          subjects: (Array.isArray(fmSubjects) && fmSubjects.length > 0)
            ? fmSubjects
            : (autoGenerated?.subjects as string[] || []),
          topics: (Array.isArray(fmTopics) && fmTopics.length > 0)
            ? fmTopics
            : (autoGenerated?.topics as string[] || []),
        },
        autoGenerated: autoGenerated as StrandMetadata['autoGenerated'],
      }
      setFileMetadata(mergedMetadata)
    }
  }, [fullIndexMap, selectedFile, fileContent])

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

  // Reset to home state - clear everything and go back to welcome screen
  const handleResetToHome = useCallback(() => {
    // Clear selected file to show welcome screen
    setSelectedFile(null)
    // Reset navigation to root
    setCurrentPath('')
    // Clear search
    resetSearchFilters()
    setSearchQuery('')
    setSemanticEnabled(false)
    // Clear multi-selection
    treeSelection.clearSelection()
    // Reset advanced filters
    resetAdvancedFilters()
  }, [resetSearchFilters, treeSelection, resetAdvancedFilters])

  // Handle previewing a link in the sidebar
  const handlePreviewLink = useCallback((url: string) => {
    setPreviewUrl(url)
    setSidebarMode('preview')
    // Ensure sidebar is open when previewing
    if (!sidebarOpen) {
      setSidebarOpen(true)
    }
  }, [sidebarOpen])

  // Handle clearing the preview
  const handleClearPreview = useCallback(() => {
    setPreviewUrl(null)
  }, [])

  // Handle publishing content from inline editor
  const handlePublishContent = useCallback(
    async (content: string, metadata: StrandMetadata) => {
      if (selectedFile) {
        // Save scroll position before opening editor
        if (contentScrollRef.current) {
          setSavedScrollPosition(contentScrollRef.current.scrollTop)
        }
        setEditorDraft({ content, metadata })
        setEditorOpen(true)
      }
    },
    [selectedFile]
  )

  /**
   * Handle metadata save from the MetadataEditor
   *
   * Saves to multiple targets based on configuration:
   * 1. Always: Local database (IndexedDB via SQLite)
   * 2. If vault configured: Vault folder (filesystem)
   * 3. If GitHub mode with PAT: Create Pull Request
   *
   * Then triggers lazy async re-indexing for search updates.
   */
  const handleMetadataSave = useCallback(async (updatedMetadata: StrandMetadata) => {
    if (!selectedFile) return

    setIsSavingMetadata(true)
    setLastSaveResult(null)

    try {
      // Extract content body (without frontmatter) from fileContent
      const contentBody = fileContent.replace(/^---[\s\S]*?---\n*/, '')

      // Build content source config based on current mode
      // For now, use 'sqlite' as default since we're always saving to IndexedDB
      const contentSource = {
        type: 'sqlite' as const,
        isOnline: navigator.onLine,
        lastSync: null,
        pendingChanges: 0,
      }

      // Check for GitHub PAT in preferences
      const githubPat = preferences.githubPAT?.trim()
      const hasGitHubPat = Boolean(githubPat && githubPat.length > 0)

      // Save to all available targets
      const result = await saveStrandMetadata({
        strand: updatedMetadata,
        originalStrand: originalFileMetadata,
        contentBody,
        strandPath: selectedFile.path,
        contentSource,
        // vaultHandle would come from preferences if vault is configured
        // For now, we'll skip vault sync until vault is properly integrated
        vaultHandle: undefined,
        // GitHub config for PR creation
        githubConfig: hasGitHubPat ? {
          owner: REPO_CONFIG.OWNER,
          repo: REPO_CONFIG.NAME,
          branch: REPO_CONFIG.BRANCH,
          pat: githubPat,
        } : undefined,
      })

      setLastSaveResult(result)

      // Show success toast with save targets
      if (result.savedTo.length > 0) {
        const targetsText = result.savedTo.join(', ')
        if (result.prUrl) {
          toast.success(`Saved to ${targetsText}. PR created!`)
        } else {
          toast.success(`Saved to ${targetsText}`)
        }
      }

      // Show errors if any targets failed
      if (result.errors.length > 0) {
        const errorTargets = result.errors.map(e => e.target).join(', ')
        toast.error(`Failed to save to: ${errorTargets}`)
      }

      // Update local state with the new metadata
      setFileMetadata(updatedMetadata)

      // Run basic metadata re-indexing for search
      // Note: NLP block processing is now automatic via saveStrand in localCodex
      await reindexStrandMetadata(selectedFile.path, updatedMetadata, {
        reindexBlocks: false,  // Automatic via job queue
        updateEmbeddings: false,  // Automatic via job queue
        runTagBubbling: false,  // Automatic via job queue
        priority: 'deferred',
      })

    } catch (error) {
      console.error('[QuarryViewer] Metadata save failed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save metadata')
    } finally {
      setIsSavingMetadata(false)
    }
  }, [selectedFile, fileContent, originalFileMetadata, preferences.githubPAT, toast])

  const handleMetadataPanelSizeChange = useCallback(
    (size: 's' | 'm' | 'l') => {
      setMetadataPanelSize(size)
      updateMetadataPanelSize(size)
    },
    [updateMetadataPanelSize]
  )

  // Handle file move from drag-and-drop - auto-saves locally and batches for publish
  const handleMoveComplete = useCallback(async (operations: MoveOperation[]) => {
    // Add to both local state (for modal) and persistence hook
    setPendingMoves(prev => [...prev, ...operations])
    addTreeMoves(operations)

    // Auto-save to SQLite immediately
    await saveTreeLocally()

    // Show toast notification
    const count = operations.length
    toast.info(`Moved ${count} item${count > 1 ? 's' : ''}. Publish when ready.`)

    // Don't show modal automatically - TreeStatusBar shows status
    // User can click "Publish" when ready
  }, [addTreeMoves, saveTreeLocally, toast])

  // Handle file delete from tree - auto-saves locally and batches for publish
  const handleDeleteComplete = useCallback(async (operations: DeleteOperation[]) => {
    if (operations.length === 0) return

    // For deletes, we track them as moves to a special "/deleted" path
    // This allows the publish flow to handle them similarly
    const deleteMoves: MoveOperation[] = operations.map(op => ({
      type: 'move' as const,
      sourcePath: op.path,
      destPath: `/.deleted/${op.name}`,
      name: op.name,
      nodeType: op.nodeType,
      timestamp: op.timestamp,
    }))

    // Add to pending moves for publish tracking
    setPendingMoves(prev => [...prev, ...deleteMoves])
    addTreeMoves(deleteMoves)

    // Auto-save to SQLite immediately
    await saveTreeLocally()

    // Show toast notification
    const count = operations.length
    toast.info(`Deleted ${count} item${count > 1 ? 's' : ''}. Publish to sync.`)
  }, [addTreeMoves, saveTreeLocally, toast])

  // Handle publishing moves - smart routing based on detected target
  const handlePublishMoves = useCallback(async (operations: MoveOperation[]) => {
    const publishTarget = treePersistState.publishTarget

    switch (publishTarget) {
      case 'github': {
        // GitHub PR flow
        const githubPAT = localStorage.getItem('openstrand_github_pat')
        if (!githubPAT) {
          throw new Error('GitHub Personal Access Token not configured. Please add it in Settings.')
        }

        const response = await fetch('/api/github/move-files', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${githubPAT}`,
          },
          body: JSON.stringify({
            operations,
            branchName: `codex-move-${Date.now()}`,
            commitMessage: `chore: reorganize ${operations.length} file${operations.length > 1 ? 's' : ''}`,
            prTitle: `Reorganize Codex files (${operations.length} move${operations.length > 1 ? 's' : ''})`,
            prBody: 'File reorganization from Quarry Codex drag-and-drop interface.',
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create PR')
        }

        const result = await response.json()
        // Open PR in new tab
        if (result.prUrl) {
          window.open(result.prUrl, '_blank')
        }
        break
      }

      case 'vault': {
        // Vault filesystem flow
        const vaultHandle = await getStoredVaultHandle()
        if (!vaultHandle) {
          throw new Error('Vault not available. Please connect a vault folder in Settings.')
        }

        const result = await batchMoveVaultItems(vaultHandle, operations)
        if (!result.success) {
          throw new Error(result.errors.join(', '))
        }
        break
      }

      case 'sqlite':
      default: {
        // SQLite-only - already saved locally, just confirm
        break
      }
    }

    // Clear pending moves after successful publish
    setPendingMoves([])
    clearTreePending()
    setMoveModalOpen(false)

    // Queue NLP re-analysis for moved files
    await queueMoveProcessing(operations)
  }, [treePersistState.publishTarget, clearTreePending])

  // Clear all pending moves
  const handleClearMoves = useCallback(() => {
    setPendingMoves([])
    clearTreePending()
    setMoveModalOpen(false)
  }, [clearTreePending])

  // Remove single move operation
  const handleRemoveMove = useCallback((index: number) => {
    setPendingMoves(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Handle tag/category click - navigate to filtered view
  const handleTagClick = useCallback(
    (type: 'tag' | 'subject' | 'topic' | 'skill', value: string) => {
      // Navigate to the tag page with the selected filter
      const baseUrl = '/quarry/browse'
      const params = new URLSearchParams()
      params.set(type, value)
      router.push(`${baseUrl}?${params.toString()}`)
    },
    [router]
  )

  // Handle tag click from document content - switch to supertags sidebar
  const handleContentTagClick = useCallback(
    (tagName: string, blockId?: string) => {
      // Set selected tag and block for supertags panel
      setSelectedTagName(tagName.startsWith('#') ? tagName.slice(1) : tagName)
      if (blockId) {
        setSelectedBlockId(blockId)
      }
      // Switch sidebar to supertags mode
      setSidebarMode('supertags')
      // Ensure sidebar is open
      setSidebarOpen(true)
    },
    []
  )

  // Handle promoting a lightweight tag to supertag - opens designer with tag prefilled
  const handlePromoteTag = useCallback(
    (tagName: string) => {
      // Open the supertag designer with the tag name prefilled
      setEditingSupertag(null) // New schema, not editing existing
      setSupertagDesignerOpen(true)
      // The designer will use the selectedTagName to prefill
    },
    []
  )

  // Handle navigating to a heading in the document (for TOC outline)
  const handleNavigateToHeading = useCallback((slug: string) => {
    // Helper to strip leading numbers/bullets from text (e.g., "1-intro" -> "intro")
    const stripNumberPrefix = (text: string) => text
      .replace(/^[\d]+[\.\)\-\s]+/, '')
      .trim()

    // Find the heading element by slug/id and scroll to it
    let headingEl = document.querySelector(`[id="${slug}"], [data-heading-slug="${slug}"]`)

    // Fallback: try to find by text content with number-prefix handling
    if (!headingEl) {
      const contentEl = document.querySelector('.codex-content-scroll')
      if (contentEl) {
        const headings = contentEl.querySelectorAll('h1, h2, h3, h4, h5, h6')
        const normalizedSlug = slug.toLowerCase().replace(/[-_\s]+/g, '')
        const slugWithoutNumber = stripNumberPrefix(slug.replace(/-/g, ' ')).toLowerCase().replace(/[-_\s]+/g, '')

        for (const heading of headings) {
          const headingText = heading.textContent?.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-') || ''
          const headingTextNormalized = headingText.replace(/[-_\s]+/g, '')
          const headingTextNoNumber = stripNumberPrefix(heading.textContent || '').toLowerCase().replace(/[-_\s]+/g, '')

          // Match with or without number prefixes
          if (
            headingText === slug ||
            headingTextNormalized === normalizedSlug ||
            headingTextNoNumber === slugWithoutNumber ||
            headingTextNoNumber === normalizedSlug ||
            headingText.includes(slug)
          ) {
            headingEl = heading
            break
          }
        }
      }
    }

    if (headingEl) {
      headingEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

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
          // Quarry Plugin System: Emit search event
          pluginEvents.emit('search:query', {
            query,
            results: results.length
          })
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
    async (path: string = '', autoSelectFile: boolean = true): Promise<GitHubFile[]> => {
      setLoading(true)
      setError(null)
      const branchCandidates = Array.from(
        new Set(
          [activeBranchRef.current, 'master', 'main', REPO_CONFIG.BRANCH].filter(
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

            return sortedData
          } catch (err) {
            lastError = err instanceof Error ? err : new Error('Failed to fetch repository contents')
          }
        }

        throw lastError ?? new Error('Failed to fetch repository contents')
      } catch (err) {
        console.error('Error fetching contents:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch repository contents')
        return []
      } finally {
        setLoading(false)
      }
    },
    [updateURL]
  )

  /**
   * Fetch file content from GitHub or SQLite (for local mode).
   */
  const fetchFileContent = useCallback(
    async (file: GitHubFile) => {
      if (file.type !== 'file') return

      setLoading(true)
      setError(null)

      try {
        const cacheKey = file.path
        let content = ''

        // For local mode without download_url, fetch from SQLiteContentStore
        if (isLocalMode && !file.download_url) {
          console.log('[QuarryViewer] Fetching local strand:', file.path)
          const store = getContentStore()
          await store.initialize()
          const strand = await store.getStrand(file.path)
          if (strand) {
            // Reconstruct markdown with frontmatter
            const frontmatterContent = strand.frontmatter && Object.keys(strand.frontmatter).length > 0
              ? `---\n${Object.entries(strand.frontmatter).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n\n`
              : ''
            content = frontmatterContent + strand.content
            console.log('[QuarryViewer] Loaded local strand content:', file.path, 'length:', content.length)
          } else {
            throw new Error(`Strand not found: ${file.path}`)
          }
        } else if (file.download_url) {
          // GitHub mode - use download URL
          // Try cache first for instant load on repeat views.
          const cached = await getCachedStrand(cacheKey)
          content = cached || ''

          if (!cached) {
            const response = await fetch(file.download_url)
            if (!response.ok) {
              throw new Error(`Failed to fetch file: ${response.statusText}`)
            }

            content = await response.text()
            // Store in SQL-backed cache (IndexedDB/sql.js in browser, memory in SSR)
            await setCachedStrand(cacheKey, content)
          }
        } else {
          throw new Error('No download URL or local mode available')
        }

        setFileContent(content)
        setSelectedFile(file)

        // Parse metadata and merge with auto-generated from index
        if (isMarkdownFile(file.name)) {
          const frontmatter = parseWikiMetadata(content)

          // Merge auto-generated metadata from index
          const indexEntry = fullIndexMap.get(file.path)
          const autoGenerated = indexEntry?.metadata?.autoGenerated as Record<string, unknown> | undefined

          // Debug: log index lookup
          if (process.env.NODE_ENV === 'development') {
            console.debug('[QuarryViewer] Looking up index for path:', file.path)
            console.debug('[QuarryViewer] Index entry found:', !!indexEntry)
            console.debug('[QuarryViewer] autoGenerated:', autoGenerated)
            console.debug('[QuarryViewer] fullIndexMap size:', fullIndexMap.size)
          }

          // Merge taxonomy: frontmatter takes priority, then auto-generated from index
          // Handle both singular (subject/topic) and plural (subjects/topics) forms from frontmatter
          // OpenStrand schema uses singular form (subject, topic) while the UI expects plural (subjects, topics)
          const fmSubjects = frontmatter.taxonomy?.subjects || (frontmatter.taxonomy as any)?.subject || []
          const fmTopics = frontmatter.taxonomy?.topics || (frontmatter.taxonomy as any)?.topic || []
          const fmTags = frontmatter.tags || (frontmatter.taxonomy as any)?.subtopic || []

          // Normalize arrays
          const existingSubjects = Array.isArray(fmSubjects) ? fmSubjects : []
          const existingTopics = Array.isArray(fmTopics) ? fmTopics : []
          const existingTags = Array.isArray(fmTags) ? fmTags : typeof fmTags === 'string' ? fmTags.split(',').map(t => t.trim()) : []

          // Check if we need auto-classification (no subjects or topics defined)
          const autoSubjects = autoGenerated?.subjects as string[] || []
          const autoTopics = autoGenerated?.topics as string[] || []
          const needsClassification = existingSubjects.length === 0 && existingTopics.length === 0 &&
            autoSubjects.length === 0 && autoTopics.length === 0

          // Build initial merged metadata
          let mergedMetadata: StrandMetadata = {
            ...frontmatter,
            tags: existingTags,
            taxonomy: {
              ...frontmatter.taxonomy,
              subjects: existingSubjects.length > 0 ? existingSubjects : autoSubjects,
              topics: existingTopics.length > 0 ? existingTopics : autoTopics,
            },
            autoGenerated: autoGenerated as StrandMetadata['autoGenerated'],
          }

          setFileMetadata(mergedMetadata)
          setOriginalFileMetadata(mergedMetadata)

          // If no taxonomy defined, run auto-classification in background
          if (needsClassification && content.length > 100) {
            autoClassifyContent(content, existingSubjects, existingTopics, existingTags)
              .then((classified) => {
                // Only update if we got meaningful results
                if (classified.subjects.length > 0 || classified.topics.length > 0) {
                  setFileMetadata(prev => ({
                    ...prev,
                    taxonomy: {
                      ...prev.taxonomy,
                      subjects: classified.subjects,
                      topics: classified.topics,
                    },
                    tags: classified.tags,
                  }))
                }
              })
              .catch(() => {
                // Silently ignore classification failures
              })
          }
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
    [currentPath, updateURL, recordView, fullIndexMap, isLocalMode]
  )

  /**
   * Handle file/directory click
   * Opens files as tabs when tab context is available
   */
  const handleFileClick = (file: GitHubFile) => {
    console.log('[QuarryViewer] handleFileClick:', file.path, 'type:', file.type, 'initialView:', initialView)

    // Full-page views that should navigate to main codex view when clicking a strand
    const fullPageViews = ['planner', 'search', 'research', 'new', 'analytics', 'browse', 'tags', 'graph', 'learn']

    // If in a full-page mode, navigate to main codex view to show the strand
    if (initialView && fullPageViews.includes(initialView)) {
      let url: string
      if (file.type === 'file') {
        // For files, pass both path (directory) and file (full path)
        const lastSlash = file.path.lastIndexOf('/')
        const dirPath = lastSlash > 0 ? file.path.substring(0, lastSlash) : ''
        url = `/quarry?path=${encodeURIComponent(dirPath)}&file=${encodeURIComponent(file.path)}`
      } else {
        // For directories, just pass path
        url = `/quarry?path=${encodeURIComponent(file.path)}`
      }
      console.log(`[QuarryViewer] ${initialView} mode - navigating to:`, url)
      window.location.href = url
      return
    }

    if (file.type === 'dir') {
      // Use browseDirectory to respect isLocalMode
      browseDirectory(file.path)
      // Save last viewed directory
      if (mode === 'page') {
        saveLastViewedLocation(file.path)
      }
    } else {
      // Open file as a tab if tab context is available
      if (tabsContext) {
        // Extract title from filename
        const filename = file.path.split('/').pop() || file.path
        const title = filename.replace(/\.mdx?$/, '').replace(/-/g, ' ')

        // Open the tab - content will be fetched when it becomes active
        tabsContext.openTab(file.path, title)

        console.log('[QuarryViewer] Opening file in tab:', file.path)
      }

      // Always fetch content (for both tab mode and legacy mode)
      fetchFileContent(file)

      // Save last viewed file
      if (mode === 'page') {
        saveLastViewedLocation(currentPath, file.path)
      }
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
   * Get all expandable paths from the knowledge tree
   */
  const getAllExpandablePaths = useCallback((): string[] => {
    if (!knowledgeTree || knowledgeTree.length === 0) return []
    const paths: string[] = []
    const collectPaths = (nodes: typeof knowledgeTree) => {
      if (!nodes) return
      for (const node of nodes) {
        if (node.type === 'dir' || node.children?.length) {
          paths.push(node.path)
          if (node.children) {
            collectPaths(node.children)
          }
        }
      }
    }
    collectPaths(knowledgeTree)
    return paths
  }, [knowledgeTree])

  /**
   * Expand all tree nodes
   */
  const handleExpandAll = useCallback(() => {
    const allPaths = getAllExpandablePaths()
    setExpandedTreePaths(new Set(allPaths))
  }, [getAllExpandablePaths])

  /**
   * Collapse all tree nodes
   */
  const handleCollapseAll = useCallback(() => {
    setExpandedTreePaths(new Set())
  }, [])

  /**
   * Check if all nodes are expanded
   */
  const isAllExpanded = useMemo(() => {
    const allPaths = getAllExpandablePaths()
    if (!allPaths?.length) return false
    return allPaths.every(path => expandedTreePaths.has(path))
  }, [getAllExpandablePaths, expandedTreePaths])

  /**
   * Open file from knowledge tree
   * @param fullPath - Full path to the file
   * @param options - Options for opening the file
   * @param options.asPreview - Open as preview tab (single-click behavior, replaces previous preview)
   */
  const openFileFromTree = useCallback(
    async (fullPath: string, options?: { asPreview?: boolean }) => {
      console.log('[QuarryViewer] ===== openFileFromTree TRIGGERED =====')
      console.log('[QuarryViewer] fullPath:', fullPath)
      console.log('[QuarryViewer] options:', options)
      console.log('[QuarryViewer] initialView:', initialView)
      console.log('[QuarryViewer] isLocalMode:', isLocalMode)
      console.log('[QuarryViewer] tabsContext available:', !!tabsContext)
      if (!tabsContext) {
        console.warn('[QuarryViewer] tabsContext is NULL! Tabs will not work. Check OpenTabsProvider in component tree.')
      }

      // Full-page views that should navigate to main codex view when clicking a strand
      const fullPageViews = ['planner', 'search', 'research', 'new', 'analytics', 'browse', 'tags', 'graph', 'learn']

      // If in a full-page mode, navigate to main codex view to show the strand
      if (initialView && fullPageViews.includes(initialView)) {
        // Determine if this is a file or directory
        const hasExtension = /\.[a-zA-Z0-9]+$/.test(fullPath)
        let url: string
        if (hasExtension) {
          // For files, pass both path (directory) and file (full path)
          const lastSlash = fullPath.lastIndexOf('/')
          const dirPath = lastSlash > 0 ? fullPath.substring(0, lastSlash) : ''
          url = `/quarry?path=${encodeURIComponent(dirPath)}&file=${encodeURIComponent(fullPath)}`
        } else {
          // For directories, just pass path
          url = `/quarry?path=${encodeURIComponent(fullPath)}`
        }
        console.log(`[QuarryViewer] ${initialView} mode - navigating to:`, url)
        window.location.href = url
        return
      }

      const normalizedPath = fullPath.replace(/^\/+/, '')
      const segments = normalizedPath.split('/')
      const fileName = segments.pop() || normalizedPath
      const parentDir = segments.join('/')

      // In local mode, try SQLite FIRST before checking extensions
      // SQLite stores paths without .md extensions (e.g., "frame/getting-started/welcome")
      if (isLocalMode) {
        console.log('[QuarryViewer] ===== LOCAL MODE: Loading from SQLite =====')
        console.log('[QuarryViewer] normalizedPath:', normalizedPath)
        try {
          const contentStore = getContentStore()
          console.log('[QuarryViewer] Got content store, initializing...')
          // Ensure store is initialized before querying
          await contentStore.initialize()
          console.log('[QuarryViewer] Content store initialized, fetching strand for path:', normalizedPath)
          const strand = await contentStore.getStrand(normalizedPath)
          console.log('[QuarryViewer] getStrand returned:', strand ? `"${strand.title}"` : 'null')
          if (strand) {
            console.log('[QuarryViewer] SUCCESS: Loaded strand from SQLite:', strand.title, 'content length:', strand.content?.length)

            // Open tab if tabs context is available
            if (tabsContext) {
              const title = strand.title || fileName.replace(/\.mdx?$/, '').replace(/-/g, ' ')
              tabsContext.openTab(normalizedPath, title, { asPreview: options?.asPreview ?? false })
              console.log('[QuarryViewer] Opened tab:', normalizedPath, 'asPreview:', options?.asPreview ?? false)
            }

            setFileContent(strand.content || '')
            setSelectedFile({
              name: fileName,
              path: normalizedPath,
              type: 'file',
              sha: '',
              url: '',
              html_url: '',
              download_url: '',
            })
            setCurrentPath(parentDir)
            updateURL(normalizedPath)

            // Parse metadata
            if (isMarkdownFile(fileName) || !fileName.includes('.')) {
              const frontmatter = parseWikiMetadata(strand.content || '')
              setFileMetadata(frontmatter)
            }

            // Auto-close sidebar on mobile
            if (window.innerWidth < 768) {
              setSidebarOpen(false)
            }
            return
          }
          // Strand not found - treat as directory navigation
          console.log('[QuarryViewer] No strand found, treating as directory:', normalizedPath)
          setCurrentPath(normalizedPath)
          updateURL(normalizedPath)
          if (window.innerWidth < 768) {
            setSidebarOpen(false)
          }
          return
        } catch (err) {
          console.error('[QuarryViewer] SQLite error, treating as directory:', err)
          setCurrentPath(normalizedPath)
          updateURL(normalizedPath)
          if (window.innerWidth < 768) {
            setSidebarOpen(false)
          }
          return
        }
      }

      // GitHub mode: Safety check - only fetch if path looks like a file (has extension)
      // This prevents trying to fetch directories as raw files
      const hasExtension = /\.[a-zA-Z0-9]+$/.test(fileName)
      if (!hasExtension) {
        // This looks like a directory - navigate to it
        const dirFiles = await fetchContents(normalizedPath, false)
        if (dirFiles.length > 0) {
          const readmeFile = dirFiles.find((f: GitHubFile) =>
            f.type === 'file' &&
            (f.name.toLowerCase() === 'readme.md' ||
              f.name.toLowerCase() === 'index.md' ||
              f.name.toLowerCase() === '_index.md')
          ) || dirFiles.find((f: GitHubFile) =>
            f.type === 'file' && f.name.endsWith('.md')
          )
          if (readmeFile) {
            await fetchFileContent(readmeFile)
          }
        }
        if (window.innerWidth < 768) {
          setSidebarOpen(false)
        }
        return
      }

      // GitHub mode: fetch from API
      const filePayload: GitHubFile = {
        name: fileName,
        path: normalizedPath,
        type: 'file',
        sha: '',
        url: '',
        html_url: `https://github.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/blob/${REPO_CONFIG.BRANCH}/${normalizedPath}`,
        download_url: API_ENDPOINTS.raw(normalizedPath, activeBranchRef.current),
      }

      // Open tab if tabs context is available (GitHub mode)
      if (tabsContext) {
        const title = fileName.replace(/\.mdx?$/, '').replace(/-/g, ' ')
        tabsContext.openTab(normalizedPath, title, { asPreview: options?.asPreview ?? false })
        console.log('[QuarryViewer] Opened tab (GitHub mode):', normalizedPath, 'asPreview:', options?.asPreview ?? false)
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
    [currentPath, fetchContents, fetchFileContent, initialView, isLocalMode, updateURL, tabsContext]
  )

  const handleOpenSearchResult = useCallback(
    (fullPath: string) => {
      // Store the search query for scrolling after content loads
      const query = searchQuery.trim()
      if (query) {
        setScrollToSearchQuery(query)
      }
      openFileFromTree(fullPath)
    },
    [openFileFromTree, searchQuery],
  )

  /**
   * Navigate to a directory and auto-select a README/index file if present
   * Used for internal links and breadcrumb navigation
   */
  const navigateToDirectory = useCallback(
    async (path: string) => {
      console.log('[QuarryViewer] navigateToDirectory:', path, 'initialView:', initialView, 'isLocalMode:', isLocalMode)

      // Full-page views that should navigate to main codex view when clicking a strand
      const fullPageViews = ['planner', 'search', 'research', 'new', 'analytics', 'browse', 'tags', 'graph', 'learn']

      // If in a full-page mode, navigate to main codex view to show the strand
      if (initialView && fullPageViews.includes(initialView)) {
        const url = `/quarry?path=${encodeURIComponent(path)}`
        console.log(`[QuarryViewer] ${initialView} mode - navigating to:`, url)
        window.location.href = url
        return
      }

      // In local mode, just set path - tree already has the data
      if (isLocalMode) {
        console.log('[QuarryViewer] navigateToDirectory local mode:', path)
        setCurrentPath(path)
        updateURL(path)
        // Clear selected file to show folder view
        setSelectedFile(null)
        setFileContent('')
        setFileMetadata({})
        // Auto-close sidebar on mobile
        if (window.innerWidth < 768) {
          setSidebarOpen(false)
        }
        return
      }

      // GitHub mode: fetch from API
      const sortedData = await fetchContents(path, false)

      // Auto-select README or index file
      if (sortedData.length > 0) {
        const readmeFile = sortedData.find((f: GitHubFile) =>
          f.type === 'file' &&
          (f.name.toLowerCase() === 'readme.md' ||
            f.name.toLowerCase() === 'index.md' ||
            f.name.toLowerCase() === '_index.md')
        )
        // If no README, select first markdown file
        const firstMdFile = readmeFile || sortedData.find((f: GitHubFile) =>
          f.type === 'file' && f.name.endsWith('.md')
        )
        if (firstMdFile) {
          await fetchFileContent(firstMdFile)
        }
      }

      // Auto-close sidebar on mobile
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      }
    },
    [fetchContents, fetchFileContent, initialView, isLocalMode, updateURL]
  )

  /**
   * Browse a directory without auto-selecting a file
   * Used for Weave/Loom exploration where user wants to see folder contents
   *
   * @remarks
   * - Keeps current sidebar mode (respects user's view preference)
   * - Filtering is applied automatically via useSearchFilter
   * - Expands the path in tree view for visibility
   */
  const browseDirectory = useCallback(
    async (path: string) => {
      console.log('[QuarryViewer] browseDirectory:', path, 'initialView:', initialView, 'isLocalMode:', isLocalMode)

      // If in planner mode, navigate to main codex view to exit planner
      if (initialView === 'planner') {
        const url = `/codex?path=${encodeURIComponent(path)}`
        console.log('[QuarryViewer] Planner mode - navigating to:', url)
        window.location.href = url
        return
      }

      // In local mode, don't fetch from GitHub - use local tree data
      if (!isLocalMode) {
        await fetchContents(path, false)
      } else {
        console.log('[QuarryViewer] Local mode - skipping GitHub fetch, using local tree')
        setCurrentPath(path)
        updateURL(path)
      }

      // Clear selected file to show the folder browser view
      setSelectedFile(null)
      setFileContent('')
      setFileMetadata({})

      // Expand the browsed path in tree view so user can see contents
      // (works regardless of current sidebar mode)
      setExpandedTreePaths(prev => {
        const newSet = new Set(prev)
        // Expand all parent paths up to the browsed path
        const segments = path.split('/')
        let currentPath = ''
        segments.forEach(segment => {
          currentPath = currentPath ? `${currentPath}/${segment}` : segment
          newSet.add(currentPath)
        })
        return newSet
      })

      // Keep sidebar open on mobile to show folder contents
      if (window.innerWidth < 768) {
        setSidebarOpen(true)
      }
    },
    [fetchContents, initialView, isLocalMode, updateURL]
  )

  // Load from URL params on mount and when URL changes
  const urlPath = searchParams.get('path') || ''
  const urlFile = searchParams.get('file') || ''
  const urlSettings = searchParams.get('settings') === 'true'

  // Open settings modal if URL has ?settings=true (from /quarry/settings redirect)
  useEffect(() => {
    if (urlSettings && !preferencesOpen) {
      setPreferencesOpen(true)
      // Clear the query param from URL to prevent modal reopening on refresh
      const url = new URL(window.location.href)
      url.searchParams.delete('settings')
      window.history.replaceState({}, '', url.toString())
    }
  }, [urlSettings, preferencesOpen])

  useEffect(() => {
    if (isOpen && mode === 'page') {
      // Priority: URL params > last viewed > initial path
      let path = urlPath || ''
      let file = urlFile || ''

      // If file is provided but path is not, extract path from file
      if (file && !path) {
        // Extract directory path from file path (e.g., "weaves/frame/openstrand/architecture.md" -> "weaves/frame/openstrand")
        const lastSlash = file.lastIndexOf('/')
        if (lastSlash > 0) {
          path = file.substring(0, lastSlash)
        }
      }

      // If no URL params at all, try to load last viewed location or use initial props
      if (!urlPath && !urlFile) {
        // Check if we have initialFile from clean URL routing
        if (initialFile) {
          file = initialFile
          // Extract directory path from file path
          const lastSlash = initialFile.lastIndexOf('/')
          if (lastSlash > 0) {
            path = initialFile.substring(0, lastSlash)
          } else {
            path = initialPath || ''
          }
        } else if (initialPath) {
          // Use explicitly provided initial path (from URL routing)
          path = initialPath
        }
        // else: On homepage (/quarry/), start with empty path (shows root)
        // Don't restore last viewed in page mode - let URL determine location
      }

      // Only fetch contents if the path has changed or we have no files
      if (path !== currentPath || files.length === 0) {
        // In local mode, don't call GitHub API - just set path and let tree handle display
        if (isLocalMode) {
          setCurrentPath(path)
          // If we have a file to open, try to load it from SQLite
          if (file && file !== selectedFile?.path) {
            openFileFromTree(file)
          }
        } else {
          fetchContents(path).then((newFiles) => {
            if (file && file !== selectedFile?.path) {
              const allFilesForSearch = newFiles && newFiles.length > 0 ? newFiles : files
              const targetFile = allFilesForSearch.find((f) => f.path === file)
              if (targetFile) {
                fetchFileContent(targetFile)
              } else if (allFilesForSearch.length > 0) {
                // Fallback: if requested file doesn't exist (e.g., weaves/frame.md),
                // try to find a README or index file in the directory
                const fallbackFile = allFilesForSearch.find((f: GitHubFile) =>
                  f.type === 'file' &&
                  (f.name.toLowerCase() === 'readme.md' ||
                    f.name.toLowerCase() === 'index.md' ||
                    f.name.toLowerCase() === '_index.md')
                ) || allFilesForSearch.find((f: GitHubFile) =>
                  f.type === 'file' && f.name.endsWith('.md')
                )
                if (fallbackFile) {
                  fetchFileContent(fallbackFile)
                }
                // If no markdown files, just show directory browser (no file selected)
              }
            }
          })
        }
      } else if (file && file !== selectedFile?.path) {
        // Path hasn't changed, but file has
        if (isLocalMode) {
          // In local mode, use SQLite to load the file
          openFileFromTree(file)
        } else if (files.length > 0) {
          // GitHub mode: files loaded from API
          const targetFile = files.find((f) => f.path === file)
          if (targetFile) {
            fetchFileContent(targetFile)
          } else {
            // Fallback: try README/index file
            const fallbackFile = files.find((f: GitHubFile) =>
              f.type === 'file' &&
              (f.name.toLowerCase() === 'readme.md' ||
                f.name.toLowerCase() === 'index.md' ||
                f.name.toLowerCase() === '_index.md')
            ) || files.find((f: GitHubFile) =>
              f.type === 'file' && f.name.endsWith('.md')
            )
            if (fallbackFile) {
              fetchFileContent(fallbackFile)
            }
          }
        }
      }
    } else if (isOpen && files.length === 0 && !isLocalMode) {
      // Modal mode initial load - only for GitHub mode
      fetchContents(initialPath)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, urlPath, urlFile, initialFile, initialPath])

  // Listen for quarry-navigate events from SPA redirect handler
  // This handles direct URL access on quarry.space domain (e.g., /app/weaves/...)
  useEffect(() => {
    const handleQuarryNavigate = (event: CustomEvent<{ path: string }>) => {
      const path = event.detail?.path
      if (path) {
        console.log('[QuarryViewer] Handling quarry-navigate event:', path)
        // Navigate to the path
        if (path.endsWith('.md')) {
          openFileFromTree(path.startsWith('/') ? path.slice(1) : path)
        } else {
          browseDirectory(path.startsWith('/') ? path.slice(1) : path)
        }
      }
    }

    window.addEventListener('quarry-navigate', handleQuarryNavigate as EventListener)
    return () => {
      window.removeEventListener('quarry-navigate', handleQuarryNavigate as EventListener)
    }
  }, [openFileFromTree, browseDirectory])

  const isModal = mode === 'modal'

  if (!isOpen && isModal) return null

  const currentSummary =
    selectedFile && summaryIndex.size > 0 ? summaryIndex.get(selectedFile.path) ?? null : null
  const activeSearchQuery = searchQuery.trim()

  // Responsive right panel widths - More generous than left sidebar
  // S = compact, M = standard, L = expanded (larger than left sidebar)
  const rightPanelWidthClass =
    metadataPanelSize === 'm'
      ? 'md:w-[280px] lg:w-[340px] xl:w-[400px]'
      : metadataPanelSize === 'l'
        ? 'md:w-[340px] lg:w-[420px] xl:w-[500px]'
        : 'md:w-[240px] lg:w-[280px] xl:w-[320px]' // Small - compact sidebar

  const content = (
    <div className="flex flex-col w-full h-full">
      {/* Unified Header Bar - spans all sections */}
      <AnimatePresence mode="wait">
        {!navHidden && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <QuarryUnifiedHeader
              theme={preferences.theme}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => handleToggleSidebar()}
              sidebarCollapsed={preferences.sidebarCollapsed}
              onToggleSidebarCollapse={() => updateSidebarCollapsed(!preferences.sidebarCollapsed)}
              metaOpen={metaOpen}
              onToggleMeta={() => setMetaOpen((v) => !v)}
              onToggleSearchSection={() => setSearchExpanded((v) => !v)}
              searchExpanded={searchExpanded}
              onOpenSettings={() => setPreferencesOpen(true)}
              onOpenHelp={() => setHelpOpen(true)}
              onOpenBookmarks={(tab) => {
                if (tab) setBookmarksDefaultTab(tab)
                setBookmarksOpen(true)
              }}
              onResetToHome={handleResetToHome}
              onHideNav={() => setNavHidden(true)}
            >
              {/* Toolbar content goes in center slot */}
              <QuarryToolbar
                currentPath={currentPath}
                metaOpen={metaOpen}
                onToggleMeta={() => setMetaOpen((v) => !v)}
                currentFile={selectedFile ? { path: selectedFile.path, name: selectedFile.name } : null}
                isBookmarked={selectedFile ? isBookmarked(selectedFile.path) : false}
                onToggleBookmark={selectedFile ? () => toggleBookmark(selectedFile.path, selectedFile.name) : undefined}
                onOpenBookmarks={(tab?: 'bookmarks' | 'highlights' | 'history') => {
                  if (tab) setBookmarksDefaultTab(tab)
                  setBookmarksOpen(true)
                }}
                onOpenPreferences={() => setPreferencesOpen(true)}
                onOpenHelp={() => setHelpOpen(true)}
                onOpenGraph={() => setGraphOpen(true)}
                onOpenTimeline={() => setTimelineOpen(true)}
                onOpenContribute={() => setContributeOpen(true)}
                onOpenEditor={() => {
                  // Save scroll position before opening editor
                  if (contentScrollRef.current) {
                    setSavedScrollPosition(contentScrollRef.current.scrollTop)
                  }
                  setEditorDraft(null)
                  setEditorOpen(true)
                }}
                onOpenQA={() => setQAOpen(true)}
                onOpenFlashcards={() => setFlashcardsOpen(true)}
                onOpenGlossary={() => setGlossaryOpen(true)}
                onOpenQuiz={() => setQuizOpen(true)}
                onOpenMindMap={() => setMindMapOpen(true)}
                onOpenResearch={() => setResearchPopoverOpen(true)}
                onOpenShareHtml={selectedFile ? () => setShareHtmlOpen(true) : undefined}
                ttsState={tts.state}
                ttsSettings={tts.settings}
                ttsVoices={tts.availableVoices}
                ttsSupported={tts.isSupported}
                ttsHasContent={!!fileContent && fileContent.trim().length > 0}
                onTTSPlay={handleReadAloud}
                onTTSPause={tts.pause}
                onTTSResume={tts.resume}
                onTTSStop={tts.stop}
                onTTSVolumeChange={tts.setVolume}
                onTTSRateChange={tts.setRate}
                onTTSPitchChange={tts.setPitch}
                onTTSVoiceChange={tts.setVoice}
                theme={preferences.theme}
                showBlockTags={preferences.showBlockTags ?? true}
                onToggleBlockTags={handleToggleBlockTags}
                tabsVisible={tabsContext?.tabsVisible ?? true}
                onToggleTabs={tabsContext?.toggleTabsVisible}
                isFavorite={currentFileIsFavorite}
                onToggleFavorite={selectedFile ? handleToggleFavorite : undefined}
              />
            </QuarryUnifiedHeader>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating restore nav button when nav is hidden */}
      <AnimatePresence>
        {navHidden && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 0.6, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            whileHover={{ opacity: 1, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={() => setNavHidden(false)}
            className={`
              fixed top-2 left-1/2 -translate-x-1/2 z-50
              flex items-center gap-1.5 px-3 py-1.5 rounded-full
              text-xs font-medium shadow-lg backdrop-blur-sm
              transition-colors touch-manipulation
              ${preferences.theme?.includes('dark')
                ? 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                : 'bg-white/90 hover:bg-zinc-50 text-zinc-600 border border-zinc-200'
              }
            `}
            aria-label="Show navigation bar"
            title="Show navigation (⌘⇧H)"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Show Nav</span>
          </motion.button>
        )}
      </AnimatePresence>

      <div className="quarry-codex-viewer flex-1 flex overflow-hidden pb-[60px] md:pb-0 min-h-0">
        {/* Mobile Sidebar Toggle - flush left edge tab when sidebar is closed */}
        {!sidebarOpen && (
          <button
            onClick={() => handleToggleSidebar(true)}
            className="md:hidden fixed left-0 top-1/3 z-30 py-4 px-1.5 rounded-r-xl bg-zinc-100/95 dark:bg-zinc-800/95 backdrop-blur-sm text-zinc-500 dark:text-zinc-400 active:bg-zinc-200 dark:active:bg-zinc-700 shadow-lg transition-all active:scale-95 border border-l-0 border-zinc-200 dark:border-zinc-700"
            aria-label="Open sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="overflow-visible">
              <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {/* Metadata Toggle FAB (shows when panel closed on desktop, or when neither panel is open on mobile) */}
        <MetadataToggleFAB
          isOpen={metaOpen}
          onToggle={() => handleToggleMetaPanel(true)}
          theme={preferences.theme}
        />

        {/* Media Capture FAB - Opens radial menu for voice, camera, drawing */}
        <MediaCaptureFAB
          theme={preferences.theme}
          position="bottom-right"
          visible={!!selectedFile && !qaOpen}
          strandPath={selectedFile?.path}
          onInsertImage={(url) => console.log('[MediaCapture] Image:', url)}
          onInsertAudio={(url) => console.log('[MediaCapture] Audio:', url)}
          onInsertDrawing={(url) => console.log('[MediaCapture] Drawing:', url)}
          onInsertCode={(lang) => console.log('[MediaCapture] Code:', lang)}
          onMediaCaptured={async (asset: MediaAsset) => {
            console.log('[MediaCapture] Asset captured:', asset)

            // Store asset in IndexedDB for offline support
            try {
              await storeMediaAsset({
                type: asset.type as 'photo' | 'audio' | 'drawing' | 'upload',
                blob: asset.blob,
                filename: asset.filename,
                path: asset.path,
              })
              console.log('[MediaCapture] Asset stored successfully')

              // Generate rich markdown with embedded media
              let markdown: string

              if (asset.type === 'audio') {
                // Format voice note with transcription and embedded audio
                const result = await formatVoiceNote({
                  blob: asset.blob,
                  transcript: asset.transcript,
                  duration: asset.duration,
                  timestamp: new Date(),
                  embedBase64: true,
                })
                markdown = result.markdown
                console.log('[MediaCapture] Voice note formatted:', {
                  hasTranscript: !!asset.transcript,
                  duration: asset.duration,
                  isEmbedded: result.isEmbedded,
                })
              } else if (asset.type === 'photo' || asset.type === 'drawing') {
                // Format image with embedded base64
                const result = await formatImageNote({
                  blob: asset.blob,
                  type: asset.type,
                  timestamp: new Date(),
                  embedBase64: true,
                })
                markdown = result.markdown
              } else {
                // Fallback for other types
                markdown = `\n\n![${asset.type}](${asset.path})\n`
              }

              // Set pending insert and open editor if not already open
              setPendingInsert(markdown)
              if (!editorOpen) {
                // Save scroll position before opening editor
                if (contentScrollRef.current) {
                  setSavedScrollPosition(contentScrollRef.current.scrollTop)
                }
                setEditorOpen(true)
              }

              toast.success(`${asset.type.charAt(0).toUpperCase() + asset.type.slice(1)} saved`)
            } catch (err) {
              console.error('[MediaCapture] Failed to store asset:', err)
              toast.error('Failed to save media')
            }
          }}
        />

        {/* Floating Sidebar Collapse Toggle - Left sidebar */}
        {!layout.isMobile && (
          <SidebarCollapseToggle
            isOpen={sidebarOpen}
            onToggle={() => handleToggleSidebar()}
            side="left"
            theme={preferences.theme}
          />
        )}

        {/* Sidebar */}
        <QuarrySidebar
          isOpen={sidebarOpen}
          onClose={() => handleToggleSidebar(false)}
          currentPath={currentPath}
          files={files}
          filteredFiles={filteredFiles}
          selectedFile={selectedFile}
          onFileClick={handleFileClick}
          onNavigate={navigateToDirectory}
          onBrowse={browseDirectory}
          mode={sidebarMode}
          onModeChange={setSidebarMode}
          knowledgeTree={knowledgeTree}
          knowledgeTreeLoading={knowledgeTreeLoading}
          knowledgeTreeError={knowledgeTreeError}
          totalTreeStrands={totalTreeStrands}
          totalTreeWeaves={totalTreeWeaves}
          totalTreeLooms={totalTreeLooms}
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
          onSetFilterScope={setFilterScope}
          onToggleHideEmptyFolders={toggleHideEmptyFolders}
          onSetRootScope={setRootScope}
          onResetSearch={handleSearchReset}
          onResetToHome={handleResetToHome}
          onOpenHelp={() => setHelpOpen(true)}
          onOpenBookmarks={(tab?: 'bookmarks' | 'highlights' | 'history') => {
            if (tab) setBookmarksDefaultTab(tab)
            setBookmarksOpen(true)
          }}
          onOpenPreferences={() => setPreferencesOpen(true)}
          sidebarWidth={sidebarWidth}
          onSidebarWidthChange={setSidebarWidth}
          sidebarFontSize={sidebarFontSize}
          onSidebarFontSizeChange={(size) => {
            setSidebarFontSizeLocal(size)
            updateLeftSidebarFontSize(size)
          }}
          treeDensity={preferences.treeDensity}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          isAllExpanded={isAllExpanded}
          theme={preferences.theme}
          tagsIndex={tagsIndex}
          onTagClick={handleTagClick}
          fileContent={fileContent}
          onNavigateToHeading={handleNavigateToHeading}
          activeHeadingSlug={activeHeadingSlug || undefined}
          onOpenGraph={() => setFabricGraphOpen(true)}
          onMoveComplete={handleMoveComplete}
          onDeleteComplete={handleDeleteComplete}
          // Tree persistence state for status bar
          treePersistState={treePersistState}
          onSaveTree={saveTreeLocally}
          onPublishTree={() => setMoveModalOpen(true)}
          // Advanced filters
          advancedFilters={advancedFilters}
          onSetDateFilter={setDateFilter}
          onToggleTag={toggleTag}
          onSetSelectedTags={setSelectedTags}
          onSetTagMatchMode={setTagMatchMode}
          onToggleSubject={toggleSubject}
          onSetSelectedSubjects={setSelectedSubjects}
          onSetSelectedTopics={setSelectedTopics}
          onIncludePath={includePath}
          onResetAdvancedFilters={resetAdvancedFilters}
          dateIndex={dateIndex}
          metadataMap={metadataMap}
          activeAdvancedFilterCount={activeAdvancedFilterCount}
          hasAdvancedFilters={hasAdvancedFilters}
          hasHiddenItems={advancedFilters.excludedPaths.length > 0}
          // Multi-selection - always enabled, no toggle needed
          selectionMode={true}
          selectedPaths={treeSelection.selectedPaths}
          selectionStats={treeSelection.stats}
          onTogglePathSelection={treeSelection.togglePath}
          isPathSelected={treeSelection.isSelected}
          isSelectedOrAncestorSelected={treeSelection.isSelectedOrAncestorSelected}
          onSelectRecursive={treeSelection.selectRecursive}
          onToggleRecursive={treeSelection.toggleRecursive}
          onClearSelection={treeSelection.clearSelection}
          onGetAllStrandPaths={() => treeSelection.getAllStrandPaths(knowledgeTree as any)}
          onGenerateFlashcards={(strandPaths) => {
            jobQueue.enqueueFlashcards(strandPaths)
            toast.jobStarted('Flashcard Generation', strandPaths.length)
          }}
          onGenerateGlossary={(strandPaths) => {
            jobQueue.enqueueGlossary(strandPaths)
            toast.jobStarted('Glossary Generation', strandPaths.length)
          }}
          onGenerateQuiz={(strandPaths) => {
            jobQueue.enqueueQuiz(strandPaths)
            toast.jobStarted('Quiz Generation', strandPaths.length)
          }}
          // Supertags
          selectedBlockId={selectedBlockId}
          selectedStrandPath={selectedFile?.path}
          selectedTagName={selectedTagName}
          onOpenSupertagDesigner={(schema) => {
            setEditingSupertag(schema || null)
            setSupertagDesignerOpen(true)
          }}
          onPromoteTag={(tagName) => {
            // Open designer with the tag name prefilled for promotion
            setEditingSupertag(null)
            setSupertagDesignerOpen(true)
          }}
          // Sidebar collapse
          onCollapseSidebar={() => handleToggleSidebar(false)}
          // Content source for SourceModeBadge
          contentSource={contentSource}
          contentSourcePath={contentSourcePath}
          // Link preview
          previewUrl={previewUrl}
          onClearPreview={handleClearPreview}
          // Unified header mode
          hideHeader={true}
          // Search section control (from unified header)
          searchExpanded={searchExpanded}
          onSearchExpandedChange={setSearchExpanded}
        />

        {/* Main content area - toolbar now in unified header */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
          {/* API Status Banner */}
          <ApiStatusBanner
            graphqlAvailable={graphqlAvailable}
            searchAvailable={searchIndexAvailable && semanticStatus === 'ready'}
            semanticStatus={semanticStatus}
            onOpenSettings={() => {
              setPreferencesInitialTab('data')
              setPreferencesOpen(true)
            }}
          />

          {/* Pending Moves Badge - shown below API banner when there are pending moves */}
          {pendingMoves.length > 0 && (
            <div className="px-2 py-1 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end">
              <PendingMovesBadge
                count={pendingMoves.length}
                onClick={() => setMoveModalOpen(true)}
                isDark={preferences.theme?.includes('dark')}
              />
            </div>
          )}

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
          {initialView === 'planner' ? (
            <PlannerFullView
              theme={preferences.theme}
              onOpenPreferences={() => setPreferencesOpen(true)}
              onNavigateToStrand={(strandPath) => {
                console.log('[QuarryViewer] onNavigateToStrand called with:', strandPath)
                // Navigate to the main codex view with the strand path
                const url = `/codex?path=${encodeURIComponent(strandPath)}`
                console.log('[QuarryViewer] Navigating to:', url)
                // Use window.location for full navigation from planner page
                window.location.href = url
              }}
            />
          ) : initialView === 'search' ? (
            <SearchFullView
              theme={preferences.theme}
              onOpenPreferences={() => setPreferencesOpen(true)}
              onNavigateToStrand={(strandPath) => {
                const url = `/codex?path=${encodeURIComponent(strandPath)}`
                window.location.href = url
              }}
            />
          ) : initialView === 'research' ? (
            <ResearchFullView
              theme={preferences.theme}
              onOpenPreferences={() => setPreferencesOpen(true)}
              onNavigateToStrand={(strandPath) => {
                const url = `/codex?path=${encodeURIComponent(strandPath)}`
                window.location.href = url
              }}
              onPreviewLink={handlePreviewLink}
              previewUrl={previewUrl}
            />
          ) : initialView === 'new' ? (
            <NewFullView
              theme={preferences.theme}
              onOpenPreferences={() => setPreferencesOpen(true)}
              onNavigateToStrand={(strandPath) => {
                const url = `/codex?path=${encodeURIComponent(strandPath)}`
                window.location.href = url
              }}
            />
          ) : initialView === 'analytics' ? (
            <AnalyticsFullView
              theme={preferences.theme}
              onOpenPreferences={() => setPreferencesOpen(true)}
              onNavigateToStrand={(strandPath) => {
                const url = `/codex?path=${encodeURIComponent(strandPath)}`
                window.location.href = url
              }}
            />
          ) : initialView === 'browse' ? (
            <BrowseFullView
              theme={preferences.theme}
              onOpenPreferences={() => setPreferencesOpen(true)}
              onNavigateToStrand={(strandPath) => {
                const url = `/codex?path=${encodeURIComponent(strandPath)}`
                window.location.href = url
              }}
            />
          ) : initialView === 'tags' ? (
            <TagsFullView
              theme={preferences.theme}
              tagsIndex={tagsIndex}
              onOpenPreferences={() => setPreferencesOpen(true)}
              onNavigateToStrand={(strandPath) => {
                const url = `/codex?path=${encodeURIComponent(strandPath)}`
                window.location.href = url
              }}
            />
          ) : (
            <div className="flex flex-col h-full min-h-0">
              {/* Strand Tab Bar - VS Code style tabs for multiple open strands */}
              {tabsContext && tabsContext.tabsVisible && (
                <StrandTabBar
                  isDark={preferences.theme?.includes('dark') || preferences.theme === 'terminal-dark' || preferences.theme === 'oceanic-dark'}
                />
              )}

              {/* Content area */}
              <div className="flex-1 overflow-hidden h-full min-h-0">
                <QuarryContent
                  file={selectedFile}
                  content={activeTab?.content ?? fileContent}
                  metadata={(activeTab?.metadata ?? fileMetadata) as StrandMetadata}
                  loading={loading}
                  currentPath={currentPath}
                  onNavigate={navigateToDirectory}
                  onFetchFile={fetchFileContent}
                  pathname={pathname}
                  rememberScrollPosition={preferences.rememberScrollPosition ?? true}
                  theme={preferences.theme}
                  onPublish={handlePublishContent}
                  files={files}
                  onFileClick={handleFileClick}
                  filterScope={searchOptions.filterScope}
                  onActiveHeadingChange={setActiveHeadingSlug}
                  showGitHubOptions={Boolean(selectedFile?.html_url)}
                  allFiles={files}
                  totalStrands={totalTreeStrands}
                  totalWeaves={totalTreeWeaves}
                  totalLooms={totalTreeLooms}
                  onCreateHighlight={(data) => {
                    const result = handleCreateHighlight(data)
                    if (result.action === 'added') {
                      toast.success('Highlight saved!')
                    } else {
                      toast.info('Highlight removed')
                    }
                  }}
                  fileHighlights={fileHighlights}
                  scrollToSearchQuery={scrollToSearchQuery}
                  onScrollToSearchComplete={() => setScrollToSearchQuery(null)}
                  onTagClick={handleContentTagClick}
                  onContentRefChange={(ref) => { contentScrollRef.current = ref }}
                  showBlockTags={preferences.showBlockTags ?? true}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Unified (Metadata / Editor / Graph) */}
        {metaOpen && (
          <>
            {/* Mobile backdrop - higher z-index to cover everything */}
            <div
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-md"
              style={{ zIndex: Z_INDEX.rightPanelBackdrop }}
              onClick={() => handleToggleMetaPanel(false)}
            />
            <div
              className={`
              /* Mobile: compact slide-up sheet, Desktop: side panel */
              fixed md:relative
              inset-x-0 md:inset-auto md:right-0 md:top-0 md:bottom-0
              w-full ${rightPanelWidthClass}
              /* Mobile: slide up from bottom, 70% height for compact view */
              bottom-0 md:bottom-auto
              h-[70vh] max-h-[70vh] md:h-full md:max-h-full md:min-h-0
              rounded-t-2xl md:rounded-none
              ${preferences.theme === 'dark' ? 'bg-obsidian-900' : ''}
              ${preferences.theme === 'light' ? 'bg-white' : ''}
              ${preferences.theme === 'sepia-light' ? 'bg-[#FCF9F2]' : ''}
              ${preferences.theme === 'sepia-dark' ? 'bg-[#0E0704]' : ''}
              ${preferences.theme === 'terminal-light' ? 'bg-[#F0F6E8]' : ''}
              ${preferences.theme === 'terminal-dark' ? 'bg-[#0D1F0C]' : ''}
              ${preferences.theme === 'oceanic-light' ? 'bg-[#F2FBFC]' : ''}
              ${preferences.theme === 'oceanic-dark' ? 'bg-[#010408]' : ''}
              border-l-0 md:border-l ${preferences.theme.includes('dark') ? 'md:border-obsidian-800' : 'md:border-zinc-200'}
              shadow-2xl md:shadow-none
              flex flex-col
              touch-pan-y touch-pinch-zoom
              /* Animate in on mobile */
              transform transition-transform duration-300 ease-out
              md:transform-none
              /* Proper overflow for mobile */
              overflow-hidden
            `}
              style={{
                zIndex: layout.isMobile ? Z_INDEX.rightPanel : 'auto',
                touchAction: 'pan-y pinch-zoom',
                paddingBottom: layout.isMobile ? 'max(env(safe-area-inset-bottom, 0px), 16px)' : 0
              }}
            >
              {/* Mobile drag handle */}
              <div className="md:hidden flex flex-col items-center pt-2 pb-1 rounded-t-3xl">
                <div className="w-8 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
              </div>

              {/* Close button - refined design with subtle background */}
              <button
                onClick={() => handleToggleMetaPanel(false)}
                className={`
              absolute top-3 right-3 z-10 
              w-7 h-7 rounded-full
              flex items-center justify-center
              transition-all duration-200
              shadow-sm hover:shadow-md
              active:scale-95
              ${preferences.theme.includes('dark')
                    ? 'bg-zinc-800/90 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-700'
                    : 'bg-white/90 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 border border-zinc-200'
                  }
            `}
                aria-label="Close panel"
                title="Close panel (Esc)"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>

              {/* Panel Content - Show welcome stats on home, metadata when viewing a file */}
              <div className="flex-1 overflow-hidden min-h-0 h-full">
                {selectedFile ? (
                  <QuarryMetadataPanel
                    isOpen={true}
                    onClose={() => handleToggleMetaPanel(false)}
                    metadata={fileMetadata}
                    currentFile={selectedFile}
                    allFiles={files}
                    summaryInfo={currentSummary || undefined}
                    content={fileContent}
                    panelSize={metadataPanelSize}
                    onPanelSizeChange={handleMetadataPanelSizeChange}
                    currentPath={currentPath}
                    onTagClick={handleContentTagClick}
                    onNavigate={(path) => {
                      // Handle URL navigation (e.g., /quarry/browse?subject=computing)
                      if (path.startsWith('/quarry/')) {
                        window.location.href = path
                        return
                      }
                      // Handle file navigation - respect local mode
                      const file = files.find(f => f.path === path)
                      if (file) {
                        handleFileClick(file)
                      } else {
                        // Use browseDirectory which respects local mode
                        browseDirectory(path.replace(/\/[^/]+\.md$/, ''))
                      }
                    }}
                    autoExpandBacklinks={preferences.autoExpandBacklinks ?? true}
                    activeHeadingSlug={activeHeadingSlug || undefined}
                    theme={preferences.theme}
                    onMetadataSave={handleMetadataSave}
                    saveResult={lastSaveResult}
                    isSavingMetadata={isSavingMetadata}
                    contentRef={contentScrollRef}
                    blockTags={readerBlockTags}
                    blocks={blocks}
                    blocksLoading={blocksLoading}
                    onAcceptBlockTag={acceptTag}
                    onRejectBlockTag={rejectTag}
                    onAddBlockTag={addTag}
                    onRemoveBlockTag={removeTag}
                    onBlockClick={(blockId, startLine) => {
                      // Scroll to block in main content
                      if (contentScrollRef?.current) {
                        let blockElement = contentScrollRef.current.querySelector(`[data-block-id="${blockId}"]`)
                        if (!blockElement) {
                          // Try finding by block number
                          const allBlocks = contentScrollRef.current.querySelectorAll('[data-block-id]')
                          const blockNum = parseInt(blockId.replace('block-', ''), 10)
                          if (!isNaN(blockNum) && blockNum < allBlocks.length) {
                            blockElement = allBlocks[blockNum]
                          }
                        }
                        if (blockElement) {
                          blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          blockElement.classList.add('reader-highlight')
                          setTimeout(() => blockElement?.classList.remove('reader-highlight'), 2000)
                        }
                      }
                    }}
                    onParseBlocks={async () => {
                      // Trigger block parsing for current strand
                      // This would normally call an API to run the block tagging job
                      if (strandPath) {
                        try {
                          const response = await fetch('/api/jobs', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              type: 'block-tagging',
                              payload: { strandPaths: [strandPath] },
                            }),
                          })
                          if (response.ok) {
                            // Refetch blocks after job completes
                            refetch()
                          }
                        } catch (error) {
                          console.error('[QuarryViewer] Failed to trigger block parsing:', error)
                        }
                      }
                    }}
                  />
                ) : (
                  <QuarryWelcomeStats
                    theme={preferences.theme}
                    totalStrands={totalTreeStrands}
                    totalWeaves={totalTreeWeaves}
                    totalLooms={totalTreeLooms}
                    history={history}
                    bookmarks={bookmarks}
                    onNavigate={openFileFromTree}
                    panelSize={metadataPanelSize}
                    loading={knowledgeTreeLoading}
                    randomFacts={randomFacts}
                    isMobile={layout.isMobile}
                    isHomePage={pathname === '/quarry' || pathname === '/quarry/'}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {/* Bookmarks Panel (includes Bookmarks, Highlights, and History tabs) */}
        <BookmarksPanel
          isOpen={bookmarksOpen}
          onClose={() => {
            setBookmarksOpen(false)
            setBookmarksDefaultTab('bookmarks') // Reset to bookmarks for next open
          }}
          bookmarks={bookmarks}
          history={history}
          defaultTab={bookmarksDefaultTab}
          onNavigate={openFileFromTree}
          onRemoveBookmark={removeBookmark}
          onRemoveHistory={removeFromHistory}
          onClearBookmarks={clearAllBookmarks}
          onClearHistory={clearAllHistory}
          highlights={highlights}
          highlightGroups={highlightGroups}
          onRemoveHighlight={removeHighlight}
          onUpdateHighlight={updateHighlight}
          onClearHighlights={clearAllHighlights}
          onAddHighlightGroup={(name, color) => addHighlightGroup(name, color)}
        />

        {/* Preferences Modal (Consolidated Settings) */}
        <QuarrySettingsModal
          isOpen={preferencesOpen}
          onClose={() => {
            setPreferencesOpen(false)
            setPreferencesInitialTab('profile') // Reset to profile for next open
          }}
          initialTab={preferencesInitialTab}
          preferences={preferences}
          onFontSizeChange={updateFontSize}
          onTreeDensityChange={updateTreeDensity}
          onSidebarModeChange={updateDefaultSidebarMode}
          onSidebarOpenMobileChange={updateSidebarOpenMobile}
          onHistoryTrackingChange={(enabled) => {
            updateMultiple({ historyTrackingEnabled: enabled })
            if (!enabled) {
              // When disabling history tracking, clear any existing history
              clearAllHistory()
            }
          }}
          onRememberScrollPositionChange={(enabled) => {
            updateMultiple({ rememberScrollPosition: enabled })
          }}
          onAutoExpandBacklinksChange={(enabled) => {
            updateMultiple({ autoExpandBacklinks: enabled })
          }}
          onReset={resetPreferences}
          onClearAll={async () => {
            setPreferencesOpen(false)
            await clearAllCodexData()
          }}
          // TTS Settings
          ttsVoices={tts.availableVoices}
          ttsSupported={tts.isSupported}
          onTTSVoiceChange={(voiceURI) => {
            const voice = tts.availableVoices.find(v => v.voiceURI === voiceURI)
            if (voice) {
              tts.setVoice(voice)
              updateMultiple({ tts: { ...preferences.tts, voiceURI, rate: tts.settings.rate, volume: tts.settings.volume, pitch: tts.settings.pitch } })
            }
          }}
          onTTSRateChange={(rate) => {
            tts.setRate(rate)
            updateMultiple({ tts: { ...preferences.tts, rate, volume: tts.settings.volume, pitch: tts.settings.pitch } })
          }}
          onTTSVolumeChange={(volume) => {
            tts.setVolume(volume)
            updateMultiple({ tts: { ...preferences.tts, volume, rate: tts.settings.rate, pitch: tts.settings.pitch } })
          }}
          onTTSPitchChange={(pitch) => {
            tts.setPitch(pitch)
            updateMultiple({ tts: { ...preferences.tts, pitch, rate: tts.settings.rate, volume: tts.settings.volume } })
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

        {/* Knowledge Graph View (Simple spiral) */}
        {graphOpen && (
          <KnowledgeGraphView
            tree={knowledgeTree}
            selectedPath={selectedFile?.path}
            onNavigate={openFileFromTree}
            onClose={() => setGraphOpen(false)}
          />
        )}

        {/* Fabric Graph View (Advanced multi-level) */}
        {fabricGraphOpen && (
          <FabricGraphView
            tree={knowledgeTree}
            tagsIndex={tagsIndex}
            selectedPath={selectedFile?.path}
            onNavigate={openFileFromTree}
            onClose={() => setFabricGraphOpen(false)}
            theme={preferences.theme}
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

        {/* Move Publish Modal */}
        <MovePublishModal
          isOpen={moveModalOpen}
          onClose={() => setMoveModalOpen(false)}
          operations={pendingMoves}
          onPublish={handlePublishMoves}
          onClearAll={handleClearMoves}
          onRemoveOperation={handleRemoveMove}
          isDark={preferences.theme?.includes('dark')}
          publishTarget={treePersistState.publishTarget}
          onNLPProcess={(ops) => queueMoveProcessing(ops)}
        />

        {/* Supertag Designer Modal */}
        <SupertagDesignerModal
          isOpen={supertagDesignerOpen}
          onClose={() => {
            setSupertagDesignerOpen(false)
            setEditingSupertag(null)
          }}
          schema={editingSupertag}
          onSave={() => {
            // Schema saved, panel will refresh automatically
          }}
          theme={preferences.theme?.includes('dark') ? 'dark' : 'light'}
        />

        {/* Share as HTML Modal (for offline desktop sharing) */}
        {selectedFile && (
          <ShareHtmlModal
            isOpen={shareHtmlOpen}
            onClose={() => setShareHtmlOpen(false)}
            filePath={selectedFile.path}
            fileName={selectedFile.name}
            content={fileContent}
            metadata={fileMetadata}
            onExport={(result) => {
              toast.success(`Exported ${result.filename}`)
            }}
          />
        )}

        {/* Strand Editor */}
        {selectedFile && (
          <StrandEditor
            file={selectedFile}
            content={editorDraft?.content ?? fileContent}
            metadata={editorDraft?.metadata ?? fileMetadata}
            isOpen={editorOpen}
            onClose={() => {
              setEditorOpen(false)
              setEditorDraft(null)
              // Restore scroll position after editor closes
              if (savedScrollPosition !== null && contentScrollRef.current) {
                setTimeout(() => {
                  if (contentScrollRef.current) {
                    contentScrollRef.current.scrollTop = savedScrollPosition
                  }
                  setSavedScrollPosition(null)
                }, 100) // Small delay to ensure content is rendered
              }
            }}
            onSave={async (content, metadata) => {
              if (!selectedFile) return

              try {
                // Extract content body (without frontmatter)
                const contentBody = content.replace(/^---[\s\S]*?---\n*/, '')

                // Build content source config
                const contentSource = {
                  type: 'sqlite' as const,
                  isOnline: navigator.onLine,
                  lastSync: null,
                  pendingChanges: 0,
                }

                // Check for GitHub PAT
                const githubPat = preferences.githubPAT?.trim()
                const hasGitHubPat = Boolean(githubPat && githubPat.length > 0)

                // Save to local database (and GitHub if PAT configured)
                const result = await saveStrandMetadata({
                  strand: metadata,
                  originalStrand: fileMetadata,
                  contentBody,
                  strandPath: selectedFile.path,
                  contentSource,
                  vaultHandle: undefined,
                  githubConfig: hasGitHubPat ? {
                    owner: REPO_CONFIG.OWNER,
                    repo: REPO_CONFIG.NAME,
                    branch: REPO_CONFIG.BRANCH,
                    pat: githubPat,
                  } : undefined,
                })

                // Show success feedback
                if (result.savedTo.length > 0) {
                  const targetsText = result.savedTo.join(', ')
                  if (result.prUrl) {
                    toast.success(`Saved to ${targetsText}. PR created!`)
                  } else {
                    toast.success(`Saved to ${targetsText}`)
                  }

                  // Update local content state
                  setFileContent(content)
                  setFileMetadata(metadata)
                  // Note: NLP block processing is now automatic via saveStrand in localCodex
                }

                // Show any errors
                if (result.errors.length > 0) {
                  const errorText = result.errors.map(e => `${e.target}: ${e.error}`).join('; ')
                  toast.error(`Some saves failed: ${errorText}`)
                }
              } catch (error) {
                console.error('[StrandEditor] Save failed:', error)
                toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
              }

              setEditorOpen(false)
              setEditorDraft(null)
            }}
            theme={preferences.theme}
            repo={{
              owner: REPO_CONFIG.OWNER,
              repo: REPO_CONFIG.NAME,
              defaultBranch: REPO_CONFIG.BRANCH,
            }}
            onCreateHighlight={(data) => {
              const result = handleCreateHighlight(data)
              if (result.action === 'added') {
                toast.success('Highlight saved!')
              } else {
                toast.info('Highlight removed')
              }
            }}
            pendingInsert={pendingInsert}
            onPendingInsertConsumed={() => setPendingInsert(null)}
          />
        )}

        {/* Ask Tab - Unified tabulated interface (Local + LLM + Hybrid modes) */}
        {/* Unified Ask Interface - Brain + Cloud AI + Hybrid */}
        <UnifiedAskInterface
          isOpen={qaOpen}
          onClose={() => setQAOpen(false)}
          currentStrand={selectedFile?.path}
          strandContent={fileContent || ''}
          strandTitle={selectedFile?.name || fileMetadata.title}
          theme={preferences.theme || 'dark'}
          availableWeaves={[]}
          availableLooms={[]}
          availableTags={[
            ...(tagsIndex?.tags || []).map(t => t.name),
            ...(tagsIndex?.subjects || []).map(s => s.name),
            ...(tagsIndex?.topics || []).map(t => t.name),
          ]}
          totalStrands={totalTreeStrands}
          onNavigate={(path) => {
            const file = files.find(f => f.path === path)
            if (file) {
              handleFileClick(file)
            }
          }}
        />

        {/* Flashcard Quiz Popover - works with or without a strand selected */}
        {flashcardsOpen && (
          <FlashcardQuizPopover
            isOpen={flashcardsOpen}
            onClose={() => setFlashcardsOpen(false)}
            strandSlug={selectedFile?.path}
            content={fileContent || ''}
            theme={preferences.theme}
            filterOptions={{
              tags: tagsIndex?.tags?.map(t => t.name) ?? [],
              subjects: tagsIndex?.subjects?.map(s => s.name) ?? [],
              topics: tagsIndex?.topics?.map(t => t.name) ?? [],
            }}
            showFilters={!selectedFile}
            availableStrands={files
              .filter(f => f.type === 'file' && f.name.endsWith('.md'))
              .map(f => ({
                slug: f.path,
                title: f.name.replace(/\.md$/, ''),
                path: f.path,
              }))}
            onFetchStrandContent={async (path: string) => {
              const file = files.find(f => f.path === path)
              if (file && file.download_url) {
                try {
                  const response = await fetch(file.download_url)
                  if (response.ok) {
                    return await response.text()
                  }
                } catch {
                  console.error('[QuarryViewer] Failed to fetch strand content:', path)
                }
              }
              return null
            }}
          />
        )}

        {/* Glossary Popover - works with or without a strand selected */}
        {glossaryOpen && (
          <GlossaryPopover
            isOpen={glossaryOpen}
            onClose={() => setGlossaryOpen(false)}
            strandSlug={selectedFile?.path}
            content={fileContent || ''}
            theme={preferences.theme}
            availableStrands={files
              .filter(f => f.type === 'file' && f.name.endsWith('.md'))
              .map(f => ({
                slug: f.path,
                title: f.name.replace(/\.md$/, ''),
                path: f.path,
              }))}
            onFetchStrandContent={async (path: string) => {
              const file = files.find(f => f.path === path)
              if (file && file.download_url) {
                try {
                  const response = await fetch(file.download_url)
                  if (response.ok) {
                    return await response.text()
                  }
                } catch {
                  console.error('[QuarryViewer] Failed to fetch strand content:', path)
                }
              }
              return null
            }}
          />
        )}

        {/* Quiz Popover - works with or without a strand selected */}
        {quizOpen && (
          <QuizPopover
            isOpen={quizOpen}
            onClose={() => setQuizOpen(false)}
            strandSlug={selectedFile?.path}
            content={fileContent || ''}
            theme={preferences.theme}
            strandTitle={selectedFile?.name?.replace(/\.md$/, '')}
            availableStrands={files
              .filter(f => f.type === 'file' && f.name.endsWith('.md'))
              .map(f => ({
                slug: f.path,
                title: f.name.replace(/\.md$/, ''),
                path: f.path,
              }))}
            onFetchStrandContent={async (path: string) => {
              const file = files.find(f => f.path === path)
              if (file && file.download_url) {
                try {
                  const response = await fetch(file.download_url)
                  if (response.ok) {
                    return await response.text()
                  }
                } catch {
                  console.error('[QuarryViewer] Failed to fetch strand content:', path)
                }
              }
              return null
            }}
          />
        )}

        {/* Research Popover */}
        {researchPopoverOpen && (
          <ResearchPopover
            isOpen={researchPopoverOpen}
            onClose={() => setResearchPopoverOpen(false)}
            theme={preferences.theme}
            onOpenFullPage={() => {
              setResearchPopoverOpen(false)
              window.location.href = '/quarry/research'
            }}
          />
        )}

        {/* Quick Tag Popover (Cmd+T) */}
        {tagPopoverOpen && selectedFile && selectedBlockId && (
          <QuickTagPopover
            isOpen={tagPopoverOpen}
            onClose={() => setTagPopoverOpen(false)}
            blockId={selectedBlockId}
            strandPath={selectedFile.path}
            currentTags={getBlockById(selectedBlockId)?.tags ?? []}
            availableTags={tagsIndex?.tags ?? []}
            onAddTag={async (tag) => {
              await addTag(selectedBlockId, tag)
            }}
            onRemoveTag={async (tag) => {
              await removeTag(selectedBlockId, tag)
            }}
          />
        )}

        {/* Mind Map - works with or without a strand selected */}
        <StrandMindMap
          isOpen={mindMapOpen}
          onClose={() => setMindMapOpen(false)}
          currentPath={selectedFile?.path ?? ''}
          files={files}
          metadata={selectedFile ? fileMetadata as any : undefined}
          knowledgeTree={knowledgeTree}
          theme={preferences.theme}
          onNavigate={(path) => {
            const file = files.find(f => f.path === path)
            if (file) {
              handleFileClick(file)
            }
            setMindMapOpen(false)
          }}
        />

        {/* Keyboard Shortcuts Modal */}
        <KeyboardShortcutsModal
          isOpen={shortcutsOpen}
          onClose={() => setShortcutsOpen(false)}
          theme={preferences.theme}
        />

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          activeTab={selectedFile ? 'home' : undefined}
          onHome={() => {
            setSelectedFile(null)
            setFileContent('')
            setCurrentPath('')
            setSearchQuery('')
            window.location.href = '/quarry/'
          }}
          onSearch={() => {
            const input = document.getElementById('codex-search-input') as HTMLInputElement | null
            input?.focus()
            setSidebarOpen(true)
          }}
          onAsk={() => {
            setQAOpen(true)
          }}
          onInfo={() => {
            setMetaOpen(true)
            setSidebarOpen(false)
          }}
          onSettings={() => {
            setPreferencesOpen(true)
            setSidebarOpen(false)
          }}
          ttsState={tts.state}
          ttsHasContent={!!fileContent && fileContent.trim().length > 0}
          onTTSPlay={handleReadAloud}
          onTTSPause={tts.pause}
          onTTSResume={tts.resume}
          onTTSStop={tts.stop}
        />

        {/* Background Job Status Panel */}
        <JobStatusPanel
          theme={preferences.theme}
          onViewResults={(job) => {
            // Navigate to appropriate view based on job type
            if (job.type === 'flashcard_generation') {
              // Could open flashcard quiz popover
            } else if (job.type === 'glossary_generation') {
              // Could open glossary popover
            }
          }}
        />

      </div>
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
                className="codex-viewer w-full max-w-7xl h-[90vh] bg-white dark:bg-obsidian-950 border border-zinc-200 dark:border-obsidian-800 overflow-hidden shadow-2xl flex rounded-xl ring-1 ring-white/10"
              >
                {content}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    )
  }

  // Page mode - NO QuarryTopNav here since the toolbar IS the navigation
  // Left sidebar + Center toolbar/content + Optional right sidebar
  return (
    <div className="codex-viewer w-full h-[100dvh] flex flex-col md:flex-row relative overflow-hidden">
      {content}
    </div>
  )
}
