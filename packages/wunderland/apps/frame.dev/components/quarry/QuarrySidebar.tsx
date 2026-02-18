/**
 * Sidebar component for Quarry Codex viewer
 * Displays file tree, knowledge tree, breadcrumbs, and search
 * @module codex/QuarrySidebar
 */

'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, ChevronRight, ChevronDown, ChevronUp, ChevronLeft, ExternalLink, FileText, GitBranch, X, Moon, Sun, LifeBuoy, Tag, Hash, Folder, Sparkles, Layers, Box, Minus, Plus, Network, PlusCircle, Puzzle, Search, Bookmark, Highlighter, EyeOff, Eye, RotateCcw, CheckSquare, Square, ChevronsDownUp, ChevronsUpDown, Filter, CalendarDays, LayoutDashboard, BarChart3, Globe, Loader2, BookHeart, PenLine, Map, Link2, List, History, FolderOpen, HardDrive, Database, Zap, Compass, Flower2 } from 'lucide-react'
import DynamicIcon, { isValidIconName } from './ui/common/DynamicIcon'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import type { GitHubFile, KnowledgeTreeNode, SidebarMode, SearchOptions, FileFilterScope, NavigationRootScope, TagsIndex, TagIndexEntry, AdvancedFilterOptions, DateFilter, DateIndex, StrandMetadata } from './types'
import { LEVEL_STYLES, REPO_CONFIG, PAGINATION, Z_INDEX } from './constants'
import { formatNodeName, shouldShowFile } from './utils'
import SearchBar from './ui/search/SearchBar'
import FileFilterToggle from './ui/misc/FileFilterToggle'
import NavigationRootToggle from './ui/navigation/NavigationRootToggle'
// CalendarFilterWidget removed - now integrated in TaxonomyFilterBar
import FilterBadge from './ui/filters/FilterBadge'
import TagMultiSelect from './ui/tags/TagMultiSelect'
import ExcludeListManager from './ui/misc/ExcludeListManager'
import SidebarWidthControl from './ui/sidebar/SidebarWidthControl'
import StrandInsightsCard from './ui/sidebar/StrandInsightsCard'
import RepositoryIndicator from './ui/status/RepositoryIndicator'
import { FileListSkeleton, KnowledgeTreeSkeleton } from './ui/common/Skeleton'
import HierarchyBreadcrumb from './ui/misc/HierarchyBreadcrumb'
import WeaveCard from './ui/canvas/WeaveCard'
import LazyWeaveList from './ui/misc/LazyWeaveList'
import OutlineTableOfContents from './ui/misc/OutlineTableOfContents'
import { DocumentMinimap, BacklinksPanel } from './ui/outline'
import type { MinimapHeading, Backlink } from './ui/outline'

// Lazy load SidebarGraphView (D3 ~500KB) - only loaded when graph tab is active
const SidebarGraphView = dynamic(() => import('./ui/graphs/SidebarGraphView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
    </div>
  ),
})
import { CodexTreeView } from './tree'
import NodeContextMenu from './tree/NodeContextMenu'
import TreeStatusBar from './ui/status/TreeStatusBar'
import { useCollections } from '@/lib/collections'
import PluginsSidebarView from './ui/plugins/PluginsSidebarView'
import PlannerSidebarPanel from './ui/planner/PlannerSidebarPanel'
import ResearchPopover from './ui/research/ResearchPopover'
import BatchActionsBar from './ui/browse/BatchActionsBar'
import TaxonomyFilterBar from './ui/tags/TaxonomyFilterBar'
import QuarryBrand from './ui/quarry-core/QuarryBrand'
import QueryBuilderSidebarPanel from './ui/query/QueryBuilderSidebarPanel'
import SupertagsSidebarPanel from './ui/supertags/SupertagsSidebarPanel'
import LinkPreviewPanel from './ui/misc/LinkPreviewPanel'
// Pomodoro removed from main sidebar - use dedicated widgets in Write/Reflect pages
import { useToast } from './ui/common/Toast'
import { useCachePreload } from './hooks/useCachePreload'
import type { ContentSource } from '@/lib/content/types'
import { isElectronMac, isElectron } from '@/lib/electron'
import { pluginUIRegistry } from '@/lib/plugins/QuarryPluginAPI'
import { quarryPluginManager } from '@/lib/plugins/QuarryPluginManager'
import { createPluginAPI } from '@/lib/plugins/QuarryPluginAPI'
import { useInstanceConfig } from '@/lib/config'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import { DEFAULT_WEAVES } from '@/lib/codexDatabase'
import { FavoritesSidebarSection } from './ui/sidebar/sections'

interface QuarrySidebarProps {
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
  /** Navigate to directory (auto-selects README if present) */
  onNavigate: (path: string) => void
  /** Browse directory without auto-selecting a file (for weave/loom exploration) */
  onBrowse?: (path: string) => void
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
  /** Total looms in tree */
  totalTreeLooms: number
  /** Expanded tree paths */
  expandedTreePaths: Set<string>
  /** Toggle tree path */
  onToggleTreePath: (path: string) => void
  /** Open file from tree */
  onOpenFileFromTree: (path: string, options?: { asPreview?: boolean }) => void
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
  /** Set file filter scope */
  onSetFilterScope: (scope: FileFilterScope) => void
  /** Toggle hide empty folders */
  onToggleHideEmptyFolders: () => void
  /** Set navigation root scope */
  onSetRootScope: (scope: NavigationRootScope) => void
  /** Reset search filters */
  onResetSearch: () => void
  /** Reset to home state (clear selection, reset navigation, close file) */
  onResetToHome?: () => void
  /** Open help panel */
  onOpenHelp: () => void
  /** Open bookmarks panel (with optional tab: 'bookmarks' | 'highlights' | 'history') */
  onOpenBookmarks?: (tab?: 'bookmarks' | 'highlights' | 'history') => void
  /** Open preferences */
  onOpenPreferences?: () => void
  /** Sidebar width */
  sidebarWidth?: number
  /** Change sidebar width */
  onSidebarWidthChange?: (width: number) => void
  /** Sidebar font size scale (0=xs, 1=sm, 2=base, 3=lg) */
  sidebarFontSize?: number
  /** Change sidebar font size */
  onSidebarFontSizeChange?: (size: number) => void
  /** Tree density ('compact', 'normal', 'comfortable') */
  treeDensity?: 'compact' | 'normal' | 'comfortable'
  /** Expand all tree nodes */
  onExpandAll?: () => void
  /** Collapse all tree nodes */
  onCollapseAll?: () => void
  /** Whether all nodes are currently expanded */
  isAllExpanded?: boolean
  /** Current theme */
  theme?: string
  /** Tags and taxonomy index */
  tagsIndex?: TagsIndex
  /** Navigate to tag filter page */
  onTagClick?: (type: 'tag' | 'subject' | 'topic' | 'skill', value: string) => void
  /** Current file content for TOC outline */
  fileContent?: string
  /** Navigate to heading in content */
  onNavigateToHeading?: (slug: string) => void
  /** Currently active heading slug (from scroll position) */
  activeHeadingSlug?: string
  /** Open fabric graph view */
  onOpenGraph?: () => void
  /** Enable enhanced drag-and-drop tree (react-arborist) */
  enableDragDropTree?: boolean
  /** Callback when tree structure changes via drag-and-drop */
  onTreeChange?: (data: any[]) => void
  /** Callback when files are moved via drag-and-drop (for publish flow) */
  onMoveComplete?: (operations: import('./tree/types').MoveOperation[]) => void
  /** Callback when files are deleted (for publish flow) */
  onDeleteComplete?: (operations: import('./tree/types').DeleteOperation[]) => void
  /** Tree persistence state for status bar */
  treePersistState?: import('@/lib/planner/hooks/useTreePersistence').TreePersistenceState
  /** Save tree changes to local storage */
  onSaveTree?: () => Promise<boolean>
  /** Open publish modal */
  onPublishTree?: () => void
  // === Advanced Filter Props ===
  /** Current advanced filter options */
  advancedFilters?: AdvancedFilterOptions
  /** Set date filter */
  onSetDateFilter?: (filter: DateFilter) => void
  /** Toggle a tag selection */
  onToggleTag?: (tag: string) => void
  /** Set all selected tags */
  onSetSelectedTags?: (tags: string[]) => void
  /** Set tag match mode */
  onSetTagMatchMode?: (mode: 'any' | 'all') => void
  /** Toggle a subject selection */
  onToggleSubject?: (subject: string) => void
  /** Set all selected subjects */
  onSetSelectedSubjects?: (subjects: string[]) => void
  /** Set all selected topics */
  onSetSelectedTopics?: (topics: string[]) => void
  /** Include a path (remove from exclusion) */
  onIncludePath?: (path: string) => void
  /** Reset all advanced filters */
  onResetAdvancedFilters?: () => void
  /** Date index for calendar */
  dateIndex?: DateIndex
  /** Metadata map for strand filtering */
  metadataMap?: Map<string, StrandMetadata>
  /** Count of active advanced filters */
  activeAdvancedFilterCount?: number
  /** Whether any advanced filters are active */
  hasAdvancedFilters?: boolean
  /** Whether there are hidden items (for position tracking) */
  hasHiddenItems?: boolean

  // === Multi-Selection Props ===
  /** Whether selection mode is active */
  selectionMode?: boolean
  /** Toggle selection mode */
  onToggleSelectionMode?: () => void
  /** Selected paths for multi-select */
  selectedPaths?: Set<string>
  /** Selection statistics */
  selectionStats?: { total: number; strands: number; looms: number; weaves: number }
  /** Toggle a path selection */
  onTogglePathSelection?: (path: string, level?: 'weave' | 'loom' | 'strand' | 'other') => void
  /** Check if a path is selected */
  isPathSelected?: (path: string) => boolean
  /** Check if a path or any of its ancestors is selected */
  isSelectedOrAncestorSelected?: (path: string, ancestorPaths: string[]) => boolean
  /** Select a path and all its children recursively */
  onSelectRecursive?: (path: string, allPaths: string[]) => Promise<void> | void
  /** Toggle recursive selection - if selected, deselect all; otherwise select all */
  onToggleRecursive?: (path: string, allPaths: string[]) => Promise<void> | void
  /** Clear all selections */
  onClearSelection?: () => void
  /** Get all strand paths from selection */
  onGetAllStrandPaths?: () => string[]
  /** Generate flashcards from selection */
  onGenerateFlashcards?: (strandPaths: string[]) => void
  /** Generate glossary from selection */
  onGenerateGlossary?: (strandPaths: string[]) => void
  /** Generate quiz from selection */
  onGenerateQuiz?: (strandPaths: string[]) => void
  /** Current content source info */
  contentSource?: ContentSource | null
  /** Display path for filesystem/bundled modes */
  contentSourcePath?: string
  /** Callback to open content source settings */
  onOpenContentSourceSettings?: () => void

  // === Supertags Props ===
  /** Selected block ID for applying supertags */
  selectedBlockId?: string
  /** Current strand path for supertag context */
  selectedStrandPath?: string
  /** Currently selected tag name (when clicked from content) */
  selectedTagName?: string
  /** Callback when applying a supertag to content */
  onApplySupertag?: (schema: import('@/lib/supertags').SupertagSchema) => void
  /** Callback to open supertag schema designer modal */
  onOpenSupertagDesigner?: (schema?: import('@/lib/supertags').SupertagSchema) => void
  /** Callback to promote a lightweight tag to supertag */
  onPromoteTag?: (tagName: string) => void

  // === Sidebar Collapse Props ===
  /** Callback to collapse/hide the sidebar */
  onCollapseSidebar?: () => void

  // === Link Preview Props ===
  /** URL currently being previewed in sidebar */
  previewUrl?: string | null
  /** Callback to clear the preview */
  onClearPreview?: () => void

