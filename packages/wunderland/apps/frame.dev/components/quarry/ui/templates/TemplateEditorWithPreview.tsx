/**
 * TemplateEditorWithPreview Component
 * @module codex/ui/TemplateEditorWithPreview
 *
 * @description
 * Split-view template editor with live preview.
 * Left side: TemplateContentEditor for WYSIWYG editing
 * Right side: Live preview with sample data interpolation
 */

'use client'

import React, { useMemo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Columns, Maximize2, Minimize2 } from 'lucide-react'
import TemplateContentEditor from './TemplateContentEditor'
import type { TemplateField } from '@/components/quarry/templates/types'
import { useDebouncedValue } from '@/lib/hooks/useDebounce'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface TemplateEditorWithPreviewProps {
  /** Current template content */
  content: string
  /** Content change callback */
  onChange: (content: string) => void
  /** Template fields for placeholder insertion */
  fields: TemplateField[]
  /** Sample data for preview interpolation */
  sampleData?: Record<string, string>
  /** Dark mode */
  isDark?: boolean
  /** Minimum height */
  minHeight?: string
  /** Show preview by default */
  defaultShowPreview?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Generate sample data for template fields
 */
function generateSampleData(fields: TemplateField[]): Record<string, string> {
  const samples: Record<string, string> = {}

  for (const field of fields) {
    switch (field.type) {
      case 'text':
        samples[field.name] = field.placeholder || `Sample ${field.label}`
        break
      case 'textarea':
        samples[field.name] = field.placeholder || `Sample long text for ${field.label}...`
        break
      case 'number':
        samples[field.name] = '42'
        break
      case 'date':
        samples[field.name] = new Date().toISOString().split('T')[0]
        break
      case 'email':
        samples[field.name] = 'example@email.com'
        break
      case 'url':
        samples[field.name] = 'https://example.com'
        break
      case 'select':
        samples[field.name] = field.options?.[0] || 'Option 1'
        break
      case 'tags':
        samples[field.name] = 'tag1, tag2, tag3'
        break
      default:
        samples[field.name] = `{${field.name}}`
    }
  }

  return samples
}

/**
 * Interpolate placeholders in content with sample data
 */
function interpolatePlaceholders(content: string, data: Record<string, string>): string {
  let result = content

  for (const [key, value] of Object.entries(data)) {
    // Replace {fieldName} with the value
    const placeholder = new RegExp(`\\{${key}\\}`, 'g')
    result = result.replace(placeholder, value)
  }

  return result
}

/* ═══════════════════════════════════════════════════════════════════════════
   PREVIEW PANEL
═══════════════════════════════════════════════════════════════════════════ */

interface PreviewPanelProps {
  content: string
  isDark: boolean
}

function PreviewPanel({ content, isDark }: PreviewPanelProps) {
  return (
    <div
      className={`
        prose max-w-none p-4 overflow-auto h-full
        ${isDark ? 'prose-invert' : ''}
      `}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function TemplateEditorWithPreview({
  content,
  onChange,
  fields,
  sampleData: providedSampleData,
  isDark = false,
  minHeight = '400px',
  defaultShowPreview = true,
}: TemplateEditorWithPreviewProps) {
  const [showPreview, setShowPreview] = useState(defaultShowPreview)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Generate sample data from fields if not provided
  const sampleData = useMemo(() => {
    return providedSampleData || generateSampleData(fields)
  }, [providedSampleData, fields])

  // Debounce content for preview (300ms)
  const debouncedContent = useDebouncedValue(content, 300)

  // Interpolate placeholders in debounced content
  const previewContent = useMemo(() => {
    return interpolatePlaceholders(debouncedContent, sampleData)
  }, [debouncedContent, sampleData])

  // Toggle preview
  const togglePreview = useCallback(() => {
    setShowPreview((prev) => !prev)
  }, [])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev)
  }, [])

  return (
    <div
      className={`
        flex flex-col rounded-lg border overflow-hidden
        ${isDark ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-200 bg-white'}
        ${isFullscreen ? 'fixed inset-4 z-50' : ''}
      `}
      style={{ minHeight: isFullscreen ? undefined : minHeight }}
    >
      {/* Header */}
      <div
        className={`
          flex items-center justify-between px-3 py-2 border-b
          ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-100 bg-zinc-50'}
        `}
      >
        <div className="flex items-center gap-2">
          <Columns className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
          <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
            Template Editor
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={togglePreview}
            className={`
              flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors
              ${showPreview
                ? isDark
                  ? 'bg-cyan-900/30 text-cyan-400'
                  : 'bg-cyan-50 text-cyan-600'
                : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-700'
              }
            `}
            title={showPreview ? 'Hide preview' : 'Show preview'}
          >
            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className={`
              p-1.5 rounded transition-colors
              ${isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
              }
            `}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div
          className={`
            flex-1 overflow-auto
            ${showPreview ? 'border-r' : ''}
            ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
          `}
          style={{ minWidth: showPreview ? '50%' : '100%' }}
        >
          <TemplateContentEditor
            content={content}
            onChange={onChange}
            fields={fields}
            isDark={isDark}
            minHeight="100%"
            placeholder="Write your template content here. Use the 'Insert Field' button to add placeholders like {title} or {author}."
          />
        </div>

        {/* Preview */}
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: '50%' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className={`overflow-auto ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}
          >
            <div
              className={`
                px-3 py-2 border-b text-xs font-medium
                ${isDark ? 'border-zinc-700 text-zinc-400 bg-zinc-900/50' : 'border-zinc-200 text-zinc-500 bg-zinc-100'}
              `}
            >
              Live Preview (with sample data)
            </div>
            <PreviewPanel content={previewContent} isDark={isDark} />
          </motion.div>
        )}
      </div>

      {/* Fullscreen overlay background */}
      {isFullscreen && (
        <div
          className="fixed inset-0 bg-black/50 -z-10"
          onClick={toggleFullscreen}
        />
      )}
    </div>
  )
}

export { TemplateEditorWithPreview }
