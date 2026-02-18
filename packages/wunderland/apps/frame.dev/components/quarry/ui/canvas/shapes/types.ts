/**
 * Canvas Shape Type Definitions
 * @module codex/ui/canvas/shapes/types
 *
 * Type definitions for custom tldraw shapes:
 * - VoiceNoteShape: Audio player with waveform
 * - TranscriptShape: Text card linked to voice notes
 * - AttachmentShape: File/image embed with AI analysis
 * - HandwritingShape: Handwritten notes with OCR transcription
 */

import type { TLBaseShape } from '@tldraw/tldraw'
import type { ImageSourceType, ImageAnalysisResult } from '@/lib/ai/types'

/* ═══════════════════════════════════════════════════════════════════════════
   VOICE NOTE SHAPE
═══════════════════════════════════════════════════════════════════════════ */

/** Transcription status for voice notes */
export type TranscriptionStatus =
  | 'idle'       // Not transcribed, can start
  | 'pending'    // Queued for transcription
  | 'processing' // Currently transcribing
  | 'done'       // Transcription complete
  | 'error'      // Transcription failed
  | 'cancelled'  // User cancelled transcription

/** VoiceNote shape props */
export interface VoiceNoteShapeProps {
  /** Width of shape */
  w: number
  /** Height of shape */
  h: number
  /** Relative path to audio file in assets/audio/ */
  audioPath: string
  /** Total duration in seconds */
  duration: number
  /** Current playback position in seconds */
  currentTime: number
  /** Whether audio is playing */
  isPlaying: boolean
  /** Normalized waveform data (0-1 values) */
  waveformData: number[]
  /** Inline transcript preview text */
  transcriptText: string
  /** ID of linked TranscriptShape */
  linkedTranscriptId: string
  /** ISO timestamp when recorded */
  recordedAt: string
  /** User-editable title */
  title: string
  /** Current transcription status */
  transcriptionStatus: TranscriptionStatus
}

/** VoiceNote shape type */
export type VoiceNoteShape = TLBaseShape<'voicenote', VoiceNoteShapeProps>

/* ═══════════════════════════════════════════════════════════════════════════
   TRANSCRIPT SHAPE
═══════════════════════════════════════════════════════════════════════════ */

/** Timestamped text segment for audio sync */
export interface TranscriptTimestamp {
  /** Time in seconds */
  time: number
  /** Text at this timestamp */
  text: string
}

/** Transcript shape props */
export interface TranscriptShapeProps {
  /** Width of shape */
  w: number
  /** Height of shape */
  h: number
  /** Header title */
  title: string
  /** Full transcript text */
  text: string
  /** ID of linked VoiceNoteShape */
  linkedVoiceNoteId: string
  /** Hashtags for categorization */
  tags: string[]
  /** Timestamp markers for audio sync */
  timestamps: TranscriptTimestamp[]
  /** Card color theme */
  color: string
  /** ISO timestamp when created */
  createdAt: string
}

/** Transcript shape type */
export type TranscriptShape = TLBaseShape<'transcript', TranscriptShapeProps>

/* ═══════════════════════════════════════════════════════════════════════════
   ATTACHMENT SHAPE
═══════════════════════════════════════════════════════════════════════════ */

/** Image/video dimensions */
export interface MediaDimensions {
  width: number
  height: number
}

/** Attachment shape props */
export interface AttachmentShapeProps {
  /** Width of shape */
  w: number
  /** Height of shape */
  h: number
  /** Display filename */
  fileName: string
  /** Relative path to file in assets/ */
  filePath: string
  /** MIME type of file */
  mimeType: string
  /** File size in bytes */
  fileSize: number
  /** Optional thumbnail URL for images/videos */
  thumbnailPath: string
  /** Dimensions for images/videos */
  dimensions: MediaDimensions | null
  /** ISO timestamp when uploaded */
  uploadedAt: string
  /** AI-generated caption/description for images */
  caption?: string
  /** Image source type (camera, upload, screenshot, etc.) */
  sourceType?: ImageSourceType
  /** Complete image analysis result */
  analysisMetadata?: ImageAnalysisResult
  /** Current analysis status */
  analysisStatus?: 'idle' | 'analyzing' | 'done' | 'error'
}

/** Attachment shape type */
export type AttachmentShape = TLBaseShape<'attachment', AttachmentShapeProps>