  // === Unified Header Props ===
  /** Hide the internal header (when using unified header) */
  hideHeader?: boolean

  // === Search Section Control (when using unified header) ===
  /** Whether search section is expanded (controlled from outside) */
  searchExpanded?: boolean
  /** Callback when search expanded state changes */
  onSearchExpandedChange?: (expanded: boolean) => void
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
 * <QuarrySidebar
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
export default function QuarrySidebar({
  isOpen,
  onClose,
  currentPath,
  files,
  filteredFiles,
  selectedFile,
  onFileClick,
  onNavigate,
  onBrowse,
  mode,
  onModeChange,
  knowledgeTree,
  knowledgeTreeLoading,
  knowledgeTreeError,
  totalTreeStrands,
  totalTreeWeaves,
  totalTreeLooms,
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
  onSetFilterScope,
  onToggleHideEmptyFolders,
  onSetRootScope,
  onResetSearch,
  onResetToHome,
  onOpenHelp,
  onOpenBookmarks,
  onOpenPreferences,
  sidebarWidth = 340,
  onSidebarWidthChange,
  sidebarFontSize = 1,
  onSidebarFontSizeChange,
  treeDensity = 'normal',
  onExpandAll,
  onCollapseAll,
  isAllExpanded = false,
  theme: propsTheme,
  tagsIndex,
  onTagClick,
  fileContent,
  onNavigateToHeading,
  activeHeadingSlug,
  onOpenGraph,
  enableDragDropTree = true, // Enhanced tree with WeaveCards, hierarchy labels, tags + drag-drop
  onTreeChange,
  onMoveComplete,
  onDeleteComplete,
  treePersistState,
  onSaveTree,
  onPublishTree,
  // Advanced filters
  advancedFilters,
  onSetDateFilter,
  onToggleTag,
  onSetSelectedTags,
  onSetTagMatchMode,
  onToggleSubject,
  onSetSelectedSubjects,
  onSetSelectedTopics,
  onIncludePath,
  onResetAdvancedFilters,
  dateIndex,
  metadataMap,
  activeAdvancedFilterCount = 0,
  hasAdvancedFilters = false,
  hasHiddenItems = false,
  // Multi-selection
  selectionMode = false,
  onToggleSelectionMode,
  selectedPaths,
  selectionStats = { total: 0, strands: 0, looms: 0, weaves: 0 },
  onTogglePathSelection,
  isPathSelected,
  isSelectedOrAncestorSelected,
  onSelectRecursive,
  onToggleRecursive,
  onClearSelection,
  onGetAllStrandPaths,
  onGenerateFlashcards,
  onGenerateGlossary,
  onGenerateQuiz,
  contentSource,
  contentSourcePath,
  onOpenContentSourceSettings,
  // Supertags
  selectedBlockId,
  selectedStrandPath,
  selectedTagName,
  onApplySupertag,
  onOpenSupertagDesigner,
  onPromoteTag,
  onCollapseSidebar,
  // Link Preview
  previewUrl,
  onClearPreview,
  // Unified Header
  hideHeader = false,
  searchExpanded: controlledSearchExpanded,
  onSearchExpandedChange,
}: QuarrySidebarProps) {
  // v2.1.0 - 2026-01-06 - removed debug logging

  const router = useRouter()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const effectiveTheme = (propsTheme || resolvedTheme || 'light') as 'dark' | 'light'
  const toast = useToast()

  // Collections management (for favorites and add-to-collection)
  const {
    collections,
    isFavorite,
    toggleFavorite,
    getFavoritesCollection,
    getCollectionsForStrand,
    addStrandToCollection,
    removeStrandFromCollection,
  } = useCollections()

  // Filter out system collections (like Favorites) for the "Add to Collection" menu
  const userCollections = useMemo(() => {
    return collections
      .filter(c => !c.isSystem)
      .map(c => ({ id: c.id, title: c.title, icon: c.icon, color: c.color }))
  }, [collections])

  // Handler for toggling a strand in a collection
  const handleToggleCollection = useCallback((strandPath: string, collectionId: string) => {
    const strandCollections = getCollectionsForStrand(strandPath)
    const isInCollection = strandCollections.some(c => c.id === collectionId)
    if (isInCollection) {
      removeStrandFromCollection(collectionId, strandPath)
    } else {
      addStrandToCollection(collectionId, strandPath)
    }
  }, [getCollectionsForStrand, addStrandToCollection, removeStrandFromCollection])

  // Wait for client-side mount to avoid hydration mismatch with theme
  useEffect(() => {
    setMounted(true)
  }, [])

  // Cache preloading for learning features (flashcards, quiz, glossary)
  const { preloadStrand, cancelPreload } = useCachePreload({
    hoverDelay: 200, // Slightly longer delay to avoid preloading on quick scrolls
  })

  // Get dynamic instance naming
  const { codexName } = useInstanceConfig()

  // Domain-aware path resolution
  const resolvePath = useQuarryPath()

  // Track if we're on desktop (for SSR-safe width calculations)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768)
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // Double-click detection for VS Code-style tab behavior
  const lastClickRef = useRef<{ path: string; time: number } | null>(null)
  const DOUBLE_CLICK_DELAY = 300 // ms

  // Quick menu state
  const [quickMenuOpen, setQuickMenuOpen] = useState(false)

  // Research popover state
  const [researchPopoverOpen, setResearchPopoverOpen] = useState(false)

  // Outline sub-tab state ('outline' | 'minimap' | 'backlinks')
  type OutlineSubTab = 'outline' | 'minimap' | 'backlinks'
  const [outlineSubTab, setOutlineSubTab] = useState<OutlineSubTab>('outline')

  // Scroll progress for minimap (calculated from content)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [viewportFraction, setViewportFraction] = useState(0.2)

  // Detect if running in Electron (for window drag region) and specifically Mac (for traffic light padding)
  const [isElectronApp, setIsElectronApp] = useState(false)
  const [isElectronMacApp, setIsElectronMacApp] = useState(false)
  useEffect(() => {
    setIsElectronApp(isElectron())
    setIsElectronMacApp(isElectronMac())
  }, [])

  // Close quick menu on Escape key
  useEffect(() => {
    if (!quickMenuOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setQuickMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [quickMenuOpen])

  // Quarry Plugin System: Subscribe to plugin sidebar modes
  const [pluginSidebarModes, setPluginSidebarModes] = useState<typeof pluginUIRegistry.allSidebarModes>([])
  useEffect(() => {
    setPluginSidebarModes(pluginUIRegistry.allSidebarModes)
    const unsubscribe = pluginUIRegistry.onChange(() => {
      setPluginSidebarModes([...pluginUIRegistry.allSidebarModes])
    })
    return unsubscribe
  }, [])

  // Filter for enabled plugins only
  const activeSidebarModes = pluginSidebarModes.filter(({ pluginId }) =>
    quarryPluginManager.isEnabled(pluginId)
  )

  // Auto-switch away from plugin mode if plugin gets disabled
  useEffect(() => {
    const builtInModes: Array<string> = ['tree', 'toc', 'supertags', 'graph', 'query', 'plugins', 'planner', 'collections', 'insights']
    const isPluginMode = !builtInModes.includes(mode)
    if (isPluginMode) {
      const modeStillActive = activeSidebarModes.some(({ options }) =>
        `plugin-${options.id}` === mode || options.id === mode
      )
      if (!modeStillActive) {
        onModeChange('tree')
      }
    }
  }, [mode, activeSidebarModes, onModeChange])

  // Tree density affects row height and base spacing
  // compact = tighter spacing, normal = default, comfortable = more spacing
  const densityIndex = { compact: 0, normal: 1, comfortable: 2 }[treeDensity] ?? 1

  // Font size scaling - uses CSS variables set on container for consistent sizing
  // The CSS vars (--sidebar-font-base, --sidebar-font-sm, --sidebar-font-xs) adjust based on sidebarFontSize
  // These classes use the CSS variables for dynamic font scaling
  const fontScale = {
    // Main text size - uses --sidebar-font-base
    text: 'text-[length:var(--sidebar-font-base)]',
    // Secondary text size - uses --sidebar-font-sm
    textSm: 'text-[length:var(--sidebar-font-sm)]',
    // Tertiary/meta text size - uses --sidebar-font-xs
    textXs: 'text-[length:var(--sidebar-font-xs)]',
    // Icons - affected by both font size and density
    icon: ['w-2 h-2', 'w-2.5 h-2.5', 'w-3 h-3', 'w-3.5 h-3.5'][sidebarFontSize + densityIndex] || 'w-2.5 h-2.5',
    iconSm: ['w-1.5 h-1.5', 'w-2 h-2', 'w-2.5 h-2.5', 'w-3 h-3'][sidebarFontSize] || 'w-2 h-2',
    // Spacing - primarily affected by density
    gap: ['gap-0.5', 'gap-1', 'gap-1.5'][densityIndex] || 'gap-1',
    py: ['py-0.5', 'py-1', 'py-1.5'][densityIndex] || 'py-1',
    px: ['px-1', 'px-1.5', 'px-2'][densityIndex] || 'px-1.5',
    // Row height for tree items
    rowHeight: [24, 28, 34][densityIndex] || 28,
  }


  // Pagination
  const [displayLimit, setDisplayLimit] = useState<number>(PAGINATION.INITIAL_LIMIT)
  const displayedFiles = filteredFiles.slice(0, displayLimit)
  const hasMore = filteredFiles.length > displayLimit

  useEffect(() => {
    setDisplayLimit(PAGINATION.INITIAL_LIMIT)
  }, [filteredFiles])

  // Helper: Check if a strand matches the active advanced filters
  const matchesAdvancedFilters = (path: string): boolean => {
    if (!advancedFilters || !metadataMap) return true

    const metadata = metadataMap.get(path)
    if (!metadata) return true // No metadata available, don't filter out

    // Check excluded paths
    if (advancedFilters.excludedPaths?.includes(path)) {
      return false
    }

    // Check date filter
    if (advancedFilters.dateFilter && advancedFilters.dateFilter.mode !== 'none') {
      const dateValue = metadata.date || metadata.createdAt || metadata.created
      if (dateValue) {
        const dateStr = typeof dateValue === 'string' ? dateValue : new Date(dateValue).toISOString().split('T')[0]
        const { mode, startDate, endDate } = advancedFilters.dateFilter

        if (mode === 'single' && startDate) {
          if (dateStr !== startDate) return false
        } else if (mode === 'range' && startDate && endDate) {
          if (dateStr < startDate || dateStr > endDate) return false
        }
      } else {
        // No date in metadata, filter out if date filter is active
        return false
      }
    }

    // Check tags filter
    if (advancedFilters.selectedTags && advancedFilters.selectedTags.length > 0) {
      const strandTags = metadata.tags
        ? (Array.isArray(metadata.tags) ? metadata.tags : [metadata.tags])
        : []

      if (strandTags.length === 0) return false

      const matchMode = advancedFilters.tagMatchMode || 'any'
      if (matchMode === 'all') {
        // ALL mode: strand must have all selected tags
        if (!advancedFilters.selectedTags.every(tag => strandTags.includes(tag))) {
          return false
        }
      } else {
        // ANY mode: strand must have at least one selected tag
        if (!advancedFilters.selectedTags.some(tag => strandTags.includes(tag))) {
          return false
        }
      }
    }

    // Check subjects filter
    if (advancedFilters.selectedSubjects && advancedFilters.selectedSubjects.length > 0) {
      const strandSubjects = metadata.taxonomy?.subjects || []
      if (strandSubjects.length === 0) return false

      // ANY mode for subjects (at least one match)
      if (!advancedFilters.selectedSubjects.some(subject => strandSubjects.includes(subject))) {
        return false
      }
    }

    // Check topics filter
    if (advancedFilters.selectedTopics && advancedFilters.selectedTopics.length > 0) {
      const strandTopics = metadata.taxonomy?.topics || []
      if (strandTopics.length === 0) return false

      // ANY mode for topics (at least one match)
      if (!advancedFilters.selectedTopics.some(topic => strandTopics.includes(topic))) {
        return false
      }
    }

    return true
  }

  // Helper: filter knowledge tree by current file filter scope and root scope
  const filteredTree = useMemo(() => {
    // Guard: if tree is loading or empty, return empty array to avoid race conditions
    if (knowledgeTreeLoading || knowledgeTree.length === 0) {
      return []
    }

    // Debug logging
    console.log('[QuarrySidebar] filteredTree input:', {
      knowledgeTreeLength: knowledgeTree.length,
      rootScope: searchOptions.rootScope,
      filterScope: searchOptions.filterScope,
      topLevelNodes: knowledgeTree.map(n => ({ name: n.name, path: n.path, level: n.level, childCount: n.children?.length || 0 })),
    })

    // First filter by root scope
    let treeToFilter = knowledgeTree
    if (searchOptions.rootScope === 'fabric') {
      // Only show weaves/ subtree
      // Check if tree has a 'weaves' wrapper node (GitHub structure) or direct weaves (SQLite structure)
      const weavesNode = knowledgeTree.find(n => n.path === 'weaves')
      console.log('[QuarrySidebar] weavesNode:', weavesNode ? { name: weavesNode.name, children: weavesNode.children?.length } : null)
      if (weavesNode?.children) {
        // GitHub structure: weaves are nested under a 'weaves' node
        treeToFilter = weavesNode.children
      } else if (knowledgeTree.every(n => n.level === 'weave')) {
        // SQLite structure: weaves are at the top level directly
        treeToFilter = knowledgeTree
      } else {
        console.warn('[QuarrySidebar] No weaves found, returning empty tree')
        treeToFilter = []
      }
    }

    function filterNode(node: KnowledgeTreeNode): KnowledgeTreeNode | null {
      if (node.type === 'file') {
        // For SQLite strands (level === 'strand'), the name is the title not filename
        // So we can't use shouldShowFile which checks for .md extension
        // Strands from SQLite are already markdown files - always show them for 'strands' scope
        const isStrandFromSqlite = node.level === 'strand'

        let matchesFileType = false
        if (isStrandFromSqlite && searchOptions.filterScope === 'strands') {
          // SQLite strands are always markdown - show them
          matchesFileType = true
        } else if (isStrandFromSqlite && searchOptions.filterScope === 'all') {
          // Show all files
          matchesFileType = true
        } else {
          // For GitHub files or other scopes, use the normal check
          matchesFileType = shouldShowFile(
            { name: node.name, path: node.path, type: 'file' } as any,
            searchOptions.filterScope,
            false,
            []
          )
        }
        if (!matchesFileType) return null

        // Then check if it matches advanced filters (metadata-based)
        const matchesFilters = matchesAdvancedFilters(node.path)
        return matchesFilters ? node : null
      }

      // Directory: recursively filter children
      if (!node.children) return null

      const keptChildren = node.children
        .map(filterNode)
        .filter((c): c is KnowledgeTreeNode => c !== null)

      // If no children remain after filtering, hide this directory too (cascading hide)
      if (keptChildren.length === 0) {
        // Hide empty folders completely when filters are active, regardless of hideEmptyFolders setting
        // This implements the cascading hide: if all strands are filtered out, hide the loom/weave
        if (hasAdvancedFilters) {
          return null
        }
        return searchOptions.hideEmptyFolders ? null : { ...node, children: [] }
      }

      return { ...node, children: keptChildren }
    }
    const result = treeToFilter
      .map(filterNode)
      .filter((n): n is KnowledgeTreeNode => n !== null)

    // Ensure all DEFAULT_WEAVES are present even if empty
    // This makes the weave structure visible to users so they know where to add content
    const resultWithDefaults = [...result]
    for (const weave of DEFAULT_WEAVES) {
      const existingWeave = resultWithDefaults.find(n => n.path === weave.slug || n.path === `weaves/${weave.slug}`)
      if (!existingWeave) {
        // Create placeholder weave node
        resultWithDefaults.push({
          id: weave.id,
          path: weave.slug,
          name: weave.name,
          level: 'weave',
          type: 'dir',
          children: [],
          emoji: weave.emoji,
          description: weave.description,
          sortOrder: weave.sortOrder,
          strandCount: 0,
          loomCount: 0,
        } as KnowledgeTreeNode)
      }
    }

    // Sort by sortOrder to maintain consistent ordering
    resultWithDefaults.sort((a, b) => {
      const aOrder = (a as any).sortOrder ?? 999
      const bOrder = (b as any).sortOrder ?? 999
      return aOrder - bOrder
    })

    console.log('[QuarrySidebar] filteredTree result:', {
      inputCount: treeToFilter.length,
      outputCount: resultWithDefaults.length,
      result: resultWithDefaults.map(n => ({
        name: n.name,
        path: n.path,
        level: n.level,
        childCount: n.children?.length || 0,
        children: n.children?.slice(0, 5).map(c => ({
          name: c.name,
          level: c.level,
          type: c.type,
          childCount: c.children?.length || 0,
        }))
      }))
    })

    return resultWithDefaults
  }, [knowledgeTree, knowledgeTreeLoading, searchOptions.filterScope, searchOptions.hideEmptyFolders, searchOptions.rootScope, advancedFilters, metadataMap, hasAdvancedFilters])

  /**
   * Render a single tree node recursively
   */
  const renderTreeNode = (node: KnowledgeTreeNode, depth = 0): React.ReactNode => {
    const isDir = node.type === 'dir'
    const isExpanded = expandedTreePaths.has(node.path)
    const isSelected = selectedFile?.path === node.path
    const levelStyle = LEVEL_STYLES[node.level] ?? LEVEL_STYLES.folder
    const LevelIcon = levelStyle.icon

    // Special rendering for weaves at top level
    if (node.level === 'weave' && depth === 0) {
      return (
        <div key={node.path} className="space-y-2">
          <WeaveCard
            node={node}
            isActive={isSelected || currentPath.startsWith(node.path)}
            isExpanded={isExpanded}
            onToggle={() => onToggleTreePath(node.path)}
            onNavigate={(path) => {
              // Use onBrowse for folder exploration (no auto-select file)
              // Falls back to onNavigate if onBrowse not provided
              const navigateFn = onBrowse || onNavigate
              navigateFn(path)
              if (window.innerWidth < 768) onClose()
            }}
            onToggleLoom={(loomPath) => onToggleTreePath(loomPath)}
            theme={effectiveTheme}
          />

          {/* Render expanded weave children (looms) in the main tree */}
          <AnimatePresence>
            {isExpanded && node.children && node.children.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="ml-1.5 pl-1 border-l-2 border-zinc-200 dark:border-zinc-700 overflow-hidden"
              >
                {node.children.map((child) => renderTreeNode(child, depth + 1))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    }

    // Special rendering for looms - ULTRA COMPACT
    if (node.level === 'loom') {
      return (
        <motion.div
          key={node.path}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className={`relative ${depth > 0 ? 'pl-1' : ''}`}>
            {depth > 0 && (
              <span
                className="pointer-events-none absolute left-0 top-0 bottom-0 border-l border-amber-300 dark:border-amber-800"
                aria-hidden
              />
            )}
            <motion.button
              onClick={(e) => {
                e.stopPropagation()
                console.log('[QuarrySidebar] LOOM CLICK:', { name: node.name, path: node.path, level: node.level })
                onToggleTreePath(node.path)
                const browseFn = onBrowse || onNavigate
                browseFn(node.path)
                if (window.innerWidth < 768) onClose()
              }}
              onPointerDown={() => console.log('[QuarrySidebar] LOOM POINTER DOWN:', node.name)}
              whileHover={{ x: 1 }}
              whileTap={{ scale: 0.99 }}
              className={`group w-full flex items-center gap-1 rounded px-1 py-0.5 text-left transition-all min-h-[22px] ${isSelected || currentPath === node.path
                ? 'bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700'
                : 'hover:bg-amber-50 dark:hover:bg-amber-900/20'
                }`}
              style={node.style?.backgroundColor ? { backgroundColor: node.style.backgroundColor } : undefined}
              aria-expanded={isExpanded}
            >
              {/* Loom Icon - supports custom emoji/thumbnail/Lucide icon */}
              {node.style?.emoji ? (
                <span className={fontScale.text}>{node.style.emoji}</span>
              ) : node.style?.icon && isValidIconName(node.style.icon) ? (
                <DynamicIcon
                  name={node.style.icon}
                  className={`${fontScale.icon} flex-shrink-0`}
                  style={{ color: node.style?.accentColor || 'rgb(217 119 6)' }}
                  aria-label={`${node.name} icon`}
                />
              ) : (
                <Box
                  className={`${fontScale.icon} flex-shrink-0`}
                  style={{ color: node.style?.accentColor || undefined }}
                  color={node.style?.accentColor ? undefined : 'rgb(217 119 6)'}
                />
              )}

              {/* Name */}
              <span
                className={`flex-1 ${fontScale.text} font-semibold truncate capitalize ${node.style?.darkText ? 'text-zinc-900' : 'text-zinc-800 dark:text-zinc-100'}`}
                style={node.style?.textColor ? { color: node.style.textColor } : undefined}
              >
                {formatNodeName(node.name)}
              </span>

              {/* Badges */}
              <div className="flex items-center gap-0.5 flex-shrink-0 ml-auto">
                <span
                  className={`${fontScale.textXs} font-bold px-1 rounded ${node.style?.accentColor ? 'text-white' : 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200'}`}
                  style={node.style?.accentColor ? { backgroundColor: node.style.accentColor } : undefined}
                >
                  {node.strandCount}
                </span>
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <ChevronRight className={`${fontScale.iconSm} text-amber-500`} />
                </motion.div>
              </div>
            </motion.button>
          </div>

          {/* Loom Children */}
          <AnimatePresence>
            {isExpanded && node.children && node.children.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="ml-1.5 border-l border-amber-200 dark:border-amber-800/50 pl-1 overflow-hidden"
              >
                {node.children.map((child) => renderTreeNode(child, depth + 1))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )
    }

    // Default rendering for other nodes (strands, folders) - ULTRA COMPACT
    return (
      <motion.div
        key={node.path}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: depth * 0.01 }}
      >
        <div className={`relative ${depth > 0 ? 'pl-1' : ''}`}>
          {/* Connecting line for nested items */}
          {depth > 0 && (
            <span
              className="pointer-events-none absolute left-0 top-0 bottom-0 border-l border-dashed border-zinc-200 dark:border-zinc-700"
              aria-hidden
            />
          )}

          {/* Right-click context menu wrapper */}
          <NodeContextMenu
            node={{
              id: node.path,
              name: node.name,
              path: node.path,
              level: node.level,
              type: node.type,
              strandCount: node.strandCount ?? 0,
              isDraggable: !isDir,
              isDroppable: isDir,
            }}
            canHaveChildren={isDir}
            isDark={theme === 'dark'}
            onOpenExternal={() => {
              onOpenFileFromTree(node.path, { asPreview: false })
            }}
            onPreview={() => {
              onOpenFileFromTree(node.path, { asPreview: true })
            }}
            onCopyPath={() => {
              navigator.clipboard.writeText(node.path)
              toast?.success('Path copied to clipboard')
            }}
            onCopyMarkdownLink={() => {
              const title = formatNodeName(node.name)
              const link = `[${title}](/${node.path})`
              navigator.clipboard.writeText(link)
              toast?.success('Markdown link copied')
            }}
            onCreateStrand={isDir ? () => {
              // Navigate to new strand creation with parent path pre-filled
              router.push(`/quarry/new?parent=${encodeURIComponent(node.path)}`)
            } : undefined}
            onCreateFolder={isDir ? () => {
              // Navigate to new folder creation
              router.push(`/quarry/new?parent=${encodeURIComponent(node.path)}&type=folder`)
            } : undefined}
            isFavorite={!isDir && isFavorite(node.path)}
            onToggleFavorite={!isDir ? () => toggleFavorite(node.path) : undefined}
            collections={!isDir ? userCollections : undefined}
            strandCollectionIds={!isDir ? getCollectionsForStrand(node.path).map(c => c.id) : undefined}
            onToggleCollection={!isDir ? (collectionId) => handleToggleCollection(node.path, collectionId) : undefined}
          >
            {/* This wrapper is for context menu trigger - drag handled on inner div */}
            <div>
              {/* Drag-and-drop wrapper - separate from context menu to avoid event conflicts */}
              <div
                draggable={!isDir}
                onDragStart={(e) => {
                  if (isDir) {
                    e.preventDefault()
                    return
                  }
                  // Set drag data with custom MIME type
                  const title = node.name.replace(/\.mdx?$/, '').replace(/-/g, ' ')
                  e.dataTransfer.setData('application/x-quarry-strand', JSON.stringify({
                    path: node.path,
                    title,
                  }))
                  e.dataTransfer.effectAllowed = 'copyMove'
                  console.log('[QuarrySidebar] Drag started:', node.path, 'data:', { path: node.path, title })

                  // Custom drag image
                  const dragImage = document.createElement('div')
                  dragImage.className = 'px-2 py-1 bg-cyan-500 text-white text-xs rounded shadow-lg font-medium'
                  dragImage.textContent = title
                  dragImage.style.position = 'absolute'
                  dragImage.style.left = '-9999px'
                  dragImage.style.top = '-9999px'
                  document.body.appendChild(dragImage)
                  e.dataTransfer.setDragImage(dragImage, 0, 0)
                  // Clean up after drag starts - use setTimeout for reliability
                  setTimeout(() => {
                    if (dragImage.parentNode) {
                      document.body.removeChild(dragImage)
                    }
                  }, 0)
                }}
                onDragEnd={() => {
                  console.log('[QuarrySidebar] Drag ended:', node.path)
                }}
              >
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    console.log('[QuarrySidebar] CLICK EVENT FIRED on node:', { name: node.name, path: node.path, type: node.type, level: node.level, isDir })
                    if (isDir) {
                      console.log('[QuarrySidebar] Toggling tree path (directory)')
                      onToggleTreePath(node.path)
                    } else {
                      // Detect double-click for VS Code-style tab behavior
                      const now = Date.now()
                      const lastClick = lastClickRef.current
                      const isDoubleClick = lastClick &&
                        lastClick.path === node.path &&
                        (now - lastClick.time) < DOUBLE_CLICK_DELAY

                      // Update last click reference
                      lastClickRef.current = { path: node.path, time: now }

                      if (isDoubleClick) {
                        // Double-click: Open as permanent tab
                        console.log('[QuarrySidebar] DOUBLE-CLICK: Opening as permanent tab:', node.path)
                        onOpenFileFromTree(node.path, { asPreview: false })
                      } else {
                        // Single-click: Open as preview tab
                        console.log('[QuarrySidebar] Single-click: Opening as preview:', node.path)
                        onOpenFileFromTree(node.path, { asPreview: true })
                      }
                      if (window.innerWidth < 768) onClose()
                    }
                  }}
                  // Prevent browser's native double-click (text selection, new window)
                  onDoubleClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('[QuarrySidebar] onDoubleClick handler fired - prevented default')
                  }}
                  onPointerDown={() => console.log('[QuarrySidebar] POINTER DOWN on:', node.name)}
                  onMouseEnter={() => {
                    // Preload caches for strands (non-directories) on hover
                    if (!isDir && node.level === 'strand') {
                      preloadStrand(node.path)
                    }
                  }}
                  onMouseLeave={() => {
                    // Cancel pending preload if mouse leaves before delay
                    if (!isDir) {
                      cancelPreload()
                    }
                  }}
                  whileHover={{ x: isDir ? 0 : 1 }}
                  whileTap={{ scale: 0.99 }}
                  className={`group w-full flex items-center ${fontScale.gap} rounded ${fontScale.px} ${fontScale.py} text-left transition-all min-h-[20px] ${isSelected
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700'
                    : isDir
                      ? 'hover:bg-zinc-200/70 dark:hover:bg-zinc-800/60'
                      : 'hover:bg-emerald-50/70 dark:hover:bg-emerald-900/20'
                    }`}
                  aria-expanded={isDir ? isExpanded : undefined}
                >
                  {/* Icon + Name */}
                  <div className={`flex items-center ${fontScale.gap} flex-1 min-w-0`}>
                    {isDir ? (
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        <ChevronRight className={`${fontScale.iconSm} flex-shrink-0 text-zinc-500`} />
                      </motion.div>
                    ) : LevelIcon ? (
                      <LevelIcon className={`${fontScale.iconSm} flex-shrink-0 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                    ) : (
                      <FileText className={`${fontScale.iconSm} flex-shrink-0 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                    )}
                    <span
                      className={`${fontScale.text} font-medium truncate capitalize leading-tight ${isSelected
                        ? 'text-emerald-800 dark:text-emerald-200 font-semibold'
                        : isDir
                          ? 'text-zinc-800 dark:text-zinc-100'
                          : 'text-zinc-700 dark:text-zinc-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300'
                        }`}
                    >
                      {formatNodeName(node.name)}
                    </span>
                  </div>

                  {/* Badges - Ultra compact */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {isDir && node.strandCount > 0 && (
                      <span className={`${fontScale.textXs} font-semibold px-1 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300`}>
                        {node.strandCount}
                      </span>
                    )}
                  </div>
                </motion.button>
              </div>
            </div>
          </NodeContextMenu>
        </div>

        {/* Children */}
        <AnimatePresence>
          {isDir && isExpanded && node.children && node.children.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="ml-1 border-l border-dashed border-zinc-200 dark:border-zinc-800 pl-1 overflow-hidden"
            >
              {node.children.map((child) => renderTreeNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  /**
   * Render knowledge tree view
   */
  const renderKnowledgeTree = () => {
    if (knowledgeTreeLoading) {
      return <KnowledgeTreeSkeleton />
    }

    if (knowledgeTreeError) {
      return (
        <div className="text-xs text-red-600 dark:text-red-400 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 space-y-2">
          <p className="font-medium">Failed to load content</p>
          <p className="text-gray-600 dark:text-gray-400">{knowledgeTreeError}</p>
          <button
            onClick={() => onResetToHome?.()}
            className="text-emerald-600 dark:text-emerald-400 hover:underline text-xs"
          >
            Retry
          </button>
        </div>
      )
    }

    if (knowledgeTree.length === 0) {
      return (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-8 space-y-3">
          <p className="font-medium">No content yet</p>
          <p>Create your first strand using the Create menu, or import from Obsidian/Notion.</p>
        </div>
      )
    }

    // Check if filters removed all content
    if (filteredTree.length === 0 && knowledgeTree.length > 0) {
      return (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-8 space-y-3">
          <p>No strands match current filters.</p>
          <button
            onClick={onResetSearch}
            className="text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Reset filters
          </button>
        </div>
      )
    }

    // Separate weaves from other nodes
    const weaveNodes = filteredTree.filter(node => node.level === 'weave')
    const otherNodes = filteredTree.filter(node => node.level !== 'weave')

    console.log('[QuarrySidebar] Rendering tree:', {
      filteredTreeLength: filteredTree.length,
      weaveNodesLength: weaveNodes.length,
      otherNodesLength: otherNodes.length,
      weaveNames: weaveNodes.map(n => n.name),
      filteredTreeLevels: filteredTree.map(n => ({ name: n.name, level: n.level, type: n.type })),
    })

    return (
      <div className="space-y-2">
        {/* Stats Card - Ultra Compact, responsive for mobile */}
        <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/40 px-1.5 sm:px-2 py-0.5">
          <div className="flex items-center gap-1 sm:gap-2 text-[9px] sm:text-[length:var(--sidebar-font-base)]">
            <span className="text-zinc-600 dark:text-zinc-400">
              <strong className="text-zinc-800 dark:text-zinc-200">{totalTreeStrands.toLocaleString()}</strong> strands
            </span>
            <span className="text-zinc-500 dark:text-zinc-500">
              <strong>{totalTreeWeaves}</strong> weaves
            </span>
            <span className="hidden sm:inline text-zinc-500 dark:text-zinc-500">
              <strong>{totalTreeLooms}</strong> looms
            </span>
          </div>
        </div>

        {/* Favorites Section - shows favorited strands from any weave */}
        {favoritesCollection && favoritesCollection.strandPaths.length > 0 && (
          <FavoritesSidebarSection
            collection={favoritesCollection}
            onNavigate={(path) => {
              const navigateFn = onBrowse || onNavigate
              navigateFn(path)
              if (window.innerWidth < 768) onClose()
            }}
            isExpanded={favoritesSectionExpanded}
            onToggleExpand={() => setFavoritesSectionExpanded(!favoritesSectionExpanded)}
            isDark={effectiveTheme === 'dark'}
            maxItems={5}
          />
        )}

        {/* Weaves with lazy loading and pagination */}
        {weaveNodes.length > 0 && (
          <LazyWeaveList
            weaves={weaveNodes}
            expandedPaths={expandedTreePaths}
            onToggleExpand={onToggleTreePath}
            onNavigate={(path) => {
              const navigateFn = onBrowse || onNavigate
              navigateFn(path)
              if (window.innerWidth < 768) onClose()
            }}
            onToggleLoom={onToggleTreePath}
            theme={effectiveTheme}
            currentPath={currentPath}
            selectedPath={selectedFile?.path}
            pageSize={5}
            showPagination={weaveNodes.length > 5}
            showViewToggle={false}
            compact={true}
            initialViewMode="compact"
            renderChildren={(child, depth) => renderTreeNode(child, depth)}
          />
        )}

        {/* Other nodes (docs, etc.) */}
        {otherNodes.length > 0 && (
          <div className="space-y-px">{otherNodes.map((node) => renderTreeNode(node))}</div>
        )}
      </div>
    )
  }

  /**
   * Extract headings from markdown content for minimap
   */
  const minimapHeadings = useMemo((): MinimapHeading[] => {
    if (!fileContent) return []

    const headingRegex = /^(#{1,6})\s+(.+)$/gm
    const headings: MinimapHeading[] = []
    let match
    const lines = fileContent.split('\n')
    const totalLines = lines.length
    let lineIndex = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (headingMatch) {
        const level = headingMatch[1].length
        const text = headingMatch[2]
        const slug = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
        headings.push({
          id: `heading-${headings.length}`,
          slug,
          text,
          level,
          position: i / totalLines,
        })
      }
    }

    return headings
  }, [fileContent])

  /**
   * Placeholder backlinks (would come from knowledge graph in production)
   * TODO: Connect to actual backlink resolution from knowledge graph
   */
  const backlinks = useMemo((): Backlink[] => {
    // Return empty for now - would be populated from knowledge graph
    return []
  }, [selectedFile?.path])

  /**
   * Render outline (document structure / TOC) view
   * Shows document headings when a file is selected, otherwise shows directory listing
   */
  const renderOutlineList = () => {
    // Show document outline when we have file content
    if (fileContent && selectedFile) {
      return (
        <div className="flex flex-col h-full">
          {/* Sub-tabs for Outline, Minimap, Backlinks */}
          <div className={`
            flex items-center gap-1 px-2 py-1.5 border-b overflow-x-auto scrollbar-none
            ${effectiveTheme === 'dark' ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}
          `}>
            <button
              onClick={() => setOutlineSubTab('outline')}
              className={`
                flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all shrink-0
                ${outlineSubTab === 'outline'
                  ? effectiveTheme === 'dark'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'bg-white text-zinc-800 shadow-sm'
                  : effectiveTheme === 'dark'
                    ? 'text-zinc-500 hover:text-zinc-300'
                    : 'text-zinc-500 hover:text-zinc-700'
                }
              `}
              title="Outline (O)"
            >
              <List className="w-3 h-3" />
              <span>Outline</span>
            </button>
            <button
              onClick={() => setOutlineSubTab('minimap')}
              className={`
                flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all shrink-0
                ${outlineSubTab === 'minimap'
                  ? effectiveTheme === 'dark'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'bg-white text-zinc-800 shadow-sm'
                  : effectiveTheme === 'dark'
                    ? 'text-zinc-500 hover:text-zinc-300'
                    : 'text-zinc-500 hover:text-zinc-700'
                }
              `}
              title="Minimap (M)"
            >
              <Map className="w-3 h-3" />
              <span>Map</span>
            </button>
            <button
              onClick={() => setOutlineSubTab('backlinks')}
              className={`
                flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all shrink-0
                ${outlineSubTab === 'backlinks'
                  ? effectiveTheme === 'dark'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'bg-white text-zinc-800 shadow-sm'
                  : effectiveTheme === 'dark'
                    ? 'text-zinc-500 hover:text-zinc-300'
                    : 'text-zinc-500 hover:text-zinc-700'
                }
              `}
              title="Backlinks (B)"
            >
              <Link2 className="w-3 h-3" />
              <span>Links</span>
              {backlinks.length > 0 && (
                <span className={`
                  text-[9px] px-1 rounded-full
                  ${effectiveTheme === 'dark' ? 'bg-cyan-900/50 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}
                `}>
                  {backlinks.length}
                </span>
              )}
            </button>
          </div>

          {/* Sub-tab content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {outlineSubTab === 'outline' && (
              <OutlineTableOfContents
                content={fileContent}
                fileName={selectedFile.name}
                filePath={selectedFile.path}
                activeSlug={activeHeadingSlug}
                onNavigate={onNavigateToHeading}
                theme={effectiveTheme}
                compact={treeDensity === 'compact'}
                showReadingTime={true}
                showProgress={true}
              />
            )}

            {outlineSubTab === 'minimap' && (
              <div className="p-2">
                <DocumentMinimap
                  headings={minimapHeadings}
                  scrollProgress={scrollProgress}
                  viewportFraction={viewportFraction}
                  activeHeadingSlug={activeHeadingSlug}
                  onNavigate={(slug) => onNavigateToHeading?.(slug)}
                  theme={effectiveTheme}
                  width={sidebarWidth - 40}
                  maxHeight={400}
                />
              </div>
            )}

            {outlineSubTab === 'backlinks' && (
              <div className="p-2">
                <BacklinksPanel
                  currentPath={selectedFile.path}
                  backlinks={backlinks}
                  onNavigate={(path) => onNavigate?.(path)}
                  theme={effectiveTheme}
                  loading={false}
                />
              </div>
            )}
          </div>
        </div>
      )
    }

    // Show directory listing when no file is selected
    if (loading && files.length === 0) {
      return <FileListSkeleton count={8} />
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
              className={`w-full text-left py-3 pr-3 rounded-lg flex items-center gap-3 hover:bg-gray-200 dark:hover:bg-gray-800 active:bg-gray-300 dark:active:bg-gray-700 transition-colors touch-manipulation min-h-[48px] ${selectedFile?.path === file.path
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
                className={`text-sm flex-1 ${isDir
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

  // State for expanded tag sections
  const [expandedTagSections, setExpandedTagSections] = useState<Record<string, boolean>>({
    tags: true,
    subjects: true,
    topics: true,
  })

  const toggleTagSection = (section: string) => {
    setExpandedTagSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // State for favorites section expansion
  const [favoritesSectionExpanded, setFavoritesSectionExpanded] = useState(true)

  // Get favorites collection for sidebar display
  const favoritesCollection = getFavoritesCollection()

  // State for search/filters section collapsed (hidden by default on mobile)
  // Use controlled state if provided, otherwise use internal state
  const [internalSearchCollapsed, setInternalSearchCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false // SSR: default expanded
    return window.innerWidth < 768 // Collapsed on mobile by default
  })

  // If controlled from outside (unified header), use that state
  const searchFiltersCollapsed = controlledSearchExpanded !== undefined ? !controlledSearchExpanded : internalSearchCollapsed
  const setSearchFiltersCollapsed = (collapsed: boolean | ((prev: boolean) => boolean)) => {
    const newValue = typeof collapsed === 'function' ? collapsed(searchFiltersCollapsed) : collapsed
    if (onSearchExpandedChange) {
      onSearchExpandedChange(!newValue)
    } else {
      setInternalSearchCollapsed(newValue)
    }
  }

  // State for footer collapsed
  // Default collapsed on mobile, otherwise check localStorage/landing page logic
  const [footerCollapsed, setFooterCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false // SSR: default open
    // Always collapsed on mobile by default
    if (window.innerWidth < 768) return true
    const savedPref = localStorage.getItem('codex-footer-collapsed')
    if (savedPref !== null) return savedPref === 'true'
    // Check if coming from landing page (referrer contains /quarry/landing or first visit)
    const isFromLanding = document.referrer.includes('/quarry/landing') ||
      document.referrer.includes('/quarry') ||
      !sessionStorage.getItem('codex-visited')
    sessionStorage.setItem('codex-visited', 'true')
    return !isFromLanding // Open if from landing, collapsed otherwise
  })

  // Save footer preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('codex-footer-collapsed', String(footerCollapsed))
    }
  }, [footerCollapsed])

  /**
   * Render a single tag/category section
   */
  const renderTagSection = (
    title: string,
    icon: React.ReactNode,
    entries: TagIndexEntry[],
    type: 'tag' | 'subject' | 'topic' | 'skill',
    accentClass: string,
    sectionKey: string
  ) => {
    const isEmpty = !entries || entries.length === 0
    const expanded = expandedTagSections[sectionKey] ?? true
    const sortedEntries = isEmpty ? [] : [...entries].sort((a, b) => b.count - a.count)
    const displayEntries = expanded ? sortedEntries : sortedEntries.slice(0, 5)

    return (
      <div className="space-y-2">
        <button
          onClick={() => !isEmpty && toggleTagSection(sectionKey)}
          className={`w-full flex items-center gap-2 text-left ${isEmpty ? 'cursor-default' : ''}`}
        >
          <div className={`p-1.5 rounded-lg ${accentClass} ${isEmpty ? 'opacity-50' : ''}`}>
            {icon}
          </div>
          <span className={`text-xs font-semibold uppercase tracking-wider ${isEmpty ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-600 dark:text-zinc-400'}`}>
            {title}
          </span>
          <span className="text-[length:var(--sidebar-font-base)] text-zinc-500 dark:text-zinc-500">
            ({entries?.length || 0})
          </span>
          {!isEmpty && (
            <ChevronRight
              className={`w-3 h-3 ml-auto text-zinc-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          )}
        </button>
        {isEmpty ? (
          <p className="text-[length:var(--sidebar-font-sm)] text-zinc-400 dark:text-zinc-500 italic pl-8">
            Add taxonomy.{type}s to frontmatter
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {displayEntries.map((entry) => (
                <button
                  key={entry.name}
                  onClick={() => {
                    onTagClick?.(type, entry.name)
                    if (window.innerWidth < 768) onClose()
                  }}
                  className={`
                    inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[length:var(--sidebar-font-base)] font-medium
                    transition-all hover:scale-105 active:scale-95
                    ${type === 'tag'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-800/40'
                      : type === 'subject'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-800/40'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800/40'
                    }
                  `}
                >
                  {entry.name}
                  <span className="text-[length:var(--sidebar-font-sm)] opacity-70 font-mono">{entry.count}</span>
                </button>
              ))}
            </div>
            {!expanded && sortedEntries.length > 5 && (
              <button
                onClick={() => toggleTagSection(sectionKey)}
                className="text-[length:var(--sidebar-font-base)] text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                Show {sortedEntries.length - 5} more…
              </button>
            )}
          </>
        )}
      </div>
    )
  }

  /**
   * Render tags & categories view
   */
  const renderTagsView = () => {
    if (!tagsIndex) {
      return (
        <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-8">
          <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Tags index loading…</p>
          <p className="text-[length:var(--sidebar-font-base)] mt-1 opacity-70">Browse strands to build the index</p>
        </div>
      )
    }

    const totalTags = tagsIndex.tags.length + tagsIndex.subjects.length + tagsIndex.topics.length + (tagsIndex.skills?.length || 0)
    if (totalTags === 0) {
      return (
        <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-8">
          <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No tags or categories found</p>
          <p className="text-[length:var(--sidebar-font-base)] mt-1 opacity-70">Add tags to your strand frontmatter</p>
        </div>
      )
    }

    return (
      <div className="space-y-5">
        {/* Stats Card */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/40 p-4 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[length:var(--sidebar-font-base)] uppercase tracking-[0.25em] text-zinc-500 dark:text-zinc-400">
                Tags & Categories
              </p>
              <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                {totalTags} total
              </p>
            </div>
          </div>
        </div>

        {/* Tags */}
        {renderTagSection(
          'Tags',
          <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
          tagsIndex.tags,
          'tag',
          'bg-emerald-100 dark:bg-emerald-900/30',
          'tags'
        )}

        {/* Subjects */}
        {renderTagSection(
          'Subjects',
          <Folder className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
          tagsIndex.subjects,
          'subject',
          'bg-amber-100 dark:bg-amber-900/30',
          'subjects'
        )}

        {/* Topics */}
        {renderTagSection(
          'Topics',
          <Hash className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
          tagsIndex.topics,
          'topic',
          'bg-blue-100 dark:bg-blue-900/30',
          'topics'
        )}

        {/* Skills */}
        {tagsIndex.skills && tagsIndex.skills.length > 0 && renderTagSection(
          'Skills',
          <Zap className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />,
          tagsIndex.skills,
          'skill',
          'bg-violet-100 dark:bg-violet-900/30',
          'skills'
        )}
      </div>
    )
  }

  return (
    <>
      {/* Mobile Backdrop - darkened overlay with blur */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
            style={{ zIndex: Z_INDEX.SIDEBAR_BACKDROP }}
            onPointerDown={(e) => {
              // Use pointer events for reliable cross-platform touch handling
              e.stopPropagation()
              e.preventDefault()
              onClose()
            }}
            onClick={(e) => {
              // Fallback for non-pointer event browsers
              e.stopPropagation()
              e.preventDefault()
              onClose()
            }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container - Mobile: swipe-enabled slide-in sheet, Desktop: animated panel */}
      <motion.div
        initial={false}
        animate={{
          width: isDesktop ? (isOpen ? sidebarWidth : 0) : undefined,
          opacity: isDesktop ? (isOpen ? 1 : 0) : 1,
          x: !isDesktop && isOpen ? 0 : undefined,
        }}
        transition={{
          width: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
          opacity: { duration: isOpen ? 0.25 : 0.15, delay: isOpen ? 0.1 : 0 },
          x: { type: 'spring', stiffness: 300, damping: 30 },
        }}
        /* Mobile swipe-to-close gesture */
        drag={!isDesktop && isOpen ? 'x' : false}
        dragConstraints={{ left: -280, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          // Close sidebar if swiped left more than 80px or with velocity
          if (info.offset.x < -80 || info.velocity.x < -500) {
            onClose()
          }
        }}
        className={`
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          fixed md:relative
          inset-y-0 left-0
          /* Mobile: narrower for small screens, full width up to 280px */
          w-[280px] max-w-[85vw] sm:w-[300px] sm:max-w-[320px] md:w-auto md:max-w-none
          /* Solid background - white in light mode for better contrast */
          bg-white dark:bg-zinc-900
          /* Refined border with subtle glow */
          md:border-r border-zinc-200/80 dark:border-zinc-700/60
          md:shadow-sidebar-light dark:md:shadow-sidebar-dark
          flex flex-col flex-shrink-0
          /* Desktop: match center content height (full viewport minus top toolbar) */
          md:h-full
          transition-transform duration-300 ease-out md:transition-none
          /* Mobile: Enhanced shadow for depth */
          shadow-[8px_0_40px_-12px_rgba(0,0,0,0.25)] dark:shadow-[8px_0_40px_-12px_rgba(0,0,0,0.5)]
          md:shadow-sidebar-light dark:md:shadow-sidebar-dark
          /* Mobile: Enable proper scrolling */
          overflow-hidden
          /* Safe area padding for notched phones */
          pt-[env(safe-area-inset-top,0px)] md:pt-0
          /* Ensure proper touch scrolling on mobile */
          touch-pan-y
        `}
        style={{
          zIndex: Z_INDEX.SIDEBAR,
          // Font scale CSS variables for consistent sizing across sidebar
          '--sidebar-font-base': ['9px', '10px', '11px', '12px'][sidebarFontSize] || '10px',
          '--sidebar-font-sm': ['8px', '9px', '10px', '11px'][sidebarFontSize] || '9px',
          '--sidebar-font-xs': ['7px', '8px', '9px', '10px'][sidebarFontSize] || '8px',
          ...(isDesktop ? {
            maxWidth: `min(${sidebarWidth}px, 45vw)`,
          } : {})
        } as React.CSSProperties}
      >
        {/* Mobile close: handled by bottom collapse button only */}

        {/* Header - Compact solid background with top padding for macOS traffic lights in Electron */}
        {/* In Electron, the header acts as a window drag region */}
        {/* Hidden when using unified header bar */}
        {!hideHeader && (
          <div
            className={`px-1.5 sm:px-2.5 py-1 sm:py-1.5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 ${isElectronMacApp ? 'pt-8' : ''
              }`}
            style={isElectronApp ? { WebkitAppRegion: 'drag' } as React.CSSProperties : undefined}
          >
            <div className="flex items-center justify-between gap-1 w-full" style={isElectronApp ? { WebkitAppRegion: 'no-drag' } as React.CSSProperties : undefined}>
              {/* Left: Brand logo + Search + Theme toggle - flush together */}
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 min-w-0">
                <QuarryBrand
                  size="xs"
                  showIcon={true}
                  compact={true}
                  theme={effectiveTheme}
                  interactive={true}
                  onClick={onResetToHome}
                />

                {/* Search Toggle Button - flush next to logo */}
                <motion.button
                  onClick={() => setSearchFiltersCollapsed(!searchFiltersCollapsed)}
                  className={`
                  relative flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-md
                  border transition-all duration-200 touch-manipulation
                  ${!searchFiltersCollapsed
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-600/50 text-emerald-600 dark:text-emerald-400'
                      : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }
                `}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={searchFiltersCollapsed ? 'Open search' : 'Close search'}
                  title={searchFiltersCollapsed ? 'Search & filter strands' : 'Close search'}
                >
                  <Search className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-colors ${!searchFiltersCollapsed ? 'text-emerald-500' : ''}`} />
                </motion.button>

                {/* Theme Toggle - flush next to search */}
                {mounted && (
                  <button
                    onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                    className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-all duration-200 touch-manipulation"
                    aria-label="Toggle theme"
                    title="Toggle dark/light mode"
                  >
                    {resolvedTheme === 'dark' ? (
                      <Sun className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
                    ) : (
                      <Moon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-600" />
                    )}
                  </button>
                )}
              </div>

              {/* Right Controls - compact on desktop, touch-optimized on mobile */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {/* Quick Menu Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setQuickMenuOpen(!quickMenuOpen)}
                    className={`flex items-center justify-center w-7 h-7 md:w-6 md:h-6 rounded-md border transition-all duration-200 touch-manipulation ${quickMenuOpen
                      ? 'bg-zinc-200 dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600'
                      : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    aria-label="Quick menu"
                    title="Quick actions"
                  >
                    <Layers className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                  </button>
                  {quickMenuOpen && (
                    <>
                      {/* Click outside to close - captures both mousedown and click for reliable closing */}
                      <div
                        className="fixed inset-0 z-[9998] cursor-default"
                        onClick={() => setQuickMenuOpen(false)}
                        onMouseDown={() => setQuickMenuOpen(false)}
                        aria-hidden="true"
                      />
                      <div className="absolute right-0 top-full mt-2 w-52 py-1.5 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 z-[9999]">
                        {/* Create New - Top action */}
                        <Link
                          href={resolvePath('/quarry/new')}
                          onClick={() => setQuickMenuOpen(false)}
                          className="w-full px-3 py-1.5 text-left text-xs text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 flex items-center gap-2 font-medium"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>Create New Strand</span>
                          <kbd className="ml-auto text-[length:var(--sidebar-font-sm)] px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-400">n</kbd>
                        </Link>
                        <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
                        {/* Dashboard */}
                        <Link
                          href={resolvePath('/quarry/dashboard')}
                          onClick={() => setQuickMenuOpen(false)}
                          className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 flex items-center gap-2"
                        >
                          <LayoutDashboard className="w-3 h-3 text-violet-500" />
                          <span>Dashboard</span>
                        </Link>
                        {/* Planner */}
                        <Link
                          href={resolvePath('/quarry/plan')}
                          onClick={() => setQuickMenuOpen(false)}
                          className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"
                        >
                          <CalendarDays className="w-3 h-3 text-rose-500" />
                          <span>Planner</span>
                        </Link>
                        {/* Write */}
                        <Link
                          href={resolvePath('/quarry/write')}
                          onClick={() => setQuickMenuOpen(false)}
                          className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 flex items-center gap-2"
                        >
                          <PenLine className="w-3 h-3 text-cyan-500" />
                          <span>Write</span>
                        </Link>
                        {/* Reflect */}
                        <Link
                          href={resolvePath('/quarry/reflect')}
                          onClick={() => setQuickMenuOpen(false)}
                          className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-2"
                        >
                          <BookHeart className="w-3 h-3 text-purple-500" />
                          <span>Reflect</span>
                        </Link>
                        {/* Focus */}
                        <Link
                          href={resolvePath('/quarry/focus')}
                          onClick={() => setQuickMenuOpen(false)}
                          className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20 flex items-center gap-2"
                        >
                          <Flower2 className="w-3 h-3 text-fuchsia-500" />
                          <span>Focus</span>
                          <kbd className="ml-auto text-[length:var(--sidebar-font-sm)] px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-400">⇧F</kbd>
                        </Link>
                        {/* Research */}
                        <button
                          onClick={() => {
                            setQuickMenuOpen(false)
                            setResearchPopoverOpen(true)
                          }}
                          className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 flex items-center gap-2"
                        >
                          <Globe className="w-3 h-3 text-teal-500" />
                          <span>Research</span>
                          <kbd className="ml-auto text-[length:var(--sidebar-font-sm)] px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-400">⇧R</kbd>
                        </button>
                        {/* Search / Query Builder */}
                        <Link
                          href={resolvePath('/quarry/search')}
                          onClick={() => setQuickMenuOpen(false)}
                          className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2"
                        >
                          <Compass className="w-3 h-3 text-blue-500" />
                          <span>Discover</span>
                          <kbd className="ml-auto text-[length:var(--sidebar-font-sm)] px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-400">/</kbd>
                        </Link>
                        {/* Analytics */}
                        <Link
                          href={resolvePath('/quarry/analytics')}
                          onClick={() => setQuickMenuOpen(false)}
                          className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-2"
                        >
                          <BarChart3 className="w-3 h-3 text-emerald-500" />
                          <span>Analytics</span>
                        </Link>
                        {/* Evolution Timeline */}
                        <Link
                          href={resolvePath('/quarry/evolution')}
                          onClick={() => setQuickMenuOpen(false)}
                          className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 flex items-center gap-2"
                        >
                          <History className="w-3 h-3 text-teal-500" />
                          <span>Evolution</span>
                        </Link>

                        {/* === Features Section === */}
                        <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
                        <div className="px-3 py-1 text-[10px] uppercase text-zinc-400 dark:text-zinc-500 font-medium tracking-wider">
                          Features
                        </div>

                        {/* Learn */}
                        <Link
                          href={resolvePath('/quarry/learn')}
                          onClick={() => setQuickMenuOpen(false)}
                          className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-2"
                        >
                          <svg className="w-3 h-3 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                            <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                          </svg>
                          <span>Learn</span>
                        </Link>

                        {/* Graph */}
                        <Link
                          href={resolvePath('/quarry/graph')}
                          onClick={() => setQuickMenuOpen(false)}
                          className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-2"
                        >
                          <Network className="w-3 h-3 text-purple-500" />
                          <span>Graph</span>
                        </Link>

                        {/* Collections */}
                        <Link
                          href={resolvePath('/quarry/collections')}
                          onClick={() => setQuickMenuOpen(false)}
                          className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2"
                        >
                          <FolderOpen className="w-3 h-3 text-amber-500" />
                          <span>Collections</span>
                        </Link>

                        {/* Tags (includes Supertags) */}
                        <Link
                          href={resolvePath('/quarry/tags')}
                          onClick={() => setQuickMenuOpen(false)}
                          className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 flex items-center gap-2"
                        >
                          <Hash className="w-3 h-3 text-cyan-500" />
                          <span>Tags</span>
                        </Link>

                        {/* Templates */}
                        <Link
                          href={resolvePath('/quarry/templates')}
                          onClick={() => setQuickMenuOpen(false)}
                          className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center gap-2"
                        >
                          <svg className="w-3 h-3 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="3" y1="9" x2="21" y2="9" />
                            <line x1="9" y1="21" x2="9" y2="9" />
                          </svg>
                          <span>Templates</span>
                        </Link>

                        {/* Activity Log */}
                        <Link
                          href={resolvePath('/quarry/activity')}
                          onClick={() => setQuickMenuOpen(false)}
                          className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-2"
                        >
                          <svg className="w-3 h-3 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                          </svg>
                          <span>Activity</span>
                        </Link>

                        <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
                        {/* Highlights - opens BookmarksPanel with Highlights tab */}
                        {onOpenBookmarks && (
                          <button
                            onClick={() => {
                              onOpenBookmarks('highlights')
                              setQuickMenuOpen(false)
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 flex items-center gap-2"
                          >
                            <Highlighter className="w-3 h-3 text-yellow-500" />
                            <span>Highlights</span>
                            <kbd className="ml-auto text-[length:var(--sidebar-font-sm)] px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-400">h</kbd>
                          </button>
                        )}
                        {/* Bookmarks */}
                        {onOpenBookmarks && (
                          <button
                            onClick={() => {
                              onOpenBookmarks()
                              setQuickMenuOpen(false)
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2"
                          >
                            <svg className="w-3 h-3 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                            </svg>
                            <span>Bookmarks</span>
                            <kbd className="ml-auto text-[length:var(--sidebar-font-sm)] px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-400">b</kbd>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            onOpenHelp()
                            setQuickMenuOpen(false)
                          }}
                          className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                        >
                          <LifeBuoy className="w-3 h-3" /> Help & Tutorials
                          <kbd className="ml-auto text-[length:var(--sidebar-font-sm)] px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-400">?</kbd>
                        </button>
                        <button
                          onClick={() => {
                            onOpenPreferences?.()
                            setQuickMenuOpen(false)
                          }}
                          className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                        >
                          <Sparkles className="w-3 h-3" /> Preferences
                          <kbd className="ml-auto text-[length:var(--sidebar-font-sm)] px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-400">,</kbd>
                        </button>
                        <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
                        <Link
                          href={resolvePath('/quarry/about')}
                          onClick={() => setQuickMenuOpen(false)}
                          className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium"
                        >
                          <Image
                            src="/quarry-icon-mono-light.svg"
                            alt="Quarry"
                            width={12}
                            height={12}
                            className="flex-shrink-0 block dark:hidden opacity-60"
                          />
                          <Image
                            src="/quarry-icon-mono-dark.svg"
                            alt="Quarry"
                            width={12}
                            height={12}
                            className="flex-shrink-0 hidden dark:block opacity-60"
                          />
                          About Quarry {codexName}
                        </Link>
                      </div>
                    </>
                  )}
                </div>

                {/* Close handled by bottom collapse button only */}
              </div>
            </div>

          </div>
        )}

        {/* Collapsible Search & Filters Section - Controlled by header button */}
        <AnimatePresence initial={false}>
          {!searchFiltersCollapsed && (
            /* Expanded: Full search & filters - slides down from header */
            <motion.div
              key="expanded-toolbar"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="border-b border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-900/10 overflow-hidden"
            >
              <div className="px-1.5 py-1 sm:px-3 sm:py-1.5 space-y-1 sm:space-y-1.5">
                {/* Search Bar - Full width, no collapse button here */}
                <SearchBar
                  options={searchOptions}
                  onQueryChange={onSearchQueryChange}
                  onToggleSearchNames={onToggleSearchNames}
                  onToggleSearchContent={onToggleSearchContent}
                  onToggleCaseSensitive={onToggleCaseSensitive}
                  onReset={onResetSearch}
                  inputId="codex-search-input"
                  placeholder="Search strands..."
                  compact={true}
                />

                {/* Quick Filters Row - horizontal scroll on mobile */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 -mb-1 flex-nowrap">
                  <NavigationRootToggle
                    value={searchOptions.rootScope}
                    onChange={onSetRootScope}
                    compact={true}
                  />
                  <FileFilterToggle
                    value={searchOptions.filterScope}
                    onChange={onSetFilterScope}
                    hideEmptyFolders={searchOptions.hideEmptyFolders}
                    onToggleHideEmptyFolders={onToggleHideEmptyFolders}
                    compact={true}
                  />
                </div>

                {/* Advanced Filters - Unified Taxonomy Bar */}
                {advancedFilters && (
                  <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    <TaxonomyFilterBar
                      availableSubjects={(tagsIndex?.subjects || []).map(s => s.name)}
                      selectedSubjects={advancedFilters.selectedSubjects}
                      onSubjectsChange={onSetSelectedSubjects}
                      availableTopics={(tagsIndex?.topics || []).map(t => t.name)}
                      selectedTopics={advancedFilters.selectedTopics || []}
                      onTopicsChange={onSetSelectedTopics}
                      availableTags={(tagsIndex?.tags || []).map(t => t.name)}
                      selectedTags={advancedFilters.selectedTags}
                      onTagsChange={onSetSelectedTags}
                      showCalendar={!!onSetDateFilter}
                      selectedDate={advancedFilters.dateFilter?.startDate ? new Date(advancedFilters.dateFilter.startDate) : null}
                      onDateChange={(date) => onSetDateFilter && onSetDateFilter(date ? { mode: 'single', startDate: date.toISOString().split('T')[0] } : { mode: 'none' })}
                      theme={effectiveTheme}
                      compact
                    />

                    {/* Excluded Items */}
                    {advancedFilters.excludedPaths.length > 0 && (
                      <div className="space-y-1 mt-2">
                        <div className="flex items-center gap-1.5">
                          <EyeOff className="w-3 h-3 text-zinc-500" />
                          <span className="text-[length:var(--sidebar-font-base)] font-medium text-zinc-700 dark:text-zinc-300">
                            Hidden
                          </span>
                          <span className="px-1 text-[length:var(--sidebar-font-sm)] text-amber-600 dark:text-amber-400">
                            {advancedFilters.excludedPaths.length}
                          </span>
                        </div>
                        <ExcludeListManager
                          excludedPaths={advancedFilters.excludedPaths}
                          onInclude={onIncludePath || (() => { })}
                          compact
                        />
                      </div>
                    )}

                    {/* Reset All Button */}
                    {activeAdvancedFilterCount > 0 && (
                      <button
                        onClick={onResetAdvancedFilters}
                        className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 mt-2 rounded
                          border border-zinc-200 dark:border-zinc-700
                          text-[length:var(--sidebar-font-base)] text-zinc-600 dark:text-zinc-400
                          hover:bg-zinc-100 dark:hover:bg-zinc-800
                          transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset All Filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hierarchical Breadcrumb Navigation - Only shows when navigating (not on home) */}
        {(currentPath || selectedFile?.path) && (
          <div className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <HierarchyBreadcrumb
              currentPath={currentPath}
              selectedPath={selectedFile?.path}
              onNavigate={onNavigate}
              onBrowse={onBrowse}
              theme={effectiveTheme}
              showLevelIndicators={true}
            />
          </div>
        )}

        {/* View Toggle - Icon-only tabs - NEVER wrap, stay compact */}
        <div className="px-0.5 sm:px-1 py-0.5 sm:py-1 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
          <div className="flex flex-nowrap gap-0 sm:gap-0.5 rounded-md bg-zinc-200 dark:bg-zinc-900 p-0.5 overflow-x-auto">
            <button
              onClick={() => onModeChange('tree')}
              className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded flex-shrink-0 flex items-center justify-center transition-all ${mode === 'tree'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-300/50 dark:hover:bg-zinc-700/50'
                }`}
              title="Tree"
            >
              <GitBranch className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
            <button
              onClick={() => onModeChange('toc')}
              className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded flex-shrink-0 flex items-center justify-center transition-all ${mode === 'toc'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-300/50 dark:hover:bg-zinc-700/50'
                }`}
              title="Outline"
            >
              <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
            <button
              onClick={() => onModeChange('supertags')}
              className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded flex-shrink-0 flex items-center justify-center transition-all ${mode === 'supertags'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400'
                }`}
              title="Tags"
            >
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onModeChange('query')}
              className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded flex-shrink-0 flex items-center justify-center transition-all ${mode === 'query'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              title="Query"
            >
              <Filter className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
            <button
              onClick={() => onModeChange('graph')}
              className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded flex-shrink-0 flex items-center justify-center transition-all ${mode === 'graph'
                ? 'bg-cyan-500 text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400'
                }`}
              title="Graph"
            >
              <Network className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
            <button
              onClick={() => onModeChange('plugins')}
              className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded flex-shrink-0 flex items-center justify-center transition-all ${mode === 'plugins'
                ? 'bg-purple-500 text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              title="Extensions"
            >
              <Puzzle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
            <button
              onClick={() => onModeChange('collections')}
              className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded flex-shrink-0 flex items-center justify-center transition-all ${mode === 'collections'
                ? 'bg-violet-500 text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400'
                }`}
              title="Collections"
            >
              <FolderOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
            <button
              onClick={() => onModeChange('insights')}
              className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded flex-shrink-0 flex items-center justify-center transition-all ${mode === 'insights'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                }`}
              title="Insights"
            >
              <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
            {/* Quarry Plugin System: Plugin-defined sidebar modes */}
            {activeSidebarModes.map(({ pluginId, options }) => {
              const modeId = `plugin-${options.id}`
              const plugin = quarryPluginManager.getPlugin(pluginId)
              if (!plugin) return null

              return (
                <button
                  key={modeId}
                  onClick={() => onModeChange(modeId)}
                  className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded flex-shrink-0 flex items-center justify-center transition-all ${mode === modeId
                    ? 'bg-purple-500 text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400'
                    }`}
                  title={options.name}
                >
                  {React.isValidElement(options.icon) ? options.icon : <Puzzle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                </button>
              )
            })}

            {/* Selection count removed - BatchActionsBar shows selection info instead */}
          </div>
        </div>

        {/* File List - Premium scrollable area with glass background */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-1 sm:p-2 space-y-0.5 overscroll-contain touch-pan-y codex-sidebar-scroll scroll-smooth"
          style={{
            // Scale all text based on font size setting
            fontSize: ['9px', '10px', '11px', '12px'][sidebarFontSize] || '10px',
            // Smooth momentum scrolling on iOS
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {mode === 'tree' && (enableDragDropTree ? (
            <>
              {/* Tree Status Bar - shows when there are pending changes */}
              {treePersistState && treePersistState.pendingMoves.length > 0 && (
                <TreeStatusBar
                  pendingCount={treePersistState.pendingMoves.length}
                  saveStatus={treePersistState.saveStatus}
                  publishTarget={treePersistState.publishTarget}
                  lastError={treePersistState.lastError}
                  onSave={() => onSaveTree?.()}
                  onPublish={() => onPublishTree?.()}
                  className="mx-1 mb-2"
                />
              )}
              <CodexTreeView
                data={filteredTree}
                selectedPath={selectedFile?.path}
                onSelect={(path, options) => {
                  // VS Code-style tab behavior:
                  // - Single-click: Open as preview (asPreview: true) - reuses existing preview tab
                  // - Double-click: Open as permanent tab (asPreview: false) - new persistent tab
                  console.log('[QuarrySidebar] onSelect:', path, 'options:', options)
                  onOpenFileFromTree(path, { asPreview: options?.asPreview ?? true })
                  if (window.innerWidth < 768) onClose()
                }}
                onNavigate={(path) => {
                  const navigateFn = onBrowse || onNavigate
                  navigateFn(path)
                  if (window.innerWidth < 768) onClose()
                }}
                onOpenExternal={(path) => {
                  window.open(`/quarry/${path.replace(/\.md$/, '')}`, '_blank')
                }}
                isDark={effectiveTheme?.includes('dark')}
                rowHeight={fontScale.rowHeight}
                indent={10}
                enableDragDrop={!(selectedPaths && selectedPaths.size > 0)} // Disable drag when items are selected
                onTreeChange={onTreeChange}
                onMoveComplete={onMoveComplete}
                onDeleteComplete={onDeleteComplete}
                searchTerm={searchOptions.query}
                loading={knowledgeTreeLoading}
                compact={treeDensity === 'compact'}
                totalStrands={totalTreeStrands}
                totalWeaves={totalTreeWeaves}
                fontScale={{
                  text: fontScale.text,
                  textSm: fontScale.textSm,
                  textXs: fontScale.textXs,
                  icon: fontScale.icon,
                  iconSm: fontScale.iconSm,
                }}
                // Multi-selection props - always enabled for hover selection
                selectionMode={true}
                selectedPaths={selectedPaths}
                onToggleSelection={onTogglePathSelection}
                isPathSelected={isPathSelected}
                isSelectedOrAncestorSelected={isSelectedOrAncestorSelected}
                onSelectRecursive={onSelectRecursive}
                onToggleRecursive={onToggleRecursive}
              />
            </>
          ) : (
            <>{renderKnowledgeTree()}</>
          ))}
          {mode === 'toc' && renderOutlineList()}
          {mode === 'supertags' && (
            <SupertagsSidebarPanel
              theme={effectiveTheme?.includes('dark') ? 'dark' : 'light'}
              selectedBlockId={selectedBlockId}
              selectedStrandPath={selectedStrandPath}
              selectedTagName={selectedTagName}
              onApplySupertag={onApplySupertag}
              onOpenDesigner={onOpenSupertagDesigner}
              onPromoteTag={onPromoteTag}
              tagsIndex={tagsIndex}
              className="flex-1"
            />
          )}
          {mode === 'plugins' && (
            <PluginsSidebarView theme={effectiveTheme} />
          )}
          {mode === 'planner' && (
            <PlannerSidebarPanel
              theme={effectiveTheme}
              onNavigateToStrand={onOpenFileFromTree}
            />
          )}
          {mode === 'query' && (
            <>
              {console.log('[Query Mode] Rendering QueryBuilderSidebarPanel, theme:', effectiveTheme)}
              <QueryBuilderSidebarPanel
                theme={effectiveTheme?.includes('dark') ? 'dark' : 'light'}
                onExecute={(query, queryString) => {
                  console.log('[QueryBuilder] Execute:', queryString)
                  // Could integrate with search/filter system here
                }}
                className="flex-1"
              />
            </>
          )}
          {mode === 'preview' && (
            <LinkPreviewPanel
              previewUrl={previewUrl ?? null}
              onClearPreview={() => onClearPreview?.()}
              theme={effectiveTheme?.includes('dark') ? 'dark' : 'light'}
              className="flex-1"
            />
          )}
          {mode === 'collections' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-700">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Collections</h3>
                <Link
                  href={resolvePath('/quarry/collections')}
                  className="text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                >
                  View All
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <FolderOpen className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mb-3" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                  Organize strands into collections
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
                  Create collections to group related strands, supernotes, and documents.
                </p>
                <Link
                  href={resolvePath('/quarry/collections')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                >
                  <FolderOpen className="w-4 h-4" />
                  Open Collections
                </Link>
              </div>
            </div>
          )}
          {mode === 'insights' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-700">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedFile ? 'Strand Insights' : 'Insights'}
                </h3>
                {selectedFile && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                    Selected
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3">
                {/* CONTEXT-AWARE: Show strand insights when file selected */}
                {selectedFile && (
                  <StrandInsightsCard
                    metadata={metadataMap?.get(selectedFile.path) ?? null}
                    content={fileContent}
                    fileName={selectedFile.name}
                    theme={effectiveTheme}
                  />
                )}

                {/* NO SELECTION: Show global stats */}
                {!selectedFile && (
                  <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                    <h4 className="font-medium text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
                      Knowledge Base
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {totalTreeStrands.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Strands</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                          {totalTreeWeaves}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Weaves</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                          {totalTreeLooms}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Looms</div>
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 text-center">
                      Select a strand to see detailed insights
                    </p>
                  </div>
                )}

                {/* Analytics Card */}
                <Link
                  href={resolvePath('/quarry/analytics')}
                  className="block p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        Analytics
                      </h4>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                        Charts, stats & usage
                      </p>
                    </div>
                  </div>
                </Link>

                {/* Evolution Timeline Card */}
                <Link
                  href={resolvePath('/quarry/evolution')}
                  className="block p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center flex-shrink-0">
                      <History className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        Evolution
                      </h4>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                        Timeline & journey
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          )}
          {/* Quarry Plugin System: Render plugin-defined sidebar modes */}
          {(() => {
            const pluginMode = activeSidebarModes.find(({ options }) =>
              `plugin-${options.id}` === mode
            )

            if (pluginMode) {
              const { pluginId, options } = pluginMode
              const plugin = quarryPluginManager.getPlugin(pluginId)

              if (!plugin) return null

              const Component = options.component

              return (
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                  <Component
                    api={createPluginAPI(pluginId, () => plugin.settings)}
                    settings={plugin.settings}
                    theme={effectiveTheme}
                    isDark={effectiveTheme?.includes('dark') || false}
                  />
                </div>
              )
            }

            return null
          })()}
          {mode === 'graph' && (
            <SidebarGraphView
              tree={knowledgeTree}
              selectedPath={selectedFile?.path}
              onNavigate={(path) => {
                onOpenFileFromTree(path)
                if (window.innerWidth < 768) onClose()
              }}
              theme={effectiveTheme}
            />
          )}
        </div>

        {/* Sidebar Width & Font Size Control + Collapse Button */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          {/* Width & Font Size Control */}
          {onSidebarWidthChange && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <SidebarWidthControl
                width={sidebarWidth}
                onChange={onSidebarWidthChange}
                fontSize={sidebarFontSize}
                onFontSizeChange={onSidebarFontSizeChange}
                theme={effectiveTheme}
              />
            </div>
          )}

          {/* Sidebar Collapse Button - Icon only */}
          {onCollapseSidebar && (
            <motion.button
              onClick={() => {
                // On mobile, close the overlay instead of collapsing
                if (window.innerWidth < 768) {
                  onClose()
                } else {
                  onCollapseSidebar()
                }
              }}
              onPointerUp={(e) => {
                // Handle touch on mobile where drag gesture may absorb clicks
                if (window.innerWidth < 768) {
                  e.stopPropagation()
                  onClose()
                }
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                flex items-center justify-center w-8 h-8 rounded-md flex-shrink-0
                transition-all duration-200 border touch-manipulation
                ${effectiveTheme.includes('dark')
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-700'
                  : 'bg-white hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 border-zinc-200'
                }
              `}
              title="Hide sidebar (s)"
              aria-label="Collapse sidebar"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="6" height="16" rx="1" fill="currentColor" opacity="0.3" />
                <path d="M18 8L14 12L18 16" />
              </svg>
            </motion.button>
          )}
        </div>

        {/* Batch Actions Bar (when items are selected) */}
        {selectedPaths && selectedPaths.size > 0 && onGetAllStrandPaths && (
          <BatchActionsBar
            stats={selectionStats}
            isVisible={selectedPaths && selectedPaths.size > 0}
            theme={effectiveTheme}
            onGenerateFlashcards={onGenerateFlashcards ? () => {
              const strandPaths = onGetAllStrandPaths()
              if (strandPaths.length > 0) onGenerateFlashcards(strandPaths)
            } : undefined}
            onGenerateGlossary={onGenerateGlossary ? () => {
              const strandPaths = onGetAllStrandPaths()
              if (strandPaths.length > 0) onGenerateGlossary(strandPaths)
            } : undefined}
            onGenerateQuiz={onGenerateQuiz ? () => {
              const strandPaths = onGetAllStrandPaths()
              if (strandPaths.length > 0) onGenerateQuiz(strandPaths)
            } : undefined}
            onClearSelection={onClearSelection}
          />
        )}

        {/* Collapsible Footer - Solid background for proper theming */}
        <div className="border-t border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
          {/* Always Visible: Help & Bookmarks + Expand Toggle */}
          <div className="px-2 py-1.5 flex items-center gap-1.5">
            {/* Help Button - compact on mobile */}
            <button
              onClick={() => {
                onOpenHelp()
                if (window.innerWidth < 768) {
                  onClose()
                }
              }}
              className="flex-1 inline-flex items-center justify-center gap-1 h-6 sm:h-7 rounded-md border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-[9px] sm:text-[11px] font-medium text-zinc-600 dark:text-zinc-300 px-1.5 sm:px-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:border-rose-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all duration-200 touch-manipulation"
              title="Help & keyboard shortcuts"
            >
              <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <circle cx="12" cy="17" r="0.5" fill="currentColor" />
              </svg>
              <span className="hidden sm:inline">Help</span>
            </button>

            {/* Bookmarks Button - compact on mobile */}
            {onOpenBookmarks && (
              <button
                onClick={() => {
                  onOpenBookmarks()
                  if (window.innerWidth < 768) {
                    onClose()
                  }
                }}
                className="flex-1 inline-flex items-center justify-center gap-1 h-6 sm:h-7 rounded-md border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-[9px] sm:text-[11px] font-medium text-zinc-600 dark:text-zinc-300 px-1.5 sm:px-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 transition-all duration-200 touch-manipulation"
                title="Bookmarks & history (b)"
              >
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="9" r="2" fill="currentColor" opacity="0.3" />
                </svg>
                <span className="hidden sm:inline">Saved</span>
              </button>
            )}

            <button
              onClick={() => setFooterCollapsed(!footerCollapsed)}
              className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all duration-200 flex-shrink-0 touch-manipulation"
              title={footerCollapsed ? 'Expand footer links' : 'Collapse footer links'}
            >
              <motion.div
                animate={{ rotate: footerCollapsed ? 0 : 180 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-zinc-500 dark:text-zinc-400" />
              </motion.div>
            </button>
          </div>

          {/* Collapsible Links Section */}
          <AnimatePresence>
            {!footerCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="overflow-hidden"
              >
                <div className="px-2 pb-2 space-y-1.5">
                  {/* Repository/Storage Indicator */}
                  <RepositoryIndicator
                    allowEdit={process.env.NEXT_PUBLIC_ENABLE_REPO_EDIT === 'true'}
                    onEdit={onOpenPreferences}
                    theme={effectiveTheme}
                    compact={true}
                    contentSource={contentSource}
                    displayPath={contentSourcePath}
                  />

                  {/* About Quarry Codex - About Page CTA */}
                  <Link
                    href={resolvePath('/quarry/about')}
                    className="flex items-center gap-1 p-1 sm:p-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded transition-all group"
                  >
                    <Image
                      src="/quarry-icon-mono-light.svg"
                      alt="Quarry"
                      width={10}
                      height={10}
                      className="flex-shrink-0 block dark:hidden opacity-70 group-hover:opacity-100 transition-opacity"
                    />
                    <Image
                      src="/quarry-icon-mono-dark.svg"
                      alt="Quarry"
                      width={10}
                      height={10}
                      className="flex-shrink-0 hidden dark:block opacity-70 group-hover:opacity-100 transition-opacity"
                    />
                    <span className="text-[9px] sm:text-[length:var(--sidebar-font-sm)] font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide truncate">
                      About Quarry {codexName}
                    </span>
                    <ChevronRight className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-zinc-400 dark:text-zinc-500 ml-auto group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors flex-shrink-0" />
                  </Link>

                  {/* Quick Stats Bar with inline storage indicator */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span>{files.length} items</span>
                      {/* Inline Storage Indicator with tooltip */}
                      <div className="relative group">
                        <span className={`
                          inline-flex items-center gap-1 px-1 py-0.5 rounded text-[8px] font-medium cursor-help
                          ${contentSource?.type === 'sqlite' || contentSource?.type === 'filesystem'
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                            : contentSource?.type === 'github'
                              ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400'
                              : 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400'
                          }
                        `}>
                          {contentSource?.type === 'sqlite' || contentSource?.type === 'filesystem' ? (
                            <>
                              <HardDrive className="w-2 h-2" />
                              Local
                            </>
                          ) : contentSource?.type === 'github' ? (
                            <>
                              <ExternalLink className="w-2 h-2" />
                              GitHub
                            </>
                          ) : (
                            <>
                              <Database className="w-2 h-2" />
                              Browser
                            </>
                          )}
                        </span>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50">
                          <div className="px-2 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-800 text-white text-[10px] whitespace-nowrap shadow-lg border border-zinc-700">
                            {contentSource?.type === 'sqlite' ? (
                              <>Local SQLite: {contentSourcePath || '~/Documents/Quarry'}</>
                            ) : contentSource?.type === 'filesystem' ? (
                              <>Local Folder: {contentSourcePath}</>
                            ) : (
                              <>Browser IndexedDB (local storage)</>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <a
                      href={`https://github.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                    >
                      GitHub
                      <ExternalLink className="w-2 h-2" />
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Research Popover */}
      <ResearchPopover
        isOpen={researchPopoverOpen}
        onClose={() => setResearchPopoverOpen(false)}
        theme={effectiveTheme}
        onOpenFullPage={() => {
          setResearchPopoverOpen(false)
          window.location.href = resolvePath('/quarry/research')
        }}
      />
    </>
  )
}



