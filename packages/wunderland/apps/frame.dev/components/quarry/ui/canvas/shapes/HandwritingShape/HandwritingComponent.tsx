/**
 * Handwriting Component - OCR-enabled handwritten note card
 * @module codex/ui/canvas/shapes/HandwritingShape/HandwritingComponent
 *
 * Features:
 * - Canvas drawing or image preview
 * - Local OCR transcription with TrOCR
 * - Cloud fallback for low confidence
 * - Confidence scoring
 * - Link to transcript navigation
 */

'use client'

import React, { useCallback, useState, memo } from 'react'
import { HTMLContainer, track, useIsEditing, useEditor } from '@tldraw/tldraw'
import {
  PenLine,
  FileText,
  Link,
  Loader2,
  X,
  RefreshCw,
  ExternalLink,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import type { HandwritingShape } from '../types'
import { getShapeColors } from '../types'
import type { HandwritingShapeUtil } from './HandwritingShapeUtil'
import { ConfidenceBadge } from './ConfidenceBadge'
import { useRealtimeOCR } from './useRealtimeOCR'
import { TranscriptionModal } from './TranscriptionModal'

interface HandwritingComponentProps {
  shape: HandwritingShape
  util: HandwritingShapeUtil
}

/**
 * Interactive handwriting note component with OCR
 */
export const HandwritingComponent = track(function HandwritingComponent({
  shape,
  util,
}: HandwritingComponentProps) {
  const editor = useEditor()
  const isEditing = useIsEditing(shape.id)
  const [isModalOpen, setModalOpen] = useState(false)

  const isDark = editor.user.getIsDarkMode()
  const colors = getShapeColors('handwriting', isDark)

  const {
    sourceType,
    imagePath,
    imageBlob,
    title,
    transcriptionStatus,
    transcriptionMode,
    localConfidence,
    linkedTranscriptId,
    previewText,
  } = shape.props

  // Update shape props helper
  const updateProps = useCallback(
    (props: Partial<HandwritingShape['props']>) => {
      editor.updateShapes([
        {
          id: shape.id,
          type: 'handwriting',
          props,
        },
      ])
    },
    [editor, shape.id]
  )

  // Handle transcription actions
  const startTranscription = useCallback(() => {
    // Open modal for manual transcription
    setModalOpen(true)
  }, [])

  const cancelTranscription = useCallback(() => {
    updateProps({ transcriptionStatus: 'cancelled' })
    // TODO: Cancel actual OCR request
    console.log('Cancel transcription for:', shape.id)
  }, [updateProps, shape.id])

  const enhanceWithCloud = useCallback(() => {
    // Open modal in cloud mode
    setModalOpen(true)
  }, [])

  // Navigate to linked transcript
  const navigateToTranscript = useCallback(() => {
    if (linkedTranscriptId) {
      const transcriptShape = editor.getShape(linkedTranscriptId as any)
      if (transcriptShape) {
        editor.select(linkedTranscriptId as any)
        editor.zoomToSelection()
      }
    }
  }, [editor, linkedTranscriptId])

  // Real-time OCR for canvas-drawn handwriting
  const { triggerTranscription } = useRealtimeOCR(editor, shape.id, {
    enabled: sourceType === 'canvas' && isEditing,
    debounceMs: 2000,
    autoTranscriptThreshold: 0.85,
    onTranscriptionStart: () => {
      console.log('[HandwritingComponent] Real-time OCR started')
    },
    onTranscriptionComplete: (result) => {
      console.log('[HandwritingComponent] Real-time OCR complete:', result)
    },
    onTranscriptionError: (error) => {
      console.error('[HandwritingComponent] Real-time OCR failed:', error)
    },
  })

  // Determine if we should show cloud enhancement suggestion
  const suggestCloudEnhancement =
    transcriptionStatus === 'done' &&
    transcriptionMode === 'local' &&
    localConfidence !== undefined &&
    localConfidence < 0.85 &&
    localConfidence >= 0.6

  // Render transcription status indicator
  const renderTranscriptionStatus = () => {
    switch (transcriptionStatus) {
      case 'idle':
      case 'cancelled':
        return (
          <button
            onClick={startTranscription}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: colors.accent,
              color: 'white',
            }}
            aria-label="Start handwriting transcription"
            title="Transcribe handwritten text using OCR"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            Transcribe
          </button>
        )
      case 'pending':
      case 'processing':
        return (
          <button
            onClick={cancelTranscription}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: `${colors.accent}20`,
              color: colors.accent,
            }}
            aria-label={`Cancel transcription (${transcriptionStatus === 'pending' ? 'queued' : 'in progress'})`}
            title="Cancel transcription"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            <span>
              {transcriptionStatus === 'pending' ? 'Queued' : 'Transcribing'}
            </span>
            <X className="w-3 h-3 ml-1 opacity-60 hover:opacity-100" aria-hidden="true" />
          </button>
        )
      case 'done':
        return linkedTranscriptId ? (
          <button
            onClick={navigateToTranscript}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: `${colors.accent}20`,
              color: colors.accent,
            }}
            aria-label="Navigate to linked transcript"
            title="View the transcription in a text card"
          >
            <Link className="w-3.5 h-3.5" aria-hidden="true" />
            View Transcript
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" aria-hidden="true" />
          </button>
        ) : (
          <span
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
            style={{ color: colors.accent }}
            role="status"
            aria-label="Transcription completed"
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            Transcribed
          </span>
        )
      case 'error':
        return (
          <button
            onClick={startTranscription}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: '#fef2f2',
              color: '#ef4444',
            }}
            aria-label="Retry transcription after error"
            title="Transcription failed - click to try again"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Retry
          </button>
        )
      default:
        return null
    }
  }

  // Get image source URL
  const imageUrl =
    sourceType === 'upload' && imagePath
      ? imagePath
      : imageBlob
        ? URL.createObjectURL(imageBlob)
        : null

  return (
    <HTMLContainer id={shape.id}>
      <div
        className="handwriting-card w-full h-full flex flex-col rounded-xl overflow-hidden"
        style={{
          backgroundColor: colors.bg,
          border: `2px solid ${colors.border}`,
        }}
        role="article"
        aria-label={`Handwriting note: ${title || 'Untitled'}`}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: `1px solid ${colors.border}` }}
          role="banner"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <PenLine className="w-4 h-4 flex-shrink-0" style={{ color: colors.accent }} aria-hidden="true" />
            <span
              className="text-sm font-medium truncate"
              style={{ color: colors.text }}
            >
              {title || 'Handwritten Note'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {renderTranscriptionStatus()}
          </div>
        </div>

        {/* Content: Image/Canvas Preview */}
        <div
          className="flex-1 min-h-0 flex items-center justify-center p-3"
          style={{ backgroundColor: `${colors.border}10` }}
          role="img"
          aria-label={imageUrl ? 'Handwriting preview' : 'Empty handwriting canvas'}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`Handwritten note${previewText ? `: ${previewText.slice(0, 50)}...` : ''}`}
              className="max-w-full max-h-full object-contain rounded"
              style={{ maxWidth: '100%', maxHeight: '100%' }}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 opacity-50" aria-hidden="true">
              <PenLine className="w-8 h-8" style={{ color: colors.text }} />
              <span className="text-xs" style={{ color: colors.text }}>
                {sourceType === 'canvas' ? 'Draw to begin' : 'No image'}
              </span>
            </div>
          )}
        </div>

        {/* Status Footer */}
        {(previewText || localConfidence !== undefined) && (
          <div
            className="px-3 py-2 space-y-2"
            style={{ borderTop: `1px solid ${colors.border}` }}
          >
            {/* Preview text */}
            {previewText && (
              <div className="flex items-start gap-2">
                <FileText
                  className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                  style={{ color: colors.text, opacity: 0.6 }}
                />
                <p
                  className="text-xs line-clamp-2 flex-1"
                  style={{ color: colors.text, opacity: 0.8 }}
                >
                  "{previewText}"
                </p>
              </div>
            )}

            {/* Confidence + Mode badge */}
            {localConfidence !== undefined && (
              <div className="flex items-center justify-between">
                <ConfidenceBadge value={localConfidence} size="sm" />
                <span
                  className="text-xs flex items-center gap-1"
                  style={{ color: colors.text, opacity: 0.6 }}
                >
                  {transcriptionMode === 'local' && '⚡ Local OCR'}
                  {transcriptionMode === 'cloud' && '☁️ Cloud AI'}
                  {transcriptionMode === 'manual' && '✏️ Manual'}
                </span>
              </div>
            )}

            {/* Cloud enhancement suggestion */}
            {suggestCloudEnhancement && (
              <button
                onClick={enhanceWithCloud}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: `${colors.accent}15`,
                  color: colors.accent,
                  border: `1px dashed ${colors.accent}40`,
                }}
                aria-label={`Enhance transcription with Cloud AI (current confidence: ${Math.round(localConfidence! * 100)}%)`}
                title="Use cloud AI for better accuracy on difficult handwriting"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                Enhance with Cloud AI
                <ChevronRight className="w-3 h-3 opacity-60" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Transcription Modal */}
      <TranscriptionModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        handwritingShape={shape}
        editor={editor}
        isDark={isDark}
        onTranscriptionComplete={(result) => {
          console.log('[HandwritingComponent] Transcription completed via modal:', result)
        }}
      />
    </HTMLContainer>
  )
})
