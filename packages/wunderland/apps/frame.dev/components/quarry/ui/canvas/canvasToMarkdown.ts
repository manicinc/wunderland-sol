/**
 * Canvas to Markdown Export Utility
 * @module codex/ui/canvas/canvasToMarkdown
 *
 * @remarks
 * Smart export utility for converting tldraw canvas content to structured markdown:
 * - VoiceNoteShape → audio embed with transcript
 * - TranscriptShape → blockquote with tags
 * - AttachmentShape → image/file links
 * - Drawing shapes → export as embedded images
 *
 * @example
 * ```tsx
 * const result = await canvasToMarkdown(editor, { includeDrawings: true })
 * console.log(result.markdown)
 * console.log(result.assets) // Blobs to save
 * ```
 */

import type { Editor, TLShape } from '@tldraw/tldraw'
import type {
  VoiceNoteShape,
  TranscriptShape,
  AttachmentShape,
  HandwritingShape,
  StickyNoteShape,
  FrameShape,
  LinkPreviewShape,
  StrandShape,
  CanvasCustomShape,
} from './shapes/types'
import { formatDuration, isImageMimeType } from './shapes/types'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

/** Asset extracted from canvas for saving */
export interface CanvasAsset {
  /** Asset type */
  type: 'audio' | 'image' | 'file' | 'drawing'
  /** Relative path for the asset */
  path: string
  /** Blob data (if available) */
  blob?: Blob
  /** Original filename */
  filename: string
  /** Duration in seconds (for audio) */
  duration?: number
}

/** Metadata about the exported canvas */
export interface CanvasExportMetadata {
  /** Total number of shapes processed */
  shapeCount: number
  /** Count by shape type */
  shapeCounts: {
    voicenotes: number
    transcripts: number
    attachments: number
    handwriting: number
    drawings: number
    stickynotes: number
    frames: number
    linkpreviews: number
    strands: number
  }
  /** Whether canvas has voice notes */
  hasVoiceNotes: boolean
  /** Whether canvas has transcripts */
  hasTranscripts: boolean
  /** Whether canvas has attachments */
  hasAttachments: boolean
  /** Whether canvas has handwriting */
  hasHandwriting: boolean
  /** Whether canvas has drawings */
  hasDrawings: boolean
  /** Whether canvas has sticky notes */
  hasStickyNotes: boolean
  /** Whether canvas has frames */
  hasFrames: boolean
  /** Whether canvas has link previews */
  hasLinkPreviews: boolean
  /** Whether canvas has strands */
  hasStrands: boolean
  /** Export timestamp */
  exportedAt: string
}

/** Result of canvas export */
export interface CanvasExportResult {
  /** Generated markdown content */
  markdown: string
  /** Frontmatter for the strand */
  frontmatter: Record<string, unknown>
  /** Assets to save */
  assets: CanvasAsset[]
  /** Export metadata */
  metadata: CanvasExportMetadata
}

