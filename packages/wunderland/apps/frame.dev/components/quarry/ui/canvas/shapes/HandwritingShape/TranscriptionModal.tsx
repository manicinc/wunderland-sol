/**
 * Transcription Modal - OCR transcription UI for handwriting
 * @module codex/ui/canvas/shapes/HandwritingShape/TranscriptionModal
 *
 * Modal for manually transcribing handwritten notes with mode selection
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Sparkles,
  FileText,
  Loader2,
  AlertCircle,
  ChevronRight,
  Cloud,
  Zap,
} from 'lucide-react'
import type { Editor } from '@tldraw/tldraw'
import type { HandwritingShape, OCRMode } from '../types'
import { getOCREngine } from '@/lib/ocr'
import { exportCanvasStrokes } from './canvasToImage'
import { ConfidenceBadge } from './ConfidenceBadge'
import type { OCRResult } from '@/lib/ocr/types'
import { useCanvasShapes } from '../../useCanvasShapes'

interface TranscriptionModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** HandwritingShape to transcribe */
  handwritingShape: HandwritingShape
  /** tldraw Editor instance */
  editor: Editor | null
  /** Callback when transcription completes */
  onTranscriptionComplete?: (result: OCRResult) => void
  /** Current theme */
  isDark?: boolean
}

/**
 * Modal for on-demand handwriting transcription
 *
 * Allows users to manually trigger OCR transcription with mode selection.
 *
 * @example
 * ```tsx
 * <TranscriptionModal
 *   isOpen={isModalOpen}
 *   onClose={() => setModalOpen(false)}
 *   handwritingShape={shape}
 *   editor={editor}
 *   onTranscriptionComplete={(result) => {
 *     console.log('Transcribed:', result.text)
 *   }}
 * />
 * ```
 */
