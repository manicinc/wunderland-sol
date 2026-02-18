/**
 * Template Preview Component
 * @module codex/templates/TemplatePreview
 * 
 * @remarks
 * Modal preview of a template showing:
 * - Full description and metadata
 * - Template content preview
 * - Form fields overview
 * - Select/favorite actions
 */

'use client'

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Heart, Clock, Tag, BookOpen,
  Check, ExternalLink, Copy, Eye,
  AlertTriangle, Beaker, Sparkles, Info, Link2
} from 'lucide-react'
import DynamicIcon from '../ui/common/DynamicIcon'
import type { LoadedTemplate } from './types'

interface TemplatePreviewProps {
  /** Template to preview */
  template: LoadedTemplate
  /** Select template handler */
  onSelect: () => void
  /** Close preview handler */
  onClose: () => void
  /** Toggle favorite handler */
  onToggleFavorite?: () => void
  /** Dark mode */
  isDark?: boolean
}

/** Difficulty colors */
const DIFFICULTY_STYLES = {
  beginner: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  intermediate: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  advanced: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
}

/** Difficulty tooltips */
const DIFFICULTY_TOOLTIPS = {
  beginner: 'Simple structure with few fields - great for getting started',
  intermediate: 'Moderate complexity with multiple sections and fields',
  advanced: 'Complex template with many fields and advanced formatting',
}

/** Status styles */
const STATUS_STYLES = {
  stable: { icon: Check, bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Stable' },
  beta: { icon: Beaker, bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Beta' },
  experimental: { icon: Sparkles, bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', label: 'Experimental' },
  deprecated: { icon: AlertTriangle, bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Deprecated' },
}

/** Status tooltips */
const STATUS_TOOLTIPS = {
  stable: 'This template is production-ready and well-tested',
  beta: 'This template is in beta - may change in future versions',
  experimental: 'Experimental template - use with caution',
  deprecated: 'This template is deprecated and may be removed in future versions',
}

export default function TemplatePreview({
  template,
  onSelect,
  onClose,
  onToggleFavorite,
  isDark = false,
}: TemplatePreviewProps) {
  // Generate a simple preview of the template content
  const contentPreview = useMemo(() => {
    // Replace placeholders with sample values
    let preview = template.template
      .replace(/\{title\}/g, template.name)
      .replace(/\{summary\}/g, template.shortDescription)
      .replace(/\{date\}/g, new Date().toISOString().split('T')[0])
      .replace(/\{[a-zA-Z_]+\}/g, '[...]')
    
    // Truncate to reasonable length
    const lines = preview.split('\n').slice(0, 30)
    if (preview.split('\n').length > 30) {
      lines.push('...')
    }
    return lines.join('\n')
  }, [template])

  // Copy template content
  const handleCopy = () => {
    navigator.clipboard.writeText(template.template)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={`
            w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl
            bg-white dark:bg-zinc-900 shadow-2xl
            flex flex-col
          `}
        >
          {/* Header */}
          <div className="flex items-start gap-4 p-6 border-b border-zinc-200 dark:border-zinc-800">
            {/* Icon */}
            <div 
              className="p-3 rounded-xl flex-shrink-0"
              style={{ 
                backgroundColor: `${template.categoryMeta.color}20`,
                color: template.categoryMeta.color,
              }}
            >
              <DynamicIcon name={template.icon} className="w-8 h-8" />
            </div>

            {/* Title & Meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
                  {template.name}
                </h2>
                <span 
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ 
                    backgroundColor: `${template.categoryMeta.color}20`,
                    color: template.categoryMeta.color,
                  }}
                >
                  {template.categoryMeta.name}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full cursor-help ${DIFFICULTY_STYLES[template.difficulty].bg} ${DIFFICULTY_STYLES[template.difficulty].text}`}
                  title={DIFFICULTY_TOOLTIPS[template.difficulty]}
                >
                  {template.difficulty}
                </span>
                {/* Status badge (only show if not stable) */}
                {template.status && template.status !== 'stable' && (() => {
                  const status = STATUS_STYLES[template.status]
                  const StatusIcon = status.icon
                  return (
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full cursor-help flex items-center gap-1 ${status.bg} ${status.text}`}
                      title={STATUS_TOOLTIPS[template.status]}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  )
                })()}
              </div>
              
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                {template.description}
              </p>

              {/* Stats row */}
              <div className="flex items-center gap-4 mt-3 text-sm text-zinc-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {template.estimatedTime}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  v{template.version}
                </span>
                {template.useCount && template.useCount > 0 && (
                  <span>Used {template.useCount} times</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {onToggleFavorite && (
                <button
                  onClick={onToggleFavorite}
                  className={`
                    p-2 rounded-lg transition-colors
                    ${template.isFavorite 
                      ? 'text-rose-500 bg-rose-100 dark:bg-rose-900/30' 
                      : 'text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}
                  `}
                  aria-label={template.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className={`w-5 h-5 ${template.isFavorite ? 'fill-current' : ''}`} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Deprecation Warning */}
            {template.status === 'deprecated' && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-700 dark:text-red-400">
                      Deprecated Template
                    </h4>
                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                      This template is deprecated and may be removed in future versions.
                      Consider using an alternative template for new content.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            {template.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5">
                  <Tag className="w-4 h-4" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {template.tags.map(tag => (
                    <span 
                      key={tag}
                      className="text-xs px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Form Fields Preview */}
            {template.fields && template.fields.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Form Fields
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {template.fields.slice(0, 6).map(field => (
                    <div
                      key={field.name}
                      className={`flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg ${field.tooltip || field.description ? 'cursor-help' : ''}`}
                      title={field.tooltip || field.description || undefined}
                    >
                      <span className={`
                        w-1.5 h-1.5 rounded-full flex-shrink-0
                        ${field.required ? 'bg-red-500' : 'bg-zinc-300'}
                      `} />
                      <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                        {field.label}
                      </span>
                      {(field.tooltip || field.description) && (
                        <Info className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                      )}
                      <span className="ml-auto text-xs text-zinc-400 flex-shrink-0">
                        {field.type}
                      </span>
                    </div>
                  ))}
                  {template.fields.length > 6 && (
                    <div className="text-sm text-zinc-400 p-2">
                      +{template.fields.length - 6} more fields
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Related Templates */}
            {template.relatedTemplates && template.relatedTemplates.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5">
                  <Link2 className="w-4 h-4" />
                  Related Templates
                </h3>
                <div className="flex flex-wrap gap-2">
                  {template.relatedTemplates.map(relatedId => (
                    <span
                      key={relatedId}
                      className="text-xs px-2.5 py-1 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 rounded-full border border-cyan-200 dark:border-cyan-800"
                    >
                      {relatedId}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Template Preview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  Template Preview
                </h3>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Template
                </button>
              </div>
              <div className="relative">
                <pre className="p-4 bg-zinc-900 dark:bg-zinc-950 text-zinc-300 text-xs font-mono rounded-lg overflow-x-auto max-h-80">
                  {contentPreview}
                </pre>
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-zinc-900 to-transparent rounded-b-lg pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            <p className="text-xs text-zinc-500">
              By {template.author}
              {template.updatedAt && ` • Updated ${template.updatedAt}`}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSelect}
                className="px-4 py-2 text-sm font-semibold text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Use This Template
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}





















