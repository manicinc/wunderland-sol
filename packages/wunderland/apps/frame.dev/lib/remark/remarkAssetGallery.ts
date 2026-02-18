/**
 * Remark plugin to transform consecutive images into Art Deco galleries
 * @module remark/remarkAssetGallery
 */

import { visit } from 'unist-util-visit'
import type { Root, Image, Paragraph, Parent, Link } from 'mdast'

/**
 * Configuration for gallery generation
 */
interface GalleryOptions {
  /** Minimum images to trigger gallery mode */
  minImages?: number
  /** Gallery layout style */
  layout?: 'grid' | 'masonry' | 'carousel' | 'wall'
  /** Enable lightbox on click */
  lightbox?: boolean
}

/**
 * Default gallery options
 */
const DEFAULT_OPTIONS: GalleryOptions = {
  minImages: 2,
  layout: 'wall',
  lightbox: true,
}

/**
 * Check if node is an image or link containing image
 */
function isImageNode(node: any): node is Image | Link {
  if (node.type === 'image') return true
  if (node.type === 'link' && node.children?.length === 1) {
    return node.children[0].type === 'image'
  }
  return false
}

/**
 * Extract image data from node
 */
function getImageData(node: Image | Link): { url: string; alt: string } {
  if (node.type === 'image') {
    return { url: node.url, alt: node.alt || '' }
  }
  // Link containing image
  const img = node.children[0] as Image
  return { url: img.url, alt: img.alt || '' }
}

/**
 * Transform consecutive images into Art Deco gallery
 *
 * @remarks
 * Detects runs of 2+ images and wraps them in a gallery container.
 * Supports multiple layout styles with golden ratio proportions.
 *
 * @example
 * ```markdown
 * ![Art](./photo1.jpg)
 * ![Deco](./photo2.jpg)
 * ```
 *
 * Becomes a beautiful gallery wall with:
 * - Staggered layout
 * - Golden frames
 * - Hover animations
 * - Lightbox support
 */
export function remarkAssetGallery(options: GalleryOptions = {}) {
  const config: Required<GalleryOptions> = { ...DEFAULT_OPTIONS, ...options } as Required<GalleryOptions>

  return function transformer(tree: Root) {
    visit(tree, 'paragraph', (node: Paragraph, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || index === undefined) return

      // Check if paragraph contains only images/linked images (whitespace text is OK)
      // First, filter out whitespace-only text nodes to get meaningful content
      const meaningfulChildren = node.children.filter(child =>
        !(child.type === 'text' && (child as any).value.trim() === '')
      )

      // Check if ALL meaningful children are images
      const actualImages = meaningfulChildren.filter(isImageNode)

      if (actualImages.length < config.minImages) return
      if (actualImages.length !== meaningfulChildren.length) return // Has non-image content

      // Extract image data
      const images = actualImages.map(getImageData)

      // Create gallery HTML
      const galleryHtml = createGalleryHtml(images, config)

      // Replace paragraph with HTML node
      const galleryNode = {
        type: 'html',
        value: galleryHtml,
      } as any

      parent.children[index] = galleryNode
    })

    // Also check for consecutive image paragraphs in the root
    // Process root children to find runs of single-image paragraphs
    function processParent(parent: Parent) {
      const children = parent.children
      let i = 0

      while (i < children.length) {
        // Find runs of paragraphs containing single images
        const imageRun: Array<{ url: string; alt: string; index: number }> = []
        let j = i

        while (j < children.length) {
          const child = children[j] as any
          if (child.type === 'paragraph' && child.children) {
            // Filter out whitespace-only text nodes
            const meaningfulChildren = child.children.filter((c: any) =>
              !(c.type === 'text' && c.value.trim() === '')
            )
            // Check if paragraph contains only a single image
            if (meaningfulChildren.length === 1 && isImageNode(meaningfulChildren[0])) {
              const imgData = getImageData(meaningfulChildren[0])
              imageRun.push({ ...imgData, index: j })
              j++
            } else {
              break
            }
          } else {
            break
          }
        }

        if (imageRun.length >= config.minImages) {
          // Create gallery for this run
          const galleryHtml = createGalleryHtml(
            imageRun.map(({ url, alt }) => ({ url, alt })),
            config
          )

          const galleryNode = {
            type: 'html',
            value: galleryHtml,
          } as any

          // Replace the run with gallery
          parent.children.splice(i, imageRun.length, galleryNode)
          i++ // Move past the gallery
        } else {
          i = j > i ? j : i + 1
        }
      }
    }

    // Process the root node and any blockquote/list containers
    processParent(tree)

    // Also process blockquotes and other containers that might have image runs
    visit(tree, 'blockquote', (node: any) => processParent(node))
    visit(tree, 'listItem', (node: any) => processParent(node))
  }
}

/**
 * Generate unique gallery ID
 */
