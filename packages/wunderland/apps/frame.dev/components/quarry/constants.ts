/**
 * Constants and configuration for Quarry Codex viewer
 * @module codex/constants
 */

import { Book, Folder, FileText, Code, FolderOpen } from 'lucide-react'
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

/**
 * Public docs configuration for SEO-friendly URLs
 *
 * @remarks
 * When enabled, strands can be accessed via clean URLs like:
 * - `/quarry/openstrand/overview` instead of `/codex?file=weaves/openstrand/overview.md`
 *
 * This enables:
 * - SEO-friendly URLs without .md extension
 * - Wikipedia-style article linking
 * - Sitemap generation for all public strands
 * - Search engine indexing (unless strand has `seo.index: false`)
 *
 * Environment variables:
 * - `NEXT_PUBLIC_CODEX_PUBLIC_DOCS` - Enable public docs URLs (default: true)
 * - `NEXT_PUBLIC_CODEX_BASE_URL` - Base URL for canonical links (default: https://frame.dev)
 * - `NEXT_PUBLIC_CODEX_SITEMAP_ENABLED` - Include strands in sitemap (default: true)
 */
export const PUBLIC_DOCS_CONFIG = {
  /** Enable SEO-friendly public docs URLs */
  ENABLED: process.env.NEXT_PUBLIC_CODEX_PUBLIC_DOCS !== 'false',
  /** Base URL for canonical links and sitemap */
  BASE_URL: process.env.NEXT_PUBLIC_CODEX_BASE_URL || 'https://frame.dev',
  /** Include strands in sitemap.xml */
  SITEMAP_ENABLED: process.env.NEXT_PUBLIC_CODEX_SITEMAP_ENABLED !== 'false',
  /** URL prefix for codex pages */
  URL_PREFIX: '/quarry',
} as const

/**
 * Convert a file path to a clean SEO-friendly public docs URL
 * 
 * @remarks
 * This follows Wikipedia-style URL conventions:
 * - Clean, readable paths without query parameters
 * - No file extensions (.md, .mdx)
 * - Hierarchical structure that matches content organization
 * 
 * @example
 * pathToPublicUrl('weaves/frame/intro.md') => '/quarry/weaves/frame/intro'
 * pathToPublicUrl('weaves/frame/openstrand/architecture.md') => '/quarry/weaves/frame/openstrand/architecture'
 */
export function pathToPublicUrl(path: string): string {
  if (!PUBLIC_DOCS_CONFIG.ENABLED) {
    return `${PUBLIC_DOCS_CONFIG.URL_PREFIX}?file=${encodeURIComponent(path)}`
  }
  
  // Remove '.md' or '.mdx' extension for clean URLs
  const cleanPath = path.replace(/\.mdx?$/, '')
  
  return `${PUBLIC_DOCS_CONFIG.URL_PREFIX}/${cleanPath}`
}

/**
 * Convert a clean public docs URL back to a file path
 * 
 * @remarks
 * Inverse of pathToPublicUrl - reconstructs the full file path including extension
 * 
 * @example
 * publicUrlToPath('/quarry/weaves/frame/intro') => 'weaves/frame/intro.md'
 * publicUrlToPath('/quarry/weaves/frame/openstrand/architecture') => 'weaves/frame/openstrand/architecture.md'
 */
export function publicUrlToPath(url: string): string {
  // Remove URL prefix
  let cleanUrl = url.replace(PUBLIC_DOCS_CONFIG.URL_PREFIX, '').replace(/^\//, '')
  
  // Don't double-add weaves/ prefix if it's already there
  if (!cleanUrl.startsWith('weaves/') && !cleanUrl.startsWith('docs/') && !cleanUrl.startsWith('wiki/') && !cleanUrl.startsWith('schema/')) {
    cleanUrl = `weaves/${cleanUrl}`
  }
  
  // Add .md extension if not present
  if (!cleanUrl.endsWith('.md') && !cleanUrl.endsWith('.mdx')) {
    cleanUrl = `${cleanUrl}.md`
  }
  
  return cleanUrl
}

/**
 * Check if a strand should be publicly indexed based on its metadata
 */
export function isStrandIndexable(metadata: { seo?: { index?: boolean }; noindex?: boolean }): boolean {
  // Check new seo.index field first
  if (metadata.seo?.index !== undefined) {
    return metadata.seo.index
  }
  
  // Fall back to legacy noindex field
  if (metadata.noindex !== undefined) {
    return !metadata.noindex
  }
  
  // Default to indexable
  return true
}

/**
 * GitHub API endpoints
 */
const joinPath = (base: string, path?: string) => {
  if (!path) return base
  const sanitized = path.replace(/^\/+/, '')
  return `${base}/${sanitized}`
}

export const API_ENDPOINTS = {
  contents: (path = '', branch?: string) => {
    const targetBranch = branch || REPO_CONFIG.BRANCH
    return `${joinPath(
      `https://api.github.com/repos/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/contents`,
      path
    )}?ref=${encodeURIComponent(targetBranch)}`
  },
  tree: () =>
    `https://api.github.com/repos/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/git/trees/${REPO_CONFIG.BRANCH}?recursive=1`,
  raw: (path = '', branch?: string) => {
    const targetBranch = branch || REPO_CONFIG.BRANCH
    return joinPath(`https://raw.githubusercontent.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/${targetBranch}`, path)
  },
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
 * Media file extensions (images, audio, video, PDFs)
 */
export const MEDIA_EXTENSIONS = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'],
  audio: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm'],
  video: ['.mp4', '.webm', '.ogv', '.mov', '.avi', '.mkv'],
  documents: ['.pdf'],
} as const

