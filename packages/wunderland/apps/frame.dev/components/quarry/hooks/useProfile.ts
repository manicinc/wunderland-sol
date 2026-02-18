/**
 * User Profile Hook
 *
 * Manages user profile data with full persistence:
 * - localStorage/localForage storage
 * - Streak tracking
 * - Achievement tracking
 * - Study statistics
 * - Preferences management
 * - Export/Import functionality
 *
 * @module hooks/useProfile
 */

'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import type {
  UserProfile,
  AchievementProgress,
  Achievement,
  StudySession
} from '@/types/openstrand'
import {
  XP_REWARDS
} from '@/types/openstrand'
import { 
  profileStorage, 
  progressStorage,
  settingsStorage,
  exportAllData,
  importAllData,
  type ExportData 
} from '@/lib/storage'

// ============================================================================
// TYPES
// ============================================================================

export interface ProfileSettings {
  /** Theme preference */
  theme: 'light' | 'dark' | 'system'
  /** Daily study goal in minutes */
  dailyGoalMinutes: number
  /** Enable study reminders */
  studyReminders: boolean
  /** Reminder time (HH:MM format) */
  reminderTime?: string
  /** Enable sound effects */
  soundEffects: boolean
  /** Enable celebration animations */
  celebrations: boolean
  /** Font size preference */
  fontSize: 'small' | 'medium' | 'large'
  /** Reduce motion for accessibility */
  reduceMotion: boolean
  /** Card flip animation duration */
  flipDuration: number
  /** Auto-advance cards */
  autoAdvance: boolean
  /** Show keyboard shortcuts */
  showShortcuts: boolean
}

export interface ProfileStats {
  strandsCreated: number
  strandsViewed: number
  flashcardsReviewed: number
  flashcardsCreated: number
  quizzesTaken: number
  quizzesPassed: number
  roadmapsStarted: number
  roadmapsCompleted: number
  currentStreak: number
  longestStreak: number
  totalStudyMinutes: number
  perfectQuizzes: number
  averageQuizScore: number
  lastStudyDate?: string
}

const DEFAULT_SETTINGS: ProfileSettings = {
  theme: 'system',
  dailyGoalMinutes: 15,
  studyReminders: false,
  reminderTime: '09:00',
  soundEffects: true,
  celebrations: true,
  fontSize: 'medium',
  reduceMotion: false,
  flipDuration: 300,
  autoAdvance: false,
  showShortcuts: true
}

