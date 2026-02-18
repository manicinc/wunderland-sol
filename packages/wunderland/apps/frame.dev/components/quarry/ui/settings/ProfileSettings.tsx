/**
 * Profile Settings Component
 * 
 * Comprehensive user profile management interface:
 * - Profile information editing
 * - Study preferences
 * - Appearance settings
 * - Data export/import
 * - Account management
 * 
 * @module components/quarry/ui/ProfileSettings
 */

'use client'

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Settings,
  Download,
  Upload,
  Trash2,
  Save,
  X,
  Sun,
  Moon,
  Monitor,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Sparkles,
  Eye,
  EyeOff,
  Clock,
  Target,
  Flame,
  Trophy,
  BarChart3,
  Calendar,
  HardDrive,
  AlertTriangle,
  Check,
  ChevronRight,
  Keyboard,
  Palette,
  Zap,
  Code,
} from 'lucide-react'
import { useProfile, type ProfileSettings as ProfileSettingsType } from '../../hooks/useProfile'
import APISettingsTab from './APISettingsTab'

interface ProfileSettingsProps {
  /** Whether the settings modal is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Custom class name */
  className?: string
}

type SettingsTab = 'profile' | 'preferences' | 'appearance' | 'data' | 'api' | 'about'

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  { id: 'preferences', label: 'Study', icon: <Target className="w-4 h-4" /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  { id: 'data', label: 'Data', icon: <HardDrive className="w-4 h-4" /> },
  { id: 'api', label: 'API', icon: <Code className="w-4 h-4" /> },
  { id: 'about', label: 'About', icon: <Zap className="w-4 h-4" /> }
]

/**
 * Section wrapper component
 */
const Section: React.FC<{
  title: string
  description?: string
  children: React.ReactNode
}> = ({ title, description, children }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-lg font-semibold text-ink-800 dark:text-paper-100">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-ink-500 dark:text-paper-400 mt-1">
          {description}
        </p>
      )}
    </div>
    {children}
  </div>
)

/**
 * Toggle switch component
 */
