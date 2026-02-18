/**
 * Canvas Custom Shapes - Main exports
 * @module codex/ui/canvas/shapes
 *
 * Exports all custom tldraw shapes for the infinite canvas:
 *
 * Drawing/Media shapes (for WhiteboardCanvas):
 * - VoiceNoteShape: Audio player with waveform
 * - TranscriptShape: Text card linked to voice notes
 * - AttachmentShape: File/image embed
 * - HandwritingShape: Handwritten notes with OCR transcription
 *
 * Knowledge shapes (for KnowledgeCanvas):
 * - StrandShape: Knowledge unit card
 * - LoomShape: Topic container
 * - WeaveShape: Knowledge universe region
 * - CollectionShape: Visual strand grouping container
 * - ConnectionShape: Relationship links
 * - SupernoteShape: Compact notecard variant requiring supertags
 *
 * Canvas organization shapes:
 * - StickyNoteShape: Quick capture Post-it notes
 * - FrameShape: Named container regions
 * - LinkPreviewShape: URL embeds with rich previews
 */

// Drawing/Media Shape utils
export { VoiceNoteShapeUtil } from './VoiceNoteShape'
export { TranscriptShapeUtil } from './TranscriptShape'
export { AttachmentShapeUtil } from './AttachmentShape'
export { HandwritingShapeUtil } from './HandwritingShape'

// Knowledge Shape utils
export { StrandShapeUtil } from './StrandShape'
export { LoomShapeUtil } from './LoomShape'
export { WeaveShapeUtil } from './WeaveShape'
export { CollectionShapeUtil } from './CollectionShape'
export { ConnectionShapeUtil } from './ConnectionShape'
export { SupernoteShapeUtil } from './SupernoteShape'

// Canvas organization Shape utils
export { StickyNoteShapeUtil } from './StickyNoteShape'
export { FrameShapeUtil } from './FrameShape'
export { LinkPreviewShapeUtil } from './LinkPreviewShape'

// Drawing/Media Components
export { VoiceNoteComponent, WaveformCanvas, generateWaveformFromAudio } from './VoiceNoteShape'
export { TranscriptComponent } from './TranscriptShape'
export { AttachmentComponent } from './AttachmentShape'
export { HandwritingComponent, ConfidenceBadge } from './HandwritingShape'

// Knowledge Components
export { StrandComponent } from './StrandShape'
export { LoomComponent } from './LoomShape'
export { WeaveComponent } from './WeaveShape'
export { CollectionComponent, CollectionHeader, CollectionGrid } from './CollectionShape'
export { ConnectionComponent } from './ConnectionShape'
export { SupernoteComponent } from './SupernoteShape'

// Canvas organization Components
export { StickyNoteComponent } from './StickyNoteShape'
export { FrameComponent } from './FrameShape'
export { LinkPreviewComponent } from './LinkPreviewShape'

// Types
export * from './types'

/**
 * All custom shape utils for registration with tldraw (lazy loaded)
 */
export const customShapeUtils = [
  () => import('./VoiceNoteShape').then((m) => m.VoiceNoteShapeUtil),
  () => import('./TranscriptShape').then((m) => m.TranscriptShapeUtil),
  () => import('./AttachmentShape').then((m) => m.AttachmentShapeUtil),
  () => import('./HandwritingShape').then((m) => m.HandwritingShapeUtil),
  () => import('./StrandShape').then((m) => m.StrandShapeUtil),
  () => import('./LoomShape').then((m) => m.LoomShapeUtil),
  () => import('./WeaveShape').then((m) => m.WeaveShapeUtil),
  () => import('./CollectionShape').then((m) => m.CollectionShapeUtil),
  () => import('./ConnectionShape').then((m) => m.ConnectionShapeUtil),
  () => import('./StickyNoteShape').then((m) => m.StickyNoteShapeUtil),
  () => import('./FrameShape').then((m) => m.FrameShapeUtil),
  () => import('./LinkPreviewShape').then((m) => m.LinkPreviewShapeUtil),
  () => import('./SupernoteShape').then((m) => m.SupernoteShapeUtil),
]

/**
 * Drawing/Media shape utils for WhiteboardCanvas
 */
import { VoiceNoteShapeUtil } from './VoiceNoteShape'
import { TranscriptShapeUtil } from './TranscriptShape'
import { AttachmentShapeUtil } from './AttachmentShape'
import { HandwritingShapeUtil } from './HandwritingShape'

export const WHITEBOARD_SHAPE_UTILS = [
  VoiceNoteShapeUtil,
  TranscriptShapeUtil,
  AttachmentShapeUtil,
  HandwritingShapeUtil,
]

/**
 * Knowledge shape utils for KnowledgeCanvas
 */
import { StrandShapeUtil } from './StrandShape'
import { LoomShapeUtil } from './LoomShape'
import { WeaveShapeUtil } from './WeaveShape'
import { CollectionShapeUtil } from './CollectionShape'
import { ConnectionShapeUtil } from './ConnectionShape'
import { SupernoteShapeUtil } from './SupernoteShape'

export const KNOWLEDGE_SHAPE_UTILS = [
  StrandShapeUtil,
  LoomShapeUtil,
  WeaveShapeUtil,
  CollectionShapeUtil,
  ConnectionShapeUtil,
  SupernoteShapeUtil,
]

/**
 * Canvas organization shape utils (can be used on any canvas)
 */
import { StickyNoteShapeUtil } from './StickyNoteShape'
import { FrameShapeUtil } from './FrameShape'
import { LinkPreviewShapeUtil } from './LinkPreviewShape'

export const CANVAS_ORG_SHAPE_UTILS = [
  StickyNoteShapeUtil,
  FrameShapeUtil,
  LinkPreviewShapeUtil,
]

/**
 * Showcase canvas shape utils (all shapes for demo canvas)
 */
export const SHOWCASE_SHAPE_UTILS = [
  ...WHITEBOARD_SHAPE_UTILS,
  ...KNOWLEDGE_SHAPE_UTILS,
  ...CANVAS_ORG_SHAPE_UTILS,
]

/**
 * All custom shape util classes for Tldraw shapeUtils prop
 * @deprecated Use WHITEBOARD_SHAPE_UTILS, KNOWLEDGE_SHAPE_UTILS, or SHOWCASE_SHAPE_UTILS instead
 */
export const CUSTOM_SHAPE_UTILS = [
  ...WHITEBOARD_SHAPE_UTILS,
  ...KNOWLEDGE_SHAPE_UTILS,
  ...CANVAS_ORG_SHAPE_UTILS,
]
