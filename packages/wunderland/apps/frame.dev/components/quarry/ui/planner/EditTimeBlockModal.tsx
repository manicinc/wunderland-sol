'use client'

/**
 * Edit Time Block Modal
 *
 * Modal dialog for creating/editing time blocks (tasks or events).
 * Features icon picker, all-day toggle, start/end time pickers,
 * recurrence options, and color picker.
 *
 * @module components/quarry/ui/planner/EditTimeBlockModal
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Check,
  Calendar,
  Clock,
  Repeat,
  Palette,
  // Category icons
  CheckSquare,
  Users,
  CalendarDays,
  Lightbulb,
  Coffee,
  Dumbbell,
  Mail,
  Phone,
  Video,
  BookOpen,
  Code,
  Briefcase,
  ShoppingCart,
  Plane,
  Heart,
  Star,
  Flag,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHaptics } from '@/components/quarry/hooks/useHaptics'
import { useModalAccessibility } from '@/components/quarry/hooks/useModalAccessibility'
import Tooltip from '../common/Tooltip'
import type { RecurrenceFrequency, TaskPriority } from '@/lib/planner/types'

// ============================================================================
// TYPES
// ============================================================================

export interface TimeBlockData {
  id?: string
  title: string
  icon: string
  color: string
  isAllDay: boolean
  startDate: string // YYYY-MM-DD
  startTime: string // HH:mm
  endDate: string
  endTime: string
  recurrence: RecurrenceFrequency | 'none'
  calendarId?: string
  priority?: TaskPriority
}

export interface EditTimeBlockModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Initial data (for editing) or null (for creating) */
  initialData?: Partial<TimeBlockData> | null
  /** Available calendars */
  calendars?: Array<{ id: string; name: string; color: string }>
  /** Called when save is clicked */
  onSave: (data: TimeBlockData) => void
  /** Called when cancel or close is clicked */
  onClose: () => void
  /** Called when delete is clicked (edit mode only) */
  onDelete?: () => void
  /** Theme */
  theme?: 'light' | 'dark'
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ICON_OPTIONS: Array<{ id: string; icon: LucideIcon; label: string }> = [
  { id: 'CheckSquare', icon: CheckSquare, label: 'Task' },
  { id: 'Users', icon: Users, label: 'Meeting' },
  { id: 'CalendarDays', icon: CalendarDays, label: 'Event' },
  { id: 'Lightbulb', icon: Lightbulb, label: 'Idea' },
  { id: 'Coffee', icon: Coffee, label: 'Break' },
  { id: 'Dumbbell', icon: Dumbbell, label: 'Workout' },
  { id: 'Mail', icon: Mail, label: 'Email' },
  { id: 'Phone', icon: Phone, label: 'Call' },
  { id: 'Video', icon: Video, label: 'Video' },
  { id: 'BookOpen', icon: BookOpen, label: 'Read' },
  { id: 'Code', icon: Code, label: 'Code' },
  { id: 'Briefcase', icon: Briefcase, label: 'Work' },
  { id: 'ShoppingCart', icon: ShoppingCart, label: 'Shopping' },
  { id: 'Plane', icon: Plane, label: 'Travel' },
  { id: 'Heart', icon: Heart, label: 'Personal' },
  { id: 'Star', icon: Star, label: 'Important' },
  { id: 'Flag', icon: Flag, label: 'Milestone' },
  { id: 'Target', icon: Target, label: 'Goal' },
  { id: 'Zap', icon: Zap, label: 'Quick' },
]

const COLOR_OPTIONS = [
  { id: 'purple', color: '#8b5cf6' },
  { id: 'blue', color: '#3b82f6' },
  { id: 'green', color: '#22c55e' },
  { id: 'yellow', color: '#eab308' },
  { id: 'orange', color: '#f97316' },
  { id: 'pink', color: '#ec4899' },
  { id: 'red', color: '#ef4444' },
  { id: 'cyan', color: '#06b6d4' },
]

