/**
 * Image Generation Settings Component
 * @module quarry/ui/settings/ImageGenerationSettings
 *
 * User controls for AI image generation:
 * - Enable/disable toggle
 * - Default style preset
 * - Default size
 * - Toolbar visibility
 */

'use client'

import React from 'react'
import { ImagePlus, Palette, Maximize2, Eye, Info, AlertCircle } from 'lucide-react'
import { useAIPreferences } from '@/lib/ai'
import { IMAGE_GENERATION_STYLES, type ImageGenerationStyle } from '@/lib/ai/types'

/**
 * Style emoji mapping for visual display
 */
const STYLE_EMOJIS: Record<ImageGenerationStyle, string> = {
  illustration: '🎨',
  photo: '📷',
  diagram: '📊',
  sketch: '✏️',
  watercolor: '🌊',
  '3d': '🧊',
  pixel: '👾',
}

/**
 * Image Generation Settings Component
 */
export function ImageGenerationSettings() {
  const [prefs, updatePrefs] = useAIPreferences()

  const handleToggleEnabled = (enabled: boolean) => {
    updatePrefs('imageGeneration', { enabled })
  }

  const handleToggleToolbar = (showInToolbar: boolean) => {
    updatePrefs('imageGeneration', { showInToolbar })
  }

  const handleStyleChange = (defaultStyle: ImageGenerationStyle) => {
    updatePrefs('imageGeneration', { defaultStyle })
  }

  const handleSizeChange = (defaultSize: 'square' | 'landscape' | 'portrait') => {
    updatePrefs('imageGeneration', { defaultSize })
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
          <ImagePlus className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Image Generation
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Generate images from text prompts using DALL-E or Flux
          </p>
        </div>
      </div>

      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Enable Image Generation
            </h4>
            {prefs.imageGeneration.enabled && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Generate AI images from text descriptions
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={prefs.imageGeneration.enabled}
            onChange={(e) => handleToggleEnabled(e.target.checked)}
          />
          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
        </label>
      </div>

      {/* Usage Info */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>How to generate images:</strong>
          </p>
          <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 space-y-0.5">
            <li>• Type <kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-[10px]">/image</kbd> in the editor</li>
            <li>• Select text and click the image button in the toolbar</li>
            <li>• Use the block command palette</li>
          </ul>
        </div>
      </div>

      {/* Settings (only show when enabled) */}
      {prefs.imageGeneration.enabled && (
        <div className="space-y-4">
          {/* Show in Toolbar */}
          <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <Eye className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                    Show in Selection Toolbar
                  </h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    Display image generation button when text is selected
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={prefs.imageGeneration.showInToolbar}
                    onChange={(e) => handleToggleToolbar(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Default Style */}
          <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <Palette className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Default Style Preset
              </h5>
              <div className="grid grid-cols-4 gap-2">
                {IMAGE_GENERATION_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => handleStyleChange(style.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                      prefs.imageGeneration.defaultStyle === style.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <span className="text-xl">{STYLE_EMOJIS[style.id]}</span>
                    <span className={`text-xs font-medium ${
                      prefs.imageGeneration.defaultStyle === style.id
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {style.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Default Size */}
          <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <Maximize2 className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Default Size
              </h5>
              <div className="flex gap-2">
                {(['square', 'landscape', 'portrait'] as const).map((size) => {
                  const label = size === 'square' ? '1024×1024' : size === 'landscape' ? '1792×1024' : '1024×1792'
                  return (
                    <button
                      key={size}
                      onClick={() => handleSizeChange(size)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        prefs.imageGeneration.defaultSize === size
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span className="capitalize">{size}</span>
                      <span className="block text-xs opacity-75 mt-0.5">
                        {label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Key Requirement Notice */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Requires an OpenAI API key (for DALL-E) or Replicate API key (for Flux) configured in Settings → API Keys
        </p>
      </div>
    </div>
  )
}

export default ImageGenerationSettings
