'use client'

/**
 * Focus Settings
 * @module components/quarry/ui/settings/FocusSettings
 * 
 * Settings for Meditation/Focus mode including:
 * - Voice providers (TTS/STT)
 * - API keys for media services
 * - Pomodoro preferences
 * - Background/slideshow settings
 */

import React, { useState, useEffect } from 'react'
import {
  Headphones,
  Mic,
  Volume2,
  Timer,
  Image,
  Key,
  Info,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getAvailableTTSProviders,
  getAvailableSTTProviders,
  getSavedTTSProvider,
  getSavedSTTProvider,
  saveTTSProvider,
  saveSTTProvider,
  PROVIDER_COST_INFO,
  type VoiceProviderType,
  type ProviderInfo,
} from '@/lib/voice/providers'
import {
  getSlideshowSettings,
  setSlideshowSettings,
  type SlideshowSettings,
} from '@/lib/meditate/backgroundCatalog'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface FocusSettingsProps {
  onOpenAPIKeys?: () => void
}

interface PomodoroSettings {
  workDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  sessionsUntilLongBreak: number
  autoStartBreaks: boolean
  autoStartWork: boolean
  soundEnabled: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   STORAGE
═══════════════════════════════════════════════════════════════════════════ */

const POMODORO_SETTINGS_KEY = 'pomodoro-settings'

const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  soundEnabled: true,
}

function loadPomodoroSettings(): PomodoroSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_POMODORO_SETTINGS
  try {
    const stored = localStorage.getItem(POMODORO_SETTINGS_KEY)
    return stored ? { ...DEFAULT_POMODORO_SETTINGS, ...JSON.parse(stored) } : DEFAULT_POMODORO_SETTINGS
  } catch {
    return DEFAULT_POMODORO_SETTINGS
  }
}

