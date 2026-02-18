/**
 * HabitDashboard Component
 *
 * Main dashboard for habit tracking with:
 * - Today's habits list
 * - Streak overview
 * - Progress stats
 * - Habit creation from templates
 *
 * @module components/quarry/ui/HabitDashboard
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame,
  Plus,
  Target,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Filter,
  LayoutGrid,
  List,
  ChevronRight,
  ChevronLeft,
  Trophy,
  X,
  Sunrise,
  Sunset,
  // Icons for habits
  Droplets,
  Dumbbell,
  Footprints,
  Apple,
  Moon,
  SmartphoneNfc,
  Book,
  Languages,
  GraduationCap,
  ListChecks,
  Inbox,
  Focus,
  ClipboardCheck,
  Brain,
  Heart,
  Wind,
  PenLine,
  MessageCircle,
  FileText,
  Pencil,
  Receipt,
  ShoppingCart,
  ChefHat,
  Activity,
  TreePine,
  MonitorPlay,
  FileSpreadsheet,
  CalendarCheck,
  FolderSync,
  HardDrive,
  Phone,
  Users,
  PieChart,
  Palette,
  Music,
  Unplug,
  Flower2,
  ListTodo,
  Timer,
  Utensils,
  LogOut,
  Wallet,
  BookOpen,
  Zap,
  MoreHorizontal,
  Check,
  type LucideIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { HabitCard } from './HabitCard'
import { RitualPromptModal } from './RitualPromptModal'
import { useHabits, type CreateHabitInput } from '@/lib/planner/habits/useHabits'
import type { HabitFrequency, HabitWithStreak } from '@/lib/planner/habits/types'
import {
  getFeaturedTemplates,
  getTemplatesByCategory,
  getCategoryInfo,
  isRitualTemplate,
  getTemplateById,
  type HabitTemplate,
  type HabitCategory,
} from '@/lib/planner/habits/templates'
import { useLifecycleData } from '@/components/quarry/hooks/useLifecycleData'
import type { RitualType } from '@/lib/analytics/lifecycleTypes'

// ============================================================================
// TYPES
// ============================================================================

type ViewMode = 'list' | 'grid'
type FilterMode = 'all' | 'today' | 'at_risk' | 'completed'
type WizardStep = 'closed' | 'choose-type' | 'templates' | 'category' | 'custom'

// Icon name to component mapping
const iconMap: Record<string, LucideIcon> = {
  Droplets, Dumbbell, Footprints, Apple, Moon, SmartphoneOff: SmartphoneNfc, SmartphoneNfc, Book, Languages,
  GraduationCap, ListChecks, Inbox, Focus, ClipboardCheck, Brain, Heart, Wind,
  PenLine, MessageCircle, FileText, Pencil, Receipt, ShoppingCart, ChefHat,
  Activity, TreePine, MonitorPlay, FileSpreadsheet, CalendarCheck, FolderSync,
  HardDrive, Phone, Users, PieChart, Palette, Music, Unplug, Flower2, ListTodo,
  Timer, Utensils, LogOut, Wallet, BookOpen, Zap, MoreHorizontal, Sparkles,
  Sunrise, Sunset, Calendar, Target, TrendingUp,
}

const HabitIcon: React.FC<{ name: string; className?: string; style?: React.CSSProperties }> = ({
  name, className = 'w-5 h-5', style
}) => {
  const Icon = iconMap[name]
  if (!Icon) return <Sparkles className={className} style={style} />
  return <Icon className={className} style={style} />
}

// ============================================================================
// STATS CARD
// ============================================================================

const StatCard: React.FC<{
  icon: React.ReactNode
  label: string
  value: number | string
  color: string
  subLabel?: string
}> = ({ icon, label, value, color, subLabel }) => (
  <div className="bg-white dark:bg-ink-800 rounded-xl p-4 border border-paper-200 dark:border-ink-700">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-ink-800 dark:text-paper-100">{value}</div>
        <div className="text-xs text-ink-500 dark:text-paper-400">{label}</div>
        {subLabel && (
          <div className="text-xs text-ink-400 dark:text-paper-500">{subLabel}</div>
        )}
      </div>
    </div>
  </div>
)

// ============================================================================
// INLINE HABIT WIZARD
// ============================================================================

const InlineHabitWizard: React.FC<{
  step: WizardStep
  onStepChange: (step: WizardStep) => void
  onCreate: (input: CreateHabitInput) => Promise<void>
}> = ({ step, onStepChange, onCreate }) => {
  const [selectedCategory, setSelectedCategory] = useState<HabitCategory | null>(null)
  const [customForm, setCustomForm] = useState<CreateHabitInput>({
    title: '',
    frequency: 'daily',
    category: 'health',
  })
  const [isCreating, setIsCreating] = useState(false)

  const featuredTemplates = getFeaturedTemplates()
  const categoryTemplates = selectedCategory ? getTemplatesByCategory(selectedCategory) : []

  const categories: HabitCategory[] = [
    'health',
    'learning',
    'productivity',
    'mindfulness',
    'social',
    'creative',
    'finance',
  ]

  const handleTemplateSelect = async (template: HabitTemplate) => {
    setIsCreating(true)
    try {
      await onCreate({
        title: template.title,
        description: template.description,
        frequency: template.frequency,
        category: template.category,
        preferredTime: template.preferredTime,
        targetCount: template.targetCount,
        motivation: template.tip,
      })
      onStepChange('closed')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCustomCreate = async () => {
    if (!customForm.title.trim()) return
    setIsCreating(true)
    try {
      await onCreate(customForm)
      onStepChange('closed')
      setCustomForm({ title: '', frequency: 'daily', category: 'health' })
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    onStepChange('closed')
    setSelectedCategory(null)
    setCustomForm({ title: '', frequency: 'daily', category: 'health' })
  }

  if (step === 'closed') return null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="bg-gradient-to-br from-paper-50 to-paper-100 dark:from-ink-800 dark:to-ink-900 rounded-2xl border border-paper-200 dark:border-ink-700 overflow-hidden">
        {/* Wizard Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-paper-200/50 dark:border-ink-700/50">
          <div className="flex items-center gap-3">
            {step !== 'choose-type' && (
              <button
                onClick={() => {
                  if (step === 'category') {
                    setSelectedCategory(null)
                    onStepChange('templates')
                  } else if (step === 'templates' || step === 'custom') {
                    onStepChange('choose-type')
                  }
                }}
                className="p-1.5 -ml-1.5 text-ink-400 hover:text-ink-600 dark:text-paper-500 dark:hover:text-paper-300 hover:bg-paper-200/50 dark:hover:bg-ink-700/50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h3 className="font-semibold text-ink-800 dark:text-paper-100">
              {step === 'choose-type' && 'New Habit'}
              {step === 'templates' && 'Choose a Template'}
              {step === 'category' && getCategoryInfo(selectedCategory!).label}
              {step === 'custom' && 'Create Custom Habit'}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-ink-400 hover:text-ink-600 dark:text-paper-500 dark:hover:text-paper-300 hover:bg-paper-200/50 dark:hover:bg-ink-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step: Choose Type */}
        <AnimatePresence mode="wait">
          {step === 'choose-type' && (
            <motion.div
              key="choose-type"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-5"
            >
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onStepChange('templates')}
                  className="group relative p-5 bg-white dark:bg-ink-700/50 rounded-xl border-2 border-transparent hover:border-orange-500/50 transition-all text-left"
                >
                  <div className="w-12 h-12 mb-3 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-orange-500" />
                  </div>
                  <div className="font-semibold text-ink-800 dark:text-paper-100 mb-1">From Template</div>
                  <p className="text-sm text-ink-500 dark:text-paper-400">Choose from curated habits with built-in best practices</p>
                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-300 dark:text-paper-600 group-hover:text-orange-500 transition-colors" />
                </button>
                <button
                  onClick={() => onStepChange('custom')}
                  className="group relative p-5 bg-white dark:bg-ink-700/50 rounded-xl border-2 border-transparent hover:border-blue-500/50 transition-all text-left"
                >
                  <div className="w-12 h-12 mb-3 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                    <PenLine className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="font-semibold text-ink-800 dark:text-paper-100 mb-1">Custom Habit</div>
                  <p className="text-sm text-ink-500 dark:text-paper-400">Create your own habit with custom settings</p>
                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-300 dark:text-paper-600 group-hover:text-blue-500 transition-colors" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step: Templates */}
          {step === 'templates' && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-5 space-y-5"
            >
              {/* Featured */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-ink-600 dark:text-paper-300">Popular Habits</span>
                </div>
                <div className="grid gap-2">
                  {featuredTemplates.slice(0, 4).map((template) => {
                    const catInfo = getCategoryInfo(template.category)
                    return (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        disabled={isCreating}
                        className="group flex items-center gap-4 p-3 bg-white dark:bg-ink-700/50 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/10 border border-transparent hover:border-orange-200 dark:hover:border-orange-800/30 transition-all text-left disabled:opacity-50"
                      >
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${catInfo.color}15` }}
                        >
                          <HabitIcon name={template.icon} className="w-5 h-5" style={{ color: catInfo.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-ink-800 dark:text-paper-100">{template.title}</div>
                          <div className="text-sm text-ink-500 dark:text-paper-400 truncate">{template.description}</div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-xs text-orange-500 font-medium">Add</span>
                          <Plus className="w-4 h-4 text-orange-500" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Categories */}
              <div>
                <div className="text-sm font-medium text-ink-600 dark:text-paper-300 mb-3">Browse by Category</div>
                <div className="grid grid-cols-4 gap-2">
                  {categories.map((cat) => {
                    const info = getCategoryInfo(cat)
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat)
                          onStepChange('category')
                        }}
                        className="group flex flex-col items-center gap-2 p-3 bg-white dark:bg-ink-700/50 rounded-xl hover:scale-105 transition-all"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                          style={{ backgroundColor: `${info.color}15` }}
                        >
                          <HabitIcon name={info.icon} className="w-5 h-5" style={{ color: info.color }} />
                        </div>
                        <span className="text-xs font-medium text-ink-600 dark:text-paper-300">{info.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step: Category Templates */}
          {step === 'category' && selectedCategory && (
            <motion.div
              key="category"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-5"
            >
              <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                {categoryTemplates.map((template) => {
                  const catInfo = getCategoryInfo(template.category)
                  return (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      disabled={isCreating}
                      className="group flex items-center gap-4 p-3 bg-white dark:bg-ink-700/50 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/10 border border-transparent hover:border-orange-200 dark:hover:border-orange-800/30 transition-all text-left disabled:opacity-50"
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${catInfo.color}15` }}
                      >
                        <HabitIcon name={template.icon} className="w-5 h-5" style={{ color: catInfo.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-ink-800 dark:text-paper-100">{template.title}</div>
                        <div className="text-sm text-ink-500 dark:text-paper-400 truncate">{template.description}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-paper-100 dark:bg-ink-600 text-ink-500 dark:text-paper-400 capitalize">{template.frequency}</span>
                        <Plus className="w-4 h-4 text-ink-300 dark:text-paper-600 group-hover:text-orange-500 transition-colors" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Step: Custom Form */}
          {step === 'custom' && (
            <motion.div
              key="custom"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-5 space-y-4"
            >
              {/* Title Input */}
              <div>
                <label className="block text-sm font-medium text-ink-700 dark:text-paper-200 mb-2">
                  What habit do you want to build?
                </label>
                <input
                  type="text"
                  value={customForm.title}
                  onChange={(e) => setCustomForm({ ...customForm, title: e.target.value })}
                  placeholder="e.g., Read for 30 minutes, Exercise, Journal..."
                  className="w-full px-4 py-3 bg-white dark:bg-ink-700/50 border border-paper-200 dark:border-ink-600 rounded-xl text-ink-800 dark:text-paper-100 placeholder:text-ink-400 dark:placeholder:text-paper-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  autoFocus
                />
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-ink-700 dark:text-paper-200 mb-2">
                  How often?
                </label>
                <div className="flex gap-2">
                  {(['daily', 'weekdays', 'weekly'] as HabitFrequency[]).map((freq) => (
                    <button
                      key={freq}
                      onClick={() => setCustomForm({ ...customForm, frequency: freq })}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium capitalize transition-all ${
                        customForm.frequency === freq
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                          : 'bg-white dark:bg-ink-700/50 text-ink-600 dark:text-paper-300 hover:bg-paper-100 dark:hover:bg-ink-600/50 border border-paper-200 dark:border-ink-600'
                      }`}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-ink-700 dark:text-paper-200 mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const info = getCategoryInfo(cat)
                    const isSelected = customForm.category === cat
                    return (
                      <button
                        key={cat}
                        onClick={() => setCustomForm({ ...customForm, category: cat })}
                        className={`flex items-center gap-2 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                          isSelected
                            ? 'text-white shadow-lg'
                            : 'bg-white dark:bg-ink-700/50 text-ink-600 dark:text-paper-300 hover:bg-paper-100 dark:hover:bg-ink-600/50 border border-paper-200 dark:border-ink-600'
                        }`}
                        style={isSelected ? { backgroundColor: info.color, boxShadow: `0 10px 25px -5px ${info.color}40` } : {}}
                      >
                        <HabitIcon name={info.icon} className="w-4 h-4" style={{ color: isSelected ? 'white' : info.color }} />
                        {info.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Create Button */}
              <button
                onClick={handleCustomCreate}
                disabled={!customForm.title.trim() || isCreating}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-ink-300 disabled:to-ink-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-orange-500/25 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Create Habit
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const HabitDashboard: React.FC<{
  className?: string
}> = ({ className = '' }) => {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const {
    habits,
    todayHabits,
    isLoading,
    stats,
    createHabit,
    deleteHabit,
    completeHabit,
    uncompleteHabit,
    isCompletedToday,
    useFreeze,
    getHabitsAtRisk,
  } = useHabits()

  const { startRitual, completeRitual } = useLifecycleData({ fetchOnMount: false })

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filterMode, setFilterMode] = useState<FilterMode>('today')
  const [wizardStep, setWizardStep] = useState<WizardStep>('closed')

  // Ritual modal state
  const [ritualModalOpen, setRitualModalOpen] = useState(false)
  const [currentRitualType, setCurrentRitualType] = useState<RitualType>('morning')
  const [pendingHabitId, setPendingHabitId] = useState<string | null>(null)
  const [currentRitualSessionId, setCurrentRitualSessionId] = useState<string | null>(null)

  // Get filtered habits
  const filteredHabits = (() => {
    switch (filterMode) {
      case 'today':
        return todayHabits
      case 'at_risk':
        return getHabitsAtRisk()
      case 'completed':
        return habits.filter((h) => isCompletedToday(h.id))
      default:
        return habits
    }
  })()

  // Handle habit creation
  const handleCreateHabit = useCallback(
    async (input: CreateHabitInput) => {
      await createHabit(input)
    },
    [createHabit]
  )

  // Handle habit completion with ritual support
  const handleCompleteHabit = useCallback(
    async (habit: HabitWithStreak) => {
      // Check if this habit is a ritual that surfaces notes
      const template = habit.templateId ? getTemplateById(habit.templateId) : null
      
      if (template && isRitualTemplate(template) && template.ritualType) {
        // Start a ritual session and show the modal
        const session = await startRitual(template.ritualType)
        if (session) {
          setCurrentRitualSessionId(session.id)
          setCurrentRitualType(template.ritualType)
          setPendingHabitId(habit.id)
          setRitualModalOpen(true)
        } else {
          // Fallback: just complete without ritual modal
          await completeHabit(habit.id)
        }
      } else {
        // Regular habit - just complete it
        await completeHabit(habit.id)
      }
    },
    [completeHabit, startRitual]
  )

  // Handle ritual completion
  const handleRitualComplete = useCallback(
    async (data: {
      reviewedStrands: string[]
      intentions?: string[]
      reflections?: string[]
    }) => {
      // Complete the ritual session
      if (currentRitualSessionId) {
        await completeRitual(currentRitualSessionId, data)
      }

      // Complete the pending habit
      if (pendingHabitId) {
        await completeHabit(pendingHabitId)
      }

      // Reset state
      setRitualModalOpen(false)
      setCurrentRitualSessionId(null)
      setPendingHabitId(null)
    },
    [currentRitualSessionId, pendingHabitId, completeRitual, completeHabit]
  )

  // Handle ritual modal close (skip)
  const handleRitualClose = useCallback(async () => {
    // If user skips, still complete the habit but without ritual data
    if (pendingHabitId) {
      await completeHabit(pendingHabitId)
    }
    setRitualModalOpen(false)
    setCurrentRitualSessionId(null)
    setPendingHabitId(null)
  }, [pendingHabitId, completeHabit])

  // Calculate today's progress
  const todayProgress = (stats.totalToday ?? 0) > 0
    ? Math.round(((stats.completedToday ?? 0) / (stats.totalToday ?? 1)) * 100)
    : 0

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink-800 dark:text-paper-100">Habits</h2>
          <p className="text-sm text-ink-500 dark:text-paper-400">
            Build consistency, one day at a time
          </p>
        </div>
        {wizardStep === 'closed' && (
          <button
            onClick={() => setWizardStep('choose-type')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl transition-all shadow-lg shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" />
            New Habit
          </button>
        )}
      </div>

      {/* Inline Wizard */}
      <AnimatePresence>
        {wizardStep !== 'closed' && (
          <InlineHabitWizard
            step={wizardStep}
            onStepChange={setWizardStep}
            onCreate={handleCreateHabit}
          />
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<Target className="w-5 h-5 text-blue-500" />}
          label="Today's Progress"
          value={`${todayProgress}%`}
          color="bg-blue-100 dark:bg-blue-900/30"
          subLabel={`${stats.completedToday ?? 0}/${stats.totalToday ?? 0} completed`}
        />
        <StatCard
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          label="Active Streaks"
          value={stats.activeStreaks ?? 0}
          color="bg-orange-100 dark:bg-orange-900/30"
        />
        <StatCard
          icon={<Trophy className="w-5 h-5 text-amber-500" />}
          label="Best Streak"
          value={stats.longestEverStreak ?? 0}
          color="bg-amber-100 dark:bg-amber-900/30"
          subLabel="days"
        />
      </div>

      {/* At risk warning */}
      {(stats.habitsAtRisk ?? 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl"
        >
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-amber-800 dark:text-amber-200">
              {stats.habitsAtRisk ?? 0} habit{(stats.habitsAtRisk ?? 0) > 1 ? 's' : ''} at risk!
            </div>
            <div className="text-sm text-amber-600 dark:text-amber-300">
              Complete them today to keep your streak alive
            </div>
          </div>
          <button
            onClick={() => setFilterMode('at_risk')}
            className="text-sm text-amber-600 dark:text-amber-400 hover:underline"
          >
            View
          </button>
        </motion.div>
      )}

      {/* Filters and view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-paper-100 dark:bg-ink-700 rounded-lg p-1">
          {[
            { key: 'today', label: 'Today', icon: Calendar },
            { key: 'all', label: 'All', icon: LayoutGrid },
            { key: 'at_risk', label: 'At Risk', icon: AlertTriangle },
            { key: 'completed', label: 'Done', icon: CheckCircle2 },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilterMode(key as FilterMode)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                filterMode === key
                  ? 'bg-white dark:bg-ink-600 shadow-sm text-ink-800 dark:text-paper-100'
                  : 'text-ink-500 dark:text-paper-400 hover:text-ink-700 dark:hover:text-paper-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-paper-100 dark:bg-ink-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-ink-600 shadow-sm text-ink-800 dark:text-paper-100'
                : 'text-ink-500 dark:text-paper-400'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-ink-600 shadow-sm text-ink-800 dark:text-paper-100'
                : 'text-ink-500 dark:text-paper-400'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Habits list */}
      {filteredHabits.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-paper-100 dark:bg-ink-700 rounded-full flex items-center justify-center">
            <Flame className="w-8 h-8 text-ink-400 dark:text-paper-500" />
          </div>
          <h3 className="text-lg font-medium text-ink-700 dark:text-paper-200 mb-1">
            {filterMode === 'today'
              ? 'No habits for today'
              : filterMode === 'at_risk'
              ? 'No habits at risk'
              : filterMode === 'completed'
              ? 'No completed habits today'
              : 'No habits yet'}
          </h3>
          <p className="text-sm text-ink-500 dark:text-paper-400 mb-4">
            {habits.length === 0
              ? 'Create your first habit to start building consistency'
              : 'Try a different filter to see your habits'}
          </p>
          {habits.length === 0 && (
            <button
              onClick={() => setWizardStep('choose-type')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl transition-all shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" />
              Create First Habit
            </button>
          )}
        </div>
      ) : (
        <motion.div
          layout
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
              : 'space-y-3'
          }
        >
          <AnimatePresence mode="popLayout">
            {filteredHabits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                isCompletedToday={isCompletedToday(habit.id)}
                onComplete={() => handleCompleteHabit(habit)}
                onUncomplete={() => uncompleteHabit(habit.id)}
                onDelete={() => deleteHabit(habit.id)}
                onUseFreeze={() => useFreeze(habit.id)}
                compact={viewMode === 'grid'}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Ritual prompt modal */}
      <RitualPromptModal
        isOpen={ritualModalOpen}
        onClose={handleRitualClose}
        ritualType={currentRitualType}
        onComplete={handleRitualComplete}
        isDark={isDark}
      />
    </div>
  )
}

export default HabitDashboard
