/**
 * Performance Settings Panel
 * @module codex/ui/PerformanceSettings
 * 
 * @description
 * UI component for users to view and override performance settings.
 * Shows detected capabilities and allows manual tier selection.
 * 
 * Features:
 * - View detected device capabilities
 * - Override automatic tier detection
 * - Test current performance settings
 * - Reset to automatic detection
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cpu,
  Wifi,
  Monitor,
  Zap,
  Settings,
  RefreshCw,
  Check,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronRight,
  Gauge,
  Smartphone,
  Laptop,
  Activity,
} from 'lucide-react'
import { useDeviceCapabilities, PerformanceTier } from '../../hooks/useDeviceCapabilities'
import { TIER_FEATURE_CONFIG, TierFeatureConfig } from '../../lib/responsiveConfig'

interface PerformanceSettingsProps {
  /** Compact mode for dropdown/popover */
  compact?: boolean
  /** Called when settings change */
  onSettingsChange?: (tier: PerformanceTier | null) => void
}

const TIER_INFO: Record<PerformanceTier, {
  label: string
  description: string
  icon: React.ReactNode
  color: string
}> = {
  high: {
    label: 'High Performance',
    description: 'All features enabled, full animations, live graphs',
    icon: <Zap className="w-4 h-4" />,
    color: 'text-emerald-500',
  },
  medium: {
    label: 'Balanced',
    description: 'Most features, optimized animations',
    icon: <Gauge className="w-4 h-4" />,
    color: 'text-blue-500',
  },
  low: {
    label: 'Power Saver',
    description: 'Reduced effects, faster loading',
    icon: <Activity className="w-4 h-4" />,
    color: 'text-amber-500',
  },
  minimal: {
    label: 'Minimal',
    description: 'Essential features only, fastest performance',
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-red-500',
  },
}

