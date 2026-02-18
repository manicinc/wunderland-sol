/**
 * Extension Theme Picker
 * @module codex/ui/ExtensionThemePicker
 */

'use client'

import React, { useEffect, useState } from 'react'
import { Check, Sparkles, Lock } from 'lucide-react'

// Dynamic import to avoid build errors if package isn't available
let extensionManager: any = null
let registerInternalExtensions: any = null
let applyTheme: any = null

if (typeof window !== 'undefined') {
  try {
    const ext = require('@framers/codex-extensions')
    extensionManager = ext.extensionManager
    registerInternalExtensions = ext.registerInternalExtensions
    applyTheme = ext.applyTheme
  } catch (err) {
    console.warn('[Extensions] Package not available:', err)
  }
}

interface ExtensionThemePickerProps {
  activeThemeId?: string
  onThemeChange?: (themeId: string) => void
  hasPremium?: boolean
}

export default function ExtensionThemePicker({
  activeThemeId,
  onThemeChange,
  hasPremium = false,
}: ExtensionThemePickerProps) {
  const [themes, setThemes] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState(activeThemeId)

  useEffect(() => {
    if (!extensionManager || !registerInternalExtensions) return
    
    registerInternalExtensions()
    const availableThemes = extensionManager.getThemes()
    setThemes(availableThemes)
  }, [])

  const handleSelectTheme = (themeId: string, isPremium: boolean) => {
    if (isPremium && !hasPremium) {
      alert('This is a premium theme. Upgrade to Codex Pro to unlock.')
      return
    }

    setSelectedId(themeId)
    if (applyTheme) {
      applyTheme(themeId)
    }
    onThemeChange?.(themeId)
  }

  if (!extensionManager) {
    return (
      <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
        Extension themes unavailable. Install @framers/codex-extensions to unlock.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Premium Themes
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {themes.length} available
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {themes.map((theme: any) => {
          const isPremium = theme.tags?.includes('premium')
          const isLocked = isPremium && !hasPremium
          const isActive = selectedId === theme.id

          return (
            <button
              key={theme.id}
              onClick={() => handleSelectTheme(theme.id, !!isPremium)}
              disabled={isLocked}
              className={`
                relative p-4 rounded-lg border-2 transition-all text-left
                ${isActive
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                }
                ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {isActive && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              {isPremium && (
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                  {isLocked ? <Lock className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5" />}
                  PRO
                </div>
              )}

              <div className="mt-2">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {theme.name}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {theme.tags?.join(' • ')}
                </p>
              </div>

              <div className="flex gap-1 mt-3">
                {Object.entries(theme.colors).slice(0, 4).map(([key, value]: [string, any]) => (
                  <div 
                    key={key}
                    className="w-6 h-6 rounded border border-gray-300 dark:border-gray-700"
                    style={{ backgroundColor: value }}
                    title={key}
                  />
                ))}
              </div>
            </button>
          )
        })}
      </div>

      {themes.some((t: any) => t.tags?.includes('premium')) && !hasPremium && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            <strong>Premium themes</strong> require Codex Pro. <a href="/pricing" className="underline hover:no-underline">Upgrade now</a>.
          </p>
        </div>
      )}
    </div>
  )
}

