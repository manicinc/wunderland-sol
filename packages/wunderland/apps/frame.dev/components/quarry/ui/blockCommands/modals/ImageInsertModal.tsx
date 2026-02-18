/**
 * ImageInsertModal - Modal for inserting images via URL or file upload
 * @module quarry/ui/blockCommands/modals/ImageInsertModal
 */

'use client'

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Image, Link, Upload, AlertCircle } from 'lucide-react'

export interface ImageInsertModalProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (markdown: string) => void
  isDark: boolean
}

type InsertMode = 'url' | 'upload'

export function ImageInsertModal({
  isOpen,
  onClose,
  onInsert,
  isDark,
}: ImageInsertModalProps) {
  const [mode, setMode] = useState<InsertMode>('url')
  const [url, setUrl] = useState('')
  const [altText, setAltText] = useState('')
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleInsertUrl = useCallback(() => {
    if (!url.trim()) {
      setError('Please enter an image URL')
      return
    }

    // Basic URL validation
    try {
      new URL(url)
    } catch {
      setError('Please enter a valid URL')
      return
    }

    const alt = altText.trim() || 'Image'
    const markdown = `![${alt}](${url.trim()})`
    onInsert(markdown)
    onClose()
  }, [url, altText, onInsert, onClose])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      // For now, create a data URL (in production, you'd upload to a server)
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const alt = altText.trim() || file.name.replace(/\.[^/.]+$/, '')
        const markdown = `![${alt}](${dataUrl})`
        onInsert(markdown)
        onClose()
      }
      reader.onerror = () => {
        setError('Failed to read file')
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setError('Failed to process image')
      setIsUploading(false)
    }
  }, [altText, onInsert, onClose])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && fileInputRef.current) {
      const dt = new DataTransfer()
      dt.items.add(file)
      fileInputRef.current.files = dt.files
      handleFileSelect({ target: fileInputRef.current } as any)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 28,
          }}
          className={[
            'relative z-10 w-full max-w-md rounded-xl shadow-2xl border p-6',
            isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200',
          ].join(' ')}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={[
                'w-10 h-10 rounded-lg flex items-center justify-center',
                isDark ? 'bg-emerald-500/20' : 'bg-emerald-100',
              ].join(' ')}>
                <Image className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h3 className={[
                  'text-lg font-semibold',
                  isDark ? 'text-white' : 'text-zinc-900',
                ].join(' ')}>
                  Insert Image
                </h3>
                <p className={[
                  'text-sm',
                  isDark ? 'text-zinc-400' : 'text-zinc-500',
                ].join(' ')}>
                  Add via URL or upload
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={[
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500',
              ].join(' ')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode tabs */}
          <div className={[
            'flex rounded-lg p-1 mb-6',
            isDark ? 'bg-zinc-900' : 'bg-zinc-100',
          ].join(' ')}>
            <button
              onClick={() => { setMode('url'); setError('') }}
              className={[
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors',
                mode === 'url'
                  ? isDark
                    ? 'bg-zinc-700 text-white'
                    : 'bg-white text-zinc-900 shadow-sm'
                  : isDark
                    ? 'text-zinc-400 hover:text-zinc-300'
                    : 'text-zinc-600 hover:text-zinc-900',
              ].join(' ')}
            >
              <Link className="w-4 h-4" />
              URL
            </button>
            <button
              onClick={() => { setMode('upload'); setError('') }}
              className={[
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors',
                mode === 'upload'
                  ? isDark
                    ? 'bg-zinc-700 text-white'
                    : 'bg-white text-zinc-900 shadow-sm'
                  : isDark
                    ? 'text-zinc-400 hover:text-zinc-300'
                    : 'text-zinc-600 hover:text-zinc-900',
              ].join(' ')}
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          </div>

          {/* URL mode */}
          {mode === 'url' && (
            <div className="space-y-4 mb-6">
              <div>
                <label className={[
                  'block text-sm font-medium mb-2',
                  isDark ? 'text-zinc-300' : 'text-zinc-700',
                ].join(' ')}>
                  Image URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setError('') }}
                  placeholder="https://example.com/image.png"
                  className={[
                    'w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors',
                    isDark
                      ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 focus:border-cyan-500'
                      : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-cyan-500',
                  ].join(' ')}
                />
              </div>
              <div>
                <label className={[
                  'block text-sm font-medium mb-2',
                  isDark ? 'text-zinc-300' : 'text-zinc-700',
                ].join(' ')}>
                  Alt text (optional)
                </label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Description of the image"
                  className={[
                    'w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors',
                    isDark
                      ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 focus:border-cyan-500'
                      : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-cyan-500',
                  ].join(' ')}
                />
              </div>
            </div>
          )}

          {/* Upload mode */}
          {mode === 'upload' && (
            <div className="space-y-4 mb-6">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={[
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                  isDark
                    ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-900/50'
                    : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50',
                ].join(' ')}
              >
                <Upload className={[
                  'w-8 h-8 mx-auto mb-3',
                  isDark ? 'text-zinc-500' : 'text-zinc-400',
                ].join(' ')} />
                <p className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
                  {isUploading ? 'Processing...' : 'Click or drag image here'}
                </p>
                <p className={[
                  'text-xs mt-1',
                  isDark ? 'text-zinc-500' : 'text-zinc-400',
                ].join(' ')}>
                  PNG, JPG, GIF up to 10MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              <div>
                <label className={[
                  'block text-sm font-medium mb-2',
                  isDark ? 'text-zinc-300' : 'text-zinc-700',
                ].join(' ')}>
                  Alt text (optional)
                </label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Description of the image"
                  className={[
                    'w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors',
                    isDark
                      ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 focus:border-cyan-500'
                      : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-cyan-500',
                  ].join(' ')}
                />
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className={[
              'flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-sm',
              isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-600',
            ].join(' ')}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={[
                'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
                isDark
                  ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700',
              ].join(' ')}
            >
              Cancel
            </button>
            {mode === 'url' && (
              <button
                onClick={handleInsertUrl}
                disabled={!url.trim()}
                className={[
                  'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
                  url.trim()
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-zinc-300 text-zinc-500 cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-400',
                ].join(' ')}
              >
                Insert Image
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default ImageInsertModal
