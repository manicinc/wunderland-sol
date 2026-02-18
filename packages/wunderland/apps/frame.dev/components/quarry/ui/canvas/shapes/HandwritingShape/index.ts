/**
 * HandwritingShape Module
 * @module codex/ui/canvas/shapes/HandwritingShape
 *
 * Exports all components and utilities for the HandwritingShape
 */

export { HandwritingShapeUtil } from './HandwritingShapeUtil'
export { HandwritingComponent } from './HandwritingComponent'
export { ConfidenceBadge } from './ConfidenceBadge'
export { TranscriptionModal } from './TranscriptionModal'
export { useRealtimeOCR } from './useRealtimeOCR'
export {
  exportCanvasStrokes,
  exportMultipleShapesAsImage,
  blobToDataUrl,
  downloadImageBlob,
} from './canvasToImage'

export type { ConfidenceBadgeProps } from './ConfidenceBadge'
export type { UseRealtimeOCROptions } from './useRealtimeOCR'
