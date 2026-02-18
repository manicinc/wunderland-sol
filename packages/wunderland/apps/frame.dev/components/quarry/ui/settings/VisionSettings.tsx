/**
 * Vision AI Settings Component
 * @module codex/ui/settings/VisionSettings
 *
 * User controls for image analysis features:
 * - Auto-analyze toggle
 * - AI Caption generation
 * - Screenshot detection
 * - EXIF metadata extraction
 * - Object detection (TensorFlow.js)
 */

'use client'

import React, { useState } from 'react'
import { Eye, Sparkles, Monitor, Camera, Package, AlertCircle, HelpCircle, Info } from 'lucide-react'
import { useAIPreferences } from '@/lib/ai'

/**
 * Tooltip component for helpful hints
 */
function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => {
          e.preventDefault()
          setShow(!show)
        }}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="More information"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg shadow-lg max-w-xs whitespace-normal">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
        </div>
      )}
    </div>
  )
}

/**
 * Vision AI Settings Component
 */
export function VisionSettings() {
  const [prefs, updatePrefs] = useAIPreferences()

  const handleToggleAutoAnalyze = (enabled: boolean) => {
    updatePrefs('vision', { autoAnalyze: enabled })
  }

  const handleToggleFeature = (
    feature: keyof typeof prefs.vision.analysisFeatures,
    enabled: boolean
  ) => {
    updatePrefs('vision', {
      analysisFeatures: {
        ...prefs.vision.analysisFeatures,
        [feature]: enabled,
      },
    })
  }

  const handleToggleProvider = (provider: 'openai' | 'anthropic') => {
    updatePrefs('vision', { provider })
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
          <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Vision AI & Image Analysis
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Automatically analyze images with AI captions, screenshot detection, metadata extraction, and object recognition
          </p>
        </div>
      </div>

      {/* Auto-Analyze Master Toggle */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Auto-Analyze Images
              </h4>
              {prefs.vision.autoAnalyze && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Automatically analyze images when uploaded or captured
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={prefs.vision.autoAnalyze}
              onChange={(e) => handleToggleAutoAnalyze(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {/* Smart Defaults Info */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Smart defaults:</strong> Screenshots are always analyzed when auto-analyze is enabled.
              Photos are only analyzed if AI Caption is enabled.
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              💡 Source badges (📷 Camera, 📁 Upload, 🖥️ Screenshot) show on all images automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Analysis Features */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
          Analysis Features
        </h4>

        {/* AI Caption */}
        <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
          <Sparkles className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                    AI Captions
                  </h5>
                  <InfoTooltip text="Uses GPT-4 Vision or Claude to analyze images and generate natural language descriptions. Costs ~$0.01-0.03 per image via your API key. Requires internet connection." />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  Generate descriptions using GPT-4 Vision or Claude
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={prefs.vision.analysisFeatures.aiCaption}
                  onChange={(e) => handleToggleFeature('aiCaption', e.target.checked)}
                  disabled={!prefs.vision.autoAnalyze}
                />
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Screenshot Detection */}
        <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
          <Monitor className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                    Screenshot Detection
                  </h5>
                  <InfoTooltip text="Uses heuristics (EXIF data, resolution patterns, edge detection) to identify screenshots. Runs 100% locally in your browser. No data sent to servers. Fast and privacy-friendly." />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  Identify screenshots and analyze UI elements
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={prefs.vision.analysisFeatures.screenshotDetection}
                  onChange={(e) => handleToggleFeature('screenshotDetection', e.target.checked)}
                  disabled={!prefs.vision.autoAnalyze}
                />
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
              </label>
            </div>
          </div>
        </div>

        {/* EXIF Extraction */}
        <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
          <Camera className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                    EXIF Metadata
                  </h5>
                  <InfoTooltip text="Extracts camera make/model, GPS coordinates, timestamps, and camera settings from photos. Processed 100% locally using the exifr library (~45KB). Privacy-friendly." />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  Extract camera info, location, and timestamps from photos
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={prefs.vision.analysisFeatures.exifExtraction}
                  onChange={(e) => handleToggleFeature('exifExtraction', e.target.checked)}
                  disabled={!prefs.vision.autoAnalyze}
                />
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Object Detection */}
        <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-amber-50/50 dark:bg-amber-900/10">
          <Package className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                    Object Detection
                  </h5>
                  <InfoTooltip text="Identifies objects in images using TensorFlow.js + Coco-SSD model. Runs locally in browser. Requires WebGL. First use downloads ~3MB model (cached). Detects 90+ object classes." />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  Detect objects using TensorFlow.js (~3MB download, optional)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={prefs.vision.analysisFeatures.objectDetection}
                  onChange={(e) => handleToggleFeature('objectDetection', e.target.checked)}
                  disabled={!prefs.vision.autoAnalyze}
                />
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-amber-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Provider Selection */}
      {prefs.vision.analysisFeatures.aiCaption && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              AI Provider for Captions
            </h4>
            <InfoTooltip text="Choose between OpenAI's GPT-4 Vision (fast, great general performance) or Anthropic's Claude (detailed analysis, better context). Both require API keys configured." />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleToggleProvider('openai')}
              className={`flex-1 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                prefs.vision.provider === 'openai'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              OpenAI (GPT-4V)
            </button>
            <button
              onClick={() => handleToggleProvider('anthropic')}
              className={`flex-1 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                prefs.vision.provider === 'anthropic'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Anthropic (Claude)
            </button>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <AlertCircle className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-gray-700 dark:text-gray-300">
              <strong>Need help?</strong> Check out the{' '}
              <a
                href="/docs/features/image-analysis.md"
                className="text-purple-600 dark:text-purple-400 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Image Analysis documentation
              </a>{' '}
              for detailed setup instructions, troubleshooting, and best practices.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
