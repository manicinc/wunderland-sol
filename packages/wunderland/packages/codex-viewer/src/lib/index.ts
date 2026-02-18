/**
 * Frame Codex components barrel export
 * @module codex
 */

export { default as CodexViewer } from './CodexViewer'
export { default as CodexSidebar } from './CodexSidebar'
export { default as CodexContent } from './CodexContent'
export { default as CodexMetadataPanel } from './CodexMetadataPanel'
export { default as CodexToolbar } from './CodexToolbar'

// UI components
export { default as SearchBar } from './ui/SearchBar'
export { default as PaperCard } from './ui/PaperCard'
export { default as MobileToggle } from './ui/MobileToggle'

// Hooks
export { useGithubTree } from './hooks/useGithubTree'
export { useCodexHotkeys } from './hooks/useCodexHotkeys'
export { useSearchFilter } from './hooks/useSearchFilter'

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
  FrameCodexViewerProps,
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



