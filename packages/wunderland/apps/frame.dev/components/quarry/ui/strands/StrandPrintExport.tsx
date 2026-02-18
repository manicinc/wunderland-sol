/**
 * Strand Print Export - Full Content Card with Multiple Size Presets
 * @module codex/ui/StrandPrintExport
 * 
 * @description
 * Enhanced export component that renders strand content in multiple
 * paper sizes with smart layout for images and content blocks.
 * 
 * Features:
 * - Full content with rendered markdown and images
 * - Multiple size presets: 3x5 index card, A4, A5, Letter
 * - Smart layout based on content type and image count
 * - Both interactive preview and printable export
 * - Option for metadata-only or full content mode
 * 
 * @see PaperLabel for ASCII/metadata-only export
 */

'use client'

import React, { useState, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Printer,
  Download,
  FileImage,
  FileText,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  ChevronDown,
  X,
  Sparkles,
  Tag,
  Layers,
  Clock,
  BookOpen,
  Grid3X3,
  LayoutGrid,
  Square,
  RectangleVertical,
  RectangleHorizontal,
  Image as ImageIcon,
  Type,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
} from 'lucide-react'
import type { StrandMetadata, GitHubFile } from '../../types'
import { parseTags as parseTagsUtil } from '@/lib/utils'
import '../StrandPrintExport.css'

// Dynamic imports for export libraries
const loadHtml2Canvas = () => import('html2canvas').then(m => m.default)
const loadJsPDF = () => import('jspdf').then(m => m.jsPDF)

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Paper size preset configuration
 */
interface PaperSize {
  /** Preset identifier */
  id: string
  /** Display name */
  name: string
  /** Short label */
  shortLabel: string
  /** Width in inches */
  widthIn: number
  /** Height in inches */
  heightIn: number
  /** Orientation */
  orientation: 'portrait' | 'landscape'
  /** DPI for export */
  dpi: number
  /** CSS aspect ratio */
  aspectRatio: string
  /** Icon */
  icon: React.ComponentType<{ className?: string }>
}

/**
 * Content mode
 */
type ContentMode = 'metadata' | 'full' | 'compact' | 'text-only' | 'images-only'

/**
 * Layout mode for full content
 */
type LayoutMode = 'auto' | 'single-column' | 'two-column' | 'grid'

/**
 * Export wizard step
 */
type WizardStep = 'content' | 'size' | 'layout' | 'export'

/**
 * Props for StrandPrintExport
 */
