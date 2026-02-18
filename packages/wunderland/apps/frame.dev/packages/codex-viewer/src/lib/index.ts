/**
 * Quarry Codex components barrel export
 * @module codex
 */

export { default as QuarryViewer } from '../components/QuarryViewer'
export { default as QuarrySidebar } from '../components/QuarrySidebar'
export { default as QuarryContent } from '../components/QuarryContent'
export { default as QuarryMetadataPanel } from '../components/QuarryMetadataPanel'
export { default as QuarryToolbar } from '../components/QuarryToolbar'

// UI components
export { default as SearchBar } from '../ui/SearchBar'
export { default as PaperCard } from '../ui/PaperCard'
export { default as MobileToggle } from '../ui/MobileToggle'

// Hooks
export { useGithubTree } from '../hooks/useGithubTree'
export { useCodexHotkeys } from '../hooks/useCodexHotkeys'
export { useSearchFilter } from '../hooks/useSearchFilter'

// Types
export type {
  GitHubFile,
  GitTreeItem,
  KnowledgeTreeNode,
  StrandMetadata,
  SearchOptions,
  SidebarMode,
  ViewerMode,
  NodeLevel,
  LevelStyle,
  QuarryQuarryViewerProps,
  FrameQuarryViewerProps, // deprecated alias
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



