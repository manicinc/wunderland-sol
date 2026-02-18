/**
 * Handwriting Upload Modal
 * @module codex/ui/canvas/HandwritingUploadModal
 *
 * Modal for confirming handwriting detection and choosing transcription mode
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  PenLine,
  Image as ImageIcon,
  Sparkles,
  Zap,
  Cloud,
  CheckCircle,
} from 'lucide-react'
import type { Editor } from '@tldraw/tldraw'
import type { OCRMode } from './shapes/types'
import { useCanvasShapes } from './useCanvasShapes'
import { getOCREngine } from '@/lib/ocr'

interface HandwritingUploadModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Uploaded image blob */
  imageBlob: Blob
  /** Image file path */
  imagePath: string
  /** Image filename */
  filename: string
  /** Image dimensions */
  dimensions?: { width: number; height: number }
  /** Canvas position for shape creation */
  position: { x: number; y: number }
  /** tldraw Editor instance */
  editor: Editor | null
  /** Detection confidence (0-1) */
  detectionConfidence: number
  /** Current theme */
  isDark?: boolean
}

/**
 * Modal for handling handwriting image uploads
 *
 * Allows users to:
 * - Confirm handwriting detection
 * - Choose to create HandwritingShape or AttachmentShape
 * - Select OCR mode (local vs cloud)
 * - Enable auto-transcription
 */
