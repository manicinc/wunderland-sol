/**
 * Quarry Codex components barrel export
 * @module codex
 */

export { default as QuarryViewer } from './QuarryViewer'
export { default as QuarrySidebar } from './QuarrySidebar'
export { default as QuarryContent } from './QuarryContent'
export { default as QuarryMetadataPanel } from './QuarryMetadataPanel'
export { default as QuarryToolbar } from './QuarryToolbar'
export { default as QuarryPageLayout } from './QuarryPageLayout'

// Aliases for legacy Codex imports
export { default as CodexViewer } from './QuarryViewer'
export { default as CodexSidebar } from './QuarrySidebar'
export { default as CodexContent } from './QuarryContent'
export { default as CodexMetadataPanel } from './QuarryMetadataPanel'
export { default as CodexToolbar } from './QuarryToolbar'
export { default as CodexPageLayout } from './QuarryPageLayout'

// UI components
export { default as SearchBar } from './ui/search/SearchBar'
export { default as PaperCard } from './ui/misc/PaperCard'
export { default as PaperLabel } from './ui/misc/PaperLabel'
export { default as StrandPrintExport } from './ui/strands/StrandPrintExport'
export { default as MobileToggle } from './ui/mobile/MobileToggle'
export { default as OutlineTableOfContents } from './ui/misc/OutlineTableOfContents'
export { default as FabricGraphView } from './ui/graphs/FabricGraphView'
export { default as KnowledgeGraphView } from './ui/graphs/KnowledgeGraphView'
export { default as StableKnowledgeGraph } from './ui/graphs/StableKnowledgeGraph'
export { default as StrandCreationWizard, shouldShowWizard, markWizardCompleted, setWizardNeverShow, resetWizard, isWizardDisabled } from './ui/strands/StrandCreationWizard'
export { default as StrandPreviewPanel } from './ui/strands/StrandPreviewPanel'
export { default as ReaderModePanel } from './ui/reader/ReaderModePanel'
export { default as MetadataEditor } from './ui/misc/MetadataEditor'
export { default as CreateNodeWizard } from './ui/misc/CreateNodeWizard'
export { default as MobileKnowledgeSheet } from './ui/mobile/MobileKnowledgeSheet'

// Hooks
export { useGithubTree } from './hooks/useGithubTree'
export { useCodexHotkeys } from './hooks/useCodexHotkeys'
export { useSearchFilter } from './hooks/useSearchFilter'
export { useTreeSync } from './tree/hooks/useTreeSync'
export { useDeviceCapabilities } from './hooks/useDeviceCapabilities'
export { useSmartAutofill } from './hooks/useSmartAutofill'
export { useModalAccessibility } from './hooks/useModalAccessibility'
export type { SmartAutofillConfig, SmartAutofillResult, Suggestion } from './hooks/useSmartAutofill'

// Database hooks (SQL-backed offline storage)
export {
  useReadingProgress,
  useBookmarks,
  useBookmark,
  useSearchHistory,
  useDrafts,
  useDatabaseStats,
  useRecentlyRead,
} from './hooks/useCodexDatabase'

// Audit logging & undo/redo hooks
export {
  useAuditLog,
  useNavigationLogger,
  useContentLogger,
  useFileLogger,
} from './hooks/useAuditLog'

export {
  useUndoRedo,
  useUndoRedoContext,
  UndoRedoProvider,
  useUndoableContent,
  useUndoableFileOps,
} from './hooks/useUndoRedo'

// Touch device detection hooks
export {
  useIsTouchDevice,
  useIsTablet,
  useTouchTargetSize,
} from './hooks/useIsTouchDevice'

// Types
export type {
  GitHubFile,
  GitTreeItem,
  KnowledgeTreeNode,
  StrandMetadata,
  SearchOptions,
  SupertagFieldFilter,
  SidebarMode,
  ViewerMode,
  NodeLevel,
  LevelStyle,
  QuarryQuarryViewerProps,
  FrameQuarryViewerProps, // deprecated alias
  TagIndexEntry,
  TagsIndex,
  NodeStyle,
} from './types'

// Constants
export {
  REPO_CONFIG,
  API_ENDPOINTS,
  IGNORED_SEGMENTS,
  MARKDOWN_EXTENSIONS,
  LEVEL_STYLES,
  DEFAULT_SEARCH_OPTIONS,
  PAGINATION,
  BREAKPOINTS,
  HOTKEYS,
  // Public docs & SEO (new)
  PUBLIC_DOCS_CONFIG,
  pathToPublicUrl,
  publicUrlToPath,
  isStrandIndexable,
} from './constants'

// Utils
export {
  shouldIgnorePath,
  isMarkdownFile,
  determineNodeLevel,
  buildKnowledgeTree,
  parseWikiMetadata,
  formatNodeName,
  rewriteImageUrl,
  filterFiles,
  debounce,
} from './utils'
