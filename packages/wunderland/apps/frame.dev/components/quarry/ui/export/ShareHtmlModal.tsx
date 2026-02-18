/**
 * Share as HTML Modal
 * @module components/quarry/ui/export/ShareHtmlModal
 *
 * Modal for exporting a strand as a standalone HTML file that can be
 * shared directly without a server. Supports theme selection, TOC,
 * and preview functionality.
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Download,
  ExternalLink,
  Sun,
  Moon,
  Monitor,
  FileCode2,
  BookOpen,
  Copy,
  Check,
  Loader2,
  Eye,
  Settings2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StrandMetadata } from '@/components/quarry/types'
import {
  generateStandaloneHtml,
  downloadAsStandaloneHtml,
  previewStandaloneHtml,
  type StandaloneHtmlOptions,
  type TocEntry,
} from '@/lib/export/standaloneHtml'

// ============================================================================
// TYPES
// ============================================================================

export interface ShareHtmlModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Strand file path */
  filePath: string
  /** Strand file name */
  fileName: string
  /** Raw markdown content */
  content: string
  /** Parsed frontmatter metadata */
  metadata: StrandMetadata
  /** Pre-rendered HTML (optional) */
  renderedHtml?: string
  /** Callback when export completes */
  onExport?: (result: { html: string; filename: string }) => void
}

type Theme = 'light' | 'dark' | 'auto'

