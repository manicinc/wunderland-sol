/**
 * Codex Settings Modal
 *
 * Unified settings modal with tabs for:
 * - Content Source (GitHub/Local/Hybrid)
 * - License Management
 * - Export/Import
 * - Theme & Appearance
 *
 * @module codex/ui/QuarrySettingsModal
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Settings,
  Database,
  Crown,
  FileArchive,
  Palette,
  Key,
  ChevronRight,
  User,
  Camera,
  RotateCcw,
  Check,
  AlertCircle,
  Shield,
  Compass,
  SlidersHorizontal,
  Cpu,
  Type,
  LayoutGrid,
  Sidebar,
  Trash2,
  History,
  Volume2,
  Zap,
  HelpCircle,
  XCircle,
  Loader2,
  Search,
  CalendarDays,
  Package,
  Globe,
  Share2,
  Puzzle,
  Scale,
  GitPullRequest,
  Headphones,
  Mic,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { THEME_METADATA, type ThemeName } from '@/types/theme'
import { Z_INDEX } from '../../constants'
import ContentSourceSettings from '../settings/ContentSourceSettings'
import LicenseSettings from '../settings/LicenseSettings'
import ExportImportSettings from '../export/ExportImportSettings'
import APIKeySettings from '../api/APIKeySettings'
import InstanceNameSettings from '../settings/InstanceNameSettings'
import SecuritySettings from '../settings/SecuritySettings'
import TravelerSettings from '../settings/TravelerSettings'
import PlannerSettingsTab from '../planner/PlannerSettingsTab'
import { GoogleCalendarSettings } from '../planner/GoogleCalendarSettings'
import TemplateSourceSettings from '../templates/TemplateSourceSettings'
import PluginSourceSettings from '../plugins/PluginSourceSettings'
import SocialSourceSettings from '../social/SocialSourceSettings'
import ResearchSettings from '../research/ResearchSettings'
import ContentLicensingSettings from '../settings/ContentLicensingSettings'
import WritingAssistantSettings from '../settings/WritingAssistantSettings'
import CacheManagement from '../settings/CacheManagement'
import ImageGenerationSettings from '../settings/ImageGenerationSettings'
import PublishSettingsTab from '@/components/publish/PublishSettingsTab'
import LinkSettings from '../settings/LinkSettings'
import DatabaseConnectionsTab from '../settings/DatabaseConnectionsTab'
import { DEFAULT_LINK_PREFERENCES, type LinkPreferences } from '@/lib/localStorage'
import { getFeatureFlags } from '@/lib/config/featureFlags'
import { useQuarryContent } from '@/hooks/useCodexContent'
import {
  getUserProfile,
  updateUserProfile,
  resetUserProfile,
  getPreferences,
  updatePreferences,
  type UserProfile,
  type UserPreferences,
} from '@/lib/localStorage'
import { clearCodexCache, getCodexCacheStats, type CodexCacheStats } from '@/lib/codexCache'
import { detectCapabilities, type SystemCapabilities } from '@/lib/search/embeddingEngine'
import { useAIPreferences, hasRequiredAPIKeys, type AIPreferences } from '@/lib/ai'
import { useModalAccessibility } from '@/components/quarry/hooks'
import { useAuth } from '@/lib/auth'

// ============================================================================
// TYPES
// ============================================================================

/** TTS Voice info */
interface TTSVoiceInfo {
  name: string
  lang: string
  voiceURI: string
  localService?: boolean
}

interface QuarrySettingsModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Initial tab to show */
  initialTab?: SettingsTab
  /** Initial sub-tab for nested sections (e.g., 'calendar' for integrations) */
  initialSubTab?: string
  /** Current preferences (for reading settings) */
  preferences?: UserPreferences
  /** Preference callbacks */
  onFontSizeChange?: (size: number) => void
  onTreeDensityChange?: (density: UserPreferences['treeDensity']) => void
  onSidebarModeChange?: (mode: UserPreferences['defaultSidebarMode']) => void
  onSidebarOpenMobileChange?: (open: boolean) => void
  onHistoryTrackingChange?: (enabled: boolean) => void
  onRememberScrollPositionChange?: (enabled: boolean) => void
  onAutoExpandBacklinksChange?: (enabled: boolean) => void
  onReset?: () => void
  onClearAll?: () => void
  /** TTS Settings */
  ttsVoices?: TTSVoiceInfo[]
  ttsSupported?: boolean
  onTTSVoiceChange?: (voiceURI: string) => void
  onTTSRateChange?: (rate: number) => void
  onTTSVolumeChange?: (volume: number) => void
  onTTSPitchChange?: (pitch: number) => void
}

// Consolidated settings tabs (reduced from 17 to 9)
export type SettingsTab = 'profile' | 'security' | 'preferences' | 'appearance' | 'aifeatures' | 'data' | 'integrations' | 'publishing' | 'licensing'

// Sub-tab types for deep linking
export type IntegrationSection = 'apikeys' | 'calendar' | 'templates' | 'plugins' | 'social' | 'research'

interface TabConfig {
  id: SettingsTab
  label: string
  icon: React.ReactNode
  description: string
}

// ============================================================================
// TAB CONFIGURATION - Reorganized for clarity
// ============================================================================

