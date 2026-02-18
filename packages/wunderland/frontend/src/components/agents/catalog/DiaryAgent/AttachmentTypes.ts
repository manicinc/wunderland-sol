/**
 * @file AttachmentTypes.ts
 * @description Type definitions for diary entry attachments (canvas, images, audio, etc.)
 * Enables markdown as source of truth with referenced attachments.
 * @version 1.0.0
 */

/**
 * Supported attachment types
 */
export type AttachmentType = 'canvas' | 'image' | 'audio' | 'video' | 'file'

/**
 * Supported attachment formats
 */
export type AttachmentFormat =
  // Canvas formats
  | 'tldraw-json'
  | 'tldraw-snapshot'
  // Image formats
  | 'png'
  | 'jpg'
  | 'jpeg'
  | 'webp'
  | 'svg'
  | 'gif'
  // Audio formats
  | 'mp3'
  | 'wav'
  | 'ogg'
  | 'webm'
  // Video formats
  | 'mp4'
  // Document formats
  | 'pdf'
  | 'json'

/**
 * Canvas-specific metadata
 */
export interface CanvasMetadata {
  /** Number of shapes on the canvas */
  shapeCount?: number
  /** Whether the canvas contains handwriting */
  hasHandwriting?: boolean
  /** Whether the canvas contains text elements */
  hasText?: boolean
  /** Primary colors used */
  colors?: string[]
  /** Canvas bounds (for viewport) */
  bounds?: {
    minX: number
    minY: number
    maxX: number
    maxY: number
    width: number
    height: number
  }
  /** Last tool used */
  lastTool?: string
}

/**
 * Image-specific metadata
 */
export interface ImageMetadata {
  /** Image dimensions */
  width?: number
  height?: number
  /** Image alt text for accessibility */
  alt?: string
  /** Image caption */
  caption?: string
}

/**
 * Audio-specific metadata
 */
export interface AudioMetadata {
  /** Duration in seconds */
  duration?: number
  /** Whether this is a voice note */
  isVoiceNote?: boolean
  /** Transcription if available */
  transcription?: string
}

/**
 * Base attachment interface
 */
export interface DiaryAttachment {
  /** Unique attachment ID */
  id: string
  /** Attachment type */
  type: AttachmentType
  /** File format */
  format: AttachmentFormat
  /** Relative path to attachment file (or data URL for inline) */
  path: string
  /** Optional inline data (base64 for small files, JSON for canvas) */
  inlineData?: string
  /** Human-readable title */
  title?: string
  /** Optional description */
  description?: string
  /** Creation timestamp */
  createdAt: string
  /** Last modified timestamp */
  updatedAt: string
  /** File size in bytes (if applicable) */
  size?: number
  /** MIME type */
  mimeType?: string
  /** Type-specific metadata */
  metadata?: CanvasMetadata | ImageMetadata | AudioMetadata | Record<string, any>
  /** Tags for organization */
  tags?: string[]
  /** Position in entry (for rendering order) */
  position?: 'inline' | 'end' | 'hidden'
  /** Reference anchor in markdown (e.g., #canvas-1) */
  anchor?: string
}

/**
 * Canvas attachment with specific metadata
 */
export interface CanvasAttachment extends DiaryAttachment {
  type: 'canvas'
  format: 'tldraw-json' | 'tldraw-snapshot'
  metadata?: CanvasMetadata
  /** Exported preview image (base64 PNG) */
  previewImage?: string
  /** Exported SVG (for vector display) */
  svgExport?: string
}

/**
 * Image attachment with specific metadata
 */
export interface ImageAttachment extends DiaryAttachment {
  type: 'image'
  format: 'png' | 'jpg' | 'jpeg' | 'webp' | 'svg' | 'gif'
  metadata?: ImageMetadata
  /** Thumbnail (base64, smaller size) */
  thumbnail?: string
}

/**
 * Audio attachment with specific metadata
 */
export interface AudioAttachment extends DiaryAttachment {
  type: 'audio'
  format: 'mp3' | 'wav' | 'ogg' | 'webm'
  metadata?: AudioMetadata
}

