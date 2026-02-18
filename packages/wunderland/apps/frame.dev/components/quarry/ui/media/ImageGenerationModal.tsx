/**
 * Image Generation Modal
 * @module components/quarry/ui/ImageGenerationModal
 *
 * Modal for generating AI images with style presets.
 * Supports DALL-E 3 and Replicate Flux providers.
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import {
  X,
  Sparkles,
  ImagePlus,
  Loader2,
  Download,
  Check,
  AlertCircle,
  Palette,
  Maximize2,
  Square,
  RectangleHorizontal,
  RectangleVertical,
} from 'lucide-react'
import { Z_INDEX } from '../../constants'
import {
  type ImageGenerationStyle,
  IMAGE_GENERATION_STYLES,
} from '@/lib/ai/types'
import { useEditorAI } from '@/lib/ai/useEditorAI'
import { showToast, showAIError, showAIStatus } from '@/lib/ai/toast'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface ImageGenerationModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal is closed */
  onClose: () => void
  /** Initial prompt (e.g., from text selection) */
  initialPrompt?: string
  /** Callback when image is inserted */
  onInsert?: (imageUrl: string, alt: string) => void
  /** Theme for styling */
  theme?: string
}

type ImageSize = 'square' | 'landscape' | 'portrait'

/* ═══════════════════════════════════════════════════════════════════════════
   STYLE ICON MAPPING
═══════════════════════════════════════════════════════════════════════════ */

const STYLE_EMOJIS: Record<ImageGenerationStyle, string> = {
  illustration: '🎨',
  photo: '📷',
  diagram: '📊',
  sketch: '✏️',
  watercolor: '🌊',
  '3d': '🧊',
  pixel: '👾',
}

