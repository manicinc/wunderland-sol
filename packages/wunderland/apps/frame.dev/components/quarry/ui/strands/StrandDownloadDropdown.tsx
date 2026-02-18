/**
 * Advanced Strand Export Dropdown
 * @module codex/ui/StrandDownloadDropdown
 *
 * @description
 * Comprehensive export options for strands:
 * - Markdown (.md) - raw file
 * - Plain Text (.txt) - stripped markdown
 * - JSON (.json) - structured data
 * - PDF (.pdf) - printable document
 * - ZIP Bundle - complete package with assets
 * - View on GitHub (conditional)
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Download,
  ExternalLink,
  FileText,
  FileJson,
  FileArchive,
  Printer,
  ChevronRight,
  Loader2,
  Check,
  Package,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { StrandMetadata, GitHubFile } from '../../types'
import {
  downloadAsMarkdown,
  downloadAsText,
  downloadAsJSON,
  downloadAsDocx,
  downloadAsZipBundle,
  triggerPrintForPDF,
  type StrandExportOptions,
} from '@/lib/export/strandExporter'

interface StrandDownloadDropdownProps {
  /** File path of the strand */
  filePath: string
  /** File name */
  fileName: string
  /** Current theme */
  theme?: string
  /** GitHub repo owner */
  owner?: string
  /** GitHub repo name */
  repo?: string
  /** GitHub branch */
  branch?: string
  /** Whether to show GitHub options (only for GitHub backend) */
  showGitHubOptions?: boolean
  /** Raw markdown content (required for advanced exports) */
  content?: string
  /** Parsed frontmatter metadata */
  metadata?: StrandMetadata
  /** All files for resolving related strands */
  allFiles?: GitHubFile[]
  /** Rendered HTML content for PDF export */
  renderedHtml?: string
}

type ExportStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Advanced Export Dropdown for Strands
 */
