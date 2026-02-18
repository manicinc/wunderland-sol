/**
 * Constants and configuration for Quarry Codex viewer
 * @module codex/constants
 */

import { Book, Folder, FileText, Code } from 'lucide-react'
import type { NodeLevel, LevelStyle } from './types'

/**
 * GitHub repository configuration
 *
 * @remarks
 * By default this points at the public Quarry Codex repository.
 * You can point the viewer at any GitHub repo that follows the
 * same weave/loom/strand structure by setting:
 *
 * - `NEXT_PUBLIC_CODEX_REPO_OWNER`
 * - `NEXT_PUBLIC_CODEX_REPO_NAME`
 * - `NEXT_PUBLIC_CODEX_REPO_BRANCH`
 *
 * in your environment. These are read at build-time and used on
 * the client only (public, no secrets).
 */
export const REPO_CONFIG = {
  /** Repository owner (public, safe for client) */
  OWNER: process.env.NEXT_PUBLIC_CODEX_REPO_OWNER || 'framersai',
  /** Repository name (public, safe for client) */
  NAME: process.env.NEXT_PUBLIC_CODEX_REPO_NAME || 'codex',
  /** Preferred branch (public, safe for client). Defaults to 'master' but may be mutated at runtime if only 'main' exists. */
  BRANCH: (process.env.NEXT_PUBLIC_CODEX_REPO_BRANCH || 'master') as string,
} as { OWNER: string; NAME: string; BRANCH: string }

const joinPath = (base: string, path?: string) => {
  if (!path) return base
  const sanitized = path.replace(/^\/+/, '')
  return `${base}/${sanitized}`
}

/**
 * GitHub API endpoints
 */
export const API_ENDPOINTS = {
  contents: (path = '') =>
    `${joinPath(
      `https://api.github.com/repos/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/contents`,
      path
    )}?ref=${encodeURIComponent(REPO_CONFIG.BRANCH)}`,
  tree: () =>
    `https://api.github.com/repos/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/git/trees/${REPO_CONFIG.BRANCH}?recursive=1`,
  raw: (path = '') =>
    joinPath(`https://raw.githubusercontent.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/${REPO_CONFIG.BRANCH}`, path),
} as const

/**
 * Paths and files to ignore in the viewer
 * These are filtered from the file tree and search results
 */
export const IGNORED_SEGMENTS = [
  '.github',
  '.husky',
  'node_modules',
  '.next',
  '.cache',
  'dist',
  'coverage',
  '.git',
  '.vscode',
  '.idea',
] as const

/**
 * Supported markdown file extensions
 */
export const MARKDOWN_EXTENSIONS = ['.md', '.mdx'] as const

/**
 * Level-specific styling for knowledge hierarchy
 * Maps NodeLevel to display configuration
 * 
 * @remarks
 * Color scheme: Monochrome base (grey/black) with subdued warm neon accents
 * - Weave: Warm amber/gold burst
 * - Loom: Cool cyan/blue burst
 * - Strand: Electric purple/violet burst
 * - Folder: Pure monochrome
 */
export const LEVEL_STYLES: Record<NodeLevel, LevelStyle> = {
  fabric: {
    label: 'Fabric',
    className: 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-2 border-gray-800 dark:border-gray-200',
    icon: Book,
  },
  weave: {
    label: 'Weave',
    className: 'bg-gradient-to-br from-amber-400/20 to-yellow-400/20 text-amber-900 dark:from-amber-500/10 dark:to-yellow-500/10 dark:text-amber-300 border-2 border-amber-500/30 dark:border-amber-400/30',
    icon: Folder,
  },
  loom: {
    label: 'Loom',
    className: 'bg-gradient-to-br from-cyan-400/20 to-blue-400/20 text-cyan-900 dark:from-cyan-500/10 dark:to-blue-500/10 dark:text-cyan-300 border-2 border-cyan-500/30 dark:border-cyan-400/30',
    icon: FileText,
  },
  strand: {
    label: 'Strand',
    // Use green / blue / red accent instead of purple
    className:
      'bg-gradient-to-br from-emerald-400/20 via-sky-400/20 to-rose-400/20 text-emerald-900 dark:from-emerald-500/10 dark:via-sky-500/10 dark:to-rose-500/10 dark:text-emerald-300 border-2 border-emerald-500/30 dark:border-emerald-400/30',
    icon: Code,
  },
  folder: {
    label: 'Folder',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-700',
    icon: Folder,
  },
}

/**
 * Default search options
 */
export const DEFAULT_SEARCH_OPTIONS = {
  query: '',
  mode: 'files' as const,
  searchNames: true,
  searchContent: false,
  caseSensitive: false,
}

/**
 * Pagination configuration
 */
export const PAGINATION = {
  /** Initial number of items to display */
  INITIAL_LIMIT: 50,
  /** Number of items to load per "Load More" click */
  LOAD_MORE_INCREMENT: 50,
} as const

/**
 * Mobile breakpoints (matches Tailwind defaults)
 */
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
} as const

/**
 * Keyboard shortcuts
 */
export const HOTKEYS = {
  /** Toggle metadata panel */
  TOGGLE_META: 'm',
  /** Focus search input */
  FOCUS_SEARCH: '/',
  /** Navigate to home */
  GO_HOME: 'g h',
  /** Toggle sidebar (mobile) */
  TOGGLE_SIDEBAR: 's',
  /** Toggle bookmarks/highlights panel */
  TOGGLE_BOOKMARKS: 'b',
  /** Toggle highlights panel */
  TOGGLE_HIGHLIGHTS: 'h',
  /** Highlight selected text */
  HIGHLIGHT_SELECTION: 'ctrl+h',
} as const

