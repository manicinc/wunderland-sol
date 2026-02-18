/**
 * useCanvasShapes Hook
 * @module codex/ui/canvas/useCanvasShapes
 *
 * Hook for creating and managing custom shapes on the canvas.
 * Provides helpers for:
 * - Creating voice notes from recordings
 * - Creating transcripts linked to voice notes
 * - Creating attachments from files
 * - Linking shapes together
 */

'use client'

import { useCallback } from 'react'
import { createShapeId, type Editor } from '@tldraw/tldraw'
import {
  DEFAULT_SHAPE_PROPS,
  type VoiceNoteShapeProps,
  type TranscriptShapeProps,
  type AttachmentShapeProps,
  type HandwritingShapeProps,
  type HandwritingSourceType,
  type OCRMode,
} from './shapes/types'
import { generateWaveformFromAudio } from './shapes/VoiceNoteShape/WaveformCanvas'

interface UseCanvasShapesOptions {
  editor: Editor | null
  strandPath?: string
}

/**
 * Position for creating shapes
 */
interface ShapePosition {
  x: number
  y: number
}

/**
 * Voice note creation options
 */
interface CreateVoiceNoteOptions {
  audioPath: string
  audioBlob?: Blob
  title?: string
  duration?: number
  autoTranscribe?: boolean
  position?: ShapePosition
}

/**
 * Transcript creation options
 */
interface CreateTranscriptOptions {
  text: string
  title?: string
  linkedVoiceNoteId?: string
  tags?: string[]
  position?: ShapePosition
}

/**
 * Attachment creation options
 */
interface CreateAttachmentOptions {
  filePath: string
  fileName: string
  mimeType: string
  fileSize: number
  thumbnailPath?: string
  dimensions?: { width: number; height: number }
  position?: ShapePosition
  sourceType?: import('@/lib/ai/types').ImageSourceType
  analysisStatus?: 'idle' | 'analyzing' | 'done' | 'error'
}

/**
 * Handwriting creation options
 */
interface CreateHandwritingOptions {
  sourceType: HandwritingSourceType
  imagePath?: string
  imageBlob?: Blob
  strokesData?: string
  dimensions?: { width: number; height: number }
  title?: string
  position?: ShapePosition
}

/**
 * Hook for managing custom canvas shapes
 */
