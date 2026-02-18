/**
 * Supernote Shape Util
 * @module codex/ui/canvas/shapes/SupernoteShape
 *
 * Custom tldraw shape for compact notecard strands requiring supertags.
 * Supernotes are visually distinct from regular strands:
 * - Index card proportions (3x5 default)
 * - Supertag badge visible at top
 * - Inline field values from supertag schema
 * - Paper/notecard aesthetic with corner fold
 * - Different color scheme (amber/paper tones)
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
  type SupernoteShape,
  type SupernoteShapeProps,
  DEFAULT_SHAPE_PROPS,
  SHAPE_SIZE_CONSTRAINTS,
  clampShapeDimensions,
  SUPERNOTE_CARD_SIZES,
} from '../types'
import { SupernoteComponent } from './SupernoteComponent'

/**
 * Supernote shape utility class for compact notecard strands
 */
export class SupernoteShapeUtil extends BaseBoxShapeUtil<SupernoteShape> {
  static override type = 'supernote' as const

  // Shape behavior flags
  override canEdit = () => true // Allow inline editing
  override canResize = () => true

  /**
   * Default properties for new supernote shapes
   */
  override getDefaultProps(): SupernoteShapeProps {
    return { ...DEFAULT_SHAPE_PROPS.supernote }
  }

  /**
   * Define shape geometry for hit-testing and bounds
   */
  override getGeometry(shape: SupernoteShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  /**
   * Render the shape component
   */
  override component(shape: SupernoteShape) {
    return <SupernoteComponent shape={shape} util={this} />
  }

  /**
   * Render selection indicator with rounded corners
   */
  override indicator(shape: SupernoteShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx="8" />
  }

  /**
   * Define connection handles for linking to other shapes
   */
  override getHandles(shape: SupernoteShape): TLHandle[] {
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
   * Handle resize with card size constraints
   */
  override onResize = (shape: SupernoteShape, info: TLResizeInfo<SupernoteShape>) => {
    const newW = info.initialShape.props.w * info.scaleX
    const newH = info.initialShape.props.h * info.scaleY
    const { w, h } = clampShapeDimensions('supernote', newW, newH)

    return {
      props: {
        w,
        h,
        // When user manually resizes, set cardSize to 'custom'
        cardSize: 'custom' as const,
      },
    }
  }

  /**
   * Handle double-click to toggle expanded state
   */
  override onDoubleClick = (shape: SupernoteShape) => {
    return {
      id: shape.id,
      type: 'supernote' as const,
      props: {
        isExpanded: !shape.props.isExpanded,
      },
    }
  }

  /**
   * Export shape as SVG with notecard styling
   */
  override toSvg(shape: SupernoteShape): SVGElement {
    const {
      w,
      h,
      title,
      contentPreview,
      tags,
      primarySupertag,
      supertagColor,
      style,
    } = shape.props

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

    // Determine background color based on style
    let bgColor = '#fffbeb' // Paper default
    let borderColor = '#fde68a'
    let textColor = '#78350f'

    if (style === 'colored') {
      bgColor = supertagColor + '20' // 20% opacity of supertag color
      borderColor = supertagColor
    } else if (style === 'minimal') {
      bgColor = '#ffffff'
      borderColor = '#e5e7eb'
      textColor = '#1f2937'
    } else if (style === 'terminal') {
      bgColor = '#1e293b'
      borderColor = '#334155'
      textColor = '#22c55e'
    }

    // Card background with shadow
    const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    shadow.setAttribute('x', '3')
    shadow.setAttribute('y', '3')
    shadow.setAttribute('width', String(w))
    shadow.setAttribute('height', String(h))
    shadow.setAttribute('rx', '8')
    shadow.setAttribute('fill', 'rgba(0,0,0,0.1)')
    g.appendChild(shadow)

    // Main card background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', String(w))
    rect.setAttribute('height', String(h))
    rect.setAttribute('rx', '8')
    rect.setAttribute('fill', bgColor)
    rect.setAttribute('stroke', borderColor)
    rect.setAttribute('stroke-width', '2')
    g.appendChild(rect)

    // Corner fold (paper effect)
    if (style === 'paper') {
      const fold = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
      fold.setAttribute('points', `${w - 16},0 ${w},16 ${w},0`)
      fold.setAttribute('fill', 'rgba(0,0,0,0.08)')
      g.appendChild(fold)
    }

    // Supertag badge
    const badgeBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    badgeBg.setAttribute('x', '8')
    badgeBg.setAttribute('y', '8')
    badgeBg.setAttribute('width', String(Math.min(primarySupertag.length * 8 + 16, w - 16)))
    badgeBg.setAttribute('height', '20')
    badgeBg.setAttribute('rx', '4')
    badgeBg.setAttribute('fill', supertagColor)
    g.appendChild(badgeBg)

    const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    badgeText.setAttribute('x', '16')
    badgeText.setAttribute('y', '22')
    badgeText.setAttribute('font-size', '11')
    badgeText.setAttribute('font-weight', '600')
    badgeText.setAttribute('fill', '#ffffff')
    badgeText.textContent = `#${primarySupertag}`
    g.appendChild(badgeText)

    // Title
    const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    titleText.setAttribute('x', '12')
    titleText.setAttribute('y', '48')
    titleText.setAttribute('font-size', '14')
    titleText.setAttribute('font-weight', 'bold')
    titleText.setAttribute('fill', textColor)
    titleText.textContent = title.length > 35 ? title.substring(0, 35) + '...' : title
    g.appendChild(titleText)

    // Content preview
    if (contentPreview) {
      const previewText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      previewText.setAttribute('x', '12')
      previewText.setAttribute('y', '66')
      previewText.setAttribute('font-size', '11')
      previewText.setAttribute('fill', textColor)
      previewText.setAttribute('opacity', '0.8')
      previewText.textContent =
        contentPreview.length > 50 ? contentPreview.substring(0, 50) + '...' : contentPreview
      g.appendChild(previewText)
    }

    // Tags at bottom
    if (tags.length > 0) {
      const tagsText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      tagsText.setAttribute('x', '12')
      tagsText.setAttribute('y', String(h - 12))
      tagsText.setAttribute('font-size', '10')
      tagsText.setAttribute('fill', supertagColor)
      tagsText.textContent = tags
        .slice(0, 3)
        .map((t) => `#${t}`)
        .join(' ')
      g.appendChild(tagsText)
    }

    // Supernote indicator (small notecard icon)
    const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    indicator.setAttribute('x', String(w - 24))
    indicator.setAttribute('y', String(h - 24))
    indicator.setAttribute('width', '16')
    indicator.setAttribute('height', '16')
    indicator.setAttribute('rx', '2')
    indicator.setAttribute('fill', supertagColor)
    indicator.setAttribute('opacity', '0.3')
    g.appendChild(indicator)

    return g
  }
}