function savePomodoroSettings(settings: PomodoroSettings): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(POMODORO_SETTINGS_KEY, JSON.stringify(settings))
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function FocusSettings({ onOpenAPIKeys }: FocusSettingsProps) {
  // Voice providers
  const [ttsProviders, setTTSProviders] = useState<ProviderInfo[]>([])
  const [sttProviders, setSTTProviders] = useState<ProviderInfo[]>([])
  const [selectedTTS, setSelectedTTS] = useState<VoiceProviderType>('browser')
  const [selectedSTT, setSelectedSTT] = useState<VoiceProviderType>('browser')
  const [loadingProviders, setLoadingProviders] = useState(true)

  // Pomodoro
  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings>(loadPomodoroSettings)

  // Slideshow
  const [slideshowSettings, setSlideshowSettingsState] = useState<SlideshowSettings>(getSlideshowSettings)

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    voice: true,
    pomodoro: true,
    background: false,
  })

  // Load providers
  useEffect(() => {
    async function loadProviders() {
      setLoadingProviders(true)
      const [tts, stt] = await Promise.all([
        getAvailableTTSProviders(),
        getAvailableSTTProviders(),
      ])
      setTTSProviders(tts)
      setSTTProviders(stt)
      setSelectedTTS(getSavedTTSProvider())
      setSelectedSTT(getSavedSTTProvider())
      setLoadingProviders(false)
    }
    loadProviders()
  }, [])

  // Save handlers
  const handleTTSChange = (provider: VoiceProviderType) => {
    setSelectedTTS(provider)
    saveTTSProvider(provider)
  }

  const handleSTTChange = (provider: VoiceProviderType) => {
    setSelectedSTT(provider)
    saveSTTProvider(provider)
  }

  const handlePomodoroChange = (updates: Partial<PomodoroSettings>) => {
    const updated = { ...pomodoroSettings, ...updates }
    setPomodoroSettings(updated)
    savePomodoroSettings(updated)
  }

  const handleSlideshowChange = (updates: Partial<SlideshowSettings>) => {
    const updated = { ...slideshowSettings, ...updates }
    setSlideshowSettingsState(updated)
    setSlideshowSettings(updates)
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  return (
    <div className="space-y-6">
      {/* Voice Providers */}
      <SettingsSection
        title="Voice Providers"
        icon={Headphones}
        description="Configure text-to-speech and speech-to-text engines"
        isExpanded={expandedSections.voice}
        onToggle={() => toggleSection('voice')}
      >
        {loadingProviders ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* TTS */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                <Volume2 className="w-4 h-4 inline mr-2" />
                Text-to-Speech (TTS)
              </label>
              <div className="grid grid-cols-1 gap-2">
                {ttsProviders.map((provider) => (
                  <ProviderOption
                    key={provider.id}
                    provider={provider}
                    isSelected={selectedTTS === provider.id}
                    onSelect={() => handleTTSChange(provider.id)}
                    costInfo={PROVIDER_COST_INFO[provider.id]?.tts}
                    onConfigureKeys={onOpenAPIKeys}
                  />
                ))}
              </div>
            </div>

            {/* STT */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                <Mic className="w-4 h-4 inline mr-2" />
                Speech-to-Text (STT)
              </label>
              <div className="grid grid-cols-1 gap-2">
                {sttProviders.map((provider) => (
                  <ProviderOption
                    key={provider.id}
                    provider={provider}
                    isSelected={selectedSTT === provider.id}
                    onSelect={() => handleSTTChange(provider.id)}
                    costInfo={PROVIDER_COST_INFO[provider.id]?.stt}
                    onConfigureKeys={onOpenAPIKeys}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </SettingsSection>

      {/* Pomodoro Timer */}
      <SettingsSection
        title="Pomodoro Timer"
        icon={Timer}
        description="Customize timer durations and behavior"
        isExpanded={expandedSections.pomodoro}
        onToggle={() => toggleSection('pomodoro')}
      >
        <div className="space-y-4">
          {/* Durations */}
          <div className="grid grid-cols-3 gap-4">
            <DurationInput
              label="Work"
              value={pomodoroSettings.workDuration}
              onChange={(v) => handlePomodoroChange({ workDuration: v })}
            />
            <DurationInput
              label="Short Break"
              value={pomodoroSettings.shortBreakDuration}
              onChange={(v) => handlePomodoroChange({ shortBreakDuration: v })}
            />
            <DurationInput
              label="Long Break"
              value={pomodoroSettings.longBreakDuration}
              onChange={(v) => handlePomodoroChange({ longBreakDuration: v })}
            />
          </div>

          {/* Sessions until long break */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Sessions until long break
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={pomodoroSettings.sessionsUntilLongBreak}
              onChange={(e) => handlePomodoroChange({ sessionsUntilLongBreak: parseInt(e.target.value) || 4 })}
              className="w-20 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <Toggle
              label="Auto-start breaks"
              description="Automatically start break timer when work ends"
              checked={pomodoroSettings.autoStartBreaks}
              onChange={(v) => handlePomodoroChange({ autoStartBreaks: v })}
            />
            <Toggle
              label="Auto-start work"
              description="Automatically start work timer when break ends"
              checked={pomodoroSettings.autoStartWork}
              onChange={(v) => handlePomodoroChange({ autoStartWork: v })}
            />
            <Toggle
              label="Sound notifications"
              description="Play a sound when timer completes"
              checked={pomodoroSettings.soundEnabled}
              onChange={(v) => handlePomodoroChange({ soundEnabled: v })}
            />
          </div>
        </div>
      </SettingsSection>

      {/* Background Settings */}
      <SettingsSection
        title="Background & Slideshow"
        icon={Image}
        description="Configure meditation background images"
        isExpanded={expandedSections.background}
        onToggle={() => toggleSection('background')}
      >
        <div className="space-y-4">
          {/* Slideshow interval */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Slide interval (seconds)
            </label>
            <input
              type="number"
              min={10}
              max={300}
              step={5}
              value={slideshowSettings.interval / 1000}
              onChange={(e) => handleSlideshowChange({ interval: (parseInt(e.target.value) || 30) * 1000 })}
              className="w-24 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
            />
          </div>

          {/* Transition type */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Transition effect
            </label>
            <select
              value={slideshowSettings.transition}
              onChange={(e) => handleSlideshowChange({ transition: e.target.value as any })}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
            >
              <option value="crossfade">Crossfade</option>
              <option value="blur-fade">Blur Fade</option>
              <option value="slide">Slide</option>
            </select>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <Toggle
              label="Shuffle images"
              description="Randomize image order"
              checked={slideshowSettings.shuffle}
              onChange={(v) => handleSlideshowChange({ shuffle: v })}
            />
            <Toggle
              label="Blur on interaction"
              description="Blur background when interacting with controls"
              checked={slideshowSettings.blurOnInteract}
              onChange={(v) => handleSlideshowChange({ blurOnInteract: v })}
            />
          </div>

          {/* Blur intensity */}
          {slideshowSettings.blurOnInteract && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Blur intensity: {slideshowSettings.blurIntensity}px
              </label>
              <input
                type="range"
                min={0}
                max={20}
                value={slideshowSettings.blurIntensity}
                onChange={(e) => handleSlideshowChange({ blurIntensity: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          )}
        </div>
      </SettingsSection>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

interface SettingsSectionProps {
  title: string
  icon: React.ElementType
  description: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

function SettingsSection({
  title,
  icon: Icon,
  description,
  isExpanded,
  onToggle,
  children,
}: SettingsSectionProps) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-purple-500" />
          <div className="text-left">
            <div className="font-medium text-zinc-900 dark:text-white">{title}</div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">{description}</div>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-zinc-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-zinc-400" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-zinc-200 dark:border-zinc-700">
          {children}
        </div>
      )}
    </div>
  )
}

interface ProviderOptionProps {
  provider: ProviderInfo
  isSelected: boolean
  onSelect: () => void
  costInfo?: string
  onConfigureKeys?: () => void
}

function ProviderOption({
  provider,
  isSelected,
  onSelect,
  costInfo,
  onConfigureKeys,
}: ProviderOptionProps) {
  return (
    <button
      onClick={provider.available ? onSelect : onConfigureKeys}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
        isSelected
          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
          : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600',
        !provider.available && 'opacity-60'
      )}
    >
      <div className={cn(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
        isSelected
          ? 'border-purple-500 bg-purple-500'
          : 'border-zinc-300 dark:border-zinc-600'
      )}>
        {isSelected && <Check className="w-3 h-3 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-900 dark:text-white">
            {provider.name}
          </span>
          {!provider.available && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              API key required
            </span>
          )}
        </div>
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          {provider.description}
        </div>
        {costInfo && (
          <div className="flex items-center gap-1 mt-1 text-xs text-zinc-400">
            <Info className="w-3 h-3" />
            {costInfo}
          </div>
        )}
        {provider.features.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {provider.features.slice(0, 3).map((feature) => (
              <span
                key={feature}
                className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              >
                {feature}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}

interface DurationInputProps {
  label: string
  value: number
  onChange: (value: number) => void
}

function DurationInput({ label, value, onChange }: DurationInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={1}
          max={120}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 1)}
          className="w-16 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
        />
        <span className="text-sm text-zinc-500 dark:text-zinc-400">min</span>
      </div>
    </div>
  )
}

interface ToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div className="relative mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={cn(
            'w-10 h-6 rounded-full transition-colors',
            checked ? 'bg-purple-500' : 'bg-zinc-300 dark:bg-zinc-600'
          )}
        />
        <div
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-4'
          )}
        />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-zinc-900 dark:text-white">
          {label}
        </div>
        {description && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </div>
        )}
      </div>
    </label>
  )
}





