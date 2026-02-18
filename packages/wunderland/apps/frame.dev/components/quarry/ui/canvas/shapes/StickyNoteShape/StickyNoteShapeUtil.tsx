/**
 * Sticky Note Shape Util
 * @module codex/ui/canvas/shapes/StickyNoteShape
 *
 * Custom tldraw shape for quick text capture on infinite canvas.
 * Features:
 * - Multiple color options (like Post-it notes)
 * - Editable text content
 * - Font size options
 * - Tilted paper effect
 */

'use client'

import {
  BaseBoxShapeUtil,
  HTMLContainer,
  Rectangle2d,
  TLResizeInfo,
  type Geometry2d,
} from '@tldraw/tldraw'
import {
  type StickyNoteShape,
  type StickyNoteShapeProps,
  DEFAULT_SHAPE_PROPS,
  SHAPE_SIZE_CONSTRAINTS,
  clampShapeDimensions,
} from '../types'
import { StickyNoteComponent } from './StickyNoteComponent'

/**
 * Sticky note shape utility class
 */
export class StickyNoteShapeUtil extends BaseBoxShapeUtil<StickyNoteShape> {
  static override type = 'stickynote' as const

  // Shape behavior flags
  override canEdit = () => true
  override canResize = () => true

  /**
   * Default properties for new sticky note shapes
   */
  override getDefaultProps(): StickyNoteShapeProps {
    return { ...DEFAULT_SHAPE_PROPS.stickynote }
  }

  /**
   * Define shape geometry for hit-testing and bounds
   */
  override getGeometry(shape: StickyNoteShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  /**
   * Render the shape component
   */
  override component(shape: StickyNoteShape) {
    return <StickyNoteComponent shape={shape} util={this} />
  }

  /**
   * Render selection indicator
   */
  override indicator(shape: StickyNoteShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx="4" />
  }

  /**
   * Handle resize with constraints
   */
  override onResize = (shape: StickyNoteShape, info: TLResizeInfo<StickyNoteShape>) => {
    const newW = info.initialShape.props.w * info.scaleX
    const newH = info.initialShape.props.h * info.scaleY
    const { w, h } = clampShapeDimensions('stickynote', newW, newH)

    return {
      props: {
        w,
        h,
      },
    }
  }

  /**
   * Export shape as SVG
   */
  override toSvg(shape: StickyNoteShape): SVGElement {
    const { w, h, text, color } = shape.props
    
    const colorMap: Record<string, string> = {
      yellow: '#fef08a',
      pink: '#fbcfe8',
      blue: '#bfdbfe',
      green: '#bbf7d0',
      purple: '#ddd6fe',
      orange: '#fed7aa',
    }

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

    // Sticky note background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', String(w))
    rect.setAttribute('height', String(h))
    rect.setAttribute('rx', '4')
    rect.setAttribute('fill', colorMap[color] || colorMap.yellow)
    rect.setAttribute('filter', 'drop-shadow(2px 4px 6px rgba(0,0,0,0.15))')
    g.appendChild(rect)

    // Fold effect
    const fold = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    fold.setAttribute('points', `${w - 20},0 ${w},20 ${w},0`)
    fold.setAttribute('fill', 'rgba(0,0,0,0.1)')
    g.appendChild(fold)

    // Text
    const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    textEl.setAttribute('x', '12')
    textEl.setAttribute('y', '28')
    textEl.setAttribute('font-size', '14')
    textEl.setAttribute('fill', '#1f2937')
    textEl.textContent = text.length > 100 ? text.substring(0, 100) + '...' : text
    g.appendChild(textEl)

    return g
  }
}

