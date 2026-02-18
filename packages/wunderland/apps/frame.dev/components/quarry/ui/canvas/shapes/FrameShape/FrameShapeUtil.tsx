/**
 * Frame Shape Util
 * @module codex/ui/canvas/shapes/FrameShape
 *
 * Custom tldraw shape for named container regions on infinite canvas.
 * Features:
 * - Named header with editable title
 * - Background color options
 * - Children grouping behavior
 * - Collapse/expand functionality
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
  type FrameShape,
  type FrameShapeProps,
  DEFAULT_SHAPE_PROPS,
  SHAPE_SIZE_CONSTRAINTS,
  clampShapeDimensions,
} from '../types'
import { FrameComponent } from './FrameComponent'

/**
 * Frame shape utility class for container regions
 */
export class FrameShapeUtil extends BaseBoxShapeUtil<FrameShape> {
  static override type = 'frame' as const

  // Shape behavior flags
  override canEdit = () => true
  override canResize = () => true

  /**
   * Default properties for new frame shapes
   */
  override getDefaultProps(): FrameShapeProps {
    return { ...DEFAULT_SHAPE_PROPS.frame }
  }

  /**
   * Define shape geometry for hit-testing and bounds
   */
  override getGeometry(shape: FrameShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  /**
   * Render the shape component
   */
  override component(shape: FrameShape) {
    return <FrameComponent shape={shape} util={this} />
  }

  /**
   * Render selection indicator
   */
  override indicator(shape: FrameShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx="12" strokeDasharray="4 4" />
  }

  /**
   * Handle resize with constraints
   */
  override onResize = (shape: FrameShape, info: TLResizeInfo<FrameShape>) => {
    const newW = info.initialShape.props.w * info.scaleX
    const newH = info.initialShape.props.h * info.scaleY
    const { w, h } = clampShapeDimensions('frame', newW, newH)

    return {
      props: {
        w,
        h,
      },
    }
  }

  /**
   * Handle double-click to toggle collapsed state
   */
  override onDoubleClick = (shape: FrameShape) => {
    return {
      id: shape.id,
      type: 'frame' as const,
      props: {
        collapsed: !shape.props.collapsed,
      },
    }
  }

  /**
   * Export shape as SVG
   */
  override toSvg(shape: FrameShape): SVGElement {
    const { w, h, title, backgroundColor, showTitle } = shape.props

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

    // Frame background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', String(w))
    rect.setAttribute('height', String(h))
    rect.setAttribute('rx', '12')
    rect.setAttribute('fill', backgroundColor || '#f8fafc')
    rect.setAttribute('stroke', '#e2e8f0')
    rect.setAttribute('stroke-width', '2')
    rect.setAttribute('stroke-dasharray', '8 4')
    g.appendChild(rect)

    // Title if shown
    if (showTitle && title) {
      // Title background
      const titleBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      titleBg.setAttribute('x', '12')
      titleBg.setAttribute('y', '-12')
      titleBg.setAttribute('width', String(Math.min(title.length * 10 + 24, w - 24)))
      titleBg.setAttribute('height', '24')
      titleBg.setAttribute('rx', '4')
      titleBg.setAttribute('fill', '#1f2937')
      g.appendChild(titleBg)

      // Title text
      const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      titleText.setAttribute('x', '24')
      titleText.setAttribute('y', '4')
      titleText.setAttribute('font-size', '12')
      titleText.setAttribute('font-weight', '600')
      titleText.setAttribute('fill', '#ffffff')
      titleText.textContent = title.length > 30 ? title.substring(0, 30) + '...' : title
      g.appendChild(titleText)
    }

    return g
  }
}

