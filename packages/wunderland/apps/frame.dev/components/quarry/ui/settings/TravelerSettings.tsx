'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  User,
  Compass,
  Sparkles,
  Check,
  RotateCcw,
  Palette,
  AlertTriangle,
  Info,
  Github,
} from 'lucide-react'
import {
  getTravelerConfig,
  setTravelerConfig,
  resetTravelerConfig,
  PRESET_TRAVELERS,
  TRAVELER_ACCENT_COLORS,
  canEditTravelerConfig,
  type TravelerConfig,
} from '@/lib/config/travelerConfig'

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface TravelerSettingsProps {
  backendType?: 'local' | 'github' | 'hybrid'
  hasPAT?: boolean
}

export default function TravelerSettings({
  backendType = 'local',
  hasPAT = false,
}: TravelerSettingsProps) {
  const { theme } = useTheme()
  const isDark = theme?.includes('dark')
  
  const [config, setConfig] = useState<TravelerConfig>(getTravelerConfig())
  const [customName, setCustomName] = useState(config.name)
  const [customTitle, setCustomTitle] = useState(config.title || '')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  
  // Check edit permissions
  const { canEdit, reason: editRestrictionReason } = canEditTravelerConfig(backendType, hasPAT)
  
  // Sync from config
  useEffect(() => {
    const loaded = getTravelerConfig()
    setConfig(loaded)
    setCustomName(loaded.name)
    setCustomTitle(loaded.title || '')
  }, [])
  
  // Clear status after timeout
  useEffect(() => {
    if (saveStatus !== 'idle') {
      const timer = setTimeout(() => setSaveStatus('idle'), 2000)
      return () => clearTimeout(timer)
    }
  }, [saveStatus])
  
  // Handlers
  const handleSave = useCallback((updates: Partial<TravelerConfig>) => {
    if (!canEdit) return
    
    try {
      setTravelerConfig(updates)
      setConfig(getTravelerConfig())
      setSaveStatus('saved')
    } catch (e) {
      console.error('Failed to save traveler config:', e)
      setSaveStatus('error')
    }
  }, [canEdit])
  
  const handlePresetSelect = useCallback((preset: typeof PRESET_TRAVELERS[number]) => {
    setCustomName(preset.name)
    setCustomTitle(preset.title)
    handleSave({ name: preset.name, title: preset.title })
  }, [handleSave])
  
  const handleCustomNameChange = useCallback((name: string) => {
    setCustomName(name)
  }, [])
  
  const handleCustomNameBlur = useCallback(() => {
    if (customName !== config.name) {
      handleSave({ name: customName })
    }
  }, [customName, config.name, handleSave])
  
  const handleCustomTitleChange = useCallback((title: string) => {
    setCustomTitle(title)
  }, [])
  
  const handleCustomTitleBlur = useCallback(() => {
    if (customTitle !== config.title) {
      handleSave({ title: customTitle })
    }
  }, [customTitle, config.title, handleSave])
  
  const handleColorSelect = useCallback((color: string) => {
    handleSave({ accentColor: color })
  }, [handleSave])
  
  const handleReset = useCallback(() => {
    resetTravelerConfig()
    const defaultConfig = getTravelerConfig()
    setConfig(defaultConfig)
    setCustomName(defaultConfig.name)
    setCustomTitle(defaultConfig.title || '')
    setSaveStatus('saved')
  }, [])
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Compass className="w-4 h-4 text-violet-500" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Traveler Identity
        </h3>
      </div>
      
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Personalize how you're identified in Quarry Codex. This name appears in greetings, 
        activity logs, and collaborative features.
      </p>
      
      {/* Backend restriction notice */}
      {!canEdit && editRestrictionReason && (
        <div className={`
          flex items-start gap-2 p-3 rounded-lg
          ${isDark ? 'bg-amber-900/20 border border-amber-800/50' : 'bg-amber-50 border border-amber-200'}
        `}>
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-600 dark:text-amber-400">
            {editRestrictionReason}
          </div>
        </div>
      )}
      
      {/* Current Identity Preview */}
      <div className={`
        p-4 rounded-xl border
        ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}
      `}>
        <div className="flex items-center gap-3">
          {/* Avatar placeholder */}
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
            style={{ backgroundColor: config.accentColor || '#8b5cf6' }}
          >
            <span className="text-white font-bold">
              {config.name.charAt(0).toUpperCase()}
            </span>
          </div>
          
          <div className="flex-1">
            <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {config.name}
            </div>
            {config.title && (
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {config.title}
              </div>
            )}
          </div>
          
          {/* Save status */}
          <AnimatePresence mode="wait">
            {saveStatus === 'saved' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1.5 text-emerald-500 text-xs"
              >
                <Check className="w-4 h-4" />
                Saved
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Preset Travelers */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Choose a preset identity:
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_TRAVELERS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePresetSelect(preset)}
              disabled={!canEdit}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg border
                text-left text-sm transition-all
                ${config.name === preset.name
                  ? 'bg-violet-100 border-violet-300 dark:bg-violet-900/30 dark:border-violet-700'
                  : isDark
                    ? 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800'
                    : 'bg-white border-zinc-200 hover:bg-zinc-50'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              title={preset.description}
            >
              <span className="text-base">{preset.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {preset.name}
                </div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                  {preset.title}
                </div>
              </div>
              {config.name === preset.name && (
                <Check className="w-4 h-4 text-violet-500 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Custom Name */}
      <div className="space-y-2">
        <label htmlFor="traveler-name" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Custom Name
        </label>
        <input
          id="traveler-name"
          type="text"
          value={customName}
          onChange={(e) => handleCustomNameChange(e.target.value)}
          onBlur={handleCustomNameBlur}
          disabled={!canEdit}
          placeholder="Enter your name"
          className={`
            w-full px-3 py-2 rounded-lg border text-sm
            ${isDark
              ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500'
              : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
            }
            focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        />
      </div>
      
      {/* Custom Title */}
      <div className="space-y-2">
        <label htmlFor="traveler-title" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Title / Role (optional)
        </label>
        <input
          id="traveler-title"
          type="text"
          value={customTitle}
          onChange={(e) => handleCustomTitleChange(e.target.value)}
          onBlur={handleCustomTitleBlur}
          disabled={!canEdit}
          placeholder="e.g., Student, Researcher, Creator"
          className={`
            w-full px-3 py-2 rounded-lg border text-sm
            ${isDark
              ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500'
              : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
            }
            focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        />
      </div>
      
      {/* Accent Color */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5" />
          Accent Color
        </label>
        <div className="flex flex-wrap gap-2">
          {TRAVELER_ACCENT_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => handleColorSelect(color.value)}
              disabled={!canEdit}
              className={`
                w-8 h-8 rounded-full relative transition-all
                ${config.accentColor === color.value
                  ? 'ring-2 ring-offset-2 ring-violet-500 dark:ring-offset-zinc-900'
                  : 'hover:scale-110'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              style={{ backgroundColor: color.value }}
              title={color.name}
            >
              {config.accentColor === color.value && (
                <Check className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Info about backend */}
      <div className={`
        flex items-start gap-2 p-3 rounded-lg
        ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}
      `}>
        <Info className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
        <div className="text-[10px] text-zinc-500 space-y-1">
          <p>
            <strong>Local/SQLite:</strong> Changes saved instantly, accessible offline.
          </p>
          <p>
            <strong>GitHub Backend:</strong> {hasPAT 
              ? 'Connected! Changes sync to your repository.' 
              : 'Add a PAT in GitHub Integration to sync across devices.'
            }
          </p>
        </div>
      </div>
      
      {/* Reset */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <button
          onClick={handleReset}
          disabled={!canEdit}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
            ${isDark ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'}
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset to Default
        </button>
      </div>
    </div>
  )
}

