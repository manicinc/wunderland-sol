/**
 * Handwriting Templates
 * @module codex/ui/canvas/templates/HandwritingTemplates
 *
 * Pre-configured canvas templates for handwriting:
 * - Lined paper (notebook style)
 * - Grid paper (graph style)
 * - Blank with margins
 * - Cornell notes format
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  Grid,
  Square,
  BookOpen,
  Check,
  Maximize,
} from 'lucide-react'

/**
 * Template types available
 */
export type TemplateType = 'lined' | 'grid' | 'blank' | 'cornell'

/**
 * Template configuration
 */
export interface TemplateConfig {
  type: TemplateType
  width: number
  height: number
  lineSpacing?: number
  gridSize?: number
  marginLeft?: number
  marginRight?: number
  marginTop?: number
  marginBottom?: number
  cueColumn?: number // For Cornell notes
  summaryHeight?: number // For Cornell notes
  lineColor?: string
  backgroundColor?: string
}

/**
 * Default configurations for each template
 */
export const TEMPLATE_DEFAULTS: Record<TemplateType, Partial<TemplateConfig>> = {
  lined: {
    lineSpacing: 28,
    marginLeft: 80,
    marginRight: 40,
    marginTop: 60,
    marginBottom: 40,
    lineColor: '#e5e7eb',
  },
  grid: {
    gridSize: 20,
    marginLeft: 40,
    marginRight: 40,
    marginTop: 40,
    marginBottom: 40,
    lineColor: '#e5e7eb',
  },
  blank: {
    marginLeft: 60,
    marginRight: 60,
    marginTop: 60,
    marginBottom: 60,
  },
  cornell: {
    cueColumn: 150,
    summaryHeight: 120,
    lineSpacing: 28,
    marginTop: 80,
    marginBottom: 40,
    marginLeft: 40,
    marginRight: 40,
    lineColor: '#e5e7eb',
  },
}

/**
 * Template metadata for UI display
 */
interface TemplateInfo {
  type: TemplateType
  name: string
  description: string
  icon: React.ElementType
}

export const TEMPLATES: TemplateInfo[] = [
  {
    type: 'lined',
    name: 'Lined Paper',
    description: 'Notebook-style horizontal lines',
    icon: FileText,
  },
  {
    type: 'grid',
    name: 'Grid Paper',
    description: 'Graph paper with square grid',
    icon: Grid,
  },
  {
    type: 'blank',
    name: 'Blank',
    description: 'Clean canvas with margins',
    icon: Square,
  },
  {
    type: 'cornell',
    name: 'Cornell Notes',
    description: 'Structured note-taking format',
    icon: BookOpen,
  },
]

/**
 * Render template lines to SVG
 */