/** Export options */
export interface CanvasExportOptions {
  /** Include drawing shapes as images (default: true) */
  includeDrawings?: boolean
  /** Group content by type vs. spatial order (default: 'type') */
  groupBy?: 'type' | 'position'
  /** Include linked voice notes with transcripts (default: true) */
  includeLinkedAudio?: boolean
  /** Strand title (default: 'Canvas Export') */
  title?: string
  /** Strand tags (default: ['canvas', 'export']) */
  tags?: string[]
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHAPE TYPE GUARDS
═══════════════════════════════════════════════════════════════════════════ */

function isVoiceNoteShape(shape: TLShape): shape is VoiceNoteShape {
  return shape.type === 'voicenote'
}

function isTranscriptShape(shape: TLShape): shape is TranscriptShape {
  return shape.type === 'transcript'
}

function isAttachmentShape(shape: TLShape): shape is AttachmentShape {
  return shape.type === 'attachment'
}

function isHandwritingShape(shape: TLShape): shape is HandwritingShape {
  return shape.type === 'handwriting'
}

function isDrawShape(shape: TLShape): boolean {
  return ['draw', 'line', 'arrow', 'geo', 'text', 'note'].includes(shape.type)
}

function isStickyNoteShape(shape: TLShape): shape is StickyNoteShape {
  return shape.type === 'stickynote'
}

function isFrameShape(shape: TLShape): shape is FrameShape {
  return shape.type === 'frame'
}

function isLinkPreviewShape(shape: TLShape): shape is LinkPreviewShape {
  return shape.type === 'linkpreview'
}

function isStrandShape(shape: TLShape): shape is StrandShape {
  return shape.type === 'strand'
}

/* ═══════════════════════════════════════════════════════════════════════════
   MARKDOWN GENERATORS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Generate markdown for a voice note
 */
function voiceNoteToMarkdown(
  shape: VoiceNoteShape,
  includeTranscript = true
): string {
  const { title, audioPath, duration, transcriptText, recordedAt } = shape.props

  const lines: string[] = []

  // Header
  lines.push(`## ${title || 'Voice Note'}`)
  lines.push('')

  // Audio embed
  if (audioPath) {
    lines.push(`<audio controls src="./${audioPath}"></audio>`)
    lines.push('')
  }

  // Metadata
  lines.push(`*Recorded: ${new Date(recordedAt).toLocaleDateString()} • Duration: ${formatDuration(duration)}*`)
  lines.push('')

  // Transcript (if available and requested)
  if (includeTranscript && transcriptText) {
    lines.push('### Transcript')
    lines.push('')
    lines.push(`> ${transcriptText.replace(/\n/g, '\n> ')}`)
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Generate markdown for a transcript
 */
function transcriptToMarkdown(shape: TranscriptShape): string {
  const { title, text, tags, createdAt } = shape.props

  const lines: string[] = []

  // Header
  lines.push(`## ${title || 'Transcript'}`)
  lines.push('')

  // Content as blockquote
  if (text) {
    lines.push(`> ${text.replace(/\n/g, '\n> ')}`)
    lines.push('')
  }

  // Tags
  if (tags.length > 0) {
    lines.push(tags.map((t) => `#${t}`).join(' '))
    lines.push('')
  }

  // Metadata
  lines.push(`*Created: ${new Date(createdAt).toLocaleDateString()}*`)
  lines.push('')

  return lines.join('\n')
}

/**
 * Generate markdown for an attachment
 */
function attachmentToMarkdown(shape: AttachmentShape): string {
  const { fileName, filePath, mimeType, fileSize, dimensions } = shape.props

  const lines: string[] = []

  if (isImageMimeType(mimeType)) {
    // Image embed
    const altText = fileName.replace(/\.[^.]+$/, '')
    lines.push(`![${altText}](./${filePath})`)
    if (dimensions) {
      lines.push(`*${dimensions.width}x${dimensions.height}*`)
    }
  } else {
    // File link
    const sizeMB = (fileSize / (1024 * 1024)).toFixed(2)
    lines.push(`**[${fileName}](./${filePath})**`)
    lines.push(`*${sizeMB} MB*`)
  }

  lines.push('')
  return lines.join('\n')
}

/**
 * Generate markdown for a handwriting note
 */
function handwritingToMarkdown(shape: HandwritingShape, includeTranscript = true): string {
  const {
    title,
    imagePath,
    sourceType,
    localConfidence,
    previewText,
    transcriptionMode,
    createdAt,
  } = shape.props

  const lines: string[] = []

  // Header
  lines.push(`## ${title || 'Handwritten Note'}`)
  lines.push('')

  // Image embed
  if (imagePath) {
    lines.push(`![Handwriting](./${imagePath})`)
    lines.push('')
  }

  // Metadata
  const modeLabel = transcriptionMode === 'local' ? '⚡ Local OCR' : '☁️ Cloud AI'
  const confidenceLabel = localConfidence !== undefined ? ` • ${Math.round(localConfidence * 100)}% confidence` : ''
  lines.push(`*Created: ${new Date(createdAt).toLocaleDateString()} • Source: ${sourceType} • ${modeLabel}${confidenceLabel}*`)
  lines.push('')

  // Preview text (if available and requested)
  if (includeTranscript && previewText) {
    lines.push('### Transcription Preview')
    lines.push('')
    lines.push(`> ${previewText.replace(/\n/g, '\n> ')}`)
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Generate markdown section for drawings
 */
function drawingsToMarkdown(
  drawingPaths: string[]
): string {
  if (drawingPaths.length === 0) return ''

  const lines: string[] = []

  lines.push('## Drawings')
  lines.push('')

  for (const path of drawingPaths) {
    const name = path.split('/').pop()?.replace(/\.[^.]+$/, '') || 'drawing'
    lines.push(`![${name}](./${path})`)
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Generate markdown for a sticky note
 */
function stickyNoteToMarkdown(shape: StickyNoteShape): string {
  const { text, color } = shape.props

  const lines: string[] = []

  // Emoji prefix based on color
  const colorEmojis: Record<string, string> = {
    yellow: '💛',
    pink: '💖',
    blue: '💙',
    green: '💚',
    purple: '💜',
    orange: '🧡',
  }
  const emoji = colorEmojis[color] || '📝'

  // Render as blockquote to preserve the "note" feel
  if (text) {
    lines.push(`> ${emoji} **Note**`)
    lines.push('>')
    lines.push(`> ${text.replace(/\n/g, '\n> ')}`)
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Generate markdown for a frame (section header)
 */
function frameToMarkdown(shape: FrameShape): string {
  const { title } = shape.props

  const lines: string[] = []

  // Render as section header
  if (title) {
    lines.push(`## 📁 ${title}`)
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Generate markdown for a link preview
 */
function linkPreviewToMarkdown(shape: LinkPreviewShape): string {
  const { url, title, description, siteName } = shape.props

  const lines: string[] = []

  // Rich link format
  const displayTitle = title || url
  const siteLabel = siteName ? ` (${siteName})` : ''

  lines.push(`### 🔗 [${displayTitle}](${url})${siteLabel}`)
  lines.push('')

  if (description) {
    lines.push(`> ${description}`)
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Generate markdown for a strand reference
 */
function strandToMarkdown(shape: StrandShape): string {
  const { title, summary, strandPath, tags, difficulty, weaveSlug, loomSlug } = shape.props

  const lines: string[] = []

  // Difficulty badge
  const difficultyEmojis: Record<string, string> = {
    beginner: '🌱',
    intermediate: '🌿',
    advanced: '🌳',
    expert: '🏔️',
  }
  const diffEmoji = difficulty ? difficultyEmojis[difficulty] : ''

  // Render as internal link with metadata
  lines.push(`### ${diffEmoji} [${title}](${strandPath})`)
  lines.push('')

  if (summary) {
    lines.push(summary)
    lines.push('')
  }

  // Metadata line
  const metaParts: string[] = []
  if (weaveSlug) metaParts.push(`Weave: ${weaveSlug}`)
  if (loomSlug) metaParts.push(`Loom: ${loomSlug}`)
  if (tags.length > 0) metaParts.push(tags.map((t) => `#${t}`).join(' '))

  if (metaParts.length > 0) {
    lines.push(`*${metaParts.join(' • ')}*`)
    lines.push('')
  }

  return lines.join('\n')
}

/* ═══════════════════════════════════════════════════════════════════════════
   DRAWING EXPORT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Export drawing shapes as SVG
 */
async function exportDrawingsAsSvg(
  editor: Editor
): Promise<{ svg: string; blob: Blob } | null> {
  try {
    // Get all drawing-type shapes
    const shapes = editor.getCurrentPageShapes()
    const drawShapes = shapes.filter(isDrawShape)

    if (drawShapes.length === 0) return null

    // Select all draw shapes
    editor.select(...drawShapes.map((s) => s.id))

    // Export as SVG
    const svg = await editor.getSvg(drawShapes.map((s) => s.id))
    if (!svg) return null

    const svgString = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgString], { type: 'image/svg+xml' })

    // Deselect
    editor.selectNone()

    return { svg: svgString, blob }
  } catch (error) {
    console.error('Failed to export drawings:', error)
    return null
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN EXPORT FUNCTION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Convert canvas content to structured markdown
 *
 * @param editor - tldraw Editor instance
 * @param options - Export options
 * @returns CanvasExportResult with markdown, frontmatter, and assets
 *
 * @example
 * ```tsx
 * const result = await canvasToMarkdown(editor, {
 *   title: 'My Canvas Notes',
 *   includeDrawings: true,
 *   groupBy: 'type',
 * })
 *
 * // Save markdown
 * await saveStrand(result.markdown, result.frontmatter)
 *
 * // Save assets
 * for (const asset of result.assets) {
 *   if (asset.blob) {
 *     await saveAsset(asset.path, asset.blob)
 *   }
 * }
 * ```
 */
export async function canvasToMarkdown(
  editor: Editor,
  options: CanvasExportOptions = {}
): Promise<CanvasExportResult> {
  const {
    includeDrawings = true,
    groupBy = 'type',
    includeLinkedAudio = true,
    title = 'Canvas Export',
    tags = ['canvas', 'export'],
  } = options

  const shapes = editor.getCurrentPageShapes()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  // Categorize shapes
  const voiceNotes = shapes.filter(isVoiceNoteShape)
  const transcripts = shapes.filter(isTranscriptShape)
  const attachments = shapes.filter(isAttachmentShape)
  const handwritings = shapes.filter(isHandwritingShape)
  const drawings = shapes.filter(isDrawShape)
  const stickyNotes = shapes.filter(isStickyNoteShape)
  const frames = shapes.filter(isFrameShape)
  const linkPreviews = shapes.filter(isLinkPreviewShape)
  const strands = shapes.filter(isStrandShape)

  // Track assets
  const assets: CanvasAsset[] = []

  // Build markdown sections
  const sections: string[] = []

  // ─────────────────────────────────────────────────────────────────────────
  // Voice Notes Section
  // ─────────────────────────────────────────────────────────────────────────
  if (voiceNotes.length > 0) {
    if (groupBy === 'type') {
      sections.push('# Voice Notes\n')
    }

    for (const shape of voiceNotes) {
      // Track audio asset
      if (shape.props.audioPath) {
        assets.push({
          type: 'audio',
          path: shape.props.audioPath,
          filename: shape.props.audioPath.split('/').pop() || 'audio.webm',
          duration: shape.props.duration,
        })
      }

      sections.push(voiceNoteToMarkdown(shape, true))
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Transcripts Section (only standalone ones, not linked to voice notes)
  // ─────────────────────────────────────────────────────────────────────────
  const linkedTranscriptIds = new Set(
    voiceNotes.map((v) => v.props.linkedTranscriptId).filter(Boolean)
  )
  const standaloneTranscripts = transcripts.filter(
    (t) => !linkedTranscriptIds.has(t.id)
  )

  if (standaloneTranscripts.length > 0) {
    if (groupBy === 'type') {
      sections.push('# Transcripts\n')
    }

    for (const shape of standaloneTranscripts) {
      sections.push(transcriptToMarkdown(shape))
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Attachments Section
  // ─────────────────────────────────────────────────────────────────────────
  if (attachments.length > 0) {
    if (groupBy === 'type') {
      sections.push('# Attachments\n')
    }

    for (const shape of attachments) {
      // Track file asset
      if (shape.props.filePath) {
        assets.push({
          type: isImageMimeType(shape.props.mimeType) ? 'image' : 'file',
          path: shape.props.filePath,
          filename: shape.props.fileName,
        })
      }

      sections.push(attachmentToMarkdown(shape))
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Handwriting Section (only standalone ones, not linked to transcripts)
  // ─────────────────────────────────────────────────────────────────────────
  const linkedHandwritingIds = new Set(
    handwritings.map((h) => h.props.linkedTranscriptId).filter(Boolean)
  )
  const standaloneHandwritings = handwritings.filter(
    (h) => !linkedHandwritingIds.has(h.id)
  )

  if (standaloneHandwritings.length > 0) {
    if (groupBy === 'type') {
      sections.push('# Handwritten Notes\n')
    }

    for (const shape of standaloneHandwritings) {
      // Track image asset
      if (shape.props.imagePath) {
        assets.push({
          type: 'image',
          path: shape.props.imagePath,
          filename: shape.props.imagePath.split('/').pop() || 'handwriting.png',
        })
      }

      sections.push(handwritingToMarkdown(shape, true))
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Drawings Section
  // ─────────────────────────────────────────────────────────────────────────
  if (includeDrawings && drawings.length > 0) {
    const drawingResult = await exportDrawingsAsSvg(editor)

    if (drawingResult) {
      const drawingPath = `assets/drawings/canvas-${timestamp}.svg`

      assets.push({
        type: 'drawing',
        path: drawingPath,
        blob: drawingResult.blob,
        filename: `canvas-${timestamp}.svg`,
      })

      if (groupBy === 'type') {
        sections.push('# Drawings\n')
      }
      sections.push(`![Canvas Drawing](./${drawingPath})\n`)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Sticky Notes Section
  // ─────────────────────────────────────────────────────────────────────────
  if (stickyNotes.length > 0) {
    if (groupBy === 'type') {
      sections.push('# Notes\n')
    }

    for (const shape of stickyNotes) {
      sections.push(stickyNoteToMarkdown(shape))
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Frames Section (rendered as section headers)
  // ─────────────────────────────────────────────────────────────────────────
  if (frames.length > 0) {
    // Frames are rendered inline as section headers
    // We track them but don't create a separate section
    for (const shape of frames) {
      // Only add frames that have titles
      if (shape.props.title && shape.props.showTitle) {
        sections.push(frameToMarkdown(shape))
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Link Previews Section
  // ─────────────────────────────────────────────────────────────────────────
  if (linkPreviews.length > 0) {
    if (groupBy === 'type') {
      sections.push('# Links & References\n')
    }

    for (const shape of linkPreviews) {
      sections.push(linkPreviewToMarkdown(shape))
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Strands Section (referenced knowledge units)
  // ─────────────────────────────────────────────────────────────────────────
  if (strands.length > 0) {
    if (groupBy === 'type') {
      sections.push('# Related Strands\n')
    }

    for (const shape of strands) {
      sections.push(strandToMarkdown(shape))
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Build Final Markdown
  // ─────────────────────────────────────────────────────────────────────────
  const frontmatter: Record<string, unknown> = {
    title,
    tags,
    created: new Date().toISOString(),
    source: 'canvas-export',
    canvas: {
      shapeCount: shapes.length,
      voiceNotes: voiceNotes.length,
      transcripts: transcripts.length,
      attachments: attachments.length,
      handwriting: handwritings.length,
      drawings: drawings.length,
      stickyNotes: stickyNotes.length,
      frames: frames.length,
      linkPreviews: linkPreviews.length,
      strands: strands.length,
    },
  }

  const markdown = sections.join('\n---\n\n')

  const metadata: CanvasExportMetadata = {
    shapeCount: shapes.length,
    shapeCounts: {
      voicenotes: voiceNotes.length,
      transcripts: transcripts.length,
      attachments: attachments.length,
      handwriting: handwritings.length,
      drawings: drawings.length,
      stickynotes: stickyNotes.length,
      frames: frames.length,
      linkpreviews: linkPreviews.length,
      strands: strands.length,
    },
    hasVoiceNotes: voiceNotes.length > 0,
    hasTranscripts: transcripts.length > 0,
    hasAttachments: attachments.length > 0,
    hasHandwriting: handwritings.length > 0,
    hasDrawings: drawings.length > 0,
    hasStickyNotes: stickyNotes.length > 0,
    hasFrames: frames.length > 0,
    hasLinkPreviews: linkPreviews.length > 0,
    hasStrands: strands.length > 0,
    exportedAt: new Date().toISOString(),
  }

  return {
    markdown,
    frontmatter,
    assets,
    metadata,
  }
}

/**
 * Check if canvas has exportable content
 */
export function canvasHasContent(editor: Editor): boolean {
  const shapes = editor.getCurrentPageShapes()
  return shapes.some(
    (s) =>
      isVoiceNoteShape(s) ||
      isTranscriptShape(s) ||
      isAttachmentShape(s) ||
      isHandwritingShape(s) ||
      isDrawShape(s) ||
      isStickyNoteShape(s) ||
      isFrameShape(s) ||
      isLinkPreviewShape(s) ||
      isStrandShape(s)
  )
}

/**
 * Get a summary of canvas content for preview
 */
export function getCanvasSummary(editor: Editor): CanvasExportMetadata {
  const shapes = editor.getCurrentPageShapes()

  const voiceNotes = shapes.filter(isVoiceNoteShape)
  const transcripts = shapes.filter(isTranscriptShape)
  const attachments = shapes.filter(isAttachmentShape)
  const handwritings = shapes.filter(isHandwritingShape)
  const drawings = shapes.filter(isDrawShape)
  const stickyNotes = shapes.filter(isStickyNoteShape)
  const frames = shapes.filter(isFrameShape)
  const linkPreviews = shapes.filter(isLinkPreviewShape)
  const strands = shapes.filter(isStrandShape)

  return {
    shapeCount: shapes.length,
    shapeCounts: {
      voicenotes: voiceNotes.length,
      transcripts: transcripts.length,
      attachments: attachments.length,
      handwriting: handwritings.length,
      drawings: drawings.length,
      stickynotes: stickyNotes.length,
      frames: frames.length,
      linkpreviews: linkPreviews.length,
      strands: strands.length,
    },
    hasVoiceNotes: voiceNotes.length > 0,
    hasTranscripts: transcripts.length > 0,
    hasAttachments: attachments.length > 0,
    hasHandwriting: handwritings.length > 0,
    hasDrawings: drawings.length > 0,
    hasStickyNotes: stickyNotes.length > 0,
    hasFrames: frames.length > 0,
    hasLinkPreviews: linkPreviews.length > 0,
    hasStrands: strands.length > 0,
    exportedAt: new Date().toISOString(),
  }
}

export default canvasToMarkdown