/* ═══════════════════════════════════════════════════════════════════════════
   HANDWRITING SHAPE
═══════════════════════════════════════════════════════════════════════════ */

/** Source type for handwriting content */
export type HandwritingSourceType = 'canvas' | 'upload' | 'camera'

/** OCR transcription mode */
export type OCRMode = 'local' | 'cloud' | 'manual'

/** Handwriting shape props */
export interface HandwritingShapeProps {
  /** Width of shape */
  w: number
  /** Height of shape */
  h: number
  /** Source of handwriting content */
  sourceType: HandwritingSourceType
  /** SVG/canvas stroke data (for canvas-drawn content) */
  strokesData?: string
  /** Relative path to uploaded image */
  imagePath?: string
  /** Image blob (temporary, before upload) */
  imageBlob?: Blob
  /** Image dimensions if known */
  dimensions?: MediaDimensions | null
  /** User-editable title */
  title: string
  /** Current transcription status */
  transcriptionStatus: TranscriptionStatus
  /** OCR mode used/to use */
  transcriptionMode: OCRMode
  /** Local OCR confidence score (0-1) */
  localConfidence?: number
  /** ID of linked TranscriptShape */
  linkedTranscriptId: string
  /** Preview text (first 100 chars of transcription) */
  previewText: string
  /** ISO timestamp when created */
  createdAt: string
  /** Language for OCR */
  language: 'en'
}

/** Handwriting shape type */
export type HandwritingShape = TLBaseShape<'handwriting', HandwritingShapeProps>

/* ═══════════════════════════════════════════════════════════════════════════
   SHAPE UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

/** All custom canvas shape types */
export type CanvasCustomShape =
  | VoiceNoteShape
  | TranscriptShape
  | AttachmentShape
  | HandwritingShape
  | StrandShape
  | LoomShape
  | WeaveShape
  | CollectionShape
  | ConnectionShape
  | StickyNoteShape
  | FrameShape
  | LinkPreviewShape
  | SupernoteShape