export default function StrandDownloadDropdown({
  filePath,
  fileName,
  theme = 'light',
  owner = 'framersai',
  repo = 'codex',
  branch = 'master',
  showGitHubOptions = false,
  content = '',
  metadata = {},
  allFiles = [],
  renderedHtml,
}: StrandDownloadDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isDark = theme.includes('dark')

  // GitHub URLs
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`
  const githubUrl = `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`

  // Build export options
  const exportOptions: StrandExportOptions = {
    filePath,
    fileName,
    content,
    metadata,
    allFiles,
    github: { owner, repo, branch },
  }

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  // Reset status after success
  useEffect(() => {
    if (exportStatus === 'success') {
      const timer = setTimeout(() => {
        setExportStatus('idle')
        setStatusMessage('')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [exportStatus])

  const handleExport = useCallback(
    async (type: 'md' | 'txt' | 'json' | 'pdf' | 'docx' | 'zip') => {
      if (!content && type !== 'md') {
        setExportStatus('error')
        setStatusMessage('No content available')
        return
      }

      setExportStatus('loading')

      try {
        switch (type) {
          case 'md':
            // Direct download from GitHub raw
            const link = document.createElement('a')
            link.href = rawUrl
            link.download = fileName
            link.click()
            break

          case 'txt':
            downloadAsText(exportOptions)
            break

          case 'json':
            downloadAsJSON(exportOptions)
            break

          case 'pdf':
            triggerPrintForPDF(exportOptions, renderedHtml)
            break

          case 'docx':
            setStatusMessage('Creating document...')
            await downloadAsDocx(exportOptions)
            break

          case 'zip':
            setStatusMessage('Creating bundle...')
            await downloadAsZipBundle(exportOptions, (msg, _percent) => {
              setStatusMessage(msg)
            })
            break
        }

        setExportStatus('success')
        setStatusMessage('Downloaded!')

        // Close dropdown after short delay for non-PDF exports
        if (type !== 'pdf') {
          setTimeout(() => setIsOpen(false), 500)
        }
      } catch (err) {
        console.error('Export failed:', err)
        setExportStatus('error')
        setStatusMessage('Export failed')
      }
    },
    [content, exportOptions, fileName, rawUrl, renderedHtml]
  )

  const handleViewOnGitHub = () => {
    window.open(githubUrl, '_blank', 'noopener,noreferrer')
    setIsOpen(false)
  }

  // Minimal export icon
  const ExportIcon = () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button - Minimal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-center
          w-8 h-8 rounded-md
          transition-all duration-150
          active:scale-95
          ${
            isOpen
              ? isDark
                ? 'bg-zinc-700 text-zinc-100'
                : 'bg-zinc-200 text-zinc-900'
              : isDark
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'
          }
        `}
        aria-label="Export"
        aria-expanded={isOpen}
        title="Export"
      >
        {exportStatus === 'loading' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : exportStatus === 'success' ? (
          <Check className="w-4 h-4 text-emerald-500" />
        ) : (
          <ExportIcon />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className={`
              absolute right-0 mt-1.5 w-48 rounded-lg shadow-xl border z-50
              ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}
            `}
          >
            {/* Status message */}
            {statusMessage && (
              <div
                className={`
                px-3 py-1.5 text-[10px] font-medium border-b
                ${
                  exportStatus === 'error'
                    ? isDark
                      ? 'bg-red-900/30 text-red-300 border-red-800'
                      : 'bg-red-50 text-red-600 border-red-200'
                    : isDark
                      ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      : 'bg-zinc-50 text-zinc-500 border-zinc-200'
                }
              `}
              >
                {statusMessage}
              </div>
            )}

            {/* Download Section */}
            <div className="p-1">
              <div
                className={`px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
              >
                Download
              </div>

              <ExportButton
                icon={<FileText className="w-3.5 h-3.5" />}
                label="Markdown"
                hint=".md"
                onClick={() => handleExport('md')}
                isDark={isDark}
              />

              <ExportButton
                icon={<FileText className="w-3.5 h-3.5" />}
                label="Plain Text"
                hint=".txt"
                onClick={() => handleExport('txt')}
                isDark={isDark}
                disabled={!content}
              />

              <ExportButton
                icon={<FileJson className="w-3.5 h-3.5" />}
                label="JSON"
                hint=".json"
                onClick={() => handleExport('json')}
                isDark={isDark}
                disabled={!content}
              />

              <ExportButton
                icon={<FileText className="w-3.5 h-3.5" />}
                label="Word Document"
                hint=".docx"
                onClick={() => handleExport('docx')}
                isDark={isDark}
                disabled={!content}
              />

              <ExportButton
                icon={<Printer className="w-3.5 h-3.5" />}
                label="Print / PDF"
                hint="⌘P"
                onClick={() => handleExport('pdf')}
                isDark={isDark}
                disabled={!content}
              />
            </div>

            {/* Bundle Section */}
            <div className={`border-t p-1 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
              <div
                className={`px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
              >
                Bundle
              </div>

              <ExportButton
                icon={<Package className="w-3.5 h-3.5" />}
                label="ZIP Bundle"
                hint="All assets"
                onClick={() => handleExport('zip')}
                isDark={isDark}
                disabled={!content}
                accent
              />
            </div>

            {/* GitHub Section - Only shown for GitHub backend */}
            {showGitHubOptions && (
              <div className={`border-t p-1 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
                <ExportButton
                  icon={<ExternalLink className="w-3.5 h-3.5" />}
                  label="View on GitHub"
                  onClick={handleViewOnGitHub}
                  isDark={isDark}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// EXPORT BUTTON COMPONENT
// ============================================================================

interface ExportButtonProps {
  icon: React.ReactNode
  label: string
  hint?: string
  onClick: () => void
  isDark: boolean
  disabled?: boolean
  accent?: boolean
}

function ExportButton({ icon, label, hint, onClick, isDark, disabled, accent }: ExportButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs
        transition-colors
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
        ${
          accent
            ? isDark
              ? 'hover:bg-purple-900/30 text-purple-300'
              : 'hover:bg-purple-50 text-purple-700'
            : isDark
              ? 'hover:bg-zinc-800 text-zinc-200'
              : 'hover:bg-zinc-100 text-zinc-700'
        }
      `}
    >
      <span className={accent ? 'text-purple-500' : isDark ? 'text-zinc-400' : 'text-zinc-500'}>
        {icon}
      </span>
      <span className="flex-1 font-medium">{label}</span>
      {hint && (
        <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{hint}</span>
      )}
    </button>
  )
}