export function renderTemplateToSVG(config: TemplateConfig): string {
  const {
    type,
    width,
    height,
    lineSpacing = 28,
    gridSize = 20,
    marginLeft = 40,
    marginRight = 40,
    marginTop = 40,
    marginBottom = 40,
    cueColumn = 150,
    summaryHeight = 120,
    lineColor = '#e5e7eb',
    backgroundColor = '#ffffff',
  } = config

  const contentWidth = width - marginLeft - marginRight
  const contentHeight = height - marginTop - marginBottom

  let lines = ''

  switch (type) {
    case 'lined': {
      // Horizontal lines
      const numLines = Math.floor(contentHeight / lineSpacing)
      for (let i = 0; i <= numLines; i++) {
        const y = marginTop + i * lineSpacing
        lines += `<line x1="${marginLeft}" y1="${y}" x2="${width - marginRight}" y2="${y}" stroke="${lineColor}" stroke-width="1"/>`
      }
      // Red margin line
      lines += `<line x1="${marginLeft}" y1="${marginTop}" x2="${marginLeft}" y2="${height - marginBottom}" stroke="#ef4444" stroke-width="1" stroke-opacity="0.5"/>`
      break
    }

    case 'grid': {
      // Vertical lines
      const numVertical = Math.floor(contentWidth / gridSize)
      for (let i = 0; i <= numVertical; i++) {
        const x = marginLeft + i * gridSize
        lines += `<line x1="${x}" y1="${marginTop}" x2="${x}" y2="${height - marginBottom}" stroke="${lineColor}" stroke-width="1"/>`
      }
      // Horizontal lines
      const numHorizontal = Math.floor(contentHeight / gridSize)
      for (let i = 0; i <= numHorizontal; i++) {
        const y = marginTop + i * gridSize
        lines += `<line x1="${marginLeft}" y1="${y}" x2="${width - marginRight}" y2="${y}" stroke="${lineColor}" stroke-width="1"/>`
      }
      break
    }

    case 'blank': {
      // Just margins shown as subtle corner marks
      const markSize = 20
      const markColor = '#d1d5db'
      // Top-left
      lines += `<path d="M ${marginLeft} ${marginTop + markSize} L ${marginLeft} ${marginTop} L ${marginLeft + markSize} ${marginTop}" stroke="${markColor}" stroke-width="1" fill="none"/>`
      // Top-right
      lines += `<path d="M ${width - marginRight - markSize} ${marginTop} L ${width - marginRight} ${marginTop} L ${width - marginRight} ${marginTop + markSize}" stroke="${markColor}" stroke-width="1" fill="none"/>`
      // Bottom-left
      lines += `<path d="M ${marginLeft} ${height - marginBottom - markSize} L ${marginLeft} ${height - marginBottom} L ${marginLeft + markSize} ${height - marginBottom}" stroke="${markColor}" stroke-width="1" fill="none"/>`
      // Bottom-right
      lines += `<path d="M ${width - marginRight - markSize} ${height - marginBottom} L ${width - marginRight} ${height - marginBottom} L ${width - marginRight} ${height - marginBottom - markSize}" stroke="${markColor}" stroke-width="1" fill="none"/>`
      break
    }

    case 'cornell': {
      const notesLeft = marginLeft + cueColumn
      const summaryTop = height - marginBottom - summaryHeight

      // Cue column vertical line
      lines += `<line x1="${notesLeft}" y1="${marginTop}" x2="${notesLeft}" y2="${summaryTop}" stroke="${lineColor}" stroke-width="2"/>`

      // Summary section horizontal line
      lines += `<line x1="${marginLeft}" y1="${summaryTop}" x2="${width - marginRight}" y2="${summaryTop}" stroke="${lineColor}" stroke-width="2"/>`

      // Horizontal lines in notes section
      const notesHeight = summaryTop - marginTop
      const numLines = Math.floor(notesHeight / lineSpacing)
      for (let i = 1; i <= numLines; i++) {
        const y = marginTop + i * lineSpacing
        if (y < summaryTop - 10) {
          lines += `<line x1="${notesLeft + 10}" y1="${y}" x2="${width - marginRight}" y2="${y}" stroke="${lineColor}" stroke-width="1"/>`
        }
      }

      // Labels
      lines += `<text x="${marginLeft + 10}" y="${marginTop + 20}" font-size="12" fill="#9ca3af" font-family="system-ui">Cue Column</text>`
      lines += `<text x="${notesLeft + 10}" y="${marginTop + 20}" font-size="12" fill="#9ca3af" font-family="system-ui">Notes</text>`
      lines += `<text x="${marginLeft + 10}" y="${summaryTop + 24}" font-size="12" fill="#9ca3af" font-family="system-ui">Summary</text>`
      break
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="${backgroundColor}"/>
    ${lines}
  </svg>`
}

/**
 * Create a Blob from template SVG
 */
export function createTemplateBlob(config: TemplateConfig): Blob {
  const svg = renderTemplateToSVG(config)
  return new Blob([svg], { type: 'image/svg+xml' })
}

/**
 * Create a data URL from template SVG
 */
export function createTemplateDataURL(config: TemplateConfig): string {
  const svg = renderTemplateToSVG(config)
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

/**
 * Template Selector Props
 */
interface TemplateSelectorProps {
  selected?: TemplateType
  onSelect: (type: TemplateType) => void
  width?: number
  height?: number
  isDark?: boolean
}

/**
 * Template Selector Component
 *
 * Grid of template options with previews
 */
export function TemplateSelector({
  selected,
  onSelect,
  width = 400,
  height = 500,
  isDark = false,
}: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {TEMPLATES.map((template) => {
        const Icon = template.icon
        const isSelected = selected === template.type
        const preview = createTemplateDataURL({
          type: template.type,
          width: 200,
          height: 250,
          ...TEMPLATE_DEFAULTS[template.type],
        })

        return (
          <motion.button
            key={template.type}
            onClick={() => onSelect(template.type)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              relative p-4 rounded-xl border-2 text-left transition-colors
              ${isSelected
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : isDark
                  ? 'border-gray-700 hover:border-gray-600 bg-gray-800'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }
            `}
          >
            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}

            {/* Preview */}
            <div
              className={`
              w-full aspect-[4/5] rounded-lg overflow-hidden mb-3
              ${isDark ? 'bg-gray-900' : 'bg-gray-50'}
            `}
            >
              <img
                src={preview}
                alt={template.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-purple-500" />
              <span className="font-medium text-sm">{template.name}</span>
            </div>
            <p className="text-xs opacity-60">{template.description}</p>
          </motion.button>
        )
      })}
    </div>
  )
}

