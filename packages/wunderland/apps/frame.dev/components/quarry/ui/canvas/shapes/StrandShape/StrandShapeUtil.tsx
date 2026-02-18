/**
 * Strand Shape Util
 * @module codex/ui/canvas/shapes/StrandShape
 *
 * Custom tldraw shape for knowledge strand cards on infinite canvas.
 * Features:
 * - Title and summary display
 * - Thumbnail preview
 * - Tag pills
 * - Difficulty badge
 * - Weave color coding
 * - Collapsed/expanded states
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
  type StrandShape,
  type StrandShapeProps,
  DEFAULT_SHAPE_PROPS,
  SHAPE_SIZE_CONSTRAINTS,
  clampShapeDimensions,
} from '../types'
import { StrandComponent } from './StrandComponent'

/**
 * Strand shape utility class for knowledge unit cards
 */
export class StrandShapeUtil extends BaseBoxShapeUtil<StrandShape> {
  static override type = 'strand' as const

  // Shape behavior flags
  override canEdit = () => false
  override canResize = () => true

  /**
   * Default properties for new strand shapes
   */
  override getDefaultProps(): StrandShapeProps {
    return { ...DEFAULT_SHAPE_PROPS.strand }
  }

  /**
   * Define shape geometry for hit-testing and bounds
   */
  override getGeometry(shape: StrandShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  /**
   * Render the shape component
   */
  override component(shape: StrandShape) {
    return <StrandComponent shape={shape} util={this} />
  }

  /**
   * Render selection indicator
   */
  override indicator(shape: StrandShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx="12" />
  }

  /**
   * Define connection handles for linking to other shapes
   */
  override getHandles(shape: StrandShape): TLHandle[] {
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
  override onResize = (shape: StrandShape, info: TLResizeInfo<StrandShape>) => {
    const newW = info.initialShape.props.w * info.scaleX
    const newH = info.initialShape.props.h * info.scaleY
    const { w, h } = clampShapeDimensions('strand', newW, newH)

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
  override onDoubleClick = (shape: StrandShape) => {
    // Toggle collapsed state
    return {
      id: shape.id,
      type: 'strand' as const,
      props: {
        collapsed: !shape.props.collapsed,
      },
    }
  }

  /**
   * Export shape as SVG
   */
  override toSvg(shape: StrandShape): SVGElement {
    const { w, h, title, summary, tags, thumbnailPath } = shape.props

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

    // Background with gradient
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient')
    gradient.setAttribute('id', `strand-bg-${shape.id}`)
    gradient.setAttribute('x1', '0%')
    gradient.setAttribute('y1', '0%')
    gradient.setAttribute('x2', '0%')
    gradient.setAttribute('y2', '100%')

    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
    stop1.setAttribute('offset', '0%')
    stop1.setAttribute('stop-color', '#ecfdf5')

    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
    stop2.setAttribute('offset', '100%')
    stop2.setAttribute('stop-color', '#d1fae5')

    gradient.appendChild(stop1)
    gradient.appendChild(stop2)
    defs.appendChild(gradient)
    g.appendChild(defs)

    // Card background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', String(w))
    rect.setAttribute('height', String(h))
    rect.setAttribute('rx', '12')
    rect.setAttribute('fill', `url(#strand-bg-${shape.id})`)
    rect.setAttribute('stroke', '#a7f3d0')
    rect.setAttribute('stroke-width', '2')
    g.appendChild(rect)

    // Title
    const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    titleText.setAttribute('x', '16')
    titleText.setAttribute('y', thumbnailPath ? '80' : '28')
    titleText.setAttribute('font-size', '14')
    titleText.setAttribute('font-weight', 'bold')
    titleText.setAttribute('fill', '#065f46')
    titleText.textContent = title.length > 30 ? title.substring(0, 30) + '...' : title
    g.appendChild(titleText)

    // Summary preview
    if (summary) {
      const summaryText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      summaryText.setAttribute('x', '16')
      summaryText.setAttribute('y', thumbnailPath ? '100' : '48')
      summaryText.setAttribute('font-size', '11')
      summaryText.setAttribute('fill', '#047857')
      summaryText.textContent = summary.length > 50 ? summary.substring(0, 50) + '...' : summary
      g.appendChild(summaryText)
    }

    // Tags
    if (tags.length > 0) {
      const tagsText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      tagsText.setAttribute('x', '16')
      tagsText.setAttribute('y', String(h - 16))
      tagsText.setAttribute('font-size', '10')
      tagsText.setAttribute('fill', '#10b981')
      tagsText.textContent = tags.slice(0, 3).map(t => `#${t}`).join(' ')
      g.appendChild(tagsText)
    }

    return g
  }
}
