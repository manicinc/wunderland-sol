/**
 * Audio Source Selector
 * @module codex/ui/AudioSourceSelector
 *
 * @description
 * Device picker component for selecting microphones and audio sources.
 * Supports mic-only and mic+system audio modes with device hot-plug detection.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Monitor, ChevronDown, Check, RefreshCw, AlertCircle } from 'lucide-react'
import type { ThemeName } from '@/types/theme'
import {
  enumerateMicrophones,
  getDefaultMicrophone,
  onDeviceChange,
  requestMicrophonePermission,
  getDeviceDisplayName,
  type AudioDevice,
} from '@/lib/audio'
import {
  isSystemAudioAvailable,
  getAvailableCaptureDescription,
  type AudioCaptureMode,
} from '@/lib/audio'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface AudioSourceSelectorProps {
  /** Selected capture mode */
  captureMode: AudioCaptureMode
  /** Mode change callback */
  onCaptureModeChange: (mode: AudioCaptureMode) => void
  /** Selected microphone device ID */
  selectedMicId?: string
  /** Microphone selection callback */
  onMicrophoneChange: (deviceId: string) => void
  /** Current theme */
  theme?: ThemeName
  /** Compact mode (hides labels) */
  compact?: boolean
  /** Whether recording is active (disables changes) */
  disabled?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Audio source selector with mic picker and capture mode toggle
 */
export default function AudioSourceSelector({
  captureMode,
  onCaptureModeChange,
  selectedMicId,
  onMicrophoneChange,
  theme = 'light',
  compact = false,
  disabled = false,
}: AudioSourceSelectorProps) {
  const [microphones, setMicrophones] = useState<AudioDevice[]>([])
  const [showMicDropdown, setShowMicDropdown] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [systemAudioAvailable, setSystemAudioAvailable] = useState(false)
  const [systemAudioDescription, setSystemAudioDescription] = useState('')

  const isDark = theme.includes('dark')

  // Load microphones and check system audio availability
  const loadDevices = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Request permission if needed
      await requestMicrophonePermission()

      // Enumerate microphones
      const mics = await enumerateMicrophones()
      setMicrophones(mics)

      // Auto-select default if none selected
      if (!selectedMicId && mics.length > 0) {
        const defaultMic = await getDefaultMicrophone()
        if (defaultMic) {
          onMicrophoneChange(defaultMic.deviceId)
        }
      }

      // Check system audio
      setSystemAudioAvailable(isSystemAudioAvailable())
      setSystemAudioDescription(getAvailableCaptureDescription())
    } catch (err) {
      console.error('[AudioSourceSelector] Failed to load devices:', err)
      setError(err instanceof Error ? err.message : 'Failed to access microphone')
    } finally {
      setLoading(false)
    }
  }, [selectedMicId, onMicrophoneChange])

  // Initial load
  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  // Listen for device changes
  useEffect(() => {
    return onDeviceChange(() => {
      loadDevices()
    })
  }, [loadDevices])

  // Get selected microphone
  const selectedMic = microphones.find(m => m.deviceId === selectedMicId)

  // Capture mode options
  const captureModes: { mode: AudioCaptureMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'mic', label: 'Microphone only', icon: <Mic className="w-4 h-4" /> },
    { mode: 'mic+tab', label: 'Mic + Tab audio', icon: <Monitor className="w-4 h-4" /> },
  ]

  if (error) {
    return (
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm
        ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'}
      `}>
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">{error}</span>
        <button
          onClick={loadDevices}
          className={`p-1 rounded hover:bg-black/10`}
          title="Retry"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Microphone Selector */}
      <div className="relative">
        <button
          onClick={() => setShowMicDropdown(!showMicDropdown)}
          disabled={loading || disabled}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg text-sm
            transition-all border
            ${isDark
              ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
              : 'bg-white border-gray-200 hover:bg-gray-50'
            }
            ${showMicDropdown
              ? isDark ? 'ring-2 ring-blue-500/50' : 'ring-2 ring-blue-500/30'
              : ''
            }
          `}
        >
          <Mic className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          {!compact && (
            <span className={`max-w-[150px] truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              {loading ? 'Loading...' : selectedMic ? getDeviceDisplayName(selectedMic) : 'Select mic'}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${showMicDropdown ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {showMicDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={`
                absolute top-full left-0 mt-1 z-50 min-w-[200px] max-w-[300px]
                rounded-lg border shadow-lg overflow-hidden
                ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
              `}
            >
              {microphones.length === 0 ? (
                <div className={`px-3 py-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  No microphones found
                </div>
              ) : (
                microphones.map((mic) => (
                  <button
                    key={mic.deviceId}
                    onClick={() => {
                      onMicrophoneChange(mic.deviceId)
                      setShowMicDropdown(false)
                    }}
                    className={`
                      w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                      transition-colors
                      ${mic.deviceId === selectedMicId
                        ? isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-50 text-blue-700'
                        : isDark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'
                      }
                    `}
                  >
                    <span className="flex-1 truncate">{getDeviceDisplayName(mic)}</span>
                    {mic.deviceId === selectedMicId && (
                      <Check className="w-4 h-4 flex-shrink-0" />
                    )}
                    {mic.isDefault && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        Default
                      </span>
                    )}
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Capture Mode Toggle */}
      {systemAudioAvailable && (
        <div className={`
          flex rounded-lg overflow-hidden border
          ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        `}>
          {captureModes.map((mode) => (
            <button
              key={mode.mode}
              onClick={() => onCaptureModeChange(mode.mode)}
              disabled={disabled}
              title={mode.label}
              className={`
                flex items-center gap-1.5 px-3 py-2 text-sm
                transition-colors
                ${captureMode === mode.mode
                  ? isDark
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : isDark
                    ? 'hover:bg-gray-700 text-gray-300'
                    : 'hover:bg-gray-50 text-gray-600'
                }
              `}
            >
              {mode.icon}
              {!compact && <span>{mode.mode === 'mic' ? 'Mic' : 'Mic+System'}</span>}
            </button>
          ))}
        </div>
      )}

      {/* System audio not available indicator */}
      {!systemAudioAvailable && !compact && (
        <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Mic only (system audio not available)
        </div>
      )}
    </div>
  )
}