const DEFAULT_STATS: ProfileStats = {
  strandsCreated: 0,
  strandsViewed: 0,
  flashcardsReviewed: 0,
  flashcardsCreated: 0,
  quizzesTaken: 0,
  quizzesPassed: 0,
  roadmapsStarted: 0,
  roadmapsCompleted: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalStudyMinutes: 0,
  perfectQuizzes: 0,
  averageQuizScore: 0
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if streak should be maintained
 */
function checkStreak(lastStudyDate?: string): { 
  maintained: boolean
  daysElapsed: number 
} {
  if (!lastStudyDate) {
    return { maintained: false, daysElapsed: 0 }
  }

  const last = new Date(lastStudyDate)
  const now = new Date()
  
  // Reset to start of day
  last.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  
  const daysElapsed = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
  
  return {
    maintained: daysElapsed <= 1,
    daysElapsed
  }
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export interface UseProfileOptions {
  /** Auto-load profile on mount */
  autoLoad?: boolean
}

export function useProfile(options: UseProfileOptions = {}) {
  const { autoLoad = true } = options

  // State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('Explorer')
  const [avatar, setAvatar] = useState<string>('')
  const [bio, setBio] = useState<string>('')
  const [stats, setStats] = useState<ProfileStats>(DEFAULT_STATS)
  const [settings, setSettings] = useState<ProfileSettings>(DEFAULT_SETTINGS)
  const [achievements, setAchievements] = useState<AchievementProgress[]>([])
  const [featuredAchievements, setFeaturedAchievements] = useState<string[]>([])
  const [activityHeatmap, setActivityHeatmap] = useState<Record<string, number>>({})
  const [subjectProficiency, setSubjectProficiency] = useState<Record<string, number>>({})
  const [lastActiveAt, setLastActiveAt] = useState<string>(new Date().toISOString())
  const [createdAt, setCreatedAt] = useState<string>(new Date().toISOString())

  // Computed streak status
  const streakStatus = useMemo(() => checkStreak(stats.lastStudyDate), [stats.lastStudyDate])

  // Load profile on mount
  useEffect(() => {
    if (!autoLoad) {
      setLoading(false)
      return
    }

    loadProfile()
  }, [autoLoad])

  /**
   * Load profile from storage
   */
  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Load from profile storage
      const id = await profileStorage.get('id', generateId())
      const name = await profileStorage.get('displayName', 'Explorer')
      const avatarUrl = await profileStorage.get('avatar', '')
      const userBio = await profileStorage.get('bio', '')
      const userCreatedAt = await profileStorage.get('createdAt', new Date().toISOString())
      const featured = await profileStorage.get<string[]>('featuredAchievements', [])

      // Load from progress storage
      const userStats = await progressStorage.get('stats', DEFAULT_STATS)
      const userAchievements = await progressStorage.get<AchievementProgress[]>('achievements', [])
      const heatmap = await progressStorage.get<Record<string, number>>('activityHeatmap', {})
      const proficiency = await progressStorage.get<Record<string, number>>('subjectProficiency', {})
      const lastActive = await progressStorage.get('lastActiveAt', new Date().toISOString())

      // Load from settings storage
      const userSettings = await settingsStorage.get('preferences', DEFAULT_SETTINGS)

      // Set state
      setProfileId(id)
      setDisplayName(name)
      setAvatar(avatarUrl)
      setBio(userBio)
      setCreatedAt(userCreatedAt)
      setFeaturedAchievements(featured)
      setStats(userStats)
      setAchievements(userAchievements)
      setActivityHeatmap(heatmap)
      setSubjectProficiency(proficiency)
      setLastActiveAt(lastActive)
      setSettings(userSettings)

      // Save ID if new
      if (!await profileStorage.has('id')) {
        await profileStorage.set('id', id)
        await profileStorage.set('createdAt', userCreatedAt)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Save profile to storage
   */
  const saveProfile = useCallback(async () => {
    try {
      // Save to profile storage
      await profileStorage.set('id', profileId)
      await profileStorage.set('displayName', displayName)
      await profileStorage.set('avatar', avatar)
      await profileStorage.set('bio', bio)
      await profileStorage.set('featuredAchievements', featuredAchievements)

      // Save to progress storage
      await progressStorage.set('stats', stats)
      await progressStorage.set('achievements', achievements)
      await progressStorage.set('activityHeatmap', activityHeatmap)
      await progressStorage.set('subjectProficiency', subjectProficiency)
      await progressStorage.set('lastActiveAt', new Date().toISOString())

      // Save to settings storage
      await settingsStorage.set('preferences', settings)

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
      return false
    }
  }, [profileId, displayName, avatar, bio, featuredAchievements, stats, achievements, activityHeatmap, subjectProficiency, settings])

  /**
   * Update display name
   */
  const updateDisplayName = useCallback(async (name: string) => {
    setDisplayName(name)
    await profileStorage.set('displayName', name)
  }, [])

  /**
   * Update avatar
   */
  const updateAvatar = useCallback(async (url: string) => {
    setAvatar(url)
    await profileStorage.set('avatar', url)
  }, [])

  /**
   * Update bio
   */
  const updateBio = useCallback(async (text: string) => {
    setBio(text)
    await profileStorage.set('bio', text)
  }, [])

  /**
   * Update settings
   */
  const updateSettings = useCallback(async (newSettings: Partial<ProfileSettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    await settingsStorage.set('preferences', updated)
  }, [settings])

  /**
   * Update stats
   */
  const updateStats = useCallback(async (updates: Partial<ProfileStats>) => {
    const newStats = { ...stats, ...updates }
    
    // Update streak
    const today = new Date().toISOString().split('T')[0]
    if (updates.flashcardsReviewed || updates.quizzesTaken) {
      const { maintained } = checkStreak(stats.lastStudyDate)
      if (maintained || !stats.lastStudyDate) {
        newStats.currentStreak = (stats.currentStreak || 0) + (stats.lastStudyDate?.split('T')[0] === today ? 0 : 1)
      } else {
        newStats.currentStreak = 1
      }
      newStats.longestStreak = Math.max(newStats.longestStreak, newStats.currentStreak)
      newStats.lastStudyDate = new Date().toISOString()
    }

    setStats(newStats)
    await progressStorage.set('stats', newStats)
    return newStats
  }, [stats])

  /**
   * Record study session
   */
  const recordStudySession = useCallback(async (session: StudySession) => {
    const today = new Date().toISOString().split('T')[0]
    
    // Update activity heatmap
    const newHeatmap = { ...activityHeatmap }
    newHeatmap[today] = (newHeatmap[today] || 0) + Math.round(session.duration / 60)
    setActivityHeatmap(newHeatmap)
    await progressStorage.set('activityHeatmap', newHeatmap)

    // Update stats
    await updateStats({
      flashcardsReviewed: stats.flashcardsReviewed + (session.type === 'flashcard' ? session.itemsReviewed : 0),
      quizzesTaken: stats.quizzesTaken + (session.type === 'quiz' ? 1 : 0),
      totalStudyMinutes: stats.totalStudyMinutes + Math.round(session.duration / 60)
    })

    // Update last active
    setLastActiveAt(new Date().toISOString())
    await progressStorage.set('lastActiveAt', new Date().toISOString())
  }, [activityHeatmap, stats, updateStats])

  /**
   * Update subject proficiency
   */
  const updateProficiency = useCallback(async (subject: string, score: number) => {
    const current = subjectProficiency[subject] || 0
    // Weighted average with more recent scores having more weight
    const newScore = Math.round((current * 0.7 + score * 0.3) * 10) / 10
    
    const newProficiency = { ...subjectProficiency, [subject]: newScore }
    setSubjectProficiency(newProficiency)
    await progressStorage.set('subjectProficiency', newProficiency)
  }, [subjectProficiency])

  /**
   * Unlock achievement
   */
  const unlockAchievement = useCallback(async (achievementId: string): Promise<boolean> => {
    const existing = achievements.find(a => a.achievementId === achievementId)
    if (existing?.unlocked) return false

    const updated = existing
      ? { ...existing, unlocked: true, unlockedAt: new Date().toISOString() }
      : { 
          achievementId, 
          currentValue: 0, 
          unlocked: true, 
          unlockedAt: new Date().toISOString(),
          notificationSeen: false
        }

    const newAchievements = existing
      ? achievements.map(a => a.achievementId === achievementId ? updated : a)
      : [...achievements, updated]

    setAchievements(newAchievements)
    await progressStorage.set('achievements', newAchievements)
    return true
  }, [achievements])

  /**
   * Update achievement progress
   */
  const updateAchievementProgress = useCallback(async (
    achievementId: string, 
    progress: number
  ) => {
    const existing = achievements.find(a => a.achievementId === achievementId)
    
    const updated = existing
      ? { ...existing, currentValue: progress }
      : { 
          achievementId, 
          currentValue: progress, 
          unlocked: false,
          notificationSeen: false
        }

    const newAchievements = existing
      ? achievements.map(a => a.achievementId === achievementId ? updated : a)
      : [...achievements, updated]

    setAchievements(newAchievements)
    await progressStorage.set('achievements', newAchievements)
  }, [achievements])

  /**
   * Set featured achievements
   */
  const setFeatured = useCallback(async (achievementIds: string[]) => {
    setFeaturedAchievements(achievementIds.slice(0, 5))
    await profileStorage.set('featuredAchievements', achievementIds.slice(0, 5))
  }, [])

  /**
   * Export all profile data
   */
  const exportProfile = useCallback(async (): Promise<ExportData> => {
    return profileStorage.export()
  }, [])

  /**
   * Export all OpenStrand data
   */
  const exportAll = useCallback(async () => {
    return exportAllData()
  }, [])

  /**
   * Import profile data
   */
  const importProfile = useCallback(async (
    data: ExportData, 
    options?: { merge?: boolean }
  ) => {
    const result = await profileStorage.import(data, options)
    if (result.success) {
      await loadProfile()
    }
    return result
  }, [loadProfile])

  /**
   * Import all OpenStrand data
   */
  const importAll = useCallback(async (
    data: Parameters<typeof importAllData>[0],
    options?: { merge?: boolean }
  ) => {
    const result = await importAllData(data, options)
    if (result.success) {
      await loadProfile()
    }
    return result
  }, [loadProfile])

  /**
   * Download backup file
   */
  const downloadBackup = useCallback(async (filename?: string) => {
    const data = await exportAllData()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `openstrand-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  /**
   * Restore from file
   */
  const restoreFromFile = useCallback(async (
    file: File,
    options?: { merge?: boolean }
  ): Promise<{ success: boolean; errors: string[] }> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        try {
          const json = e.target?.result as string
          const data = JSON.parse(json)
          
          const result = await importAllData(data, options)
          
          if (result.success) {
            await loadProfile()
          }
          
          resolve({
            success: result.success,
            errors: Object.values(result.results).flatMap(r => r.errors)
          })
        } catch (err) {
          resolve({
            success: false,
            errors: [`Failed to parse backup: ${err}`]
          })
        }
      }

      reader.onerror = () => {
        resolve({
          success: false,
          errors: ['Failed to read file']
        })
      }

      reader.readAsText(file)
    })
  }, [loadProfile])

  /**
   * Reset all profile data
   */
  const resetProfile = useCallback(async () => {
    await profileStorage.clear()
    await progressStorage.clear()
    await settingsStorage.clear()
    await loadProfile()
  }, [loadProfile])

  return {
    // Loading state
    loading,
    error,

    // Profile data
    profileId,
    displayName,
    avatar,
    bio,
    stats,
    settings,
    achievements,
    featuredAchievements,
    activityHeatmap,
    subjectProficiency,
    lastActiveAt,
    createdAt,

    // Computed data
    streakStatus,

    // Profile updates
    updateDisplayName,
    updateAvatar,
    updateBio,
    updateSettings,

    // Progress tracking
    updateStats,
    recordStudySession,
    updateProficiency,

    // Achievements
    unlockAchievement,
    updateAchievementProgress,
    setFeatured,

    // Persistence
    saveProfile,
    loadProfile,

    // Export/Import
    exportProfile,
    exportAll,
    importProfile,
    importAll,
    downloadBackup,
    restoreFromFile,
    resetProfile
  }
}

