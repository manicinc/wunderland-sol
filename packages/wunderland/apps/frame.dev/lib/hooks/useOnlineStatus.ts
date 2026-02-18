/**
 * Online Status Hook
 * @module lib/hooks/useOnlineStatus
 *
 * Detects online/offline status with reconnection handling.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

/** Local online status for this hook */
interface OnlineStatus {
  isOnline: boolean
  lastChecked: Date
  lastOnline: Date | null
}

export interface UseOnlineStatusOptions {
  /** Polling interval for connection check (ms) */
  pollingInterval?: number
  /** URL to ping for connectivity check */
  pingUrl?: string
  /** Timeout for ping request (ms) */
  pingTimeout?: number
  /** Enable polling even when online */
  alwaysPoll?: boolean
  /** Callback when status changes */
  onStatusChange?: (status: OnlineStatus) => void
}

export interface UseOnlineStatusReturn {
  /** Current online/offline status */
  isOnline: boolean
  /** Whether currently checking connection */
  isChecking: boolean
  /** Last successful connection time */
  lastOnline: Date | null
  /** Full status object */
  status: OnlineStatus
  /** Manually trigger a connection check */
  checkConnection: () => Promise<boolean>
  /** Time since last online (ms), null if online */
  offlineDuration: number | null
}

const DEFAULT_PING_URL = '/api/health'
const DEFAULT_POLLING_INTERVAL = 30000 // 30 seconds
const DEFAULT_PING_TIMEOUT = 5000 // 5 seconds

/**
 * Hook for tracking online/offline network status
 */
export function useOnlineStatus(
  options: UseOnlineStatusOptions = {}
): UseOnlineStatusReturn {
  const {
    pollingInterval = DEFAULT_POLLING_INTERVAL,
    pingUrl = DEFAULT_PING_URL,
    pingTimeout = DEFAULT_PING_TIMEOUT,
    alwaysPoll = false,
    onStatusChange,
  } = options

  const [status, setStatus] = useState<OnlineStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastChecked: new Date(),
    lastOnline: new Date(),
  })
  const [isChecking, setIsChecking] = useState(false)

  const previousStatusRef = useRef(status.isOnline)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const onStatusChangeRef = useRef(onStatusChange)

  // Keep callback ref updated
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange
  }, [onStatusChange])

  // Check connection by pinging the server
  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), pingTimeout)

      const response = await fetch(pingUrl, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const isOnline = response.ok
      const now = new Date()

      setStatus((prev) => {
        const newStatus: OnlineStatus = {
          isOnline,
          lastChecked: now,
          lastOnline: isOnline ? now : prev.lastOnline,
        }

        // Notify if status changed
        if (prev.isOnline !== isOnline && onStatusChangeRef.current) {
          onStatusChangeRef.current(newStatus)
        }

        return newStatus
      })

      setIsChecking(false)
      return isOnline
    } catch {
      const now = new Date()

      setStatus((prev) => {
        const newStatus: OnlineStatus = {
          isOnline: false,
          lastChecked: now,
          lastOnline: prev.lastOnline,
        }

        // Notify if status changed
        if (prev.isOnline && onStatusChangeRef.current) {
          onStatusChangeRef.current(newStatus)
        }

        return newStatus
      })

      setIsChecking(false)
      return false
    }
  }, [pingUrl, pingTimeout])

  // Handle browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      const now = new Date()
      setStatus((prev) => {
        const newStatus: OnlineStatus = {
          isOnline: true,
          lastChecked: now,
          lastOnline: now,
        }

        if (!prev.isOnline && onStatusChangeRef.current) {
          onStatusChangeRef.current(newStatus)
        }

        return newStatus
      })

      // Verify with a ping
      checkConnection()
    }

    const handleOffline = () => {
      const now = new Date()
      setStatus((prev) => {
        const newStatus: OnlineStatus = {
          isOnline: false,
          lastChecked: now,
          lastOnline: prev.lastOnline,
        }

        if (prev.isOnline && onStatusChangeRef.current) {
          onStatusChangeRef.current(newStatus)
        }

        return newStatus
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [checkConnection])

  // Polling for connection status
  useEffect(() => {
    // Clear existing interval
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }

    // Start polling if offline or alwaysPoll is true
    if (!status.isOnline || alwaysPoll) {
      pollingRef.current = setInterval(() => {
        checkConnection()
      }, pollingInterval)
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [status.isOnline, alwaysPoll, pollingInterval, checkConnection])

  // Track previous status for change detection
  useEffect(() => {
    previousStatusRef.current = status.isOnline
  }, [status.isOnline])

  // Calculate offline duration
  const offlineDuration = status.isOnline
    ? null
    : status.lastOnline
      ? Date.now() - status.lastOnline.getTime()
      : null

  return {
    isOnline: status.isOnline,
    isChecking,
    lastOnline: status.lastOnline,
    status,
    checkConnection,
    offlineDuration,
  }
}

/**
 * Format offline duration as human-readable string
 */
export function formatOfflineDuration(ms: number | null): string {
  if (ms === null) return ''

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m`
  }
  return `${seconds}s`
}

export default useOnlineStatus
