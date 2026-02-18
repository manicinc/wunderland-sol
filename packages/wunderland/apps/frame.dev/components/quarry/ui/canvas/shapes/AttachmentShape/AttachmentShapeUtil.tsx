/**
 * Attachment Shape Util
 * @module codex/ui/canvas/shapes/AttachmentShape
 *
 * Custom tldraw shape for file attachments with:
 * - Thumbnail preview for images
 * - File icon for documents
 * - Download functionality
 * - Drag-drop support
 */

'use client'

import {
  BaseBoxShapeUtil,
  Rectangle2d,
  TLResizeInfo,
  TLHandle,
  type Geometry2d,
} from '@tldraw/tldraw'
import {
  type AttachmentShape,
  type AttachmentShapeProps,
  DEFAULT_SHAPE_PROPS,
  clampShapeDimensions,
} from '../types'
import { AttachmentComponent } from './AttachmentComponent'

/**
 * Attachment shape utility class
 */
export class AttachmentShapeUtil extends BaseBoxShapeUtil<AttachmentShape> {
  static override type = 'attachment' as const

  // Shape behavior flags
  override canEdit = () => true
  override canResize = () => true

  /**
   * Default properties for new attachment shapes
   */
  override getDefaultProps(): AttachmentShapeProps {
    return { ...DEFAULT_SHAPE_PROPS.attachment }
  }

  /**
   * Define shape geometry for hit-testing and bounds
   */
  override getGeometry(shape: AttachmentShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  /**
   * Render the shape component
   */
  override component(shape: AttachmentShape) {
    return <AttachmentComponent shape={shape} util={this} />
  }

  /**
   * Render selection indicator
   */
  override indicator(shape: AttachmentShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx="12" />
  }

  /**
   * Define connection handles for linking
   */
  override getHandles(shape: AttachmentShape): TLHandle[] {
    const { w, h } = shape.props
    return [
      {
        id: 'top',
        type: 'vertex',
        index: 'a1' as any,
        x: w / 2,
        y: 0,
      },
      {
        id: 'bottom',
        type: 'vertex',
        index: 'a2' as any,
        x: w / 2,
        y: h,
      },
      {
        id: 'left',
        type: 'vertex',
        index: 'a3' as any,
        x: 0,
        y: h / 2,
      },
      {
        id: 'right',
        type: 'vertex',
        index: 'a4' as any,
        x: w,
        y: h / 2,
      },
    ]
  }

  /**
   * Handle resize with constraints
   */
  override onResize = (shape: AttachmentShape, info: TLResizeInfo<AttachmentShape>) => {
    const newW = info.initialShape.props.w * info.scaleX
    const newH = info.initialShape.props.h * info.scaleY
    const { w, h } = clampShapeDimensions('attachment', newW, newH)

    return {
      props: {
        w,
        h,
      },
    }
  }

  /**
   * Handle double-click to open file
   */
  override onDoubleClick = (shape: AttachmentShape) => {
    if (shape.props.filePath) {
      window.open(shape.props.filePath, '_blank')
    }
    return undefined
  }

  /**
   * Export shape as SVG
   */
  override toSvg(shape: AttachmentShape): SVGElement {
    const { w, h, fileName, fileSize, mimeType } = shape.props
    const displayName = fileName.length > 20 ? fileName.slice(0, 17) + '...' : fileName

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

    // Background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', String(w))
    rect.setAttribute('height', String(h))
    rect.setAttribute('rx', '12')
    rect.setAttribute('fill', '#f0fdf4')
    rect.setAttribute('stroke', '#bbf7d0')
    rect.setAttribute('stroke-width', '2')
    g.appendChild(rect)

    // File icon
    const iconText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    iconText.setAttribute('x', String(w / 2))
    iconText.setAttribute('y', String(h / 2 - 10))
    iconText.setAttribute('font-size', '32')
    iconText.setAttribute('text-anchor', 'middle')
    iconText.textContent = getFileEmoji(mimeType)
    g.appendChild(iconText)

    // Filename
    const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    nameText.setAttribute('x', String(w / 2))
    nameText.setAttribute('y', String(h / 2 + 20))
    nameText.setAttribute('font-size', '12')
    nameText.setAttribute('text-anchor', 'middle')
    nameText.setAttribute('fill', '#166534')
    nameText.textContent = displayName
    g.appendChild(nameText)

    // File size
    const sizeText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    sizeText.setAttribute('x', String(w / 2))
    sizeText.setAttribute('y', String(h / 2 + 36))
    sizeText.setAttribute('font-size', '10')
    sizeText.setAttribute('text-anchor', 'middle')
    sizeText.setAttribute('fill', '#166534')
    sizeText.setAttribute('opacity', '0.7')
    sizeText.textContent = formatSize(fileSize)
    g.appendChild(sizeText)

    return g
  }
}

/**
 * Get emoji for file type
 */
function getFileEmoji(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '📷'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.startsWith('video/')) return '🎬'
  if (mimeType.includes('pdf')) return '📄'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️'
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦'
  return '📎'
}

/**
 * Format file size
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
