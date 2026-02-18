/**
 * Handwriting Import Modal
 * @module codex/ui/HandwritingImportModal
 *
 * Modal for batch importing handwritten images with OCR processing:
 * - Drag and drop multiple images
 * - Queue-based OCR processing with progress
 * - Insert results as strand blocks or canvas shapes
 */

'use client'

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Upload,
  FileImage,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  PenLine,
  FileText,
  Sparkles,
} from 'lucide-react'
import { getOCREngine } from '@/lib/ocr'
import { ConfidenceBadge, ConfidenceProgress } from '../canvas/shapes/HandwritingShape/ConfidenceBadge'

/**
 * Image item with OCR state
 */
interface ImageItem {
  id: string
  file: File
  preview: string
  status: 'pending' | 'processing' | 'done' | 'error'
  result?: {
    text: string
    confidence: number
    processingTime: number
  }
  error?: string
}

/**
 * Import result for callback
 */
export interface HandwritingImportResult {
  text: string
  confidence: number
  sourceFile: string
}

interface HandwritingImportModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Results callback - receives all processed results */
  onImport: (results: HandwritingImportResult[]) => void
  /** Insert mode - how to insert the results */
  insertMode?: 'blocks' | 'single' | 'shapes'
  /** Current theme */
  isDark?: boolean
}

/**
 * Generate unique ID for items
 */
function generateId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Handwriting Import Modal
 *
 * Features:
 * - Drag-drop zone for multiple images
 * - Queue-based OCR processing
 * - Progress indicators per image
 * - Bulk import results
 */