export function HandwritingUploadModal({
  isOpen,
  onClose,
  imageBlob,
  imagePath,
  filename,
  dimensions,
  position,
  editor,
  detectionConfidence,
  isDark = false,
}: HandwritingUploadModalProps) {
  const [createAsHandwriting, setCreateAsHandwriting] = useState(true)
  const [autoTranscribe, setAutoTranscribe] = useState(true)
  const [ocrMode, setOcrMode] = useState<OCRMode>('local')
  const [isProcessing, setIsProcessing] = useState(false)

  const { createHandwriting, createAttachment, createHandwritingWithTranscript } =
    useCanvasShapes({ editor })

  /**
   * Handle confirming the upload
   */
  const handleConfirm = useCallback(async () => {
    if (!editor) return

    setIsProcessing(true)

    try {
      if (createAsHandwriting) {
        // Create HandwritingShape
        const handwritingId = createHandwriting({
          sourceType: 'upload',
          imagePath,
          imageBlob,
          dimensions: dimensions || undefined,
          title: filename.replace(/\.[^.]+$/, ''),
          position,
        })

        if (handwritingId && autoTranscribe && ocrMode !== 'manual') {
          // Run OCR immediately
          const ocrEngine = getOCREngine()
          const result = await ocrEngine.transcribe(imageBlob, ocrMode as 'local' | 'cloud')

          // Update shape with results
          editor.updateShapes([
            {
              id: handwritingId as any,
              type: 'handwriting',
              props: {
                transcriptionStatus: 'done' as const,
                localConfidence: result.confidence,
                previewText:
                  result.text.slice(0, 100) +
                  (result.text.length > 100 ? '...' : ''),
                transcriptionMode: ocrMode,
              },
            },
          ])

          // Auto-create transcript if high confidence
          if (result.confidence >= 0.85) {
            const shape = editor.getShape(handwritingId as any)
            if (shape) {
              createHandwritingWithTranscript(
                {
                  sourceType: 'upload',
                  imagePath,
                  imageBlob,
                  dimensions: dimensions || undefined,
                  title: filename.replace(/\.[^.]+$/, ''),
                  position: { x: shape.x, y: shape.y },
                },
                result.text,
                result.confidence,
                ocrMode
              )
            }
          }

          console.log('[HandwritingUploadModal] Auto-transcribed:', {
            confidence: result.confidence,
            textLength: result.text.length,
          })
        }
      } else {
        // Create regular AttachmentShape
        createAttachment({
          filePath: imagePath,
          fileName: filename,
          mimeType: imageBlob.type,
          fileSize: imageBlob.size,
          thumbnailPath: imagePath,
          dimensions: dimensions || undefined,
          position,
        })
      }

      onClose()
    } catch (error) {
      console.error('[HandwritingUploadModal] Error:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [
    editor,
    createAsHandwriting,
    autoTranscribe,
    ocrMode,
    imageBlob,
    imagePath,
    filename,
    dimensions,
    position,
    createHandwriting,
    createAttachment,
    createHandwritingWithTranscript,
    onClose,
  ])

  // Theme classes
  const bgClasses = isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
  const textClasses = isDark ? 'text-zinc-100' : 'text-zinc-900'
  const mutedClasses = isDark ? 'text-zinc-400' : 'text-zinc-500'
  const buttonPrimaryClasses =
    'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white'
  const buttonSecondaryClasses = isDark
    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700'
    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-300'

  // Generate preview URL
  const previewUrl = URL.createObjectURL(imageBlob)

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
              <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-current/10 bg-inherit">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                    <PenLine className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-semibold ${textClasses}`}>
                      Handwriting Detected
                    </h2>
                    <p className={`text-sm ${mutedClasses}`}>
                      {Math.round(detectionConfidence * 100)}% confidence
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
                <div className="relative aspect-video rounded-xl overflow-hidden border border-current/10">
                  <img
                    src={previewUrl}
                    alt="Uploaded image"
                    className="w-full h-full object-contain bg-zinc-50 dark:bg-zinc-800"
                  />
                </div>

                {/* Shape Type Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${textClasses}`}>
                    How should we handle this image?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Handwriting Option */}
                    <button
                      onClick={() => setCreateAsHandwriting(true)}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                        createAsHandwriting
                          ? 'border-blue-500 bg-blue-500/10'
                          : `border-current/10 ${buttonSecondaryClasses}`
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${
                          createAsHandwriting ? 'bg-blue-500/20' : 'bg-current/10'
                        }`}
                      >
                        <PenLine
                          className={`w-5 h-5 ${createAsHandwriting ? 'text-blue-500' : mutedClasses}`}
                        />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${textClasses}`}>Handwriting Note</p>
                        <p className={`text-xs mt-1 ${mutedClasses}`}>
                          Extract text with OCR
                        </p>
                      </div>
                      {createAsHandwriting && (
                        <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      )}
                    </button>

                    {/* Image Attachment Option */}
                    <button
                      onClick={() => setCreateAsHandwriting(false)}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                        !createAsHandwriting
                          ? 'border-blue-500 bg-blue-500/10'
                          : `border-current/10 ${buttonSecondaryClasses}`
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${
                          !createAsHandwriting ? 'bg-blue-500/20' : 'bg-current/10'
                        }`}
                      >
                        <ImageIcon
                          className={`w-5 h-5 ${!createAsHandwriting ? 'text-blue-500' : mutedClasses}`}
                        />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${textClasses}`}>Image Attachment</p>
                        <p className={`text-xs mt-1 ${mutedClasses}`}>
                          Keep as regular image
                        </p>
                      </div>
                      {!createAsHandwriting && (
                        <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      )}
                    </button>
                  </div>
                </div>

                {/* OCR Options (only for handwriting) */}
                {createAsHandwriting && (
                  <>
                    {/* Auto-transcribe Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label className={`text-sm font-medium ${textClasses}`}>
                          Auto-transcribe
                        </label>
                        <p className={`text-xs mt-0.5 ${mutedClasses}`}>
                          Extract text immediately after upload
                        </p>
                      </div>
                      <button
                        onClick={() => setAutoTranscribe(!autoTranscribe)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          autoTranscribe ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            autoTranscribe ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* OCR Mode Selection (only if auto-transcribe enabled) */}
                    {autoTranscribe && (
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${textClasses}`}>
                          OCR Mode
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Local OCR */}
                          <button
                            onClick={() => setOcrMode('local')}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                              ocrMode === 'local'
                                ? 'border-blue-500 bg-blue-500/10'
                                : `border-current/10 ${buttonSecondaryClasses}`
                            }`}
                          >
                            <Zap
                              className={`w-5 h-5 ${ocrMode === 'local' ? 'text-blue-500' : mutedClasses}`}
                            />
                            <div className="text-left flex-1">
                              <p className={`text-sm font-medium ${textClasses}`}>
                                Local OCR
                              </p>
                              <p className={`text-xs ${mutedClasses}`}>Fast, private</p>
                            </div>
                          </button>

                          {/* Cloud AI */}
                          <button
                            onClick={() => setOcrMode('cloud')}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                              ocrMode === 'cloud'
                                ? 'border-indigo-500 bg-indigo-500/10'
                                : `border-current/10 ${buttonSecondaryClasses}`
                            }`}
                          >
                            <Cloud
                              className={`w-5 h-5 ${ocrMode === 'cloud' ? 'text-indigo-500' : mutedClasses}`}
                            />
                            <div className="text-left flex-1">
                              <p className={`text-sm font-medium ${textClasses}`}>
                                Cloud AI
                              </p>
                              <p className={`text-xs ${mutedClasses}`}>Higher accuracy</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={onClose}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium border ${buttonSecondaryClasses} transition-colors`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isProcessing}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium ${buttonPrimaryClasses} disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
                  >
                    {isProcessing ? (
                      <>
                        <Sparkles className="w-5 h-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Confirm
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
