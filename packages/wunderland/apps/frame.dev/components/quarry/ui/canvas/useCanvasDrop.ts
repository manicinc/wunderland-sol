/**
 * Canvas Drop Hook - Handles drag-and-drop onto the KnowledgeCanvas
 * @module codex/ui/canvas/useCanvasDrop
 *
 * Enables:
 * - Dropping strands from tree/list onto canvas
 * - Creating shapes at drop position
 * - Visual drop zone feedback
 */

'use client'

import { useCallback, useState, useRef } from 'react'
import { createShapeId, type Editor } from '@tldraw/tldraw'
import {
  SUPERNOTE_CARD_SIZES,
  DEFAULT_SUPERNOTE_COLOR,
  DEFAULT_SUPERNOTE_TEXT_COLOR,
  DEFAULT_SUPERNOTE_BORDER_COLOR,
  DEFAULT_SUPERNOTE_FONT_FAMILY,
  DEFAULT_SUPERNOTE_TEXTURE,
  DEFAULT_SUPERNOTE_HAS_CORNER_FOLD,
} from '@/lib/supernoteCanvas'

/** Data format for strand drops */
export interface StrandDropData {
  type: 'strand' | 'loom' | 'weave' | 'supernote'
  id: string
  path: string
  title: string
  summary?: string
  tags?: string[]
  weaveSlug?: string
  loomSlug?: string
  level?: 'weave' | 'loom' | 'strand'
  /** Supernote-specific fields */
  strandType?: 'supernote' | 'file' | 'folder'
  supernote?: {
    primarySupertag: string
    cardSize?: string
    style?: string
    backgroundColor?: string
    textColor?: string
  }
}

/** Drop zone state */
export interface DropZoneState {
  isOver: boolean
  isValid: boolean
  position: { x: number; y: number } | null
}

/** MIME type for canvas strand drops */
export const CANVAS_DROP_MIME = 'application/x-quarry-strand'

/**
 * Encode strand data for drag transfer
 */
export function encodeStrandDragData(data: StrandDropData): string {
  return JSON.stringify(data)
}

/**
 * Decode strand data from drag transfer
 */
export function decodeStrandDragData(data: string): StrandDropData | null {
  try {
    return JSON.parse(data) as StrandDropData
  } catch {
    return null
  }
}

/**
 * Hook for handling drops onto the KnowledgeCanvas
 */