/**
 * Page Size Options
 */
export interface PageSize {
  name: string
  width: number
  height: number
}

export const PAGE_SIZES: PageSize[] = [
  { name: 'Letter', width: 612, height: 792 },
  { name: 'A4', width: 595, height: 842 },
  { name: 'A5', width: 420, height: 595 },
  { name: 'Square', width: 600, height: 600 },
  { name: 'Wide', width: 800, height: 500 },
]

/**
 * Template Creator Props
 */
interface TemplateCreatorProps {
  onCreateTemplate: (blob: Blob, config: TemplateConfig) => void
  isDark?: boolean
}

/**
 * Template Creator Component
 *
 * Full template creation flow with type and size selection
 */
export function TemplateCreator({
  onCreateTemplate,
  isDark = false,
}: TemplateCreatorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('lined')
  const [selectedSize, setSelectedSize] = useState<PageSize>(PAGE_SIZES[0])

  const handleCreate = useCallback(() => {
    const config: TemplateConfig = {
      type: selectedTemplate,
      width: selectedSize.width,
      height: selectedSize.height,
      ...TEMPLATE_DEFAULTS[selectedTemplate],
    }

    const blob = createTemplateBlob(config)
    onCreateTemplate(blob, config)
  }, [selectedTemplate, selectedSize, onCreateTemplate])

  return (
    <div className="space-y-6">
      {/* Template Type */}
      <div>
        <h3 className="font-medium mb-3">Template Type</h3>
        <TemplateSelector
          selected={selectedTemplate}
          onSelect={setSelectedTemplate}
          isDark={isDark}
        />
      </div>

      {/* Page Size */}
      <div>
        <h3 className="font-medium mb-3">Page Size</h3>
        <div className="flex flex-wrap gap-2">
          {PAGE_SIZES.map((size) => (
            <button
              key={size.name}
              onClick={() => setSelectedSize(size)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
                ${selectedSize.name === size.name
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                  : isDark
                    ? 'border-gray-700 hover:border-gray-600'
                    : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <Maximize className="w-4 h-4" />
              <span className="text-sm font-medium">{size.name}</span>
              <span className="text-xs opacity-60">
                {size.width}x{size.height}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div>
        <h3 className="font-medium mb-3">Preview</h3>
        <div
          className={`
          aspect-[4/5] max-w-xs mx-auto rounded-lg overflow-hidden shadow-lg
          ${isDark ? 'bg-gray-800' : 'bg-white'}
        `}
        >
          <img
            src={createTemplateDataURL({
              type: selectedTemplate,
              width: selectedSize.width,
              height: selectedSize.height,
              ...TEMPLATE_DEFAULTS[selectedTemplate],
            })}
            alt="Template preview"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Create Button */}
      <button
        onClick={handleCreate}
        className="w-full py-3 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
      >
        Create Template
      </button>
    </div>
  )
}

export default TemplateCreator
