/**
 * Canvas Export Modal - Preview and export canvas content as strand
 * @module codex/ui/CanvasExportModal
 *
 * @remarks
 * Modal for previewing and exporting tldraw canvas content:
 * - Preview of generated markdown
 * - Asset list with sizes
 * - Editable title and tags
 * - Export options
 * - "Open in Editor" button
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  FileText,
  Mic,
  Image,
  Download,
  Edit3,
  Tag,
  Check,
  Loader2,
  PenTool,
  Volume2,
  File,
} from 'lucide-react'
import type { Editor } from '@tldraw/tldraw'
import {
  canvasToMarkdown,
  getCanvasSummary,
  type CanvasExportResult,
  type CanvasExportMetadata,
} from './canvasToMarkdown'
import { useHaptics } from '../../hooks/useHaptics'
import type { ThemeName } from '@/types/theme'

interface CanvasExportModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** tldraw Editor instance */
  editor: Editor | null
  /** Export complete callback with result */
  onExport: (result: CanvasExportResult) => void
  /** Current theme */
  theme?: ThemeName
}

/**
 * Modal for previewing and exporting canvas content
 *
 * @example
 * ```tsx
 * // Basic usage
 * <CanvasExportModal
 *   isOpen={exportOpen}
 *   onClose={() => setExportOpen(false)}
 *   editor={editorRef.current}
 *   onExport={(result) => {
 *     // Save the markdown strand
 *     saveStrand(result.markdown, result.frontmatter)
 *
 *     // Save any assets (audio, images, etc)
 *     result.assets.forEach(async (asset) => {
 *       if (asset.blob) {
 *         await saveAsset(asset.path, asset.blob)
 *       }
 *     })
 *   }}
 *   theme="dark"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With useCanvasExport hook
 * import { useCanvasExport } from '@/components/quarry/hooks/useCanvasExport'
 *
 * function MyComponent() {
 *   const { modalProps, openModal, isExporting } = useCanvasExport({
 *     editor,
 *     onExportComplete: (result) => console.log('Exported:', result),
 *   })
 *
 *   return (
 *     <>
 *       <button onClick={openModal}>Export</button>
 *       <CanvasExportModal {...modalProps} />
 *     </>
 *   )
 * }
 * ```
 */
