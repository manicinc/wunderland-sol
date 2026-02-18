'use client'

/**
 * Reflect Mode Page - Consistent layout wrapper
 * @module quarry/reflect/ReflectModePage
 *
 * Wraps the reflection content in QuarryPageLayout for consistent navigation.
 * Right sidebar contains calendar, stats, mood trends, and recent entries.
 * Left sidebar is navigation only for consistency with other quarry pages.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  BarChart3,
  Flame,
  FileText,
  CalendarDays,
  Sun,
  Moon,
  Headphones,
  CloudRain,
  Coffee,
  TreePine,
  Waves,
  Music,
  Radio,
  VolumeX,
  Play,
  Mic,
  RefreshCw,
  Image,
  Save,
  Check,
  AlertCircle,
  Upload,
  Loader2,
  X,
} from 'lucide-react'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'
import MoodSelector from '@/components/quarry/ui/mood/MoodSelector'
import { MoodIndicator } from '@/components/quarry/ui/mood/MoodSelector'
import MoodTrendsChart from '@/components/quarry/ui/mood/MoodTrendsChart'
import { CompactJukebox } from '@/components/quarry/ui/soundscapes/RetroJukebox'
import { getSoundscapeScene } from '@/components/quarry/ui/soundscapes'
import { MiniVisualizer } from '@/components/quarry/ui/media/WaveformVisualizer'
import { useAmbienceSounds, SOUNDSCAPE_INFO, SOUNDSCAPE_METADATA, type SoundscapeType } from '@/lib/audio/ambienceSounds'
import { useMicrophoneAudio } from '@/lib/audio/useMicrophoneAudio'
import MicrophoneInput from '@/components/quarry/ui/media/MicrophoneInput'
import StructuredReflectionEditor from '@/components/quarry/ui/misc/StructuredReflectionEditor'
import ReflectionTimer from '@/components/quarry/ui/reflect/ReflectionTimer'
import ReflectionTimeBrowser from '@/components/quarry/ui/reflect/ReflectionTimeBrowser'
import ReflectionLinks from '@/components/quarry/ui/reflect/ReflectionLinks'
import ReflectionInsights from '@/components/quarry/ui/reflect/ReflectionInsights'
import { ReflectionRating } from '@/components/quarry/ui/reflect/ReflectionRating'
import AccomplishmentsPanel from '@/components/quarry/ui/accomplishments/AccomplishmentsPanel'
import SyncStatusBadge from '@/components/publish/SyncStatusBadge'
import { MiniAnalogClock } from '@/components/quarry/ui/widgets/ClockAmbienceSidebarWidget'
import ReflectLeftSidebar from '@/components/quarry/ui/reflect/ReflectLeftSidebar'
import { updateReflectionLinks } from '@/lib/reflect/reflectionLinks'
import { usePublishReminder } from '@/components/quarry/hooks/usePublishReminder'
import { useToast } from '@/components/quarry/ui/common/Toast'
import {
  getTodayKey,
  formatDateDisplay,
  parseDateKey,
  getOrCreateReflection,
  saveReflection,
  getReflectionStreak,
  getRecentReflections,
  initReflectionsSchema,
  type Reflection,
} from '@/lib/reflect'
import type { MoodState } from '@/lib/codex/mood'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'
import {
  isDarkTheme,
  getThemeCategory,
} from '@/types/theme'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface ReflectionStats {
  totalEntries: number
  thisWeek: number
  thisMonth: number
  averageLength: number
  longestStreak: number
  currentStreak: number
  moodDistribution: Record<string, number>
  topTags: Array<{ tag: string; count: number }>
}

// Soundscape icon mapping
const SOUNDSCAPE_ICONS: Record<SoundscapeType, React.ElementType> = {
  rain: CloudRain,
  cafe: Coffee,
  forest: TreePine,
  ocean: Waves,
  fireplace: Flame,
  lofi: Music,
  'white-noise': Radio,
  none: VolumeX,
}

/* ═══════════════════════════════════════════════════════════════════════════
   THEME UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

function getThemeColors(theme: ThemeName) {
  const category = getThemeCategory(theme)
  const isDark = isDarkTheme(theme)

  const colors = {
    standard: {
      bg: isDark ? 'bg-zinc-950' : 'bg-zinc-50',
      cardBg: isDark ? 'bg-zinc-900/50' : 'bg-white',
      cardBorder: isDark ? 'border-zinc-800' : 'border-zinc-200',
      text: isDark ? 'text-zinc-200' : 'text-zinc-800',
      textMuted: isDark ? 'text-zinc-400' : 'text-zinc-500',
      textSubtle: isDark ? 'text-zinc-500' : 'text-zinc-400',
      heading: isDark ? 'text-zinc-100' : 'text-zinc-900',
      hover: isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100',
      hoverBg: isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100/50',
      inputBg: isDark ? 'bg-zinc-800/50' : 'bg-zinc-100',
      accent: isDark ? 'text-purple-400' : 'text-purple-600',
      accentBg: isDark ? 'bg-purple-500' : 'bg-purple-600',
      accentBgLight: isDark ? 'bg-purple-500/10' : 'bg-purple-100',
      accentRing: isDark ? 'ring-purple-500' : 'ring-purple-500',
      streakBg: isDark ? 'bg-amber-500/10' : 'bg-amber-100',
      streakText: isDark ? 'text-amber-400' : 'text-amber-700',
      successDot: isDark ? 'bg-emerald-400' : 'bg-emerald-500',
    },
    sepia: {
      bg: isDark ? 'bg-stone-950' : 'bg-amber-50/50',
      cardBg: isDark ? 'bg-stone-900/50' : 'bg-amber-50/80',
      cardBorder: isDark ? 'border-stone-800' : 'border-amber-200',
      text: isDark ? 'text-stone-200' : 'text-stone-800',
      textMuted: isDark ? 'text-stone-400' : 'text-stone-600',
      textSubtle: isDark ? 'text-stone-500' : 'text-stone-400',
      heading: isDark ? 'text-amber-50' : 'text-stone-900',
      hover: isDark ? 'hover:bg-stone-800' : 'hover:bg-amber-100',
      hoverBg: isDark ? 'hover:bg-stone-800/50' : 'hover:bg-amber-100/50',
      inputBg: isDark ? 'bg-stone-800/50' : 'bg-amber-100',
      accent: isDark ? 'text-amber-400' : 'text-amber-600',
      accentBg: isDark ? 'bg-amber-500' : 'bg-amber-600',
      accentBgLight: isDark ? 'bg-amber-500/10' : 'bg-amber-100',
      accentRing: isDark ? 'ring-amber-500' : 'ring-amber-500',
      streakBg: isDark ? 'bg-amber-500/10' : 'bg-amber-100',
      streakText: isDark ? 'text-amber-400' : 'text-amber-700',
      successDot: isDark ? 'bg-amber-400' : 'bg-amber-500',
    },
    terminal: {
      bg: isDark ? 'bg-black' : 'bg-green-50/30',
      cardBg: isDark ? 'bg-zinc-900/50' : 'bg-green-50/50',
      cardBorder: isDark ? 'border-green-900/50' : 'border-green-200',
      text: isDark ? 'text-green-100' : 'text-green-900',
      textMuted: isDark ? 'text-green-400' : 'text-green-600',
      textSubtle: isDark ? 'text-green-600' : 'text-green-500',
      heading: isDark ? 'text-green-50' : 'text-green-900',
      hover: isDark ? 'hover:bg-green-900/30' : 'hover:bg-green-100',
      hoverBg: isDark ? 'hover:bg-green-900/20' : 'hover:bg-green-100/50',
      inputBg: isDark ? 'bg-zinc-900/50' : 'bg-green-100',
      accent: isDark ? 'text-green-400' : 'text-green-600',
      accentBg: isDark ? 'bg-green-500' : 'bg-green-600',
      accentBgLight: isDark ? 'bg-green-500/10' : 'bg-green-100',
      accentRing: isDark ? 'ring-green-500' : 'ring-green-500',
      streakBg: isDark ? 'bg-green-500/10' : 'bg-green-100',
      streakText: isDark ? 'text-green-400' : 'text-green-700',
      successDot: isDark ? 'bg-green-400' : 'bg-green-500',
    },
    oceanic: {
      bg: isDark ? 'bg-slate-950' : 'bg-cyan-50/30',
      cardBg: isDark ? 'bg-slate-900/50' : 'bg-cyan-50/50',
      cardBorder: isDark ? 'border-slate-800' : 'border-cyan-200',
      text: isDark ? 'text-slate-200' : 'text-slate-800',
      textMuted: isDark ? 'text-slate-400' : 'text-slate-600',
      textSubtle: isDark ? 'text-slate-500' : 'text-slate-400',
      heading: isDark ? 'text-cyan-50' : 'text-slate-900',
      hover: isDark ? 'hover:bg-slate-800' : 'hover:bg-cyan-100',
      hoverBg: isDark ? 'hover:bg-slate-800/50' : 'hover:bg-cyan-100/50',
      inputBg: isDark ? 'bg-slate-800/50' : 'bg-cyan-100',
      accent: isDark ? 'text-cyan-400' : 'text-cyan-600',
      accentBg: isDark ? 'bg-cyan-500' : 'bg-cyan-600',
      accentBgLight: isDark ? 'bg-cyan-500/10' : 'bg-cyan-100',
      accentRing: isDark ? 'ring-cyan-500' : 'ring-cyan-500',
      streakBg: isDark ? 'bg-cyan-500/10' : 'bg-cyan-100',
      streakText: isDark ? 'text-cyan-400' : 'text-cyan-700',
      successDot: isDark ? 'bg-cyan-400' : 'bg-cyan-500',
    },
  }

  return colors[category]
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUBCOMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

/** Expandable Section Component */
function ExpandableSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  isDark,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  defaultOpen?: boolean
  isDark?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-white'}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between px-4 py-3 min-h-[48px] transition-colors touch-manipulation ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'} focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500/50`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
        ) : (
          <ChevronDown className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`px-4 pb-4 ${isDark ? 'border-t border-zinc-800' : 'border-t border-zinc-200'}`}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Stats Widget */
function StatsWidget({
  label,
  value,
  icon: Icon,
  trend,
  isDark,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  isDark?: boolean
}) {
  return (
    <div className={`p-3 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
      <div className="flex items-center justify-between mb-1">
        <Icon className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
        {trend && (
          <TrendingUp
            className={cn(
              'w-3 h-3',
              trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500 rotate-180' : 'text-zinc-400'
            )}
          />
        )}
      </div>
      <p className={`text-lg font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{value}</p>
      <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{label}</p>
    </div>
  )
}


/** Calendar Sidebar */
function CalendarSidebar({
  currentDate,
  onDateChange,
  reflections,
  isDark,
}: {
  currentDate: string
  onDateChange: (date: string) => void
  reflections: Reflection[]
  isDark?: boolean
}) {
  const [viewMonth, setViewMonth] = useState(() => {
    const [year, month] = currentDate.split('-').map(Number)
    return new Date(year, month - 1, 1)
  })
  const [showMonthPicker, setShowMonthPicker] = useState(false)

  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay()
  const today = getTodayKey()
  const currentYear = new Date().getFullYear()

  const reflectionDates = useMemo(() => {
    return new Set(reflections.map((r) => r.date))
  }, [reflections])

  const goToPrevMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
  }

  const selectMonth = (monthIndex: number) => {
    setViewMonth(new Date(viewMonth.getFullYear(), monthIndex, 1))
    setShowMonthPicker(false)
  }

  const selectYear = (year: number) => {
    setViewMonth(new Date(year, viewMonth.getMonth(), 1))
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i)

  const days = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="w-8 h-8" />)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const hasReflection = reflectionDates.has(dateKey)
    const isCurrentDate = dateKey === currentDate
    const isToday = dateKey === today
    const isFuture = dateKey > today

    days.push(
      <button
        key={day}
        onClick={() => !isFuture && onDateChange(dateKey)}
        disabled={isFuture}
        aria-label={`${day} ${viewMonth.toLocaleDateString('en-US', { month: 'long' })}${hasReflection ? ', has reflection' : ''}`}
        aria-current={isCurrentDate ? 'date' : undefined}
        className={cn(
          'w-9 h-9 sm:w-8 sm:h-8 rounded-lg text-xs font-medium transition-all relative touch-manipulation',
          'focus:outline-none focus:ring-2 focus:ring-amber-500/50',
          isFuture && 'opacity-30 cursor-not-allowed',
          isCurrentDate
            ? isDark
              ? 'bg-amber-500 text-white'
              : 'bg-amber-600 text-white'
            : isToday
              ? isDark
                ? 'ring-1 ring-amber-500 text-amber-400'
                : 'ring-1 ring-amber-500 text-amber-600'
              : isDark
                ? 'hover:bg-zinc-800 text-zinc-300'
                : 'hover:bg-zinc-100 text-zinc-700'
        )}
      >
        {day}
        {hasReflection && !isCurrentDate && (
          <div
            className={cn(
              'absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full',
              isDark ? 'bg-emerald-400' : 'bg-emerald-500'
            )}
          />
        )}
      </button>
    )
  }

  return (
    <div className={`p-3 rounded-xl ${isDark ? 'bg-zinc-900/50 border border-zinc-800' : 'bg-white border border-zinc-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={goToPrevMonth} className={`p-1 rounded ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowMonthPicker(!showMonthPicker)}
          className={cn(
            'text-sm font-medium px-2 py-1 rounded transition-colors flex items-center gap-1',
            isDark ? 'text-zinc-200 hover:bg-zinc-800' : 'text-zinc-800 hover:bg-zinc-100'
          )}
        >
          {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          {showMonthPicker ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <button onClick={goToNextMonth} className={`p-1 rounded ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Month/Year Picker */}
      <AnimatePresence>
        {showMonthPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-3"
          >
            {/* Year selector */}
            <div className="flex items-center justify-center gap-1 mb-2">
              <button
                onClick={() => selectYear(viewMonth.getFullYear() - 1)}
                className={`p-1 rounded ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <select
                value={viewMonth.getFullYear()}
                onChange={(e) => selectYear(Number(e.target.value))}
                className={cn(
                  'text-sm font-medium px-2 py-1 rounded border-none outline-none',
                  isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-800'
                )}
              >
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <button
                onClick={() => selectYear(viewMonth.getFullYear() + 1)}
                className={`p-1 rounded ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-4 gap-1">
              {months.map((month, i) => (
                <button
                  key={month}
                  onClick={() => selectMonth(i)}
                  className={cn(
                    'px-2 py-1.5 text-xs rounded transition-colors',
                    viewMonth.getMonth() === i
                      ? isDark
                        ? 'bg-purple-500 text-white'
                        : 'bg-purple-600 text-white'
                      : isDark
                        ? 'hover:bg-zinc-800 text-zinc-300'
                        : 'hover:bg-zinc-100 text-zinc-700'
                  )}
                >
                  {month}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className={`w-8 h-6 flex items-center justify-center text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">{days}</div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function ReflectModePage() {
  const router = useRouter()
  const { theme: rawTheme, resolvedTheme, setTheme } = useTheme()
  // Use resolvedTheme which properly handles 'system' preference
  const effectiveTheme = resolvedTheme || rawTheme || 'dark'
  const theme = effectiveTheme as ThemeName
  const isDark = effectiveTheme === 'dark' || isDarkTheme(theme)
  const colors = getThemeColors(theme)

  // Toggle between light and dark mode
  const toggleTheme = () => {
    if (isDark) {
      setTheme(theme?.replace('dark', 'light') || 'light')
    } else {
      setTheme(theme?.replace('light', 'dark') || 'dark')
    }
  }

  const [isMounted, setIsMounted] = useState(false)
  const [currentDate, setCurrentDate] = useState(getTodayKey())
  const [reflection, setReflection] = useState<Reflection | null>(null)
  const [content, setContent] = useState('')
  const [streak, setStreak] = useState({ current: 0, longest: 0 })
  const [selectedMood, setSelectedMood] = useState<MoodState | null>(null)
  const [allReflections, setAllReflections] = useState<Reflection[]>([])
  const [stats, setStats] = useState<ReflectionStats | null>(null)
  const [showAmbience, setShowAmbience] = useState(false)
  const [showSceneVisualization, setShowSceneVisualization] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimeoutRef = React.useRef<NodeJS.Timeout>()
  const toast = useToast()

  // Publish reminder hook - shows toast after local saves when using GitHub backend
  const { onLocalSave: triggerPublishReminder } = usePublishReminder({
    onPublish: () => {
      if (reflection?.strandPath) {
        router.push(`/quarry/publish?path=${encodeURIComponent(reflection.strandPath)}`)
      }
    },
    enabled: reflection?.syncStatus === 'local', // Only show when not yet published
  })

  // Ambience state
  const {
    isPlaying: isAmbiencePlaying,
    getAnalyser,
    toggle: toggleAmbience,
    setVolume: setAmbienceVolume,
    volume: ambienceVolume,
    soundscape,
    setSoundscape,
    stop: stopAmbience,
  } = useAmbienceSounds()

  // Microphone input state
  const {
    status: micStatus,
    isActive: isMicActive,
    noiseFloor: micNoiseFloor,
    beatDetected: micBeatDetected,
    getAnalyser: getMicAnalyser,
    start: startMic,
    stop: stopMic,
    recalibrate: recalibrateMic,
  } = useMicrophoneAudio()

  const [showMicPermissionUI, setShowMicPermissionUI] = useState(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAmbience()
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [stopAmbience])

  // Initialize schema and mount
  useEffect(() => {
    async function init() {
      try {
        await initReflectionsSchema()
      } catch (error) {
        console.error('[Reflect] Failed to initialize schema:', error)
      }
      setIsMounted(true)
    }
    init()
  }, [])

  // Load reflection for current date
  useEffect(() => {
    async function loadReflection() {
      try {
        const result = await getOrCreateReflection(currentDate)
        setReflection(result.reflection)
        setContent(result.content)
        setSelectedMood((result.reflection.metadata?.mood as MoodState) || null)
      } catch (error) {
        console.error('Failed to load reflection:', error)
      }
    }
    if (isMounted) loadReflection()
  }, [currentDate, isMounted])

  // Load streak and all reflections
  useEffect(() => {
    async function loadData() {
      try {
        const [streakData, reflections] = await Promise.all([getReflectionStreak(), getRecentReflections(365)])
        setStreak(streakData)
        setAllReflections(reflections)

        // Calculate stats
        const now = new Date()
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

        const thisWeek = reflections.filter((r) => new Date(r.date) >= weekAgo).length
        const thisMonth = reflections.filter((r) => new Date(r.date) >= monthAgo).length
        const totalLength = reflections.reduce((sum, r) => sum + (r.wordCount || 0), 0)

        const moodDist: Record<string, number> = {}
        reflections.forEach((r) => {
          if (r.metadata?.mood) {
            moodDist[r.metadata.mood] = (moodDist[r.metadata.mood] || 0) + 1
          }
        })

        setStats({
          totalEntries: reflections.length,
          thisWeek,
          thisMonth,
          averageLength: reflections.length > 0 ? Math.round(totalLength / reflections.length) : 0,
          longestStreak: streakData.longest,
          currentStreak: streakData.current,
          moodDistribution: moodDist,
          topTags: [],
        })
      } catch (error) {
        console.error('Failed to load data:', error)
      }
    }
    if (isMounted) loadData()
  }, [isMounted])

  // Navigate dates
  const goToPreviousDay = useCallback(() => {
    const [year, month, day] = currentDate.split('-').map(Number)
    const date = new Date(year, month - 1, day - 1)
    const newKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    setCurrentDate(newKey)
  }, [currentDate])

  const goToNextDay = useCallback(() => {
    const [year, month, day] = currentDate.split('-').map(Number)
    const date = new Date(year, month - 1, day + 1)
    const newKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const today = getTodayKey()
    if (newKey <= today) {
      setCurrentDate(newKey)
    }
  }, [currentDate])

  const goToToday = useCallback(() => {
    setCurrentDate(getTodayKey())
  }, [])

  // Mood selection
  const handleMoodSelect = useCallback(
    async (mood: MoodState | null) => {
      if (!reflection) return
      try {
        const updated: Reflection = {
          ...reflection,
          metadata: {
            ...reflection.metadata,
            mood: mood || undefined,
            moodSetAt: mood ? new Date().toISOString() : undefined,
          },
          updatedAt: new Date().toISOString(),
        }
        await saveReflection(updated)
        setReflection(updated)
        setSelectedMood(mood)
      } catch (error) {
        console.error('Failed to save mood:', error)
      }
    },
    [reflection]
  )

  const handleNavigate = (path: string) => {
    router.push(`/quarry/${path}`)
  }

  const isToday = currentDate === getTodayKey()
  const isFuture = currentDate > getTodayKey()

  // Left sidebar - Use ReflectLeftSidebar component for consistency
  const leftSidebarContent = (
    <ReflectLeftSidebar
      theme={theme as any}
      currentStreak={streak.current}
      totalEntries={stats?.totalEntries || 0}
      onPromptSelect={(prompt) => {
        const promptText = `\n\n## ${prompt}\n\n`
        setContent(prev => prev + promptText)
      }}
    />
  )

  // Right sidebar content - Full analytics
  const rightSidebarContent = (
    <div className="flex flex-col h-full overflow-auto">
      {/* Calendar */}
      <div className={cn('p-3 border-b', colors.cardBorder)}>
        <CalendarSidebar currentDate={currentDate} onDateChange={setCurrentDate} reflections={allReflections} isDark={isDark} />
      </div>

      {/* Quick Stats */}
      <div className={cn('p-3 border-b', colors.cardBorder)}>
        <h3 className={cn('text-xs font-medium mb-2 uppercase tracking-wide', colors.textSubtle)}>Stats</h3>
        <div className="grid grid-cols-2 gap-2">
          <StatsWidget label="Current Streak" value={streak.current} icon={Flame} trend="up" isDark={isDark} />
          <StatsWidget label="This Week" value={stats?.thisWeek || 0} icon={CalendarDays} isDark={isDark} />
          <StatsWidget label="Total Entries" value={stats?.totalEntries || 0} icon={FileText} isDark={isDark} />
          <StatsWidget label="Avg Words" value={`${stats?.averageLength || 0}`} icon={BarChart3} isDark={isDark} />
        </div>
      </div>

      {/* Rating Section */}
      <div className={cn('p-3 border-b', colors.cardBorder)}>
        <h3 className={cn('text-xs font-medium mb-2 uppercase tracking-wide', colors.textSubtle)}>Rate Entry</h3>
        <ReflectionRating
          strandId={reflection?.date}
          strandPath={reflection?.strandPath}
          strandContent={content}
          strandTitle={formatDateDisplay(parseDateKey(currentDate))}
          isDark={isDark}
          compact={true}
          showAIRating={true}
        />
      </div>

      {/* Mood Trends */}
      <div className={cn('p-3 border-b', colors.cardBorder)}>
        <MoodTrendsChart reflections={allReflections} days={7} compact={false} />
      </div>

      {/* Accomplishments */}
      <div className={cn('border-b', colors.cardBorder)}>
        <AccomplishmentsPanel
          date={currentDate}
          period="day"
          showStats={false}
          showStreak={true}
          compact={true}
          groupByProject={true}
          isDark={isDark}
        />
      </div>

      {/* Ambience Section */}
      <div className={cn('p-3 border-b', colors.cardBorder)}>
        <button
          onClick={() => setShowAmbience(!showAmbience)}
          className={cn('w-full flex items-center justify-between py-1', colors.text)}
        >
          <span className="flex items-center gap-2">
            <Headphones className={cn('w-4 h-4', colors.accent)} />
            <span className={cn('text-xs font-medium uppercase tracking-wide', colors.textSubtle)}>Ambience</span>
            {isAmbiencePlaying && (
              <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', colors.successDot)} />
            )}
          </span>
          {showAmbience ? <ChevronUp className={cn('w-4 h-4', colors.textMuted)} /> : <ChevronDown className={cn('w-4 h-4', colors.textMuted)} />}
        </button>

        <AnimatePresence>
          {showAmbience && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-3 space-y-3"
            >
              {/* Compact Jukebox + Scene Toggle Row */}
              <div className="flex items-start gap-2">
                {/* Compact Jukebox */}
                <div className="flex-1">
                  <CompactJukebox
                    isPlaying={isAmbiencePlaying}
                    nowPlaying={isAmbiencePlaying ? SOUNDSCAPE_INFO[soundscape]?.name : undefined}
                    analyser={getAnalyser()}
                    volume={ambienceVolume}
                    currentSoundscape={soundscape}
                    onTogglePlay={toggleAmbience}
                    onVolumeChange={setAmbienceVolume}
                    onSelectSoundscape={setSoundscape}
                  />
                </div>

                {/* Scene Visualization Toggle */}
                {soundscape !== 'none' && getSoundscapeScene(soundscape) && (
                  <button
                    onClick={() => setShowSceneVisualization(!showSceneVisualization)}
                    className={cn(
                      'p-2 rounded-lg transition-all flex-shrink-0',
                      showSceneVisualization
                        ? cn(colors.accentBgLight, colors.accent, 'ring-1', colors.accentRing.replace('ring-', 'ring-') + '/50')
                        : cn(colors.inputBg, colors.textMuted, colors.hover)
                    )}
                    title={showSceneVisualization ? 'Hide scene visualization' : 'Show scene visualization'}
                  >
                    <Image className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Soundscape Scene Visualization - toggleable */}
              <AnimatePresence>
                {showSceneVisualization && isAmbiencePlaying && soundscape !== 'none' && (() => {
                  const SceneComponent = getSoundscapeScene(soundscape)
                  if (!SceneComponent) return null
                  return (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className={cn('rounded-lg overflow-hidden aspect-[4/3]', colors.cardBg)}>
                        <SceneComponent
                          analyser={getAnalyser() ?? null}
                          isPlaying={isAmbiencePlaying}
                          theme={theme}
                        />
                      </div>
                    </motion.div>
                  )
                })()}
              </AnimatePresence>

              {/* Waveform Visualizer - shows for ambience or mic */}
              {(isAmbiencePlaying || isMicActive) && (
                <div className={cn('rounded-lg overflow-hidden', colors.inputBg)}>
                  <MiniVisualizer
                    analyser={isMicActive ? getMicAnalyser() : (getAnalyser() ?? null)}
                    isPlaying={isAmbiencePlaying || isMicActive}
                    isDark={isDark}
                    beatDetected={isMicActive ? micBeatDetected : false}
                    noiseFloor={isMicActive ? micNoiseFloor : 0}
                  />
                </div>
              )}

              {/* Soundscape Selector Grid - 2 columns for Reflect */}
              <div className="grid grid-cols-2 gap-1.5">
                {SOUNDSCAPE_METADATA.filter(s => s.id !== 'none').map((s) => {
                  const Icon = SOUNDSCAPE_ICONS[s.id]
                  const isSelected = soundscape === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSoundscape(s.id)
                        if (!isAmbiencePlaying) toggleAmbience()
                      }}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg transition-all',
                        isSelected
                          ? cn(colors.accentBgLight, colors.accent, 'ring-1', colors.accentRing.replace('ring-', 'ring-') + '/50')
                          : cn(colors.textMuted, colors.hover)
                      )}
                      title={s.description}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs truncate">{s.name}</span>
                    </button>
                  )
                })}
              </div>

              {/* Play/Stop Button */}
              <button
                onClick={toggleAmbience}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-all',
                  isAmbiencePlaying
                    ? cn(colors.accentBgLight, colors.accent)
                    : cn(colors.inputBg, colors.textMuted, colors.hover)
                )}
              >
                {isAmbiencePlaying ? (
                  <>
                    <span className={cn('w-2 h-2 rounded-full animate-pulse', colors.successDot)} />
                    <span className="text-sm">Playing {SOUNDSCAPE_INFO[soundscape]?.name}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span className="text-sm">Play Ambience</span>
                  </>
                )}
              </button>

              {/* Mic Input Toggle */}
              <div className={cn(
                'flex items-center justify-between p-2 rounded-lg transition-all',
                isMicActive
                  ? 'bg-rose-500/10 ring-1 ring-rose-500/30'
                  : colors.inputBg
              )}>
                {isMicActive ? (
                  <>
                    <button
                      onClick={stopMic}
                      className="flex items-center gap-2"
                    >
                      <div className="relative">
                        <Mic className="w-4 h-4 text-rose-400" />
                        <motion.span
                          className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full"
                          animate={{ scale: micBeatDetected ? 1.3 : 1 }}
                          transition={{ duration: 0.1 }}
                        />
                      </div>
                      <span className={isDark ? 'text-rose-400 text-sm' : 'text-rose-600 text-sm'}>
                        Mic Active
                      </span>
                    </button>
                    <button
                      onClick={recalibrateMic}
                      className={cn(
                        'p-1 rounded-lg transition-colors',
                        colors.textMuted, colors.hover
                      )}
                      title="Recalibrate noise floor"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : micStatus === 'calibrating' ? (
                  <div className="flex items-center gap-2">
                    <motion.div
                      className={cn('w-4 h-4 border-2 border-t-transparent rounded-full', colors.streakText.replace('text-', 'border-'))}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <span className={cn('text-sm', colors.streakText)}>
                      Calibrating...
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (micStatus === 'idle') {
                        setShowMicPermissionUI(true)
                      } else {
                        startMic()
                      }
                    }}
                    className="flex items-center gap-2 w-full"
                  >
                    <Mic className={cn('w-4 h-4', colors.textMuted)} />
                    <span className={cn('text-sm', colors.textMuted)}>
                      Enable Mic Input
                    </span>
                  </button>
                )}
              </div>

              {/* Mic Permission UI */}
              <AnimatePresence>
                {showMicPermissionUI && !isMicActive && micStatus !== 'calibrating' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <MicrophoneInput
                      isDark={isDark}
                      onAnalyserReady={() => setShowMicPermissionUI(false)}
                      onStop={() => setShowMicPermissionUI(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Time Browser - Hierarchical Year/Month/Week navigation */}
      <div className="flex-1 min-h-0">
        <ReflectionTimeBrowser
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          isDark={isDark}
          showSearch={true}
          className="h-full"
        />
      </div>
    </div>
  )

  return (
    <QuarryPageLayout
      title="Reflect"
      description="Daily journaling and mood tracking"
      leftPanelContent={leftSidebarContent}
      rightPanelContent={rightSidebarContent}
      showRightPanel={true}
      forceSidebarSmall={true}
      rightPanelWidth={260}
    >
      {!isMounted ? (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className={cn('animate-spin w-8 h-8 border-2 border-t-transparent rounded-full', colors.accentBg.replace('bg-', 'border-'))} />
        </div>
      ) : (
        <div className={cn('h-full overflow-auto', colors.bg)}>
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header with Date Navigation */}
            <div className={cn('flex items-center justify-between p-4 rounded-xl border', colors.cardBg, colors.cardBorder)}>
              <button onClick={goToPreviousDay} className={cn('p-2 rounded-lg transition-colors', colors.hover)}>
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <Calendar className={cn('w-5 h-5', colors.accent)} />
                <span className={cn('text-lg font-medium', colors.heading)}>
                  {formatDateDisplay(parseDateKey(currentDate))}
                </span>
                {/* Auto-save status indicator - always visible */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={saveStatus}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={cn(
                      'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full',
                      saveStatus === 'saving'
                        ? isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-600'
                        : saveStatus === 'saved'
                        ? isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                        : saveStatus === 'error'
                        ? isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-100 text-red-600'
                        : isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400'
                    )}
                  >
                    {saveStatus === 'saving' ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        >
                          <Loader2 className="w-3 h-3" />
                        </motion.div>
                        <span>Saving</span>
                      </>
                    ) : saveStatus === 'saved' ? (
                      <>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        >
                          <Check className="w-3 h-3" />
                        </motion.div>
                        <span>Saved</span>
                      </>
                    ) : saveStatus === 'error' ? (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        <span>Error</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3 h-3" />
                        <span>Local</span>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Publish CTA - show when local only */}
                {reflection?.syncStatus === 'local' && (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => router.push(`/quarry/publish?path=${encodeURIComponent(reflection.strandPath)}`)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                      isDark
                        ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300'
                        : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                    )}
                  >
                    <Upload className="w-3 h-3" />
                    Publish
                  </motion.button>
                )}
                {!isToday && (
                  <button
                    onClick={goToToday}
                    className={cn('text-xs px-2 py-1 rounded transition-colors', colors.inputBg, colors.hover)}
                  >
                    Today
                  </button>
                )}
              </div>

              <button
                onClick={goToNextDay}
                disabled={isFuture || isToday}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isFuture || isToday ? 'opacity-30 cursor-not-allowed' : colors.hover
                )}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Streak Banner */}
            {streak.current > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex items-center justify-center gap-2 py-2 px-4 rounded-xl', colors.streakBg, colors.streakText)}
              >
                <Flame className="w-5 h-5" />
                <span className="font-medium">{streak.current} day streak!</span>
                <Sparkles className="w-4 h-4" />
              </motion.div>
            )}

            {/* Mood Selection - Compact inline */}
            <div className={cn('p-3 rounded-xl border', colors.cardBg, colors.cardBorder)}>
              <MoodSelector
                selected={selectedMood}
                onSelect={handleMoodSelect}
                showLabels={false}
                compact={true}
              />
            </div>

            {/* Structured Reflection Editor */}
            <StructuredReflectionEditor
              content={content}
              onChange={async (newContent) => {
                setContent(newContent)
                // Auto-save after changes with status indicator
                if (reflection) {
                  // Clear any pending status timeout
                  if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current)
                  }
                  setSaveStatus('saving')

                  const updated = {
                    ...reflection,
                    updatedAt: new Date().toISOString(),
                    wordCount: newContent.split(/\s+/).filter(Boolean).length,
                    content: newContent,
                  }
                  try {
                    await saveReflection(updated, newContent)
                    // Update links (debounced by the async operation)
                    updateReflectionLinks(currentDate, newContent).catch(console.error)
                    setSaveStatus('saved')
                    // Trigger publish reminder toast
                    triggerPublishReminder()
                    // Reset to idle after 2 seconds
                    saveTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
                  } catch (error) {
                    console.error('Failed to save reflection:', error)
                    setSaveStatus('error')
                    saveTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 3000)
                  }
                }
              }}
              isDark={isDark}
              dateDisplay={formatDateDisplay(parseDateKey(currentDate))}
              dayOfWeek={parseDateKey(currentDate).toLocaleDateString('en-US', { weekday: 'long' })}
            />

            {/* Tags Section */}
            {(reflection?.metadata?.tags?.length ?? 0) > 0 && (
              <div className={cn('p-4 rounded-xl border', colors.cardBg, colors.cardBorder)}>
                <h3 className={cn('text-xs font-medium mb-2 uppercase tracking-wide', colors.textSubtle)}>
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {reflection?.metadata?.tags?.map((tag, i) => (
                    <span
                      key={i}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                        isDark
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-800/50'
                          : 'bg-purple-100 text-purple-700 border border-purple-200'
                      )}
                    >
                      #{tag}
                      <button
                        onClick={async () => {
                          if (!reflection) return
                          const updatedTags = (reflection.metadata?.tags || []).filter(t => t !== tag)
                          const updated = {
                            ...reflection,
                            metadata: {
                              ...reflection.metadata,
                              tags: updatedTags,
                            },
                            updatedAt: new Date().toISOString(),
                          }
                          setReflection(updated)
                          await saveReflection(updated, content)
                        }}
                        className="p-0.5 hover:opacity-70 transition-opacity"
                        title="Remove tag"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Insights Section */}
            <ReflectionInsights
              dateKey={currentDate}
              content={content}
              mood={selectedMood || undefined}
              existingInsights={reflection?.metadata?.insights}
              appliedTags={reflection?.metadata?.tags || []}
              onApplyTag={async (tag) => {
                if (!reflection) return
                const normalizedTag = tag.toLowerCase().trim()
                const existingTags = reflection.metadata?.tags || []
                if (existingTags.includes(normalizedTag)) return

                const updatedTags = [...existingTags, normalizedTag]
                const updated = {
                  ...reflection,
                  metadata: {
                    ...reflection.metadata,
                    tags: updatedTags,
                  },
                  updatedAt: new Date().toISOString(),
                }
                setReflection(updated)
                await saveReflection(updated, content)
              }}
              onInsightsGenerated={(insights) => {
                if (reflection) {
                  const updated = {
                    ...reflection,
                    metadata: {
                      ...reflection.metadata,
                      insights,
                    },
                    updatedAt: new Date().toISOString(),
                  }
                  saveReflection(updated, content).catch(console.error)
                }
              }}
              isDark={isDark}
              defaultCollapsed={true}
            />

            {/* Links Section */}
            <ReflectionLinks
              dateKey={currentDate}
              onNavigate={(type, id) => {
                if (type === 'reflection') {
                  setCurrentDate(id)
                } else {
                  // Navigate to strand
                  router.push(`/quarry?strand=${encodeURIComponent(id)}`)
                }
              }}
              isDark={isDark}
              defaultCollapsed={false}
            />

          </div>
        </div>
      )}
    </QuarryPageLayout>
  )
}
