/**
 * Filesystem Content Source
 *
 * Provides content from local filesystem or bundled static files.
 * 
 * Two modes:
 * - 'bundled': Reads from /public/weaves/ (static files)
 * - 'filesystem': Uses File System Access API to read from user's disk
 *
 * @module lib/content/filesystemSource
 */

import matter from 'gray-matter'
import type {
  ContentManager,
  ContentSource,
  KnowledgeTreeNode,
  StrandContent,
  StrandMetadata,
  SearchOptions,
  SearchResult,
  SemanticSearchOptions,
  SyncOptions,
  SyncResult,
} from './types'

// ============================================================================
// TYPES
// ============================================================================

export type FilesystemMode = 'bundled' | 'filesystem'

export interface FilesystemConfig {
  mode: FilesystemMode
  /** For filesystem mode: the directory handle from File System Access API */
  directoryHandle?: FileSystemDirectoryHandle
  /** For bundled mode: base URL path (default: /weaves) */
  basePath?: string
  /** User-friendly display path */
  displayPath?: string
}

interface FileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  handle?: FileSystemFileHandle | FileSystemDirectoryHandle
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BUNDLED_BASE_PATH = '/weaves'
const STRAND_EXTENSIONS = ['.md', '.mdx']

// ============================================================================
// FILESYSTEM CONTENT SOURCE
// ============================================================================

export class FilesystemContentSource implements ContentManager {
  private config: FilesystemConfig
  private initialized = false
  private tree: KnowledgeTreeNode[] = []
  private strands: Map<string, StrandContent> = new Map()
  private lastScan: Date | null = null

  constructor(config: FilesystemConfig) {
    this.config = {
      basePath: BUNDLED_BASE_PATH,
      ...config,
    }
  }

  // ==========================================================================
  // Source Information
  // ==========================================================================

  getSource(): ContentSource {
    return {
      type: 'sqlite', // Treated as local/offline source
      isOnline: false,
      lastSync: this.lastScan,
      pendingChanges: 0,
      strandCount: this.strands.size,
    }
  }

  isOffline(): boolean {
    return true
  }

  canSync(): boolean {
    return false
  }

  getConfig(): FilesystemConfig {
    return this.config
  }

  getDisplayPath(): string {
    if (this.config.displayPath) {
      return this.config.displayPath
    }
    if (this.config.mode === 'bundled') {
      return `${window.location.origin}${this.config.basePath}`
    }
    return this.config.directoryHandle?.name || 'Local Folder'
  }

  // ==========================================================================
  // Content Retrieval
  // ==========================================================================

  async getKnowledgeTree(): Promise<KnowledgeTreeNode[]> {
    if (!this.initialized) {
      await this.initialize()
    }
    return this.tree
  }

  async getStrand(path: string): Promise<StrandContent | null> {
    if (!this.initialized) {
      await this.initialize()
    }
    return this.strands.get(path) || null
  }

  async getStrands(paths: string[]): Promise<StrandContent[]> {
    const results: StrandContent[] = []
    for (const path of paths) {
      const strand = await this.getStrand(path)
      if (strand) results.push(strand)
    }
    return results
  }

  async getWeaveStrands(weaveSlug: string): Promise<StrandContent[]> {
    const results: StrandContent[] = []
    for (const strand of this.strands.values()) {
      if (strand.weave === weaveSlug) {
        results.push(strand)
      }
    }
    return results
  }

  async getLoomStrands(loomPath: string): Promise<StrandContent[]> {
    const results: StrandContent[] = []
    for (const strand of this.strands.values()) {
      if (strand.path.startsWith(loomPath)) {
        results.push(strand)
      }
    }
    return results
  }

  async getWeave(slug: string): Promise<KnowledgeTreeNode | null> {
    return this.tree.find(w => w.slug === slug) || null
  }

  async getLoom(path: string): Promise<KnowledgeTreeNode | null> {
    const findLoom = (nodes: KnowledgeTreeNode[]): KnowledgeTreeNode | null => {
      for (const node of nodes) {
        if (node.path === path) return node
        if (node.children) {
          const found = findLoom(node.children)
          if (found) return found
        }
      }
      return null
    }
    return findLoom(this.tree)
  }

