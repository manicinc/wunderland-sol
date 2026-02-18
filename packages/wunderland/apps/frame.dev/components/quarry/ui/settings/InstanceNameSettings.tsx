/**
 * InstanceNameSettings - UI for customizing the Fabric instance name
 * 
 * Allows users to personalize their knowledge base:
 * - "Fabric Notes" for personal notes
 * - "Fabric Health" for health tracking
 * - "Fabric School" for learning
 * - Custom names for teams/organizations
 * 
 * @module codex/ui/InstanceNameSettings
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  Sparkles,
  Check,
  RotateCcw,
  Info,
  Palette,
  Type,
  Image as ImageIcon,
  Eye,
  EyeOff
} from 'lucide-react'
import { useInstanceConfig, INSTANCE_PRESETS, DEFAULT_INSTANCE_CONFIG } from '@/lib/config'
import QuarryBrand from '../quarry-core/QuarryBrand'
import { isPublicAccess, getDisabledTooltip } from '@/lib/config/publicAccess'

interface InstanceNameSettingsProps {
  theme?: string
  className?: string
}

export default function InstanceNameSettings({
  theme,
  className = '',
}: InstanceNameSettingsProps) {
  const { config, setConfig, resetToDefaults, isCustomized, isLoaded } = useInstanceConfig()
  const { resolvedTheme } = useTheme()
  const isDark = theme?.includes('dark') ?? resolvedTheme === 'dark'
  const publicMode = isPublicAccess()
  
  const [codexName, setCodexName] = useState(config.codexName)
  const [customTagline, setCustomTagline] = useState(config.tagline || '')
  const [showCodex, setShowCodex] = useState(config.showCodexSuffix)
  const [suffixColor, setSuffixColor] = useState(config.suffixColor || '')
  const [hasChanges, setHasChanges] = useState(false)
  
  // Re-sync local state when config loads from storage (after hydration)
  useEffect(() => {
    if (isLoaded) {
      setCodexName(config.codexName)
      setCustomTagline(config.tagline || '')
      setShowCodex(config.showCodexSuffix)
      setSuffixColor(config.suffixColor || '')
      setHasChanges(false)
    }
  }, [isLoaded, config.codexName, config.tagline, config.showCodexSuffix, config.suffixColor])
  
  // Track changes
  const handleCodexNameChange = (name: string) => {
    setCodexName(name)
    setHasChanges(true)
  }
  
  const handleTaglineChange = (tagline: string) => {
    setCustomTagline(tagline)
    setHasChanges(true)
  }
  
  const handleCodexToggle = () => {
    setShowCodex(!showCodex)
    setHasChanges(true)
  }
  
  const handleColorChange = (color: string) => {
    setSuffixColor(color)
    setHasChanges(true)
  }
  
  const handlePresetSelect = (preset: typeof INSTANCE_PRESETS[0]) => {
    setCodexName(preset.codexName)
    setCustomTagline(preset.tagline)
    if (preset.color) setSuffixColor(preset.color)
    setHasChanges(true)
  }
  
  const handleSave = () => {
    setConfig({
      codexName: codexName.trim() || 'Codex',
      tagline: customTagline.trim() || undefined,
      showCodexSuffix: showCodex,
      suffixColor: suffixColor || undefined,
    })
    setHasChanges(false)
  }
  
  const handleReset = () => {
    resetToDefaults()
    setCodexName(DEFAULT_INSTANCE_CONFIG.codexName)
    setCustomTagline(DEFAULT_INSTANCE_CONFIG.tagline || '')
    setShowCodex(DEFAULT_INSTANCE_CONFIG.showCodexSuffix)
    setSuffixColor('')
    setHasChanges(false)
  }
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with info */}
      <div className="space-y-2">
        <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
          <Sparkles className="w-4 h-4 text-emerald-500" />
          Codex Name
        </h3>
        <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Customize your knowledge base suffix. "Fabric" is the brand - you can change what comes after it: Codex, Garden, Notes, Library, and more.
        </p>
      </div>
      
      {/* Live Preview */}
      <div className={`p-4 rounded-xl border ${isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'}`}>
        <p className={`text-[10px] uppercase tracking-wider mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Preview
        </p>
        <div className="flex items-center gap-3">
          <QuarryBrand
            size="md"
            showIcon={true}
            showTagline={true}
            linkToHome={false}
            theme={theme}
            // Pass current editing state for live preview
            previewCodexName={codexName || 'Codex'}
            previewSuffixColor={suffixColor || undefined}
            previewTagline={customTagline || undefined}
            previewShowSuffix={showCodex}
          />
        </div>
      </div>
      
      {/* Preset Quick Select */}
      <div className="space-y-2">
        <p className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Quick Presets
        </p>
        <div className="flex flex-wrap gap-2">
          {INSTANCE_PRESETS.map((preset) => (
            <motion.button
              key={preset.codexName}
              onClick={() => handlePresetSelect(preset)}
              disabled={publicMode}
              title={publicMode ? getDisabledTooltip('Instance name') : undefined}
              whileHover={publicMode ? undefined : { scale: 1.02 }}
              whileTap={publicMode ? undefined : { scale: 0.98 }}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium
                border transition-colors flex items-center gap-1.5
                ${publicMode
                  ? 'opacity-60 cursor-not-allowed'
                  : codexName === preset.codexName
                    ? 'text-white border-transparent'
                    : isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                      : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                }
              `}
              style={codexName === preset.codexName && preset.color ? { backgroundColor: preset.color } : undefined}
            >
              {preset.emoji && <span>{preset.emoji}</span>}
              {preset.codexName}
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Custom Codex Name Input */}
      <div className="space-y-2">
        <label className={`text-xs font-medium flex items-center gap-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          <Type className="w-3.5 h-3.5" />
          Custom Suffix Name
        </label>
        <input
          type="text"
          value={codexName}
          onChange={(e) => handleCodexNameChange(e.target.value)}
          placeholder="Codex"
          maxLength={20}
          disabled={publicMode}
          title={publicMode ? getDisabledTooltip('Instance name') : undefined}
          className={`
            w-full px-3 py-2 rounded-lg text-sm
            border transition-colors
            focus:outline-none focus:ring-2 focus:ring-emerald-500
            ${publicMode ? 'opacity-60 cursor-not-allowed' : ''}
            ${isDark
              ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500'
              : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
            }
          `}
        />
        <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          This will appear as "Fabric{showCodex ? ` ${codexName || 'Codex'}` : ''}"
        </p>
      </div>
      
      {/* Tagline Input */}
      <div className="space-y-2">
        <label className={`text-xs font-medium flex items-center gap-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          <Info className="w-3.5 h-3.5" />
          Tagline (optional)
        </label>
        <input
          type="text"
          value={customTagline}
          onChange={(e) => handleTaglineChange(e.target.value)}
          placeholder="Your knowledge fabric"
          maxLength={50}
          disabled={publicMode}
          title={publicMode ? getDisabledTooltip('Tagline') : undefined}
          className={`
            w-full px-3 py-2 rounded-lg text-sm
            border transition-colors
            focus:outline-none focus:ring-2 focus:ring-emerald-500
            ${publicMode ? 'opacity-60 cursor-not-allowed' : ''}
            ${isDark
              ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500'
              : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
            }
          `}
        />
      </div>
      
      {/* Show Suffix Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showCodex ? <Eye className="w-3.5 h-3.5 text-emerald-500" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-400" />}
          <span className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            Show suffix (e.g., "Codex")
          </span>
        </div>
        <button
          onClick={handleCodexToggle}
          disabled={publicMode}
          title={publicMode ? getDisabledTooltip('Suffix toggle') : undefined}
          className={`
            relative w-10 h-5 rounded-full transition-colors
            ${publicMode ? 'opacity-60 cursor-not-allowed' : ''}
            ${showCodex
              ? 'bg-emerald-500'
              : isDark ? 'bg-zinc-700' : 'bg-zinc-300'
            }
          `}
        >
          <motion.div
            className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow"
            animate={{ x: showCodex ? 20 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      </div>
      
      {/* Suffix Color */}
      <div className="space-y-2">
        <label className={`text-xs font-medium flex items-center gap-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          <Palette className="w-3.5 h-3.5" />
          Suffix Color
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={suffixColor || '#10b981'}
            onChange={(e) => handleColorChange(e.target.value)}
            disabled={publicMode}
            title={publicMode ? getDisabledTooltip('Suffix color') : undefined}
            className={`w-8 h-8 rounded cursor-pointer border-0 ${publicMode ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
          <input
            type="text"
            value={suffixColor}
            onChange={(e) => handleColorChange(e.target.value)}
            placeholder="#10b981 (emerald)"
            disabled={publicMode}
            title={publicMode ? getDisabledTooltip('Suffix color') : undefined}
            className={`
              flex-1 px-3 py-2 rounded-lg text-sm font-mono
              border transition-colors
              focus:outline-none focus:ring-2 focus:ring-emerald-500
              ${publicMode ? 'opacity-60 cursor-not-allowed' : ''}
              ${isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
              }
            `}
          />
          {suffixColor && !publicMode && (
            <button
              onClick={() => handleColorChange('')}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'}`}
              title="Clear color"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          )}
        </div>
        <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          This color is applied to the suffix text in the nav header.
        </p>
      </div>
      
      {/* Info Box */}
      <div className={`p-3 rounded-lg text-xs ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
        <p className="font-medium mb-1">💡 Deployment Tip</p>
        <p className="opacity-80">
          For team deployments, set <code className="px-1 py-0.5 rounded bg-black/10">NEXT_PUBLIC_FABRIC_CODEX_NAME</code> and <code className="px-1 py-0.5 rounded bg-black/10">NEXT_PUBLIC_FABRIC_SUFFIX_COLOR</code> in your environment variables. This will be the default for all users.
        </p>
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2">
        <motion.button
          onClick={handleSave}
          disabled={!hasChanges || publicMode}
          title={publicMode ? getDisabledTooltip('Save') : undefined}
          whileHover={hasChanges && !publicMode ? { scale: 1.02 } : undefined}
          whileTap={hasChanges && !publicMode ? { scale: 0.98 } : undefined}
          className={`
            flex-1 px-4 py-2 rounded-lg text-sm font-medium
            flex items-center justify-center gap-2
            transition-colors
            ${publicMode
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed opacity-60'
              : hasChanges
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : isDark
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
            }
          `}
        >
          <Check className="w-4 h-4" />
          Save Changes
        </motion.button>
        
        {isCustomized && !publicMode && (
          <motion.button
            onClick={handleReset}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium
              flex items-center justify-center gap-2
              border transition-colors
              ${isDark
                ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50'
              }
            `}
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </motion.button>
        )}
      </div>
    </div>
  )
}

