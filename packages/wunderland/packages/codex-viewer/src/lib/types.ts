/**
 * Type definitions for Frame Codex viewer components
 * @module codex/types
 */

import type { LucideIcon } from 'lucide-react'

/**
 * GitHub API file/directory item
 */
export interface GitHubFile {
  /** File or directory name */
  name: string
  /** Full path from repo root */
  path: string
  /** Item type */
  type: 'file' | 'dir'
  /** Git SHA hash */
  sha: string
  /** File size in bytes (files only) */
  size?: number
  /** GitHub API URL */
  url: string
  /** GitHub web URL */
  html_url: string
  /** Raw content download URL (files only) */
  download_url?: string
}

/**
 * GitHub Git Tree API item
 */
export interface GitTreeItem {
  /** Full path from repo root */
  path: string
  /** Item type */
  type: 'blob' | 'tree'
  /** Git SHA hash */
  sha: string
  /** File size in bytes (blobs only) */
  size?: number
}

/**
 * Knowledge hierarchy level in Frame Codex schema
 * - **Fabric**: Collection of weaves (the entire Frame Codex repository is a fabric containing multiple weaves)
 * - **Weave**: Top-level knowledge universe (e.g., `weaves/technology/`) - complete, self-contained, no cross-weave dependencies
 * - **Loom**: Any subdirectory inside a weave - curated topic collection or module
 * - **Strand**: Individual markdown file at any depth inside a weave - atomic knowledge unit
 * - **Folder**: Generic directory outside the weaves hierarchy (not part of OpenStrand schema)
 */
export type NodeLevel = 'fabric' | 'weave' | 'loom' | 'strand' | 'folder'

/**
 * Hierarchical knowledge tree node
 */
export interface KnowledgeTreeNode {
  /** Display name */
  name: string
  /** Full path from repo root */
  path: string
  /** Node type */
  type: 'file' | 'dir'
  /** Child nodes (directories only) */
  children?: KnowledgeTreeNode[]
  /** Total markdown files in subtree */
  strandCount: number
  /** Codex hierarchy level */
  level: NodeLevel
}

/**
 * Parsed YAML frontmatter metadata
 */
export interface StrandMetadata {
  /** Unique identifier (UUID) */
  id?: string
  /** URL-safe slug */
  slug?: string
  /** Display title */
  title?: string
  /** Semantic version */
  version?: string
  /** Content difficulty level */
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  /** Taxonomy classification */
  taxonomy?: {
    /** High-level subjects */
    subjects?: string[]
    /** Specific topics */
    topics?: string[]
  }
  /** Freeform tags */
  tags?: string | string[]
  /** Content type */
  contentType?: string
  /** Related strands */
  relationships?: {
    /** Referenced strands */
    references?: string[]
    /** Required prerequisite strands */
    prerequisites?: string[]
  }
  /** Publishing metadata */
  publishing?: {
    /** Publication status */
    status?: 'draft' | 'published' | 'archived'
    /** Last updated timestamp */
    lastUpdated?: string
  }
  /** Catch-all for other fields */
  [key: string]: any
}

/**
 * Search mode for switching between different content types
 */
export type SearchMode = 'files' | 'highlights' | 'bookmarks'

/**
 * Highlight colors
 */
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'orange'

/**
 * Search filter options
 */
export interface SearchOptions {
  /** Search query string */
  query: string
  /** Search mode: files, highlights, or bookmarks */
  mode: SearchMode
  /** Search in file names (files mode) */
  searchNames: boolean
  /** Search in file content (full-text, files mode) */
  searchContent: boolean
  /** Case-sensitive search */
  caseSensitive: boolean
  /** Filter by difficulty (files mode) */
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  /** Filter by tags (files mode) */
  tags?: string[]
  /** Filter by subjects (files mode) */
  subjects?: string[]
  /** Filter by highlight color (highlights mode) */
  highlightColor?: HighlightColor
  /** Filter by category tag (highlights mode) */
  highlightCategory?: string
  /** Filter by group ID (highlights/bookmarks mode) */
  groupId?: string
}

/**
 * Sidebar display mode
 */
export type SidebarMode = 'tree' | 'toc'

/**
 * Viewer display mode
 */
export type ViewerMode = 'modal' | 'page'

/**
 * Level-specific styling configuration
 */
export interface LevelStyle {
  /** Display label */
  label: string
  /** Tailwind CSS classes */
  className: string
  /** Icon component */
  icon?: LucideIcon
}

/**
 * Props for FrameCodexViewer component
 */
export interface FrameCodexViewerProps {
  /** Whether the viewer is open (modal mode) */
  isOpen: boolean
  /** Close callback (modal mode) */
  onClose?: () => void
  /** Display mode */
  mode?: ViewerMode
  /** Initial path to load */
  initialPath?: string
}