const RECURRENCE_OPTIONS: Array<{ id: RecurrenceFrequency | 'none'; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
]

// ============================================================================
// HELPERS
// ============================================================================

function formatTimeForDisplay(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const h = hours % 12 || 12
  const ampm = hours < 12 ? 'AM' : 'PM'
  return `${h.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function getDefaultData(): TimeBlockData {
  const now = new Date()
  const startHour = now.getHours()
  const startMinute = Math.ceil(now.getMinutes() / 15) * 15

  // Adjust if minutes overflow
  const adjustedStart = new Date(now)
  adjustedStart.setMinutes(startMinute)
  if (startMinute >= 60) {
    adjustedStart.setHours(startHour + 1)
    adjustedStart.setMinutes(0)
  }

  const endTime = new Date(adjustedStart)
  endTime.setHours(endTime.getHours() + 1)

  return {
    title: '',
    icon: 'CalendarDays',
    color: '#3b82f6',
    isAllDay: false,
    startDate: now.toISOString().split('T')[0],
    startTime: `${adjustedStart.getHours().toString().padStart(2, '0')}:${adjustedStart.getMinutes().toString().padStart(2, '0')}`,
    endDate: now.toISOString().split('T')[0],
    endTime: `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`,
    recurrence: 'none',
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EditTimeBlockModal({
  isOpen,
  initialData,
  calendars = [],
  onSave,
  onClose,
  onDelete,
  theme = 'light',
}: EditTimeBlockModalProps) {
  const isDark = theme === 'dark'
  const haptics = useHaptics()
  const isEditing = !!initialData?.id

  // Accessibility: escape to close, click outside to close
  const { backdropRef, contentRef, modalProps, handleBackdropClick } = useModalAccessibility({
    isOpen,
    onClose,
    closeOnEscape: true,
    closeOnClickOutside: true,
    trapFocus: true,
    lockScroll: true,
    modalId: 'edit-time-block-modal',
  })

  // Form state
  const [formData, setFormData] = useState<TimeBlockData>(getDefaultData)
  const [showIconPicker, setShowIconPicker] = useState(false)

  // Initialize form with initial data
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          ...getDefaultData(),
          ...initialData,
        })
      } else {
        setFormData(getDefaultData())
      }
    }
  }, [isOpen, initialData])

  // Get selected icon component
  const SelectedIcon = useMemo(() => {
    const iconOption = ICON_OPTIONS.find((opt) => opt.id === formData.icon)
    return iconOption?.icon || CalendarDays
  }, [formData.icon])

  // Handle field changes
  const updateField = useCallback(
    <K extends keyof TimeBlockData>(field: K, value: TimeBlockData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  // Handle save
  const handleSave = useCallback(() => {
    if (!formData.title.trim()) {
      haptics.haptic('error')
      return
    }
    haptics.haptic('success')
    onSave(formData)
  }, [formData, onSave, haptics])

  // Handle cancel
  const handleCancel = useCallback(() => {
    haptics.haptic('light')
    onClose()
  }, [onClose, haptics])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={backdropRef}
            className="fixed inset-0 bg-black/50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
          />

          {/* Modal */}
          <motion.div
            ref={contentRef}
            className={cn(
              'fixed inset-x-4 top-[10%] max-h-[80vh] overflow-y-auto z-50',
              'sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md',
              'rounded-2xl shadow-2xl',
              isDark ? 'bg-zinc-900' : 'bg-white'
            )}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25 }}
            {...modalProps}
          >
            {/* Header */}
            <div
              className={cn(
                'flex items-center justify-between px-4 py-3 border-b',
                isDark ? 'border-zinc-800' : 'border-zinc-200'
              )}
            >
              <button
                onClick={handleCancel}
                className={cn(
                  'text-sm font-medium',
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                )}
              >
                Cancel
              </button>
              <h2
                className={cn(
                  'text-base font-semibold',
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                )}
              >
                {isEditing ? 'Edit time block' : 'New time block'}
              </h2>
              <button
                onClick={handleSave}
                className={cn(
                  'text-sm font-semibold',
                  formData.title.trim()
                    ? 'text-emerald-500'
                    : isDark
                      ? 'text-zinc-600'
                      : 'text-zinc-300'
                )}
                disabled={!formData.title.trim()}
              >
                Save
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
              {/* Title with Icon */}
              <div className="flex items-center gap-3">
                <Tooltip
                  content="Choose icon"
                  description="Pick an icon to categorize this event"
                  placement="bottom"
                >
                  <motion.button
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      'transition-colors'
                    )}
                    style={{ backgroundColor: `${formData.color}20` }}
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    whileTap={{ scale: 0.95 }}
                  >
                    <SelectedIcon size={24} style={{ color: formData.color }} />
                  </motion.button>
                </Tooltip>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Event title"
                  className={cn(
                    'flex-1 text-2xl font-semibold bg-transparent',
                    'outline-none placeholder:opacity-40',
                    isDark ? 'text-zinc-100' : 'text-zinc-900'
                  )}
                  autoFocus
                />
              </div>

              {/* Icon Picker (expandable) */}
              <AnimatePresence>
                {showIconPicker && (
                  <motion.div
                    className={cn(
                      'grid grid-cols-6 gap-2 p-3 rounded-xl',
                      isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
                    )}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {ICON_OPTIONS.map((option) => {
                      const Icon = option.icon
                      const isSelected = formData.icon === option.id
                      return (
                        <motion.button
                          key={option.id}
                          className={cn(
                            'p-2 rounded-lg flex items-center justify-center',
                            'transition-colors',
                            isSelected
                              ? isDark
                                ? 'bg-zinc-700'
                                : 'bg-white shadow'
                              : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'
                          )}
                          onClick={() => {
                            updateField('icon', option.id)
                            haptics.haptic('light')
                          }}
                          whileTap={{ scale: 0.9 }}
                          title={option.label}
                        >
                          <Icon
                            size={20}
                            className={
                              isSelected
                                ? 'text-emerald-500'
                                : isDark
                                  ? 'text-zinc-400'
                                  : 'text-zinc-600'
                            }
                          />
                        </motion.button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* All-day Toggle */}
              <div
                className={cn(
                  'flex items-center justify-between py-3 border-y',
                  isDark ? 'border-zinc-800' : 'border-zinc-200'
                )}
              >
                <span
                  className={cn(
                    'text-base',
                    isDark ? 'text-zinc-300' : 'text-zinc-700'
                  )}
                >
                  Is all-day
                </span>
                <motion.button
                  className={cn(
                    'w-12 h-7 rounded-full p-1 transition-colors',
                    formData.isAllDay
                      ? 'bg-emerald-500'
                      : isDark
                        ? 'bg-zinc-700'
                        : 'bg-zinc-300'
                  )}
                  onClick={() => {
                    updateField('isAllDay', !formData.isAllDay)
                    haptics.haptic('light')
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="w-5 h-5 rounded-full bg-white shadow"
                    animate={{ x: formData.isAllDay ? 20 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </motion.button>
              </div>

              {/* Start/End Time */}
              {!formData.isAllDay && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Start */}
                  <div>
                    <label
                      className={cn(
                        'text-sm font-medium mb-2 block',
                        isDark ? 'text-zinc-500' : 'text-zinc-400'
                      )}
                    >
                      Starts
                    </label>
                    <div
                      className={cn(
                        'text-sm mb-1',
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      )}
                    >
                      {formatDateForDisplay(formData.startDate)}
                    </div>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => updateField('startTime', e.target.value)}
                      className={cn(
                        'w-full text-3xl font-light bg-transparent',
                        'outline-none',
                        isDark ? 'text-zinc-100' : 'text-zinc-900'
                      )}
                    />
                  </div>

                  {/* End */}
                  <div>
                    <label
                      className={cn(
                        'text-sm font-medium mb-2 block',
                        isDark ? 'text-zinc-500' : 'text-zinc-400'
                      )}
                    >
                      Ends
                    </label>
                    <div
                      className={cn(
                        'text-sm mb-1',
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      )}
                    >
                      {formatDateForDisplay(formData.endDate)}
                    </div>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => updateField('endTime', e.target.value)}
                      className={cn(
                        'w-full text-3xl font-light bg-transparent',
                        'outline-none',
                        isDark ? 'text-zinc-100' : 'text-zinc-900'
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Recurrence */}
              <div>
                <label
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wide mb-2 block',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}
                >
                  Recurrence
                </label>
                <div className="flex flex-wrap gap-2">
                  {RECURRENCE_OPTIONS.map((option) => {
                    const isSelected = formData.recurrence === option.id
                    return (
                      <motion.button
                        key={option.id}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm font-medium',
                          'border transition-colors',
                          isSelected
                            ? isDark
                              ? 'bg-zinc-700 border-zinc-600 text-zinc-100'
                              : 'bg-zinc-900 border-zinc-900 text-white'
                            : isDark
                              ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                              : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                        )}
                        onClick={() => {
                          updateField('recurrence', option.id)
                          haptics.haptic('light')
                        }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {option.label}
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wide mb-2 block',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}
                >
                  Color
                </label>
                <div className="flex gap-3">
                  {COLOR_OPTIONS.map((option) => {
                    const isSelected = formData.color === option.color
                    return (
                      <Tooltip
                        key={option.id}
                        content={option.id.charAt(0).toUpperCase() + option.id.slice(1)}
                        placement="bottom"
                      >
                        <motion.button
                          className={cn(
                            'w-8 h-8 rounded-full',
                            'ring-2 ring-offset-2 transition-all',
                            isSelected
                              ? 'ring-emerald-500'
                              : 'ring-transparent hover:ring-zinc-300',
                            isDark ? 'ring-offset-zinc-900' : 'ring-offset-white'
                          )}
                          style={{ backgroundColor: option.color }}
                          onClick={() => {
                            updateField('color', option.color)
                            haptics.haptic('light')
                          }}
                          whileTap={{ scale: 0.9 }}
                        >
                          {isSelected && (
                            <Check size={16} className="text-white m-auto" />
                          )}
                        </motion.button>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>

              {/* Calendar Selection */}
              {calendars.length > 0 && (
                <div>
                  <label
                    className={cn(
                      'text-xs font-semibold uppercase tracking-wide mb-2 block',
                      isDark ? 'text-zinc-500' : 'text-zinc-400'
                    )}
                  >
                    Calendar
                  </label>
                  <div className="space-y-2">
                    {calendars.map((calendar) => {
                      const isSelected = formData.calendarId === calendar.id
                      return (
                        <button
                          key={calendar.id}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
                            'transition-colors text-left',
                            isSelected
                              ? isDark
                                ? 'bg-zinc-800'
                                : 'bg-zinc-100'
                              : isDark
                                ? 'hover:bg-zinc-800/50'
                                : 'hover:bg-zinc-50'
                          )}
                          onClick={() => updateField('calendarId', calendar.id)}
                        >
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: calendar.color }}
                          />
                          <span
                            className={cn(
                              'text-sm',
                              isDark ? 'text-zinc-300' : 'text-zinc-700'
                            )}
                          >
                            {calendar.name}
                          </span>
                          {isSelected && (
                            <Check
                              size={16}
                              className="ml-auto text-emerald-500"
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Delete Button (edit mode only) */}
              {isEditing && onDelete && (
                <motion.button
                  className={cn(
                    'w-full py-3 rounded-xl text-center',
                    'text-red-500 font-medium',
                    isDark
                      ? 'bg-red-500/10 hover:bg-red-500/20'
                      : 'bg-red-50 hover:bg-red-100'
                  )}
                  onClick={() => {
                    haptics.haptic('error')
                    onDelete()
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  Delete Time Block
                </motion.button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default EditTimeBlockModal
