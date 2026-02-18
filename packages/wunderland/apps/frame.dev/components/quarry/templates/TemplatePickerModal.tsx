/**
 * Template Picker Modal
 * @module codex/templates/TemplatePickerModal
 *
 * @description
 * Modal wrapper for TemplateSelector to be used in strand creation flow.
 * Provides a full-screen template browser with preview and selection.
 */

'use client'

import React, { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Eye, FileText, ChevronRight } from 'lucide-react'
import TemplateSelector from './TemplateSelector'
import TemplatePreview from './TemplatePreview'
import type { LoadedTemplate } from './types'

interface TemplatePickerModalProps {
  /** Close modal handler */
  onClose: () => void
  /** Template selection handler - receives the generated content */
  onSelectTemplate: (content: string, fileName: string, metadata: TemplateMetadata) => void
  /** Dark mode */
  isDark?: boolean
}

export interface TemplateMetadata {
  templateId: string
  templateName: string
  category: string
  frontmatter: Record<string, unknown>
}

export default function TemplatePickerModal({
  onClose,
  onSelectTemplate,
  isDark = true,
}: TemplatePickerModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<LoadedTemplate | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Handle template selection from TemplateSelector
  const handleTemplateClick = useCallback((template: LoadedTemplate) => {
    setSelectedTemplate(template)
    setShowPreview(true)
  }, [])

  // Apply the selected template
  const handleApplyTemplate = useCallback(() => {
    if (!selectedTemplate) return

    // Generate content from template
    const date = new Date().toISOString().split('T')[0]
    let content = selectedTemplate.template
      .replace(/\{date\}/g, date)
      .replace(/\{title\}/g, selectedTemplate.name)
      .replace(/\{summary\}/g, selectedTemplate.shortDescription)

    // Generate frontmatter
    const frontmatter: Record<string, unknown> = {
      title: selectedTemplate.name,
      created: date,
      template: selectedTemplate.id,
      category: selectedTemplate.category,
      tags: selectedTemplate.tags,
    }

    // Add frontmatter to content if not already present
    if (!content.startsWith('---')) {
      const frontmatterYaml = Object.entries(frontmatter)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}:\n${value.map(v => `  - ${v}`).join('\n')}`
          }
          return `${key}: ${JSON.stringify(value)}`
        })
        .join('\n')
      content = `---\n${frontmatterYaml}\n---\n\n${content}`
    }

    const fileName = `${selectedTemplate.id}.md`

    onSelectTemplate(content, fileName, {
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      category: selectedTemplate.category,
      frontmatter,
    })

    onClose()
  }, [selectedTemplate, onSelectTemplate, onClose])

  // Close preview and go back to selection
  const handleClosePreview = useCallback(() => {
    setShowPreview(false)
    setSelectedTemplate(null)
  }, [])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`
            relative w-full max-w-5xl max-h-[90vh] m-4 rounded-2xl shadow-2xl
            flex flex-col overflow-hidden
            ${isDark ? 'bg-zinc-900' : 'bg-white'}
          `}
        >
          {/* Header */}
          <div className={`
            flex items-center justify-between px-6 py-4 border-b
            ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
          `}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-cyan-900/30 text-cyan-400' : 'bg-cyan-100 text-cyan-600'}`}>
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  Choose a Template
                </h2>
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Browse all templates including remote repositories
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <TemplateSelector
              onSelectTemplate={handleTemplateClick}
              showPreview={false}
              isDark={isDark}
            />
          </div>

          {/* Footer with selected template info */}
          {selectedTemplate && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`
                px-6 py-4 border-t
                ${isDark ? 'border-zinc-800 bg-zinc-900/80' : 'border-zinc-200 bg-zinc-50'}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`
                    p-2 rounded-lg
                    ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
                  `}>
                    <FileText className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
                  </div>
                  <div>
                    <div className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      {selectedTemplate.name}
                    </div>
                    <div className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {selectedTemplate.categoryMeta.name} • {selectedTemplate.difficulty}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowPreview(true)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                      transition-colors
                      ${isDark
                        ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }
                    `}
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  <button
                    onClick={handleApplyTemplate}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-cyan-600 text-white hover:bg-cyan-500 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Use Template
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Preview Modal */}
        {showPreview && selectedTemplate && (
          <TemplatePreview
            template={selectedTemplate}
            onSelect={handleApplyTemplate}
            onClose={handleClosePreview}
            isDark={isDark}
          />
        )}
      </motion.div>
    </AnimatePresence>
  )
}