  // ==========================================================================
  // Search
  // ==========================================================================

  async searchStrands(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const results: SearchResult[] = []
    const lowerQuery = query.toLowerCase()
    const limit = options?.limit || 20

    for (const strand of this.strands.values()) {
      // Filter by weave/loom if specified
      if (options?.weave && strand.weave !== options.weave) continue
      if (options?.loom && !strand.path.includes(options.loom)) continue

      // Simple text search
      const titleMatch = strand.title.toLowerCase().includes(lowerQuery)
      const contentMatch = strand.content.toLowerCase().includes(lowerQuery)
      const tags = strand.frontmatter.tags
      const tagsArray = Array.isArray(tags) ? tags : tags ? [tags] : []
      const tagMatch = tagsArray.some(t =>
        t.toLowerCase().includes(lowerQuery)
      )

      if (titleMatch || contentMatch || tagMatch) {
        results.push({
          docId: strand.id,
          path: strand.path,
          title: strand.title,
          summary: strand.summary,
          excerpt: this.extractExcerpt(strand.content, query),
          weave: strand.weave,
          loom: strand.loom,
          tags: strand.frontmatter.tags as string[],
          combinedScore: titleMatch ? 1.0 : contentMatch ? 0.8 : 0.5,
        })
      }

      if (results.length >= limit) break
    }

    return results.sort((a, b) => b.combinedScore - a.combinedScore)
  }

  async semanticSearch(query: string, options?: SemanticSearchOptions): Promise<SearchResult[]> {
    // Fallback to text search for filesystem mode
    return this.searchStrands(query, options)
  }

  async hybridSearch(query: string, options?: SemanticSearchOptions): Promise<SearchResult[]> {
    return this.searchStrands(query, options)
  }

  private extractExcerpt(content: string, query: string, contextLength = 100): string {
    const lowerContent = content.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const index = lowerContent.indexOf(lowerQuery)
    
    if (index === -1) {
      return content.slice(0, contextLength * 2) + '...'
    }

    const start = Math.max(0, index - contextLength)
    const end = Math.min(content.length, index + query.length + contextLength)
    
    let excerpt = content.slice(start, end)
    if (start > 0) excerpt = '...' + excerpt
    if (end < content.length) excerpt = excerpt + '...'
    
    return excerpt
  }

  // ==========================================================================
  // Sync Operations
  // ==========================================================================

  async sync(_options?: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now()
    const previousCount = this.strands.size

    // Re-scan the filesystem
    this.strands.clear()
    this.tree = []
    await this.scanContent()

    return {
      success: true,
      strandsAdded: Math.max(0, this.strands.size - previousCount),
      strandsUpdated: 0,
      strandsRemoved: Math.max(0, previousCount - this.strands.size),
      duration: Date.now() - startTime,
    }
  }

  async checkForUpdates(): Promise<{ available: boolean; changes: number }> {
    return { available: false, changes: 0 }
  }

