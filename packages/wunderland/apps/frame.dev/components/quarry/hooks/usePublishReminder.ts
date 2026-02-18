/**
 * Publish Reminder Hook
 * @module codex/hooks/usePublishReminder
 *
 * Shows toast reminders to publish drafts when using GitHub backend.
 * Helps users understand that local saves are cached and encourages publishing.
 */

import { useCallback, useRef } from 'react'
import { useToast } from '../ui/common/Toast'

interface UsePublishReminderOptions {
  /** Callback when user clicks "Publish" in the toast */
  onPublish?: () => void
  /** Minimum interval between reminders (ms). Default: 30 seconds */
  reminderInterval?: number
  /** Whether to show reminders. Set to false to disable. */
  enabled?: boolean
}

interface UsePublishReminderReturn {
  /** Call this after a local save to potentially show a reminder */
  onLocalSave: () => void
  /** Manually trigger a publish reminder */
  showReminder: () => void
}

/**
 * Hook to show publish reminders after local saves
 *
 * @example
 * ```tsx
 * const { onLocalSave } = usePublishReminder({
 *   onPublish: () => publishToGitHub(),
 *   enabled: isUsingGitHubBackend,
 * })
 *
 * // In your save handler:
 * useAutoSave({
 *   draftId: 'my-draft',
 *   onLocalSaveComplete: onLocalSave,
 * })
 * ```
 */
export function usePublishReminder({
  onPublish,
  reminderInterval = 30000, // 30 seconds
  enabled = true,
}: UsePublishReminderOptions = {}): UsePublishReminderReturn {
  const toast = useToast()
  const lastReminderRef = useRef<number>(0)
  const saveCountRef = useRef<number>(0)

  const showReminder = useCallback(() => {
    if (!enabled) return

    const now = Date.now()
    const timeSinceLastReminder = now - lastReminderRef.current

    // Only show reminder if enough time has passed
    if (timeSinceLastReminder < reminderInterval) return

    lastReminderRef.current = now

    toast.showToastWithOptions({
      message: 'Draft saved locally. Publish to save permanently.',
      type: 'action',
      duration: 5000,
      actions: onPublish
        ? [
            {
              label: 'Publish Now',
              onClick: onPublish,
              variant: 'primary',
            },
          ]
        : undefined,
    })
  }, [enabled, reminderInterval, onPublish, toast])

  const onLocalSave = useCallback(() => {
    if (!enabled) return

    saveCountRef.current += 1

    // Show reminder after first save and then periodically
    // This ensures users see it immediately and are reminded over time
    if (saveCountRef.current === 1) {
      // First save - show immediately
      showReminder()
    } else {
      // Subsequent saves - respect the interval
      showReminder()
    }
  }, [enabled, showReminder])

  return {
    onLocalSave,
    showReminder,
  }
}

export default usePublishReminder
