/**
 * Style Config Wizard
 * @module codex/ui/StyleConfigWizard
 *
 * @remarks
 * Multi-tab interface for configuring work style profiles.
 * Allows users to review auto-detected analysis and customize
 * illustration style, characters, settings, and advanced options.
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Sparkles,
  Palette,
  Users,
  MapPin,
  Settings,
  Check,
  Upload,
  Download,
  Plus,
  Trash2,
  Image,
  Sliders,
  Eye,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import type { WorkStyleProfile, CharacterDefinition, SettingDefinition } from '@/lib/images/workStyleProfile'
import { ILLUSTRATION_PRESETS } from '@/lib/images/illustrationPresets'

interface StyleConfigWizardProps {
  isOpen: boolean
  onClose: () => void
  profile: WorkStyleProfile
  suggestions?: {
    recommendedPreset: string
    reasoning: string
  }
  onConfirm: (updatedProfile: WorkStyleProfile) => void
}

type Tab = 'overview' | 'style' | 'characters' | 'settings' | 'advanced'

const TABS: Array<{ id: Tab; label: string; icon: typeof Sparkles }> = [
  { id: 'overview', label: 'Overview', icon: Sparkles },
  { id: 'style', label: 'Style', icon: Palette },
  { id: 'characters', label: 'Characters', icon: Users },
  { id: 'settings', label: 'Settings', icon: MapPin },
  { id: 'advanced', label: 'Advanced', icon: Settings },
]

export default function StyleConfigWizard({
  isOpen,
  onClose,
  profile: initialProfile,
  suggestions,
  onConfirm,
}: StyleConfigWizardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [profile, setProfile] = useState<WorkStyleProfile>(initialProfile)

  // Update profile helper
  const updateProfile = (updates: Partial<WorkStyleProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }))
  }

  // Character management
  const addCharacter = () => {
    const newChar: CharacterDefinition = {
      id: `char-${Date.now()}`,
      name: 'New Character',
      description: '',
      visualTraits: [],
      seed: Math.floor(Math.random() * 1000000),
    }
    updateProfile({ characters: [...profile.characters, newChar] })
  }

  const updateCharacter = (id: string, updates: Partial<CharacterDefinition>) => {
    updateProfile({
      characters: profile.characters.map(c =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })
  }

  const deleteCharacter = (id: string) => {
    updateProfile({
      characters: profile.characters.filter(c => c.id !== id),
    })
  }

  // Setting management
  const addSetting = () => {
    const newSetting: SettingDefinition = {
      id: `setting-${Date.now()}`,
      name: 'New Setting',
      description: '',
      visualStyle: [],
      timePeriod: '',
      mood: '',
      seed: Math.floor(Math.random() * 1000000),
    }
    updateProfile({ settings: [...profile.settings, newSetting] })
  }

  const updateSetting = (id: string, updates: Partial<SettingDefinition>) => {
    updateProfile({
      settings: profile.settings.map(s =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })
  }

  const deleteSetting = (id: string) => {
    updateProfile({
      settings: profile.settings.filter(s => s.id !== id),
    })
  }

  // Export/import
  const exportProfile = () => {
    const json = JSON.stringify(profile, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${profile.workTitle.replace(/\s+/g, '-')}-style-profile.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importProfile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string)
        setProfile(imported)
      } catch (error) {
        alert('Failed to import profile: Invalid JSON')
      }
    }
    reader.readAsText(file)
  }

  // Use recommended preset
  const useRecommendedPreset = () => {
    if (!suggestions) return
    updateProfile({
      illustrationPreset: {
        ...profile.illustrationPreset,
        presetId: suggestions.recommendedPreset,
        userModified: false,
      },
    })
  }

  if (!isOpen) return null

  const presetOptions = Object.entries(ILLUSTRATION_PRESETS).map(([id, preset]) => ({
    id,
    name: preset.name,
    description: preset.description,
  }))

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-5xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-purple-50 to-cyan-50 dark:from-purple-900/20 dark:to-cyan-900/20">
            <div className="flex items-center gap-3">
              <Palette className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                  Style Configuration
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {profile.workTitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 dark:hover:bg-black/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-6">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Analysis Summary */}
                <div className="p-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
                  <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
                    Auto-Detected Analysis
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-purple-600 dark:text-purple-400 mb-1">Genre</p>
                      <p className="font-semibold text-purple-900 dark:text-purple-100">
                        {profile.analysis.genre}
                      </p>
                    </div>
                    <div>
                      <p className="text-purple-600 dark:text-purple-400 mb-1">Content Type</p>
                      <p className="font-semibold text-purple-900 dark:text-purple-100 capitalize">
                        {profile.analysis.contentType}
                      </p>
                    </div>
                    <div>
                      <p className="text-purple-600 dark:text-purple-400 mb-1">Target Audience</p>
                      <p className="font-semibold text-purple-900 dark:text-purple-100">
                        {profile.analysis.targetAudience}
                      </p>
                    </div>
                    <div>
                      <p className="text-purple-600 dark:text-purple-400 mb-1">Analysis Method</p>
                      <p className="font-semibold text-purple-900 dark:text-purple-100 uppercase">
                        {profile.analysis.method} ({(profile.analysis.confidence * 100).toFixed(0)}% confidence)
                      </p>
                    </div>
                  </div>
                  {profile.analysis.keyThemes.length > 0 && (
                    <div className="mt-3">
                      <p className="text-purple-600 dark:text-purple-400 mb-1 text-sm">Key Themes</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.analysis.keyThemes.map((theme, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-800/50 rounded-full text-purple-700 dark:text-purple-300"
                          >
                            {theme}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recommended Style */}
                {suggestions && (
                  <div className="p-4 rounded-lg border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/20">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-cyan-800 dark:text-cyan-200 mb-2">
                          Recommended Style
                        </h3>
                        <p className="text-sm text-cyan-700 dark:text-cyan-300 mb-2">
                          {ILLUSTRATION_PRESETS[suggestions.recommendedPreset]?.name}
                        </p>
                        <p className="text-xs text-cyan-600 dark:text-cyan-400">
                          {suggestions.reasoning}
                        </p>
                      </div>
                      <button
                        onClick={useRecommendedPreset}
                        className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors text-sm font-semibold flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Use Recommended
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-2" />
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {profile.characters.length}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Characters</p>
                  </div>
                  <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <MapPin className="w-5 h-5 text-cyan-600 dark:text-cyan-400 mb-2" />
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {profile.settings.length}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Settings</p>
                  </div>
                  <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <Image className="w-5 h-5 text-green-600 dark:text-green-400 mb-2" />
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {profile.illustrationsGenerated}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Illustrations</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Style Details */}
            {activeTab === 'style' && (
              <div className="space-y-6">
                {/* Preset Selection */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Illustration Preset
                  </label>
                  <select
                    value={profile.illustrationPreset.presetId}
                    onChange={(e) => updateProfile({
                      illustrationPreset: {
                        ...profile.illustrationPreset,
                        presetId: e.target.value,
                        userModified: true,
                      },
                    })}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  >
                    {presetOptions.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.name} - {option.description}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Selected: {ILLUSTRATION_PRESETS[profile.illustrationPreset.presetId]?.artStyle || 'Unknown'} style
                  </p>
                </div>

                {/* Color Palette */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Color Palette
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Primary Colors</p>
                      <div className="flex gap-2">
                        {profile.colorPalette.primary.map((color, idx) => (
                          <input
                            key={idx}
                            type="color"
                            value={color}
                            onChange={(e) => {
                              const newPrimary = [...profile.colorPalette.primary]
                              newPrimary[idx] = e.target.value
                              updateProfile({
                                colorPalette: {
                                  ...profile.colorPalette,
                                  primary: newPrimary,
                                  source: 'user-selected',
                                },
                              })
                            }}
                            className="w-12 h-12 rounded-lg border border-zinc-300 dark:border-zinc-700 cursor-pointer"
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Accent Colors</p>
                      <div className="flex gap-2">
                        {profile.colorPalette.accent.map((color, idx) => (
                          <input
                            key={idx}
                            type="color"
                            value={color}
                            onChange={(e) => {
                              const newAccent = [...profile.colorPalette.accent]
                              newAccent[idx] = e.target.value
                              updateProfile({
                                colorPalette: {
                                  ...profile.colorPalette,
                                  accent: newAccent,
                                  source: 'user-selected',
                                },
                              })
                            }}
                            className="w-12 h-12 rounded-lg border border-zinc-300 dark:border-zinc-700 cursor-pointer"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Mood</label>
                    <input
                      type="text"
                      value={profile.colorPalette.mood}
                      onChange={(e) => updateProfile({
                        colorPalette: {
                          ...profile.colorPalette,
                          mood: e.target.value,
                        },
                      })}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm"
                      placeholder="e.g., dark and moody, bright and cheerful"
                    />
                  </div>
                </div>

                {/* Consistency Strategy */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Consistency Strategy
                  </label>
                  <div className="space-y-2">
                    {['seed', 'reference', 'style-transfer'].map((strategy) => (
                      <label
                        key={strategy}
                        className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="consistency"
                          value={strategy}
                          checked={profile.consistencyStrategy === strategy}
                          onChange={(e) => updateProfile({ consistencyStrategy: e.target.value as any })}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-zinc-900 dark:text-white capitalize">
                            {strategy.replace('-', ' ')}
                          </p>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            {strategy === 'seed' && 'Use deterministic seeds for consistency'}
                            {strategy === 'reference' && 'Use first image of each character/setting as reference'}
                            {strategy === 'style-transfer' && 'Transfer style from first illustration'}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Characters */}
            {activeTab === 'characters' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    Characters ({profile.characters.length})
                  </h3>
                  <button
                    onClick={addCharacter}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors text-sm font-semibold flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Character
                  </button>
                </div>

                {profile.characters.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No characters detected. Add characters manually.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profile.characters.map((char) => (
                      <div
                        key={char.id}
                        className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <input
                            type="text"
                            value={char.name}
                            onChange={(e) => updateCharacter(char.id, { name: e.target.value })}
                            className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 font-semibold"
                            placeholder="Character name"
                          />
                          <button
                            onClick={() => deleteCharacter(char.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <textarea
                          value={char.description}
                          onChange={(e) => updateCharacter(char.id, { description: e.target.value })}
                          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm mb-2"
                          rows={2}
                          placeholder="Character description"
                        />
                        <div>
                          <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                            Visual Traits (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={char.visualTraits.join(', ')}
                            onChange={(e) => updateCharacter(char.id, {
                              visualTraits: e.target.value.split(',').map(t => t.trim()).filter(Boolean),
                            })}
                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm"
                            placeholder="e.g., tall, blonde hair, blue eyes, wearing armor"
                          />
                        </div>
                        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                          Seed: {char.seed || 'auto-generated'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Settings */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    Settings / Locations ({profile.settings.length})
                  </h3>
                  <button
                    onClick={addSetting}
                    className="px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors text-sm font-semibold flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Setting
                  </button>
                </div>

                {profile.settings.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                    <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No settings detected. Add locations manually.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profile.settings.map((setting) => (
                      <div
                        key={setting.id}
                        className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <input
                            type="text"
                            value={setting.name}
                            onChange={(e) => updateSetting(setting.id, { name: e.target.value })}
                            className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 font-semibold"
                            placeholder="Setting name"
                          />
                          <button
                            onClick={() => deleteSetting(setting.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <textarea
                          value={setting.description}
                          onChange={(e) => updateSetting(setting.id, { description: e.target.value })}
                          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm mb-2"
                          rows={2}
                          placeholder="Setting description"
                        />
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                              Time Period
                            </label>
                            <input
                              type="text"
                              value={setting.timePeriod || ''}
                              onChange={(e) => updateSetting(setting.id, { timePeriod: e.target.value })}
                              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm"
                              placeholder="e.g., medieval, modern"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                              Mood
                            </label>
                            <input
                              type="text"
                              value={setting.mood || ''}
                              onChange={(e) => updateSetting(setting.id, { mood: e.target.value })}
                              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm"
                              placeholder="e.g., dark, peaceful"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                            Visual Style (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={setting.visualStyle?.join(', ') || ''}
                            onChange={(e) => updateSetting(setting.id, {
                              visualStyle: e.target.value.split(',').map(t => t.trim()).filter(Boolean),
                            })}
                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm"
                            placeholder="e.g., gothic architecture, dimly lit, stone walls"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 5: Advanced */}
            {activeTab === 'advanced' && (
              <div className="space-y-6">
                {/* Custom Prompts */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Prompt Prefix (applied before all prompts)
                  </label>
                  <textarea
                    value={profile.illustrationPreset.customizations?.promptPrefix || ''}
                    onChange={(e) => updateProfile({
                      illustrationPreset: {
                        ...profile.illustrationPreset,
                        customizations: {
                          ...profile.illustrationPreset.customizations,
                          promptPrefix: e.target.value,
                        },
                        userModified: true,
                      },
                    })}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm"
                    rows={3}
                    placeholder="e.g., Highly detailed, professional illustration in the style of..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Prompt Suffix (applied after all prompts)
                  </label>
                  <textarea
                    value={profile.illustrationPreset.customizations?.promptSuffix || ''}
                    onChange={(e) => updateProfile({
                      illustrationPreset: {
                        ...profile.illustrationPreset,
                        customizations: {
                          ...profile.illustrationPreset.customizations,
                          promptSuffix: e.target.value,
                        },
                        userModified: true,
                      },
                    })}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm"
                    rows={3}
                    placeholder="e.g., High quality, masterpiece, award-winning"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Negative Prompt (things to avoid)
                  </label>
                  <textarea
                    value={profile.illustrationPreset.customizations?.negativePrompt || ''}
                    onChange={(e) => updateProfile({
                      illustrationPreset: {
                        ...profile.illustrationPreset,
                        customizations: {
                          ...profile.illustrationPreset.customizations,
                          negativePrompt: e.target.value,
                        },
                        userModified: true,
                      },
                    })}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm"
                    rows={2}
                    placeholder="e.g., blurry, low quality, distorted, ugly"
                  />
                </div>

                {/* Master Seed */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Master Seed (for seed-based consistency)
                  </label>
                  <input
                    type="number"
                    value={profile.masterSeed || ''}
                    onChange={(e) => updateProfile({ masterSeed: parseInt(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
                    placeholder="Leave empty for auto-generated"
                  />
                </div>

                {/* Export/Import */}
                <div className="flex gap-3">
                  <button
                    onClick={exportProfile}
                    className="flex-1 px-4 py-2 bg-zinc-600 text-white rounded-lg hover:bg-zinc-500 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Profile
                  </button>
                  <label className="flex-1 px-4 py-2 bg-zinc-600 text-white rounded-lg hover:bg-zinc-500 transition-colors text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Import Profile
                    <input
                      type="file"
                      accept=".json"
                      onChange={importProfile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <div className="flex items-center gap-3">
              {activeTab !== 'overview' && (
                <button
                  onClick={() => {
                    const currentIndex = TABS.findIndex(t => t.id === activeTab)
                    if (currentIndex > 0) setActiveTab(TABS[currentIndex - 1].id)
                  }}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
              )}
              {activeTab !== 'advanced' && (
                <button
                  onClick={() => {
                    const currentIndex = TABS.findIndex(t => t.id === activeTab)
                    if (currentIndex < TABS.length - 1) setActiveTab(TABS[currentIndex + 1].id)
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {activeTab === 'advanced' && (
                <button
                  onClick={() => onConfirm(profile)}
                  className="px-6 py-2 text-sm font-semibold text-white bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Save & Continue
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
