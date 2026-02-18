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
  minImages: 3,
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
 * Detects runs of 3+ images and wraps them in a gallery container.
 * Supports multiple layout styles with golden ratio proportions.
 * 
 * @example
 * ```markdown
 * ![Art](./photo1.jpg)
 * ![Deco](./photo2.jpg)
 * ![Style](./photo3.jpg)
 * ```
 * 
 * Becomes a beautiful gallery wall with:
 * - Staggered layout
 * - Golden frames
 * - Hover animations
 * - Lightbox support
 */
export function remarkAssetGallery(options: GalleryOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }

  return function transformer(tree: Root) {
    visit(tree, 'paragraph', (node: Paragraph, index: number | null, parent: Parent | null) => {
      if (!parent || index === null) return

      // Check if paragraph contains only images/linked images
      const imageNodes = node.children.filter(child => 
        isImageNode(child) || (child.type === 'text' && child.value.trim() === '')
      )
      
      const actualImages = imageNodes.filter(isImageNode)
      
      if (actualImages.length < config.minImages) return
      if (actualImages.length !== imageNodes.length) return // Mixed content

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

    // Also check for consecutive image paragraphs
    visit(tree, 'parent', (parent: Parent) => {
      const children = parent.children
      let i = 0

      while (i < children.length) {
        // Find runs of paragraphs containing single images
        const imageRun: Array<{ url: string; alt: string; index: number }> = []
        let j = i

        while (j < children.length) {
          const child = children[j]
          if (
            child.type === 'paragraph' &&
            child.children.length === 1 &&
            isImageNode(child.children[0])
          ) {
            const imgData = getImageData(child.children[0])
            imageRun.push({ ...imgData, index: j })
            j++
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
    })
  }
}

/**
 * Create Art Deco gallery HTML
 */
function createGalleryHtml(images: Array<{ url: string; alt: string }>, config: GalleryOptions): string {
  const layoutClass = `gallery-${config.layout}`
  const lightboxAttr = config.lightbox ? 'data-lightbox="true"' : ''

  const imageElements = images.map((img, idx) => {
    // Golden ratio based sizing
    const sizeClass = getGoldenSizeClass(idx, images.length)
    
    return `
      <figure class="gallery-item ${sizeClass}" ${lightboxAttr}>
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

  return `
    <div class="codex-gallery ${layoutClass}" data-image-count="${images.length}">
      <div class="gallery-container">
        ${imageElements}
      </div>
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
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .gallery-item:hover .gallery-caption {
          opacity: 1;
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
          
          .codex-gallery.gallery-masonry .gallery-container {
            columns: 2 150px;
          }
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