/**
 * Attachment storage configuration
 */
export interface AttachmentStorageConfig {
  /** Maximum inline data size in bytes (larger files stored as paths) */
  maxInlineSize: number
  /** Storage backend type */
  storageType: 'localStorage' | 'indexedDB' | 'filesystem' | 'cloud'
  /** Base path for file storage */
  basePath: string
  /** Whether to generate thumbnails for images */
  generateThumbnails: boolean
  /** Whether to generate previews for canvas */
  generateCanvasPreviews: boolean
  /** Compression quality for images (0-1) */
  imageQuality: number
}

/**
 * Default storage configuration
 */
export const DEFAULT_ATTACHMENT_CONFIG: AttachmentStorageConfig = {
  maxInlineSize: 100 * 1024, // 100KB - inline for small files
  storageType: 'localStorage',
  basePath: '.attachments',
  generateThumbnails: true,
  generateCanvasPreviews: true,
  imageQuality: 0.85,
}

/**
 * Attachment export options
 */
export interface AttachmentExportOptions {
  /** Export format */
  format: 'png' | 'svg' | 'pdf' | 'markdown'
  /** Image quality (for PNG/JPG) */
  quality?: number
  /** Scale factor */
  scale?: number
  /** Include background */
  includeBackground?: boolean
  /** Padding around content */
  padding?: number
}

/**
 * Frontmatter attachment reference format
 * This is how attachments are referenced in markdown frontmatter
 */
export interface FrontmatterAttachmentRef {
  id: string
  type: AttachmentType
  format: AttachmentFormat
  path: string
  title?: string
  createdAt: string
}

/**
 * Generate a unique attachment ID
 */
export function generateAttachmentId(type: AttachmentType): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${type}-${timestamp}-${random}`
}

/**
 * Get MIME type for attachment format
 */
export function getMimeType(format: AttachmentFormat): string {
  const mimeTypes: Record<AttachmentFormat, string> = {
    'tldraw-json': 'application/json',
    'tldraw-snapshot': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'gif': 'image/gif',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'webm': 'audio/webm',
    'mp4': 'video/mp4',
    'pdf': 'application/pdf',
    'json': 'application/json',
  }
  return mimeTypes[format] || 'application/octet-stream'
}

/**
 * Check if attachment should be stored inline
 */
export function shouldStoreInline(
  size: number,
  config: AttachmentStorageConfig = DEFAULT_ATTACHMENT_CONFIG
): boolean {
  return size <= config.maxInlineSize
}

/**
 * Generate markdown reference for attachment
 */
export function generateMarkdownRef(attachment: DiaryAttachment): string {
  const anchor = attachment.anchor || attachment.id

  switch (attachment.type) {
    case 'canvas':
      return `[View Canvas: ${attachment.title || 'Untitled'}](#${anchor})`
    case 'image':
      const alt = (attachment.metadata as ImageMetadata)?.alt || attachment.title || 'Image'
      return `![${alt}](${attachment.path})`
    case 'audio':
      return `[Listen: ${attachment.title || 'Audio'}](${attachment.path})`
    default:
      return `[${attachment.title || 'Attachment'}](${attachment.path})`
  }
}

/**
 * Generate frontmatter YAML for attachments
 */
export function generateAttachmentsFrontmatter(
  attachments: DiaryAttachment[]
): string {
  if (!attachments.length) return ''

  const refs: FrontmatterAttachmentRef[] = attachments.map(a => ({
    id: a.id,
    type: a.type,
    format: a.format,
    path: a.path,
    title: a.title,
    createdAt: a.createdAt,
  }))

  const lines = ['attachments:']
  refs.forEach(ref => {
    lines.push(`  - id: ${ref.id}`)
    lines.push(`    type: ${ref.type}`)
    lines.push(`    format: ${ref.format}`)
    lines.push(`    path: ${ref.path}`)
    if (ref.title) lines.push(`    title: "${ref.title}"`)
    lines.push(`    createdAt: ${ref.createdAt}`)
  })

  return lines.join('\n')
}
