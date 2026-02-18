/**
 * Progressive Web App Hook
 * @module codex/hooks/usePWA
 * 
 * @remarks
 * Handles PWA installation, service worker registration, and offline detection.
 */

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAState {
  /** Whether PWA is installable */
  isInstallable: boolean
  /** Whether PWA is installed */
  isInstalled: boolean
  /** Whether service worker is registered */
  isOfflineReady: boolean
  /** Whether app is currently offline */
  isOffline: boolean
  /** Trigger install prompt */
  install: () => Promise<boolean>
  /** Update service worker */
  update: () => Promise<void>
}

/**
 * PWA installation and offline support hook
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { isInstallable, isOffline, install } = usePWA()
 *   
 *   return (
 *     <>
 *       {isOffline && <div>You are offline</div>}
 *       {isInstallable && (
 *         <button onClick={install}>Install App</button>
 *       )}
 *     </>
 *   )
 * }
 * ```
 */
export function usePWA(): PWAState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isOfflineReady, setIsOfflineReady] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  // Register service worker
  useEffect(() => {
    if (
      typeof window === 'undefined' || 
      !('serviceWorker' in navigator) || 
      navigator.serviceWorker.controller
    ) {
      // If already controlled, just update state
      if (navigator.serviceWorker.controller) {
        setIsOfflineReady(true)
        setIsInstalled(true) // Assumption for existing SW
      }
      return
    }

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })
        
        console.log('[PWA] Service worker registered:', reg.scope)
        setRegistration(reg)
        setIsOfflineReady(true)

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New content available, please refresh')
              }
            })
          }
        })
      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error)
      }
    }

    registerSW()
  }, [])

  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      console.log('[PWA] Install prompt available')
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      console.log('[PWA] App installed successfully')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    setIsOffline(!navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  /**
   * Trigger install prompt
   */
  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.warn('[PWA] No install prompt available')
      return false
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      console.log('[PWA] Install prompt outcome:', outcome)
      setDeferredPrompt(null)
      
      return outcome === 'accepted'
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error)
      return false
    }
  }

  /**
   * Update service worker
   */
  const update = async (): Promise<void> => {
    if (!registration) {
      console.warn('[PWA] No service worker registration')
      return
    }

    try {
      await registration.update()
      console.log('[PWA] Service worker updated')
    } catch (error) {
      console.error('[PWA] Service worker update failed:', error)
    }
  }

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isOfflineReady,
    isOffline,
    install,
    update,
  }
}