export default function HandwritingImportModal({
  isOpen,
  onClose,
  onImport,
  insertMode = 'blocks',
  isDark = false,
}: HandwritingImportModalProps) {
  const [images, setImages] = useState<ImageItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * Handle file selection
   */
  const handleFiles = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith('image/')
    )

    const newItems: ImageItem[] = imageFiles.map((file) => ({
      id: generateId(),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
    }))

    setImages((prev) => [...prev, ...newItems])
  }, [])

  /**
   * Handle drag events
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFiles(files)
      }
    },
    [handleFiles]
  )

  /**
   * Remove an image from the queue
   */
  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item?.preview) {
        URL.revokeObjectURL(item.preview)
      }
      return prev.filter((i) => i.id !== id)
    })
  }, [])

  /**
   * Process all pending images
   */
  const processAll = useCallback(async () => {
    setIsProcessing(true)
    const engine = getOCREngine()

    const pendingItems = images.filter((i) => i.status === 'pending')

    for (const item of pendingItems) {
      // Update status to processing
      setImages((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: 'processing' as const } : i
        )
      )

      try {
        // Convert file to blob
        const blob = new Blob([await item.file.arrayBuffer()], {
          type: item.file.type,
        })

        // Run OCR
        const result = await engine.transcribe(blob, 'local')

        // Update with result
        setImages((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'done' as const,
                  result: {
                    text: result.text,
                    confidence: result.confidence,
                    processingTime: result.processingTime,
                  },
                }
              : i
          )
        )
      } catch (error) {
        // Update with error
        setImages((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'error' as const,
                  error: error instanceof Error ? error.message : 'Unknown error',
                }
              : i
          )
        )
      }
    }

    setIsProcessing(false)
  }, [images])

  /**
   * Import all completed results
   */
  const handleImport = useCallback(() => {
    const results: HandwritingImportResult[] = images
      .filter((i) => i.status === 'done' && i.result)
      .map((i) => ({
        text: i.result!.text,
        confidence: i.result!.confidence,
        sourceFile: i.file.name,
      }))

    onImport(results)
    onClose()
  }, [images, onImport, onClose])

  /**
   * Clear all images
   */
  const clearAll = useCallback(() => {
    images.forEach((i) => {
      if (i.preview) {
        URL.revokeObjectURL(i.preview)
      }
    })
    setImages([])
  }, [images])

  /**
   * Cleanup previews on unmount
   */
  React.useEffect(() => {
    return () => {
      images.forEach((i) => {
        if (i.preview) {
          URL.revokeObjectURL(i.preview)
        }
      })
    }
  }, [])

  const completedCount = images.filter((i) => i.status === 'done').length
  const totalCount = images.length
  const hasErrors = images.some((i) => i.status === 'error')
  const allDone = totalCount > 0 && images.every((i) => i.status === 'done' || i.status === 'error')

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25 }}
          className={`
            relative w-full max-w-2xl mx-4 rounded-2xl shadow-2xl overflow-hidden
            ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}
          `}
        >
          {/* Header */}
          <div
            className={`
            px-6 py-4 border-b flex items-center justify-between
            ${isDark ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-gray-50'}
          `}
          >
            <div className="flex items-center gap-3">
              <div
                className={`
                p-2 rounded-lg
                ${isDark ? 'bg-purple-900/30' : 'bg-purple-100'}
              `}
              >
                <PenLine className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Import Handwriting</h2>
                <p className="text-sm opacity-70">
                  Batch import handwritten images with OCR
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`
                p-2 rounded-lg transition-colors
                ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}
              `}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative p-8 border-2 border-dashed rounded-xl text-center cursor-pointer
                transition-colors duration-200
                ${isDragging
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : isDark
                    ? 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />

              <Upload
                className={`w-12 h-12 mx-auto mb-4 ${
                  isDragging ? 'text-purple-500' : 'text-gray-400'
                }`}
              />
              <p className="text-lg font-medium mb-1">
                {isDragging ? 'Drop images here' : 'Drag & drop images'}
              </p>
              <p className="text-sm opacity-60">
                or click to browse • PNG, JPG, HEIC
              </p>
            </div>

            {/* Image Queue */}
            {images.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    Images ({completedCount}/{totalCount} processed)
                  </h3>
                  <button
                    onClick={clearAll}
                    className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All
                  </button>
                </div>

                <div className="space-y-2">
                  {images.map((item) => (
                    <div
                      key={item.id}
                      className={`
                        flex items-center gap-4 p-3 rounded-lg
                        ${isDark ? 'bg-gray-800' : 'bg-gray-50'}
                      `}
                    >
                      {/* Thumbnail */}
                      <img
                        src={item.preview}
                        alt={item.file.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.file.name}
                        </p>

                        {item.status === 'pending' && (
                          <p className="text-xs text-gray-500">Waiting...</p>
                        )}

                        {item.status === 'processing' && (
                          <div className="flex items-center gap-2 text-xs text-purple-500">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Processing...
                          </div>
                        )}

                        {item.status === 'done' && item.result && (
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 truncate">
                              "{item.result.text.slice(0, 50)}
                              {item.result.text.length > 50 ? '...' : ''}"
                            </p>
                            <ConfidenceProgress
                              value={item.result.confidence}
                              height="sm"
                            />
                          </div>
                        )}

                        {item.status === 'error' && (
                          <p className="text-xs text-red-500">{item.error}</p>
                        )}
                      </div>

                      {/* Status Icon */}
                      <div className="flex-shrink-0">
                        {item.status === 'done' && (
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        )}
                        {item.status === 'error' && (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                        {item.status === 'pending' && (
                          <button
                            onClick={() => removeImage(item.id)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                          >
                            <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className={`
            px-6 py-4 border-t flex items-center justify-between
            ${isDark ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-gray-50'}
          `}
          >
            <div className="text-sm text-gray-500">
              {insertMode === 'blocks' && 'Results will be inserted as text blocks'}
              {insertMode === 'single' && 'Results will be combined into one block'}
              {insertMode === 'shapes' && 'Results will be added as canvas shapes'}
            </div>

            <div className="flex items-center gap-3">
              {!allDone && images.length > 0 && (
                <button
                  onClick={processAll}
                  disabled={isProcessing}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium
                    ${isProcessing
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                    }
                  `}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Transcribe All
                    </>
                  )}
                </button>
              )}

              {allDone && completedCount > 0 && (
                <button
                  onClick={handleImport}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <FileText className="w-4 h-4" />
                  Import {completedCount} Result{completedCount > 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