export function TranscriptionModal({
  isOpen,
  onClose,
  handwritingShape,
  editor,
  onTranscriptionComplete,
  isDark = false,
}: TranscriptionModalProps) {
  const [mode, setMode] = useState<OCRMode>('local')
  const [result, setResult] = useState<OCRResult | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  // Canvas shapes hook for creating linked transcript
  const { createHandwritingWithTranscript } = useCanvasShapes({ editor })

  // Load image when modal opens
  useEffect(() => {
    if (!isOpen || !editor) return

    const loadImage = async () => {
      try {
        if (handwritingShape.props.sourceType === 'canvas') {
          // Export canvas strokes to image
          const blob = await exportCanvasStrokes(editor, handwritingShape.id)
          const url = URL.createObjectURL(blob)
          setImageUrl(url)
        } else if (handwritingShape.props.imagePath) {
          // Use uploaded image
          setImageUrl(handwritingShape.props.imagePath)
        } else if (handwritingShape.props.imageBlob) {
          // Use temporary blob
          const url = URL.createObjectURL(handwritingShape.props.imageBlob)
          setImageUrl(url)
        }
      } catch (err) {
        console.error('[TranscriptionModal] Failed to load image:', err)
        setError('Failed to load image preview')
      }
    }

    loadImage()

    return () => {
      // Cleanup object URL if created
      if (imageUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [isOpen, editor, handwritingShape])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setResult(null)
      setProcessing(false)
      setError(null)
      setMode('local')
    }
  }, [isOpen])

  /**
   * Handle transcription with selected mode
   */
  const handleTranscribe = useCallback(async () => {
    if (!editor) return

    setProcessing(true)
    setError(null)

    try {
      // Get image source
      let imageBlob: Blob

      if (handwritingShape.props.sourceType === 'canvas') {
        imageBlob = await exportCanvasStrokes(editor, handwritingShape.id)
      } else if (handwritingShape.props.imagePath) {
        const response = await fetch(handwritingShape.props.imagePath)
        imageBlob = await response.blob()
      } else if (handwritingShape.props.imageBlob) {
        imageBlob = handwritingShape.props.imageBlob
      } else {
        throw new Error('No image source available')
      }

      // Run OCR
      const ocrEngine = getOCREngine()
      const ocrResult = await ocrEngine.transcribe(imageBlob, mode as 'local' | 'cloud')

      setResult(ocrResult)

      // Update shape with results
      editor.updateShapes([
        {
          id: handwritingShape.id as any,
          type: 'handwriting',
          props: {
            transcriptionStatus: 'done' as const,
            localConfidence: ocrResult.confidence,
            previewText: ocrResult.text.slice(0, 100) + (ocrResult.text.length > 100 ? '...' : ''),
            transcriptionMode: mode,
          },
        },
      ])

      onTranscriptionComplete?.(ocrResult)

      console.log('[TranscriptionModal] Transcription complete:', {
        mode,
        confidence: ocrResult.confidence,
        textLength: ocrResult.text.length,
        processingTime: ocrResult.processingTime,
      })
    } catch (err) {
      console.error('[TranscriptionModal] Transcription failed:', err)
      setError(err instanceof Error ? err.message : 'Transcription failed')

      // Update shape to error state
      if (editor) {
        editor.updateShapes([
          {
            id: handwritingShape.id as any,
            type: 'handwriting',
            props: {
              transcriptionStatus: 'error' as const,
            },
          },
        ])
      }
    } finally {
      setProcessing(false)
    }
  }, [editor, handwritingShape, mode, onTranscriptionComplete])

  /**
   * Handle creating linked transcript
   */
  const handleCreateTranscript = useCallback(() => {
    if (!result || !editor) return

    // Get handwriting shape position
    const shape = editor.getShape(handwritingShape.id as any)
    if (!shape) {
      console.error('[TranscriptionModal] Shape not found')
      return
    }

    // Create linked transcript
    const linked = createHandwritingWithTranscript(
      {
        sourceType: handwritingShape.props.sourceType,
        imagePath: handwritingShape.props.imagePath,
        imageBlob: handwritingShape.props.imageBlob,
        strokesData: handwritingShape.props.strokesData,
        dimensions: handwritingShape.props.dimensions || undefined,
        title: handwritingShape.props.title,
        position: { x: shape.x, y: shape.y },
      },
      result.text,
      result.confidence,
      mode
    )

    if (linked) {
      console.log('[TranscriptionModal] Created linked transcript:', linked)
    }

    // Close modal after creating transcript
    onClose()
  }, [result, editor, handwritingShape, mode, createHandwritingWithTranscript, onClose])

  /**
   * Switch to cloud mode
   */
  const handleEnhanceWithCloud = useCallback(() => {
    setMode('cloud')
    setResult(null)
  }, [])

  // Suggest cloud enhancement for low confidence
  const suggestCloudEnhancement =
    result &&
    mode === 'local' &&
    result.confidence < 0.85 &&
    result.confidence >= 0.6

  // Theme classes
  const bgClasses = isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
  const textClasses = isDark ? 'text-zinc-100' : 'text-zinc-900'
  const mutedClasses = isDark ? 'text-zinc-400' : 'text-zinc-500'
  const inputClasses = isDark
    ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
    : 'bg-zinc-50 border-zinc-200 text-zinc-900'
  const buttonPrimaryClasses =
    'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white'
  const buttonSecondaryClasses = isDark
    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700'
    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-300'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border ${bgClasses} shadow-2xl`}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-current/10">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-semibold ${textClasses}`}>
                      Transcribe Handwriting
                    </h2>
                    <p className={`text-sm ${mutedClasses}`}>
                      Extract text from your handwritten notes
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className={`p-2 rounded-lg ${buttonSecondaryClasses} border transition-colors`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Image Preview */}
                {imageUrl && (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-current/10">
                    <img
                      src={imageUrl}
                      alt="Handwriting preview"
                      className="w-full h-full object-contain bg-zinc-50 dark:bg-zinc-800"
                    />
                  </div>
                )}

                {/* Mode Selector */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textClasses}`}>
                    Transcription Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Local OCR */}
                    <button
                      onClick={() => setMode('local')}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        mode === 'local'
                          ? 'border-blue-500 bg-blue-500/10'
                          : `border-current/10 ${buttonSecondaryClasses}`
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                          mode === 'local' ? 'bg-blue-500/20' : 'bg-current/10'
                        }`}
                      >
                        <Zap className={`w-5 h-5 ${mode === 'local' ? 'text-blue-500' : mutedClasses}`} />
                      </div>
                      <div className="text-left flex-1">
                        <p className={`font-medium ${textClasses}`}>Local OCR</p>
                        <p className={`text-xs ${mutedClasses}`}>Fast, private</p>
                      </div>
                    </button>

                    {/* Cloud AI */}
                    <button
                      onClick={() => setMode('cloud')}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        mode === 'cloud'
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : `border-current/10 ${buttonSecondaryClasses}`
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                          mode === 'cloud' ? 'bg-indigo-500/20' : 'bg-current/10'
                        }`}
                      >
                        <Cloud className={`w-5 h-5 ${mode === 'cloud' ? 'text-indigo-500' : mutedClasses}`} />
                      </div>
                      <div className="text-left flex-1">
                        <p className={`font-medium ${textClasses}`}>Cloud AI</p>
                        <p className={`text-xs ${mutedClasses}`}>Higher accuracy</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Transcribe Button */}
                {!result && (
                  <button
                    onClick={handleTranscribe}
                    disabled={processing}
                    className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-medium ${buttonPrimaryClasses} disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Transcribing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Transcribe
                      </>
                    )}
                  </button>
                )}

                {/* Error Display */}
                {error && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-500">Transcription Failed</p>
                      <p className="text-xs text-red-400 mt-1">{error}</p>
                    </div>
                  </div>
                )}

                {/* Results */}
                {result && (
                  <div className="space-y-4">
                    {/* Transcription Text */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={`text-sm font-medium ${textClasses}`}>
                          Transcription
                        </label>
                        <ConfidenceBadge value={result.confidence} size="sm" />
                      </div>
                      <div
                        className={`p-4 rounded-xl ${inputClasses} border min-h-[120px] max-h-[300px] overflow-y-auto`}
                      >
                        <p className={`text-sm ${textClasses} whitespace-pre-wrap`}>
                          {result.text || <span className={mutedClasses}>(No text detected)</span>}
                        </p>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs">
                      <span className={mutedClasses}>
                        {mode === 'local' ? '⚡ Local OCR' : '☁️ Cloud AI'}
                        {' · '}
                        {result.processingTime}ms
                      </span>
                      <span className={mutedClasses}>
                        {result.text.length} characters
                      </span>
                    </div>

                    {/* Cloud Enhancement Suggestion */}
                    {suggestCloudEnhancement && (
                      <button
                        onClick={handleEnhanceWithCloud}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 font-medium transition-all"
                      >
                        <Sparkles className="w-4 h-4" />
                        Enhance with Cloud AI
                        <ChevronRight className="w-4 h-4 opacity-60" />
                      </button>
                    )}

                    {/* Create Transcript Button */}
                    <button
                      onClick={handleCreateTranscript}
                      className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-medium ${buttonPrimaryClasses} transition-all`}
                    >
                      <FileText className="w-5 h-5" />
                      Create Transcript Card
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