const Toggle: React.FC<{
  enabled: boolean
  onChange: (enabled: boolean) => void
  label: string
  description?: string
  icon?: React.ReactNode
}> = ({ enabled, onChange, label, description, icon }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-center gap-3">
      {icon && (
        <div className="text-ink-400 dark:text-paper-500">
          {icon}
        </div>
      )}
      <div>
        <div className="font-medium text-ink-700 dark:text-paper-200">
          {label}
        </div>
        {description && (
          <div className="text-sm text-ink-500 dark:text-paper-400">
            {description}
          </div>
        )}
      </div>
    </div>
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-frame-green focus:ring-offset-2 ${
        enabled ? 'bg-frame-green' : 'bg-ink-300 dark:bg-ink-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
)

/**
 * Select component
 */
const Select: React.FC<{
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  label: string
  icon?: React.ReactNode
}> = ({ value, onChange, options, label, icon }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-center gap-3">
      {icon && (
        <div className="text-ink-400 dark:text-paper-500">
          {icon}
        </div>
      )}
      <div className="font-medium text-ink-700 dark:text-paper-200">
        {label}
      </div>
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-paper-100 dark:bg-ink-700 border border-paper-300 dark:border-ink-600 rounded-lg px-3 py-1.5 text-sm text-ink-700 dark:text-paper-200 focus:outline-none focus:ring-2 focus:ring-frame-green"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
)

/**
 * Number input component
 */
const NumberInput: React.FC<{
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label: string
  unit?: string
  icon?: React.ReactNode
}> = ({ value, onChange, min = 0, max = 100, step = 1, label, unit, icon }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-center gap-3">
      {icon && (
        <div className="text-ink-400 dark:text-paper-500">
          {icon}
        </div>
      )}
      <div className="font-medium text-ink-700 dark:text-paper-200">
        {label}
      </div>
    </div>
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-20 bg-paper-100 dark:bg-ink-700 border border-paper-300 dark:border-ink-600 rounded-lg px-3 py-1.5 text-sm text-ink-700 dark:text-paper-200 text-right focus:outline-none focus:ring-2 focus:ring-frame-green"
      />
      {unit && (
        <span className="text-sm text-ink-500 dark:text-paper-400">
          {unit}
        </span>
      )}
    </div>
  </div>
)

/**
 * Main ProfileSettings component
 */
export function ProfileSettings({ isOpen, onClose, className = '' }: ProfileSettingsProps) {
  const {
    loading,
    profileId,
    displayName,
    avatar,
    bio,
    stats,
    settings,
    streakStatus,
    activityHeatmap,
    updateDisplayName,
    updateAvatar,
    updateBio,
    updateSettings,
    downloadBackup,
    restoreFromFile,
    resetProfile
  } = useProfile()

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(displayName)
  const [editingBio, setEditingBio] = useState(false)
  const [bioInput, setBioInput] = useState(bio)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle name save
  const handleSaveName = useCallback(async () => {
    if (nameInput.trim()) {
      await updateDisplayName(nameInput.trim())
    }
    setEditingName(false)
  }, [nameInput, updateDisplayName])

  // Handle bio save
  const handleSaveBio = useCallback(async () => {
    await updateBio(bioInput.trim())
    setEditingBio(false)
  }, [bioInput, updateBio])

  // Handle file import
  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportStatus({ message: 'Importing...' })
    const result = await restoreFromFile(file, { merge: false })
    
    setImportStatus({
      success: result.success,
      message: result.success 
        ? 'Data imported successfully!' 
        : `Import failed: ${result.errors.join(', ')}`
    })

    setTimeout(() => setImportStatus(null), 5000)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [restoreFromFile])

  // Handle reset
  const handleReset = useCallback(async () => {
    await resetProfile()
    setShowResetConfirm(false)
  }, [resetProfile])

  // Settings update helper
  const handleSettingChange = useCallback(<K extends keyof ProfileSettingsType>(
    key: K,
    value: ProfileSettingsType[K]
  ) => {
    updateSettings({ [key]: value })
  }, [updateSettings])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`bg-white dark:bg-ink-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden ${className}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-paper-200 dark:border-ink-700">
            <h2 className="text-xl font-bold text-ink-800 dark:text-paper-100 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Settings
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-ink-400 hover:text-ink-600 dark:hover:text-paper-300 rounded-lg hover:bg-paper-100 dark:hover:bg-ink-700 transition-colors"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex h-[calc(85vh-80px)]">
            {/* Sidebar */}
            <nav className="w-48 border-r border-paper-200 dark:border-ink-700 p-4 space-y-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-frame-green/10 text-frame-green'
                      : 'text-ink-600 dark:text-paper-400 hover:bg-paper-100 dark:hover:bg-ink-700'
                  }`}
                >
                  {tab.icon}
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-8">
                  <Section title="Profile Information" description="Manage your display name and profile picture">
                    {/* Avatar */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-frame-green to-frame-green-dark flex items-center justify-center text-white text-2xl font-bold">
                          {avatar ? (
                            <img src={avatar} alt={displayName} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            displayName.charAt(0).toUpperCase()
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-ink-800 dark:text-paper-100">
                          {displayName}
                        </div>
                        {stats.currentStreak > 0 && (
                          <div className="text-sm text-ink-500 dark:text-paper-400">
                            🔥 {stats.currentStreak} day streak
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Name */}
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-ink-600 dark:text-paper-300 mb-2">
                        Display Name
                      </label>
                      {editingName ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            className="flex-1 bg-paper-100 dark:bg-ink-700 border border-paper-300 dark:border-ink-600 rounded-lg px-3 py-2 text-ink-800 dark:text-paper-100 focus:outline-none focus:ring-2 focus:ring-frame-green"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveName}
                            className="px-4 py-2 bg-frame-green text-white rounded-lg hover:bg-frame-green-dark transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setNameInput(displayName)
                              setEditingName(false)
                            }}
                            className="px-4 py-2 bg-paper-200 dark:bg-ink-600 text-ink-600 dark:text-paper-300 rounded-lg hover:bg-paper-300 dark:hover:bg-ink-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingName(true)}
                          className="w-full text-left bg-paper-100 dark:bg-ink-700 border border-paper-300 dark:border-ink-600 rounded-lg px-3 py-2 text-ink-800 dark:text-paper-100 hover:border-frame-green transition-colors"
                        >
                          {displayName}
                        </button>
                      )}
                    </div>

                    {/* Bio */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-ink-600 dark:text-paper-300 mb-2">
                        Bio
                      </label>
                      {editingBio ? (
                        <div className="space-y-2">
                          <textarea
                            value={bioInput}
                            onChange={(e) => setBioInput(e.target.value)}
                            rows={3}
                            maxLength={200}
                            className="w-full bg-paper-100 dark:bg-ink-700 border border-paper-300 dark:border-ink-600 rounded-lg px-3 py-2 text-ink-800 dark:text-paper-100 focus:outline-none focus:ring-2 focus:ring-frame-green resize-none"
                            autoFocus
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-ink-400">{bioInput.length}/200</span>
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveBio}
                                className="px-4 py-1.5 bg-frame-green text-white rounded-lg text-sm hover:bg-frame-green-dark transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setBioInput(bio)
                                  setEditingBio(false)
                                }}
                                className="px-4 py-1.5 bg-paper-200 dark:bg-ink-600 text-ink-600 dark:text-paper-300 rounded-lg text-sm hover:bg-paper-300 dark:hover:bg-ink-500 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingBio(true)}
                          className="w-full text-left bg-paper-100 dark:bg-ink-700 border border-paper-300 dark:border-ink-600 rounded-lg px-3 py-2 text-ink-800 dark:text-paper-100 hover:border-frame-green transition-colors min-h-[60px]"
                        >
                          {bio || <span className="text-ink-400 dark:text-paper-500">Add a bio...</span>}
                        </button>
                      )}
                    </div>
                  </Section>

                  <Section title="Study Statistics">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="bg-paper-100 dark:bg-ink-700 rounded-xl p-4 text-center">
                        <Flame className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                        <div className="text-2xl font-bold text-ink-800 dark:text-paper-100">
                          {stats.currentStreak}
                        </div>
                        <div className="text-xs text-ink-500 dark:text-paper-400">Day Streak</div>
                      </div>
                      <div className="bg-paper-100 dark:bg-ink-700 rounded-xl p-4 text-center">
                        <BarChart3 className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                        <div className="text-2xl font-bold text-ink-800 dark:text-paper-100">
                          {stats.flashcardsReviewed}
                        </div>
                        <div className="text-xs text-ink-500 dark:text-paper-400">Cards Reviewed</div>
                      </div>
                      <div className="bg-paper-100 dark:bg-ink-700 rounded-xl p-4 text-center">
                        <Clock className="w-6 h-6 mx-auto mb-2 text-green-500" />
                        <div className="text-2xl font-bold text-ink-800 dark:text-paper-100">
                          {stats.totalStudyMinutes}
                        </div>
                        <div className="text-xs text-ink-500 dark:text-paper-400">Minutes Studied</div>
                      </div>
                      <div className="bg-paper-100 dark:bg-ink-700 rounded-xl p-4 text-center">
                        <Trophy className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                        <div className="text-2xl font-bold text-ink-800 dark:text-paper-100">
                          {stats.quizzesPassed}
                        </div>
                        <div className="text-xs text-ink-500 dark:text-paper-400">Quizzes Passed</div>
                      </div>
                      <div className="bg-paper-100 dark:bg-ink-700 rounded-xl p-4 text-center">
                        <Target className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                        <div className="text-2xl font-bold text-ink-800 dark:text-paper-100">
                          {stats.longestStreak}
                        </div>
                        <div className="text-xs text-ink-500 dark:text-paper-400">Best Streak</div>
                      </div>
                      <div className="bg-paper-100 dark:bg-ink-700 rounded-xl p-4 text-center">
                        <Sparkles className="w-6 h-6 mx-auto mb-2 text-pink-500" />
                        <div className="text-2xl font-bold text-ink-800 dark:text-paper-100">
                          {stats.perfectQuizzes}
                        </div>
                        <div className="text-xs text-ink-500 dark:text-paper-400">Perfect Scores</div>
                      </div>
                    </div>
                  </Section>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="space-y-8">
                  <Section title="Study Goals" description="Set your daily learning targets">
                    <NumberInput
                      value={settings.dailyGoalMinutes}
                      onChange={(v) => handleSettingChange('dailyGoalMinutes', v)}
                      min={5}
                      max={120}
                      step={5}
                      label="Daily Goal"
                      unit="minutes"
                      icon={<Target className="w-5 h-5" />}
                    />
                    <Toggle
                      enabled={settings.studyReminders}
                      onChange={(v) => handleSettingChange('studyReminders', v)}
                      label="Study Reminders"
                      description="Get notified when it's time to study"
                      icon={settings.studyReminders ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                    />
                    {settings.studyReminders && (
                      <div className="ml-8 mt-2">
                        <input
                          type="time"
                          value={settings.reminderTime}
                          onChange={(e) => handleSettingChange('reminderTime', e.target.value)}
                          className="bg-paper-100 dark:bg-ink-700 border border-paper-300 dark:border-ink-600 rounded-lg px-3 py-1.5 text-sm text-ink-700 dark:text-paper-200 focus:outline-none focus:ring-2 focus:ring-frame-green"
                        />
                      </div>
                    )}
                  </Section>

                  <Section title="Flashcard Settings" description="Customize your study experience">
                    <Toggle
                      enabled={settings.autoAdvance}
                      onChange={(v) => handleSettingChange('autoAdvance', v)}
                      label="Auto-advance Cards"
                      description="Automatically show next card after rating"
                    />
                    <NumberInput
                      value={settings.flipDuration}
                      onChange={(v) => handleSettingChange('flipDuration', v)}
                      min={100}
                      max={1000}
                      step={50}
                      label="Flip Animation"
                      unit="ms"
                    />
                    <Toggle
                      enabled={settings.showShortcuts}
                      onChange={(v) => handleSettingChange('showShortcuts', v)}
                      label="Show Keyboard Shortcuts"
                      description="Display shortcut hints during study"
                      icon={<Keyboard className="w-5 h-5" />}
                    />
                  </Section>
                </div>
              )}

              {/* Appearance Tab */}
              {activeTab === 'appearance' && (
                <div className="space-y-8">
                  <Section title="Theme" description="Choose your preferred color scheme">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'light', label: 'Light', icon: <Sun className="w-5 h-5" /> },
                        { value: 'dark', label: 'Dark', icon: <Moon className="w-5 h-5" /> },
                        { value: 'system', label: 'System', icon: <Monitor className="w-5 h-5" /> }
                      ].map((theme) => (
                        <button
                          key={theme.value}
                          onClick={() => handleSettingChange('theme', theme.value as ProfileSettingsType['theme'])}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                            settings.theme === theme.value
                              ? 'border-frame-green bg-frame-green/10'
                              : 'border-paper-200 dark:border-ink-600 hover:border-frame-green/50'
                          }`}
                        >
                          {theme.icon}
                          <span className="text-sm font-medium">{theme.label}</span>
                        </button>
                      ))}
                    </div>
                  </Section>

                  <Section title="Display" description="Adjust text and visual settings">
                    <Select
                      value={settings.fontSize}
                      onChange={(v) => handleSettingChange('fontSize', v as ProfileSettingsType['fontSize'])}
                      options={[
                        { value: 'small', label: 'Small' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'large', label: 'Large' }
                      ]}
                      label="Font Size"
                      icon={<Eye className="w-5 h-5" />}
                    />
                  </Section>

                  <Section title="Effects" description="Control animations and sounds">
                    <Toggle
                      enabled={settings.soundEffects}
                      onChange={(v) => handleSettingChange('soundEffects', v)}
                      label="Sound Effects"
                      description="Play sounds for actions and feedback"
                      icon={settings.soundEffects ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    />
                    <Toggle
                      enabled={settings.celebrations}
                      onChange={(v) => handleSettingChange('celebrations', v)}
                      label="Celebration Animations"
                      description="Show confetti and effects on achievements"
                      icon={<Sparkles className="w-5 h-5" />}
                    />
                    <Toggle
                      enabled={settings.reduceMotion}
                      onChange={(v) => handleSettingChange('reduceMotion', v)}
                      label="Reduce Motion"
                      description="Minimize animations for accessibility"
                      icon={<EyeOff className="w-5 h-5" />}
                    />
                  </Section>
                </div>
              )}

              {/* Data Tab */}
              {activeTab === 'data' && (
                <div className="space-y-8">
                  <Section title="Export Data" description="Download a backup of all your data">
                    <div className="bg-paper-100 dark:bg-ink-700 rounded-xl p-4">
                      <p className="text-sm text-ink-600 dark:text-paper-300 mb-4">
                        Export includes your profile, flashcards, study progress, and settings.
                        You can use this to restore your data or transfer to another device.
                      </p>
                      <button
                        onClick={() => downloadBackup()}
                        className="flex items-center gap-2 px-4 py-2 bg-frame-green text-white rounded-lg hover:bg-frame-green-dark transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download Backup
                      </button>
                    </div>
                  </Section>

                  <Section title="Import Data" description="Restore from a previous backup">
                    <div className="bg-paper-100 dark:bg-ink-700 rounded-xl p-4">
                      <p className="text-sm text-ink-600 dark:text-paper-300 mb-4">
                        Importing will replace all existing data with the backup contents.
                        Make sure to export your current data first if needed.
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImport}
                        className="hidden"
                        id="import-file"
                      />
                      <label
                        htmlFor="import-file"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        Import Backup
                      </label>
                      {importStatus && (
                        <div className={`mt-3 p-3 rounded-lg text-sm ${
                          importStatus.success === undefined
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : importStatus.success
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {importStatus.message}
                        </div>
                      )}
                    </div>
                  </Section>

                  <Section title="Storage Info">
                    <div className="bg-paper-100 dark:bg-ink-700 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-ink-600 dark:text-paper-300">Profile ID</span>
                        <code className="text-xs bg-paper-200 dark:bg-ink-600 px-2 py-1 rounded">
                          {profileId?.slice(0, 8)}...
                        </code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-ink-600 dark:text-paper-300">Storage Used</span>
                        <span className="text-sm text-ink-800 dark:text-paper-100">
                          {Object.keys(activityHeatmap).length} days tracked
                        </span>
                      </div>
                    </div>
                  </Section>

                  <Section title="Danger Zone">
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-red-700 dark:text-red-300">
                            Reset All Data
                          </h4>
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1 mb-3">
                            This will permanently delete all your data including profile,
                            flashcards, progress, and settings. This cannot be undone.
                          </p>
                          {showResetConfirm ? (
                            <div className="flex gap-2">
                              <button
                                onClick={handleReset}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                              >
                                Yes, Delete Everything
                              </button>
                              <button
                                onClick={() => setShowResetConfirm(false)}
                                className="px-4 py-2 bg-paper-200 dark:bg-ink-600 text-ink-600 dark:text-paper-300 rounded-lg hover:bg-paper-300 dark:hover:bg-ink-500 transition-colors text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowResetConfirm(true)}
                              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                              Reset All Data
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Section>
                </div>
              )}

              {/* API Tab */}
              {activeTab === 'api' && <APISettingsTab />}

              {/* About Tab */}
              {activeTab === 'about' && (
                <div className="space-y-8">
                  <Section title="OpenStrand PKMS">
                    <div className="bg-gradient-to-br from-frame-green/10 to-frame-green-light/10 rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-frame-green to-frame-green-dark rounded-xl flex items-center justify-center">
                          <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-ink-800 dark:text-paper-100">
                            OpenStrand
                          </h3>
                          <p className="text-sm text-ink-500 dark:text-paper-400">
                            Personal Knowledge Management System
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-ink-600 dark:text-paper-300">
                        A beautiful, offline-first knowledge management system with spaced 
                        repetition, interactive graphs, and gamification features.
                      </p>
                    </div>
                  </Section>

                  <Section title="Features">
                    <ul className="space-y-3">
                      {[
                        'FSRS-5 Spaced Repetition Algorithm',
                        'Interactive Knowledge Graph',
                        'Offline-First Storage',
                        'Achievement System',
                        'Export/Import Functionality',
                        'WCAG AA Accessibility'
                      ].map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-ink-600 dark:text-paper-300">
                          <Check className="w-4 h-4 text-frame-green" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </Section>

                  <Section title="Keyboard Shortcuts">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {[
                        { key: 'Space', action: 'Flip card' },
                        { key: '1-4', action: 'Rate card' },
                        { key: 'H', action: 'Show hint' },
                        { key: 'S', action: 'Skip card' },
                        { key: 'Esc', action: 'End session' },
                        { key: '?', action: 'Show shortcuts' }
                      ].map(({ key, action }) => (
                        <div key={key} className="flex items-center justify-between bg-paper-100 dark:bg-ink-700 rounded-lg px-3 py-2">
                          <span className="text-ink-500 dark:text-paper-400">{action}</span>
                          <kbd className="px-2 py-0.5 bg-paper-200 dark:bg-ink-600 rounded text-xs font-mono">
                            {key}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </Section>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ProfileSettings





