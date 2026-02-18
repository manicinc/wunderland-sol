/**
 * Writing Assistant Settings Component
 * @module quarry/ui/settings/WritingAssistantSettings
 *
 * User controls for AI writing suggestions:
 * - Enable/disable toggle
 * - Trigger delay slider
 * - Suggestion length
 * - Auto-trigger toggle
 */

'use client'

import React from 'react'
import { PenLine, Clock, TextCursor, Keyboard, Info, AlertCircle } from 'lucide-react'
import { useAIPreferences } from '@/lib/ai'

/**
 * Writing Assistant Settings Component
 */
export function WritingAssistantSettings() {
  const [prefs, updatePrefs] = useAIPreferences()

  const handleToggleEnabled = (enabled: boolean) => {
    updatePrefs('writingAssistant', { enabled })
  }

  const handleToggleAutoTrigger = (autoTrigger: boolean) => {
    updatePrefs('writingAssistant', { autoTrigger })
  }

  const handleDelayChange = (triggerDelay: number) => {
    updatePrefs('writingAssistant', { triggerDelay })
  }

  const handleLengthChange = (suggestionLength: 'short' | 'medium' | 'long') => {
    updatePrefs('writingAssistant', { suggestionLength })
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900">
          <PenLine className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Writing Assistant
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Get inline suggestions as you write, powered by GPT-4o or Claude
          </p>
        </div>
      </div>

      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Enable Writing Suggestions
            </h4>
            {prefs.writingAssistant.enabled && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Show ghost text suggestions while you type
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={prefs.writingAssistant.enabled}
            onChange={(e) => handleToggleEnabled(e.target.checked)}
          />
          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 dark:peer-focus:ring-cyan-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-cyan-600"></div>
        </label>
      </div>

      {/* Keyboard Shortcuts Info */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Keyboard className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Keyboard shortcuts:</strong>
          </p>
          <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 space-y-0.5">
            <li><kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-[10px]">Tab</kbd> Accept suggestion</li>
            <li><kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-[10px]">Esc</kbd> Dismiss suggestion</li>
            <li><kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-[10px]">Ctrl+Space</kbd> Manually trigger</li>
          </ul>
        </div>
      </div>

      {/* Settings (only show when enabled) */}
      {prefs.writingAssistant.enabled && (
        <div className="space-y-4">
          {/* Auto-Trigger */}
          <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <TextCursor className="w-5 h-5 text-cyan-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                    Auto-Trigger on Pause
                  </h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    Automatically show suggestions when you stop typing
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={prefs.writingAssistant.autoTrigger}
                    onChange={(e) => handleToggleAutoTrigger(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-300 dark:peer-focus:ring-cyan-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-cyan-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Trigger Delay (only show when auto-trigger is on) */}
          {prefs.writingAssistant.autoTrigger && (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <Clock className="w-5 h-5 text-cyan-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                    Trigger Delay
                  </h5>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {prefs.writingAssistant.triggerDelay}ms
                  </span>
                </div>
                <input
                  type="range"
                  min={300}
                  max={1000}
                  step={100}
                  value={prefs.writingAssistant.triggerDelay}
                  onChange={(e) => handleDelayChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-cyan-500"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500">Fast (300ms)</span>
                  <span className="text-xs text-gray-500">Slow (1000ms)</span>
                </div>
              </div>
            </div>
          )}

          {/* Suggestion Length */}
          <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <Info className="w-5 h-5 text-cyan-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Suggestion Length
              </h5>
              <div className="flex gap-2">
                {(['short', 'medium', 'long'] as const).map((length) => (
                  <button
                    key={length}
                    onClick={() => handleLengthChange(length)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      prefs.writingAssistant.suggestionLength === length
                        ? 'bg-cyan-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span className="capitalize">{length}</span>
                    <span className="block text-xs opacity-75 mt-0.5">
                      {length === 'short' ? '1 sentence' : length === 'medium' ? '2-3 sentences' : 'Full paragraph'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Key Requirement Notice */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Requires an OpenAI or Anthropic API key configured in Settings → API Keys
        </p>
      </div>
    </div>
  )
}

export default WritingAssistantSettings
