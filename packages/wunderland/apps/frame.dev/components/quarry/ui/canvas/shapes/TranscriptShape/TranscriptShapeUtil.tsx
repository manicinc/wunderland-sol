/**
 * Transcript Shape Util
 * @module codex/ui/canvas/shapes/TranscriptShape
 *
 * Custom tldraw shape for text transcripts with:
 * - Editable text content
 * - Auto-resize based on content
 * - Link to voice note
 * - Tag support
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
  type TranscriptShape,
  type TranscriptShapeProps,
  DEFAULT_SHAPE_PROPS,
  clampShapeDimensions,
} from '../types'
import { TranscriptComponent } from './TranscriptComponent'

/**
 * Transcript shape utility class
 */
export class TranscriptShapeUtil extends BaseBoxShapeUtil<TranscriptShape> {
  static override type = 'transcript' as const

  // Shape behavior flags
  override canEdit = () => true
  override canResize = () => true

  /**
   * Default properties for new transcript shapes
   */
  override getDefaultProps(): TranscriptShapeProps {
    return { ...DEFAULT_SHAPE_PROPS.transcript }
  }

  /**
   * Define shape geometry for hit-testing and bounds
   */
  override getGeometry(shape: TranscriptShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  /**
   * Render the shape component
   */
  override component(shape: TranscriptShape) {
    return <TranscriptComponent shape={shape} util={this} />
  }

  /**
   * Render selection indicator
   */
  override indicator(shape: TranscriptShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx="12" />
  }

  /**
   * Define connection handles for linking
   */
  override getHandles(shape: TranscriptShape): TLHandle[] {
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
  override onResize = (shape: TranscriptShape, info: TLResizeInfo<TranscriptShape>) => {
    const newW = info.initialShape.props.w * info.scaleX
    const newH = info.initialShape.props.h * info.scaleY
    const { w, h } = clampShapeDimensions('transcript', newW, newH)

    return {
      props: {
        w,
        h,
      },
    }
  }

  /**
   * Handle before update to validate linked shapes
   */
  override onBeforeUpdate = (prev: TranscriptShape, next: TranscriptShape) => {
    // If linked voice note ID changed, verify it exists
    if (next.props.linkedVoiceNoteId && next.props.linkedVoiceNoteId !== prev.props.linkedVoiceNoteId) {
      const voiceNote = this.editor.getShape(next.props.linkedVoiceNoteId as any)
      if (!voiceNote) {
        // Clear invalid link
        return {
          ...next,
          props: { ...next.props, linkedVoiceNoteId: '' },
        }
      }
    }
    return next
  }

  /**
   * Handle edit end
   */
  override onEditEnd = (shape: TranscriptShape) => {
    console.log('Transcript edit ended:', shape.id)
  }

  /**
   * Export shape as SVG
   */
  override toSvg(shape: TranscriptShape): SVGElement {
    const { w, h, title, text, tags } = shape.props
    const contentPreview = text.slice(0, 50) + (text.length > 50 ? '...' : '')
    const tagsStr = tags.map((t) => `#${t}`).join(' ')

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

    // Background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', String(w))
    rect.setAttribute('height', String(h))
    rect.setAttribute('rx', '12')
    rect.setAttribute('fill', '#faf5ff')
    rect.setAttribute('stroke', '#e9d5ff')
    rect.setAttribute('stroke-width', '2')
    g.appendChild(rect)

    // Title
    const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    titleText.setAttribute('x', '16')
    titleText.setAttribute('y', '24')
    titleText.setAttribute('font-size', '14')
    titleText.setAttribute('font-weight', 'bold')
    titleText.setAttribute('fill', '#6b21a8')
    titleText.textContent = '📄 ' + title
    g.appendChild(titleText)

    // Content preview
    const contentText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    contentText.setAttribute('x', '16')
    contentText.setAttribute('y', '48')
    contentText.setAttribute('font-size', '12')
    contentText.setAttribute('fill', '#6b21a8')
    contentText.textContent = contentPreview
    g.appendChild(contentText)

    // Tags
    if (tags.length > 0) {
      const tagsText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      tagsText.setAttribute('x', '16')
      tagsText.setAttribute('y', String(h - 16))
      tagsText.setAttribute('font-size', '10')
      tagsText.setAttribute('fill', '#a855f7')
      tagsText.textContent = tagsStr
      g.appendChild(tagsText)
    }

    return g
  }
}