const SIZE_ICONS = {
  square: Square,
  landscape: RectangleHorizontal,
  portrait: RectangleVertical,
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function ImageGenerationModal({
  isOpen,
  onClose,
  initialPrompt = '',
  onInsert,
  theme = 'light',
}: ImageGenerationModalProps) {
  const isDark = theme?.includes('dark')

  // State
  const [prompt, setPrompt] = useState(initialPrompt)
  const [selectedStyle, setSelectedStyle] = useState<ImageGenerationStyle>('illustration')
  const [selectedSize, setSelectedSize] = useState<ImageSize>('square')
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Hook
  const {
    generateImage,
    imageStatus,
    imageSettings,
    hasAnyLLMKey,
  } = useEditorAI()

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPrompt(initialPrompt)
      setSelectedStyle(imageSettings.defaultStyle)
      setSelectedSize(imageSettings.defaultSize)
      setGeneratedImage(null)
      setError(null)
    }
  }, [isOpen, initialPrompt, imageSettings.defaultStyle, imageSettings.defaultSize])

  // Handle generation
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return

    setError(null)
    setGeneratedImage(null)

    // Show generating status
    showAIStatus('Generating image...', { duration: 0, id: 'image-gen-status' })

    const result = await generateImage({
      prompt: prompt.trim(),
      style: selectedStyle,
      size: selectedSize,
    })

    if (result) {
      setGeneratedImage(result.url)
      showToast({
        type: 'success',
        message: 'Image generated successfully!',
        duration: 3000,
        id: 'image-gen-status',
      })
    } else {
      setError('Failed to generate image. Please try again.')
      showAIError('Image generation failed', { id: 'image-gen-status' })
    }
  }, [prompt, selectedStyle, selectedSize, generateImage])

  // Handle insert
  const handleInsert = useCallback(() => {
    if (generatedImage && onInsert) {
      onInsert(generatedImage, prompt)
      showToast({
        type: 'success',
        message: 'Image inserted into document',
        duration: 2000,
      })
      onClose()
    }
  }, [generatedImage, prompt, onInsert, onClose])

  // Handle download
  const handleDownload = useCallback(() => {
    if (generatedImage) {
      const link = document.createElement('a')
      link.href = generatedImage
      link.download = `generated-${selectedStyle}-${Date.now()}.png`
      link.click()
      showToast({
        type: 'success',
        message: 'Image downloaded',
        duration: 2000,
      })
    }
  }, [generatedImage, selectedStyle])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (typeof window === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: Z_INDEX.modal }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-gen-title"
            aria-describedby="image-gen-description"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-auto sm:w-full sm:max-w-2xl max-h-[calc(100vh-2rem)] sm:max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl ${
              isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'
            }`}
            style={{ zIndex: Z_INDEX.modal + 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 sm:px-6 py-4 border-b ${
              isDark ? 'border-zinc-800' : 'border-zinc-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  isDark ? 'bg-purple-500/20' : 'bg-purple-100'
                }`}>
                  <ImagePlus className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h2
                    id="image-gen-title"
                    className={`text-lg font-semibold ${
                      isDark ? 'text-white' : 'text-zinc-900'
                    }`}
                  >
                    Generate Image
                  </h2>
                  <p
                    id="image-gen-description"
                    className={`text-sm ${
                      isDark ? 'text-zinc-400' : 'text-zinc-500'
                    }`}
                  >
                    Create AI-powered images with style presets
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close image generation modal"
                className={`p-2 rounded-lg transition-colors ${
                  isDark
                    ? 'hover:bg-zinc-800 text-zinc-400'
                    : 'hover:bg-zinc-100 text-zinc-500'
                }`}
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto max-h-[calc(100vh-12rem)] sm:max-h-[calc(90vh-180px)]">
              {/* API Key Warning */}
              {!hasAnyLLMKey && (
                <div className={`flex items-start gap-3 p-4 rounded-xl ${
                  isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
                }`}>
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className={`font-medium ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                      API Key Required
                    </p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-amber-400/70' : 'text-amber-700'}`}>
                      Add an OpenAI API key in Settings to generate images.
                    </p>
                  </div>
                </div>
              )}

              {/* Prompt Input */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  Describe your image
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A serene mountain landscape at sunset..."
                  rows={3}
                  className={`w-full px-4 py-3 rounded-xl border transition-colors resize-none ${
                    isDark
                      ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500'
                      : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-purple-500'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                />
              </div>

              {/* Style Selection */}
              <fieldset>
                <legend className={`block text-sm font-medium mb-3 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  <Palette className="w-4 h-4 inline mr-2" aria-hidden="true" />
                  Style Preset
                </legend>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Image style preset">
                  {IMAGE_GENERATION_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      role="radio"
                      aria-checked={selectedStyle === style.id}
                      aria-label={`${style.name} style`}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        selectedStyle === style.id
                          ? isDark
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-purple-500 bg-purple-50'
                          : isDark
                            ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                            : 'border-zinc-200 hover:border-zinc-300 bg-white'
                      }`}
                    >
                      <span className="text-2xl" aria-hidden="true">{STYLE_EMOJIS[style.id]}</span>
                      <span className={`text-xs font-medium ${
                        selectedStyle === style.id
                          ? 'text-purple-500'
                          : isDark ? 'text-zinc-400' : 'text-zinc-600'
                      }`}>
                        {style.name}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Size Selection */}
              <fieldset>
                <legend className={`block text-sm font-medium mb-3 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  <Maximize2 className="w-4 h-4 inline mr-2" aria-hidden="true" />
                  Size
                </legend>
                <div className="flex flex-col sm:flex-row gap-2" role="radiogroup" aria-label="Image size">
                  {(['square', 'landscape', 'portrait'] as ImageSize[]).map((size) => {
                    const SizeIcon = SIZE_ICONS[size]
                    const dimensions = size === 'square' ? '1024×1024' : size === 'landscape' ? '1792×1024' : '1024×1792'
                    return (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        role="radio"
                        aria-checked={selectedSize === size}
                        aria-label={`${size} size (${dimensions})`}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                          selectedSize === size
                            ? isDark
                              ? 'border-purple-500 bg-purple-500/10'
                              : 'border-purple-500 bg-purple-50'
                            : isDark
                              ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                              : 'border-zinc-200 hover:border-zinc-300 bg-white'
                        }`}
                      >
                        <SizeIcon className={`w-5 h-5 ${
                          selectedSize === size ? 'text-purple-500' : isDark ? 'text-zinc-500' : 'text-zinc-400'
                        }`} aria-hidden="true" />
                        <div className="text-left">
                          <div className={`text-sm font-medium capitalize ${
                            selectedSize === size
                              ? 'text-purple-500'
                              : isDark ? 'text-zinc-300' : 'text-zinc-700'
                          }`}>
                            {size}
                          </div>
                          <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {dimensions}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              {/* Generated Image Preview */}
              {(generatedImage || imageStatus === 'generating') && (
                <div
                  className={`rounded-xl border overflow-hidden ${
                    isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-200 bg-zinc-50'
                  }`}
                  aria-live="polite"
                  aria-busy={imageStatus === 'generating'}
                >
                  {imageStatus === 'generating' ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4" role="status">
                      <Loader2 className="w-8 h-8 text-purple-500 animate-spin" aria-hidden="true" />
                      <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        Generating your image...
                      </p>
                    </div>
                  ) : generatedImage ? (
                    <div className="relative">
                      <img
                        src={generatedImage}
                        alt={`AI generated image: ${prompt}`}
                        className="w-full h-auto"
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                        <div className="flex gap-2">
                          <button
                            onClick={handleDownload}
                            aria-label="Download generated image"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium backdrop-blur-sm transition-colors"
                          >
                            <Download className="w-4 h-4" aria-hidden="true" />
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div
                  role="alert"
                  className={`flex items-center gap-3 p-4 rounded-xl ${
                    isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" aria-hidden="true" />
                  <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                    {error}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-2 px-4 sm:px-6 py-4 border-t ${
              isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'
            }`}>
              <button
                onClick={onClose}
                aria-label="Cancel and close modal"
                className={`px-4 py-3 sm:py-2 rounded-lg font-medium transition-colors text-center ${
                  isDark
                    ? 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800'
                    : 'text-zinc-600 hover:text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                Cancel
              </button>

              <div className="flex flex-col sm:flex-row gap-2">
                {generatedImage && onInsert && (
                  <button
                    onClick={handleInsert}
                    aria-label="Insert generated image into document"
                    className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 rounded-lg font-medium bg-green-500 hover:bg-green-600 active:bg-green-700 text-white transition-colors"
                  >
                    <Check className="w-4 h-4" aria-hidden="true" />
                    Insert Below
                  </button>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || imageStatus === 'generating' || !hasAnyLLMKey}
                  aria-label={imageStatus === 'generating' ? 'Generating image, please wait' : 'Generate image'}
                  aria-disabled={!prompt.trim() || imageStatus === 'generating' || !hasAnyLLMKey}
                  className={`flex items-center justify-center gap-2 px-5 py-3 sm:py-2 rounded-lg font-medium transition-all ${
                    !prompt.trim() || imageStatus === 'generating' || !hasAnyLLMKey
                      ? 'bg-purple-500/50 text-white/70 cursor-not-allowed'
                      : 'bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white'
                  }`}
                >
                  {imageStatus === 'generating' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" aria-hidden="true" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default ImageGenerationModal
