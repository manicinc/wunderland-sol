/**
 * Subtle Toast Notifications for AI Features
 * @module lib/ai/toast
 * 
 * @description
 * Minimal, non-intrusive toast notifications for AI feature status.
 * Uses custom events to communicate with the Toast component.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'subtle'

export interface ToastOptions {
  /** Type of toast */
  type?: ToastType
  /** Message to display */
  message: string
  /** Duration in ms (0 = persistent) */
  duration?: number
  /** Position on screen */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  /** Optional action button */
  action?: {
    label: string
    onClick: () => void
  }
  /** Unique ID to prevent duplicates */
  id?: string
}

export interface ToastEvent {
  type: 'show' | 'dismiss' | 'dismissAll'
  toast?: ToastOptions & { id: string }
  id?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOAST MANAGER
═══════════════════════════════════════════════════════════════════════════ */

const TOAST_EVENT = 'ai-toast'
const activeToasts = new Set<string>()

/**
 * Generate unique toast ID
 */
function generateId(): string {
  return `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Dispatch toast event
 */
function dispatchToast(event: ToastEvent): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: event }))
}

/**
 * Show a toast notification
 */
export function showToast(options: ToastOptions): string {
  const id = options.id || generateId()
  
  // Prevent duplicate toasts with same ID
  if (options.id && activeToasts.has(options.id)) {
    return options.id
  }
  
  const toast: ToastOptions & { id: string } = {
    type: 'subtle',
    duration: 3000,
    position: 'bottom-right',
    ...options,
    id,
  }
  
  activeToasts.add(id)
  
  dispatchToast({
    type: 'show',
    toast,
  })
  
  // Auto-remove from active set after duration
  if (toast.duration && toast.duration > 0) {
    setTimeout(() => {
      activeToasts.delete(id)
    }, toast.duration + 500) // Add buffer for animation
  }
  
  return id
}

/**
 * Dismiss a specific toast
 */
export function dismissToast(id: string): void {
  activeToasts.delete(id)
  dispatchToast({
    type: 'dismiss',
    id,
  })
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts(): void {
  activeToasts.clear()
  dispatchToast({
    type: 'dismissAll',
  })
}

/**
 * Subscribe to toast events
 */
export function subscribeToToasts(callback: (event: ToastEvent) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  
  const handler = (e: CustomEvent<ToastEvent>) => callback(e.detail)
  window.addEventListener(TOAST_EVENT, handler as EventListener)
  return () => window.removeEventListener(TOAST_EVENT, handler as EventListener)
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONVENIENCE FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Show a subtle AI status toast
 */
export function showAIStatus(message: string, options?: Partial<ToastOptions>): string {
  return showToast({
    type: 'subtle',
    message,
    duration: 3000,
    position: 'bottom-right',
    ...options,
  })
}

/**
 * Show AI error toast (non-intrusive)
 */
export function showAIError(message: string, options?: Partial<ToastOptions>): string {
  return showToast({
    type: 'subtle',
    message,
    duration: 4000,
    position: 'bottom-right',
    id: 'ai-error', // Prevent multiple error toasts
    ...options,
  })
}

/**
 * Show AI ready toast
 */
export function showAIReady(feature: string): string {
  return showToast({
    type: 'subtle',
    message: `${feature} ready`,
    duration: 2000,
    position: 'bottom-right',
  })
}

/**
 * Show API key required toast
 */
export function showAPIKeyRequired(): string {
  return showToast({
    type: 'subtle',
    message: 'Configure API keys in Settings to enable AI features',
    duration: 5000,
    position: 'bottom-right',
    id: 'api-key-required',
    action: {
      label: 'Settings',
      onClick: () => {
        // Dispatch event to open settings
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('open-settings', { detail: { tab: 'api-keys' } }))
        }
      },
    },
  })
}



