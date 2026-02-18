/**
 * Mindmap Export Utilities
 * @module lib/mindmap/exportUtils
 *
 * Functions for exporting mindmaps in various formats
 */

import type { HierarchyData, GraphData, ConceptData } from '@/hooks/useMindmapGeneration'

/* ═══════════════════════════════════════════════════════════════════════════
   SVG EXPORT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Export SVG from the current mindmap viewer
 * Finds the SVG element in the viewer and downloads it
 */
export function exportSVG(mindmapType: string): void {
  // Find the SVG element based on mindmap type
  const svg = document.querySelector('svg')

  if (!svg) {
    console.error('No SVG element found to export')
    return
  }

  // Clone the SVG to avoid modifying the original
  const clone = svg.cloneNode(true) as SVGSVGElement

  // Get SVG dimensions
  const bbox = svg.getBoundingClientRect()
  clone.setAttribute('width', String(bbox.width))
  clone.setAttribute('height', String(bbox.height))

  // Serialize to string
  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(clone)

  // Create blob and download
  const blob = new Blob([svgString], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `mindmap-${mindmapType}-${Date.now()}.svg`
  link.click()

  // Cleanup
  URL.revokeObjectURL(url)
}

/* ═══════════════════════════════════════════════════════════════════════════
   PNG EXPORT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Export PNG from the current mindmap viewer
 * Converts SVG to canvas and downloads as PNG
 */
export function exportPNG(mindmapType: string): void {
  const svg = document.querySelector('svg')

  if (!svg) {
    console.error('No SVG element found to export')
    return
  }

  // Get SVG dimensions
  const bbox = svg.getBoundingClientRect()
  const width = bbox.width
  const height = bbox.height

  // Create canvas
  const canvas = document.createElement('canvas')
  canvas.width = width * 2 // 2x for better quality
  canvas.height = height * 2
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    console.error('Failed to get canvas context')
    return
  }

  // Scale for better quality
  ctx.scale(2, 2)

  // Serialize SVG
  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(svg)

  // Create image from SVG
  const img = new Image()
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  img.onload = () => {
    // Draw to canvas
    ctx.drawImage(img, 0, 0, width, height)

    // Convert to PNG and download
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Failed to create PNG blob')
        return
      }

      const pngUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = pngUrl
      link.download = `mindmap-${mindmapType}-${Date.now()}.png`
      link.click()

      // Cleanup
      URL.revokeObjectURL(pngUrl)
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  img.onerror = () => {
    console.error('Failed to load SVG image')
    URL.revokeObjectURL(url)
  }

  img.src = url
}

/* ═══════════════════════════════════════════════════════════════════════════
   JSON EXPORT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Export JSON data from the current mindmap
 */
export function exportJSON(
  mindmapType: 'hierarchy' | 'graph' | 'concept',
  data: HierarchyData | GraphData | ConceptData | null
): void {
  if (!data) {
    console.error('No mindmap data to export')
    return
  }

  // Create formatted JSON
  const jsonString = JSON.stringify(data, null, 2)

  // Create blob and download
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `mindmap-${mindmapType}-data-${Date.now()}.json`
  link.click()

  // Cleanup
  URL.revokeObjectURL(url)
}

/* ═══════════════════════════════════════════════════════════════════════════
   MARKDOWN EXPORT (for hierarchy mindmaps)
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Export hierarchy mindmap as markdown outline
 */
export function exportMarkdown(hierarchyData: HierarchyData): void {
  if (!hierarchyData) {
    console.error('No hierarchy data to export')
    return
  }

  const blob = new Blob([hierarchyData.markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `mindmap-hierarchy-${Date.now()}.md`
  link.click()

  // Cleanup
  URL.revokeObjectURL(url)
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════════════════ */

export default {
  exportSVG,
  exportPNG,
  exportJSON,
  exportMarkdown,
}
