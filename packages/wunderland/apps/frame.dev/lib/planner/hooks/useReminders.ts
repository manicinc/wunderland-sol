/**
 * useReminders Hook
 *
 * Manages event/task reminders with browser notification support.
 * Features:
 * - Multiple reminders per event/task
 * - Browser push notifications (with permission)
 * - Sound alerts (optional)
 * - Background reminder checking
 *
 * @module lib/planner/hooks/useReminders
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getDatabase } from '@/lib/codexDatabase'

// ============================================================================
// TYPES
// ============================================================================

export interface Reminder {
  id: string
  eventId?: string
  taskId?: string
  remindAt: Date
  reminderType: 'notification' | 'sound' | 'both'
  minutesBefore: number
  isSent: boolean
  sentAt?: Date
  createdAt: Date
}

export interface CreateReminderInput {
  eventId?: string
  taskId?: string
  minutesBefore: number
  reminderType?: 'notification' | 'sound' | 'both'
}

export interface ReminderNotification {
  id: string
  title: string
  body: string
  eventId?: string
  taskId?: string
  remindAt: Date
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const REMINDER_INTERVALS = [
  { value: 0, label: 'At time of event' },
  { value: 5, label: '5 minutes before' },
  { value: 10, label: '10 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' },
  { value: 10080, label: '1 week before' },
] as const

// Notification sound (simple beep using Web Audio API)
let audioContext: AudioContext | null = null

function playNotificationSound() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }

    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 440 // A4 note
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  } catch (error) {
    console.warn('[Reminders] Could not play notification sound:', error)
  }
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

function generateId(): string {
  return `reminder_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

async function getRemindersFromDB(): Promise<Reminder[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await db.all(
      `SELECT * FROM event_reminders ORDER BY remind_at ASC`
    ) as Array<{
      id: string
      event_id: string | null
      task_id: string | null
      remind_at: string
      reminder_type: string
      minutes_before: number
      is_sent: number
      sent_at: string | null
      created_at: string
    }> | null

    return (rows || []).map((row) => ({
      id: row.id,
      eventId: row.event_id || undefined,
      taskId: row.task_id || undefined,
      remindAt: new Date(row.remind_at),
      reminderType: row.reminder_type as Reminder['reminderType'],
      minutesBefore: row.minutes_before,
      isSent: row.is_sent === 1,
      sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
      createdAt: new Date(row.created_at),
    }))
  } catch (error) {
    console.error('[Reminders] Failed to load reminders:', error)
    return []
  }
}

async function createReminderInDB(
  input: CreateReminderInput,
  eventTime: Date
): Promise<Reminder | null> {
  const db = await getDatabase()
  if (!db) return null

  const id = generateId()
  const remindAt = new Date(eventTime.getTime() - input.minutesBefore * 60 * 1000)
  const now = new Date().toISOString()

  try {
    await db.run(
      `INSERT INTO event_reminders (id, event_id, task_id, remind_at, reminder_type, minutes_before, is_sent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        id,
        input.eventId || null,
        input.taskId || null,
        remindAt.toISOString(),
        input.reminderType || 'notification',
        input.minutesBefore,
        now,
      ]
    )

    return {
      id,
      eventId: input.eventId,
      taskId: input.taskId,
      remindAt,
      reminderType: input.reminderType || 'notification',
      minutesBefore: input.minutesBefore,
      isSent: false,
      createdAt: new Date(now),
    }
  } catch (error) {
    console.error('[Reminders] Failed to create reminder:', error)
    return null
  }
}

async function deleteReminderFromDB(id: string): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    await db.run('DELETE FROM event_reminders WHERE id = ?', [id])
    return true
  } catch (error) {
    console.error('[Reminders] Failed to delete reminder:', error)
    return false
  }
}

async function markReminderSentInDB(id: string): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  try {
    await db.run(
      'UPDATE event_reminders SET is_sent = 1, sent_at = ? WHERE id = ?',
      [new Date().toISOString(), id]
    )
  } catch (error) {
    console.error('[Reminders] Failed to mark reminder as sent:', error)
  }
}

async function deleteRemindersForEvent(eventId: string): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  try {
    await db.run('DELETE FROM event_reminders WHERE event_id = ?', [eventId])
  } catch (error) {
    console.error('[Reminders] Failed to delete reminders for event:', error)
  }
}

async function deleteRemindersForTask(taskId: string): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  try {
    await db.run('DELETE FROM event_reminders WHERE task_id = ?', [taskId])
  } catch (error) {
    console.error('[Reminders] Failed to delete reminders for task:', error)
  }
}

// ============================================================================
// BROWSER NOTIFICATIONS
// ============================================================================

export type NotificationPermission = 'granted' | 'denied' | 'default'

async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[Reminders] Browser does not support notifications')
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    return 'denied'
  }

  const permission = await Notification.requestPermission()
  return permission as NotificationPermission
}

function showBrowserNotification(title: string, body: string, onClick?: () => void) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return
  }

  const notification = new Notification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'planner-reminder',
    requireInteraction: true,
  })

  if (onClick) {
    notification.onclick = () => {
      window.focus()
      onClick()
      notification.close()
    }
  }

  // Auto-close after 30 seconds
  setTimeout(() => notification.close(), 30000)
}

// ============================================================================
// HOOK
// ============================================================================

export interface UseRemindersOptions {
  /** Check interval in milliseconds (default: 30000 = 30 seconds) */
  checkInterval?: number
  /** Whether to enable sound alerts */
  enableSound?: boolean
  /** Called when a reminder fires */
  onReminder?: (notification: ReminderNotification) => void
  /** Function to get event title by ID */
  getEventTitle?: (eventId: string) => string | undefined
  /** Function to get task title by ID */
  getTaskTitle?: (taskId: string) => string | undefined
}