export default function CanvasExportModal({
  isOpen,
  onClose,
  editor,
  onExport,
  theme = 'light',
}: CanvasExportModalProps) {
  const [title, setTitle] = useState('Canvas Export')
  const [tags, setTags] = useState<string[]>(['canvas', 'notes'])
  const [tagInput, setTagInput] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState<CanvasExportResult | null>(null)
  const [summary, setSummary] = useState<CanvasExportMetadata | null>(null)

  const { haptic } = useHaptics()
  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')

  // Get canvas summary when modal opens
  useEffect(() => {
    if (isOpen && editor) {
      const canvasSummary = getCanvasSummary(editor)
      setSummary(canvasSummary)

      // Auto-generate title based on content
      if (canvasSummary.hasVoiceNotes && !canvasSummary.hasTranscripts) {
        setTitle('Voice Notes')
      } else if (canvasSummary.hasTranscripts) {
        setTitle('Transcripts & Notes')
      } else if (canvasSummary.hasDrawings) {
        setTitle('Canvas Drawings')
      }
    }
  }, [isOpen, editor])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setExportResult(null)
      setIsExporting(false)
    }
  }, [isOpen])

  // Handle export
  const handleExport = useCallback(async () => {
    if (!editor) return

    haptic('medium')
    setIsExporting(true)

    try {
      const result = await canvasToMarkdown(editor, {
        title,
        tags,
        includeDrawings: true,
        groupBy: 'type',
      })

      setExportResult(result)
      onExport(result)
      haptic('success')
    } catch (error) {
      console.error('Export failed:', error)
      haptic('error')
    } finally {
      setIsExporting(false)
    }
  }, [editor, title, tags, haptic, onExport])

  // Handle tag input
  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim().replace(/^#/, '')
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag])
      setTagInput('')
      haptic('light')
    }
  }, [tagInput, tags, haptic])

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      setTags((prev) => prev.filter((t) => t !== tagToRemove))
      haptic('light')
    },
    [haptic]
  )

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddTag()
      }
    },
    [handleAddTag]
  )

  // Theme classes
  const bgClasses = isTerminal
    ? isDark
      ? 'bg-black border-green-500/30'
      : 'bg-zinc-900 border-amber-500/30'
    : isDark
      ? 'bg-zinc-900 border-zinc-700'
      : 'bg-white border-zinc-200'

  const textClasses = isTerminal
    ? isDark
      ? 'text-green-300'
      : 'text-amber-300'
    : isDark
      ? 'text-zinc-100'
      : 'text-zinc-900'

  const mutedClasses = isTerminal
    ? isDark
      ? 'text-green-500/70'
      : 'text-amber-500/70'
    : isDark
      ? 'text-zinc-400'
      : 'text-zinc-500'

  const inputClasses = isTerminal
    ? isDark
      ? 'bg-green-950/30 border-green-500/30 text-green-300 placeholder:text-green-500/50'
      : 'bg-amber-950/30 border-amber-500/30 text-amber-300 placeholder:text-amber-500/50'
    : isDark
      ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
      : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400'

  const buttonPrimaryClasses = isTerminal
    ? isDark
      ? 'bg-green-600 hover:bg-green-500 text-black'
      : 'bg-amber-500 hover:bg-amber-400 text-black'
    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`
              fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2
              md:w-full md:max-w-2xl md:max-h-[80vh]
              z-[201] rounded-2xl shadow-2xl border overflow-hidden
              ${bgClasses}
              flex flex-col
            `}
          >
            {/* Header */}
            <div
              className={`
              flex items-center justify-between px-6 py-4 border-b
              ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
            `}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`
                  p-2 rounded-lg
                  ${isTerminal
                    ? isDark ? 'bg-green-950' : 'bg-amber-950'
                    : isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                  }
                `}
                >
                  <PenTool
                    className={`w-5 h-5 ${
                      isTerminal
                        ? isDark ? 'text-green-400' : 'text-amber-500'
                        : 'text-cyan-500'
                    }`}
                  />
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${textClasses}`}>
                    Export Canvas as Strand
                  </h2>
                  <p className={`text-sm ${mutedClasses}`}>
                    Convert your whiteboard content to markdown
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`
                  p-2 rounded-lg transition-colors
                  ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}
                `}
              >
                <X className={`w-5 h-5 ${mutedClasses}`} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Canvas Summary */}
              {summary && (
                <div
                  className={`
                  p-4 rounded-xl border
                  ${isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'}
                `}
                >
                  <h3 className={`text-sm font-medium mb-3 ${textClasses}`}>
                    Canvas Contents
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Voice Notes */}
                    <div
                      className={`
                      flex items-center gap-2 p-2 rounded-lg
                      ${isDark ? 'bg-zinc-900' : 'bg-white'}
                    `}
                    >
                      <Mic className="w-4 h-4 text-red-500" />
                      <div>
                        <div className={`text-sm font-medium ${textClasses}`}>
                          {summary.shapeCounts.voicenotes}
                        </div>
                        <div className={`text-xs ${mutedClasses}`}>Voice Notes</div>
                      </div>
                    </div>

                    {/* Transcripts */}
                    <div
                      className={`
                      flex items-center gap-2 p-2 rounded-lg
                      ${isDark ? 'bg-zinc-900' : 'bg-white'}
                    `}
                    >
                      <FileText className="w-4 h-4 text-purple-500" />
                      <div>
                        <div className={`text-sm font-medium ${textClasses}`}>
                          {summary.shapeCounts.transcripts}
                        </div>
                        <div className={`text-xs ${mutedClasses}`}>Transcripts</div>
                      </div>
                    </div>

                    {/* Attachments */}
                    <div
                      className={`
                      flex items-center gap-2 p-2 rounded-lg
                      ${isDark ? 'bg-zinc-900' : 'bg-white'}
                    `}
                    >
                      <Image className="w-4 h-4 text-green-500" />
                      <div>
                        <div className={`text-sm font-medium ${textClasses}`}>
                          {summary.shapeCounts.attachments}
                        </div>
                        <div className={`text-xs ${mutedClasses}`}>Attachments</div>
                      </div>
                    </div>

                    {/* Drawings */}
                    <div
                      className={`
                      flex items-center gap-2 p-2 rounded-lg
                      ${isDark ? 'bg-zinc-900' : 'bg-white'}
                    `}
                    >
                      <PenTool className="w-4 h-4 text-cyan-500" />
                      <div>
                        <div className={`text-sm font-medium ${textClasses}`}>
                          {summary.shapeCounts.drawings}
                        </div>
                        <div className={`text-xs ${mutedClasses}`}>Drawings</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Title Input */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${textClasses}`}
                >
                  Strand Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter title..."
                  className={`
                    w-full px-4 py-2.5 rounded-lg border
                    focus:outline-none focus:ring-2 focus:ring-cyan-500/50
                    ${inputClasses}
                  `}
                />
              </div>

              {/* Tags */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${textClasses}`}
                >
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className={`
                        inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                        ${isTerminal
                          ? isDark
                            ? 'bg-green-950 text-green-300'
                            : 'bg-amber-950 text-amber-300'
                          : isDark
                            ? 'bg-cyan-900/30 text-cyan-300'
                            : 'bg-cyan-100 text-cyan-700'
                        }
                      `}
                    >
                      #{tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:opacity-70"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Add tag..."
                    className={`
                      flex-1 px-4 py-2 rounded-lg border
                      focus:outline-none focus:ring-2 focus:ring-cyan-500/50
                      ${inputClasses}
                    `}
                  />
                  <button
                    onClick={handleAddTag}
                    className={`
                      px-4 py-2 rounded-lg font-medium transition-colors
                      ${isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                      }
                    `}
                  >
                    <Tag className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Preview (if exported) */}
              {exportResult && (
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${textClasses}`}
                  >
                    Markdown Preview
                  </label>
                  <div
                    className={`
                      p-4 rounded-lg border font-mono text-sm
                      max-h-48 overflow-y-auto
                      ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}
                    `}
                  >
                    <pre className={`whitespace-pre-wrap ${mutedClasses}`}>
                      {exportResult.markdown.substring(0, 1000)}
                      {exportResult.markdown.length > 1000 && '...'}
                    </pre>
                  </div>
                </div>
              )}

              {/* Assets list (if exported) */}
              {exportResult && exportResult.assets.length > 0 && (
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${textClasses}`}
                  >
                    Assets ({exportResult.assets.length})
                  </label>
                  <div className="space-y-2">
                    {exportResult.assets.map((asset, i) => (
                      <div
                        key={i}
                        className={`
                          flex items-center gap-3 p-3 rounded-lg
                          ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}
                        `}
                      >
                        {asset.type === 'audio' ? (
                          <Volume2 className="w-4 h-4 text-red-500" />
                        ) : asset.type === 'image' ? (
                          <Image className="w-4 h-4 text-green-500" />
                        ) : asset.type === 'drawing' ? (
                          <PenTool className="w-4 h-4 text-cyan-500" />
                        ) : (
                          <File className="w-4 h-4 text-blue-500" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm truncate ${textClasses}`}>
                            {asset.filename}
                          </div>
                          <div className={`text-xs ${mutedClasses}`}>
                            {asset.path}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className={`
              flex items-center justify-end gap-3 px-6 py-4 border-t
              ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
            `}
            >
              <button
                onClick={onClose}
                className={`
                  px-4 py-2.5 rounded-lg font-medium transition-colors
                  ${isDark
                    ? 'hover:bg-zinc-800 text-zinc-300'
                    : 'hover:bg-zinc-100 text-zinc-700'
                  }
                `}
              >
                Cancel
              </button>
              {!exportResult ? (
                <button
                  onClick={handleExport}
                  disabled={isExporting || !summary?.shapeCount}
                  className={`
                    flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium
                    shadow-lg transition-all
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${buttonPrimaryClasses}
                  `}
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export as Strand
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className={`
                    flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium
                    shadow-lg transition-all
                    ${buttonPrimaryClasses}
                  `}
                >
                  <Check className="w-4 h-4" />
                  Done
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