interface ExportSettings {
  theme: Theme
  includeToc: boolean
  includeCodeCopyButtons: boolean
  includePrintStyles: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: 'auto', label: 'Auto', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

const MODAL_ANIMATION = {
  overlay: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 },
  },
  content: {
    initial: { opacity: 0, scale: 0.95, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 10 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ShareHtmlModal({
  isOpen,
  onClose,
  filePath,
  fileName,
  content,
  metadata,
  renderedHtml,
  onExport,
}: ShareHtmlModalProps) {
  // State
  const [settings, setSettings] = useState<ExportSettings>({
    theme: 'auto',
    includeToc: true,
    includeCodeCopyButtons: true,
    includePrintStyles: true,
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [copied, setCopied] = useState(false)

  // Memoized export options
  const exportOptions: StandaloneHtmlOptions = useMemo(
    () => ({
      filePath,
      fileName,
      content,
      metadata,
      renderedHtml,
      theme: settings.theme,
      includeToc: settings.includeToc,
      includeCodeCopyButtons: settings.includeCodeCopyButtons,
      includePrintStyles: settings.includePrintStyles,
    }),
    [filePath, fileName, content, metadata, renderedHtml, settings]
  )

  // Generate preview data
  const previewData = useMemo(() => {
    try {
      return generateStandaloneHtml(exportOptions)
    } catch {
      return null
    }
  }, [exportOptions])

  // Handle download
  const handleDownload = useCallback(async () => {
    setIsExporting(true)
    try {
      downloadAsStandaloneHtml(exportOptions)
      onExport?.({
        html: previewData?.html || '',
        filename: fileName.replace('.md', '.html'),
      })
      // Keep modal open so user can download again if needed
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }, [exportOptions, fileName, onExport, previewData])

  // Handle preview in new window
  const handlePreview = useCallback(() => {
    previewStandaloneHtml(exportOptions)
  }, [exportOptions])

  // Handle copy HTML to clipboard
  const handleCopyHtml = useCallback(async () => {
    if (!previewData?.html) return
    try {
      await navigator.clipboard.writeText(previewData.html)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }, [previewData])

  // Toggle setting
  const toggleSetting = useCallback((key: keyof ExportSettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }, [])

  // Update theme
  const setTheme = useCallback((theme: Theme) => {
    setSettings((prev) => ({ ...prev, theme }))
  }, [])

  // Handle close
  const handleClose = useCallback(() => {
    if (!isExporting) {
      onClose()
    }
  }, [isExporting, onClose])

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isExporting) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isExporting, handleClose])

  const title = metadata.title || fileName.replace('.md', '')

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          {...MODAL_ANIMATION.overlay}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Modal Content */}
          <motion.div
            className={cn(
              'relative z-10 w-full max-w-lg',
              'bg-white dark:bg-gray-900',
              'rounded-xl shadow-2xl',
              'border border-gray-200 dark:border-gray-800',
              'overflow-hidden'
            )}
            {...MODAL_ANIMATION.content}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-html-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <FileCode2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2
                    id="share-html-title"
                    className="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    Share as HTML
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Export standalone file
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isExporting}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-5">
              {/* Document Info */}
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                  {title}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    {previewData?.wordCount.toLocaleString() || '...'} words
                  </span>
                  {previewData && previewData.toc.length > 0 && (
                    <span>• {previewData.toc.length} sections</span>
                  )}
                </div>
              </div>

              {/* Theme Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Theme
                </label>
                <div className="flex gap-2">
                  {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg',
                        'text-sm font-medium transition-all',
                        'border',
                        settings.theme === value
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Include Table of Contents
                  </label>
                  <button
                    onClick={() => toggleSetting('includeToc')}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors',
                      settings.includeToc
                        ? 'bg-emerald-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    )}
                    role="switch"
                    aria-checked={settings.includeToc}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                        settings.includeToc ? 'left-[22px]' : 'left-0.5'
                      )}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Code copy buttons
                  </label>
                  <button
                    onClick={() => toggleSetting('includeCodeCopyButtons')}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors',
                      settings.includeCodeCopyButtons
                        ? 'bg-emerald-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    )}
                    role="switch"
                    aria-checked={settings.includeCodeCopyButtons}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                        settings.includeCodeCopyButtons ? 'left-[22px]' : 'left-0.5'
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Advanced Settings Toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={cn(
                  'flex items-center gap-2 text-sm',
                  'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                  'transition-colors'
                )}
              >
                <Settings2 className="w-4 h-4" />
                {showAdvanced ? 'Hide' : 'Show'} advanced options
              </button>

              {/* Advanced Settings */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 pt-2 pb-1">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700 dark:text-gray-300">
                          Print-friendly styles
                        </label>
                        <button
                          onClick={() => toggleSetting('includePrintStyles')}
                          className={cn(
                            'relative w-11 h-6 rounded-full transition-colors',
                            settings.includePrintStyles
                              ? 'bg-emerald-500'
                              : 'bg-gray-300 dark:bg-gray-600'
                          )}
                          role="switch"
                          aria-checked={settings.includePrintStyles}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                              settings.includePrintStyles ? 'left-[22px]' : 'left-0.5'
                            )}
                          />
                        </button>
                      </div>

                      {/* Size estimate */}
                      <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Estimated file size:</span>{' '}
                        {previewData
                          ? `~${Math.ceil(previewData.html.length / 1024)} KB`
                          : 'calculating...'}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Actions */}
            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                {/* Preview Button */}
                <button
                  onClick={handlePreview}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg',
                    'text-sm font-medium',
                    'border border-gray-200 dark:border-gray-700',
                    'bg-white dark:bg-gray-800',
                    'text-gray-700 dark:text-gray-300',
                    'hover:bg-gray-50 dark:hover:bg-gray-700',
                    'transition-colors'
                  )}
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>

                {/* Copy HTML Button */}
                <button
                  onClick={handleCopyHtml}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg',
                    'text-sm font-medium',
                    'border border-gray-200 dark:border-gray-700',
                    'bg-white dark:bg-gray-800',
                    'text-gray-700 dark:text-gray-300',
                    'hover:bg-gray-50 dark:hover:bg-gray-700',
                    'transition-colors'
                  )}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied ? 'Copied!' : 'Copy'}
                </button>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Download Button */}
                <button
                  onClick={handleDownload}
                  disabled={isExporting}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-lg',
                    'text-sm font-semibold',
                    'bg-emerald-600 hover:bg-emerald-700',
                    'text-white',
                    'transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download HTML
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ShareHtmlModal