const TABS: TabConfig[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: <User className="w-4 h-4" />,
    description: 'Name & avatar',
  },
  {
    id: 'security',
    label: 'Security',
    icon: <Shield className="w-4 h-4" />,
    description: 'Identity & privacy',
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: <SlidersHorizontal className="w-4 h-4" />,
    description: 'Display, reading & planner',
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: <Palette className="w-4 h-4" />,
    description: 'Theme & styling',
  },
  {
    id: 'aifeatures',
    label: 'AI Features',
    icon: <Zap className="w-4 h-4" />,
    description: 'Vision, RAG & writing',
  },
  {
    id: 'data',
    label: 'Data & Storage',
    icon: <Database className="w-4 h-4" />,
    description: 'Content, cache & export',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: <Puzzle className="w-4 h-4" />,
    description: 'APIs, sources & plugins',
  },
  {
    id: 'publishing',
    label: 'Publishing',
    icon: <GitPullRequest className="w-4 h-4" />,
    description: 'GitHub sync & export',
  },
  {
    id: 'licensing',
    label: 'Licensing',
    icon: <Crown className="w-4 h-4" />,
    description: 'Premium & content rights',
  },
]

// ============================================================================
// COMPONENT
// ============================================================================

export default function QuarrySettingsModal({
  isOpen,
  onClose,
  initialTab = 'profile',
  initialSubTab,
  preferences,
  onFontSizeChange,
  onTreeDensityChange,
  onSidebarModeChange,
  onSidebarOpenMobileChange,
  onHistoryTrackingChange,
  onRememberScrollPositionChange,
  onAutoExpandBacklinksChange,
  onReset,
  onClearAll,
  ttsVoices = [],
  ttsSupported = false,
  onTTSVoiceChange,
  onTTSRateChange,
  onTTSVolumeChange,
  onTTSPitchChange,
}: QuarrySettingsModalProps) {
  // Accessibility hook
  const { backdropRef, contentRef, modalProps, handleBackdropClick } = useModalAccessibility({
    isOpen,
    onClose,
    modalId: 'quarry-settings-modal',
    trapFocus: true,
    lockScroll: true,
  })

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab)
  const [currentSubTab, setCurrentSubTab] = useState<string | undefined>(initialSubTab)
  const { theme, setTheme } = useTheme()
  const flags = getFeatureFlags()
  const {
    source,
    isInitialized,
    isLoading,
    isSyncing,
    sync,
  } = useQuarryContent()

  // Cache stats for performance tab
  const [cacheStats, setCacheStats] = useState<CodexCacheStats | null>(null)
  const [cacheLoading, setCacheLoading] = useState(false)
  const [cacheClearing, setCacheClearing] = useState(false)
  
  // System capabilities for performance tab
  const [capabilities, setCapabilities] = useState<SystemCapabilities | null>(null)
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(false)

  // Reset to initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
      setCurrentSubTab(initialSubTab)
    }
  }, [isOpen, initialTab, initialSubTab])

  // Navigate to integrations calendar section
  const handleNavigateToCalendar = React.useCallback(() => {
    setActiveTab('integrations')
    setCurrentSubTab('calendar')
  }, [])

  // Load cache stats and capabilities when data tab is active
  useEffect(() => {
    if (!isOpen || activeTab !== 'data') return
    
    let cancelled = false
    
    // Load cache stats
    setCacheLoading(true)
    getCodexCacheStats()
      .then((stats) => {
        if (!cancelled) setCacheStats(stats)
      })
      .catch(console.warn)
      .finally(() => {
        if (!cancelled) setCacheLoading(false)
      })
    
    // Load capabilities
    setCapabilitiesLoading(true)
    detectCapabilities()
      .then((caps) => {
        if (!cancelled) setCapabilities(caps)
      })
      .catch(console.warn)
      .finally(() => {
        if (!cancelled) setCapabilitiesLoading(false)
      })
    
    return () => { cancelled = true }
  }, [isOpen, activeTab])

  // Clear cache handler
  const handleClearCache = async () => {
    setCacheClearing(true)
    try {
      await clearCodexCache()
      setCacheStats(await getCodexCacheStats())
    } catch (error) {
      console.error('Failed to clear cache:', error)
    } finally {
      setCacheClearing(false)
    }
  }

  if (!isOpen) return null

  const themeOrder: ThemeName[] = ['light', 'dark', 'sepia-light', 'sepia-dark', 'terminal-light', 'terminal-dark', 'oceanic-light', 'oceanic-dark']

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 flex items-center justify-center p-0 md:p-4"
        style={{ zIndex: Z_INDEX.PRIORITY_MODAL }}
      >
        {/* Backdrop */}
        <motion.div
          ref={backdropRef as React.RefObject<HTMLDivElement>}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleBackdropClick}
        />

        {/* Modal */}
        <motion.div
          ref={contentRef as React.RefObject<HTMLDivElement>}
          {...modalProps}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] md:max-h-[85vh] bg-white dark:bg-gray-900 rounded-none md:rounded-2xl shadow-2xl border-0 md:border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col md:flex-row h-full md:h-auto"
        >
          {/* Mobile Header - fixed at top */}
          <div className="md:hidden flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <h2 id="quarry-settings-modal-title" className="text-sm font-bold text-gray-900 dark:text-white">
                Settings
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Tab Bar - horizontal scrolling */}
          <div className="md:hidden overflow-x-auto border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
            <div className="flex p-1.5 gap-1 min-w-max">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg transition-all min-w-[52px]
                    ${activeTab === tab.id
                      ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                  title={tab.label}
                >
                  <span className={`${activeTab === tab.id ? 'text-cyan-600 dark:text-cyan-400' : ''}`}>
                    {tab.icon}
                  </span>
                  <span className="text-[9px] font-medium mt-0.5 truncate max-w-[48px]">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Sidebar Navigation */}
          <div className="hidden md:flex w-48 lg:w-56 flex-shrink-0 bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 p-3 lg:p-4 flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4 lg:mb-6">
              <Settings className="w-4 h-4 lg:w-5 lg:h-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-base lg:text-lg font-bold text-gray-900 dark:text-white">
                Settings
              </h2>
            </div>

            {/* Tabs */}
            <nav className="flex-1 space-y-0.5 lg:space-y-1 overflow-y-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    w-full flex items-center gap-2 lg:gap-3 px-2 lg:px-3 py-1.5 lg:py-2 rounded-lg lg:rounded-xl text-left transition-all
                    ${activeTab === tab.id
                      ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <span className={`flex-shrink-0 ${activeTab === tab.id ? 'text-cyan-600 dark:text-cyan-400' : ''}`}>
                    {tab.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs lg:text-sm font-medium truncate">{tab.label}</p>
                    <p className="hidden lg:block text-[9px] lg:text-[10px] text-gray-500 dark:text-gray-500 truncate">
                      {tab.description}
                    </p>
                  </div>
                  {activeTab === tab.id && (
                    <ChevronRight className="w-3 h-3 lg:w-4 lg:h-4 text-cyan-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </nav>

            {/* Edition Badge */}
            <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-gray-200 dark:border-gray-800">
              <a
                href="/quarry/login"
                className={`
                  block px-2 lg:px-3 py-1.5 lg:py-2 rounded-lg text-center transition-colors
                  ${flags.isPaidVersion
                    ? 'bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 hover:from-amber-200 hover:to-orange-200 dark:hover:from-amber-900/50 dark:hover:to-orange-900/50'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-violet-100 dark:hover:bg-violet-900/30'
                  }
                `}
              >
                <p className="text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {flags.edition === 'premium' ? 'Premium Edition' : 'Community Edition'}
                </p>
                <p className="hidden lg:block text-[8px] lg:text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {flags.deploymentMode === 'offline'
                    ? 'Local Storage • Sign in to sync'
                    : 'Cloud Sync Active'}
                </p>
              </a>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {/* Content Header - Desktop only */}
            <div className="hidden md:flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">
                  {TABS.find(t => t.id === activeTab)?.label}
                </h3>
                <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {TABS.find(t => t.id === activeTab)?.description}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 lg:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6">
              {/* Profile - Name & Avatar */}
              {activeTab === 'profile' && (
                <SimpleProfileSettings />
              )}

              {/* Security - Identity & Privacy (merged identity + security) */}
              {activeTab === 'security' && (
                <div className="space-y-8">
                  <SecuritySettings
                    backendType={source?.type === 'github' ? 'github' : source?.type === 'hybrid' ? 'hybrid' : 'local'}
                    hasPAT={Boolean(getPreferences().githubPAT)}
                  />
                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <TravelerSettings
                      backendType={source?.type === 'github' ? 'github' : source?.type === 'hybrid' ? 'hybrid' : 'local'}
                      hasPAT={Boolean(getPreferences().githubPAT)}
                    />
                  </div>
                </div>
              )}

              {/* Preferences - Display, Reading & Planner (merged preferences + planner) */}
              {activeTab === 'preferences' && preferences && (
                <div className="space-y-8">
                  <PreferencesTabContent
                    preferences={preferences}
                    onFontSizeChange={onFontSizeChange}
                    onTreeDensityChange={onTreeDensityChange}
                    onSidebarModeChange={onSidebarModeChange}
                    onSidebarOpenMobileChange={onSidebarOpenMobileChange}
                    onHistoryTrackingChange={onHistoryTrackingChange}
                    onRememberScrollPositionChange={onRememberScrollPositionChange}
                    onAutoExpandBacklinksChange={onAutoExpandBacklinksChange}
                    onReset={onReset}
                    ttsVoices={ttsVoices}
                    ttsSupported={ttsSupported}
                    onTTSVoiceChange={onTTSVoiceChange}
                    onTTSRateChange={onTTSRateChange}
                    onTTSVolumeChange={onTTSVolumeChange}
                    onTTSPitchChange={onTTSPitchChange}
                  />
                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-indigo-500" />
                      Planner Settings
                    </h3>
                    <PlannerSettingsTab onNavigateToCalendar={handleNavigateToCalendar} />
                  </div>
                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <LinkSettings
                      preferences={preferences.linkPreferences || DEFAULT_LINK_PREFERENCES}
                      onChange={(key, value) => {
                        const newLinkPrefs = {
                          ...(preferences.linkPreferences || DEFAULT_LINK_PREFERENCES),
                          [key]: value,
                        }
                        updatePreferences({ linkPreferences: newLinkPrefs })
                      }}
                      theme={theme}
                    />
                  </div>
                </div>
              )}

              {/* Appearance - Theme & Styling */}
              {activeTab === 'appearance' && (
                <AppearanceSettings
                  theme={theme as ThemeName}
                  onThemeChange={setTheme}
                  themeOrder={themeOrder}
                />
              )}

              {/* AI Features */}
              {activeTab === 'aifeatures' && (
                <AIFeaturesSettings />
              )}

              {/* Data & Storage - Content source, cache, export, CLEAR DATA */}
              {activeTab === 'data' && (
                <DataStorageTabContent
                  source={source}
                  isInitialized={isInitialized}
                  isLoading={isLoading}
                  isSyncing={isSyncing}
                  onSync={async () => { await sync() }}
                  cacheStats={cacheStats}
                  cacheLoading={cacheLoading}
                  cacheClearing={cacheClearing}
                  onClearCache={handleClearCache}
                  onClearAll={onClearAll}
                  isPremium={flags.isPaidVersion}
                />
              )}

              {/* Integrations - APIs, sources & plugins */}
              {activeTab === 'integrations' && (
                <IntegrationsTabContent
                  initialSection={currentSubTab as IntegrationSection | undefined}
                />
              )}

              {/* Publishing - GitHub sync & export */}
              {activeTab === 'publishing' && (
                <PublishSettingsTab />
              )}

              {/* Licensing - Premium & Content Rights */}
              {activeTab === 'licensing' && (
                <LicensingTabContent isPremium={flags.isPaidVersion} />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ============================================================================
// SIMPLE PROFILE SETTINGS (Traveler default)
// ============================================================================

const MAX_AVATAR_SIZE = 512 * 1024 // 512KB max for base64 avatar
const AVATAR_DIMENSIONS = 128 // px

function SimpleProfileSettings() {
  const [profile, setProfile] = React.useState<UserProfile>({ displayName: 'Traveler' })
  const [displayName, setDisplayName] = React.useState('')
  const [avatarPreview, setAvatarPreview] = React.useState<string | undefined>()
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saved' | 'error'>('idle')
  const [error, setError] = React.useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Get auth state
  const { user, isAuthenticated, isGuest, googleConnected, calendarEnabled, logout, linkGoogle, isLoading: authLoading } = useAuth()

  // Load profile on mount - use auth user data if available
  React.useEffect(() => {
    if (isAuthenticated && user) {
      // Use auth user data (camelCase from AuthContext)
      setDisplayName(user.displayName || user.email?.split('@')[0] || 'User')
      setAvatarPreview(user.avatarUrl || undefined)
      setProfile({
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        avatarUrl: user.avatarUrl || undefined,
      })
    } else {
      // Fall back to local profile
      const p = getUserProfile()
      setProfile(p)
      setDisplayName(p.displayName)
      setAvatarPreview(p.avatarUrl)
    }
  }, [isAuthenticated, user])

  // Auto-save display name with debounce
  React.useEffect(() => {
    if (displayName === profile.displayName) return

    const timer = setTimeout(() => {
      handleSave()
    }, 1000)

    return () => clearTimeout(timer)
  }, [displayName])

  // Save profile
  const handleSave = React.useCallback(async () => {
    if (!displayName.trim()) {
      setError('Display name cannot be empty')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      updateUserProfile({
        displayName: displayName.trim(),
        avatarUrl: avatarPreview,
      })

      const updated = getUserProfile()
      setProfile(updated)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setError('Failed to save profile')
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }, [displayName, avatarPreview])

  // Handle avatar file selection
  const handleAvatarChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size
    if (file.size > MAX_AVATAR_SIZE) {
      setError('Image must be smaller than 512KB')
      return
    }

    // Read and resize image
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        // Create canvas to resize
        const canvas = document.createElement('canvas')
        canvas.width = AVATAR_DIMENSIONS
        canvas.height = AVATAR_DIMENSIONS

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Draw resized image (centered crop)
        const minDim = Math.min(img.width, img.height)
        const sx = (img.width - minDim) / 2
        const sy = (img.height - minDim) / 2

        ctx.drawImage(
          img,
          sx, sy, minDim, minDim,
          0, 0, AVATAR_DIMENSIONS, AVATAR_DIMENSIONS
        )

        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        setAvatarPreview(dataUrl)
        setError(null)

        // Save immediately
        updateUserProfile({
          displayName: displayName.trim() || 'Traveler',
          avatarUrl: dataUrl,
        })
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }, [displayName])

  // Remove avatar
  const handleRemoveAvatar = React.useCallback(() => {
    setAvatarPreview(undefined)
    updateUserProfile({
      displayName: displayName.trim() || 'Traveler',
      avatarUrl: undefined,
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }, [displayName])

  // Reset to defaults
  const handleReset = React.useCallback(() => {
    resetUserProfile()
    setDisplayName('Traveler')
    setAvatarPreview(undefined)
    setProfile({ displayName: 'Traveler' })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
          <User className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Your Profile
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Customize how you appear in Quarry Codex
          </p>
        </div>
      </div>

      {/* Avatar Section */}
      <div className="flex items-start gap-6">
        <div className="relative group">
          {/* Avatar Preview */}
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>

          {/* Camera Overlay */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Change avatar"
          >
            <Camera className="w-6 h-6 text-white" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-lg hover:bg-cyan-200 dark:hover:bg-cyan-900/50 transition-colors"
            >
              Upload Photo
            </button>
            {avatarPreview && (
              <button
                onClick={handleRemoveAvatar}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-500">
            JPG, PNG or GIF. Max 512KB.
          </p>
        </div>
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Display Name
        </label>
        <div className="relative">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Traveler"
            maxLength={50}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
          />
          {/* Save Status Indicator */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isSaving && (
              <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            )}
            {saveStatus === 'saved' && !isSaving && (
              <Check className="w-4 h-4 text-green-500" />
            )}
          </div>
        </div>
        <p className="text-[10px] text-gray-500 dark:text-gray-500">
          This name will appear on your bookmarks and notes.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Profile Stats */}
      {profile.profileCreatedAt && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            Profile created: {new Date(profile.profileCreatedAt).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Account Connection Section */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Account & Sync
          </h4>
        </div>

        {/* Loading State */}
        {authLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
          </div>
        )}

        {/* Authenticated User View */}
        {!authLoading && isAuthenticated && user && (
          <div className="space-y-4">
            {/* User Info Card */}
            <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-800 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    user.email?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.displayName || user.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-[10px] font-medium">
                  <Check className="w-3 h-3" />
                  Signed In
                </div>
              </div>
            </div>

            {/* Connected Services */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Connected Services
              </p>

              {/* Google Connection Status */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Google</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {googleConnected
                          ? calendarEnabled
                            ? 'Connected with Calendar'
                            : 'Connected (Calendar not enabled)'
                          : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  {googleConnected ? (
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <Check className="w-4 h-4" />
                    </div>
                  ) : (
                    <button
                      onClick={() => linkGoogle()}
                      className="px-3 py-1 text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-lg hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>

              {/* Calendar Sync Status (if Google connected) */}
              {googleConnected && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                        <CalendarDays className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Calendar Sync</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {calendarEnabled ? 'Events syncing with Planner' : 'Enable in Planner settings'}
                        </p>
                      </div>
                    </div>
                    {calendarEnabled && (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Auth Method Info */}
            <div className="text-[10px] text-gray-400 dark:text-gray-500">
              Signed in via {user.authMethod === 'google' ? 'Google' : 'Email'}
              {user.tier === 'premium' && ' • Premium'}
            </div>

            {/* Sign Out Button */}
            <button
              onClick={async () => {
                setIsLoggingOut(true)
                try {
                  await logout()
                } finally {
                  setIsLoggingOut(false)
                }
              }}
              disabled={isLoggingOut}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Sign Out
            </button>
          </div>
        )}

        {/* Guest Mode View */}
        {!authLoading && isGuest && (
          <>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Connect your Google account to sync across devices, enable calendar integration, and unlock premium features.
            </p>

            {/* Guest Mode Info */}
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2">
                <Compass className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    You're exploring as a Traveler
                  </p>
                  <p className="text-amber-600 dark:text-amber-400 mt-0.5">
                    Your data is stored locally on this device. Sign in to sync across devices and enable premium features.
                  </p>
                </div>
              </div>
            </div>

            {/* Sign In Buttons */}
            <div className="space-y-2">
              <a
                href="/quarry/login"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px]">Recommended</span>
              </a>

              <a
                href="/quarry/login"
                className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm transition-colors"
              >
                Sign in with Email
              </a>
            </div>

            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
              Google sign-in enables calendar sync, profile picture, and future Drive integration
            </p>
          </>
        )}
      </div>

      {/* Reset Button */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Default (Traveler)
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// APPEARANCE SETTINGS
// ============================================================================

interface AppearanceSettingsProps {
  theme: ThemeName | undefined
  onThemeChange: (theme: string) => void
  themeOrder: ThemeName[]
}

function AppearanceSettings({ theme, onThemeChange, themeOrder }: AppearanceSettingsProps) {
  const isDark = theme?.includes('dark')
  
  return (
    <div className="space-y-8">
      {/* Instance Name Section */}
      <div className={`p-4 rounded-xl border ${isDark ? 'border-zinc-700 bg-zinc-800/30' : 'border-zinc-200 bg-zinc-50'}`}>
        <InstanceNameSettings theme={theme} />
      </div>
      
      {/* Divider */}
      <div className={`border-t ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`} />
      
      {/* Theme Section */}
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Theme
          </h3>
        </div>

        {/* Theme Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {themeOrder.map((name) => {
            const meta = THEME_METADATA[name]
            const isActive = theme === name
            return (
              <button
                key={name}
                type="button"
                onClick={() => onThemeChange(name)}
                className={`
                  flex items-start gap-3 p-4 border-2 rounded-xl text-left transition-all
                  ${isActive
                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 ring-2 ring-cyan-500/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }
                `}
                aria-pressed={isActive}
              >
                <span
                  className="inline-block w-10 h-10 rounded-lg border-2 shadow-inner flex-shrink-0"
                  style={{
                    backgroundColor: meta.backgroundColor,
                    borderColor: meta.accentColor,
                  }}
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                    {meta.label}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {meta.description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {/* Info */}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Theme preference is saved locally and synced across sessions.
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// PREFERENCES TAB CONTENT
// ============================================================================

interface PreferencesTabContentProps {
  preferences: UserPreferences
  onFontSizeChange?: (size: number) => void
  onTreeDensityChange?: (density: UserPreferences['treeDensity']) => void
  onSidebarModeChange?: (mode: UserPreferences['defaultSidebarMode']) => void
  onSidebarOpenMobileChange?: (open: boolean) => void
  onHistoryTrackingChange?: (enabled: boolean) => void
  onRememberScrollPositionChange?: (enabled: boolean) => void
  onAutoExpandBacklinksChange?: (enabled: boolean) => void
  onReset?: () => void
  ttsVoices?: TTSVoiceInfo[]
  ttsSupported?: boolean
  onTTSVoiceChange?: (voiceURI: string) => void
  onTTSRateChange?: (rate: number) => void
  onTTSVolumeChange?: (volume: number) => void
  onTTSPitchChange?: (pitch: number) => void
}

function PreferencesTabContent({
  preferences,
  onFontSizeChange,
  onTreeDensityChange,
  onSidebarModeChange,
  onSidebarOpenMobileChange,
  onHistoryTrackingChange,
  onRememberScrollPositionChange,
  onAutoExpandBacklinksChange,
  onReset,
  ttsVoices = [],
  ttsSupported = false,
  onTTSVoiceChange,
  onTTSRateChange,
  onTTSVolumeChange,
  onTTSPitchChange,
}: PreferencesTabContentProps) {
  const ttsSettings = preferences.tts || { rate: 1, volume: 1, pitch: 1 }
  
  return (
    <div className="space-y-8">
      {/* Font Size */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Font Size: {(preferences.fontSize * 100).toFixed(0)}%
          </h4>
        </div>
        <input
          type="range"
          min="0.8"
          max="1.5"
          step="0.05"
          value={preferences.fontSize}
          onChange={(e) => onFontSizeChange?.(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Adjust the base font size for content display.
        </p>
      </div>

      {/* Tree Density */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Tree Density
          </h4>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(['compact', 'normal', 'comfortable'] as const).map((density) => (
            <button
              key={density}
              onClick={() => onTreeDensityChange?.(density)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                preferences.treeDensity === density
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {density}
            </button>
          ))}
        </div>
      </div>

      {/* Default Sidebar Mode */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sidebar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Default Sidebar Mode
          </h4>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(['tree', 'toc', 'tags'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onSidebarModeChange?.(mode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                preferences.defaultSidebarMode === mode
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Behavior
          </h4>
        </div>
        
        <div className="space-y-3">
          {/* History Tracking */}
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <span className="text-sm text-gray-700 dark:text-gray-300">Track reading history</span>
            <input
              type="checkbox"
              checked={preferences.historyTrackingEnabled !== false}
              onChange={(e) => onHistoryTrackingChange?.(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>

          {/* Scroll Position Memory */}
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <span className="text-sm text-gray-700 dark:text-gray-300">Remember scroll position</span>
            <input
              type="checkbox"
              checked={preferences.rememberScrollPosition !== false}
              onChange={(e) => onRememberScrollPositionChange?.(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>

          {/* Auto-expand Backlinks */}
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <span className="text-sm text-gray-700 dark:text-gray-300">Auto-expand backlinks</span>
            <input
              type="checkbox"
              checked={preferences.autoExpandBacklinks !== false}
              onChange={(e) => onAutoExpandBacklinksChange?.(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>

          {/* Mobile Sidebar */}
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <span className="text-sm text-gray-700 dark:text-gray-300">Open sidebar by default (mobile)</span>
            <input
              type="checkbox"
              checked={preferences.sidebarOpenMobile !== false}
              onChange={(e) => onSidebarOpenMobileChange?.(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      {/* TTS Settings */}
      {ttsSupported && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Text-to-Speech
            </h4>
          </div>

          {/* Voice Selection */}
          {ttsVoices.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Voice</label>
              <select
                value={preferences.tts?.voiceURI || ''}
                onChange={(e) => onTTSVoiceChange?.(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">System Default</option>
                {ttsVoices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Rate Slider */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Speed: {ttsSettings.rate.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={ttsSettings.rate}
              onChange={(e) => onTTSRateChange?.(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Volume Slider */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Volume: {(ttsSettings.volume * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={ttsSettings.volume}
              onChange={(e) => onTTSVolumeChange?.(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Pitch Slider */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Pitch: {ttsSettings.pitch.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={ttsSettings.pitch}
              onChange={(e) => onTTSPitchChange?.(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>
        </div>
      )}

      {/* Ambience Audio Settings */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Headphones className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Ambience & Audio
          </h4>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Ambient sounds and microphone settings are configured in the Write mode sidebar.
          Access these settings by clicking the Headphones section in the sidebar when in Write mode.
        </p>

        <div className="space-y-3">
          {/* Info about ambience features */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available Features:</h5>
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <li>• 7 ambient soundscapes (Rain, Café, Forest, Ocean, Fireplace, Lo-fi, White Noise)</li>
              <li>• Microphone input for music/voice visualization</li>
              <li>• Beat detection with configurable sensitivity</li>
              <li>• Sleep timer (auto-stop after 15, 30, or 60 minutes)</li>
              <li>• Session statistics (listening time, streak tracking)</li>
            </ul>
          </div>

          {/* Quick tip */}
          <div className="flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Mic className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-purple-700 dark:text-purple-300">
              <strong>Tip:</strong> Enable microphone input to visualize music playing around you.
              Your audio is processed locally and never recorded.
            </p>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Preferences to Defaults
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// PERFORMANCE TAB CONTENT
// ============================================================================

interface PerformanceTabContentProps {
  cacheStats: CodexCacheStats | null
  cacheLoading: boolean
  cacheClearing: boolean
  onClearCache: () => void
  onClearAll?: () => void
  capabilities: SystemCapabilities | null
  capabilitiesLoading: boolean
}

function PerformanceTabContent({
  cacheStats,
  cacheLoading,
  cacheClearing,
  onClearCache,
  onClearAll,
  capabilities,
  capabilitiesLoading,
}: PerformanceTabContentProps) {
  const humanReadableCacheSize =
    cacheStats && cacheStats.totalBytes > 0
      ? cacheStats.totalBytes > 1024 * 1024
        ? `${(cacheStats.totalBytes / (1024 * 1024)).toFixed(1)} MB`
        : `${(cacheStats.totalBytes / 1024).toFixed(1)} KB`
      : '0 KB'

  return (
    <div className="space-y-8">
      {/* Cache Management */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Cache Management
          </h4>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-3">
          {cacheLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading cache stats...
            </div>
          ) : cacheStats ? (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Total Size</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{humanReadableCacheSize}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Entries</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{cacheStats.totalItems.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  onClick={onClearCache}
                  disabled={cacheClearing}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
                >
                  {cacheClearing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Clear File Cache
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No cache data available</p>
          )}
        </div>
      </div>

      {/* System Capabilities */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            System Capabilities
          </h4>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          {capabilitiesLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Detecting capabilities...
            </div>
          ) : capabilities ? (
            <div className="space-y-3">
              {/* WebGPU */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">WebGPU</span>
                </div>
                {capabilities.webgpu ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                    <Check className="w-3 h-3" /> Available
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <XCircle className="w-3 h-3" /> Not Available
                  </span>
                )}
              </div>

              {/* WebGPU */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">WebGPU</span>
                </div>
                {capabilities.webgpu ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                    <Check className="w-3 h-3" /> Available
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <XCircle className="w-3 h-3" /> Not Available
                  </span>
                )}
              </div>

              {/* SIMD */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">SIMD (Fast Math)</span>
                </div>
                {capabilities.simd ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                    <Check className="w-3 h-3" /> Available
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <XCircle className="w-3 h-3" /> Not Available
                  </span>
                )}
              </div>

              {/* Threads */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Multi-threading</span>
                </div>
                {capabilities.threads ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                    <Check className="w-3 h-3" /> Available
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <XCircle className="w-3 h-3" /> Not Available
                  </span>
                )}
              </div>

              {/* Recommended Backend */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm">
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500 dark:text-gray-400">Recommended AI Backend:</span>
                  <span className="font-semibold text-gray-900 dark:text-white capitalize">
                    {capabilities.webgpu ? 'WebGPU' : capabilities.simd ? 'WASM (SIMD)' : 'CPU'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Unable to detect capabilities</p>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="space-y-4 pt-4 border-t border-red-200 dark:border-red-900/50">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <h4 className="text-sm font-semibold text-red-600 dark:text-red-400">
            Danger Zone
          </h4>
        </div>

        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-sm text-red-700 dark:text-red-300 mb-3">
            This will permanently delete all local data including bookmarks, reading history, and preferences.
          </p>
          <button
            onClick={onClearAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Local Data
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// AI FEATURES SETTINGS
// ============================================================================

function AIFeaturesSettings() {
  const [prefs, updatePrefs] = useAIPreferences()
  const hasAPIKeys = hasRequiredAPIKeys('rag')
  
  const handleToggle = (
    feature: keyof AIPreferences,
    key: string,
    value: boolean
  ) => {
    if (!hasAPIKeys && value) {
      // Show toast about API keys
      return
    }
    updatePrefs(feature, { [key]: value })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          AI Features
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Optional AI-powered enhancements. All features require valid API keys.
        </p>
      </div>

      {/* API Key Warning */}
      {!hasAPIKeys && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                API Keys Required
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Configure at least one LLM provider in the <span className="font-medium">API Keys</span> tab to enable AI features.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Vision AI */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Camera className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Vision AI
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Analyze images and diagrams with AI
              </p>
            </div>
          </div>
          <ToggleSwitch
            enabled={prefs.vision.enabled}
            onChange={(enabled) => handleToggle('vision', 'enabled', enabled)}
            disabled={!hasAPIKeys}
          />
        </div>
        
        {prefs.vision.enabled && (
          <div className="ml-11 space-y-3">
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">Provider</span>
              <select
                value={prefs.vision.provider || 'openai'}
                onChange={(e) => updatePrefs('vision', { provider: e.target.value as 'openai' | 'anthropic' })}
                className="mt-1 block w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="openai">OpenAI (GPT-4o)</option>
                <option value="anthropic">Anthropic (Claude 3.5)</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {/* RAG Search */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
              <Search className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                RAG Search
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                AI-enhanced search results
              </p>
            </div>
          </div>
          <ToggleSwitch
            enabled={prefs.rag.enabled}
            onChange={(enabled) => handleToggle('rag', 'enabled', enabled)}
            disabled={!hasAPIKeys}
          />
        </div>

        {prefs.rag.enabled && (
          <div className="ml-11 space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={prefs.rag.rerank}
                onChange={(e) => updatePrefs('rag', { rerank: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-cyan-600 focus:ring-cyan-500"
              />
              <div>
                <span className="text-sm text-gray-700 dark:text-gray-300">AI Re-ranking</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Re-order results by relevance
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={prefs.rag.synthesize}
                onChange={(e) => updatePrefs('rag', { synthesize: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-cyan-600 focus:ring-cyan-500"
              />
              <div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Answer Synthesis</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Generate answers from results (Perplexity-style)
                </p>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Writing Assistant - Dedicated Settings */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <WritingAssistantSettings />
      </div>

      {/* Image Generation - Dedicated Settings */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <ImageGenerationSettings />
      </div>

      {/* Info */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl mt-6">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>AI features are <strong>local-first</strong>: they enhance but never replace local search and editing.</p>
            <p className="mt-2">All AI processing streams in real-time for the fastest perceived response.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// TOGGLE SWITCH COMPONENT
// ============================================================================

interface ToggleSwitchProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}

function ToggleSwitch({ enabled, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${enabled ? 'bg-cyan-500' : 'bg-gray-200 dark:bg-gray-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
          ${enabled ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  )
}

// ============================================================================
// DATA & STORAGE TAB (Consolidated: content source, export, cache, clear data)
// ============================================================================

interface DataStorageTabContentProps {
  source: any
  isInitialized: boolean
  isLoading: boolean
  isSyncing: boolean
  onSync: () => Promise<void>
  cacheStats: CodexCacheStats | null
  cacheLoading: boolean
  cacheClearing: boolean
  onClearCache: () => void
  onClearAll?: () => void
  isPremium: boolean
}

function DataStorageTabContent({
  source,
  isInitialized,
  isLoading,
  isSyncing,
  onSync,
  cacheStats,
  cacheLoading,
  cacheClearing,
  onClearCache,
  onClearAll,
  isPremium,
}: DataStorageTabContentProps) {
  const humanReadableCacheSize =
    cacheStats && cacheStats.totalBytes > 0
      ? cacheStats.totalBytes > 1024 * 1024
        ? `${(cacheStats.totalBytes / (1024 * 1024)).toFixed(1)} MB`
        : `${(cacheStats.totalBytes / 1024).toFixed(1)} KB`
      : '0 KB'

  return (
    <div className="space-y-8">
      {/* Database Connections Section */}
      <DatabaseConnectionsTab />

      {/* Content Source Section */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Content Source (Legacy)
          </h4>
        </div>
        <ContentSourceSettings
          source={source}
          isInitialized={isInitialized}
          isLoading={isLoading}
          isSyncing={isSyncing}
          onSync={onSync}
        />
      </div>

      {/* Export & Import Section */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex items-center gap-2">
          <FileArchive className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Export & Import
          </h4>
        </div>
        <ExportImportSettings isPremium={isPremium} />
      </div>

      {/* Cache Management Section - Full Component */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <CacheManagement />
      </div>

      {/* Clear All Data - Danger Zone */}
      <div className="pt-6 border-t border-red-200 dark:border-red-900/50 space-y-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <h4 className="text-sm font-semibold text-red-600 dark:text-red-400">
            Clear All Data
          </h4>
        </div>

        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-sm text-red-700 dark:text-red-300 mb-3">
            This will permanently delete all local data including bookmarks, reading history, preferences, and clear all IndexedDB databases. This cannot be undone.
          </p>
          <button
            onClick={onClearAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Data & Reset
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// INTEGRATIONS TAB (Consolidated: API keys, calendar, templates, plugins, social, research)
// ============================================================================

interface IntegrationsTabContentProps {
  initialSection?: IntegrationSection
}

function IntegrationsTabContent({ initialSection = 'apikeys' }: IntegrationsTabContentProps) {
  const [activeSection, setActiveSection] = React.useState<IntegrationSection>(initialSection)

  // Update active section if initialSection changes (for deep linking)
  React.useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection)
    }
  }, [initialSection])

  const sections = [
    { id: 'apikeys' as const, label: 'API Keys', icon: <Key className="w-4 h-4" /> },
    { id: 'calendar' as const, label: 'Calendar', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'templates' as const, label: 'Templates', icon: <Package className="w-4 h-4" /> },
    { id: 'plugins' as const, label: 'Plugins', icon: <Puzzle className="w-4 h-4" /> },
    { id: 'social' as const, label: 'Social', icon: <Share2 className="w-4 h-4" /> },
    { id: 'research' as const, label: 'Research', icon: <Globe className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${activeSection === section.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }
            `}
          >
            {section.icon}
            {section.label}
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div className="min-h-[300px]">
        {activeSection === 'apikeys' && <APIKeySettings />}
        {activeSection === 'calendar' && <GoogleCalendarSettings />}
        {activeSection === 'templates' && <TemplateSourceSettings />}
        {activeSection === 'plugins' && <PluginSourceSettings />}
        {activeSection === 'social' && <SocialSourceSettings />}
        {activeSection === 'research' && <ResearchSettings />}
      </div>
    </div>
  )
}

// ============================================================================
// LICENSING TAB (Consolidated: premium license + content licensing)
// ============================================================================

interface LicensingTabContentProps {
  isPremium: boolean
}

function LicensingTabContent({ isPremium }: LicensingTabContentProps) {
  return (
    <div className="space-y-8">
      {/* Premium License Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Premium License
          </h4>
        </div>
        <LicenseSettings />
      </div>

      {/* Content Licensing Section */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Default Content License
          </h4>
        </div>
        <ContentLicensingSettings
          defaultLicense={getPreferences().defaultLicense}
          autoDetectLicense={getPreferences().autoDetectLicense}
          showLicenseOnCreate={getPreferences().showLicenseOnCreate}
          onDefaultLicenseChange={(license) => {
            updatePreferences({ defaultLicense: license })
          }}
          onAutoDetectChange={(enabled) => {
            updatePreferences({ autoDetectLicense: enabled })
          }}
          onShowOnCreateChange={(show) => {
            updatePreferences({ showLicenseOnCreate: show })
          }}
        />
      </div>
    </div>
  )
}
