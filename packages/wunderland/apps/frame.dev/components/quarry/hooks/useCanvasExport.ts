/**
 * Hook for managing canvas export workflow
 * @module codex/hooks/useCanvasExport
 *
 * @remarks
 * Encapsulates the canvas-to-strand export process:
 * - Export state management
 * - Modal control
 * - Asset handling
 * - Error recovery
 *
 * @example
 * ```tsx
 * function CanvasPage() {
 *   const [editor, setEditor] = useState<Editor | null>(null)
 *
 *   const {
 *     isExporting,
 *     exportResult,
 *     modalProps,
 *     startExport,
 *     openModal,
 *     closeModal,
 *   } = useCanvasExport({
 *     editor,
 *     onExportComplete: (result) => {
 *       saveStrand(result.markdown, result.frontmatter)
 *     },
 *   })
 *
 *   return (
 *     <>
 *       <button onClick={openModal}>Export Canvas</button>
 *       <CanvasExportModal {...modalProps} />
 *     </>
 *   )
 * }
 * ```
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import type { Editor } from '@tldraw/tldraw'
import {
  canvasToMarkdown,
  canvasHasContent,
  getCanvasSummary,
  type CanvasExportResult,
  type CanvasExportOptions,
  type CanvasExportMetadata,
} from '../ui/canvas/canvasToMarkdown'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface UseCanvasExportOptions {
  /** tldraw Editor instance */
  editor: Editor | null
  /** Callback when export completes successfully */
  onExportComplete?: (result: CanvasExportResult) => void
  /** Callback when export fails */
  onExportError?: (error: Error) => void
  /** Default export options */
  defaultOptions?: Partial<CanvasExportOptions>
}

export interface UseCanvasExportResult {
  /** Whether export is in progress */
  isExporting: boolean
  /** Whether modal is open */
  isModalOpen: boolean
  /** Export result (after successful export) */
  exportResult: CanvasExportResult | null
  /** Export error (if failed) */
  exportError: Error | null
  /** Canvas content summary */
  canvasSummary: CanvasExportMetadata | null
  /** Whether canvas has exportable content */
  hasContent: boolean
  /** Start the export process */
  startExport: (options?: CanvasExportOptions) => Promise<CanvasExportResult | null>
  /** Open the export modal */
  openModal: () => void
  /** Close the export modal */
  closeModal: () => void
  /** Reset export state */
  resetExport: () => void
  /** Props to spread on CanvasExportModal */
  modalProps: {
    isOpen: boolean
    onClose: () => void
    editor: Editor | null
    onExport: (result: CanvasExportResult) => void
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Manage canvas export workflow
 *
 * @param options - Configuration options
 * @returns Export state and controls
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { startExport, isExporting } = useCanvasExport({ editor })
 *
 * // With modal
 * const { modalProps, openModal } = useCanvasExport({
 *   editor,
 *   onExportComplete: (result) => console.log(result),
 * })
 *
 * return (
 *   <>
 *     <button onClick={openModal}>Export</button>
 *     <CanvasExportModal {...modalProps} />
 *   </>
 * )
 * ```
 */
export function useCanvasExport({
  editor,
  onExportComplete,
  onExportError,
  defaultOptions = {},
}: UseCanvasExportOptions): UseCanvasExportResult {
  const [isExporting, setIsExporting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [exportResult, setExportResult] = useState<CanvasExportResult | null>(null)
  const [exportError, setExportError] = useState<Error | null>(null)

  // Check if canvas has content
  const hasContent = useMemo(() => {
    if (!editor) return false
    return canvasHasContent(editor)
  }, [editor])

  // Get canvas summary
  const canvasSummary = useMemo(() => {
    if (!editor) return null
    return getCanvasSummary(editor)
  }, [editor])

  // Start export
  const startExport = useCallback(
    async (options?: CanvasExportOptions): Promise<CanvasExportResult | null> => {
      if (!editor) {
        const error = new Error('No editor instance available')
        setExportError(error)
        onExportError?.(error)
        return null
      }

      if (!hasContent) {
        const error = new Error('Canvas has no exportable content')
        setExportError(error)
        onExportError?.(error)
        return null
      }

      setIsExporting(true)
      setExportError(null)

      try {
        const result = await canvasToMarkdown(editor, {
          ...defaultOptions,
          ...options,
        })

        setExportResult(result)
        onExportComplete?.(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Export failed')
        setExportError(error)
        onExportError?.(error)
        return null
      } finally {
        setIsExporting(false)
      }
    },
    [editor, hasContent, defaultOptions, onExportComplete, onExportError]
  )

  // Modal controls
  const openModal = useCallback(() => {
    setIsModalOpen(true)
    setExportError(null)
  }, [])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  // Reset state
  const resetExport = useCallback(() => {
    setIsExporting(false)
    setExportResult(null)
    setExportError(null)
  }, [])

  // Handle export from modal
  const handleModalExport = useCallback(
    (result: CanvasExportResult) => {
      setExportResult(result)
      onExportComplete?.(result)
    },
    [onExportComplete]
  )

  // Modal props for easy spreading
  const modalProps = useMemo(
    () => ({
      isOpen: isModalOpen,
      onClose: closeModal,
      editor,
      onExport: handleModalExport,
    }),
    [isModalOpen, closeModal, editor, handleModalExport]
  )

  return {
    isExporting,
    isModalOpen,
    exportResult,
    exportError,
    canvasSummary,
    hasContent,
    startExport,
    openModal,
    closeModal,
    resetExport,
    modalProps,
  }
}

/**
 * Lightweight hook to just check canvas content
 *
 * @example
 * ```tsx
 * const hasContent = useCanvasHasContent(editor)
 *
 * return (
 *   <button disabled={!hasContent}>Export</button>
 * )
 * ```
 */
export function useCanvasHasContent(editor: Editor | null): boolean {
  return useMemo(() => {
    if (!editor) return false
    return canvasHasContent(editor)
  }, [editor])
}

export default useCanvasExport
