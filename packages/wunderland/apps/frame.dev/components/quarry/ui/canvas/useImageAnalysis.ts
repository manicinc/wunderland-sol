/**
 * Image Analysis React Hook
 * @module codex/ui/canvas/useImageAnalysis
 *
 * React hook for triggering image analysis and updating AttachmentShapes
 */

import { useCallback, useState } from 'react'
import { useEditor, type TLShapeId } from '@tldraw/tldraw'
import { useAIPreferences } from '@/lib/ai'
import {
  detectImageSource,
  analyzeImageComprehensive,
  shouldAutoAnalyze,
  buildAnalysisOptions,
} from '@/lib/ai/imageAnalyzer'
import type { ImageSourceType, ImageAnalysisResult } from '@/lib/ai/types'
import type { AttachmentShape } from './shapes/types'

/**
 * Image analysis state
 */
interface ImageAnalysisState {
  /** Currently analyzing shape IDs */
  analyzing: Set<string>
  /** Completed analyses */
  completed: Set<string>
  /** Failed analyses */
  failed: Set<string>
}

/**
 * Hook for image analysis operations
 */
export function useImageAnalysis() {
  const editor = useEditor()
  const [prefs] = useAIPreferences()
  const [state, setState] = useState<ImageAnalysisState>({
    analyzing: new Set(),
    completed: new Set(),
    failed: new Set(),
  })

  /**
   * Detect image source type quickly (for upload flow)
   */
  const detectSource = useCallback(
    async (blob: Blob, filename?: string): Promise<ImageSourceType> => {
      try {
        return await detectImageSource(blob, filename)
      } catch (error) {
        console.error('[useImageAnalysis] Source detection failed:', error)
        return 'unknown'
      }
    },
    []
  )

  /**
   * Check if image should be auto-analyzed based on source and preferences
   */
  const shouldAnalyze = useCallback(
    (sourceType: ImageSourceType): boolean => {
      return shouldAutoAnalyze(sourceType, prefs.vision)
    },
    [prefs.vision]
  )

  /**
   * Analyze image and update AttachmentShape with results
   */
  const analyzeAndUpdateShape = useCallback(
    async (shapeId: string, blob: Blob, filename?: string): Promise<void> => {
      if (!editor) return

      try {
        // Mark as analyzing
        setState((prev) => ({
          ...prev,
          analyzing: new Set(prev.analyzing).add(shapeId),
        }))

        // Update shape status
        editor.updateShape<AttachmentShape>({
          id: shapeId as TLShapeId,
          type: 'attachment',
          props: {
            analysisStatus: 'analyzing',
          },
        })

        // Build analysis options from preferences
        const options = buildAnalysisOptions(prefs.vision)

        // Run comprehensive analysis
        const result: ImageAnalysisResult = await analyzeImageComprehensive(
          blob,
          filename,
          options
        )

        // Update shape with results
        const updates: Partial<AttachmentShape['props']> = {
          sourceType: result.sourceType,
          analysisMetadata: result,
          analysisStatus: result.status === 'error' ? 'error' : 'done',
        }

        // Add caption if available
        if (result.caption) {
          updates.caption = result.caption
        }

        editor.updateShape<AttachmentShape>({
          id: shapeId as TLShapeId,
          type: 'attachment',
          props: updates,
        })

        // Mark as completed or failed
        setState((prev) => {
          const newAnalyzing = new Set(prev.analyzing)
          newAnalyzing.delete(shapeId)

          if (result.status === 'error') {
            return {
              analyzing: newAnalyzing,
              completed: prev.completed,
              failed: new Set(prev.failed).add(shapeId),
            }
          } else {
            return {
              analyzing: newAnalyzing,
              completed: new Set(prev.completed).add(shapeId),
              failed: prev.failed,
            }
          }
        })
      } catch (error) {
        console.error('[useImageAnalysis] Analysis failed:', error)

        // Mark shape as error
        editor.updateShape<AttachmentShape>({
          id: shapeId as TLShapeId,
          type: 'attachment',
          props: {
            analysisStatus: 'error',
          },
        })

        // Update state
        setState((prev) => {
          const newAnalyzing = new Set(prev.analyzing)
          newAnalyzing.delete(shapeId)

          return {
            analyzing: newAnalyzing,
            completed: prev.completed,
            failed: new Set(prev.failed).add(shapeId),
          }
        })
      }
    },
    [editor, prefs.vision]
  )

  /**
   * Retry analysis for a failed shape
   */
  const retryAnalysis = useCallback(
    async (shapeId: string): Promise<void> => {
      if (!editor) return

      const shape = editor.getShape<AttachmentShape>(shapeId as TLShapeId)
      if (!shape) return

      // Get image blob from path
      try {
        const response = await fetch(shape.props.filePath)
        const blob = await response.blob()
        await analyzeAndUpdateShape(shapeId, blob, shape.props.fileName)
      } catch (error) {
        console.error('[useImageAnalysis] Retry failed:', error)
      }
    },
    [editor, analyzeAndUpdateShape]
  )

  return {
    /**
     * Detect image source type
     */
    detectSource,

    /**
     * Check if should auto-analyze based on source and preferences
     */
    shouldAnalyze,

    /**
     * Analyze image and update shape with results
     */
    analyzeAndUpdateShape,

    /**
     * Retry failed analysis
     */
    retryAnalysis,

    /**
     * Current analysis state
     */
    isAnalyzing: (shapeId: string) => state.analyzing.has(shapeId),
    isCompleted: (shapeId: string) => state.completed.has(shapeId),
    isFailed: (shapeId: string) => state.failed.has(shapeId),
  }
}