export function useCanvasDrop(
  editor: Editor | null,
  onStrandDrop?: (data: StrandDropData, position: { x: number; y: number }) => void
) {
  const [dropState, setDropState] = useState<DropZoneState>({
    isOver: false,
    isValid: false,
    position: null,
  })

  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Get drop position in canvas coordinates
  const getCanvasPosition = useCallback((clientX: number, clientY: number) => {
    if (!editor || !dropZoneRef.current) return { x: 100, y: 100 }

    const rect = dropZoneRef.current.getBoundingClientRect()
    const screenX = clientX - rect.left
    const screenY = clientY - rect.top

    // Convert screen coordinates to page coordinates
    const pagePoint = editor.screenToPage({ x: screenX, y: screenY })
    return { x: pagePoint.x, y: pagePoint.y }
  }, [editor])

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const hasStrandData = e.dataTransfer.types.includes(CANVAS_DROP_MIME)

    setDropState({
      isOver: true,
      isValid: hasStrandData,
      position: { x: e.clientX, y: e.clientY },
    })

    e.dataTransfer.dropEffect = hasStrandData ? 'copy' : 'none'
  }, [])

  // Handle drag enter
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const hasStrandData = e.dataTransfer.types.includes(CANVAS_DROP_MIME)

    setDropState(prev => ({
      ...prev,
      isOver: true,
      isValid: hasStrandData,
    }))
  }, [])

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()

    // Only reset if leaving the actual drop zone (not a child element)
    const relatedTarget = e.relatedTarget as HTMLElement
    if (dropZoneRef.current && !dropZoneRef.current.contains(relatedTarget)) {
      setDropState({
        isOver: false,
        isValid: false,
        position: null,
      })
    }
  }, [])

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const rawData = e.dataTransfer.getData(CANVAS_DROP_MIME)
    const strandData = decodeStrandDragData(rawData)

    if (strandData && editor) {
      const position = getCanvasPosition(e.clientX, e.clientY)

      // Create strand shape at drop position
      const shapeId = createShapeId()

      // Check if this is a supernote (strand with strandType: 'supernote')
      const isSupernote = strandData.type === 'supernote' || strandData.strandType === 'supernote'

      if (isSupernote) {
        // Get supernote-specific sizing
        const cardSizeKey = (strandData.supernote?.cardSize || '4x6') as keyof typeof SUPERNOTE_CARD_SIZES
        const cardSize = SUPERNOTE_CARD_SIZES[cardSizeKey] || SUPERNOTE_CARD_SIZES['4x6']

        editor.createShapes([{
          id: shapeId,
          type: 'supernote',
          x: position.x - cardSize.w / 2,
          y: position.y - cardSize.h / 2,
          props: {
            w: cardSize.w,
            h: cardSize.h,
            supernoteId: strandData.id,
            strandPath: strandData.path,
            title: strandData.title,
            summary: strandData.summary,
            supertag: strandData.supernote?.primarySupertag || '',
            supertagFields: {},
            color: strandData.supernote?.backgroundColor || DEFAULT_SUPERNOTE_COLOR,
            cardSize: cardSizeKey,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            fontFamily: DEFAULT_SUPERNOTE_FONT_FAMILY,
            fontSize: 'md',
            textColor: strandData.supernote?.textColor || DEFAULT_SUPERNOTE_TEXT_COLOR,
            backgroundColor: strandData.supernote?.backgroundColor || DEFAULT_SUPERNOTE_COLOR,
            borderColor: DEFAULT_SUPERNOTE_BORDER_COLOR,
            isCollapsed: false,
            isHighlighted: false,
            hasCornerFold: DEFAULT_SUPERNOTE_HAS_CORNER_FOLD,
            texture: DEFAULT_SUPERNOTE_TEXTURE,
          },
        }])
      } else if (strandData.type === 'strand' || strandData.level === 'strand') {
        editor.createShapes([{
          id: shapeId,
          type: 'strand',
          x: position.x - 140, // Center the card
          y: position.y - 80,
          props: {
            strandId: strandData.id,
            strandPath: strandData.path,
            title: strandData.title,
            summary: strandData.summary,
            tags: strandData.tags || [],
            weaveSlug: strandData.weaveSlug,
            loomSlug: strandData.loomSlug,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            collapsed: false,
            highlighted: false,
          },
        }])
      } else if (strandData.type === 'loom' || strandData.level === 'loom') {
        editor.createShapes([{
          id: shapeId,
          type: 'loom',
          x: position.x - 160,
          y: position.y - 100,
          props: {
            loomId: strandData.id,
            loomPath: strandData.path,
            title: strandData.title,
            description: strandData.summary,
            childStrandIds: [],
            backgroundColor: '#3b82f6',
            expanded: true,
            highlighted: false,
          },
        }])
      } else if (strandData.type === 'weave' || strandData.level === 'weave') {
        editor.createShapes([{
          id: shapeId,
          type: 'weave',
          x: position.x - 200,
          y: position.y - 150,
          props: {
            weaveId: strandData.id,
            weavePath: strandData.path,
            title: strandData.title,
            description: strandData.summary,
            childLoomIds: [],
            childStrandIds: [],
            regionColor: '#8b5cf6',
            regionOpacity: 0.15,
          },
        }])
      }

      // Notify parent
      onStrandDrop?.(strandData, position)
    }

    // Reset drop state
    setDropState({
      isOver: false,
      isValid: false,
      position: null,
    })
  }, [editor, getCanvasPosition, onStrandDrop])

  return {
    dropZoneRef,
    dropState,
    dropHandlers: {
      onDragOver: handleDragOver,
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  }
}

/**
 * Hook for making an element a drag source for the canvas
 */
export function useCanvasDragSource(data: StrandDropData) {
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData(CANVAS_DROP_MIME, encodeStrandDragData(data))
    e.dataTransfer.effectAllowed = 'copy'

    // Create a drag preview
    const preview = document.createElement('div')
    preview.className = 'px-3 py-2 bg-emerald-500 text-white rounded-lg shadow-lg text-sm font-medium'
    preview.textContent = data.title
    preview.style.position = 'absolute'
    preview.style.top = '-1000px'
    document.body.appendChild(preview)
    e.dataTransfer.setDragImage(preview, 0, 0)

    // Clean up preview after drag starts
    setTimeout(() => document.body.removeChild(preview), 0)
  }, [data])

  return {
    draggable: true,
    onDragStart: handleDragStart,
  }
}

export default useCanvasDrop
