/**
 * Prompt Gallery Component
 * @module components/quarry/ui/PromptGallery
 *
 * Main gallery view for browsing and managing writing prompts.
 * Features search, category filtering, and batch image generation.
 */

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Plus,
  Wand2,
  RefreshCw,
  Grid,
  List,
  Heart,
  Sparkles,
  X,
  Filter,
} from 'lucide-react'
import type { ThemeName } from '@/types/theme'
import type { GalleryPrompt, PromptCategory, PromptFilter, ImageStyle } from '@/lib/prompts/types'
import { CATEGORY_DISPLAY, IMAGE_STYLES } from '@/lib/prompts/types'
import { getPromptManager, type PromptManager } from '@/lib/prompts'
import PromptCard from './PromptCard'
import PromptDetailModal from './PromptDetailModal'
import PromptCreator from './PromptCreator'
import PromptStartModal from './PromptStartModal'

interface PromptGalleryProps {
  /** Current theme */
  theme?: ThemeName
  /** Callback when a prompt is selected for use (blank start) */
  onSelectPrompt?: (prompt: GalleryPrompt) => void
  /** Callback when starting with template content */
  onStartWithTemplate?: (prompt: GalleryPrompt, content: string) => void
  /** Callback to close the gallery */
  onClose?: () => void
}

/**
 * Main prompt gallery with search, filtering, and grid view
 */
