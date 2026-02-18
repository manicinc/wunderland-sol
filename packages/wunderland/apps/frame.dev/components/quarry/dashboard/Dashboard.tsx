/**
 * Dashboard Component
 *
 * Main dashboard orchestrator with widget grid and optional welcome sidebar.
 * Navigation is handled by QuarryPageLayout wrapper.
 * @module components/quarry/dashboard/Dashboard
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings2,
  Plus,
  RotateCcw,
  X,
  Layout,
  LayoutGrid,
  Layers,
  Target,
  Minimize2,
  Save,
  Trash2,
  Star,
} from 'lucide-react'
import { DashboardGrid } from './DashboardGrid'
import { DashboardSidebar } from './DashboardSidebar'
import { useDashboardConfig } from './hooks/useDashboardConfig'
import { getWidget } from './widgets'
import type { WidgetId, LayoutPreset } from './types'
import { LAYOUT_PRESETS } from './types'
import PublicDemoBanner from '../ui/status/PublicDemoBanner'

interface DashboardProps {
  /** Theme setting */
  theme: string
  /** Navigation handler */
  onNavigate: (path: string) => void
  /** Whether to show sidebar */
  showSidebar?: boolean
}

export function Dashboard({
  theme,
  onNavigate,
  showSidebar = true,
}: DashboardProps) {
  const isDark = theme.includes('dark')
  const [isEditing, setIsEditing] = useState(false)
  const [showSavePreset, setShowSavePreset] = useState(false)
  const [presetName, setPresetName] = useState('')

  const {
    config,
    isLoading,
    visibleWidgets,
    hiddenWidgets,
    toggleWidget,
    resetToDefaults,
    setLayouts,
    updateLayout,
    toggleWelcomeSidebar,
    toggleReplaceHomepage,
    saveCurrentAsPreset,
    deleteCustomPreset,
    applyCustomPreset,
    customPresets,
    canSaveMorePresets,
  } = useDashboardConfig()

  const handleSavePreset = () => {
    if (presetName.trim()) {
      saveCurrentAsPreset(presetName.trim())
      setPresetName('')
      setShowSavePreset(false)
    }
  }

  const handleRemoveWidget = (id: string) => {
    toggleWidget(id as WidgetId)
  }

  const handleAddWidget = (id: WidgetId) => {
    toggleWidget(id)
  }

  const handleResizeWidget = (id: WidgetId, size: 'small' | 'medium' | 'large') => {
    const sizeMap = {
      small: { w: 3, h: 2 },
      medium: { w: 4, h: 2 },
      large: { w: 6, h: 3 },
    }
    updateLayout(id, sizeMap[size])
  }

  const handleApplyPreset = (preset: LayoutPreset) => {
    setLayouts(LAYOUT_PRESETS[preset].layouts)
  }

  // Preset icons mapping
  const presetIcons: Record<LayoutPreset, typeof Layout> = {
    default: LayoutGrid,
    compact: Layers,
    focus: Target,
    minimal: Minimize2,
  }

  if (isLoading) {
    return (
      <div className={`
        flex items-center justify-center h-64
        ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
      `}>
        <LayoutGrid className="w-8 h-8 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Public Demo Banner - shows only in public access mode */}
      <PublicDemoBanner />

      <div className="flex flex-1 overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 lg:p-6 relative">

        {/* Widget Management Bar - visible in edit mode */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className={`
                p-4 rounded-xl border
                ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}
              `}>
                {/* Layout Presets */}
                <div className="mb-4 pb-4 border-b border-zinc-700/50">
                  <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    Layout Presets
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.keys(LAYOUT_PRESETS) as LayoutPreset[]).map((presetKey) => {
                      const preset = LAYOUT_PRESETS[presetKey]
                      const PresetIcon = presetIcons[presetKey]
                      return (
                        <motion.button
                          key={presetKey}
                          onClick={() => handleApplyPreset(presetKey)}
                          className={`
                            flex flex-col items-center gap-2 p-3 rounded-lg
                            text-center transition-colors
                            ${isDark
                              ? 'bg-zinc-700/50 hover:bg-zinc-600 text-zinc-300'
                              : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200'
                            }
                          `}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <PresetIcon className="w-5 h-5" />
                          <div>
                            <div className="text-sm font-medium">{preset.name}</div>
                            <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                              {preset.description}
                            </div>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>

                  {/* Custom Presets */}
                  {(customPresets.length > 0 || canSaveMorePresets) && (
                    <div className="mt-4 pt-3 border-t border-zinc-600/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          My Presets ({customPresets.length}/5)
                        </span>
                        {canSaveMorePresets && (
                          <button
                            onClick={() => setShowSavePreset(!showSavePreset)}
                            className={`
                              flex items-center gap-1 px-2 py-1 rounded text-xs
                              transition-colors
                              ${isDark
                                ? 'text-violet-400 hover:text-violet-300 hover:bg-violet-900/30'
                                : 'text-violet-600 hover:text-violet-700 hover:bg-violet-100'
                              }
                            `}
                          >
                            <Save className="w-3 h-3" />
                            Save Current
                          </button>
                        )}
                      </div>

                      {/* Save preset input */}
                      <AnimatePresence>
                        {showSavePreset && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mb-2"
                          >
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={presetName}
                                onChange={(e) => setPresetName(e.target.value)}
                                placeholder="Preset name..."
                                className={`
                                  flex-1 px-3 py-1.5 rounded-lg text-sm
                                  ${isDark
                                    ? 'bg-zinc-700 text-zinc-200 placeholder-zinc-500 border-zinc-600'
                                    : 'bg-white text-zinc-800 placeholder-zinc-400 border-zinc-300'
                                  }
                                  border focus:outline-none focus:ring-2 focus:ring-violet-500/50
                                `}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSavePreset()
                                  if (e.key === 'Escape') setShowSavePreset(false)
                                }}
                                autoFocus
                              />
                              <button
                                onClick={handleSavePreset}
                                disabled={!presetName.trim()}
                                className={`
                                  px-3 py-1.5 rounded-lg text-sm font-medium
                                  transition-colors
                                  ${presetName.trim()
                                    ? 'bg-violet-500 text-white hover:bg-violet-600'
                                    : isDark
                                      ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                                      : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                                  }
                                `}
                              >
                                Save
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Custom preset list */}
                      {customPresets.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {customPresets.map((preset) => (
                            <div
                              key={preset.id}
                              className={`
                                flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg
                                ${isDark
                                  ? 'bg-zinc-700/50 text-zinc-300'
                                  : 'bg-zinc-100 text-zinc-700'
                                }
                              `}
                            >
                              <button
                                onClick={() => applyCustomPreset(preset.id)}
                                className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity"
                              >
                                <Star className="w-3 h-3 text-amber-500" />
                                {preset.name}
                              </button>
                              <button
                                onClick={() => deleteCustomPreset(preset.id)}
                                className={`
                                  p-1 rounded hover:bg-red-500/20 transition-colors
                                  ${isDark ? 'text-zinc-500 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'}
                                `}
                                title="Delete preset"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Settings Toggles */}
                <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b border-zinc-700/50">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.replaceHomepage}
                      onChange={toggleReplaceHomepage}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-violet-500 focus:ring-violet-500"
                    />
                    <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                      Set as Homepage
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showWelcomeSidebar}
                      onChange={toggleWelcomeSidebar}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-violet-500 focus:ring-violet-500"
                    />
                    <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                      Show Welcome Sidebar
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    Add Widgets
                  </h3>
                  <button
                    onClick={resetToDefaults}
                    className={`
                      flex items-center gap-1.5 px-2 py-1 rounded text-xs
                      transition-colors
                      ${isDark
                        ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                        : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200'
                      }
                    `}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {hiddenWidgets.map((layout) => {
                    const widget = getWidget(layout.id)
                    if (!widget) return null
                    const Icon = widget.icon

                    return (
                      <motion.button
                        key={layout.id}
                        onClick={() => handleAddWidget(layout.id)}
                        className={`
                          flex items-center gap-2 px-3 py-2 rounded-lg
                          text-sm transition-colors
                          ${isDark
                            ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                            : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
                          }
                        `}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Plus className="w-4 h-4" />
                        <Icon className="w-4 h-4" />
                        {widget.title}
                      </motion.button>
                    )
                  })}
                  {hiddenWidgets.length === 0 && (
                    <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      All widgets are visible
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Customize Button - positioned in corner */}
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`
            absolute top-4 right-4 z-10
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
            text-xs font-medium transition-all shadow-sm
            ${isEditing
              ? 'bg-rose-500 text-white hover:bg-rose-600'
              : isDark
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
                : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200'
            }
          `}
        >
          {isEditing ? (
            <>
              <X className="w-3.5 h-3.5" />
              Done
            </>
          ) : (
            <>
              <Settings2 className="w-3.5 h-3.5" />
              Customize
            </>
          )}
        </button>

        {/* Widget Grid */}
        <DashboardGrid
          layouts={config.layouts}
          theme={theme}
          isEditing={isEditing}
          onNavigate={onNavigate}
          onRemoveWidget={isEditing ? handleRemoveWidget : undefined}
          onResizeWidget={isEditing ? handleResizeWidget : undefined}
          onLayoutChange={setLayouts}
        />
      </div>

      {/* Right Sidebar */}
      {showSidebar && config.showWelcomeSidebar && (
        <motion.div
          className={`
            hidden lg:block w-80 flex-shrink-0 border-l
            ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}
          `}
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <DashboardSidebar
            theme={theme}
            onNavigate={onNavigate}
            onOpenSettings={() => setIsEditing(true)}
          />
        </motion.div>
      )}
      </div>
    </div>
  )
}

export default Dashboard