  async getSyncStatus(): Promise<{
    lastSync: Date | null
    pendingChanges: number
    remoteVersion: string | null
  }> {
    return {
      lastSync: this.lastScan,
      pendingChanges: 0,
      remoteVersion: null,
    }
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  async initialize(): Promise<void> {
    if (this.initialized) return

    await this.scanContent()
    this.initialized = true
  }

  async close(): Promise<void> {
    this.strands.clear()
    this.tree = []
    this.initialized = false
  }

  // ==========================================================================
  // Content Scanning
  // ==========================================================================

  private async scanContent(): Promise<void> {
    if (this.config.mode === 'bundled') {
      await this.scanBundledContent()
    } else if (this.config.mode === 'filesystem' && this.config.directoryHandle) {
      await this.scanFilesystemContent(this.config.directoryHandle)
    }
    this.lastScan = new Date()
  }

  private async scanBundledContent(): Promise<void> {
    // For bundled mode, we fetch the manifest or scan known structure
    // In a real implementation, you'd have a manifest.json listing all files
    // For now, we'll use a simple approach with known structure

    try {
      // Try to fetch manifest first
      const manifestResponse = await fetch(`${this.config.basePath}/manifest.json`)
      if (manifestResponse.ok) {
        const manifest = await manifestResponse.json()
        await this.processBundledManifest(manifest)
        return
      }
    } catch {
      // No manifest, fall through to default structure
    }

    // Default bundled structure - scan known weaves
    const defaultWeaves = ['frame', 'wiki']
    
    for (const weave of defaultWeaves) {
      await this.scanBundledWeave(weave)
    }
  }

  private async processBundledManifest(manifest: { files: string[] }): Promise<void> {
    for (const filePath of manifest.files) {
      if (STRAND_EXTENSIONS.some(ext => filePath.endsWith(ext))) {
        await this.fetchAndProcessStrand(`${this.config.basePath}/${filePath}`, filePath)
      }
    }
    this.buildTreeFromStrands()
  }

  private async scanBundledWeave(weave: string): Promise<void> {
    // Known bundled structure based on what we created
    const knownPaths: Record<string, string[]> = {
      frame: [
        'frame/looms/getting-started/strands/welcome.md',
        'frame/looms/getting-started/strands/local-mode.md',
        'frame/looms/getting-started/strands/ai-integration.md',
      ],
      wiki: [
        'wiki/looms/examples/strands/sample-note.md',
        'wiki/looms/examples/strands/formatting-guide.md',
      ],
    }

    const paths = knownPaths[weave] || []
    for (const path of paths) {
      await this.fetchAndProcessStrand(`${this.config.basePath}/${path}`, path)
    }
    
    this.buildTreeFromStrands()
  }

  private async fetchAndProcessStrand(url: string, path: string): Promise<void> {
    try {
      const response = await fetch(url)
      if (!response.ok) return

      const content = await response.text()
      const strand = this.parseStrand(path, content)
      if (strand) {
        this.strands.set(path, strand)
      }
    } catch (error) {
      console.warn(`Failed to fetch strand: ${url}`, error)
    }
  }

  private async scanFilesystemContent(handle: FileSystemDirectoryHandle): Promise<void> {
    const entries = await this.readDirectory(handle, '')
    
    for (const entry of entries) {
      if (entry.type === 'file' && STRAND_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
        await this.processFilesystemStrand(entry)
      }
    }

    this.buildTreeFromStrands()
  }

  private async readDirectory(
    handle: FileSystemDirectoryHandle,
    basePath: string
  ): Promise<FileEntry[]> {
    const entries: FileEntry[] = []

    // Use type assertion for File System Access API iterator
    const dirHandle = handle as FileSystemDirectoryHandle & AsyncIterable<[string, FileSystemHandle]>
    for await (const [name, entryHandle] of dirHandle) {
      const path = basePath ? `${basePath}/${name}` : name

      if (entryHandle.kind === 'directory') {
        entries.push({ name, path, type: 'directory', handle: entryHandle as FileSystemDirectoryHandle })
        // Recursively read subdirectories
        const subEntries = await this.readDirectory(entryHandle as FileSystemDirectoryHandle, path)
        entries.push(...subEntries)
      } else {
        entries.push({ name, path, type: 'file', handle: entryHandle as FileSystemFileHandle })
      }
    }

    return entries
  }

  private async processFilesystemStrand(entry: FileEntry): Promise<void> {
    if (!entry.handle || entry.type !== 'file') return

    try {
      const file = await (entry.handle as FileSystemFileHandle).getFile()
      const content = await file.text()
      const strand = this.parseStrand(entry.path, content)
      if (strand) {
        this.strands.set(entry.path, strand)
      }
    } catch (error) {
      console.warn(`Failed to read file: ${entry.path}`, error)
    }
  }

  // ==========================================================================
  // Parsing
  // ==========================================================================

  private parseStrand(path: string, rawContent: string): StrandContent | null {
    try {
      const { data: frontmatter, content } = matter(rawContent)

      // Extract path components
      const parts = path.split('/')
      const weave = parts[0] || 'unknown'
      const loomIndex = parts.indexOf('looms')
      const loom = loomIndex >= 0 && parts[loomIndex + 1] ? parts[loomIndex + 1] : undefined
      const fileName = parts[parts.length - 1]
      const slug = fileName.replace(/\.(md|mdx)$/, '')

      // Count words
      const wordCount = content.split(/\s+/).filter(w => w.length > 0).length

      // Generate summary from first paragraph
      const firstParagraph = content.split('\n\n')[0]?.replace(/^#.*\n/, '').trim()
      const summary = firstParagraph?.slice(0, 200) || undefined

      return {
        id: path,
        path,
        slug,
        title: (frontmatter.title as string) || this.titleFromSlug(slug),
        content,
        frontmatter: frontmatter as StrandMetadata,
        weave,
        loom,
        wordCount,
        summary,
        lastModified: new Date().toISOString(),
      }
    } catch (error) {
      console.warn(`Failed to parse strand: ${path}`, error)
      return null
    }
  }

  private titleFromSlug(slug: string): string {
    return slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
  }

  private buildTreeFromStrands(): void {
    const weaveMap = new Map<string, KnowledgeTreeNode>()

    for (const strand of this.strands.values()) {
      // Get or create weave
      if (!weaveMap.has(strand.weave)) {
        weaveMap.set(strand.weave, {
          id: strand.weave,
          type: 'weave',
          slug: strand.weave,
          name: this.titleFromSlug(strand.weave),
          path: strand.weave,
          children: [],
          strandCount: 0,
        })
      }
      const weave = weaveMap.get(strand.weave)!
      weave.strandCount = (weave.strandCount || 0) + 1

      // Get or create loom
      if (strand.loom) {
        const loomPath = `${strand.weave}/looms/${strand.loom}`
        let loom = weave.children?.find(c => c.path === loomPath)
        
        if (!loom) {
          loom = {
            id: loomPath,
            type: 'loom',
            slug: strand.loom,
            name: this.titleFromSlug(strand.loom),
            path: loomPath,
            children: [],
            strandCount: 0,
          }
          weave.children = weave.children || []
          weave.children.push(loom)
        }
        loom.strandCount = (loom.strandCount || 0) + 1

        // Add strand to loom
        loom.children = loom.children || []
        loom.children.push({
          id: strand.id,
          type: 'strand',
          slug: strand.slug,
          name: strand.title,
          path: strand.path,
          description: strand.summary,
          metadata: {
            tags: strand.frontmatter.tags as string[],
            status: strand.frontmatter.publishing?.status,
          },
        })
      }
    }

    this.tree = Array.from(weaveMap.values())
  }
}

// ============================================================================
// FACTORY & UTILITIES
// ============================================================================

let currentSource: FilesystemContentSource | null = null

/**
 * Get or create the filesystem content source
 */
export function getFilesystemSource(config?: FilesystemConfig): FilesystemContentSource {
  if (!currentSource && config) {
    currentSource = new FilesystemContentSource(config)
  }
  return currentSource!
}

/**
 * Create a new filesystem content source with bundled content
 */
export function createBundledSource(): FilesystemContentSource {
  currentSource = new FilesystemContentSource({
    mode: 'bundled',
    basePath: BUNDLED_BASE_PATH,
    displayPath: 'Bundled Examples',
  })
  return currentSource
}

/**
 * Create a new filesystem content source with File System Access API
 */
export async function createFilesystemSource(): Promise<FilesystemContentSource | null> {
  // Check if File System Access API is supported
  if (!('showDirectoryPicker' in window)) {
    console.warn('File System Access API not supported')
    return null
  }

  try {
    // File System Access API - cast for TypeScript compatibility
    const showDirectoryPicker = (window as Window & { showDirectoryPicker: (options?: { mode?: string }) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker
    const directoryHandle = await showDirectoryPicker({
      mode: 'readwrite',
    })

    currentSource = new FilesystemContentSource({
      mode: 'filesystem',
      directoryHandle,
      displayPath: directoryHandle.name,
    })

    await currentSource.initialize()
    return currentSource
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Failed to open directory:', error)
    }
    return null
  }
}

/**
 * Check if File System Access API is available
 */
export function isFilesystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/**
 * Get the current filesystem source if one exists
 */
export function getCurrentFilesystemSource(): FilesystemContentSource | null {
  return currentSource
}

/**
 * Clear the current filesystem source
 */
export function clearFilesystemSource(): void {
  if (currentSource) {
    currentSource.close()
    currentSource = null
  }
}



