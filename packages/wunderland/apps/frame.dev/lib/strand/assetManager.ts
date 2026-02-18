/**
 * Strand Asset Manager - Track and manage media assets in strand schema
 * @module lib/strand/assetManager
 *
 * Provides:
 * - Parse markdown to find asset references
 * - Update strand frontmatter with asset list
 * - Detect orphaned assets
 * - Generate asset manifest for folder-strands
 */

import matter from 'gray-matter'

/** Media asset types */
export type AssetType = 'image' | 'audio' | 'video' | 'drawing' | 'document'

/** Asset source types */
export type AssetSource = 'camera' | 'upload' | 'voice' | 'whiteboard' | 'external'

/** Strand media asset metadata */
export interface StrandMediaAsset {
  /** Relative path within strand folder */
  path: string
  /** Asset type */
  type: AssetType
  /** How the asset was created */
  source: AssetSource
  /** When the asset was captured/uploaded */
  capturedAt?: string
  /** Sync status */
  syncStatus?: 'local' | 'synced' | 'pending'
  /** Original filename */
  originalName?: string
  /** File size in bytes */
  size?: number
  /** MIME type */
  mimeType?: string
}

/** Asset reference found in markdown */
export interface AssetReference {
  /** Full match string */
  match: string
  /** Extracted path */
  path: string
  /** Alt text or description */
  alt?: string
  /** Type inferred from extension */
  type: AssetType
  /** Line number in content */
  line?: number
}

/** Regex patterns for finding asset references in markdown */
const ASSET_PATTERNS = {
  // ![alt](path) - markdown images
  markdownImage: /!\[([^\]]*)\]\(([^)]+)\)/g,
  // <img src="path"> - HTML images
  htmlImage: /<img[^>]+src=["']([^"']+)["'][^>]*>/gi,
  // <audio src="path"> - HTML audio
  htmlAudio: /<audio[^>]+src=["']([^"']+)["'][^>]*>/gi,
  // <video src="path"> - HTML video
  htmlVideo: /<video[^>]+src=["']([^"']+)["'][^>]*>/gi,
  // <source src="path"> - HTML source elements
  htmlSource: /<source[^>]+src=["']([^"']+)["'][^>]*>/gi,
  // [text](path) - markdown links (for documents)
  markdownLink: /\[([^\]]+)\]\(([^)]+)\)/g,
}

/** File extensions by asset type */
const EXTENSION_MAP: Record<string, AssetType> = {
  // Images
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  avif: 'image',
  // Audio
  mp3: 'audio',
  wav: 'audio',
  ogg: 'audio',
  webm: 'audio', // Can be audio or video
  m4a: 'audio',
  // Video
  mp4: 'video',
  mov: 'video',
  avi: 'video',
  mkv: 'video',
  // Drawings (SVG treated specially)
  // Documents
  pdf: 'document',
  doc: 'document',
  docx: 'document',
  txt: 'document',
}

/**
 * Infer asset type from file path/extension
 */
export function inferAssetType(path: string): AssetType {
  const ext = path.split('.').pop()?.toLowerCase() || ''

  // Check if it's a drawing (SVG in drawings folder)
  if (path.includes('drawings/') && ext === 'svg') {
    return 'drawing'
  }

  return EXTENSION_MAP[ext] || 'image'
}

/**
 * Infer asset source from path
 */
export function inferAssetSource(path: string): AssetSource {
  if (path.includes('photos/')) return 'camera'
  if (path.includes('audio/')) return 'voice'
  if (path.includes('drawings/')) return 'whiteboard'
  if (path.startsWith('http://') || path.startsWith('https://')) return 'external'
  return 'upload'
}

/**
 * Check if a path is a local asset (not external URL)
 */
export function isLocalAsset(path: string): boolean {
  return !path.startsWith('http://') && !path.startsWith('https://')
}

/**
 * Normalize asset path (remove ./ prefix, normalize slashes)
 */
