/**
 * Link Preview Shape Util
 * @module codex/ui/canvas/shapes/LinkPreviewShape
 *
 * Custom tldraw shape for URL embeds with rich previews.
 * Features:
 * - Open Graph metadata display
 * - Thumbnail image preview
 * - Site favicon
 * - Title and description
 * - Click to open URL
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
  type LinkPreviewShape,
  type LinkPreviewShapeProps,
  DEFAULT_SHAPE_PROPS,
  SHAPE_SIZE_CONSTRAINTS,
  clampShapeDimensions,
} from '../types'
import { LinkPreviewComponent } from './LinkPreviewComponent'

/**
 * Link preview shape utility class
 */
export class LinkPreviewShapeUtil extends BaseBoxShapeUtil<LinkPreviewShape> {
  static override type = 'linkpreview' as const

  // Shape behavior flags
  override canEdit = () => false
  override canResize = () => true

  /**
   * Default properties for new link preview shapes
   */
  override getDefaultProps(): LinkPreviewShapeProps {
    return { ...DEFAULT_SHAPE_PROPS.linkpreview }
  }

  /**
   * Define shape geometry for hit-testing and bounds
   */
  override getGeometry(shape: LinkPreviewShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  /**
   * Render the shape component
   */
  override component(shape: LinkPreviewShape) {
    return <LinkPreviewComponent shape={shape} util={this} />
  }

  /**
   * Render selection indicator
   */
  override indicator(shape: LinkPreviewShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx="12" />
  }

  /**
   * Handle resize with constraints
   */
  override onResize = (shape: LinkPreviewShape, info: TLResizeInfo<LinkPreviewShape>) => {
    const newW = info.initialShape.props.w * info.scaleX
    const newH = info.initialShape.props.h * info.scaleY
    const { w, h } = clampShapeDimensions('linkpreview', newW, newH)

    return {
      props: {
        w,
        h,
      },
    }
  }

  /**
   * Handle double-click to open URL
   */
  override onDoubleClick = (shape: LinkPreviewShape) => {
    if (shape.props.url) {
      window.open(shape.props.url, '_blank', 'noopener,noreferrer')
    }
    return
  }

  /**
   * Export shape as SVG
   */
  override toSvg(shape: LinkPreviewShape): SVGElement {
    const { w, h, title, description, siteName, thumbnailUrl } = shape.props

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

    // Card background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', String(w))
    rect.setAttribute('height', String(h))
    rect.setAttribute('rx', '12')
    rect.setAttribute('fill', '#ffffff')
    rect.setAttribute('stroke', '#e5e7eb')
    rect.setAttribute('stroke-width', '1')
    g.appendChild(rect)

    // Site name
    if (siteName) {
      const siteText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      siteText.setAttribute('x', '12')
      siteText.setAttribute('y', thumbnailUrl ? '85' : '20')
      siteText.setAttribute('font-size', '10')
      siteText.setAttribute('fill', '#6b7280')
      siteText.textContent = siteName.toUpperCase()
      g.appendChild(siteText)
    }

    // Title
    const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    titleText.setAttribute('x', '12')
    titleText.setAttribute('y', thumbnailUrl ? '105' : '40')
    titleText.setAttribute('font-size', '14')
    titleText.setAttribute('font-weight', 'bold')
    titleText.setAttribute('fill', '#1f2937')
    titleText.textContent = title.length > 35 ? title.substring(0, 35) + '...' : title
    g.appendChild(titleText)

    // Description
    if (description) {
      const descText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      descText.setAttribute('x', '12')
      descText.setAttribute('y', thumbnailUrl ? '125' : '60')
      descText.setAttribute('font-size', '11')
      descText.setAttribute('fill', '#6b7280')
      descText.textContent = description.length > 50 ? description.substring(0, 50) + '...' : description
      g.appendChild(descText)
    }

    return g
  }
}

