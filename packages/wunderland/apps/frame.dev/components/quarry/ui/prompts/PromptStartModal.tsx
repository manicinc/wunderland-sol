/**
 * Prompt Start Modal Component
 * @module codex/ui/PromptStartModal
 *
 * Modal for choosing how to start a prompt:
 * - Blank: New strand with prompt as title
 * - Pre-filled: Show template content first
 *
 * Enhanced with full prompt preview including:
 * - Image display
 * - Metadata (mood, difficulty, estimated time)
 * - Keywords/tags
 * - Nicely styled prompt text
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  FileText,
  Sparkles,
  Eye,
  ArrowRight,
  Copy,
  Check,
  Clock,
  Tag,
  Wand2,
  Zap,
  Heart,
} from 'lucide-react'
import type { ThemeName } from '@/types/theme'
import type { GalleryPrompt } from '@/lib/prompts/types'
import { CATEGORY_DISPLAY, MOOD_GRADIENTS } from '@/lib/prompts/types'
import {
  getTemplateForPrompt,
  hasTemplate,
  prepareTemplateForStrand,
  type PromptTemplate,
} from '@/lib/prompts/templates'
import { cn } from '@/lib/utils'
import { useModalAccessibility } from '@/components/quarry/hooks'

// Difficulty badge configuration
const DIFFICULTY_CONFIG = {
  beginner: { label: 'Beginner', color: 'emerald', icon: '🌱' },
  intermediate: { label: 'Intermediate', color: 'amber', icon: '⚡' },
  advanced: { label: 'Advanced', color: 'rose', icon: '🔥' },
}

export interface PromptStartModalProps {
  /** The prompt to start */
  prompt: GalleryPrompt
  /** Current theme */
  theme?: ThemeName
  /** Close handler */
  onClose: () => void
  /** Start blank (new strand with prompt as title) */
  onStartBlank: (prompt: GalleryPrompt) => void
  /** Start with template content */
  onStartWithTemplate: (prompt: GalleryPrompt, content: string) => void
  /** Toggle favorite status */
  onToggleFavorite?: () => void
}

