/**
 * Collection Shape Util
 * @module codex/ui/canvas/shapes/CollectionShape
 *
 * Custom tldraw shape for visual collection containers on infinite canvas.
 * Features:
 * - Expandable card groups
 * - Cross-weave/loom indicators
 * - Strand count badge
 * - Color-coded headers
 * - Grid of strand mini-cards when expanded
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
  type CollectionShape,
  type CollectionShapeProps,
  DEFAULT_SHAPE_PROPS,
  clampShapeDimensions,
} from '../types'
import { CollectionComponent } from './CollectionComponent'

/**
 * Collection shape utility class for visual strand groupings
 */
export class CollectionShapeUtil extends BaseBoxShapeUtil<CollectionShape> {
  static override type = 'collection' as const

  // Shape behavior flags
  override canEdit = () => false
  override canResize = () => true

  /**
   * Default properties for new collection shapes
   */
  override getDefaultProps(): CollectionShapeProps {
    return { ...DEFAULT_SHAPE_PROPS.collection }
  }

  /**
   * Define shape geometry for hit-testing and bounds
   */
  override getGeometry(shape: CollectionShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  /**
   * Render the shape component
   */
  override component(shape: CollectionShape) {
    return <CollectionComponent shape={shape} util={this} />
  }

  /**
   * Render selection indicator
   */
  override indicator(shape: CollectionShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx="16" />
  }

  /**
   * Define connection handles for linking to other shapes
   */
  override getHandles(shape: CollectionShape): TLHandle[] {
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
  override onResize = (shape: CollectionShape, info: TLResizeInfo<CollectionShape>) => {
    const newW = info.initialShape.props.w * info.scaleX
    const newH = info.initialShape.props.h * info.scaleY
    const { w, h } = clampShapeDimensions('collection', newW, newH)

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
  override onDoubleClick = (shape: CollectionShape) => {
    // Toggle expanded state
    return {
      id: shape.id,
      type: 'collection' as const,
      props: {
        expanded: !shape.props.expanded,
      },
    }
  }

  /**
   * Export shape as SVG
   */
  override toSvg(shape: CollectionShape): SVGElement {
    const { w, h, title, description, strandCount, color, icon } = shape.props

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

    // Background with gradient
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient')
    gradient.setAttribute('id', `collection-bg-${shape.id}`)
    gradient.setAttribute('x1', '0%')
    gradient.setAttribute('y1', '0%')
    gradient.setAttribute('x2', '0%')
    gradient.setAttribute('y2', '100%')

    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
    stop1.setAttribute('offset', '0%')
    stop1.setAttribute('stop-color', '#faf5ff')

    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
    stop2.setAttribute('offset', '100%')
    stop2.setAttribute('stop-color', '#ede9fe')

    gradient.appendChild(stop1)
    gradient.appendChild(stop2)
    defs.appendChild(gradient)
    g.appendChild(defs)

    // Card background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', String(w))
    rect.setAttribute('height', String(h))
    rect.setAttribute('rx', '16')
    rect.setAttribute('fill', `url(#collection-bg-${shape.id})`)
    rect.setAttribute('stroke', '#d8b4fe')
    rect.setAttribute('stroke-width', '2')
    g.appendChild(rect)

    // Header bar
    const headerRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    headerRect.setAttribute('width', String(w))
    headerRect.setAttribute('height', '48')
    headerRect.setAttribute('rx', '16')
    headerRect.setAttribute('fill', color)
    g.appendChild(headerRect)

    // Bottom clip for header
    const headerClip = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    headerClip.setAttribute('y', '16')
    headerClip.setAttribute('width', String(w))
    headerClip.setAttribute('height', '32')
    headerClip.setAttribute('fill', color)
    g.appendChild(headerClip)

    // Title
    const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    titleText.setAttribute('x', '16')
    titleText.setAttribute('y', '30')
    titleText.setAttribute('font-size', '14')
    titleText.setAttribute('font-weight', 'bold')
    titleText.setAttribute('fill', '#ffffff')
    titleText.textContent = title.length > 25 ? title.substring(0, 25) + '...' : title
    g.appendChild(titleText)

    // Strand count badge
    const countText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    countText.setAttribute('x', String(w - 16))
    countText.setAttribute('y', '30')
    countText.setAttribute('font-size', '12')
    countText.setAttribute('font-weight', 'bold')
    countText.setAttribute('fill', '#ffffff')
    countText.setAttribute('text-anchor', 'end')
    countText.textContent = `${strandCount} strands`
    g.appendChild(countText)

    // Description
    if (description) {
      const descText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      descText.setAttribute('x', '16')
      descText.setAttribute('y', '72')
      descText.setAttribute('font-size', '11')
      descText.setAttribute('fill', '#7c3aed')
      descText.textContent = description.length > 40 ? description.substring(0, 40) + '...' : description
      g.appendChild(descText)
    }

    return g
  }
}