let galleryIdCounter = 0
function generateGalleryId(): string {
  return `gallery-${Date.now()}-${++galleryIdCounter}`
}

/**
 * Create Art Deco gallery HTML
 */
function createGalleryHtml(images: Array<{ url: string; alt: string }>, config: GalleryOptions): string {
  const galleryId = generateGalleryId()
  const layoutClass = `gallery-${config.layout}`
  const lightboxAttr = config.lightbox ? 'data-lightbox="true"' : ''

  const imageElements = images.map((img, idx) => {
    // Golden ratio based sizing
    const sizeClass = getGoldenSizeClass(idx, images.length)
    
    return `
      <figure 
        class="gallery-item ${sizeClass} cursor-pointer" 
        ${lightboxAttr}
        data-lightbox-index="${idx}"
        data-lightbox-url="${img.url}"
        data-lightbox-alt="${img.alt}"
        onclick="window.openLightbox && window.openLightbox(${idx}, this)"
      >
        <div class="gallery-frame">
          <img src="${img.url}" alt="${img.alt}" loading="lazy" />
          <div class="gallery-ornament top-left"></div>
          <div class="gallery-ornament top-right"></div>
          <div class="gallery-ornament bottom-left"></div>
          <div class="gallery-ornament bottom-right"></div>
        </div>
        ${img.alt ? `<figcaption class="gallery-caption">${img.alt}</figcaption>` : ''}
      </figure>
    `
  }).join('\n')

  // Create dot indicators for carousel navigation
  const dotIndicators = images.map((_, idx) => `
    <button
      class="gallery-dot ${idx === 0 ? 'active' : ''}"
      data-index="${idx}"
      aria-label="Go to image ${idx + 1}"
    ></button>
  `).join('')

  return `
    <div class="codex-gallery ${layoutClass}" id="${galleryId}" data-image-count="${images.length}">
      <div class="gallery-container">
        ${imageElements}
      </div>
      ${images.length > 1 ? `
        <div class="gallery-indicators">
          ${dotIndicators}
        </div>
        <div class="gallery-counter">${images.length} images</div>
      ` : ''}
      <style>
        .codex-gallery {
          margin: 2rem 0;
          position: relative;
        }

        .gallery-container {
          display: grid;
          gap: 1.618rem; /* Golden ratio */
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        }

        /* Carousel layout - horizontal scrolling with snap */
        .codex-gallery.gallery-carousel .gallery-container {
          display: flex;
          gap: 1rem;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding: 0.5rem;
        }

        .codex-gallery.gallery-carousel .gallery-container::-webkit-scrollbar {
          display: none;
        }

        .codex-gallery.gallery-carousel .gallery-item {
          flex: 0 0 auto;
          width: 80%;
          max-width: 400px;
          height: 300px;
          scroll-snap-align: center;
        }

        .codex-gallery.gallery-carousel .gallery-item.size-golden-large,
        .codex-gallery.gallery-carousel .gallery-item.size-golden-tall,
        .codex-gallery.gallery-carousel .gallery-item.size-golden-wide {
          grid-column: unset;
          grid-row: unset;
        }

        @media (max-width: 768px) {
          .codex-gallery.gallery-carousel .gallery-item {
            width: 90%;
            height: 250px;
          }
        }

        /* 2-image galleries: side by side */
        .codex-gallery[data-image-count="2"] .gallery-container {
          grid-template-columns: repeat(2, 1fr);
          grid-auto-rows: 250px;
        }

        /* 3-image galleries: 1 large + 2 small */
        .codex-gallery[data-image-count="3"] .gallery-container {
          grid-template-columns: repeat(2, 1fr);
          grid-auto-rows: 200px;
        }

        .codex-gallery.gallery-wall .gallery-container {
          grid-auto-rows: 200px;
          grid-auto-flow: dense;
        }
        
        .codex-gallery.gallery-masonry .gallery-container {
          columns: 3 200px;
          column-gap: 1.618rem;
        }
        
        .gallery-item {
          margin: 0;
          position: relative;
          overflow: hidden;
          transition: transform 0.3s ease;
        }
        
        .gallery-item:hover {
          transform: scale(1.05);
          z-index: 10;
        }
        
        .gallery-item.size-golden-large {
          grid-column: span 2;
          grid-row: span 2;
        }
        
        .gallery-item.size-golden-tall {
          grid-row: span 2;
        }
        
        .gallery-item.size-golden-wide {
          grid-column: span 2;
        }
        
        .gallery-frame {
          position: relative;
          width: 100%;
          height: 100%;
          padding: 0.618rem;
          background: linear-gradient(135deg, #D4AF37 0%, #B8860B 50%, #996515 100%);
          border-radius: 0.382rem;
          box-shadow: 
            0 4px 8px rgba(0, 0, 0, 0.2),
            inset 0 2px 4px rgba(255, 215, 0, 0.5);
        }
        
        .gallery-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 0.236rem;
        }
        
        .gallery-ornament {
          position: absolute;
          width: 1rem;
          height: 1rem;
          opacity: 0.6;
        }
        
        .gallery-ornament::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          background: currentColor;
          clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
        }
        
        .gallery-ornament.top-left { top: 0.236rem; left: 0.236rem; }
        .gallery-ornament.top-right { top: 0.236rem; right: 0.236rem; }
        .gallery-ornament.bottom-left { bottom: 0.236rem; left: 0.236rem; }
        .gallery-ornament.bottom-right { bottom: 0.236rem; right: 0.236rem; }
        
        .gallery-caption {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 0.618rem;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
          color: white;
          font-size: 0.875rem;
          text-align: center;
          opacity: 1;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }

        .gallery-item:hover .gallery-caption {
          opacity: 1;
          transform: translateY(-2px);
        }

        /* Always show captions on touch devices */
        @media (hover: none) {
          .gallery-caption {
            opacity: 1;
          }
        }
        
        /* Sepia theme adjustments */
        .sepia-light .gallery-frame {
          background: linear-gradient(135deg, #8B7355 0%, #6B5D4F 50%, #4B3F2F 100%);
        }
        
        .sepia-dark .gallery-frame {
          background: linear-gradient(135deg, #D4A574 0%, #B8956A 50%, #9C7650 100%);
        }
        
        /* Dark theme adjustments */
        .dark .gallery-frame {
          box-shadow: 
            0 4px 8px rgba(0, 0, 0, 0.4),
            inset 0 2px 4px rgba(255, 215, 0, 0.3);
        }
        
        /* Responsive */
        @media (max-width: 768px) {
          .gallery-container {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          }

          .codex-gallery[data-image-count="2"] .gallery-container {
            grid-template-columns: repeat(2, 1fr);
            grid-auto-rows: 180px;
          }

          .codex-gallery.gallery-masonry .gallery-container {
            columns: 2 150px;
          }
        }

        @media (max-width: 480px) {
          .codex-gallery[data-image-count="2"] .gallery-container {
            grid-template-columns: 1fr;
            grid-auto-rows: 200px;
          }

          .gallery-item.size-golden-large,
          .gallery-item.size-golden-tall,
          .gallery-item.size-golden-wide {
            grid-column: span 1;
            grid-row: span 1;
          }

          /* Auto-carousel on mobile for better touch UX */
          .codex-gallery.gallery-wall .gallery-container {
            display: flex;
            gap: 0.75rem;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            padding: 0.5rem;
          }

          .codex-gallery.gallery-wall .gallery-container::-webkit-scrollbar {
            display: none;
          }

          .codex-gallery.gallery-wall .gallery-item {
            flex: 0 0 auto;
            width: 85%;
            height: 220px;
            scroll-snap-align: center;
          }

          /* Show indicators on mobile */
          .codex-gallery .gallery-indicators {
            display: flex;
          }
        }

        /* Gallery indicators (dots) */
        .gallery-indicators {
          display: none;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .gallery-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: none;
          background: rgba(0, 0, 0, 0.2);
          cursor: pointer;
          padding: 0;
          transition: all 0.2s ease;
        }

        .gallery-dot:hover {
          background: rgba(0, 0, 0, 0.4);
        }

        .gallery-dot.active {
          width: 24px;
          border-radius: 4px;
          background: #D4AF37;
        }

        .dark .gallery-dot {
          background: rgba(255, 255, 255, 0.2);
        }

        .dark .gallery-dot:hover {
          background: rgba(255, 255, 255, 0.4);
        }

        .dark .gallery-dot.active {
          background: #D4AF37;
        }

        /* Gallery counter */
        .gallery-counter {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          font-size: 0.75rem;
          font-weight: 500;
          pointer-events: none;
        }

        /* Show indicators for carousel layout */
        .codex-gallery.gallery-carousel .gallery-indicators {
          display: flex;
        }
      </style>
    </div>
  `
}

/**
 * Calculate golden ratio based size classes
 */
function getGoldenSizeClass(index: number, total: number): string {
  // Use golden ratio (φ ≈ 1.618) for distribution
  const phi = 1.618033988749895

  // For 2 images, keep them equal size side by side
  if (total === 2) {
    return 'size-golden-normal'
  }

  // For 3 images, make first one larger
  if (total === 3 && index === 0) {
    return 'size-golden-large'
  }

  // Make first image large if we have 4+
  if (index === 0 && total >= 4) {
    return 'size-golden-large'
  }

  // Distribute others based on golden sequence
  const goldenIndex = (index * phi) % 3

  if (goldenIndex < 1) {
    return 'size-golden-tall'
  } else if (goldenIndex < 2) {
    return 'size-golden-wide'
  }

  return 'size-golden-normal'
}

// Export types
export type { GalleryOptions }
