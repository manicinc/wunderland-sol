/**
 * Real-Time OCR Hook
 * @module codex/ui/canvas/shapes/HandwritingShape/useRealtimeOCR
 *
 * React hook for real-time handwriting transcription with debouncing
 */

'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { Editor } from '@tldraw/tldraw'
import { getOCREngine } from '@/lib/ocr'
import { exportCanvasStrokes } from './canvasToImage'
import type { HandwritingShape } from '../types'

export interface UseRealtimeOCROptions {
  /**
   * Enable/disable real-time OCR
   * @default false
   */
  enabled: boolean

  /**
   * Debounce delay in milliseconds
   * @default 2000 (2 seconds)
   */
  debounceMs?: number

  /**
   * Auto-create transcript if confidence exceeds threshold
   * @default 0.85
   */
  autoTranscriptThreshold?: number

  /**
   * Callback when transcription starts
   */
  onTranscriptionStart?: () => void

  /**
   * Callback when transcription completes
   */
  onTranscriptionComplete?: (result: {
    text: string
    confidence: number
  }) => void

  /**
   * Callback when transcription fails
   */
  onTranscriptionError?: (error: Error) => void
}

/**
 * Hook for real-time OCR transcription of canvas drawings
 *
 * Automatically transcribes handwriting as the user draws on the canvas,
 * with configurable debouncing to avoid excessive OCR calls.
 *
 * @param editor - tldraw editor instance
 * @param shapeId - ID of the HandwritingShape to monitor
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * useRealtimeOCR(editor, shapeId, {
 *   enabled: true,
 *   debounceMs: 2000,
 *   autoTranscriptThreshold: 0.85,
 *   onTranscriptionComplete: (result) => {
 *     console.log('Transcribed:', result.text)
 *   }
 * })
 * ```
 */
export function useRealtimeOCR(
  editor: Editor | null,
  shapeId: string,
  options: UseRealtimeOCROptions
) {
  const {
    enabled,
    debounceMs = 2000,
    autoTranscriptThreshold = 0.85,
    onTranscriptionStart,
    onTranscriptionComplete,
    onTranscriptionError,
  } = options

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isProcessingRef = useRef(false)
  const lastShapeHashRef = useRef<string>('')

  /**
   * Update shape properties
   */
  const updateShape = useCallback(
    (props: Partial<HandwritingShape['props']>) => {
      if (!editor) return

      editor.updateShapes([
        {
          id: shapeId as any,
          type: 'handwriting',
          props,
        },
      ])
    },
    [editor, shapeId]
  )

  /**
   * Run OCR transcription on current canvas state
   */
  const runTranscription = useCallback(async () => {
    if (!editor || isProcessingRef.current) return

    const shape = editor.getShape(shapeId as any) as HandwritingShape | undefined
    if (!shape) return

    // Skip if not a canvas-based handwriting shape
    if (shape.props.sourceType !== 'canvas') return

    // Skip if already transcribed at high confidence
    if (
      shape.props.transcriptionStatus === 'done' &&
      (shape.props.localConfidence ?? 0) >= autoTranscriptThreshold
    ) {
      return
    }

    try {
      isProcessingRef.current = true

      // Update status to processing
      updateShape({ transcriptionStatus: 'processing' })
      onTranscriptionStart?.()

      // Export canvas strokes to image
      const imageBlob = await exportCanvasStrokes(editor, shapeId)

      // Calculate simple hash for change detection
      const buffer = await imageBlob.arrayBuffer()
      const hashArray = Array.from(new Uint8Array(buffer).slice(0, 100))
      const simpleHash = hashArray.join(',')

      // Skip if image hasn't changed
      if (simpleHash === lastShapeHashRef.current) {
        isProcessingRef.current = false
        return
      }

      lastShapeHashRef.current = simpleHash

      // Run local OCR
      const ocrEngine = getOCREngine()
      const result = await ocrEngine.transcribe(imageBlob, 'local')

      // Update shape with results
      const previewText = result.text.slice(0, 100)
      updateShape({
        previewText: previewText ? previewText + (result.text.length > 100 ? '...' : '') : '',
        localConfidence: result.confidence,
        transcriptionStatus: 'done',
        transcriptionMode: 'local',
      })

      onTranscriptionComplete?.({
        text: result.text,
        confidence: result.confidence,
      })

      // TODO: Auto-create transcript if confidence is high
      // This will be implemented in Phase 6 (Shape Linking)
      // if (result.confidence >= autoTranscriptThreshold) {
      //   await createLinkedTranscript(editor, shapeId, result.text)
      // }

      console.log('[useRealtimeOCR] Transcription complete:', {
        confidence: result.confidence,
        textLength: result.text.length,
        processingTime: result.processingTime,
      })
    } catch (error) {
      console.error('[useRealtimeOCR] Transcription failed:', error)

      updateShape({
        transcriptionStatus: 'error',
      })

      onTranscriptionError?.(
        error instanceof Error ? error : new Error(String(error))
      )
    } finally {
      isProcessingRef.current = false
    }
  }, [
    editor,
    shapeId,
    updateShape,
    autoTranscriptThreshold,
    onTranscriptionStart,
    onTranscriptionComplete,
    onTranscriptionError,
  ])

  /**
   * Handle editor changes with debouncing
   */
  const handleEditorChange = useCallback(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      runTranscription()
    }, debounceMs)
  }, [debounceMs, runTranscription])

  /**
   * Subscribe to editor changes
   */
  useEffect(() => {
    if (!enabled || !editor) return

    // Listen to store changes
    const unsubscribe = editor.store.listen(
      (entry) => {
        // Only react to changes for our specific shape
        if (entry.changes.added[shapeId as any] || entry.changes.updated[shapeId as any]) {
          handleEditorChange()
        }
      },
      {
        scope: 'document',
        source: 'user',
      }
    )

    return () => {
      unsubscribe()

      // Clear timer on unmount
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [enabled, editor, shapeId, handleEditorChange])

  /**
   * Manual trigger for transcription
   */
  const triggerTranscription = useCallback(() => {
    // Cancel pending debounced call
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Run immediately
    runTranscription()
  }, [runTranscription])

  return {
    /**
     * Manually trigger transcription (bypasses debounce)
     */
    triggerTranscription,

    /**
     * Whether transcription is currently running
     */
    isProcessing: isProcessingRef.current,
  }
}
