/**
 * Weave Shape Util
 * @module codex/ui/canvas/shapes/WeaveShape
 *
 * Custom tldraw shape for knowledge universe regions on infinite canvas.
 * Features:
 * - Large semi-transparent colored region
 * - Title in corner with weave icon
 * - Acts as grouping container in force layout
 * - Gradient fade at edges
 * - z-index below all other shapes
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
  type WeaveShape,
  type WeaveShapeProps,
  DEFAULT_SHAPE_PROPS,
  SHAPE_SIZE_CONSTRAINTS,
  clampShapeDimensions,
} from '../types'
import { WeaveComponent } from './WeaveComponent'

/**
 * Weave shape utility class for knowledge universe regions
 */
export class WeaveShapeUtil extends BaseBoxShapeUtil<WeaveShape> {
  static override type = 'weave' as const

  // Shape behavior flags
  override canEdit = () => false
  override canResize = () => true

  /**
   * Default properties for new weave shapes
   */
  override getDefaultProps(): WeaveShapeProps {
    return { ...DEFAULT_SHAPE_PROPS.weave }
  }

  /**
   * Define shape geometry for hit-testing and bounds
   */
  override getGeometry(shape: WeaveShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  /**
   * Render the shape component
   */
  override component(shape: WeaveShape) {
    return <WeaveComponent shape={shape} util={this} />
  }

  /**
   * Render selection indicator
   */
  override indicator(shape: WeaveShape) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        rx="24"
        strokeDasharray="12 6"
      />
    )
  }

  /**
   * Handle resize with constraints
   */
  override onResize = (shape: WeaveShape, info: TLResizeInfo<WeaveShape>) => {
    const newW = info.initialShape.props.w * info.scaleX
    const newH = info.initialShape.props.h * info.scaleY
    const { w, h } = clampShapeDimensions('weave', newW, newH)

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
  override toSvg(shape: WeaveShape): SVGElement {
    const { w, h, title, regionColor, regionOpacity, style } = shape.props

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

    // Gradient definition for fade effect
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    const radialGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient')
    radialGradient.setAttribute('id', `weave-grad-${shape.id}`)
    radialGradient.setAttribute('cx', '50%')
    radialGradient.setAttribute('cy', '50%')
    radialGradient.setAttribute('r', '70%')

    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
    stop1.setAttribute('offset', '0%')
    stop1.setAttribute('stop-color', regionColor)
    stop1.setAttribute('stop-opacity', String(regionOpacity))

    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
    stop2.setAttribute('offset', '100%')
    stop2.setAttribute('stop-color', regionColor)
    stop2.setAttribute('stop-opacity', '0')

    radialGradient.appendChild(stop1)
    radialGradient.appendChild(stop2)
    defs.appendChild(radialGradient)
    g.appendChild(defs)

    // Background region
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', String(w))
    rect.setAttribute('height', String(h))
    rect.setAttribute('rx', '24')
    rect.setAttribute('fill', `url(#weave-grad-${shape.id})`)
    g.appendChild(rect)

    // Title with icon
    const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    titleText.setAttribute('x', '24')
    titleText.setAttribute('y', '36')
    titleText.setAttribute('font-size', '18')
    titleText.setAttribute('font-weight', 'bold')
    titleText.setAttribute('fill', regionColor)
    titleText.textContent = (style?.emoji || '🌐') + ' ' + title
    g.appendChild(titleText)

    return g
  }
}
