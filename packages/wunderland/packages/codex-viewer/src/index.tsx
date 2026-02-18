/**
 * @framers/codex-viewer
 * Embeddable GitHub-based knowledge viewer with analog aesthetics
 * @module codex-viewer
 */

// Main component
export { default as CodexViewer } from './components/CodexViewer'

// Sub-components (for advanced customization)
export { default as CodexSidebar } from './components/CodexSidebar'
export { default as CodexContent } from './components/CodexContent'
export { default as CodexMetadataPanel } from './components/CodexMetadataPanel'
export { default as CodexToolbar } from './components/CodexToolbar'

// UI components
export { default as SearchBar } from './ui/SearchBar'
export { default as BookmarksPanel } from './ui/BookmarksPanel'
export { default as PreferencesModal } from './ui/PreferencesModal'
export { default as BreadcrumbMinimap } from './ui/BreadcrumbMinimap'
export { default as KnowledgeGraphView } from './ui/KnowledgeGraphView'
export { default as TimelineView } from './ui/TimelineView'

// Hooks
export { default as useGithubTree } from './hooks/useGithubTree'
export { default as useBookmarks } from './hooks/useBookmarks'
export { default as usePreferences } from './hooks/usePreferences'
export { default as useSearchFilter } from './hooks/useSearchFilter'
export { default as useCodexHotkeys } from './hooks/useCodexHotkeys'

// Utilities
export {
  buildTree,
  parseWikiMetadata,
  stripFrontmatter,
  formatNodeName,
  rewriteImageUrl,
  isMarkdownFile,
  filterFiles,
} from './lib/utils'

// Types
export type {
  GitHubFile,
  GitTreeItem,
  KnowledgeTreeNode,
  StrandMetadata,
  SearchOptions,
  NodeLevel,
  SidebarMode,
  ViewerMode,
  FrameCodexViewerProps,
} from './lib/types'

// Constants
export { REPO_CONFIG, LEVEL_STYLES } from './lib/constants'