interface StrandPrintExportProps {
  /** Strand metadata */
  metadata: StrandMetadata
  /** Current file info */
  currentFile: GitHubFile | null
  /** File path */
  currentPath: string
  /** Full markdown content */
  content: string
  /** Callback when content is copied */
  onCopy?: () => void
  /** Whether content was recently copied */
  copied?: boolean
  /** Theme */
  theme?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Available paper size presets
 */
const PAPER_SIZES: PaperSize[] = [
  {
    id: '3x5',
    name: '3×5 Index Card',
    shortLabel: '3×5',
    widthIn: 5,
    heightIn: 3,
    orientation: 'landscape',
    dpi: 300,
    aspectRatio: '5/3',
    icon: RectangleHorizontal,
  },
  {
    id: '4x6',
    name: '4×6 Index Card',
    shortLabel: '4×6',
    widthIn: 6,
    heightIn: 4,
    orientation: 'landscape',
    dpi: 300,
    aspectRatio: '3/2',
    icon: RectangleHorizontal,
  },
  {
    id: 'a5-portrait',
    name: 'A5 Portrait',
    shortLabel: 'A5',
    widthIn: 5.83,
    heightIn: 8.27,
    orientation: 'portrait',
    dpi: 300,
    aspectRatio: '148/210',
    icon: RectangleVertical,
  },
  {
    id: 'a5-landscape',
    name: 'A5 Landscape',
    shortLabel: 'A5↔',
    widthIn: 8.27,
    heightIn: 5.83,
    orientation: 'landscape',
    dpi: 300,
    aspectRatio: '210/148',
    icon: RectangleHorizontal,
  },
  {
    id: 'a4-portrait',
    name: 'A4 Portrait',
    shortLabel: 'A4',
    widthIn: 8.27,
    heightIn: 11.69,
    orientation: 'portrait',
    dpi: 300,
    aspectRatio: '210/297',
    icon: RectangleVertical,
  },
  {
    id: 'a4-landscape',
    name: 'A4 Landscape',
    shortLabel: 'A4↔',
    widthIn: 11.69,
    heightIn: 8.27,
    orientation: 'landscape',
    dpi: 300,
    aspectRatio: '297/210',
    icon: RectangleHorizontal,
  },
  {
    id: 'letter-portrait',
    name: 'Letter Portrait',
    shortLabel: 'Letter',
    widthIn: 8.5,
    heightIn: 11,
    orientation: 'portrait',
    dpi: 300,
    aspectRatio: '8.5/11',
    icon: RectangleVertical,
  },
  {
    id: 'letter-landscape',
    name: 'Letter Landscape',
    shortLabel: 'Letter↔',
    widthIn: 11,
    heightIn: 8.5,
    orientation: 'landscape',
    dpi: 300,
    aspectRatio: '11/8.5',
    icon: RectangleHorizontal,
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Extract images from markdown content
 */
function extractImages(content: string): string[] {
  if (!content) return []
  const imageRegex = /!\[.*?\]\((.*?)\)/g
  const images: string[] = []
  let match
  while ((match = imageRegex.exec(content)) !== null) {
    images.push(match[1])
  }
  return images
}

/**
 * Parse tags from various formats (uses centralized utility with min length filter)
 */
function parseTags(tags: unknown): string[] {
  return parseTagsUtil(tags, { lowercase: false })
}

/**
 * Format file path as readable location
 */
function formatLocation(path: string): string {
  if (!path) return ''
  return path
    .replace(/^weaves\//, '')
    .replace(/\.md$/, '')
    .split('/')
    .filter(Boolean)
    .map(part => 
      part.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    )
    .join(' › ')
}

/**
 * Get difficulty color
 */
function getDifficultyColor(difficulty: string | undefined): string {
  if (!difficulty) return '#6B7280'
  const lower = difficulty.toLowerCase()
  if (lower.includes('beginner')) return '#10B981'
  if (lower.includes('intermediate')) return '#F59E0B'
  if (lower.includes('advanced')) return '#EF4444'
  if (lower.includes('expert')) return '#8B5CF6'
  return '#6B7280'
}

/**
 * Determine optimal layout based on content and paper size
 */
function determineLayout(
  content: string,
  paperSize: PaperSize,
  imageCount: number
): LayoutMode {
  const charCount = content.length
  const isLargeFormat = paperSize.widthIn >= 8 || paperSize.heightIn >= 8
  const isLandscape = paperSize.orientation === 'landscape'
  
  // For index cards, always use compact single column
  if (paperSize.id.includes('3x5') || paperSize.id.includes('4x6')) {
    return 'single-column'
  }
  
  // For larger formats with images
  if (imageCount > 0) {
    if (imageCount >= 4) return 'grid'
    if (isLandscape) return 'two-column'
    return 'single-column'
  }
  
  // For text-heavy content on large formats
  if (charCount > 2000 && isLargeFormat) {
    return isLandscape ? 'two-column' : 'single-column'
  }
  
  return 'auto'
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Metadata header block
 */
function MetadataHeader({
  metadata,
  currentPath,
  compact = false,
}: {
  metadata: StrandMetadata
  currentPath: string
  compact?: boolean
}) {
  const title = metadata.title || currentPath.split('/').pop()?.replace('.md', '') || 'Untitled'
  const tags = parseTags(metadata.tags)
  const difficulty = typeof metadata.difficulty === 'string' 
    ? metadata.difficulty 
    : (metadata.difficulty as { overall?: string })?.overall || ''
  const location = formatLocation(currentPath)
  
  if (compact) {
    return (
      <div className="border-b-2 border-zinc-300 pb-2 mb-3">
        <h1 className="font-bold text-lg leading-tight">{title}</h1>
        <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-2 flex-wrap">
          <span>{location}</span>
          {difficulty && (
            <span 
              className="px-1.5 py-0.5 rounded text-white font-medium"
              style={{ backgroundColor: getDifficultyColor(difficulty) }}
            >
              {difficulty}
            </span>
          )}
        </div>
      </div>
    )
  }
  
  return (
    <div className="border-b-2 border-zinc-300 pb-4 mb-4">
      <h1 className="font-bold text-2xl leading-tight mb-2">{title}</h1>
      
      {/* Location breadcrumb */}
      <div className="text-sm text-zinc-600 mb-3 flex items-center gap-1">
        <Layers className="w-4 h-4" />
        {location}
      </div>
      
      {/* Difficulty badge */}
      {difficulty && (
        <span 
          className="inline-block px-2 py-1 rounded text-white text-sm font-medium mr-2"
          style={{ backgroundColor: getDifficultyColor(difficulty) }}
        >
          {difficulty}
        </span>
      )}
      
      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.map(tag => (
            <span 
              key={tag}
              className="px-2 py-0.5 bg-zinc-200 text-zinc-700 text-xs rounded"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      
      {/* Summary */}
      {metadata.summary && (
        <p className="mt-3 text-sm text-zinc-600 italic border-l-2 border-zinc-300 pl-3">
          {metadata.summary}
        </p>
      )}
    </div>
  )
}

/**
 * Content renderer with markdown support
 */
function ContentRenderer({
  content,
  layoutMode,
  showImages,
}: {
  content: string
  layoutMode: LayoutMode
  showImages: boolean
}) {
  // Filter out images if not showing
  const processedContent = useMemo(() => {
    if (showImages) return content
    return content.replace(/!\[.*?\]\(.*?\)/g, '')
  }, [content, showImages])
  
  const columnClass = layoutMode === 'two-column' 
    ? 'columns-2 gap-6' 
    : layoutMode === 'grid' 
      ? 'columns-3 gap-4' 
      : ''
  
  return (
    <div className={`prose prose-sm prose-zinc max-w-none ${columnClass}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => showImages ? (
            <img 
              src={src} 
              alt={alt || ''} 
              className="max-w-full h-auto rounded border border-zinc-200 my-2"
              style={{ breakInside: 'avoid' }}
            />
          ) : null,
          h1: ({ children }) => <h2 className="text-lg font-bold mt-4 mb-2">{children}</h2>,
          h2: ({ children }) => <h3 className="text-base font-bold mt-3 mb-2">{children}</h3>,
          h3: ({ children }) => <h4 className="text-sm font-bold mt-2 mb-1">{children}</h4>,
          p: ({ children }) => <p className="mb-2 text-sm leading-relaxed">{children}</p>,
          code: ({ children, className }) => {
            const isInline = !className
            return isInline ? (
              <code className="bg-zinc-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
            ) : (
              <pre className="bg-zinc-100 p-3 rounded text-xs overflow-x-auto my-2">
                <code>{children}</code>
              </pre>
            )
          },
          ul: ({ children }) => <ul className="list-disc list-inside mb-2 text-sm">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 text-sm">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-zinc-300 pl-3 italic text-zinc-600 my-2">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border-collapse border border-zinc-200 text-xs">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-zinc-200 bg-zinc-100 px-2 py-1 text-left font-bold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-zinc-200 px-2 py-1">{children}</td>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}

/**
 * Relationships footer
 */
function RelationshipsFooter({
  metadata,
  compact = false,
}: {
  metadata: StrandMetadata
  compact?: boolean
}) {
  const prereqs = metadata.relationships?.prerequisites || []
  const refs = metadata.relationships?.references || []
  
  if (prereqs.length === 0 && refs.length === 0) return null
  
  if (compact) {
    return (
      <div className="mt-3 pt-2 border-t border-zinc-300 text-[10px] text-zinc-600">
        {prereqs.length > 0 && <span>Requires: {prereqs.join(', ')}</span>}
        {refs.length > 0 && <span className="ml-2">See also: {refs.join(', ')}</span>}
      </div>
    )
  }
  
  return (
    <div className="mt-4 pt-4 border-t-2 border-zinc-300 grid grid-cols-2 gap-4 text-sm">
      {prereqs.length > 0 && (
        <div>
          <h4 className="font-bold text-zinc-700 mb-1 flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            Prerequisites
          </h4>
          <ul className="text-xs text-zinc-600 space-y-0.5">
            {prereqs.map(p => <li key={p}>• {p}</li>)}
          </ul>
        </div>
      )}
      {refs.length > 0 && (
        <div>
          <h4 className="font-bold text-zinc-700 mb-1 flex items-center gap-1">
            <Tag className="w-4 h-4" />
            References
          </h4>
          <ul className="text-xs text-zinc-600 space-y-0.5">
            {refs.map(r => <li key={r}>• {r}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Strand Print Export Component
 * 
 * @description
 * Full-featured export component for rendering strands in multiple
 * paper sizes with intelligent content layout.
 */
export default function StrandPrintExport({
  metadata,
  currentFile,
  currentPath,
  content,
  onCopy,
  copied,
  theme = 'light',
}: StrandPrintExportProps) {
  // State
  const [selectedSize, setSelectedSize] = useState<PaperSize>(PAPER_SIZES[0])
  const [contentMode, setContentMode] = useState<ContentMode>('full')
  const [showImages, setShowImages] = useState(true)
  const [isExporting, setIsExporting] = useState<'png' | 'pdf' | null>(null)
  const [showSizeDropdown, setShowSizeDropdown] = useState(false)
  const [previewScale, setPreviewScale] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  const printRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Computed values
  const images = useMemo(() => extractImages(content), [content])
  const layoutMode = useMemo(
    () => determineLayout(content, selectedSize, showImages ? images.length : 0),
    [content, selectedSize, showImages, images.length]
  )
  
  const title = metadata.title || currentFile?.name?.replace('.md', '') || 'Untitled'
  const isCompact = selectedSize.id.includes('3x5') || selectedSize.id.includes('4x6')
  
  // Calculate preview dimensions (fit to container)
  const previewDimensions = useMemo(() => {
    const maxWidth = 600
    const maxHeight = 500
    
    const widthPx = selectedSize.widthIn * 96 // 96 DPI for screen preview
    const heightPx = selectedSize.heightIn * 96
    
    const scaleW = maxWidth / widthPx
    const scaleH = maxHeight / heightPx
    const scale = Math.min(scaleW, scaleH, 1)
    
    return {
      width: widthPx * scale,
      height: heightPx * scale,
      scale,
    }
  }, [selectedSize])
  
  // Handlers
  const handlePrint = useCallback(() => {
    if (!printRef.current) return
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    const styles = `
      <style>
        @page {
          size: ${selectedSize.widthIn}in ${selectedSize.heightIn}in;
          margin: 0;
        }
        body {
          margin: 0;
          padding: ${isCompact ? '0.25in' : '0.5in'};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: ${isCompact ? '10px' : '12px'};
          line-height: 1.4;
          color: #1f2937;
          background: #fff;
        }
        * { box-sizing: border-box; }
        img { max-width: 100%; height: auto; }
        h1 { font-size: ${isCompact ? '14px' : '20px'}; margin: 0 0 0.5em; }
        h2 { font-size: ${isCompact ? '12px' : '16px'}; margin: 1em 0 0.5em; }
        h3 { font-size: ${isCompact ? '11px' : '14px'}; margin: 0.8em 0 0.4em; }
        p { margin: 0 0 0.5em; }
        pre { background: #f3f4f6; padding: 0.5em; overflow-x: auto; font-size: 10px; }
        code { background: #f3f4f6; padding: 0.1em 0.3em; font-size: 90%; }
        ul, ol { margin: 0 0 0.5em; padding-left: 1.5em; }
        blockquote { border-left: 2px solid #d1d5db; margin: 0.5em 0; padding-left: 0.75em; color: #6b7280; }
        table { border-collapse: collapse; width: 100%; font-size: 10px; }
        th, td { border: 1px solid #d1d5db; padding: 0.25em 0.5em; }
        th { background: #f3f4f6; }
        .columns-2 { column-count: 2; column-gap: 1.5em; }
        .columns-3 { column-count: 3; column-gap: 1em; }
      </style>
    `
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - Print</title>
          ${styles}
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }, [selectedSize, isCompact, title])
  
  const handleExportPDF = useCallback(async () => {
    if (!printRef.current || isExporting) return
    setIsExporting('pdf')
    
    try {
      const [html2canvas, jsPDF] = await Promise.all([
        loadHtml2Canvas(),
        loadJsPDF()
      ])
      
      const widthPx = selectedSize.widthIn * selectedSize.dpi
      const heightPx = selectedSize.heightIn * selectedSize.dpi
      
      // Create temp container
      const tempContainer = document.createElement('div')
      tempContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: -9999px;
        width: ${widthPx}px;
        height: ${heightPx}px;
        padding: ${isCompact ? '24px' : '48px'};
        box-sizing: border-box;
        background: white;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: ${isCompact ? '24px' : '32px'};
      `
      document.body.appendChild(tempContainer)
      
      // Clone content
      const clone = printRef.current.cloneNode(true) as HTMLElement
      clone.style.width = '100%'
      clone.style.height = 'auto'
      tempContainer.appendChild(clone)
      
      // Render to canvas
      const canvas = await html2canvas(tempContainer, {
        width: widthPx,
        height: heightPx,
        scale: 1,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      })
      
      document.body.removeChild(tempContainer)
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: selectedSize.orientation,
        unit: 'in',
        format: selectedSize.orientation === 'landscape' 
          ? [selectedSize.heightIn, selectedSize.widthIn]
          : [selectedSize.widthIn, selectedSize.heightIn],
      })
      
      const imgData = canvas.toDataURL('image/png', 1.0)
      pdf.addImage(imgData, 'PNG', 0, 0, selectedSize.widthIn, selectedSize.heightIn)
      
      pdf.setProperties({
        title: `${title} - ${selectedSize.name}`,
        subject: 'OpenStrand Export',
        author: 'Quarry Codex',
      })
      
      pdf.save(`${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${selectedSize.id}.pdf`)
    } catch (error) {
      console.error('Failed to export PDF:', error)
      alert('Export failed. Please try the Print option.')
    } finally {
      setIsExporting(null)
    }
  }, [selectedSize, isCompact, title, isExporting])
  
  const handleExportPNG = useCallback(async () => {
    if (!printRef.current || isExporting) return
    setIsExporting('png')
    
    try {
      const html2canvas = await loadHtml2Canvas()
      
      const widthPx = selectedSize.widthIn * selectedSize.dpi
      const heightPx = selectedSize.heightIn * selectedSize.dpi
      
      // Create temp container
      const tempContainer = document.createElement('div')
      tempContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: -9999px;
        width: ${widthPx}px;
        height: ${heightPx}px;
        padding: ${isCompact ? '24px' : '48px'};
        box-sizing: border-box;
        background: white;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: ${isCompact ? '24px' : '32px'};
      `
      document.body.appendChild(tempContainer)
      
      // Clone content
      const clone = printRef.current.cloneNode(true) as HTMLElement
      clone.style.width = '100%'
      clone.style.height = 'auto'
      tempContainer.appendChild(clone)
      
      // Render to canvas
      const canvas = await html2canvas(tempContainer, {
        width: widthPx,
        height: heightPx,
        scale: 1,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      })
      
      document.body.removeChild(tempContainer)
      
      // Download PNG
      const dataUrl = canvas.toDataURL('image/png', 1.0)
      const link = document.createElement('a')
      link.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${selectedSize.id}.png`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Failed to export PNG:', error)
      alert('Export failed. Please try the Print option.')
    } finally {
      setIsExporting(null)
    }
  }, [selectedSize, isCompact, title, isExporting])
  
  // Render
  return (
    <div ref={containerRef} className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Size selector */}
        <div className="relative">
          <button
            onClick={() => setShowSizeDropdown(!showSizeDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <selectedSize.icon className="w-4 h-4" />
            {selectedSize.name}
            <ChevronDown className={`w-4 h-4 transition-transform ${showSizeDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {showSizeDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 mt-1 z-[9999] w-56 bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 py-1 max-h-64 overflow-y-auto"
              >
                {PAPER_SIZES.map(size => (
                  <button
                    key={size.id}
                    onClick={() => {
                      setSelectedSize(size)
                      setShowSizeDropdown(false)
                    }}
                    className={`
                      w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors
                      ${selectedSize.id === size.id 
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' 
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }
                    `}
                  >
                    <size.icon className="w-4 h-4" />
                    <span className="flex-1">{size.name}</span>
                    <span className="text-xs text-zinc-400">
                      {size.widthIn}×{size.heightIn}&quot;
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Content mode toggle */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          {(['metadata', 'compact', 'full'] as ContentMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setContentMode(mode)}
              className={`
                px-2 py-1 text-xs font-medium rounded transition-colors capitalize
                ${contentMode === mode 
                  ? 'bg-white dark:bg-zinc-700 shadow' 
                  : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }
              `}
            >
              {mode}
            </button>
          ))}
        </div>
        
        {/* Image toggle */}
        <button
          onClick={() => setShowImages(!showImages)}
          className={`
            flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors
            ${showImages 
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' 
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }
          `}
          title={showImages ? 'Hide images' : 'Show images'}
        >
          {showImages ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {images.length > 0 && <span>{images.length}</span>}
        </button>
        
        {/* Spacer */}
        <div className="flex-1" />
        
        {/* Minimal Export button */}
        <button
          onClick={handleExportPDF}
          disabled={isExporting === 'pdf'}
          className="export-btn-minimal"
          title="Export as PDF"
          aria-label="Export as PDF"
        >
          {isExporting === 'pdf' ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Sparkles className="w-3 h-3 text-emerald-500" />
            </motion.div>
          ) : (
            <Download className="w-3 h-3 text-zinc-400 hover:text-emerald-500 transition-colors" />
          )}
        </button>
      </div>
      
      {/* Preview */}
      <div className="flex justify-center p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden">
        <motion.div
          className="bg-white shadow-2xl overflow-hidden"
          style={{
            width: previewDimensions.width,
            height: previewDimensions.height,
            aspectRatio: selectedSize.aspectRatio,
          }}
          animate={{ scale: previewScale }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          {/* Printable content */}
          <div
            ref={printRef}
            className={`w-full h-full overflow-auto ${isCompact ? 'p-3' : 'p-6'}`}
            style={{
              fontSize: isCompact ? '10px' : '12px',
              lineHeight: isCompact ? '1.3' : '1.5',
            }}
          >
            <MetadataHeader 
              metadata={metadata} 
              currentPath={currentPath} 
              compact={isCompact || contentMode === 'compact'}
            />
            
            {contentMode !== 'metadata' && (
              <ContentRenderer
                content={content}
                layoutMode={layoutMode}
                showImages={showImages}
              />
            )}
            
            <RelationshipsFooter 
              metadata={metadata} 
              compact={isCompact || contentMode === 'compact'}
            />
            
            {/* Footer */}
            <div className="mt-4 pt-2 border-t border-zinc-200 text-[8px] text-zinc-400 flex justify-between">
              <span>Quarry Codex • OpenStrand</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Size info */}
      <div className="text-center text-xs text-zinc-500">
        {selectedSize.widthIn}&quot; × {selectedSize.heightIn}&quot; • {selectedSize.dpi} DPI • {layoutMode} layout
        {images.length > 0 && ` • ${images.length} image${images.length > 1 ? 's' : ''}`}
      </div>
    </div>
  )
}