export function PromptStartModal({
  prompt,
  theme = 'dark',
  onClose,
  onStartBlank,
  onStartWithTemplate,
  onToggleFavorite,
}: PromptStartModalProps) {
  // Accessibility hook
  const { backdropRef, contentRef, modalProps, handleBackdropClick } = useModalAccessibility({
    isOpen: true, // Always open when this component is rendered
    onClose,
    modalId: `prompt-start-modal-${prompt.id}`,
    trapFocus: true,
    lockScroll: true,
  })

  const [template, setTemplate] = useState<PromptTemplate | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [copied, setCopied] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const isDark = theme.includes('dark')
  const hasTemplateContent = hasTemplate(prompt.id)
  const categoryDisplay = CATEGORY_DISPLAY[prompt.category]
  const moodGradient = prompt.mood?.[0]
    ? MOOD_GRADIENTS[prompt.mood[0]]
    : categoryDisplay?.gradient || 'from-blue-500/20 to-purple-500/20'
  const difficultyConfig = prompt.difficulty ? DIFFICULTY_CONFIG[prompt.difficulty] : null

  useEffect(() => {
    if (hasTemplateContent) {
      const t = getTemplateForPrompt(prompt.id)
      setTemplate(t)
    }
  }, [prompt.id, hasTemplateContent])

  const handleStartBlank = () => {
    onStartBlank(prompt)
    onClose()
  }

  const handleStartWithTemplate = () => {
    if (template) {
      const content = prepareTemplateForStrand(template, {
        includeHeader: true,
      })
      onStartWithTemplate(prompt, content)
    }
    onClose()
  }

  const handleCopyTemplate = async () => {
    if (template) {
      const content = prepareTemplateForStrand(template)
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={backdropRef as React.RefObject<HTMLDivElement>}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <motion.div
          ref={contentRef as React.RefObject<HTMLDivElement>}
          {...modalProps}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={cn(
            'w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col',
            isDark ? 'bg-zinc-900' : 'bg-white'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Image Header */}
          <div className="relative aspect-[21/9] overflow-hidden flex-shrink-0">
            {prompt.imageUrl ? (
              <>
                <img
                  src={prompt.imageUrl}
                  alt=""
                  className={cn(
                    'w-full h-full object-cover transition-opacity duration-300',
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  )}
                  onLoad={() => setImageLoaded(true)}
                />
                {!imageLoaded && (
                  <div className={cn('absolute inset-0 bg-gradient-to-br animate-pulse', moodGradient)} />
                )}
                {/* Gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
              </>
            ) : (
              <div className={cn('w-full h-full bg-gradient-to-br flex items-center justify-center', moodGradient)}>
                <Sparkles className={cn('w-12 h-12', isDark ? 'text-white/30' : 'text-gray-400/40')} />
              </div>
            )}

            {/* Close Button - 44x44 touch target */}
            <button
              onClick={onClose}
              className={cn(
                'absolute top-3 right-3 min-w-[44px] min-h-[44px]',
                'flex items-center justify-center',
                'rounded-full backdrop-blur-sm transition-all',
                'bg-black/30 hover:bg-black/50 active:bg-black/60 active:scale-95',
                'text-white touch-manipulation'
              )}
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Favorite Button - 44x44 touch target */}
            {onToggleFavorite && (
              <button
                onClick={onToggleFavorite}
                className={cn(
                  'absolute top-3 right-14 min-w-[44px] min-h-[44px]',
                  'flex items-center justify-center',
                  'rounded-full backdrop-blur-sm transition-all touch-manipulation',
                  prompt.isFavorite
                    ? 'bg-red-500/90 hover:bg-red-500 text-white'
                    : 'bg-black/30 hover:bg-black/50 active:bg-black/60 active:scale-95 text-white'
                )}
                aria-label={prompt.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={cn('w-5 h-5', prompt.isFavorite && 'fill-current')} />
              </button>
            )}

            {/* Category Badge */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm',
                  'bg-white/90 text-gray-700 shadow-sm'
                )}
              >
                {categoryDisplay?.emoji} {categoryDisplay?.label}
              </span>
              {prompt.isCustom && (
                <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-purple-500/90 text-white backdrop-blur-sm">
                  Custom
                </span>
              )}
            </div>

            {/* Title overlay at bottom of image */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h2 id={`prompt-start-modal-${prompt.id}-title`} className="text-2xl font-bold text-white leading-tight drop-shadow-lg">
                Start Writing
              </h2>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Prompt Text - Hero Style */}
            <div className={cn('px-6 py-5', isDark ? 'bg-zinc-800/30' : 'bg-zinc-50')}>
              <p
                className={cn(
                  'text-xl leading-relaxed font-serif italic',
                  isDark ? 'text-zinc-100' : 'text-zinc-800'
                )}
              >
                "{prompt.text}"
              </p>
            </div>

            {/* Metadata Section */}
            <div className={cn('px-6 py-4 border-b', isDark ? 'border-zinc-800' : 'border-zinc-200')}>
              <div className="flex flex-wrap items-center gap-2">
                {/* Mood Tags */}
                {prompt.mood?.map((mood) => (
                  <span
                    key={mood}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium capitalize',
                      isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
                    )}
                  >
                    {mood}
                  </span>
                ))}

                {/* Difficulty */}
                {difficultyConfig && (
                  <span
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1',
                      difficultyConfig.color === 'emerald' && (isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'),
                      difficultyConfig.color === 'amber' && (isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700'),
                      difficultyConfig.color === 'rose' && (isDark ? 'bg-rose-900/50 text-rose-300' : 'bg-rose-100 text-rose-700')
                    )}
                  >
                    <span>{difficultyConfig.icon}</span>
                    {difficultyConfig.label}
                  </span>
                )}

                {/* Estimated Time */}
                {prompt.estimatedTime && (
                  <span
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
                      isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'
                    )}
                  >
                    <Clock className="w-3 h-3" />
                    {prompt.estimatedTime}
                  </span>
                )}
              </div>

              {/* Keywords/Tags */}
              {prompt.tags && prompt.tags.length > 0 && (
                <div className="mt-3 flex items-start gap-2">
                  <Tag className={cn('w-4 h-4 mt-0.5 flex-shrink-0', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
                  <div className="flex flex-wrap gap-1.5">
                    {prompt.tags.map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          'px-2 py-0.5 rounded text-xs',
                          isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
                        )}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Usage Stats */}
              {(prompt.useCount > 0 || prompt.lastUsedAt) && (
                <div className={cn('mt-3 text-xs flex items-center gap-2', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                  <Zap className="w-3 h-3" />
                  {prompt.useCount > 0 && <span>Used {prompt.useCount} times</span>}
                  {prompt.useCount > 0 && prompt.lastUsedAt && <span>·</span>}
                  {prompt.lastUsedAt && (
                    <span>Last used {new Date(prompt.lastUsedAt).toLocaleDateString()}</span>
                  )}
                </div>
              )}
            </div>

            {/* Options */}
            <div className="p-6 space-y-4">
              {/* Blank Option */}
              <motion.button
                className={cn(
                  'w-full p-4 rounded-xl border text-left transition-colors',
                  isDark
                    ? 'border-zinc-700 hover:border-blue-500/50 hover:bg-blue-500/10'
                    : 'border-zinc-200 hover:border-blue-400 hover:bg-blue-50'
                )}
                onClick={handleStartBlank}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                    )}
                  >
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3
                      className={cn(
                        'font-medium mb-1',
                        isDark ? 'text-white' : 'text-zinc-900'
                      )}
                    >
                      Start Blank
                    </h3>
                    <p
                      className={cn(
                        'text-sm',
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      )}
                    >
                      Create a new page with the prompt as your title. Write freely.
                    </p>
                  </div>
                  <ArrowRight
                    className={cn(
                      'w-5 h-5 mt-1',
                      isDark ? 'text-zinc-600' : 'text-zinc-400'
                    )}
                  />
                </div>
              </motion.button>

              {/* Pre-filled Option (if template exists) */}
              {hasTemplateContent && template && (
                <>
                  <motion.button
                    className={cn(
                      'w-full p-4 rounded-xl border text-left transition-colors',
                      isDark
                        ? 'border-zinc-700 hover:border-purple-500/50 hover:bg-purple-500/10'
                        : 'border-zinc-200 hover:border-purple-400 hover:bg-purple-50'
                    )}
                    onClick={handleStartWithTemplate}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          isDark ? 'bg-purple-500/20' : 'bg-purple-100'
                        )}
                      >
                        <Sparkles className="w-5 h-5 text-purple-500" />
                      </div>
                      <div className="flex-1">
                        <h3
                          className={cn(
                            'font-medium mb-1',
                            isDark ? 'text-white' : 'text-zinc-900'
                          )}
                        >
                          Use Template
                        </h3>
                        <p
                          className={cn(
                            'text-sm',
                            isDark ? 'text-zinc-400' : 'text-zinc-500'
                          )}
                        >
                          Start with example structure, sections, and prompts to guide your writing.
                        </p>
                      </div>
                      <ArrowRight
                        className={cn(
                          'w-5 h-5 mt-1',
                          isDark ? 'text-zinc-600' : 'text-zinc-400'
                        )}
                      />
                    </div>
                  </motion.button>

                  {/* Preview Toggle */}
                  <button
                    className={cn(
                      'flex items-center gap-2 text-sm',
                      isDark
                        ? 'text-zinc-500 hover:text-zinc-300'
                        : 'text-zinc-500 hover:text-zinc-700'
                    )}
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="w-4 h-4" />
                    {showPreview ? 'Hide preview' : 'Preview template'}
                  </button>

                  {/* Template Preview */}
                  <AnimatePresence>
                    {showPreview && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div
                          className={cn(
                            'relative rounded-xl border p-4 max-h-64 overflow-y-auto',
                            isDark
                              ? 'border-zinc-700 bg-zinc-800/50'
                              : 'border-zinc-200 bg-zinc-50'
                          )}
                        >
                          <button
                            onClick={handleCopyTemplate}
                            className={cn(
                              'absolute top-2 right-2 p-1.5 rounded-lg transition-colors',
                              isDark
                                ? 'hover:bg-zinc-700 text-zinc-400'
                                : 'hover:bg-zinc-200 text-zinc-500'
                            )}
                          >
                            {copied ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <pre
                            className={cn(
                              'text-xs whitespace-pre-wrap font-mono',
                              isDark ? 'text-zinc-300' : 'text-zinc-700'
                            )}
                          >
                            {template.content.slice(0, 800)}
                            {template.content.length > 800 && '...'}
                          </pre>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* No template message */}
              {!hasTemplateContent && (
                <p
                  className={cn(
                    'text-sm text-center py-2',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}
                >
                  Templates coming soon for more prompts!
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default PromptStartModal
