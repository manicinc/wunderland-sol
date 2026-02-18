/**
 * Connection Shape Util
 * @module codex/ui/canvas/shapes/ConnectionShape
 *
 * Custom tldraw shape for relationship links between strands.
 * Features:
 * - Styled lines per relationship type
 * - Animated pulse on hover
 * - Label tooltip
 * - Curved bezier paths
 * - Strength affects stroke width
 */

'use client'

import {
  BaseBoxShapeUtil,
  Rectangle2d,
  TLResizeInfo,
  type Geometry2d,
} from '@tldraw/tldraw'
import {
  type ConnectionShape,
  type ConnectionShapeProps,
  DEFAULT_SHAPE_PROPS,
  clampShapeDimensions,
} from '../types'
import { ConnectionComponent } from './ConnectionComponent'

/**
 * Connection shape utility class for relationship visualization
 */
export class ConnectionShapeUtil extends BaseBoxShapeUtil<ConnectionShape> {
  static override type = 'connection' as const

  // Shape behavior flags
  override canEdit = () => false
  override canResize = () => false

  /**
   * Default properties for new connection shapes
   */
  override getDefaultProps(): ConnectionShapeProps {
    return { ...DEFAULT_SHAPE_PROPS.connection }
  }

  /**
   * Define shape geometry for hit-testing and bounds
   */
  override getGeometry(shape: ConnectionShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: false,
    })
  }

  /**
   * Render the shape component
   */
  override component(shape: ConnectionShape) {
    return <ConnectionComponent shape={shape} util={this} />
  }

  /**
   * Render selection indicator
   */
  override indicator(shape: ConnectionShape) {
    return <rect width={shape.props.w} height={shape.props.h} fill="none" />
  }

  /**
   * Export shape as SVG
   */
  override toSvg(shape: ConnectionShape): SVGElement {
    const { w, h, color, lineStyle, strength, label } = shape.props

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

    // Line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', '0')
    line.setAttribute('y1', String(h / 2))
    line.setAttribute('x2', String(w))
    line.setAttribute('y2', String(h / 2))
    line.setAttribute('stroke', color)
    line.setAttribute('stroke-width', String(1 + strength * 3))

    if (lineStyle === 'dashed') {
      line.setAttribute('stroke-dasharray', '8 4')
    } else if (lineStyle === 'dotted') {
      line.setAttribute('stroke-dasharray', '2 4')
    }

    g.appendChild(line)

    // Label
    if (label) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      text.setAttribute('x', String(w / 2))
      text.setAttribute('y', String(h / 2 - 8))
      text.setAttribute('font-size', '10')
      text.setAttribute('fill', color)
      text.setAttribute('text-anchor', 'middle')
      text.textContent = label
      g.appendChild(text)
    }

    return g
  }
}