export interface UseRemindersReturn {
  reminders: Reminder[]
  isLoading: boolean
  notificationPermission: NotificationPermission

  // Actions
  createReminder: (input: CreateReminderInput, eventTime: Date) => Promise<Reminder | null>
  deleteReminder: (id: string) => Promise<boolean>
  deleteRemindersForEvent: (eventId: string) => Promise<void>
  deleteRemindersForTask: (taskId: string) => Promise<void>
  requestPermission: () => Promise<NotificationPermission>

  // Helpers
  getRemindersForEvent: (eventId: string) => Reminder[]
  getRemindersForTask: (taskId: string) => Reminder[]
  getPendingReminders: () => Reminder[]

  // Refresh
  refresh: () => Promise<void>
}

export function useReminders(options: UseRemindersOptions = {}): UseRemindersReturn {
  const {
    checkInterval = 30000,
    enableSound = false,
    onReminder,
    getEventTitle,
    getTaskTitle,
  } = options

  const [reminders, setReminders] = useState<Reminder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')

  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load reminders
  const loadReminders = useCallback(async () => {
    setIsLoading(true)
    const loaded = await getRemindersFromDB()
    setReminders(loaded)
    setIsLoading(false)
  }, [])

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission as NotificationPermission)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadReminders()
  }, [loadReminders])

  // Check for due reminders (with null guard for safety)
  const safeReminders = reminders ?? []
  const checkReminders = useCallback(async () => {
    const now = new Date()
    const pendingReminders = safeReminders.filter(
      (r) => !r.isSent && r.remindAt <= now
    )

    for (const reminder of pendingReminders) {
      // Get title
      let title = 'Reminder'
      let body = 'You have an upcoming event'

      if (reminder.eventId && getEventTitle) {
        const eventTitle = getEventTitle(reminder.eventId)
        if (eventTitle) {
          title = eventTitle
          body = reminder.minutesBefore === 0
            ? 'Starting now'
            : `Starting in ${formatMinutes(reminder.minutesBefore)}`
        }
      } else if (reminder.taskId && getTaskTitle) {
        const taskTitle = getTaskTitle(reminder.taskId)
        if (taskTitle) {
          title = taskTitle
          body = reminder.minutesBefore === 0
            ? 'Due now'
            : `Due in ${formatMinutes(reminder.minutesBefore)}`
        }
      }

      // Show notification
      if (reminder.reminderType === 'notification' || reminder.reminderType === 'both') {
        showBrowserNotification(title, body)
      }

      // Play sound
      if (enableSound && (reminder.reminderType === 'sound' || reminder.reminderType === 'both')) {
        playNotificationSound()
      }

      // Call callback
      if (onReminder) {
        onReminder({
          id: reminder.id,
          title,
          body,
          eventId: reminder.eventId,
          taskId: reminder.taskId,
          remindAt: reminder.remindAt,
        })
      }

      // Mark as sent
      await markReminderSentInDB(reminder.id)
    }

    // Refresh if any reminders were sent
    if (pendingReminders.length > 0) {
      await loadReminders()
    }
  }, [safeReminders, enableSound, onReminder, getEventTitle, getTaskTitle, loadReminders])

  // Start reminder checking interval
  useEffect(() => {
    checkIntervalRef.current = setInterval(checkReminders, checkInterval)

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [checkReminders, checkInterval])

  // Create reminder
  const createReminder = useCallback(
    async (input: CreateReminderInput, eventTime: Date): Promise<Reminder | null> => {
      const reminder = await createReminderInDB(input, eventTime)
      if (reminder) {
        await loadReminders()
      }
      return reminder
    },
    [loadReminders]
  )

  // Delete reminder
  const deleteReminder = useCallback(
    async (id: string): Promise<boolean> => {
      const success = await deleteReminderFromDB(id)
      if (success) {
        await loadReminders()
      }
      return success
    },
    [loadReminders]
  )

  // Delete reminders for event
  const deleteRemindersForEventFn = useCallback(
    async (eventId: string): Promise<void> => {
      await deleteRemindersForEvent(eventId)
      await loadReminders()
    },
    [loadReminders]
  )

  // Delete reminders for task
  const deleteRemindersForTaskFn = useCallback(
    async (taskId: string): Promise<void> => {
      await deleteRemindersForTask(taskId)
      await loadReminders()
    },
    [loadReminders]
  )

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    const permission = await requestNotificationPermission()
    setNotificationPermission(permission)
    return permission
  }, [])

  // Get reminders for event
  const getRemindersForEventFn = useCallback(
    (eventId: string): Reminder[] => {
      return reminders.filter((r) => r.eventId === eventId)
    },
    [reminders]
  )

  // Get reminders for task
  const getRemindersForTaskFn = useCallback(
    (taskId: string): Reminder[] => {
      return reminders.filter((r) => r.taskId === taskId)
    },
    [reminders]
  )

  // Get pending reminders
  const getPendingReminders = useCallback((): Reminder[] => {
    return reminders.filter((r) => !r.isSent)
  }, [reminders])

  return {
    reminders,
    isLoading,
    notificationPermission,
    createReminder,
    deleteReminder,
    deleteRemindersForEvent: deleteRemindersForEventFn,
    deleteRemindersForTask: deleteRemindersForTaskFn,
    requestPermission,
    getRemindersForEvent: getRemindersForEventFn,
    getRemindersForTask: getRemindersForTaskFn,
    getPendingReminders,
    refresh: loadReminders,
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60)
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  }
  const days = Math.floor(minutes / 1440)
  return `${days} day${days !== 1 ? 's' : ''}`
}
