/**
 * Reflect Mode Page Component
 * @module codex/ui/ReflectMode
 *
 * @description
 * Full page reflection mode with calendar navigation and journaling.
 * Combines the ReflectWidget with expanded editing capabilities.
 */

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  BookHeart,
  Sparkles,
  Check,
} from 'lucide-react'
import { useDebounce } from '@/lib/hooks/useDebounce'
import {
  getTodayKey,
  getRelativeDateKey,
  formatDateDisplay,
  parseDateKey,
  getOrCreateReflection,
  saveReflection,
  getReflectionStreak,
  type Reflection,
  MOOD_EMOJIS,
} from '@/lib/reflect'
import { cn } from '@/lib/utils'
import Link from 'next/link'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface ReflectModeProps {
  /** Initial date key (YYYY-MM-DD) */
  initialDate?: string
  /** Theme */
  theme?: 'light' | 'dark'
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function ReflectMode({
  initialDate,
  theme = 'dark',
}: ReflectModeProps) {
  const [currentDate, setCurrentDate] = useState(initialDate || getTodayKey())
  const [reflection, setReflection] = useState<Reflection | null>(null)
  const [content, setContent] = useState('')
  const [streak, setStreak] = useState(0)
  const [selectedMood, setSelectedMood] = useState<string | null>(null)

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const debouncedContent = useDebounce(content, 1000) // 1 second debounce
  const initialContentRef = useRef<string>('')
  const hasLoadedRef = useRef(false)

  // Load reflection for current date
  useEffect(() => {
    async function loadReflection() {
      hasLoadedRef.current = false
      try {
        const result = await getOrCreateReflection(currentDate)
        setReflection(result.reflection)
        // Content comes from template for new reflections
        const loadedContent = result.template?.content || ''
        setContent(loadedContent)
        initialContentRef.current = loadedContent
        // Set mood from metadata if available
        setSelectedMood(result.reflection.metadata?.mood || null)
        // Mark as loaded after a short delay to prevent immediate auto-save
        setTimeout(() => {
          hasLoadedRef.current = true
        }, 100)
      } catch (error) {
        console.error('Failed to load reflection:', error)
      }
    }
    loadReflection()
  }, [currentDate])

  // Load streak
  useEffect(() => {
    async function loadStreak() {
      try {
        const s = await getReflectionStreak()
        setStreak(s.current)
      } catch (error) {
        console.error('Failed to load streak:', error)
      }
    }
    loadStreak()
  }, [])

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

  // Auto-save when debounced content changes
  useEffect(() => {
    // Don't save if not loaded yet, no reflection, or content hasn't changed
    if (!hasLoadedRef.current || !reflection || debouncedContent === initialContentRef.current) {
      return
    }

    // Capture reflection after null check for TypeScript
    const currentReflection = reflection

    async function autoSave() {
      setSaveStatus('saving')
      try {
        const updated: Reflection = {
          ...currentReflection,
          content: debouncedContent,
          updatedAt: new Date().toISOString(),
        }
        await saveReflection(updated)
        setReflection(updated)
        initialContentRef.current = debouncedContent
        setSaveStatus('saved')
        // Clear "saved" indicator after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (error) {
        console.error('Failed to auto-save reflection:', error)
        setSaveStatus('idle')
      }
    }
    autoSave()
  }, [debouncedContent, reflection])

  // Mood selection
  const handleMoodSelect = useCallback(async (mood: string) => {
    if (!reflection) return
    try {
      const updated: Reflection = {
        ...reflection,
        metadata: {
          ...reflection.metadata,
          mood: mood as import('@/lib/codex/mood').MoodState,
          moodSetAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      }
      await saveReflection(updated)
      setReflection(updated)
      setSelectedMood(mood)
    } catch (error) {
      console.error('Failed to save mood:', error)
    }
  }, [reflection])

  const isToday = currentDate === getTodayKey()
  const isFuture = currentDate > getTodayKey()

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/quarry"
                className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <BookHeart className="w-6 h-6 text-purple-400" />
                <h1 className="text-xl font-semibold">Reflect</h1>
              </div>
            </div>

            {/* Streak */}
            {streak > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">{streak} day streak</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={goToPreviousDay}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-purple-400" />
            <span className="text-lg font-medium">
              {formatDateDisplay(parseDateKey(currentDate))}
            </span>
            {!isToday && (
              <button
                onClick={goToToday}
                className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
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
              isFuture || isToday
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-zinc-800'
            )}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Mood Selection */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-zinc-400 mb-3">How are you feeling?</h2>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(MOOD_EMOJIS).map(([moodKey, emoji]) => {
              const isSelected = selectedMood === moodKey
              return (
                <button
                  key={moodKey}
                  onClick={() => handleMoodSelect(moodKey)}
                  className={cn(
                    'text-2xl p-3 rounded-xl transition-all',
                    isSelected
                      ? 'bg-purple-500/20 ring-2 ring-purple-500 scale-110'
                      : 'hover:bg-zinc-800 hover:scale-105'
                  )}
                  title={moodKey}
                >
                  {emoji}
                </button>
              )
            })}
          </div>
        </div>

        {/* Reflection Content */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-400">Reflection</h2>
            {/* Auto-save indicator */}
            <AnimatePresence mode="wait">
              {saveStatus !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-1.5 text-xs text-zinc-500"
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-zinc-500"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-500">Saved</span>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind? Start typing to reflect..."
              className="w-full min-h-[300px] bg-transparent resize-none outline-none text-zinc-200 placeholder:text-zinc-600 leading-relaxed"
            />
          </div>
        </div>
      </main>
    </div>
  )
}
