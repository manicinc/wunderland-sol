/**
 * Create Collection Modal - Quick create dialog for new collections
 * @module codex/ui/collections/CreateCollectionModal
 *
 * Modal for creating new collections with title, description, icon, and color.
 */

'use client'

import { memo, useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FolderPlus, Palette, Image as ImageIcon, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COVER_PATTERNS, generateCollectionCoverDataUrl, type CoverPattern } from '@/lib/collections/coverGenerator'

interface CreateCollectionModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Create handler */
  onCreate: (data: { 
    title: string
    description?: string
    icon?: string
    color?: string
    coverPattern?: CoverPattern
  }) => Promise<void>
  /** Dark mode */
  isDark?: boolean
  /** Initial strand paths to add (optional) */
  initialStrandPaths?: string[]
}

/** Color palette options */
const COLOR_OPTIONS = [
  '#8b5cf6', // Violet
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#0ea5e9', // Sky
  '#14b8a6', // Teal
  '#22c55e', // Green
  '#84cc16', // Lime
  '#eab308', // Yellow
  '#f97316', // Orange
  '#ef4444', // Red
  '#ec4899', // Pink
  '#a855f7', // Purple
]

/** Common emoji options for collection icons */
const EMOJI_OPTIONS = [
  '📚', '📁', '⭐', '🎯', '💡', '🔥', '📝', '🎨',
  '🚀', '💻', '📊', '🔧', '📖', '🎵', '🎮', '🏠',
]

/**
 * Modal overlay with backdrop
 */
const Overlay = memo(function Overlay({ 
  children, 
  onClose 
}: { 
  children: React.ReactNode
  onClose: () => void 
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </motion.div>
  )
})

/**
 * Create collection modal dialog
 */
