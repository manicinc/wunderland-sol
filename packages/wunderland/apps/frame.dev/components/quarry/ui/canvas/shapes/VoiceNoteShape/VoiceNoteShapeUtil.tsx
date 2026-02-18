/**
 * VoiceNote Shape Util
 * @module codex/ui/canvas/shapes/VoiceNoteShape
 *
 * Custom tldraw shape for audio playback with waveform visualization.
 * Features:
 * - Play/pause/seek controls
 * - Waveform visualization
 * - Transcription status indicator
 * - Link to transcript shape
 */

'use client'

import {
  BaseBoxShapeUtil,
  HTMLContainer,
  Rectangle2d,
  TLResizeInfo,
  TLHandle,
  type Geometry2d,
} from '@tldraw/tldraw'
import {
  type VoiceNoteShape,
  type VoiceNoteShapeProps,
  DEFAULT_SHAPE_PROPS,
  SHAPE_SIZE_CONSTRAINTS,
  clampShapeDimensions,
} from '../types'
import { VoiceNoteComponent } from './VoiceNoteComponent'

/**
 * VoiceNote shape utility class
 */
export class VoiceNoteShapeUtil extends BaseBoxShapeUtil<VoiceNoteShape> {
  static override type = 'voicenote' as const

  // Shape behavior flags
  override canEdit = () => true
  override canResize = () => true

  /**
   * Default properties for new voice note shapes
   */
  override getDefaultProps(): VoiceNoteShapeProps {
    return { ...DEFAULT_SHAPE_PROPS.voicenote }
  }

  /**
   * Define shape geometry for hit-testing and bounds
   */
  override getGeometry(shape: VoiceNoteShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  /**
   * Render the shape component
   */
  override component(shape: VoiceNoteShape) {
    return <VoiceNoteComponent shape={shape} util={this} />
  }

  /**
   * Render selection indicator
   */
  override indicator(shape: VoiceNoteShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx="12" />
  }

  /**
   * Define connection handles for linking
   */
  override getHandles(shape: VoiceNoteShape): TLHandle[] {
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
  override onResize = (shape: VoiceNoteShape, info: TLResizeInfo<VoiceNoteShape>) => {
    const newW = info.initialShape.props.w * info.scaleX
    const newH = info.initialShape.props.h * info.scaleY
    const { w, h } = clampShapeDimensions('voicenote', newW, newH)

    return {
      props: {
        w,
        h,
      },
    }
  }

  /**
   * Handle double-click to edit title
   */
  override onDoubleClick = (shape: VoiceNoteShape) => {
    // Enter edit mode to change title
    return undefined
  }

  /**
   * Handle edit end - save any changes
   */
  override onEditEnd = (shape: VoiceNoteShape) => {
    console.log('VoiceNote edit ended:', shape.id)
  }

  /**
   * Export shape as SVG (for saving)
   */
  override toSvg(shape: VoiceNoteShape): SVGElement {
    const { w, h, title, duration } = shape.props
    const mins = Math.floor(duration / 60)
    const secs = Math.floor(duration % 60)
    const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

    // Background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', String(w))
    rect.setAttribute('height', String(h))
    rect.setAttribute('rx', '12')
    rect.setAttribute('fill', '#fef2f2')
    rect.setAttribute('stroke', '#fecaca')
    rect.setAttribute('stroke-width', '2')
    g.appendChild(rect)

    // Title
    const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    titleText.setAttribute('x', '16')
    titleText.setAttribute('y', '24')
    titleText.setAttribute('font-size', '14')
    titleText.setAttribute('fill', '#991b1b')
    titleText.textContent = '🎙️ ' + title
    g.appendChild(titleText)

    // Duration
    const durationText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    durationText.setAttribute('x', String(w - 16))
    durationText.setAttribute('y', '24')
    durationText.setAttribute('font-size', '12')
    durationText.setAttribute('fill', '#991b1b')
    durationText.setAttribute('text-anchor', 'end')
    durationText.textContent = durationStr
    g.appendChild(durationText)

    return g
  }
}
