/**
 * Ask Interface Enhancements
 *
 * Additional features for the UnifiedAskInterface:
 * - Multi-strand context picker (compact inline version)
 * - File/image upload with drag-drop
 * - RAG mode toggle (re-rank vs synthesize)
 * - Citation UI components
 *
 * @module components/quarry/ui/AskEnhancements
 */

'use client'

import React, { useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Image,
  Upload,
  X,
  Layers,
  ChevronDown,
  Check,
  Sparkles,
  Zap,
  BookOpen,
  ExternalLink,
  Paperclip,
  File,
  FileImage,
  FileScan,
  Trash2,
  Plus,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RAGMode } from '@/lib/ai/types'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface UploadedFile {
  id: string
  name: string
  type: 'image' | 'pdf' | 'text' | 'other'
  size: number
  preview?: string // Data URL for images
  content?: string // Extracted text content
}

export interface ContextStrand {
  id: string
  title: string
  path: string
  wordCount?: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   MULTI-STRAND CONTEXT PICKER (Compact)
═══════════════════════════════════════════════════════════════════════════ */

interface ContextPickerProps {
  selectedStrands: ContextStrand[]
  availableStrands: ContextStrand[]
  onAdd: (strand: ContextStrand) => void
  onRemove: (strandId: string) => void
  onClear: () => void
  onOpenFullPicker?: () => void
  isDark: boolean
  maxDisplay?: number
}

export function ContextPicker({
  selectedStrands,
  availableStrands,
  onAdd,
  onRemove,
  onClear,
  onOpenFullPicker,
  isDark,
  maxDisplay = 3,
}: ContextPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredStrands = useMemo(() => {
    const selectedIds = new Set(selectedStrands.map((s) => s.id))
    return availableStrands
      .filter((s) => !selectedIds.has(s.id))
      .filter(
        (s) =>
          !search ||
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.path.toLowerCase().includes(search.toLowerCase())
      )
      .slice(0, 10)
  }, [availableStrands, selectedStrands, search])

  const displayedStrands = selectedStrands.slice(0, maxDisplay)
  const remainingCount = selectedStrands.length - maxDisplay

  return (
    <div className="relative">
      {/* Selected strands display */}
      <div className="flex flex-wrap items-center gap-1.5">
        {selectedStrands.length === 0 ? (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors',
              isDark
                ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 border border-zinc-200'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            Add context strands
            <ChevronDown className="w-3 h-3" />
          </button>
        ) : (
          <>
            {displayedStrands.map((strand) => (
              <div
                key={strand.id}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs',
                  isDark
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'bg-violet-100 text-violet-700 border border-violet-200'
                )}
              >
                <FileText className="w-3 h-3" />
                <span className="max-w-[120px] truncate">{strand.title}</span>
                <button
                  onClick={() => onRemove(strand.id)}
                  className={cn(
                    'p-0.5 rounded hover:bg-black/10',
                    isDark ? 'hover:bg-white/10' : ''
                  )}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {remainingCount > 0 && (
              <span
                className={cn(
                  'px-2 py-1 rounded-lg text-xs',
                  isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
                )}
              >
                +{remainingCount} more
              </span>
            )}

            <button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                isDark
                  ? 'hover:bg-zinc-800 text-zinc-400'
                  : 'hover:bg-zinc-100 text-zinc-500'
              )}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            {selectedStrands.length > 0 && (
              <button
                onClick={onClear}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  isDark
                    ? 'hover:bg-zinc-800 text-zinc-400 hover:text-red-400'
                    : 'hover:bg-zinc-100 text-zinc-500 hover:text-red-500'
                )}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
              'absolute left-0 top-full mt-2 w-72 rounded-xl border shadow-xl z-50',
              isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
            )}
          >
            {/* Search */}
            <div className={cn('p-2 border-b', isDark ? 'border-zinc-800' : 'border-zinc-100')}>
              <div
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-lg',
                  isDark ? 'bg-zinc-800' : 'bg-zinc-50'
                )}
              >
                <Search className={cn('w-3.5 h-3.5', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search strands..."
                  className={cn(
                    'flex-1 bg-transparent text-xs outline-none',
                    isDark ? 'text-white placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'
                  )}
                  autoFocus
                />
              </div>
            </div>

            {/* Strand list */}
            <div className="max-h-48 overflow-y-auto p-1">
              {filteredStrands.length === 0 ? (
                <p className={cn('text-xs text-center py-4', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                  No strands found
                </p>
              ) : (
                filteredStrands.map((strand) => (
                  <button
                    key={strand.id}
                    onClick={() => {
                      onAdd(strand)
                      setSearch('')
                    }}
                    className={cn(
                      'w-full flex items-start gap-2 p-2 rounded-lg text-left transition-colors',
                      isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
                    )}
                  >
                    <FileText className={cn('w-4 h-4 mt-0.5', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium truncate', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
                        {strand.title}
                      </p>
                      <p className={cn('text-xs truncate', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                        {strand.path}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            {onOpenFullPicker && (
              <div className={cn('p-2 border-t', isDark ? 'border-zinc-800' : 'border-zinc-100')}>
                <button
                  onClick={() => {
                    setIsOpen(false)
                    onOpenFullPicker()
                  }}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    isDark
                      ? 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30'
                      : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                  )}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Open full picker
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop to close dropdown */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   FILE UPLOAD ZONE
═══════════════════════════════════════════════════════════════════════════ */

interface FileUploadZoneProps {
  files: UploadedFile[]
  onFilesAdd: (files: UploadedFile[]) => void
  onFileRemove: (fileId: string) => void
  onClear: () => void
  isDark: boolean
  maxFiles?: number
  acceptedTypes?: string[]
}

export function FileUploadZone({
  files,
  onFilesAdd,
  onFileRemove,
  onClear,
  isDark,
  maxFiles = 5,
  acceptedTypes = ['image/*', 'application/pdf', 'text/*'],
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const processFiles = useCallback(
    async (fileList: FileList) => {
      const newFiles: UploadedFile[] = []

      for (let i = 0; i < Math.min(fileList.length, maxFiles - files.length); i++) {
        const file = fileList[i]
        const id = `file_${Date.now()}_${i}`

        let type: UploadedFile['type'] = 'other'
        if (file.type.startsWith('image/')) type = 'image'
        else if (file.type === 'application/pdf') type = 'pdf'
        else if (file.type.startsWith('text/')) type = 'text'

        const uploadedFile: UploadedFile = {
          id,
          name: file.name,
          type,
          size: file.size,
        }

        // Generate preview for images
        if (type === 'image') {
          uploadedFile.preview = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(file)
          })
        }

        // Extract text content for text files
        if (type === 'text') {
          uploadedFile.content = await file.text()
        }

        newFiles.push(uploadedFile)
      }

      if (newFiles.length > 0) {
        onFilesAdd(newFiles)
      }
    },
    [files.length, maxFiles, onFilesAdd]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files)
      }
    },
    [processFiles]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files)
        e.target.value = '' // Reset input
      }
    },
    [processFiles]
  )

  const getFileIcon = (type: UploadedFile['type']) => {
    switch (type) {
      case 'image':
        return FileImage
      case 'pdf':
        return FileScan
      case 'text':
        return FileText
      default:
        return File
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (files.length === 0) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-all',
          isDragging
            ? isDark
              ? 'border-violet-500 bg-violet-500/10'
              : 'border-violet-400 bg-violet-50'
            : isDark
              ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
              : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50'
        )}
      >
        <Paperclip className={cn('w-4 h-4', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
        <span className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
          Drop files or click to attach (images, PDFs, text)
        </span>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* File list */}
      <div className="flex flex-wrap gap-2">
        {files.map((file) => {
          const Icon = getFileIcon(file.type)
          return (
            <div
              key={file.id}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-lg',
                isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-zinc-100 border border-zinc-200'
              )}
            >
              {file.preview ? (
                <img src={file.preview} alt="" className="w-6 h-6 rounded object-cover" />
              ) : (
                <Icon className={cn('w-4 h-4', isDark ? 'text-zinc-400' : 'text-zinc-500')} />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn('text-xs font-medium truncate max-w-[100px]', isDark ? 'text-zinc-200' : 'text-zinc-700')}>
                  {file.name}
                </p>
                <p className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                onClick={() => onFileRemove(file.id)}
                className={cn(
                  'p-1 rounded transition-colors',
                  isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
                )}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )
        })}

        {files.length < maxFiles && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 border-dashed transition-colors',
              isDark
                ? 'border-zinc-700 hover:border-zinc-600 text-zinc-400'
                : 'border-zinc-200 hover:border-zinc-300 text-zinc-500'
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-xs">Add</span>
          </button>
        )}
      </div>

      {/* Clear all */}
      {files.length > 1 && (
        <button
          onClick={onClear}
          className={cn('text-xs transition-colors', isDark ? 'text-zinc-500 hover:text-red-400' : 'text-zinc-400 hover:text-red-500')}
        >
          Clear all attachments
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   RAG MODE TOGGLE
═══════════════════════════════════════════════════════════════════════════ */

interface RAGModeToggleProps {
  mode: RAGMode
  onModeChange: (mode: RAGMode) => void
  isDark: boolean
  isAvailable: boolean
}

export function RAGModeToggle({ mode, onModeChange, isDark, isAvailable }: RAGModeToggleProps) {
  const modes: { id: RAGMode; label: string; icon: typeof Zap; desc: string }[] = [
    { id: 'local', label: 'Local', icon: Zap, desc: 'Fast local search' },
    { id: 'rerank', label: 'Re-rank', icon: Sparkles, desc: 'AI-sorted results' },
    { id: 'synthesize', label: 'Synthesize', icon: BookOpen, desc: 'AI-generated answer' },
  ]

  return (
    <div className="flex items-center gap-1">
      {modes.map((m) => {
        const Icon = m.icon
        const isActive = mode === m.id
        const isDisabled = !isAvailable && m.id !== 'local'

        return (
          <button
            key={m.id}
            onClick={() => !isDisabled && onModeChange(m.id)}
            disabled={isDisabled}
            title={isDisabled ? 'API key required' : m.desc}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
              isActive
                ? isDark
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'bg-violet-100 text-violet-700 border border-violet-200'
                : isDisabled
                  ? isDark
                    ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                    : 'bg-zinc-100/50 text-zinc-400 cursor-not-allowed'
                  : isDark
                    ? 'hover:bg-zinc-800 text-zinc-400'
                    : 'hover:bg-zinc-100 text-zinc-500'
            )}
          >
            <Icon className="w-3 h-3" />
            {m.label}
          </button>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CITATION CARD
═══════════════════════════════════════════════════════════════════════════ */

interface CitationCardProps {
  index: number
  title: string
  path: string
  snippet: string
  relevance?: number
  onOpen?: () => void
  isDark: boolean
}

export function CitationCard({ index, title, path, snippet, relevance, onOpen, isDark }: CitationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
        isDark ? 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
      )}
      onClick={onOpen}
    >
      {/* Index badge */}
      <div
        className={cn(
          'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
          isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700'
        )}
      >
        {index}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className={cn('text-sm font-medium truncate', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
              {title}
            </h4>
            <p className={cn('text-xs truncate', isDark ? 'text-zinc-500' : 'text-zinc-400')}>{path}</p>
          </div>
          {relevance !== undefined && (
            <span
              className={cn(
                'flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium',
                relevance >= 80
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : relevance >= 60
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-zinc-500/20 text-zinc-400'
              )}
            >
              {relevance}%
            </span>
          )}
        </div>

        {/* Snippet */}
        <p className={cn('text-xs mt-1.5 line-clamp-2', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
          {snippet}
        </p>
      </div>

      {/* Open icon */}
      <ExternalLink className={cn('w-4 h-4 flex-shrink-0', isDark ? 'text-zinc-600' : 'text-zinc-300')} />
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CITATIONS LIST
═══════════════════════════════════════════════════════════════════════════ */

interface CitationsListProps {
  citations: Array<{
    index: number
    title: string
    path: string
    snippet: string
    relevance?: number
  }>
  onOpenCitation?: (path: string) => void
  isDark: boolean
}

export function CitationsList({ citations, onOpenCitation, isDark }: CitationsListProps) {
  if (citations.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <BookOpen className={cn('w-4 h-4', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
        <h3 className={cn('text-xs font-medium uppercase tracking-wider', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          Sources ({citations.length})
        </h3>
      </div>

      <div className="space-y-2">
        {citations.map((citation) => (
          <CitationCard
            key={citation.index}
            {...citation}
            onOpen={() => onOpenCitation?.(citation.path)}
            isDark={isDark}
          />
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   INLINE CITATION
═══════════════════════════════════════════════════════════════════════════ */

interface InlineCitationProps {
  index: number
  title: string
  snippet: string
  onClick?: () => void
  isDark: boolean
}

export function InlineCitation({ index, title, snippet, onClick, isDark }: InlineCitationProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <span className="relative inline-block">
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-bold transition-colors',
          isDark
            ? 'bg-violet-500/30 text-violet-300 hover:bg-violet-500/50'
            : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
        )}
      >
        {index}
      </button>

      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className={cn(
              'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-lg shadow-xl z-50',
              isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'
            )}
          >
            <p className={cn('text-xs font-medium mb-1', isDark ? 'text-zinc-200' : 'text-zinc-800')}>{title}</p>
            <p className={cn('text-xs line-clamp-3', isDark ? 'text-zinc-400' : 'text-zinc-500')}>{snippet}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}