/** Map of shape type to default props */
export const DEFAULT_SHAPE_PROPS: {
  voicenote: VoiceNoteShapeProps
  transcript: TranscriptShapeProps
  attachment: AttachmentShapeProps
  handwriting: HandwritingShapeProps
  strand: StrandShapeProps
  loom: LoomShapeProps
  weave: WeaveShapeProps
  collection: CollectionShapeProps
  connection: ConnectionShapeProps
  stickynote: StickyNoteShapeProps
  frame: FrameShapeProps
  linkpreview: LinkPreviewShapeProps
  supernote: SupernoteShapeProps
} = {
  voicenote: {
    w: 400,
    h: 120,
    audioPath: '',
    duration: 0,
    currentTime: 0,
    isPlaying: false,
    waveformData: [],
    transcriptText: '',
    linkedTranscriptId: '',
    recordedAt: new Date().toISOString(),
    title: 'Voice Note',
    transcriptionStatus: 'idle',
  },
  transcript: {
    w: 300,
    h: 200,
    title: 'Transcript',
    text: '',
    linkedVoiceNoteId: '',
    tags: [],
    timestamps: [],
    color: 'purple',
    createdAt: new Date().toISOString(),
  },
  attachment: {
    w: 200,
    h: 200,
    fileName: '',
    filePath: '',
    mimeType: 'application/octet-stream',
    fileSize: 0,
    thumbnailPath: '',
    dimensions: null,
    uploadedAt: new Date().toISOString(),
    caption: undefined,
    sourceType: undefined,
    analysisMetadata: undefined,
    analysisStatus: 'idle',
  },
  handwriting: {
    w: 400,
    h: 300,
    sourceType: 'canvas',
    title: 'Handwritten Note',
    transcriptionStatus: 'idle',
    transcriptionMode: 'local',
    linkedTranscriptId: '',
    previewText: '',
    createdAt: new Date().toISOString(),
    language: 'en',
  },
  strand: {
    w: 280,
    h: 160,
    strandId: '',
    strandPath: '',
    title: 'Untitled Strand',
    summary: undefined,
    thumbnailPath: undefined,
    tags: [],
    difficulty: undefined,
    weaveSlug: undefined,
    loomSlug: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    collapsed: false,
    highlighted: false,
    colorOverride: undefined,
  },
  loom: {
    w: 400,
    h: 300,
    loomId: '',
    loomPath: '',
    title: 'Untitled Loom',
    description: undefined,
    strandCount: 0,
    weaveSlug: undefined,
    style: undefined,
    expanded: false,
    childStrandIds: [],
    backgroundColor: undefined,
  },
  weave: {
    w: 800,
    h: 600,
    weaveId: '',
    weavePath: '',
    title: 'Untitled Weave',
    description: undefined,
    style: undefined,
    childLoomIds: [],
    childStrandIds: [],
    regionColor: '#00C896',
    regionOpacity: 0.1,
  },
  collection: {
    w: 320,
    h: 200,
    collectionId: '',
    collectionPath: undefined,
    title: 'Untitled Collection',
    description: undefined,
    strandCount: 0,
    color: '#8b5cf6',
    icon: undefined,
    expanded: false,
    highlighted: false,
    viewMode: 'cards',
    strands: [],
    crossWeave: false,
    crossLoom: false,
    weavesSlugs: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isSmart: false,
  },
  connection: {
    w: 100,
    h: 100,
    sourceStrandId: '',
    targetStrandId: '',
    relationshipType: 'references',
    strength: 0.5,
    bidirectional: false,
    label: undefined,
    lineStyle: 'solid',
    color: '#6366f1',
    arrowType: 'forward',
  },
  stickynote: {
    w: 200,
    h: 200,
    text: '',
    color: 'yellow',
    fontSize: 'md',
    rotation: 0,
  },
  frame: {
    w: 400,
    h: 300,
    title: 'Frame',
    backgroundColor: 'transparent',
    showTitle: true,
    collapsed: false,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  linkpreview: {
    w: 320,
    h: 160,
    url: '',
    title: '',
    description: '',
    thumbnailUrl: '',
    siteName: '',
    faviconUrl: '',
    loading: false,
    error: '',
  },
  supernote: {
    w: 320,
    h: 200,
    supernoteId: '',
    strandPath: '',
    title: 'Untitled Supernote',
    contentPreview: '',
    tags: [],
    wikilinks: [],
    primarySupertag: '',
    supertagSchemaId: '',
    supertagColor: '#f59e0b',
    supertagIcon: undefined,
    fieldValues: {},
    visibleFields: [],
    parentSupernote: undefined,
    style: 'paper',
    cardSize: '3x5',
    colorOverride: undefined,
    isEditing: false,
    isExpanded: false,
    isHighlighted: false,
    stats: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
}

/** Theme-aware colors for shapes */
export const SHAPE_THEME_COLORS = {
  voicenote: {
    light: { bg: '#fef2f2', border: '#fecaca', accent: '#ef4444', text: '#991b1b' },
    dark: { bg: '#450a0a', border: '#7f1d1d', accent: '#f87171', text: '#fecaca' },
  },
  transcript: {
    light: { bg: '#faf5ff', border: '#e9d5ff', accent: '#a855f7', text: '#6b21a8' },
    dark: { bg: '#3b0764', border: '#6b21a8', accent: '#c084fc', text: '#e9d5ff' },
  },
  attachment: {
    light: { bg: '#f0fdf4', border: '#bbf7d0', accent: '#22c55e', text: '#166534' },
    dark: { bg: '#052e16', border: '#166534', accent: '#4ade80', text: '#bbf7d0' },
  },
  handwriting: {
    light: { bg: '#eff6ff', border: '#bfdbfe', accent: '#3b82f6', text: '#1e40af' },
    dark: { bg: '#172554', border: '#1e40af', accent: '#60a5fa', text: '#bfdbfe' },
  },
  strand: {
    light: { bg: '#ecfdf5', border: '#a7f3d0', accent: '#00C896', text: '#065f46' },
    dark: { bg: '#064e3b', border: '#047857', accent: '#34d399', text: '#a7f3d0' },
  },
  loom: {
    light: { bg: '#fef3c7', border: '#fcd34d', accent: '#f59e0b', text: '#92400e' },
    dark: { bg: '#78350f', border: '#b45309', accent: '#fbbf24', text: '#fef3c7' },
  },
  weave: {
    light: { bg: '#f0f9ff', border: '#bae6fd', accent: '#0ea5e9', text: '#0c4a6e' },
    dark: { bg: '#0c4a6e', border: '#0284c7', accent: '#38bdf8', text: '#bae6fd' },
  },
  collection: {
    light: { bg: '#faf5ff', border: '#d8b4fe', accent: '#8b5cf6', text: '#5b21b6' },
    dark: { bg: '#2e1065', border: '#7c3aed', accent: '#a78bfa', text: '#e9d5ff' },
  },
  connection: {
    light: { bg: 'transparent', border: '#6366f1', accent: '#6366f1', text: '#4338ca' },
    dark: { bg: 'transparent', border: '#818cf8', accent: '#818cf8', text: '#a5b4fc' },
  },
  stickynote: {
    light: { bg: '#fef08a', border: '#fde047', accent: '#eab308', text: '#713f12' },
    dark: { bg: '#854d0e', border: '#a16207', accent: '#facc15', text: '#fef08a' },
  },
  frame: {
    light: { bg: '#f8fafc', border: '#e2e8f0', accent: '#64748b', text: '#1e293b' },
    dark: { bg: '#1e293b', border: '#334155', accent: '#94a3b8', text: '#f1f5f9' },
  },
  linkpreview: {
    light: { bg: '#ffffff', border: '#e5e7eb', accent: '#3b82f6', text: '#1f2937' },
    dark: { bg: '#1f2937', border: '#374151', accent: '#60a5fa', text: '#f3f4f6' },
  },
  supernote: {
    light: { bg: '#fffbeb', border: '#fde68a', accent: '#f59e0b', text: '#78350f' },
    dark: { bg: '#451a03', border: '#78350f', accent: '#fbbf24', text: '#fef3c7' },
  },
} as const

/** Shape sizing constraints */
export const SHAPE_SIZE_CONSTRAINTS = {
  voicenote: { minW: 200, minH: 100, maxW: 600, maxH: 200 },
  transcript: { minW: 200, minH: 100, maxW: 500, maxH: Infinity },
  attachment: { minW: 150, minH: 150, maxW: 400, maxH: 400 },
  handwriting: { minW: 250, minH: 200, maxW: 600, maxH: 500 },
  strand: { minW: 200, minH: 100, maxW: 400, maxH: 600 },
  loom: { minW: 300, minH: 200, maxW: 800, maxH: 800 },
  weave: { minW: 400, minH: 300, maxW: 2000, maxH: 2000 },
  collection: { minW: 240, minH: 160, maxW: 600, maxH: 800 },
  connection: { minW: 50, minH: 50, maxW: Infinity, maxH: Infinity },
  stickynote: { minW: 100, minH: 100, maxW: 400, maxH: 400 },
  frame: { minW: 200, minH: 100, maxW: 2000, maxH: 2000 },
  linkpreview: { minW: 200, minH: 100, maxW: 500, maxH: 300 },
  supernote: { minW: 180, minH: 120, maxW: 500, maxH: 400 },
} as const

/** Weave color palette for automatic assignment */
export const WEAVE_COLOR_PALETTE = [
  { bg: '#00C896', text: '#ffffff', name: 'Frame Green' },
  { bg: '#4D96FF', text: '#ffffff', name: 'Ocean Blue' },
  { bg: '#F59E0B', text: '#1f2937', name: 'Amber' },
  { bg: '#8B5CF6', text: '#ffffff', name: 'Purple' },
  { bg: '#10B981', text: '#ffffff', name: 'Emerald' },
  { bg: '#F43F5E', text: '#ffffff', name: 'Rose' },
  { bg: '#06B6D4', text: '#ffffff', name: 'Cyan' },
  { bg: '#EC4899', text: '#ffffff', name: 'Pink' },
] as const

/** Collection color palette for automatic assignment */
export const COLLECTION_COLOR_PALETTE = [
  { bg: '#8B5CF6', text: '#ffffff', name: 'Violet' },
  { bg: '#6366F1', text: '#ffffff', name: 'Indigo' },
  { bg: '#EC4899', text: '#ffffff', name: 'Pink' },
  { bg: '#F97316', text: '#ffffff', name: 'Orange' },
  { bg: '#14B8A6', text: '#ffffff', name: 'Teal' },
  { bg: '#EF4444', text: '#ffffff', name: 'Red' },
  { bg: '#84CC16', text: '#1f2937', name: 'Lime' },
  { bg: '#0EA5E9', text: '#ffffff', name: 'Sky' },
] as const

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/** All shape type names */
export type ShapeTypeName =
  | 'voicenote'
  | 'transcript'
  | 'attachment'
  | 'handwriting'
  | 'strand'
  | 'loom'
  | 'weave'
  | 'collection'
  | 'connection'
  | 'stickynote'
  | 'frame'
  | 'linkpreview'
  | 'supernote'

/**
 * Get theme colors for a shape type
 */
export function getShapeColors(
  type: ShapeTypeName,
  isDark: boolean
) {
  return SHAPE_THEME_COLORS[type][isDark ? 'dark' : 'light']
}

/**
 * Clamp shape dimensions to constraints
 */
export function clampShapeDimensions(
  type: ShapeTypeName,
  w: number,
  h: number
): { w: number; h: number } {
  const constraints = SHAPE_SIZE_CONSTRAINTS[type]
  return {
    w: Math.max(constraints.minW, Math.min(constraints.maxW, w)),
    h: Math.max(constraints.minH, Math.min(constraints.maxH, h)),
  }
}

/**
 * Get weave color by index (cycles through palette)
 */
export function getWeaveColor(index: number) {
  return WEAVE_COLOR_PALETTE[index % WEAVE_COLOR_PALETTE.length]
}

/**
 * Get collection color by index (cycles through palette)
 */
export function getCollectionColor(index: number) {
  return COLLECTION_COLOR_PALETTE[index % COLLECTION_COLOR_PALETTE.length]
}

/**
 * Get connection visuals by relationship type
 */
export function getConnectionVisuals(type: ConnectionRelationshipType) {
  return RELATIONSHIP_VISUALS[type]
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Format duration for display (MM:SS)
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Check if a MIME type is an image
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

/**
 * Check if a MIME type is audio
 */
export function isAudioMimeType(mimeType: string): boolean {
  return mimeType.startsWith('audio/')
}

/**
 * Check if a MIME type is video
 */
export function isVideoMimeType(mimeType: string): boolean {
  return mimeType.startsWith('video/')
}

/* ═══════════════════════════════════════════════════════════════════════════
   STRAND SHAPE - Knowledge unit card for infinite canvas
═══════════════════════════════════════════════════════════════════════════ */

/** Difficulty level for strands */
export type StrandDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert'

/** Strand shape props - atomic knowledge unit visualization */
export interface StrandShapeProps {
  /** Width of shape */
  w: number
  /** Height of shape */
  h: number
  /** Unique strand identifier */
  strandId: string
  /** File path to strand */
  strandPath: string
  /** Display title */
  title: string
  /** AI summary or first paragraph preview */
  summary?: string
  /** Thumbnail image path if available */
  thumbnailPath?: string
  /** Tags for categorization (max 5 displayed) */
  tags: string[]
  /** Difficulty level */
  difficulty?: StrandDifficulty
  /** Parent weave slug for color coding */
  weaveSlug?: string
  /** Parent loom slug for grouping */
  loomSlug?: string
  /** ISO timestamp when created */
  createdAt: string
  /** ISO timestamp when last updated */
  updatedAt: string
  /** Show compact or expanded view */
  collapsed: boolean
  /** Currently focused/highlighted */
  highlighted: boolean
  /** Manual color override */
  colorOverride?: string
}

/** Strand shape type */
export type StrandShape = TLBaseShape<'strand', StrandShapeProps>

/* ═══════════════════════════════════════════════════════════════════════════
   LOOM SHAPE - Container for grouping strands
═══════════════════════════════════════════════════════════════════════════ */

/** Loom shape props - topic container */
export interface LoomShapeProps {
  /** Width of shape */
  w: number
  /** Height of shape */
  h: number
  /** Unique loom identifier */
  loomId: string
  /** File path to loom */
  loomPath: string
  /** Display title */
  title: string
  /** Description text */
  description?: string
  /** Number of strands in this loom */
  strandCount: number
  /** Parent weave slug */
  weaveSlug?: string
  /** Custom styling */
  style?: {
    backgroundColor?: string
    textColor?: string
    emoji?: string
    icon?: string
  }
  /** Show contained strands or just header */
  expanded: boolean
  /** IDs of child strands when expanded */
  childStrandIds: string[]
  /** Background color from weave or custom */
  backgroundColor?: string
}

/** Loom shape type */
export type LoomShape = TLBaseShape<'loom', LoomShapeProps>

/* ═══════════════════════════════════════════════════════════════════════════
   WEAVE SHAPE - Large region representing knowledge universe
═══════════════════════════════════════════════════════════════════════════ */

/** Weave shape props - knowledge universe region */
export interface WeaveShapeProps {
  /** Width of shape */
  w: number
  /** Height of shape */
  h: number
  /** Unique weave identifier */
  weaveId: string
  /** File path to weave */
  weavePath: string
  /** Display title */
  title: string
  /** Description text */
  description?: string
  /** Custom styling */
  style?: {
    backgroundColor?: string
    textColor?: string
    emoji?: string
    icon?: string
    thumbnail?: string
  }
  /** IDs of child looms */
  childLoomIds: string[]
  /** IDs of direct child strands */
  childStrandIds: string[]
  /** Region background color */
  regionColor: string
  /** Background opacity (0.05 - 0.2) */
  regionOpacity: number
}

/** Weave shape type */
export type WeaveShape = TLBaseShape<'weave', WeaveShapeProps>

/* ═══════════════════════════════════════════════════════════════════════════
   COLLECTION SHAPE - Visual grouping container for strands
═══════════════════════════════════════════════════════════════════════════ */

/** View mode for collection content display */
export type CollectionShapeViewMode = 'cards' | 'grid' | 'compact'

/** Collection shape props - visual container for strand groups */
export interface CollectionShapeProps {
  /** Width of shape */
  w: number
  /** Height of shape */
  h: number
  /** Unique collection identifier */
  collectionId: string
  /** Path to collection.yml file */
  collectionPath?: string
  /** Display title */
  title: string
  /** Description text */
  description?: string
  /** Number of strands in this collection */
  strandCount: number
  /** Collection accent color (hex) */
  color: string
  /** Icon name (Lucide icon) or emoji */
  icon?: string

  // === Visual state ===

  /** Show children strands or just summary card */
  expanded: boolean
  /** Currently focused/highlighted */
  highlighted: boolean
  /** View mode for expanded content */
  viewMode: CollectionShapeViewMode

  // === Children data (for rendering expanded view) ===

  /** Strand summaries for preview */
  strands: Array<{
    id: string
    title: string
    thumbnail?: string
    path: string
  }>

  // === Cross-reference indicators ===

  /** Contains strands from multiple weaves */
  crossWeave: boolean
  /** Contains strands from multiple looms */
  crossLoom: boolean
  /** Weave slugs represented */
  weavesSlugs?: string[]

  // === Metadata ===

  /** ISO timestamp when created */
  createdAt: string
  /** ISO timestamp when last updated */
  updatedAt: string
  /** Whether this is a smart/dynamic collection */
  isSmart?: boolean
}

/** Collection shape type */
export type CollectionShape = TLBaseShape<'collection', CollectionShapeProps>

/* ═══════════════════════════════════════════════════════════════════════════
   CONNECTION SHAPE - Relationship links between strands
═══════════════════════════════════════════════════════════════════════════ */

/** Relationship types for connections */
export type ConnectionRelationshipType =
  | 'references'      // Cites or mentions
  | 'prerequisites'   // Required before
  | 'seeAlso'         // Related content
  | 'extends'         // Builds upon
  | 'contradicts'     // Opposing view
  | 'implements'      // Concrete implementation
  | 'exemplifies'     // Example of
  | 'custom'          // User-defined

/** Visual styles for relationship types */
export const RELATIONSHIP_VISUALS: Record<ConnectionRelationshipType, {
  color: string
  lineStyle: 'solid' | 'dashed' | 'dotted'
  arrowType: 'none' | 'forward' | 'backward' | 'both'
}> = {
  references: { color: '#6366f1', lineStyle: 'solid', arrowType: 'forward' },
  prerequisites: { color: '#f59e0b', lineStyle: 'dashed', arrowType: 'forward' },
  seeAlso: { color: '#10b981', lineStyle: 'dotted', arrowType: 'both' },
  extends: { color: '#8b5cf6', lineStyle: 'solid', arrowType: 'forward' },
  contradicts: { color: '#ef4444', lineStyle: 'dashed', arrowType: 'both' },
  implements: { color: '#06b6d4', lineStyle: 'solid', arrowType: 'forward' },
  exemplifies: { color: '#84cc16', lineStyle: 'dotted', arrowType: 'forward' },
  custom: { color: '#64748b', lineStyle: 'solid', arrowType: 'forward' },
}

/** Connection shape props - relationship visualization */
export interface ConnectionShapeProps {
  /** Width of shape (for bounding box) */
  w: number
  /** Height of shape (for bounding box) */
  h: number
  /** Source strand ID */
  sourceStrandId: string
  /** Target strand ID */
  targetStrandId: string
  /** Type of relationship */
  relationshipType: ConnectionRelationshipType
  /** Connection strength (0-1, affects line weight) */
  strength: number
  /** Is relationship bidirectional */
  bidirectional: boolean
  /** Optional label shown on hover */
  label?: string
  /** Line style from relationship type */
  lineStyle: 'solid' | 'dashed' | 'dotted'
  /** Line color */
  color: string
  /** Arrow direction */
  arrowType: 'none' | 'forward' | 'backward' | 'both'
}

/** Connection shape type */
export type ConnectionShape = TLBaseShape<'connection', ConnectionShapeProps>

/* ═══════════════════════════════════════════════════════════════════════════
   STICKY NOTE SHAPE - Quick capture Post-it style notes
═══════════════════════════════════════════════════════════════════════════ */

/** Color options for sticky notes */
export type StickyNoteColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'orange'

/** Sticky note shape props */
export interface StickyNoteShapeProps {
  /** Width of shape */
  w: number
  /** Height of shape */
  h: number
  /** Note text content */
  text: string
  /** Note color */
  color: StickyNoteColor
  /** Font size option */
  fontSize: 'sm' | 'md' | 'lg'
  /** Slight rotation for natural look (-3 to 3 degrees) */
  rotation: number
}

/** Sticky note shape type */
export type StickyNoteShape = TLBaseShape<'stickynote', StickyNoteShapeProps>

/* ═══════════════════════════════════════════════════════════════════════════
   FRAME SHAPE - Named container regions for organizing content
═══════════════════════════════════════════════════════════════════════════ */

/** Frame shape props */
export interface FrameShapeProps {
  /** Width of shape */
  w: number
  /** Height of shape */
  h: number
  /** Frame title */
  title: string
  /** Background color (hex or 'transparent') */
  backgroundColor: string
  /** Whether to show title header */
  showTitle: boolean
  /** Whether frame is collapsed */
  collapsed: boolean
  /** Border color */
  borderColor: string
  /** Border style */
  borderStyle: 'solid' | 'dashed' | 'dotted'
}

/** Frame shape type */
export type FrameShape = TLBaseShape<'frame', FrameShapeProps>

/* ═══════════════════════════════════════════════════════════════════════════
   LINK PREVIEW SHAPE - URL embeds with rich previews
═══════════════════════════════════════════════════════════════════════════ */

/** Link preview shape props */
export interface LinkPreviewShapeProps {
  /** Width of shape */
  w: number
  /** Height of shape */
  h: number
  /** URL of the link */
  url: string
  /** Page title from Open Graph or HTML title */
  title: string
  /** Page description from Open Graph or meta description */
  description: string
  /** Thumbnail image URL */
  thumbnailUrl: string
  /** Site name from Open Graph */
  siteName: string
  /** Favicon URL */
  faviconUrl: string
  /** Whether preview is loading */
  loading: boolean
  /** Error message if fetch failed */
  error: string
}

/** Link preview shape type */
export type LinkPreviewShape = TLBaseShape<'linkpreview', LinkPreviewShapeProps>

/* ═══════════════════════════════════════════════════════════════════════════
   SUPERNOTE SHAPE - Compact notecard variant of strands requiring supertags
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Card size presets for supernotes (matches lib/supernotes/types.ts)
 */
export type SupernoteCardSize = 
  | '3x5'      // Standard index card (320x200)
  | '4x6'      // Photo/recipe card (384x256)
  | '5x7'      // Note card (448x320)
  | 'a7'       // A7 paper (298x210)
  | 'square'   // Square card (280x280)
  | 'compact'  // Minimal card (260x180)
  | 'custom'   // User-defined dimensions

/**
 * Visual style for supernotes
 */
export type SupernoteStyleType = 
  | 'paper'      // Classic paper/notecard look (default)
  | 'minimal'    // Clean minimal design
  | 'colored'    // Uses supertag color as background
  | 'glass'      // Glassmorphism effect
  | 'terminal'   // Terminal/code aesthetic

/**
 * Parent supernote reference for hierarchical linking
 */
export interface SupernoteParentRef {
  id: string
  title: string
  path: string
}

/**
 * Collaboration stats for supernotes
 */
export interface SupernoteStats {
  likes?: number
  comments?: number
  contributors?: number
}

/**
 * Supernote shape props - compact notecard with supertag structure
 * 
 * Supernotes are visually distinct from regular strands:
 * - Index card proportions (3x5 default)
 * - Supertag badge visible at top
 * - Inline field values from supertag schema
 * - Paper/notecard aesthetic with optional corner fold
 */
export interface SupernoteShapeProps {
  /** Width of shape */
  w: number
  /** Height of shape */
  h: number
  
  // === Core identity ===
  
  /** Unique supernote/strand ID */
  supernoteId: string
  /** File path to the supernote strand */
  strandPath: string
  
  // === Content ===
  
  /** Display title */
  title: string
  /** Content preview (truncated markdown) */
  contentPreview: string
  /** Regular tags (in addition to supertag) */
  tags: string[]
  /** Wikilinks found in content */
  wikilinks: string[]
  
  // === Primary supertag (REQUIRED) ===
  
  /** Primary supertag name (e.g., "task", "idea", "book") */
  primarySupertag: string
  /** Supertag schema ID */
  supertagSchemaId: string
  /** Supertag color for accent */
  supertagColor: string
  /** Supertag icon (Lucide icon name or emoji) */
  supertagIcon?: string
  
  // === Supertag field values ===
  
  /** Field values from supertag schema (key-value pairs) */
  fieldValues: Record<string, unknown>
  /** Which fields to display inline (max 4) */
  visibleFields: string[]
  
  // === Parent hierarchy ===
  
  /** Parent supernote info for breadcrumb display */
  parentSupernote?: SupernoteParentRef
  
  // === Visual configuration ===
  
  /** Visual style preset */
  style: SupernoteStyleType
  /** Card size preset */
  cardSize: SupernoteCardSize
  /** Color override (uses supertag color if not set) */
  colorOverride?: string
  
  // === Interaction state ===
  
  /** Is currently being edited inline */
  isEditing: boolean
  /** Is expanded to show more fields/content */
  isExpanded: boolean
  /** Is highlighted/selected */
  isHighlighted: boolean
  
  // === Collaboration ===
  
  /** Engagement stats */
  stats?: SupernoteStats
  
  // === Timestamps ===
  
  /** ISO timestamp when created */
  createdAt: string
  /** ISO timestamp when updated */
  updatedAt: string
}

/** Supernote shape type */
export type SupernoteShape = TLBaseShape<'supernote', SupernoteShapeProps>

/**
 * Card size dimensions lookup
 */
export const SUPERNOTE_CARD_SIZES: Record<Exclude<SupernoteCardSize, 'custom'>, { w: number; h: number }> = {
  '3x5': { w: 320, h: 200 },
  '4x6': { w: 384, h: 256 },
  '5x7': { w: 448, h: 320 },
  'a7': { w: 298, h: 210 },
  'square': { w: 280, h: 280 },
  'compact': { w: 260, h: 180 },
}

/**
 * Color palette for supernote styles
 */
export const SUPERNOTE_STYLE_COLORS: Record<SupernoteStyleType, {
  light: { bg: string; border: string; accent: string; text: string }
  dark: { bg: string; border: string; accent: string; text: string }
}> = {
  paper: {
    light: { bg: '#fffbeb', border: '#fde68a', accent: '#f59e0b', text: '#78350f' },
    dark: { bg: '#451a03', border: '#78350f', accent: '#fbbf24', text: '#fef3c7' },
  },
  minimal: {
    light: { bg: '#ffffff', border: '#e5e7eb', accent: '#6b7280', text: '#1f2937' },
    dark: { bg: '#1f2937', border: '#374151', accent: '#9ca3af', text: '#f3f4f6' },
  },
  colored: {
    light: { bg: '#f0fdf4', border: '#86efac', accent: '#22c55e', text: '#14532d' },
    dark: { bg: '#14532d', border: '#166534', accent: '#4ade80', text: '#dcfce7' },
  },
  glass: {
    light: { bg: 'rgba(255,255,255,0.7)', border: 'rgba(255,255,255,0.3)', accent: '#8b5cf6', text: '#1f2937' },
    dark: { bg: 'rgba(31,41,55,0.7)', border: 'rgba(75,85,99,0.5)', accent: '#a78bfa', text: '#f3f4f6' },
  },
  terminal: {
    light: { bg: '#1e293b', border: '#334155', accent: '#22c55e', text: '#22c55e' },
    dark: { bg: '#0f172a', border: '#1e293b', accent: '#4ade80', text: '#4ade80' },
  },
}