export function normalizeAssetPath(path: string): string {
  return path
    .replace(/^\.\//, '')
    .replace(/\\/g, '/')
    .trim()
}

/**
 * Parse markdown content to find all asset references
 */
export function findAssetReferences(content: string): AssetReference[] {
  const references: AssetReference[] = []
  const lines = content.split('\n')

  // Helper to find line number
  const findLineNumber = (match: string, startIndex: number = 0): number => {
    let charCount = 0
    for (let i = 0; i < lines.length; i++) {
      charCount += lines[i].length + 1 // +1 for newline
      if (charCount > startIndex) return i + 1
    }
    return 0
  }

  // Find markdown images
  let match
  while ((match = ASSET_PATTERNS.markdownImage.exec(content)) !== null) {
    const path = normalizeAssetPath(match[2])
    if (isLocalAsset(path)) {
      references.push({
        match: match[0],
        path,
        alt: match[1],
        type: inferAssetType(path),
        line: findLineNumber(match[0], match.index),
      })
    }
  }

  // Reset regex
  ASSET_PATTERNS.markdownImage.lastIndex = 0

  // Find HTML images
  while ((match = ASSET_PATTERNS.htmlImage.exec(content)) !== null) {
    const path = normalizeAssetPath(match[1])
    if (isLocalAsset(path)) {
      references.push({
        match: match[0],
        path,
        type: 'image',
        line: findLineNumber(match[0], match.index),
      })
    }
  }
  ASSET_PATTERNS.htmlImage.lastIndex = 0

  // Find HTML audio
  while ((match = ASSET_PATTERNS.htmlAudio.exec(content)) !== null) {
    const path = normalizeAssetPath(match[1])
    if (isLocalAsset(path)) {
      references.push({
        match: match[0],
        path,
        type: 'audio',
        line: findLineNumber(match[0], match.index),
      })
    }
  }
  ASSET_PATTERNS.htmlAudio.lastIndex = 0

  // Find HTML video
  while ((match = ASSET_PATTERNS.htmlVideo.exec(content)) !== null) {
    const path = normalizeAssetPath(match[1])
    if (isLocalAsset(path)) {
      references.push({
        match: match[0],
        path,
        type: 'video',
        line: findLineNumber(match[0], match.index),
      })
    }
  }
  ASSET_PATTERNS.htmlVideo.lastIndex = 0

  // Find HTML source elements
  while ((match = ASSET_PATTERNS.htmlSource.exec(content)) !== null) {
    const path = normalizeAssetPath(match[1])
    if (isLocalAsset(path)) {
      references.push({
        match: match[0],
        path,
        type: inferAssetType(path),
        line: findLineNumber(match[0], match.index),
      })
    }
  }
  ASSET_PATTERNS.htmlSource.lastIndex = 0

  // Deduplicate by path
  const seen = new Set<string>()
  return references.filter(ref => {
    if (seen.has(ref.path)) return false
    seen.add(ref.path)
    return true
  })
}

/**
 * Get unique asset paths from markdown content
 */
export function getAssetPaths(content: string): string[] {
  const refs = findAssetReferences(content)
  return [...new Set(refs.map(r => r.path))]
}

/**
 * Update strand frontmatter with media asset list
 */
export function updateStrandAssets(
  content: string,
  assets: StrandMediaAsset[]
): string {
  const { data: frontmatter, content: body } = matter(content)

  // Update or create includes.media array
  if (!frontmatter.includes) {
    frontmatter.includes = {}
  }

  // Store asset paths in includes.media
  frontmatter.includes.media = assets.map(a => a.path)

  // Store detailed asset metadata separately
  frontmatter.mediaAssets = assets.map(a => ({
    path: a.path,
    type: a.type,
    source: a.source,
    capturedAt: a.capturedAt,
  }))

  // Reconstruct markdown with updated frontmatter
  return matter.stringify(body, frontmatter)
}

/**
 * Extract current assets from strand frontmatter
 */
export function extractStrandAssets(content: string): StrandMediaAsset[] {
  const { data: frontmatter } = matter(content)

  // Check for detailed metadata first
  if (frontmatter.mediaAssets && Array.isArray(frontmatter.mediaAssets)) {
    return frontmatter.mediaAssets.map((a: any) => ({
      path: a.path,
      type: a.type || inferAssetType(a.path),
      source: a.source || inferAssetSource(a.path),
      capturedAt: a.capturedAt,
      syncStatus: a.syncStatus,
    }))
  }

  // Fall back to includes.media paths
  if (frontmatter.includes?.media && Array.isArray(frontmatter.includes.media)) {
    return frontmatter.includes.media.map((path: string) => ({
      path,
      type: inferAssetType(path),
      source: inferAssetSource(path),
    }))
  }

  return []
}

/**
 * Find orphaned assets (in frontmatter but not referenced in content)
 */
export function findOrphanedAssets(
  content: string,
  registeredAssets: StrandMediaAsset[]
): StrandMediaAsset[] {
  const referencedPaths = new Set(getAssetPaths(content))

  return registeredAssets.filter(asset => !referencedPaths.has(asset.path))
}

/**
 * Find unreferenced assets (referenced in content but not in frontmatter)
 */
export function findUnregisteredAssets(
  content: string,
  registeredAssets: StrandMediaAsset[]
): AssetReference[] {
  const registeredPaths = new Set(registeredAssets.map(a => a.path))
  const references = findAssetReferences(content)

  return references.filter(ref => !registeredPaths.has(ref.path))
}

/**
 * Sync frontmatter with content references
 * - Adds missing assets from content
 * - Optionally removes orphaned assets
 */
export function syncStrandAssets(
  content: string,
  options: { removeOrphans?: boolean } = {}
): string {
  const { data: frontmatter, content: body } = matter(content)
  const existingAssets = extractStrandAssets(content)
  const references = findAssetReferences(body)

  // Build updated asset list
  const assetMap = new Map<string, StrandMediaAsset>()

  // Add existing assets
  for (const asset of existingAssets) {
    assetMap.set(asset.path, asset)
  }

  // Add/update from content references
  for (const ref of references) {
    if (!assetMap.has(ref.path)) {
      assetMap.set(ref.path, {
        path: ref.path,
        type: ref.type,
        source: inferAssetSource(ref.path),
        capturedAt: new Date().toISOString(),
      })
    }
  }

  // Optionally remove orphans
  if (options.removeOrphans) {
    const referencedPaths = new Set(references.map(r => r.path))
    for (const path of assetMap.keys()) {
      if (!referencedPaths.has(path)) {
        assetMap.delete(path)
      }
    }
  }

  const assets = Array.from(assetMap.values())
  return updateStrandAssets(content, assets)
}

/**
 * Generate asset manifest for folder-strands (strand.yml format)
 */
export function generateAssetManifest(
  assets: StrandMediaAsset[]
): Record<string, string[]> {
  const manifest: Record<string, string[]> = {
    images: [],
    audio: [],
    video: [],
    drawings: [],
    documents: [],
  }

  for (const asset of assets) {
    switch (asset.type) {
      case 'image':
        manifest.images.push(asset.path)
        break
      case 'audio':
        manifest.audio.push(asset.path)
        break
      case 'video':
        manifest.video.push(asset.path)
        break
      case 'drawing':
        manifest.drawings.push(asset.path)
        break
      case 'document':
        manifest.documents.push(asset.path)
        break
    }
  }

  // Remove empty arrays
  for (const key of Object.keys(manifest)) {
    if (manifest[key].length === 0) {
      delete manifest[key]
    }
  }

  return manifest
}

/**
 * Create a new StrandMediaAsset from a captured media blob
 */
export function createAssetFromCapture(
  path: string,
  source: AssetSource,
  options?: {
    originalName?: string
    size?: number
    mimeType?: string
  }
): StrandMediaAsset {
  return {
    path: normalizeAssetPath(path),
    type: inferAssetType(path),
    source,
    capturedAt: new Date().toISOString(),
    syncStatus: 'local',
    originalName: options?.originalName,
    size: options?.size,
    mimeType: options?.mimeType,
  }
}

export default {
  findAssetReferences,
  getAssetPaths,
  updateStrandAssets,
  extractStrandAssets,
  findOrphanedAssets,
  findUnregisteredAssets,
  syncStrandAssets,
  generateAssetManifest,
  createAssetFromCapture,
  inferAssetType,
  inferAssetSource,
  isLocalAsset,
  normalizeAssetPath,
}
