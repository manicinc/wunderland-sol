/**
 * Electron Audio IPC Handlers
 * @module electron/audio-handlers
 *
 * @description
 * IPC handlers for system audio capture using Electron's desktopCapturer.
 * Provides access to system-wide audio capture not available in web browsers.
 */

import type { IpcMainInvokeEvent } from 'electron'
const { ipcMain, desktopCapturer } = require('electron')

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface DesktopAudioSource {
  id: string
  name: string
  thumbnail?: string
  appIcon?: string
}

interface DesktopCaptureConstraints {
  audio: {
    mandatory: {
      chromeMediaSource: 'desktop'
      chromeMediaSourceId: string
    }
  }
  video: {
    mandatory: {
      chromeMediaSource: 'desktop'
      chromeMediaSourceId: string
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   HANDLERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Register all audio-related IPC handlers
 */
export function registerAudioHandlers(): void {
  /**
   * Get available desktop capture sources
   * Returns screens and windows that can be captured
   */
  ipcMain.handle(
    'audio:get-sources',
    async (): Promise<DesktopAudioSource[]> => {
      try {
        const sources = await desktopCapturer.getSources({
          types: ['window', 'screen'],
          thumbnailSize: { width: 150, height: 150 },
          fetchWindowIcons: true,
        })

        return sources.map((source: {
          id: string
          name: string
          thumbnail?: { toDataURL: () => string }
          appIcon?: { toDataURL: () => string }
        }) => ({
          id: source.id,
          name: source.name,
          thumbnail: source.thumbnail?.toDataURL(),
          appIcon: source.appIcon?.toDataURL(),
        }))
      } catch (error) {
        console.error('[audio-handlers] Failed to get sources:', error)
        return []
      }
    }
  )

  /**
   * Get capture constraints for a specific source
   * These constraints are used with navigator.mediaDevices.getUserMedia
   * in the renderer process
   */
  ipcMain.handle(
    'audio:get-capture-constraints',
    async (
      _event: IpcMainInvokeEvent,
      sourceId: string
    ): Promise<DesktopCaptureConstraints> => {
      return {
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
          },
        },
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
          },
        },
      }
    }
  )

  /**
   * Check if system audio capture is supported
   */
  ipcMain.handle('audio:is-supported', async (): Promise<boolean> => {
    try {
      // Try to get sources - if this works, capture is supported
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1, height: 1 },
      })
      return sources.length > 0
    } catch {
      return false
    }
  })

  /**
   * Get screen sources only (for system-wide audio)
   */
  ipcMain.handle(
    'audio:get-screen-sources',
    async (): Promise<DesktopAudioSource[]> => {
      try {
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { width: 150, height: 150 },
        })

        return sources.map((source: {
          id: string
          name: string
          thumbnail?: { toDataURL: () => string }
        }) => ({
          id: source.id,
          name: source.name,
          thumbnail: source.thumbnail?.toDataURL(),
        }))
      } catch (error) {
        console.error('[audio-handlers] Failed to get screen sources:', error)
        return []
      }
    }
  )

  /**
   * Get window sources only (for app-specific audio)
   */
  ipcMain.handle(
    'audio:get-window-sources',
    async (): Promise<DesktopAudioSource[]> => {
      try {
        const sources = await desktopCapturer.getSources({
          types: ['window'],
          thumbnailSize: { width: 150, height: 150 },
          fetchWindowIcons: true,
        })

        return sources.map((source: {
          id: string
          name: string
          thumbnail?: { toDataURL: () => string }
          appIcon?: { toDataURL: () => string }
        }) => ({
          id: source.id,
          name: source.name,
          thumbnail: source.thumbnail?.toDataURL(),
          appIcon: source.appIcon?.toDataURL(),
        }))
      } catch (error) {
        console.error('[audio-handlers] Failed to get window sources:', error)
        return []
      }
    }
  )

  console.log('[audio-handlers] Registered audio IPC handlers')
}
