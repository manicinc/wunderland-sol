/**
 * Plugin Card Component
 *
 * Displays a single plugin with controls for enabling/disabling,
 * settings, and uninstallation.
 *
 * @module codex/ui/PluginCard
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Settings,
  Trash2,
  AlertCircle,
  Check,
  Loader2,
  ExternalLink,
  Package,
  Palette,
  Code,
  Layout,
  Terminal,
  Zap,
} from 'lucide-react'
import type { PluginState, PluginType } from '@/lib/plugins/types'

interface PluginCardProps {
  /** Plugin state */
  plugin: PluginState
  /** Current theme */
  theme?: string
  /** Toggle enabled/disabled */
  onToggle: () => Promise<void>
  /** Open settings modal */
  onSettings?: () => void
  /** Uninstall plugin */
  onUninstall: () => Promise<void>
  /** Whether uninstall is allowed (false in public access mode) */
  canUninstall?: boolean
}

/**
 * Get icon for plugin type
 */
function getPluginTypeIcon(type: PluginType) {
  switch (type) {
    case 'widget':
      return <Layout className="w-3 h-3" />
    case 'renderer':
      return <Code className="w-3 h-3" />
    case 'processor':
      return <Zap className="w-3 h-3" />
    case 'theme':
      return <Palette className="w-3 h-3" />
    case 'panel':
      return <Layout className="w-3 h-3" />
    case 'toolbar':
      return <Package className="w-3 h-3" />
    case 'command':
      return <Terminal className="w-3 h-3" />
    default:
      return <Package className="w-3 h-3" />
  }
}

/**
 * Plugin Card Component
 */
export default function PluginCard({
  plugin,
  theme = 'light',
  onToggle,
  onSettings,
  onUninstall,
  canUninstall = true,
}: PluginCardProps) {
  const [toggling, setToggling] = useState(false)
  const [uninstalling, setUninstalling] = useState(false)

  const isDark = theme.includes('dark')
  const { manifest, enabled, status, error } = plugin
  const hasSettings = manifest.settings && Object.keys(manifest.settings).length > 0

  const handleToggle = async () => {
    setToggling(true)
    try {
      await onToggle()
    } finally {
      setToggling(false)
    }
  }

  const handleUninstall = async () => {
    if (!confirm(`Uninstall "${manifest.name}"? This cannot be undone.`)) {
      return
    }
    setUninstalling(true)
    try {
      await onUninstall()
    } finally {
      setUninstalling(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        p-3 rounded-lg border transition-all
        ${enabled
          ? isDark
            ? 'border-purple-600/50 bg-purple-900/20'
            : 'border-purple-300 bg-purple-50'
          : isDark
            ? 'border-zinc-700 bg-zinc-800/50'
            : 'border-zinc-200 bg-white'
        }
        ${status === 'error'
          ? isDark
            ? 'border-red-600/50'
            : 'border-red-300'
          : ''
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`font-semibold text-sm truncate ${
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            }`}>
              {manifest.name}
            </h4>

            {/* Type badge */}
            <span className={`
              flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium
              ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}
            `}>
              {getPluginTypeIcon(manifest.type)}
              {manifest.type}
            </span>

            {/* Bundled badge */}
            {plugin.isBundled && (
              <span className={`
                px-1.5 py-0.5 rounded text-[10px] font-medium
                ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}
              `}>
                Bundled
              </span>
            )}
          </div>

          <p className={`text-xs mt-1 line-clamp-2 ${
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          }`}>
            {manifest.description}
          </p>

          <div className={`flex items-center gap-2 mt-2 text-[10px] ${
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          }`}>
            <span>v{manifest.version}</span>
            <span>by {manifest.author}</span>
            {manifest.authorUrl && (
              <a
                href={manifest.authorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-purple-500 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Enable/Disable Toggle */}
          <button
            onClick={handleToggle}
            disabled={toggling || status === 'loading'}
            className={`
              relative w-10 h-5 rounded-full transition-colors
              ${enabled
                ? 'bg-purple-500'
                : isDark
                  ? 'bg-zinc-600'
                  : 'bg-zinc-300'
              }
              ${toggling ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
            `}
            aria-label={enabled ? 'Disable plugin' : 'Enable plugin'}
          >
            <motion.div
              className={`
                absolute top-0.5 w-4 h-4 rounded-full
                ${isDark ? 'bg-white' : 'bg-white'}
                shadow-sm
              `}
              animate={{
                left: enabled ? '22px' : '2px',
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              {toggling && (
                <Loader2 className="w-3 h-3 animate-spin m-0.5 text-zinc-400" />
              )}
              {!toggling && enabled && (
                <Check className="w-3 h-3 m-0.5 text-purple-500" />
              )}
            </motion.div>
          </button>

          {/* Settings Button */}
          {hasSettings && (
            <button
              onClick={onSettings}
              className={`
                p-1.5 rounded transition-colors
                ${isDark
                  ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                  : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'
                }
              `}
              aria-label="Plugin settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Uninstall Button - hidden in public access mode */}
          {canUninstall && (
            <button
              onClick={handleUninstall}
              disabled={uninstalling}
              className={`
                p-1.5 rounded transition-colors
                ${isDark
                  ? 'hover:bg-red-900/30 text-zinc-400 hover:text-red-400'
                  : 'hover:bg-red-50 text-zinc-400 hover:text-red-500'
                }
                ${uninstalling ? 'opacity-50 cursor-wait' : ''}
              `}
              aria-label="Uninstall plugin"
            >
              {uninstalling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className={`
            mt-2 p-2 rounded text-xs flex items-start gap-2
            ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'}
          `}
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">{error}</span>
        </motion.div>
      )}
    </motion.div>
  )
}