export default function PerformanceSettings({
  compact = false,
  onSettingsChange,
}: PerformanceSettingsProps) {
  const {
    capabilities,
    tier,
    tierOverride,
    setTierOverride,
    shouldEnable,
    isDetecting,
  } = useDeviceCapabilities()

  const [showDetails, setShowDetails] = useState(false)

  const handleTierChange = (newTier: PerformanceTier | null) => {
    setTierOverride(newTier)
    onSettingsChange?.(newTier)
  }

  const currentTierInfo = TIER_INFO[tier]

  // Compact dropdown mode
  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-100 dark:bg-ink-800 hover:bg-ink-200 dark:hover:bg-ink-700 transition-colors text-sm"
        >
          <span className={currentTierInfo.color}>{currentTierInfo.icon}</span>
          <span className="text-ink-700 dark:text-ink-300">{currentTierInfo.label}</span>
          {tierOverride && (
            <span className="text-xs text-ink-400">(Manual)</span>
          )}
          <ChevronDown className={`w-4 h-4 text-ink-400 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-64 p-3 rounded-xl bg-paper-50 dark:bg-ink-900 border border-ink-200 dark:border-ink-700 shadow-xl z-50"
            >
              <div className="space-y-2">
                {/* Auto option */}
                <button
                  onClick={() => handleTierChange(null)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    !tierOverride
                      ? 'bg-frame-100 dark:bg-frame-900/30 text-frame-700 dark:text-frame-300'
                      : 'hover:bg-ink-100 dark:hover:bg-ink-800'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Auto Detect</div>
                    <div className="text-xs text-ink-400">Recommended</div>
                  </div>
                  {!tierOverride && <Check className="w-4 h-4 ml-auto text-frame-500" />}
                </button>

                <hr className="border-ink-200 dark:border-ink-700" />

                {/* Tier options */}
                {(Object.keys(TIER_INFO) as PerformanceTier[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleTierChange(t)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      tierOverride === t
                        ? 'bg-frame-100 dark:bg-frame-900/30 text-frame-700 dark:text-frame-300'
                        : 'hover:bg-ink-100 dark:hover:bg-ink-800'
                    }`}
                  >
                    <span className={TIER_INFO[t].color}>{TIER_INFO[t].icon}</span>
                    <div className="text-left flex-1">
                      <div className="text-sm font-medium">{TIER_INFO[t].label}</div>
                    </div>
                    {tierOverride === t && <Check className="w-4 h-4 text-frame-500" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Full panel mode
  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-frame-100 dark:bg-frame-900/30">
            <Settings className="w-5 h-5 text-frame-600 dark:text-frame-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ink-900 dark:text-paper-50">
              Performance Settings
            </h3>
            <p className="text-sm text-ink-500 dark:text-ink-400">
              Optimize your experience
            </p>
          </div>
        </div>
      </div>

      {/* Current Tier Display */}
      <div className="p-4 rounded-xl bg-ink-100/50 dark:bg-ink-800/50 border border-ink-200 dark:border-ink-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-ink-500 dark:text-ink-400">
            Current Mode
          </span>
          {tierOverride && (
            <button
              onClick={() => handleTierChange(null)}
              className="text-xs text-frame-600 dark:text-frame-400 hover:underline"
            >
              Reset to Auto
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${currentTierInfo.color} bg-current/10`}>
            {currentTierInfo.icon}
          </div>
          <div>
            <div className="font-semibold text-ink-900 dark:text-paper-50">
              {currentTierInfo.label}
              {tierOverride && (
                <span className="ml-2 text-xs font-normal text-ink-400">(Manual)</span>
              )}
            </div>
            <div className="text-sm text-ink-500 dark:text-ink-400">
              {currentTierInfo.description}
            </div>
          </div>
        </div>
      </div>

      {/* Tier Selection */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-ink-700 dark:text-ink-300">
          Select Performance Mode
        </h4>
        
        {/* Auto Detect Option */}
        <button
          onClick={() => handleTierChange(null)}
          className={`w-full p-3 rounded-xl border transition-all ${
            !tierOverride
              ? 'bg-frame-50 dark:bg-frame-900/20 border-frame-300 dark:border-frame-700'
              : 'bg-paper-50 dark:bg-ink-900 border-ink-200 dark:border-ink-700 hover:border-frame-300 dark:hover:border-frame-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <RefreshCw className={`w-5 h-5 ${!tierOverride ? 'text-frame-500' : 'text-ink-400'}`} />
            <div className="text-left flex-1">
              <div className="font-medium text-ink-900 dark:text-paper-50">
                Auto Detect
              </div>
              <div className="text-sm text-ink-500 dark:text-ink-400">
                Automatically adjusts based on your device
              </div>
            </div>
            {!tierOverride && <Check className="w-5 h-5 text-frame-500" />}
          </div>
        </button>

        {/* Manual Options */}
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(TIER_INFO) as PerformanceTier[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTierChange(t)}
              className={`p-3 rounded-xl border transition-all ${
                tierOverride === t
                  ? 'bg-frame-50 dark:bg-frame-900/20 border-frame-300 dark:border-frame-700'
                  : 'bg-paper-50 dark:bg-ink-900 border-ink-200 dark:border-ink-700 hover:border-frame-300 dark:hover:border-frame-600'
              }`}
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <span className={TIER_INFO[t].color}>{TIER_INFO[t].icon}</span>
                <span className="text-sm font-medium text-ink-900 dark:text-paper-50">
                  {TIER_INFO[t].label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detected Capabilities */}
      <div className="space-y-3">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm font-medium text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-200"
        >
          {showDetails ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          Device Capabilities
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-3 pt-2">
                {/* CPU */}
                <div className="p-3 rounded-lg bg-ink-100/50 dark:bg-ink-800/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu className="w-4 h-4 text-ink-400" />
                    <span className="text-xs text-ink-500 dark:text-ink-400">CPU Cores</span>
                  </div>
                  <div className="text-lg font-semibold text-ink-900 dark:text-paper-50">
                    {capabilities.cpuCores}
                  </div>
                </div>

                {/* Memory */}
                <div className="p-3 rounded-lg bg-ink-100/50 dark:bg-ink-800/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-ink-400" />
                    <span className="text-xs text-ink-500 dark:text-ink-400">Memory</span>
                  </div>
                  <div className="text-lg font-semibold text-ink-900 dark:text-paper-50">
                    {capabilities.deviceMemory ? `${capabilities.deviceMemory}GB` : 'Unknown'}
                  </div>
                </div>

                {/* Screen */}
                <div className="p-3 rounded-lg bg-ink-100/50 dark:bg-ink-800/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Monitor className="w-4 h-4 text-ink-400" />
                    <span className="text-xs text-ink-500 dark:text-ink-400">Screen</span>
                  </div>
                  <div className="text-lg font-semibold text-ink-900 dark:text-paper-50">
                    {capabilities.screenWidth}×{capabilities.screenHeight}
                  </div>
                </div>

                {/* Network */}
                <div className="p-3 rounded-lg bg-ink-100/50 dark:bg-ink-800/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Wifi className="w-4 h-4 text-ink-400" />
                    <span className="text-xs text-ink-500 dark:text-ink-400">Network</span>
                  </div>
                  <div className="text-lg font-semibold text-ink-900 dark:text-paper-50 capitalize">
                    {capabilities.connectionType}
                  </div>
                </div>
              </div>

              {/* Feature Support */}
              <div className="mt-3 p-3 rounded-lg bg-ink-100/50 dark:bg-ink-800/50">
                <div className="text-xs text-ink-500 dark:text-ink-400 mb-2">Features Supported</div>
                <div className="flex flex-wrap gap-2">
                  {capabilities.supportsWebGL && (
                    <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                      WebGL
                    </span>
                  )}
                  {capabilities.supportsWebWorker && (
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      WebWorker
                    </span>
                  )}
                  {capabilities.supportsServiceWorker && (
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                      Service Worker
                    </span>
                  )}
                  {capabilities.isTouchDevice && (
                    <span className="px-2 py-1 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                      Touch
                    </span>
                  )}
                  {capabilities.isReducedMotion && (
                    <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                      Reduced Motion
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Current Feature Status */}
      <div className="p-4 rounded-xl bg-ink-100/30 dark:bg-ink-800/30 border border-ink-200/50 dark:border-ink-700/50">
        <h4 className="text-sm font-medium text-ink-700 dark:text-ink-300 mb-3">
          Current Features
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <FeatureIndicator label="Animations" enabled={shouldEnable('complexAnimations')} />
          <FeatureIndicator label="Live Graph" enabled={shouldEnable('d3PhysicsSimulation')} />
          <FeatureIndicator label="Effects" enabled={shouldEnable('backgroundEffects')} />
          <FeatureIndicator label="AI Features" enabled={shouldEnable('aiFeatures')} />
          <FeatureIndicator label="Semantic Search" enabled={shouldEnable('realtimeSearch')} />
          <FeatureIndicator label="Offline Mode" enabled={shouldEnable('offlineSupport')} />
        </div>
      </div>
    </div>
  )
}

function FeatureIndicator({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-ink-300 dark:bg-ink-600'}`} />
      <span className={enabled ? 'text-ink-700 dark:text-ink-200' : 'text-ink-400 dark:text-ink-500'}>
        {label}
      </span>
    </div>
  )
}




