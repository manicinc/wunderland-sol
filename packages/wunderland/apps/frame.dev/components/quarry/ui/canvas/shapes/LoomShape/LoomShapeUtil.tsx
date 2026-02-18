/**
 * Loom Shape Util
 * @module codex/ui/canvas/shapes/LoomShape
 *
 * Custom tldraw shape for topic containers on infinite canvas.
 * Features:
 * - Container for grouping strands
 * - Expandable/collapsible
 * - Strand count badge
 * - Weave color inheritance
 * - Custom styling from loom.yaml
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
  type LoomShape,
  type LoomShapeProps,
  DEFAULT_SHAPE_PROPS,
  SHAPE_SIZE_CONSTRAINTS,
  clampShapeDimensions,
} from '../types'
import { LoomComponent } from './LoomComponent'

/**
 * Loom shape utility class for topic containers
 */
export class LoomShapeUtil extends BaseBoxShapeUtil<LoomShape> {
  static override type = 'loom' as const

  // Shape behavior flags
  override canEdit = () => false
  override canResize = () => true

  /**
   * Default properties for new loom shapes
   */
  override getDefaultProps(): LoomShapeProps {
    return { ...DEFAULT_SHAPE_PROPS.loom }
  }

  /**
   * Define shape geometry for hit-testing and bounds
   */
  override getGeometry(shape: LoomShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  /**
   * Render the shape component
   */
  override component(shape: LoomShape) {
    return <LoomComponent shape={shape} util={this} />
  }

  /**
   * Render selection indicator
   */
  override indicator(shape: LoomShape) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        rx="16"
        strokeDasharray="8 4"
      />
    )
  }

  /**
   * Define connection handles
   */
  override getHandles(shape: LoomShape): TLHandle[] {
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
  override onResize = (shape: LoomShape, info: TLResizeInfo<LoomShape>) => {
    const newW = info.initialShape.props.w * info.scaleX
    const newH = info.initialShape.props.h * info.scaleY
    const { w, h } = clampShapeDimensions('loom', newW, newH)

    return {
      props: {
        w,
        h,
      },
    }
  }

  /**
   * Handle double-click to toggle expanded state
   */
  override onDoubleClick = (shape: LoomShape) => {
    return {
      id: shape.id,
      type: 'loom' as const,
      props: {
        expanded: !shape.props.expanded,
      },
    }
  }

  /**
   * Export shape as SVG
   */
  override toSvg(shape: LoomShape): SVGElement {
    const { w, h, title, strandCount, backgroundColor, style } = shape.props

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

    // Background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', String(w))
    rect.setAttribute('height', String(h))
    rect.setAttribute('rx', '16')
    rect.setAttribute('fill', backgroundColor || '#fef3c7')
    rect.setAttribute('fill-opacity', '0.5')
    rect.setAttribute('stroke', '#fcd34d')
    rect.setAttribute('stroke-width', '2')
    rect.setAttribute('stroke-dasharray', '8 4')
    g.appendChild(rect)

    // Icon/emoji
    if (style?.emoji) {
      const emojiText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      emojiText.setAttribute('x', '16')
      emojiText.setAttribute('y', '32')
      emojiText.setAttribute('font-size', '20')
      emojiText.textContent = style.emoji
      g.appendChild(emojiText)
    }

    // Title
    const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    titleText.setAttribute('x', style?.emoji ? '44' : '16')
    titleText.setAttribute('y', '28')
    titleText.setAttribute('font-size', '16')
    titleText.setAttribute('font-weight', 'bold')
    titleText.setAttribute('fill', '#92400e')
    titleText.textContent = title
    g.appendChild(titleText)

    // Strand count badge
    const countText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    countText.setAttribute('x', String(w - 16))
    countText.setAttribute('y', '28')
    countText.setAttribute('font-size', '12')
    countText.setAttribute('fill', '#b45309')
    countText.setAttribute('text-anchor', 'end')
    countText.textContent = `${strandCount} strands`
    g.appendChild(countText)

    return g
  }
}