export const CreateCollectionModal = memo(function CreateCollectionModal({
  isOpen,
  onClose,
  onCreate,
  isDark = false,
  initialStrandPaths = [],
}: CreateCollectionModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0])
  const [selectedIcon, setSelectedIcon] = useState<string | undefined>()
  const [selectedPattern, setSelectedPattern] = useState<CoverPattern>('mesh')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Generate preview cover URL
  const coverPreviewUrl = useMemo(() => {
    const seed = title ? title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 42
    return generateCollectionCoverDataUrl({
      pattern: selectedPattern,
      primaryColor: selectedColor,
      seed,
    }, 300, 100)
  }, [selectedPattern, selectedColor, title])

  // Focus title input on open
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setTitle('')
      setDescription('')
      setSelectedColor(COLOR_OPTIONS[0])
      setSelectedIcon(undefined)
      setSelectedPattern('mesh')
      setShowEmojiPicker(false)
      setError(null)
    }
  }, [isOpen])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSubmit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, title])

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError('Please enter a collection name')
      titleInputRef.current?.focus()
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onCreate({
        title: title.trim(),
        description: description.trim() || undefined,
        icon: selectedIcon,
        color: selectedColor,
        coverPattern: selectedPattern,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create collection')
    } finally {
      setIsSubmitting(false)
    }
  }, [title, description, selectedIcon, selectedColor, onCreate, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay onClose={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.2 }}
            className={cn(
              'w-full max-w-md rounded-2xl shadow-2xl overflow-hidden',
              isDark ? 'bg-zinc-900' : 'bg-white'
            )}
            role="dialog"
            aria-labelledby="create-collection-title"
            aria-modal="true"
          >
            {/* Header */}
            <div className={cn(
              'flex items-center justify-between px-6 py-4 border-b',
              isDark ? 'border-zinc-800' : 'border-zinc-100'
            )}>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${selectedColor}20`, color: selectedColor }}
                >
                  {selectedIcon ? (
                    <span className="text-xl">{selectedIcon}</span>
                  ) : (
                    <FolderPlus className="w-5 h-5" />
                  )}
                </div>
                <h2 
                  id="create-collection-title"
                  className={cn(
                    'text-lg font-semibold',
                    isDark ? 'text-zinc-100' : 'text-zinc-900'
                  )}
                >
                  Create Collection
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                )}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Title input */}
              <div>
                <label 
                  htmlFor="collection-title" 
                  className={cn(
                    'block text-sm font-medium mb-2',
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  )}
                >
                  Name
                </label>
                <input
                  ref={titleInputRef}
                  id="collection-title"
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setError(null) }}
                  placeholder="e.g., Research Notes, Project Ideas..."
                  className={cn(
                    'w-full px-4 py-2.5 rounded-xl border text-sm transition-colors',
                    isDark 
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500' 
                      : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500',
                    'focus:outline-none focus:ring-2 focus:ring-violet-500/20',
                    error && 'border-red-500 focus:ring-red-500/20'
                  )}
                  maxLength={100}
                />
                {error && (
                  <p className="text-red-500 text-xs mt-1.5">{error}</p>
                )}
              </div>

              {/* Description input */}
              <div>
                <label 
                  htmlFor="collection-description" 
                  className={cn(
                    'block text-sm font-medium mb-2',
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  )}
                >
                  Description <span className="text-zinc-500 font-normal">(optional)</span>
                </label>
                <textarea
                  id="collection-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this collection about?"
                  rows={2}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-xl border text-sm transition-colors resize-none',
                    isDark 
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500' 
                      : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500',
                    'focus:outline-none focus:ring-2 focus:ring-violet-500/20'
                  )}
                  maxLength={500}
                />
              </div>

              {/* Icon picker */}
              <div>
                <label className={cn(
                  'block text-sm font-medium mb-2',
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                )}>
                  Icon <span className="text-zinc-500 font-normal">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedIcon(selectedIcon === emoji ? undefined : emoji)}
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all',
                        selectedIcon === emoji
                          ? 'bg-violet-100 dark:bg-violet-900/30 ring-2 ring-violet-500'
                          : isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className={cn(
                  'flex items-center gap-1.5 text-sm font-medium mb-2',
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                )}>
                  <Palette className="w-4 h-4" />
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className="w-8 h-8 rounded-full transition-all"
                      style={{ 
                        backgroundColor: color,
                        boxShadow: selectedColor === color 
                          ? `0 0 0 2px ${isDark ? '#18181b' : '#ffffff'}, 0 0 0 4px ${color}` 
                          : undefined,
                      }}
                      aria-label={`Select ${color} color`}
                    />
                  ))}
                </div>
              </div>

              {/* Cover pattern picker */}
              <div>
                <label className={cn(
                  'flex items-center gap-1.5 text-sm font-medium mb-2',
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                )}>
                  <Sparkles className="w-4 h-4" />
                  Cover Pattern
                </label>
                
                {/* Live preview */}
                <div 
                  className="w-full h-20 rounded-xl mb-3 overflow-hidden bg-cover bg-center border"
                  style={{ 
                    backgroundImage: `url("${coverPreviewUrl}")`,
                    borderColor: isDark ? 'rgb(63 63 70)' : 'rgb(228 228 231)',
                  }}
                  aria-label="Cover pattern preview"
                />
                
                {/* Pattern grid - responsive for mobile */}
                <div className="grid grid-cols-5 xs:grid-cols-5 gap-2">
                  {COVER_PATTERNS.map((pattern) => {
                    const previewUrl = generateCollectionCoverDataUrl({
                      pattern: pattern.id,
                      primaryColor: selectedColor,
                      seed: 42,
                    }, 80, 50)
                    
                    return (
                      <button
                        key={pattern.id}
                        type="button"
                        onClick={() => setSelectedPattern(pattern.id)}
                        className={cn(
                          'relative group rounded-lg overflow-hidden transition-all',
                          // Touch-friendly height
                          'h-10 sm:h-12 touch-manipulation',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
                          selectedPattern === pattern.id 
                            ? 'ring-2 ring-violet-500' 
                            : 'hover:ring-2 hover:ring-zinc-300 dark:hover:ring-zinc-600 active:ring-zinc-400'
                        )}
                        style={{ backgroundImage: `url("${previewUrl}")`, backgroundSize: 'cover' }}
                        title={pattern.name}
                        aria-label={`${pattern.name}: ${pattern.description}`}
                        aria-pressed={selectedPattern === pattern.id}
                      >
                        {/* Tooltip on hover */}
                        <span className={cn(
                          'absolute inset-x-0 bottom-0 text-[9px] font-medium py-0.5 text-center',
                          'bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity',
                          'truncate px-1'
                        )}>
                          {pattern.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
                
                {/* Helpful hint */}
                <p className={cn(
                  'text-xs mt-2',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}>
                  Generated SVG covers adapt to your collection color. No images needed!
                </p>
              </div>

              {/* Initial strands info */}
              {initialStrandPaths.length > 0 && (
                <div className={cn(
                  'px-4 py-3 rounded-xl text-sm',
                  isDark ? 'bg-zinc-800/50 text-zinc-400' : 'bg-zinc-50 text-zinc-600'
                )}>
                  Will add {initialStrandPaths.length} strand{initialStrandPaths.length === 1 ? '' : 's'} to this collection
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={cn(
              'flex items-center justify-end gap-3 px-6 py-4 border-t',
              isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-100 bg-zinc-50/50'
            )}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                  isDark 
                    ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' 
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100',
                  'disabled:opacity-50'
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !title.trim()}
                className={cn(
                  'px-5 py-2 rounded-xl text-sm font-medium transition-all',
                  'bg-violet-600 text-white hover:bg-violet-700',
                  'shadow-lg shadow-violet-500/25 hover:shadow-violet-500/35',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
                  'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2',
                  isDark && 'focus:ring-offset-zinc-900'
                )}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : (
                  'Create Collection'
                )}
              </button>
            </div>
          </motion.div>
        </Overlay>
      )}
    </AnimatePresence>
  )
})

export default CreateCollectionModal