export function useCanvasShapes({ editor, strandPath = '' }: UseCanvasShapesOptions) {
  /**
   * Convert screen coordinates to page coordinates
   */
  const screenToPage = useCallback(
    (screenPos: ShapePosition): ShapePosition => {
      if (!editor) return screenPos
      const point = editor.screenToPage(screenPos)
      return { x: point.x, y: point.y }
    },
    [editor]
  )

  /**
   * Create a voice note shape from audio
   */
  const createVoiceNote = useCallback(
    async (options: CreateVoiceNoteOptions): Promise<string | null> => {
      if (!editor) return null

      const {
        audioPath,
        audioBlob,
        title = 'Voice Note',
        duration = 0,
        autoTranscribe = false,
        position = { x: 0, y: 0 },
      } = options

      // Generate waveform if blob provided
      let waveformData: number[] = []
      if (audioBlob) {
        try {
          waveformData = await generateWaveformFromAudio(audioBlob)
        } catch (error) {
          console.error('Failed to generate waveform:', error)
        }
      }

      const pagePos = screenToPage(position)
      const shapeId = createShapeId()

      const props: VoiceNoteShapeProps = {
        ...DEFAULT_SHAPE_PROPS.voicenote,
        audioPath,
        title,
        duration,
        waveformData,
        recordedAt: new Date().toISOString(),
        transcriptionStatus: autoTranscribe ? 'pending' : 'idle',
      }

      editor.createShapes([
        {
          id: shapeId,
          type: 'voicenote',
          x: pagePos.x,
          y: pagePos.y,
          props,
        },
      ])

      editor.select(shapeId)
      return shapeId as unknown as string
    },
    [editor, screenToPage]
  )

  /**
   * Create a transcript shape
   */
  const createTranscript = useCallback(
    (options: CreateTranscriptOptions): string | null => {
      if (!editor) return null

      const {
        text,
        title = 'Transcript',
        linkedVoiceNoteId = '',
        tags = [],
        position = { x: 0, y: 0 },
      } = options

      const pagePos = screenToPage(position)
      const shapeId = createShapeId()

      const props: TranscriptShapeProps = {
        ...DEFAULT_SHAPE_PROPS.transcript,
        text,
        title,
        linkedVoiceNoteId,
        tags,
        createdAt: new Date().toISOString(),
      }

      editor.createShapes([
        {
          id: shapeId,
          type: 'transcript',
          x: pagePos.x,
          y: pagePos.y,
          props,
        },
      ])

      editor.select(shapeId)
      return shapeId as unknown as string
    },
    [editor, screenToPage]
  )

  /**
   * Create an attachment shape
   */
  const createAttachment = useCallback(
    (options: CreateAttachmentOptions): string | null => {
      if (!editor) return null

      const {
        filePath,
        fileName,
        mimeType,
        fileSize,
        thumbnailPath = '',
        dimensions = null,
        position = { x: 0, y: 0 },
        sourceType,
        analysisStatus = 'idle',
      } = options

      const pagePos = screenToPage(position)
      const shapeId = createShapeId()

      const props: AttachmentShapeProps = {
        ...DEFAULT_SHAPE_PROPS.attachment,
        filePath,
        fileName,
        mimeType,
        fileSize,
        thumbnailPath,
        dimensions,
        uploadedAt: new Date().toISOString(),
        sourceType,
        analysisStatus,
      }

      editor.createShapes([
        {
          id: shapeId,
          type: 'attachment',
          x: pagePos.x,
          y: pagePos.y,
          props,
        },
      ])

      editor.select(shapeId)
      return shapeId as unknown as string
    },
    [editor, screenToPage]
  )

  /**
   * Create a voice note with auto-generated transcript
   */
  const createVoiceNoteWithTranscript = useCallback(
    async (
      voiceOptions: CreateVoiceNoteOptions,
      transcriptText: string
    ): Promise<{ voiceNoteId: string; transcriptId: string } | null> => {
      if (!editor) return null

      const { position = { x: 0, y: 0 } } = voiceOptions

      // Create voice note
      const voiceNoteId = await createVoiceNote({
        ...voiceOptions,
        autoTranscribe: false, // We're creating transcript manually
      })

      if (!voiceNoteId) return null

      // Create transcript below voice note
      const transcriptPosition = {
        x: position.x,
        y: position.y + DEFAULT_SHAPE_PROPS.voicenote.h + 40, // 40px gap
      }

      const transcriptId = createTranscript({
        text: transcriptText,
        title: `Transcript: ${voiceOptions.title || 'Voice Note'}`,
        linkedVoiceNoteId: voiceNoteId,
        position: transcriptPosition,
      })

      if (!transcriptId) return null

      // Update voice note with transcript link
      editor.updateShapes([
        {
          id: voiceNoteId as any,
          type: 'voicenote',
          props: {
            linkedTranscriptId: transcriptId,
            transcriptionStatus: 'done',
            transcriptText: transcriptText.slice(0, 100) + (transcriptText.length > 100 ? '...' : ''),
          },
        },
      ])

      // Create arrow connecting them
      const arrowId = createShapeId()
      editor.createShapes([
        {
          id: arrowId,
          type: 'arrow',
          props: {
            start: {
              type: 'binding',
              boundShapeId: voiceNoteId as any,
              normalizedAnchor: { x: 0.5, y: 1 },
              isExact: false,
              isPrecise: false,
            },
            end: {
              type: 'binding',
              boundShapeId: transcriptId as any,
              normalizedAnchor: { x: 0.5, y: 0 },
              isExact: false,
              isPrecise: false,
            },
          },
        },
      ])

      return { voiceNoteId, transcriptId }
    },
    [editor, createVoiceNote, createTranscript]
  )

  /**
   * Link two shapes with an arrow
   */
  const linkShapes = useCallback(
    (fromShapeId: string, toShapeId: string): string | null => {
      if (!editor) return null

      const arrowId = createShapeId()

      editor.createShapes([
        {
          id: arrowId,
          type: 'arrow',
          props: {
            start: {
              type: 'binding',
              boundShapeId: fromShapeId as any,
              normalizedAnchor: { x: 0.5, y: 1 },
              isExact: false,
              isPrecise: false,
            },
            end: {
              type: 'binding',
              boundShapeId: toShapeId as any,
              normalizedAnchor: { x: 0.5, y: 0 },
              isExact: false,
              isPrecise: false,
            },
          },
        },
      ])

      return arrowId as unknown as string
    },
    [editor]
  )

  /**
   * Update voice note transcription status
   */
  const updateTranscriptionStatus = useCallback(
    (
      shapeId: string,
      status: VoiceNoteShapeProps['transcriptionStatus'],
      transcriptText?: string
    ) => {
      if (!editor) return

      const updates: Partial<VoiceNoteShapeProps> = { transcriptionStatus: status }
      if (transcriptText !== undefined) {
        updates.transcriptText = transcriptText.slice(0, 100) + (transcriptText.length > 100 ? '...' : '')
      }

      editor.updateShapes([
        {
          id: shapeId as any,
          type: 'voicenote',
          props: updates,
        },
      ])
    },
    [editor]
  )

  /**
   * Create a handwriting shape
   */
  const createHandwriting = useCallback(
    (options: CreateHandwritingOptions): string | null => {
      if (!editor) return null

      const {
        sourceType,
        imagePath = '',
        imageBlob,
        strokesData = '',
        dimensions = null,
        title = 'Handwritten Note',
        position = { x: 0, y: 0 },
      } = options

      const pagePos = screenToPage(position)
      const shapeId = createShapeId()

      const props: HandwritingShapeProps = {
        ...DEFAULT_SHAPE_PROPS.handwriting,
        sourceType,
        imagePath,
        imageBlob,
        strokesData,
        dimensions,
        title,
        createdAt: new Date().toISOString(),
      }

      editor.createShapes([
        {
          id: shapeId,
          type: 'handwriting',
          x: pagePos.x,
          y: pagePos.y,
          props,
        },
      ])

      editor.select(shapeId)
      return shapeId as unknown as string
    },
    [editor, screenToPage]
  )

  /**
   * Create a handwriting shape with auto-generated transcript
   */
  const createHandwritingWithTranscript = useCallback(
    (
      handwritingOptions: CreateHandwritingOptions,
      transcriptText: string,
      confidence?: number,
      mode: OCRMode = 'local'
    ): { handwritingId: string; transcriptId: string } | null => {
      if (!editor) return null

      const { position = { x: 0, y: 0 } } = handwritingOptions

      // Create handwriting shape
      const handwritingId = createHandwriting(handwritingOptions)

      if (!handwritingId) return null

      // Extract tags from transcript text (hashtags)
      const extractedTags = transcriptText.match(/#(\w+)/g)?.map((tag) => tag.slice(1)) || []

      // Create transcript positioned to the right of handwriting
      const transcriptPosition = {
        x: position.x + DEFAULT_SHAPE_PROPS.handwriting.w + 50, // 50px gap
        y: position.y,
      }

      const transcriptId = createTranscript({
        text: transcriptText,
        title: `Transcription: ${handwritingOptions.title || 'Handwriting'}`,
        linkedVoiceNoteId: handwritingId, // Reuse voicenote link field for handwriting
        tags: extractedTags,
        position: transcriptPosition,
      })

      if (!transcriptId) return null

      // Update handwriting shape with transcript link and status
      editor.updateShapes([
        {
          id: handwritingId as any,
          type: 'handwriting',
          props: {
            linkedTranscriptId: transcriptId,
            transcriptionStatus: 'done',
            transcriptionMode: mode,
            localConfidence: confidence,
            previewText: transcriptText.slice(0, 100) + (transcriptText.length > 100 ? '...' : ''),
          },
        },
      ])

      // Create arrow connecting them (horizontal right)
      const arrowId = createShapeId()
      editor.createShapes([
        {
          id: arrowId,
          type: 'arrow',
          props: {
            start: {
              type: 'binding',
              boundShapeId: handwritingId as any,
              normalizedAnchor: { x: 1, y: 0.5 }, // Right middle
              isExact: false,
              isPrecise: false,
            },
            end: {
              type: 'binding',
              boundShapeId: transcriptId as any,
              normalizedAnchor: { x: 0, y: 0.5 }, // Left middle
              isExact: false,
              isPrecise: false,
            },
          },
        },
      ])

      return { handwritingId, transcriptId }
    },
    [editor, createHandwriting, createTranscript]
  )

  return {
    createVoiceNote,
    createTranscript,
    createAttachment,
    createHandwriting,
    createVoiceNoteWithTranscript,
    createHandwritingWithTranscript,
    linkShapes,
    updateTranscriptionStatus,
    screenToPage,
  }
}