export default function PromptGallery({
  theme = 'light',
  onSelectPrompt,
  onStartWithTemplate,
  onClose,
}: PromptGalleryProps) {
  const [manager, setManager] = useState<PromptManager | null>(null)
  const [prompts, setPrompts] = useState<GalleryPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<PromptFilter>({})
  const [selectedPrompt, setSelectedPrompt] = useState<GalleryPrompt | null>(null)
  const [promptToStart, setPromptToStart] = useState<GalleryPrompt | null>(null)
  const [showCreator, setShowCreator] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [canGenerateImages, setCanGenerateImages] = useState(false)
  const [generatingImages, setGeneratingImages] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 })
  const [generatingPromptId, setGeneratingPromptId] = useState<string | null>(null)
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>('watercolor')
  const [showStylePicker, setShowStylePicker] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)
  const isDark = theme.includes('dark')

  // Initialize manager
  useEffect(() => {
    const init = async () => {
      const mgr = await getPromptManager()
      setManager(mgr)
      setCanGenerateImages(mgr.canGenerateImages())

      // Load preferences
      const prefs = await mgr.getPreferences()
      setSelectedStyle(prefs.defaultImageStyle)
      setViewMode(prefs.galleryViewMode)
    }
    init()
  }, [])

  // Load prompts when filter changes
  useEffect(() => {
    if (!manager) return
    loadPrompts()
  }, [manager, filter])

  const loadPrompts = useCallback(async () => {
    if (!manager) return
    setLoading(true)
    try {
      const results = await manager.filterPrompts(filter)
      setPrompts(results)
    } catch (error) {
      console.error('[PromptGallery] Failed to load prompts:', error)
    } finally {
      setLoading(false)
    }
  }, [manager, filter])

  // Generate all missing images
  const generateAllImages = async () => {
    if (!manager || generatingImages) return

    setGeneratingImages(true)
    const withoutImages = prompts.filter(p => !p.imageUrl)
    setGenerationProgress({ current: 0, total: withoutImages.length })

    abortControllerRef.current = new AbortController()

    try {
      await manager.generateAllImages(
        selectedStyle,
        (current, total, prompt) => {
          setGenerationProgress({ current, total })
          if (prompt) setGeneratingPromptId(prompt.id)
        },
        abortControllerRef.current.signal
      )
    } catch (error) {
      console.error('[PromptGallery] Image generation error:', error)
    } finally {
      setGeneratingImages(false)
      setGeneratingPromptId(null)
      loadPrompts()
    }
  }

  const stopGeneration = () => {
    abortControllerRef.current?.abort()
  }

  // Generate image for single prompt
  const generateSingleImage = async (promptId: string) => {
    if (!manager) return
    setGeneratingPromptId(promptId)
    try {
      await manager.ensureImage(promptId, selectedStyle)
      loadPrompts()
    } finally {
      setGeneratingPromptId(null)
    }
  }

  // Toggle favorite
  const toggleFavorite = async (promptId: string) => {
    if (!manager) return
    await manager.toggleFavorite(promptId)
    loadPrompts()
  }

  // Show start modal for prompt
  const initiatePromptUse = (prompt: GalleryPrompt) => {
    setSelectedPrompt(null) // Close detail modal if open
    setPromptToStart(prompt)
  }

  // Handle blank start
  const handleStartBlank = async (prompt: GalleryPrompt) => {
    if (!manager) return
    await manager.usePrompt(prompt.id)
    onSelectPrompt?.(prompt)
  }

  // Handle start with template
  const handleStartWithTemplate = async (prompt: GalleryPrompt, content: string) => {
    if (!manager) return
    await manager.usePrompt(prompt.id)
    onStartWithTemplate?.(prompt, content)
  }

  // Category tabs
  const categories: { id: PromptCategory | undefined; label: string; icon: React.ReactNode }[] = [
    { id: undefined, label: 'All', icon: <Grid className="w-4 h-4" /> },
    ...Object.entries(CATEGORY_DISPLAY).map(([id, config]) => ({
      id: id as PromptCategory,
      label: config.label,
      icon: <span>{config.emoji}</span>,
    })),
  ]

  const promptsWithoutImages = prompts.filter(p => !p.imageUrl).length

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Sparkles className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
            <h1 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Writing Prompts
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Create Button */}
            <button
              onClick={() => setShowCreator(true)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                ${isDark
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                }
              `}
            >
              <Plus className="w-4 h-4" />
              Create
            </button>

            {/* Generate Images Button */}
            {canGenerateImages && promptsWithoutImages > 0 && (
              <div className="relative">
                <button
                  onClick={() => generatingImages ? stopGeneration() : setShowStylePicker(!showStylePicker)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                    ${generatingImages
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : isDark
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-purple-500 hover:bg-purple-600 text-white'
                    }
                  `}
                >
                  {generatingImages ? (
                    <>
                      <X className="w-4 h-4" />
                      Stop ({generationProgress.current}/{generationProgress.total})
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Generate ({promptsWithoutImages})
                    </>
                  )}
                </button>

                {/* Style Picker Dropdown */}
                <AnimatePresence>
                  {showStylePicker && !generatingImages && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className={`
                        absolute right-0 top-full mt-1 z-50 p-2 rounded-lg shadow-lg min-w-[200px]
                        ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}
                      `}
                    >
                      <p className={`text-xs font-medium mb-2 px-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Select Style
                      </p>
                      {Object.entries(IMAGE_STYLES).map(([id, config]) => (
                        <button
                          key={id}
                          onClick={() => {
                            setSelectedStyle(id as ImageStyle)
                            setShowStylePicker(false)
                            generateAllImages()
                          }}
                          className={`
                            w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left
                            ${isDark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'}
                            ${selectedStyle === id
                              ? isDark ? 'bg-purple-900/50' : 'bg-purple-50'
                              : ''
                            }
                          `}
                        >
                          <span className="font-medium">{config.label}</span>
                          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {config.description}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
              >
                <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}
          />
          <input
            type="text"
            placeholder="Search prompts..."
            value={filter.search || ''}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className={`
              w-full pl-10 pr-4 py-2 rounded-lg border text-sm
              ${isDark
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500/50
            `}
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id || 'all'}
              onClick={() => setFilter({ ...filter, category: cat.id })}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap
                transition-colors
                ${filter.category === cat.id
                  ? isDark
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : isDark
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }
              `}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}

          {/* Favorites Filter */}
          <button
            onClick={() => setFilter({ ...filter, onlyFavorites: !filter.onlyFavorites })}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap
              transition-colors
              ${filter.onlyFavorites
                ? 'bg-red-500 text-white'
                : isDark
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }
            `}
          >
            <Heart className={`w-4 h-4 ${filter.onlyFavorites ? 'fill-current' : ''}`} />
            <span>Favorites</span>
          </button>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className={`w-6 h-6 animate-spin ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
          </div>
        ) : prompts.length === 0 ? (
          <div className={`text-center py-16 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No prompts found</p>
            <p className="text-sm">Try adjusting your filters or create a new prompt</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {prompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                theme={theme}
                onClick={() => setSelectedPrompt(prompt)}
                onUse={() => initiatePromptUse(prompt)}
                onToggleFavorite={() => toggleFavorite(prompt.id)}
                onGenerateImage={() => generateSingleImage(prompt.id)}
                canGenerateImage={canGenerateImages}
                isGenerating={generatingPromptId === prompt.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div className={`px-4 py-2 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className={`flex items-center justify-between text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <span>{prompts.length} prompts</span>
          <div className="flex items-center gap-4">
            <span>{prompts.filter(p => p.isFavorite).length} favorites</span>
            <span>{prompts.filter(p => p.imageUrl).length} with images</span>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedPrompt && (
          <PromptDetailModal
            prompt={selectedPrompt}
            theme={theme}
            onClose={() => setSelectedPrompt(null)}
            onUse={() => initiatePromptUse(selectedPrompt)}
            onToggleFavorite={() => {
              toggleFavorite(selectedPrompt.id)
              loadPrompts()
            }}
            onRegenerateImage={async (style) => {
              if (!manager) return
              setGeneratingPromptId(selectedPrompt.id)
              await manager.regenerateImage(selectedPrompt.id, style)
              setGeneratingPromptId(null)
              loadPrompts()
              const updated = await manager.getPrompt(selectedPrompt.id)
              if (updated) setSelectedPrompt(updated)
            }}
            canGenerateImage={canGenerateImages}
            isGenerating={generatingPromptId === selectedPrompt.id}
          />
        )}
      </AnimatePresence>

      {/* Creator Modal */}
      <AnimatePresence>
        {showCreator && (
          <PromptCreator
            theme={theme}
            onClose={() => setShowCreator(false)}
            onCreated={(prompt) => {
              setShowCreator(false)
              loadPrompts()
              setSelectedPrompt(prompt)
            }}
            canGenerateImage={canGenerateImages}
          />
        )}
      </AnimatePresence>

      {/* Start Modal */}
      <AnimatePresence>
        {promptToStart && (
          <PromptStartModal
            prompt={promptToStart}
            theme={theme}
            onClose={() => setPromptToStart(null)}
            onStartBlank={handleStartBlank}
            onStartWithTemplate={handleStartWithTemplate}
            onToggleFavorite={() => {
              toggleFavorite(promptToStart.id)
              loadPrompts()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