/**
 * All supported media extensions (flattened)
 */
export const ALL_MEDIA_EXTENSIONS = [
  ...MEDIA_EXTENSIONS.images,
  ...MEDIA_EXTENSIONS.audio,
  ...MEDIA_EXTENSIONS.video,
  ...MEDIA_EXTENSIONS.documents,
] as const

/**
 * Plain-text configuration/document extensions that can be previewed inline
 */
export const TEXT_FILE_EXTENSIONS = [
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.cfg',
  '.conf',
  '.txt',
  '.log',
  '.env',
  '.gitignore',
  '.gitattributes',
  '.mdxconfig',
  '.schema',
] as const

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
    className: 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-2 border-zinc-800 dark:border-zinc-200',
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
  collection: {
    label: 'Collection',
    className: 'bg-gradient-to-br from-purple-400/20 to-violet-400/20 text-purple-900 dark:from-purple-500/10 dark:to-violet-500/10 dark:text-purple-300 border-2 border-purple-500/30 dark:border-purple-400/30',
    icon: Folder,
  },
  strand: {
    label: 'Strand',
    className:
      'bg-gradient-to-br from-emerald-400/20 via-sky-400/20 to-rose-400/20 text-emerald-900 dark:from-emerald-500/10 dark:via-sky-500/10 dark:to-rose-500/10 dark:text-emerald-300 border-2 border-emerald-500/30 dark:border-emerald-400/30',
    icon: Code,
  },
  folder: {
    label: 'Folder',
    className: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-2 border-zinc-300 dark:border-zinc-700',
    icon: Folder,
  },
}

/**
 * Default search options
 */
export const DEFAULT_SEARCH_OPTIONS = {
  query: '',
  searchNames: true,
  searchContent: false,
  caseSensitive: false,
  filterScope: 'strands' as const,
  hideEmptyFolders: false,
  rootScope: 'fabric' as const,
} as const

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
  /** Create new blank strand (Cmd+N) */
  NEW_BLANK: 'n',
  /** Open strand wizard (Cmd+Shift+N) */
  NEW_WIZARD: 'N', // Capital N = Shift+N
  /** Export canvas as strand (Cmd+E) */
  EXPORT_CANVAS: 'e',
} as const

/**
 * Z-Index hierarchy for consistent layering across all components
 * 
 * @remarks
 * Organized in tiers to prevent z-index conflicts:
 * - Base (0-10): Normal document flow
 * - Floating (40-50): FABs, toggles
 * - Navigation (50-60): Mobile bottom nav, sidebars
 * - Overlays (70-80): Sidebar/panel mobile backdrops
 * - Modals (100-150): Standard modals, editors
 * - Priority (200-300): Voice input, camera, important modals
 * - Critical (400-500): Image lightbox, indicators
 * - Top (1000+): Tooltips, dropdowns, toasts
 */
export const Z_INDEX = {
  // Base layers
  content: 0,
  toolbar: 10,
  
  // Base floating elements
  FLOATING_BUTTON: 40,
  fab: 40,
  MOBILE_TOGGLE: 45,
  
  // Navigation layer
  bottomNav: 50,
  MOBILE_BOTTOM_NAV: 50,
  
  // Sidebar layers (left)
  SIDEBAR_BACKDROP: 54,
  sidebarBackdrop: 54,
  SIDEBAR: 55,
  sidebar: 55,
  sidebarDropdown: 65,
  
  // Right panel layers
  METADATA_BACKDROP: 70,
  rightPanelBackdrop: 70,
  METADATA_PANEL: 75,
  rightPanel: 75,
  
  // Tutorial layer (needs to highlight elements)
  TUTORIAL_BACKDROP: 80,
  modalBackdrop: 80,
  TUTORIAL_HIGHLIGHT: 85,
  modal: 85,
  TUTORIAL_CONTENT: 90,
  tooltip: 90,
  popover: 95,
  
  // Ask modal (below nav for persistent access)
  ASK_MODAL_BACKDROP: 30,
  ASK_MODAL: 35,
  
  // Standard modal layer
  MODAL_BACKDROP: 100,
  MODAL: 110,
  
  // Priority modals (voice, camera, settings)
  PRIORITY_MODAL_BACKDROP: 200,
  PRIORITY_MODAL: 210,
  
  // Critical overlays
  NAVIGATION_INDICATOR: 400,
  LIGHTBOX: 500,
  
  // Top layer - always on top
  DROPDOWN: 1000,
  TOOLTIP: 1000,
  TOAST: 1100,
} as const
